import nodemailer from 'nodemailer'
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { etapaPendiente, plantillaDe, rellenarPlantilla, type TipoCobro } from '@/lib/cobros'
import { hoyISO } from '@/lib/fechas'
import type { RegistroCobrable, ScriptsCobro } from '@/lib/types'

/**
 * Motor de cobro: sustituye a ejecutarSistemaDeCobro, ejecutarEnvioCobroCursos
 * y ejecutarEnvioCobroSaaS del Apps Script. Corre con la sesión del usuario,
 * así que RLS limita qué filas puede leer y marcar.
 */

interface Destino {
  registro: RegistroCobrable
  email: string | null
  nombre: string
  concepto: string
}

const ASUNTOS: Record<TipoCobro, string> = {
  proyectos: '⚠️ Recordatorio de Pago: ',
  cursos: '⚠️ Recordatorio de Pago / Suscripción: ',
  saas: '⚠️ Recordatorio de Pago SaaS: ',
}

const TABLAS: Record<TipoCobro, string> = {
  proyectos: 'proyectos',
  cursos: 'cursos',
  saas: 'control_saas',
}

// Enviar varios correos por SMTP puede tardar más que el límite por defecto.
export const maxDuration = 60

const json = (cuerpo: object, status = 200) => NextResponse.json(cuerpo, { status })

/** Primera línea del error, acotada, para mostrarla en el aviso. */
function mensajeError(e: unknown): string {
  const texto = e instanceof Error ? e.message : String(e)
  return texto.split('\n')[0].slice(0, 200)
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const tipo = body?.tipo as TipoCobro
  if (!(tipo in TABLAS)) return json({ error: 'Tipo de cobro no válido.' }, 400)
  const hoy = /^\d{4}-\d{2}-\d{2}$/.test(body?.hoy) ? (body.hoy as string) : hoyISO()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return json({ error: 'Sesión no válida.' }, 401)

  const { data: rolAdmin } = await supabase.rpc('es_admin')
  const esAdmin = Boolean(rolAdmin)

  // El cobro SaaS es del admin hacia los freelancers. Cada freelancer cobra
  // a sus propios clientes con 'proyectos' y 'cursos' (RLS ya los aísla).
  if (tipo === 'saas' && !esAdmin) {
    return json({ error: 'Solo el administrador puede ejecutar el cobro SaaS.' }, 403)
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return json(
      { error: 'El envío de correos no está configurado. Define SMTP_HOST, SMTP_USER y SMTP_PASS en las variables de entorno.' },
      500
    )
  }

  const scripts = await obtenerScripts(supabase)
  if (!scripts) return json({ error: 'No se pudieron cargar los scripts de cobro.' }, 500)

  const destinos = await obtenerDestinos(supabase, tipo)
  if ('error' in destinos) return json({ error: destinos.error }, 500)

  const hayPendientes = destinos.some((d) => etapaPendiente(d.registro, hoy))
  if (!hayPendientes) return json({ mensaje: 'No hay recordatorios pendientes por enviar.', enviados: 0 })

  const puerto = Number(SMTP_PORT ?? 465)
  const transporte = nodemailer.createTransport({
    host: SMTP_HOST,
    port: puerto,
    secure: puerto === 465,
    // Google muestra la contraseña de aplicación en bloques con espacios.
    auth: { user: SMTP_USER.trim(), pass: SMTP_PASS.replace(/\s+/g, '') },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
  })

  // Si el SMTP no responde o rechaza las credenciales, se dice aquí con el
  // motivo real en lugar de fallar correo por correo sin explicación.
  try {
    await transporte.verify()
  } catch (e) {
    console.error('SMTP no disponible', e)
    const detalle = esAdmin ? `: ${mensajeError(e)}` : '. Avisa al administrador.'
    return json({ error: `No se pudo conectar con el servidor de correo${detalle}` }, 502)
  }

  const remitente = await obtenerRemitente(supabase, tipo, SMTP_FROM || SMTP_USER)

  let enviados = 0
  let sinCorreo = 0
  let sinMarcar = 0
  const fallidos: string[] = []

  for (const destino of destinos) {
    const etapa = etapaPendiente(destino.registro, hoy)
    if (!etapa) continue
    if (!destino.email?.includes('@')) {
      sinCorreo++
      continue
    }

    const texto = rellenarPlantilla(plantillaDe(scripts, etapa), {
      nombre: destino.nombre,
      proyecto: destino.concepto,
      monto: destino.registro.monto,
    })

    try {
      await transporte.sendMail({
        from: remitente,
        replyTo: user.email,
        to: destino.email,
        subject: ASUNTOS[tipo] + (destino.concepto || 'Pendiente'),
        text: texto,
      })
      enviados++
    } catch (e) {
      console.error('Error enviando recordatorio', destino.email, e)
      fallidos.push(esAdmin ? `${destino.email} (${mensajeError(e)})` : destino.email)
      continue
    }

    // El correo ya salió: si no se puede marcar, se avisa porque el próximo
    // clic lo volvería a enviar.
    const { error: errMarca } = await supabase
      .from(TABLAS[tipo])
      .update({ [etapa.columna]: new Date().toISOString() })
      .eq('id', destino.registro.id)
    if (errMarca) {
      console.error('No se pudo marcar el aviso como enviado', destino.registro.id, errMarca)
      sinMarcar++
    }
  }

  let mensaje = `Se enviaron ${enviados} recordatorios de cobro.`
  if (sinCorreo) mensaje += ` ${sinCorreo} vencidos no tienen un correo válido.`
  if (sinMarcar) mensaje += ` ${sinMarcar} no pudieron marcarse como enviados y podrían repetirse.`
  if (fallidos.length) mensaje += ` Fallaron: ${fallidos.join('; ')}.`
  return json({ mensaje, enviados })
}

