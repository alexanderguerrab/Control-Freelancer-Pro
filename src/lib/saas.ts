import { hoyISO } from './fechas'
import type { SuscripcionSaaS } from './types'

/**
 * Estado que se muestra de una suscripción SaaS. En el sheet el estado
 * quedaba en "Al día" aunque pasara la fecha; aquí se marca "Vencido"
 * cuando el próximo pago ya pasó.
 */
export function estadoSuscripcion(s: Pick<SuscripcionSaaS, 'proximo_pago' | 'estado'> | null, hoy = hoyISO()) {
  if (!s) return 'Pendiente'
  if (s.proximo_pago && s.proximo_pago < hoy) return 'Vencido'
  return s.estado
}
