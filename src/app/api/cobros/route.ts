import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { ETAPAS, planCobro, plantillaDe, rellenarPlantilla, type TipoCobro } from '@/lib/cobros'
import { configuracionEnvio, CORREO_NO_CONFIGURADO, mensajeError } from '@/lib/correo'
import { diasDesde } from '@/lib/fechas'
import { permitir } from '@/lib/limite'
import { construirCorreo, pausa } from '@/lib/plantillaCorreo'
import type { RegistroCobrable, ScriptsCobro } from '@/lib/types'

/**
 * Motor de cobro: sustituye a ejecutarSistemaDeCobro, ejecutarEnvioCobroCursos
 * y ejecutarEnvioCobroSaaS del Apps Script. Corre con la sesión del usuario,
 * así que RLS limita qué filas puede leer y marcar.
 *
 * Anti-duplicados: antes de enviar, cada recordatorio se "reclama" con un
 * UPDATE condicional (solo si el aviso sigue sin marcar). Si dos peticiones
 * coinciden (doble clic, dos pestañas) solo una consigue la fila. Si el
 * envío falla, la marca se revierte para poder reintentar.
 */

interface Destino {
  registro: RegistroCobrable
  email: string | null
  nombre: string
  concepto: string
  /** Proyecto pausado: no se le cobra. */
  pausado: boolean
  /** Usuario SaaS bloqueado o pendiente: no se le cobra. */
  activo: boolean
}

const TABLAS: Record<TipoCobro, string> = {
  proyectos: 'proyectos',
  cursos: 'cursos',
  saas: 'control_saas',
}

// Enviar varios correos por SMTP puede tardar más que el límite por defecto.
export const maxDuration = 60

// Con la pausa de 800 ms entre correos, 40 caben holgados en 60 s.
const MAX_POR_EJECUCION = 40
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/

const json = (cuerpo: object, status = 200) => NextResponse.json(cuerpo, { status })

/**
 * "Hoy" lo calcula el servidor. Se acepta el del navegador (para respetar la
 * zona horaria del usuario) solo si difiere como mucho un día del del
 * servidor; con una fecha futura no se podrían saltar etapas.
 */