type Supabase = Awaited<ReturnType<typeof createClient>>

/**
 * Todos los correos salen por la cuenta SMTP del sistema. A los cobros de
 * cada freelancer se les pone su marca como nombre visible (Reply-To ya es
 * su correo), para que el cliente sepa de quién viene el recordatorio.
 */
async function obtenerRemitente(supabase: Supabase, tipo: TipoCobro, base: string): Promise<string> {
  if (tipo === 'saas') return base
  const { data } = await supabase.from('perfil').select('marca, nombre').maybeSingle()
  const nombre = (data?.marca || data?.nombre || '').replace(/["<>\r\n]/g, '').trim()
  if (!nombre) return base
  const direccion = base.match(/<([^>]+)>/)?.[1] ?? base
  return `"${nombre}" <${direccion}>`
}

async function obtenerScripts(supabase: Supabase): Promise<ScriptsCobro | null> {
  const { data } = await supabase.from('scripts_cobro').select('*').maybeSingle()
  if (data) return data
  // Primera vez: se crea la fila con las plantillas por defecto de la tabla.
  const { data: nueva } = await supabase.from('scripts_cobro').insert({}).select().single()
  return nueva
}

async function obtenerDestinos(supabase: Supabase, tipo: TipoCobro): Promise<Destino[] | { error: string }> {
  const columnas = 'id, monto, cobrado, fecha_pago, aviso_hoy_enviado_at, aviso_7d_enviado_at, aviso_15d_enviado_at, comprobante_url'

  if (tipo === 'saas') {
    const [{ data: filas, error }, { data: usuarios }] = await Promise.all([
      supabase.from('control_saas').select(`${columnas}, plan, usuario_id`).eq('cobrado', false).not('fecha_pago', 'is', null),
      supabase.from('usuarios').select('id, email'),
    ])
    if (error) return { error: error.message }
    const correos = new Map((usuarios ?? []).map((u) => [u.id, u.email as string | null]))
    return (filas ?? []).map((f) => {
      const email = f.usuario_id ? correos.get(f.usuario_id) ?? null : null
      return { registro: f, email, nombre: email ?? '', concepto: f.plan || 'Suscripción' }
    })
  }

  const { data: filas, error } = await supabase
    .from(TABLAS[tipo])
    .select(`${columnas}, nombre, clientes(nombre, email)`)
    .eq('cobrado', false)
    .not('fecha_pago', 'is', null)
  if (error) return { error: error.message }

  return (filas ?? []).map((f) => {
    const cliente = f.clientes as unknown as { nombre: string; email: string | null } | null
    return { registro: f, email: cliente?.email ?? null, nombre: cliente?.nombre ?? '', concepto: f.nombre }
  })
}
