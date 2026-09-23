'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

interface Proyecto {
  id: string
  nombre_proyecto: string
  monto: number
  cobrado: boolean
  fecha_recepcion: string
  fecha_entrega: string
  fecha_pago: string
  estado_proceso: string
  comprobante_url: string
  clientes?: { nombre: string }
}

export default function ProyectosPage() {
  const supabase = createClient()
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { cargarProyectos() }, [])

  async function cargarProyectos() {
    setLoading(true)
    const { data } = await supabase
      .from('proyectos')
      .select('*, clientes(nombre)')
      .order('created_at', { ascending: false })
    if (data) setProyectos(data)
    setLoading(false)
  }

  async function toggleCobrado(id: string, cobrado: boolean) {
    await supabase.from('proyectos').update({ cobrado: !cobrado }).eq('id', id)
    cargarProyectos()
  }

  async function cambiarEstado(id: string, estado: string) {
    await supabase.from('proyectos').update({ estado_proceso: estado }).eq('id', id)
    cargarProyectos()
  }

  function calcularVencimiento(fechaPago: string) {
    if (!fechaPago) return { hoy: '', d7: '', d15: '' }
    const hoy = new Date(); hoy.setHours(0,0,0,0)
    const fp = new Date(fechaPago); fp.setHours(0,0,0,0)
    const diff = Math.floor((hoy.getTime() - fp.getTime()) / (1000 * 60 * 60 * 24))
    return {
      hoy: diff >= 0 ? 'VENCIDO' : '',
      d7: diff >= 7 ? 'VENCIDO 7D' : '',
      d15: diff >= 15 ? 'VENCIDO 15D' : '',
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-center text-primary mb-6">📂 Proyectos y Finanzas</h1>
      <div className="bg-white p-6 rounded-xl shadow-md w-full">
        <h3 className="text-primary-light font-semibold mb-4">📊 Gestión de Proyectos Freelance</h3>
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse min-w-[1200px]">
            <thead>
              <tr>
                {['Proyecto', 'Cliente', 'Monto', 'Cobrado', 'F. Rec.', 'F. Entr.', 'F. Pago', 'Estado', 'Vence Hoy', 'Vence 7D', 'Vence 15D', 'Comprobante'].map(h => (
                  <th key={h} className="bg-gray-50 border-b-2 border-gray-200 py-3 px-2 text-center text-[0.85em] font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} className="text-center py-8 text-gray-400">Cargando proyectos...</td></tr>
              ) : proyectos.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-8 text-gray-400">No hay proyectos registrados</td></tr>
              ) : (
                proyectos.map(p => {
                  const v = p.cobrado ? { hoy: '', d7: '', d15: '' } : calcularVencimiento(p.fecha_pago)
                  return (
                    <tr key={p.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="py-2 px-1 border-b border-gray-100 text-center text-[0.85em] text-primary">{p.nombre_proyecto}</td>
                      <td className="py-2 px-1 border-b border-gray-100 text-center text-[0.85em] text-primary">{p.clientes?.nombre || '-'}</td>
                      <td className="py-2 px-1 border-b border-gray-100 text-center text-[0.85em] text-green-700 font-bold">${p.monto}</td>
                      <td className="py-2 px-1 border-b border-gray-100 text-center">
                        <input type="checkbox" checked={p.cobrado} onChange={() => toggleCobrado(p.id, p.cobrado)} className="w-4 h-4 cursor-pointer" />
                      </td>
                      <td className="py-2 px-1 border-b border-gray-100 text-center text-[0.85em] text-primary">{p.fecha_recepcion || '-'}</td>
                      <td className="py-2 px-1 border-b border-gray-100 text-center text-[0.85em] text-primary">{p.fecha_entrega || '-'}</td>
                      <td className="py-2 px-1 border-b border-gray-100 text-center text-[0.85em] text-primary">{p.fecha_pago || '-'}</td>
                      <td className="py-2 px-1 border-b border-gray-100 text-center">
                        <select value={p.estado_proceso} onChange={e => cambiarEstado(p.id, e.target.value)}
                          className="border border-gray-200 rounded px-2 py-1 text-center text-[0.85em] cursor-pointer min-w-[130px]">
                          <option value="En Proceso">En Proceso</option>
                          <option value="Terminado">Terminado</option>
                          <option value="Pausado">Pausado</option>
                        </select>
                      </td>
                      <td className="py-2 px-1 border-b border-gray-100 text-center">
                        {v.hoy && <span className="bg-red-500 text-white px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase">{v.hoy}</span>}
                      </td>
                      <td className="py-2 px-1 border-b border-gray-100 text-center">
                        {v.d7 && <span className="bg-accent-cyan text-black px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase">{v.d7}</span>}
                      </td>
                      <td className="py-2 px-1 border-b border-gray-100 text-center">
                        {v.d15 && <span className="bg-success text-white px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase">{v.d15}</span>}
                      </td>
                      <td className="py-2 px-1 border-b border-gray-100 text-center">
                        {p.comprobante_url && (
                          <a href={p.comprobante_url} target="_blank" className="text-accent hover:underline text-sm">📎 Ver</a>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
