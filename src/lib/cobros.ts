import { diasDesde } from './fechas'
import type { RegistroCobrable, ScriptsCobro } from './types'

export type TipoCobro = 'proyectos' | 'cursos' | 'saas'

/** Las tres etapas de recordatorio: vence hoy, 7 y 15 días de atraso. */
export const ETAPAS = [
  { dias: 0, columna: 'aviso_hoy_enviado_at', plantilla: 'plantilla_hoy', etiqueta: 'VENCIDO' },
  { dias: 7, columna: 'aviso_7d_enviado_at', plantilla: 'plantilla_7d', etiqueta: 'VENCIDO 7D' },
  { dias: 15, columna: 'aviso_15d_enviado_at', plantilla: 'plantilla_15d', etiqueta: 'VENCIDO 15D' },
] as const

export type Etapa = (typeof ETAPAS)[number]

/**
 * Texto de las columnas Vence Hoy / 7 Días / 15 Días: 'VENCIDO…' si ya
 * pasó el plazo, 'ENVIADO' si se mandó el recordatorio, '' si nada.
 */
export function estadosVencimiento(registro: RegistroCobrable, hoy: string): string[] {
  const dias = registro.cobrado ? null : diasDesde(registro.fecha_pago, hoy)
  return ETAPAS.map((etapa) => {
    if (registro[etapa.columna]) return 'ENVIADO'
    if (dias !== null && dias >= etapa.dias) return etapa.etiqueta
    return ''
  })
}

export interface PlanCobro {
  /** Recordatorio que se envía ahora. */
  etapa: Etapa
  /** Etapas anteriores que nunca se enviaron y se marcan como superadas. */
  omitir: Etapa[]
}

/**
 * Qué recordatorio toca enviar: siempre el de la etapa más avanzada ya
 * alcanzada, para que el texto coincida con el atraso real (a 16 días
 * sale la plantilla de 15 días, no la de "vence hoy"). Las etapas
 * anteriores sin enviar se marcan como omitidas. Una sola por ejecución.
 */
export function planCobro(registro: RegistroCobrable, hoy: string): PlanCobro | null {
  if (registro.cobrado) return null
  const dias = diasDesde(registro.fecha_pago, hoy)
  if (dias === null) return null

  const alcanzadas = ETAPAS.filter((etapa) => dias >= etapa.dias)
  const ultima = alcanzadas[alcanzadas.length - 1]
  if (!ultima || registro[ultima.columna]) return null

  return {
    etapa: ultima,
    omitir: alcanzadas.filter((etapa) => etapa !== ultima && !registro[etapa.columna]),
  }
}

/**
 * Etapa que corresponde por días de atraso, sin mirar si ya se mandó el
 * correo. La usa el recordatorio por WhatsApp, que es manual: aunque el
 * correo de esa etapa ya haya salido, el usuario puede querer insistir.
 * Sin fecha de pago o aún sin vencer, se usa la de «vence hoy».
 */
export function etapaPorAtraso(registro: RegistroCobrable, hoy: string): Etapa {
  const dias = diasDesde(registro.fecha_pago, hoy)
  if (dias === null) return ETAPAS[0]
  const alcanzadas = ETAPAS.filter((etapa) => dias >= etapa.dias)
  return alcanzadas[alcanzadas.length - 1] ?? ETAPAS[0]
}

export function etapaPendiente(registro: RegistroCobrable, hoy: string): Etapa | null {
  return planCobro(registro, hoy)?.etapa ?? null
}

/**
 * Sustituye [Nombre], [Proyecto] y [Monto] en una sola pasada. Usar una
 * función evita que "$&" o "$1" dentro de un dato se interpreten como
 * patrones de reemplazo, y que un dato que contenga "[Monto]" se vuelva
 * a sustituir.
 */
export function rellenarPlantilla(
  plantilla: string,
  datos: { nombre: string; proyecto: string; monto: number }
): string {
  const valores: Record<string, string> = {
    Nombre: datos.nombre,
    Proyecto: datos.proyecto,
    Monto: String(datos.monto),
  }
  return plantilla.replace(/\[(Nombre|Proyecto|Monto)\]/g, (_, clave: string) => valores[clave])
}

export function plantillaDe(scripts: ScriptsCobro, etapa: Etapa): string {
  return scripts[etapa.plantilla]
}
