'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function DashboardVisualPage() {
  const supabase = createClient()
  const [totalCobrado, setTotalCobrado] = useState(0)
  const [totalPendiente, setTotalPendiente] = useState(0)
  const [totalActivos, setTotalActivos] = useState(0)

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    // Proyectos
    const { data: proyectos } = await supabase.from('proyectos').select('monto, cobrado, estado_proceso')
    if (proyectos) {
      const cobrado = proyectos.filter(p => p.cobrado).reduce((sum, p) => sum + Number(p.monto), 0)
      const pendiente = proyectos.filter(p => !p.cobrado).reduce((sum, p) => sum + Number(p.monto), 0)
      const activos = proyectos.filter(p => p.estado_proceso === 'En Proceso').length

      // Cursos
      const { data: cursos } = await supabase.from('cursos_suscripciones').select('monto, cobrado')
      if (cursos) {
        const cursoCobrado = cursos.filter(c => c.cobrado).reduce((sum, c) => sum + Number(c.monto), 0)
        const cursoPendiente = cursos.filter(c => !c.cobrado).reduce((sum, c) => sum + Number(c.monto), 0)
        setTotalCobrado(cobrado + cursoCobrado)
        setTotalPendiente(pendiente + cursoPendiente)
        setTotalActivos(activos + cursos.length)
      } else {
        setTotalCobrado(cobrado)
        setTotalPendiente(pendiente)
        setTotalActivos(activos)
      }
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-center text-primary uppercase mb-6">📊 DASHBOARD</h1>

      <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
        <div className="bg-white rounded-xl p-5 shadow-md text-center border-t-[5px] border-t-green-700">
          <label className="text-green-700 text-[0.75em] font-bold uppercase">💰 TOTAL COBRADO 💵</label>
          <h2 className="text-[2.2em] font-bold text-green-700 mt-2">${totalCobrado.toFixed(2)}</h2>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-md text-center border-t-[5px] border-t-warning-gold">
          <label className="text-warning-gold text-[0.75em] font-bold uppercase">⏳ FACTURAS PENDIENTES ⏰</label>
          <h2 className="text-[2.2em] font-bold text-red-600 mt-2">${totalPendiente.toFixed(2)}</h2>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-md text-center border-t-[5px] border-t-blue-600">
          <label className="text-blue-600 text-[0.75em] font-bold uppercase">🚀 PROYECTOS/CURSOS ACTIVOS 🚀</label>
          <h2 className="text-[2.2em] font-bold text-blue-600 mt-2">{totalActivos}</h2>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md mt-6 p-6">
        <div className="bg-warning-gold text-black p-1.5 font-extrabold text-center text-sm">PROYECTOS Y CUOTAS PENDIENTES DE COBRO</div>
        <p className="text-center text-gray-400 py-8 text-sm">Los gráficos con Chart.js se configurarán en la siguiente iteración.</p>
      </div>
    </div>
  )
}
