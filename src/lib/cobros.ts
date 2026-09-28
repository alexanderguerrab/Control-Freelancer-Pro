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

/**
 * Etapa cuyo recordatorio toca enviar. Como en el legacy, se envía una
 * sola por ejecución y en orden: primero la de hoy, luego 7D y luego 15D.
 */
export function etapaPendiente(registro: RegistroCobrable, hoy: string): Etapa | null {
  if (registro.cobrado) return null
  const dias = diasDesde(registro.fecha_pago, hoy)
  if (dias === null) return null
  return ETAPAS.find((etapa) => dias >= etapa.dias && !registro[etapa.columna]) ?? null
}

export function rellenarPlantilla(
  plantilla: string,
  datos: { nombre: string; proyecto: string; monto: number }
): string {
  return plantilla
    .replaceAll('[Nombre]', datos.nombre)
    .replaceAll('[Proyecto]', datos.proyecto)
    .replaceAll('[Monto]', String(datos.monto))
}

export function plantillaDe(scripts: ScriptsCobro, etapa: Etapa): string {
  return scripts[etapa.plantilla]
}