function fechaDeHoy(hoyCliente: unknown): string {
  const servidor = new Date().toISOString().slice(0, 10)
  if (typeof hoyCliente !== 'string' || !FECHA_ISO.test(hoyCliente)) return servidor
  const dif = diasDesde(hoyCliente, servidor)
  return dif !== null && Math.abs(dif) <= 1 ? hoyCliente : servidor
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const tipo = body?.tipo
  if (typeof tipo !== 'string' || !Object.hasOwn(TABLAS, tipo)) {
    return json({ error: 'Tipo de cobro no válido.' }, 400)
  }
  const tipoCobro = tipo as TipoCobro
  const hoy = fechaDeHoy(body?.hoy)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return json({ error: 'Sesión no válida.' }, 401)

  if (!permitir(`cobros:${user.id}`, 6)) {
    return json({ error: 'Demasiadas solicitudes. Espera un minuto e inténtalo de nuevo.' }, 429)
  }

  const { data: rolAdmin } = await supabase.rpc('es_admin')
  const esAdmin = Boolean(rolAdmin)

  // El cobro SaaS es del admin hacia los freelancers. Cada freelancer cobra
  // a sus propios clientes con 'proyectos' y 'cursos' (RLS ya los aísla).
  if (tipoCobro === 'saas' && !esAdmin) {
    return json({ error: 'Solo el administrador puede ejecutar el cobro SaaS.' }, 403)
  }

  // Lo primero: sin Gmail conectado no se envía nada, haya o no pendientes.
  const envio = await configuracionEnvio(supabase, esAdmin)
  if (envio === CORREO_NO_CONFIGURADO) {
    return json(
      {
        codigo: CORREO_NO_CONFIGURADO,
        error: 'Aún no has configurado tu correo de envío. Conecta tu Gmail en Scripts de Cobro para poder enviar recordatorios.',
      },
      409
    )
  }
  if (typeof envio === 'string') return json({ error: envio }, 500)
  const { transporte } = envio

  const scripts = await obtenerScripts(supabase)
  if (!scripts) return json({ error: 'No se pudieron cargar los scripts de cobro.' }, 500)

  const destinos = await obtenerDestinos(supabase, tipoCobro)
  if ('error' in destinos) return json({ error: destinos.error }, 500)

  const hayPendientes = destinos.some((d) => planCobro(d.registro, hoy))
  if (!hayPendientes) return json({ mensaje: 'No hay recordatorios pendientes por enviar.', enviados: 0 })

  // Si el SMTP no responde o rechaza las credenciales, se dice aquí con el
  // motivo real en lugar de fallar correo por correo sin explicación.
  try {
    await transporte.verify()
  } catch (e) {
    console.error('SMTP no disponible', e)
    const mensaje = envio.propio
      ? `Tu Gmail conectado (${envio.direccion}) rechazó la conexión: ${mensajeError(e)}. Vuelve a conectarlo en Scripts de Cobro.`
      : `No se pudo conectar con el correo del sistema: ${mensajeError(e)}`
    return json({ error: mensaje }, 502)
  }

  const remitente = await obtenerRemitente(supabase, envio.direccion)
  const nombreRemitente = remitente.match(/^"([^"]+)"/)?.[1] ?? ''
  const responderA = envio.propio ? envio.direccion : (user.email ?? envio.direccion)
  const tabla = TABLAS[tipoCobro]
  let primero = true

  let enviados = 0
  let sinCorreo = 0
  let pausados = 0
  let inactivos = 0
  let yaEnCurso = 0
  let restantes = 0
  let sinRevertir = 0
  const fallidos: string[] = []

  for (const destino of destinos) {
    const plan = planCobro(destino.registro, hoy)
    if (!plan) continue
    if (destino.pausado) {
      pausados++
      continue
    }
    if (!destino.activo) {
      inactivos++
      continue
    }
    if (!destino.email?.includes('@')) {
      sinCorreo++
      continue
    }
    if (enviados + fallidos.length >= MAX_POR_EJECUCION) {
      restantes++
      continue
    }

    // 1) Reclamar: marca la etapa (y las omitidas) solo si sigue libre.
    const ahora = new Date().toISOString()
    const columnas = [plan.etapa, ...plan.omitir].map((e) => e.columna)
    const { data: reclamado, error: errReclamo } = await supabase
      .from(tabla)
      .update(Object.fromEntries(columnas.map((c) => [c, ahora])))
      .eq('id', destino.registro.id)
      .eq('cobrado', false)
      .is(plan.etapa.columna, null)
      .select('id')
    if (errReclamo) {
      console.error('No se pudo reservar el aviso', destino.registro.id, errReclamo)
      fallidos.push(`${destino.email} (${errReclamo.message})`)
      continue
    }
    if (!reclamado?.length) {
      yaEnCurso++ // otra ejecución ya lo tomó, o se cobró mientras tanto
      continue
    }

    // 2) Enviar.
    const texto = rellenarPlantilla(plantillaDe(scripts, plan.etapa), {
      nombre: destino.nombre,
      proyecto: destino.concepto,
      monto: destino.registro.monto,
    })
    const correo = construirCorreo(tipoCobro, {
      concepto: destino.concepto,
      cuerpo: texto,
      remitente: nombreRemitente,
      responderA,
    })

    // Pausa corta entre correos: una ráfaga idéntica se parece a spam masivo.
    if (!primero) await pausa(800)
    primero = false

    try {
      await transporte.sendMail({
        from: remitente,
        // Solo el admin usa el correo del sistema; sus respuestas van a su cuenta.
        replyTo: envio.propio ? undefined : user.email,
        to: destino.email,
        subject: correo.subject,
        text: correo.text,
        html: correo.html,
      })
      enviados++
    } catch (e) {
      console.error('Error enviando recordatorio', destino.email, e)
      fallidos.push(`${destino.email} (${mensajeError(e)})`)
      // 3) Revertir la reserva para que un próximo intento lo reenvíe.
      const { error: errRevertir } = await supabase
        .from(tabla)
        .update(Object.fromEntries(columnas.map((c) => [c, null])))
        .eq('id', destino.registro.id)
      if (errRevertir) {
        console.error('No se pudo revertir la reserva', destino.registro.id, errRevertir)
        sinRevertir++
      }
    }
  }

  let mensaje = `Se enviaron ${enviados} recordatorios de cobro.`
  if (sinCorreo) mensaje += ` ${sinCorreo} vencidos no tienen un correo válido.`
  if (pausados) mensaje += ` ${pausados} proyectos pausados se omitieron.`
  if (inactivos) mensaje += ` ${inactivos} usuarios bloqueados o pendientes se omitieron.`
  if (yaEnCurso) mensaje += ` ${yaEnCurso} ya estaban siendo enviados por otra ejecución.`
  if (restantes) mensaje += ` Quedan ${restantes} por enviar: vuelve a ejecutar el cobro en un momento.`
  if (sinRevertir) mensaje += ` ${sinRevertir} fallaron y quedaron marcados como enviados; revísalos.`
  if (fallidos.length) mensaje += ` Fallaron: ${fallidos.join('; ')}.`
  return json({ mensaje, enviados })
}

