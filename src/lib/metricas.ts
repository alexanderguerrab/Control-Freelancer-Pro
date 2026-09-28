import { parseFecha } from './fechas'

/** Proyecto, curso o cuota SaaS reducido a lo que usan dashboard y reportes. */
export interface Movimiento {
  concepto: string
  cliente: string
  monto: number
  cobrado: boolean
  fecha_pago: string | null
}

function enMes(mov: Movimiento, anio: number, mes: number) {
  const f = parseFecha(mov.fecha_pago)
  return !!f && f.getFullYear() === anio && f.getMonth() === mes
}

/** Métricas del Dashboard Visual (actualizarCalculosDashboard del legacy). */
export function metricasDashboard(movimientos: Movimiento[], meta: number, hoy: Date) {
  const anio = hoy.getFullYear()
  const mes = hoy.getMonth()
  let totalCobrado = 0
  let pendiente = 0
  let activos = 0
  const porCliente = new Map<string, number>()

  for (const mov of movimientos) {
    if (!enMes(mov, anio, mes)) continue
    activos++
    if (mov.cobrado) {
      totalCobrado += mov.monto
      porCliente.set(mov.cliente, (porCliente.get(mov.cliente) ?? 0) + mov.monto)
    } else {
      pendiente += mov.monto
    }
  }

  const pendientes = movimientos.filter((m) => m.concepto && !m.cobrado).slice(0, 5)
  const clientes = [...porCliente.entries()].filter(([, v]) => v > 0)

  return {
    totalCobrado,
    pendiente,
    activos,
    pendientes,
    porCliente: { labels: clientes.map(([c]) => c), valores: clientes.map(([, v]) => v) },
    meta: {
      total: meta,
      alcanzado: Math.min(totalCobrado, meta),
      porAlcanzar: Math.max(0, meta - totalCobrado),
      superada: totalCobrado > meta,
      extra: Math.max(0, totalCobrado - meta),
    },
  }
}

/** Ingresos cobrados por mes de un año (obtenerDatosReporteAnual). */
export function reporteAnual(movimientos: Movimiento[], anio: number) {
  const meses = new Array<number>(12).fill(0)
  for (const mov of movimientos) {
    const f = parseFecha(mov.fecha_pago)
    if (mov.cobrado && f && f.getFullYear() === anio) meses[f.getMonth()] += mov.monto
  }
  return { meses, total: meses.reduce((a, b) => a + b, 0) }
}

/** Ingresos cobrados por cliente en un mes (obtenerDatosReporteClientes). */
export function reportePorCliente(movimientos: Movimiento[], anio: number, mes: number) {
  const mapa = new Map<string, number>()
  for (const mov of movimientos) {
    if (mov.cobrado && enMes(mov, anio, mes)) {
      mapa.set(mov.cliente, (mapa.get(mov.cliente) ?? 0) + mov.monto)
    }
  }
  return { labels: [...mapa.keys()], valores: [...mapa.values()] }
}
