export const MESES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
]

/** Años disponibles en los selectores de reportes (igual que el legacy). */
export const ANIOS_REPORTE = [2026, 2027, 2028, 2029, 2030, 2031, 2032]

/**
 * Convierte 'yyyy-mm-dd' en una fecha local a medianoche. `new Date('2026-09-28')`
 * la interpreta en UTC y en zonas como UTC-4 cae en el día anterior.
 */
export function parseFecha(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export function aISO(fecha: Date): string {
  const y = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, '0')
  const d = String(fecha.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function hoyISO(): string {
  return aISO(new Date())
}

/** Días transcurridos desde `iso` hasta `hoy` (negativo si es futuro). */
export function diasDesde(iso: string | null, hoy: string): number | null {
  const fecha = parseFecha(iso)
  const ref = parseFecha(hoy)
  if (!fecha || !ref) return null
  return Math.round((ref.getTime() - fecha.getTime()) / 86_400_000)
}

/** Suma un mes como `Date.setMonth` en Apps Script (31-ene + 1 mes = 3-mar). */
export function sumarMes(iso: string): string {
  const fecha = parseFecha(iso) ?? new Date()
  fecha.setMonth(fecha.getMonth() + 1)
  return aISO(fecha)
}

/**
 * Suma meses sin desbordar: 30-ago + 1 mes = 30-sep y 31-ago + 1 mes = 30-sep
 * (igual que el `interval '1 month'` de Postgres, que usan los triggers).
 */
export function sumarMeses(iso: string, meses: number): string {
  const f = parseFecha(iso) ?? new Date()
  const dia = f.getDate()
  f.setDate(1)
  f.setMonth(f.getMonth() + meses)
  const ultimo = new Date(f.getFullYear(), f.getMonth() + 1, 0).getDate()
  f.setDate(Math.min(dia, ultimo))
  return aISO(f)
}

export type TipoSuscripcion = 'Mensual' | 'Anual'
export const TIPOS_SUSCRIPCION: TipoSuscripcion[] = ['Mensual', 'Anual']

/**
 * Fecha de pago de un ciclo a partir de su fecha de suscripción:
 *  - Mensual: el mismo día del mes siguiente.
 *  - Anual: la misma fecha (se paga al suscribirse y el ciclo dura un año).
 */
export function fechaPagoDeCiclo(fechaSuscripcion: string, tipo: TipoSuscripcion): string {
  return tipo === 'Anual' ? fechaSuscripcion : sumarMeses(fechaSuscripcion, 1)
}

/**
 * Datos del ciclo siguiente al de una fila: la nueva fecha de suscripción
 * es la de la renovación (fecha de pago en mensual, un año después en
 * anual) y de ahí sale su fecha de pago.
 */
export function siguienteCiclo(
  fechaSuscripcion: string | null,
  fechaPago: string | null,
  tipo: TipoSuscripcion,
  hoy: string
): { fecha_suscripcion: string; fecha_pago: string } {
  const inicio =
    tipo === 'Anual'
      ? sumarMeses(fechaSuscripcion || fechaPago || hoy, 12)
      : fechaPago || (fechaSuscripcion ? sumarMeses(fechaSuscripcion, 1) : hoy)
  return { fecha_suscripcion: inicio, fecha_pago: fechaPagoDeCiclo(inicio, tipo) }
}

export function formatoMoneda(valor: number): string {
  return '$' + valor.toLocaleString('es-ES', { maximumFractionDigits: 2 })
}
