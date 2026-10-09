import { parseFecha } from './fechas'

/** Proyecto, curso o cuota SaaS reducido a lo que usan dashboard y reportes. */
export interface Movimiento {
  concepto: string
  cliente: string
  monto: number
  cobrado: boolean
  /** Fecha de vencimiento. */
  fecha_pago: string | null
  /** Día real del cobro; si falta se usa fecha_pago. */
  fecha_cobro?: string | null
}

/**
 * Fecha que cuenta para cada movimiento: un cobrado pertenece al día en que
 * se cobró (no al de vencimiento); un pendiente, a su fecha de vencimiento.
 */
function fechaDe(mov: Movimiento): string | null {
  return mov.cobrado ? (mov.fecha_cobro ?? mov.fecha_pago) : mov.fecha_pago
}

function enMes(mov: Movimiento, anio: number, mes: number) {
  const f = parseFecha(fechaDe(mov))
  return !!f && f.getFullYear() === anio && f.getMonth() === mes
}

/**
 * Métricas del Dashboard Visual.
 *  - totalCobrado: lo cobrado en el mes actual.
 *  - pendiente / pendientes: lo no cobrado que vence este mes o antes
 *    (incluye lo atrasado), ordenado por vencimiento; la tarjeta y la tabla
 *    usan el mismo conjunto.
 *  - activos: registros del mes (cobrados o por cobrar).
 *  - meta: si no hay meta definida (<= 0) no se declara "superada".
 */
export function metricasDashboard(movimientos: Movimiento[], meta: number, hoy: Date) {
  const anio = hoy.getFullYear()
  const mes = hoy.getMonth()
  const finDeMes = new Date(anio, mes + 1, 0)
  let totalCobrado = 0
  let pendiente = 0
  let activos = 0
  const porCliente = new Map<string, number>()
  const porCobrar: { mov: Movimiento; vence: Date }[] = []

  for (const mov of movimientos) {
    if (mov.cobrado) {
      if (!enMes(mov, anio, mes)) continue
      activos++
      totalCobrado += mov.monto
      porCliente.set(mov.cliente, (porCliente.get(mov.cliente) ?? 0) + mov.monto)
    } else {
      const vence = parseFecha(mov.fecha_pago)
      if (!vence || vence > finDeMes) continue
      pendiente += mov.monto
      porCobrar.push({ mov, vence })
      if (enMes(mov, anio, mes)) activos++
    }
  }

  const pendientes = porCobrar
    .sort((a, b) => a.vence.getTime() - b.vence.getTime())
    .slice(0, 5)
    .map((p) => p.mov)
  const clientes = [...porCliente.entries()].filter(([, v]) => v > 0)
  const definida = meta > 0

  return {
    totalCobrado,
    pendiente,
    activos,
    pendientes,
    porCliente: { labels: clientes.map(([c]) => c), valores: clientes.map(([, v]) => v) },
    meta: {
      definida,
      total: meta,
      alcanzado: definida ? Math.min(totalCobrado, meta) : 0,
      porAlcanzar: definida ? Math.max(0, meta - totalCobrado) : 0,
      superada: definida && totalCobrado > meta,
      extra: definida ? Math.max(0, totalCobrado - meta) : 0,
    },
  }
}

/** Ingresos cobrados por mes de un año (según el día real de cobro). */
export function reporteAnual(movimientos: Movimiento[], anio: number) {
  const meses = new Array<number>(12).fill(0)
  for (const mov of movimientos) {
    if (!mov.cobrado) continue
    const f = parseFecha(fechaDe(mov))
    if (f && f.getFullYear() === anio) meses[f.getMonth()] += mov.monto
  }
  return { meses, total: meses.reduce((a, b) => a + b, 0) }
}

/** Ingresos cobrados por cliente en un mes. */
export function reportePorCliente(movimientos: Movimiento[], anio: number, mes: number) {
  const mapa = new Map<string, number>()
  for (const mov of movimientos) {
    if (mov.cobrado && enMes(mov, anio, mes)) {
      mapa.set(mov.cliente, (mapa.get(mov.cliente) ?? 0) + mov.monto)
    }
  }
  return { labels: [...mapa.keys()], valores: [...mapa.values()] }
}
