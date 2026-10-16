'use client'

import { createClient } from '@/utils/supabase/client'
import { hoyISO } from './fechas'
import { crearXlsx, TIPO_XLSX } from './xlsx'
import type { Hoja } from './xlsx'

/**
 * Respaldo de datos descargable.
 *
 *  - «usuario»: todo lo del propio usuario (perfil, métodos de pago, clientes,
 *    proyectos, cursos, cobros, plantillas y su suscripción).
 *  - «plataforma» (solo administrador): lo anterior más usuarios, suscripciones,
 *    pagos y control de suscripciones de toda la plataforma y la configuración
 *    de soporte. No incluye los clientes, proyectos ni cursos de otros usuarios
 *    (RLS lo impide, y por privacidad es lo correcto) ni la contraseña de
 *    correo conectada (tabla correo_envio): un respaldo no debe llevar secretos.
 *
 * Cada respaldo se ofrece en dos formatos: Excel (para revisar, con nombres en
 * lugar de identificadores) y JSON completo (cada fila tal cual, para guardar).
 */

export type ModoRespaldo = 'usuario' | 'plataforma'
export type FormatoRespaldo = 'xlsx' | 'json'

type Fila = Record<string, unknown>
type Tablas = Record<string, Fila[]>

const TAMANO_PAGINA = 1000 // máximo de filas que devuelve PostgREST por consulta

interface Origen {
  orden: string[]
  /** Solo filas de este usuario (para tablas que el administrador ve completas). */
  propiasPor?: string
}

const TABLAS_PROPIAS: Record<string, Origen> = {
  perfil: { orden: ['owner_id'] },
  metodos_pago: { orden: ['orden', 'id'] },
  clientes: { orden: ['created_at', 'id'] },
  proyectos: { orden: ['created_at', 'id'] },
  cursos: { orden: ['created_at', 'id'] },
  suscripciones_clientes: { orden: ['cliente_id'] },
  pagos_clientes: { orden: ['created_at', 'id'] },
  scripts_cobro: { orden: ['owner_id'] },
}

const TABLAS_MI_SUSCRIPCION: Record<string, Origen> = {
  suscripciones_saas: { orden: ['usuario_id'], propiasPor: 'usuario_id' },
  pagos_saas: { orden: ['created_at', 'id'], propiasPor: 'usuario_id' },
}

const TABLAS_PLATAFORMA: Record<string, Origen> = {
  usuarios: { orden: ['id'] },
  suscripciones_saas: { orden: ['usuario_id'] },
  pagos_saas: { orden: ['created_at', 'id'] },
  control_saas: { orden: ['created_at', 'id'] },
  config_app: { orden: ['id'] },
}

async function traerTabla(tabla: string, origen: Origen, userId: string): Promise<Fila[]> {
  const supabase = createClient()
  const filas: Fila[] = []
  for (let desde = 0; ; desde += TAMANO_PAGINA) {
    let consulta = supabase.from(tabla).select('*')
    if (origen.propiasPor) consulta = consulta.eq(origen.propiasPor, userId)
    for (const columna of origen.orden) consulta = consulta.order(columna)
    const { data, error } = await consulta.range(desde, desde + TAMANO_PAGINA - 1)
    if (error) throw new Error(`No se pudo leer «${tabla}»: ${error.message}`)
    filas.push(...((data ?? []) as Fila[]))
    if (!data || data.length < TAMANO_PAGINA) break
  }
  return filas
}

async function traerGrupo(grupo: Record<string, Origen>, userId: string): Promise<Tablas> {
  const nombres = Object.keys(grupo)
  const resultados = await Promise.all(nombres.map((n) => traerTabla(n, grupo[n], userId)))
  return Object.fromEntries(nombres.map((n, i) => [n, resultados[i]]))
}

// ---------------------------------------------------------------- Excel ----

const txt = (v: unknown): string => (v === null || v === undefined ? '' : String(v))
const num = (v: unknown): number => Number(v) || 0
const sino = (v: unknown): string => (v ? 'Sí' : 'No')

