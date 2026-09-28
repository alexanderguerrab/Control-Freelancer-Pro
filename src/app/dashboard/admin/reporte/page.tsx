'use client'

import ReporteFinanciero from '@/components/ReporteFinanciero'
import { cargarMovimientosSaaS } from '@/lib/movimientos'

export default function ReporteSaaSPage() {
  return (
    <div>
      <h1 className="titulo-seccion">📈 Reporte Financiero Admin</h1>
      <ReporteFinanciero
        cargar={cargarMovimientosSaaS}
        tituloAnual="REPORTE DE INGRESOS SAAS ANUAL"
        tituloClientes="REPORTE SAAS POR USUARIO"
      />
    </div>
  )
}
