'use client'

import ReporteFinanciero from '@/components/ReporteFinanciero'
import { cargarMovimientosUsuario } from '@/lib/movimientos'

export default function ReportePage() {
  return (
    <div>
      <h1 className="titulo-seccion">📈 Reporte Mensual y Anual</h1>
      <ReporteFinanciero
        cargar={cargarMovimientosUsuario}
        tituloAnual="REPORTE DE INGRESOS ANUAL"
        tituloClientes="REPORTE POR CLIENTE"
      />
    </div>
  )
}