type Supabase = Awaited<ReturnType<typeof createClient>>

/**
 * Remitente visible: la marca (o el nombre) del perfil de quien cobra, con
 * la dirección desde la que realmente sale el correo.
 */
async function obtenerRemitente(supabase: Supabase, direccion: string): Promise<string> {
  const { data } = await supabase.from('perfil').select('marca, nombre').maybeSingle()
  const nombre = (data?.marca || data?.nombre || '').replace(/["<>\r\n]/g, '').trim()
  return nombre ? `"${nombre}" <${direccion}>` : direccion
}

async function obtenerScripts(supabase: Supabase): Promise<ScriptsCobro | null> {
  const { data } = await supabase.from('scripts_cobro').select('*').maybeSingle()
  if (data) return data
  // Primera vez: se crea la fila con las plantillas por defecto de la tabla.
  const { data: nueva } = await supabase.from('scripts_cobro').insert({}).select().single()
  return nueva
}

async function obtenerDestinos(supabase: Supabase, tipo: TipoCobro): Promise<Destino[] | { error: string }> {
  const columnas = `id, monto, cobrado, fecha_pago, ${ETAPAS.map((e) => e.columna).join(', ')}, comprobante_url`

  if (tipo === 'saas') {
    const [{ data: filas, error }, { data: usuarios }] = await Promise.all([
      supabase.from('control_saas').select(`${columnas}, plan, usuario_id`).eq('cobrado', false).not('fecha_pago', 'is', null),
      supabase.from('usuarios').select('id, email, estado'),
    ])
    if (error) return { error: error.message }
    const porId = new Map(
      (usuarios ?? []).map((u) => [u.id, { email: u.email as string | null, estado: u.estado as string }])
    )
    return (filas ?? []).map((f) => {
      const usuario = f.usuario_id ? porId.get(f.usuario_id) : undefined
      const email = usuario?.email ?? null
      return {
        registro: f,
        email,
        nombre: email ? email.split('@')[0] : '',
        concepto: f.plan || 'Suscripción',
        pausado: false,
        activo: usuario?.estado === 'Autorizado',
      }
    })
  }

  const extra = tipo === 'proyectos' ? ', estado_proceso' : ''
  const { data: filas, error } = await supabase
    .from(TABLAS[tipo])
    .select(`${columnas}${extra}, nombre, clientes(nombre, email)`)
    .eq('cobrado', false)
    .not('fecha_pago', 'is', null)
  if (error) return { error: error.message }

  return (filas ?? []).map((f) => {
    const cliente = f.clientes as unknown as { nombre: string; email: string | null } | null
    return {
      registro: f,
      email: cliente?.email ?? null,
      nombre: cliente?.nombre ?? '',
      concepto: f.nombre,
      pausado: tipo === 'proyectos' && (f as { estado_proceso?: string | null }).estado_proceso === 'Pausado',
      activo: true,
    }
  })
}
