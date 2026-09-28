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

export function formatoMoneda(valor: number): string {
  return '$' + valor.toLocaleString('es-ES', { maximumFractionDigits: 2 })
}
