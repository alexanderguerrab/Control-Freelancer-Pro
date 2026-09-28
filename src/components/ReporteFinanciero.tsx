'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bar, Pie } from 'react-chartjs-2'
import { COLORES_PASTEL, etiquetaMonto, useEsMovil } from './charts'
import { ANIOS_REPORTE, MESES, formatoMoneda } from '@/lib/fechas'
import { reporteAnual, reportePorCliente, type Movimiento } from '@/lib/metricas'

/**
 * Reporte anual por mes + reparto por cliente de un mes. Lo usan el
 * Reporte Mensual del usuario y el Reporte Financiero Admin (SaaS).
 */
export default function ReporteFinanciero({ cargar, tituloAnual, tituloClientes }: {
  cargar: () => Promise<Movimiento[]>
  tituloAnual: string
  tituloClientes: string
}) {
  const hoy = new Date()
  const anioInicial = ANIOS_REPORTE.includes(hoy.getFullYear()) ? hoy.getFullYear() : ANIOS_REPORTE[0]
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [anio, setAnio] = useState(anioInicial)
  const [anioCliente, setAnioCliente] = useState(anioInicial)
  const [mesCliente, setMesCliente] = useState(hoy.getMonth())
  const esMovil = useEsMovil()

  useEffect(() => {
    let activo = true
    cargar().then((m) => {
      if (activo) setMovimientos(m)
    })
    return () => {
      activo = false
    }
  }, [cargar])

  const anual = useMemo(() => reporteAnual(movimientos, anio), [movimientos, anio])
  const porCliente = useMemo(
    () => reportePorCliente(movimientos, anioCliente, mesCliente),
    [movimientos, anioCliente, mesCliente]
  )
  const maximo = Math.max(...anual.meses, 1)
  const hayCobros = porCliente.labels.length > 0

  return (
    <div className="grid grid-cols-2 gap-4 items-stretch max-lg:grid-cols-1">
      <div className="bg-white rounded-xl shadow-md border-2 border-accent-cyan overflow-hidden flex flex-col">
        <div className="bg-accent-cyan text-black text-center font-bold p-3 text-sm">{tituloAnual}</div>
        <div className="p-5 grow flex flex-col">
          <div className="flex justify-center max-md:justify-start items-center relative bg-[#ffff00] p-2.5 font-bold rounded">
            <span className="text-black text-[0.75em] uppercase">AÑO FISCAL</span>
            <select value={anio} onChange={(e) => setAnio(Number(e.target.value))}
              className="absolute right-2.5 w-[100px] p-1 border border-gray-300 bg-white text-center">
              {ANIOS_REPORTE.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="tabla-contenedor mt-4">
            <table className="w-full border border-gray-200 text-xs">
              <thead>
                <tr className="bg-accent-cyan text-black">
                  <th className="w-1/4 border-r border-gray-200 p-2">MES</th>
                  <th className="w-[30%] border-r border-gray-200 p-2">INGRESOS</th>
                  <th className="w-[45%] p-2 whitespace-nowrap">ESTADO VISUAL</th>
                </tr>
              </thead>
              <tbody>
                {anual.meses.map((monto, i) => (
                  <tr key={i} className="border-b border-gray-100 text-center">
                    <td className="font-bold border-r border-gray-200 p-1.5">{MESES[i]}</td>
                    <td className={`font-bold border-r border-gray-200 p-1.5 ${monto > 0 ? 'bg-[#00ff00]' : ''}`}>
                      {formatoMoneda(monto)}
                    </td>
                    <td className="p-1.5">
                      <div className="bg-success h-[18px]" style={{ width: `${(monto / maximo) * 100}%` }} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-success text-black font-bold text-sm border-t-2 border-[#27ae60]">
                  <td className="py-4 px-1.5 border-r border-[#27ae60] text-center">TOTAL DEL AÑO</td>
                  <td colSpan={2} className="text-center text-lg">{formatoMoneda(anual.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-5 bg-[#ffff00] p-4 rounded border border-[#e5e500] grow min-h-[250px]">
            <Bar
              data={{ labels: MESES, datasets: [{ data: anual.meses, backgroundColor: '#00ff00' }] }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  datalabels: {
                    color: '#000000',
                    anchor: esMovil ? 'center' : 'end',
                    align: esMovil ? 'center' : 'top',
                    rotation: esMovil ? -90 : 0,
                    offset: esMovil ? 0 : 5,
                    font: { weight: 'bold', size: esMovil ? 10 : 12 },
                    formatter: etiquetaMonto,
                  },
                },
                scales: { x: { grid: { display: false } }, y: { grid: { display: false } } },
              }}
            />
          </div>
        </div>
      </div>

      <div className="bg-accent-cyan rounded-xl shadow-md border-2 border-[#ff00ff] overflow-hidden flex flex-col">
        <div className="bg-[#ff00ff] text-white text-center font-bold p-3 text-sm">{tituloClientes}</div>
        <div className="p-5 flex flex-col grow">
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            <div className="bg-[#ff00ff] p-1.5 text-center font-bold text-white">
              AÑO
              <select value={anioCliente} onChange={(e) => setAnioCliente(Number(e.target.value))}
                className="w-[90%] p-1 mt-1 text-black bg-white text-center">
                {ANIOS_REPORTE.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="bg-[#ff00ff] p-1.5 text-center font-bold text-white">
              MES
              <select value={mesCliente} onChange={(e) => setMesCliente(Number(e.target.value))}
                className="w-[90%] p-1 mt-1 text-black bg-white text-center">
                {MESES.map((m, i) => <option key={m} value={i}>{m.charAt(0) + m.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
          </div>
          <div className="p-2.5 grow min-h-[300px]">
            <Pie
              data={{
                labels: hayCobros ? porCliente.labels : ['Sin cobros'],
                datasets: [{ data: hayCobros ? porCliente.valores : [1], backgroundColor: COLORES_PASTEL }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { datalabels: { formatter: (v: number) => (hayCobros ? etiquetaMonto(v) : '') } },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