function hojasExcel(t: Tablas, modo: ModoRespaldo): Hoja[] {
  const clientes = new Map((t.clientes ?? []).map((c) => [txt(c.id), txt(c.nombre)]))
  const usuarios = new Map((t.usuarios ?? []).map((u) => [txt(u.id), txt(u.email)]))
  const cliente = (id: unknown) => clientes.get(txt(id)) ?? ''
  const usuario = (id: unknown) => usuarios.get(txt(id)) ?? ''

  const hojas: Hoja[] = [
    {
      nombre: 'Perfil',
      encabezados: [
        'Nombre', 'Marca', 'Especialidad', 'URL logo', 'Moneda', 'Meta mensual', 'Código país WhatsApp',
        'Red social 1', 'Enlace 1', 'Red social 2', 'Enlace 2', 'Red social 3', 'Enlace 3',
      ],
      filas: (t.perfil ?? []).map((p) => [
        txt(p.nombre), txt(p.marca), txt(p.especialidad), txt(p.logo_url), txt(p.moneda), num(p.meta_mensual),
        txt(p.codigo_pais_whatsapp),
        txt(p.red_social_1_nombre), txt(p.red_social_1_url), txt(p.red_social_2_nombre), txt(p.red_social_2_url),
        txt(p.red_social_3_nombre), txt(p.red_social_3_url),
      ]),
      columnasMoneda: [5],
    },
    {
      nombre: 'Métodos de pago',
      encabezados: ['Nombre', 'Datos para pagar', 'Enlace de pago', '¿Tiene QR?'],
      // La imagen del QR solo va en el JSON: una celda de Excel no admite tanto texto.
      filas: (t.metodos_pago ?? []).map((m) => [txt(m.nombre), txt(m.datos), txt(m.enlace), sino(m.qr)]),
    },
    {
      nombre: 'Clientes',
      encabezados: ['Nombre', 'Email', 'Teléfono', 'DNI / Cédula', 'País', 'Fecha de registro', 'Enlace Drive', 'Notas'],
      filas: (t.clientes ?? []).map((c) => [
        txt(c.nombre), txt(c.email), txt(c.telefono), txt(c.dni), txt(c.pais), txt(c.fecha_registro), txt(c.drive_link), txt(c.notas),
      ]),
    },
    {
      nombre: 'Proyectos',
      encabezados: [
        'Proyecto', 'Cliente', 'Monto', '¿Cobrado?', 'Fecha recepción', 'Fecha entrega', 'Fecha de pago', 'Fecha de cobro',
        'Estado', 'Método de pago', 'Comprobante',
      ],
      filas: (t.proyectos ?? []).map((p) => [
        txt(p.nombre), cliente(p.cliente_id), num(p.monto), sino(p.cobrado), txt(p.fecha_recepcion), txt(p.fecha_entrega),
        txt(p.fecha_pago), txt(p.fecha_cobro), txt(p.estado_proceso), txt(p.metodo_pago), txt(p.comprobante_url),
      ]),
      columnasMoneda: [2],
    },
    {
      nombre: 'Cursos y Suscripciones',
      encabezados: [
        'Curso / Servicio', 'Cliente', 'Tipo', 'Monto', '¿Cobrado?', 'Fecha suscripción', 'Fecha de pago', 'Fecha de cobro',
        'Método de pago', 'Comprobante',
      ],
      filas: (t.cursos ?? []).map((c) => [
        txt(c.nombre), cliente(c.cliente_id), txt(c.tipo_suscripcion), num(c.monto), sino(c.cobrado), txt(c.fecha_suscripcion),
        txt(c.fecha_pago), txt(c.fecha_cobro), txt(c.metodo_pago), txt(c.comprobante_url),
      ]),
      columnasMoneda: [3],
    },
    {
      nombre: 'Pagos de clientes',
      encabezados: ['Fecha de pago', 'Cliente', 'Periodo', 'Plan', 'Método', 'Monto', 'Recibo'],
      filas: (t.pagos_clientes ?? []).map((p) => [
        txt(p.fecha_pago), cliente(p.cliente_id), txt(p.periodo), txt(p.plan), txt(p.metodo), num(p.monto), txt(p.recibo_url),
      ]),
      columnasMoneda: [5],
    },
    {
      nombre: 'Suscripciones de clientes',
      encabezados: ['Cliente', 'Plan', 'Próximo pago', 'Estado'],
      filas: (t.suscripciones_clientes ?? []).map((s) => [cliente(s.cliente_id), txt(s.plan), txt(s.proximo_pago), txt(s.estado)]),
    },
    {
      nombre: 'Scripts de cobro',
      encabezados: ['Vence hoy', 'Vencido 7 días', 'Vencido 15 días'],
      filas: (t.scripts_cobro ?? []).map((s) => [txt(s.plantilla_hoy), txt(s.plantilla_7d), txt(s.plantilla_15d)]),
    },
  ]

  if (modo === 'usuario') {
    hojas.push(
      {
        nombre: 'Mi suscripción',
        encabezados: ['Plan', 'Próximo pago', 'Estado'],
        filas: (t.suscripciones_saas ?? []).map((s) => [txt(s.plan), txt(s.proximo_pago), txt(s.estado)]),
      },
      {
        nombre: 'Mis pagos de suscripción',
        encabezados: ['Fecha de pago', 'Periodo', 'Plan', 'Método', 'Monto', 'Recibo'],
        filas: (t.pagos_saas ?? []).map((p) => [txt(p.fecha_pago), txt(p.periodo), txt(p.plan), txt(p.metodo), num(p.monto), txt(p.recibo_url)]),
        columnasMoneda: [4],
      }
    )
  } else {
    hojas.push(
      {
        nombre: 'Usuarios',
        encabezados: ['Nombre', 'Email', 'Teléfono', 'Rol', 'Estado', 'Fecha de registro'],
        filas: (t.usuarios ?? []).map((u) => [txt(u.cliente), txt(u.email), txt(u.telefono), txt(u.rol), txt(u.estado), txt(u.fecha_registro)]),
      },
      {
        nombre: 'Suscripciones SaaS',
        encabezados: ['Usuario', 'Plan', 'Próximo pago', 'Estado'],
        filas: (t.suscripciones_saas ?? []).map((s) => [usuario(s.usuario_id), txt(s.plan), txt(s.proximo_pago), txt(s.estado)]),
      },
      {
        nombre: 'Pagos SaaS',
        encabezados: ['Fecha de pago', 'Usuario', 'Periodo', 'Plan', 'Método', 'Monto', 'Recibo'],
        filas: (t.pagos_saas ?? []).map((p) => [
          txt(p.fecha_pago), usuario(p.usuario_id), txt(p.periodo), txt(p.plan), txt(p.metodo), num(p.monto), txt(p.recibo_url),
        ]),
        columnasMoneda: [5],
      },
      {
        nombre: 'Control Suscripciones',
        encabezados: [
          'Servicio / Plan', 'Usuario', 'Tipo', 'Monto', '¿Cobrado?', 'Fecha suscripción', 'Fecha de pago', 'Fecha de cobro',
          'Método de pago', 'Comprobante',
        ],
        filas: (t.control_saas ?? []).map((c) => [
          txt(c.plan), usuario(c.usuario_id), txt(c.tipo_suscripcion), num(c.monto), sino(c.cobrado), txt(c.fecha_suscripcion),
          txt(c.fecha_pago), txt(c.fecha_cobro), txt(c.metodo_pago), txt(c.comprobante_url),
        ]),
        columnasMoneda: [3],
      },
      {
        nombre: 'Configuración',
        encabezados: ['Email de soporte', 'WhatsApp de soporte'],
        filas: (t.config_app ?? []).map((c) => [txt(c.soporte_email), txt(c.soporte_whatsapp)]),
      }
    )
  }
  return hojas
}

// ------------------------------------------------------------ Descarga ----

function descargar(nombreArchivo: string, contenido: BlobPart, tipo: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }))
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

const claveUltimo = (userId: string, modo: ModoRespaldo) => `cfp:ultimo-respaldo:${modo}:${userId}`

/** Fecha (ISO) del último respaldo descargado desde este navegador, o null. */
export function leerUltimoRespaldo(userId: string, modo: ModoRespaldo): string | null {
  try {
    return localStorage.getItem(claveUltimo(userId, modo))
  } catch {
    return null
  }
}

function marcarRespaldo(userId: string, modo: ModoRespaldo): string {
  const ahora = new Date().toISOString()
  try {
    localStorage.setItem(claveUltimo(userId, modo), ahora)
  } catch {
    /* sin almacenamiento disponible: el respaldo igual se descargó */
  }
  return ahora
}

/** Lee los datos, arma el archivo y lo descarga. Devuelve la fecha ISO del respaldo. */
export async function generarRespaldo(modo: ModoRespaldo, formato: FormatoRespaldo): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.')

  if (modo === 'plataforma') {
    const { data: esAdmin } = await supabase.rpc('es_admin')
    if (!esAdmin) throw new Error('Solo el administrador puede descargar el respaldo de la plataforma.')
  }

  const grupos = [TABLAS_PROPIAS, modo === 'plataforma' ? TABLAS_PLATAFORMA : TABLAS_MI_SUSCRIPCION]
  const [propias, extra] = await Promise.all(grupos.map((g) => traerGrupo(g, user.id)))
  const tablas: Tablas = { ...propias, ...extra }

  const fecha = hoyISO()
  const base = modo === 'plataforma' ? 'respaldo-plataforma' : 'respaldo-freelancer'

  if (formato === 'xlsx') {
    descargar(`${base}-${fecha}.xlsx`, crearXlsx(hojasExcel(tablas, modo)), TIPO_XLSX)
  } else {
    const paquete = {
      aplicacion: 'Control Freelancer Pro',
      version: 1,
      tipo: modo,
      generado: new Date().toISOString(),
      usuario: { id: user.id, email: user.email ?? null },
      tablas,
    }
    descargar(`${base}-${fecha}.json`, JSON.stringify(paquete, null, 2), 'application/json')
  }
  return marcarRespaldo(user.id, modo)
}
