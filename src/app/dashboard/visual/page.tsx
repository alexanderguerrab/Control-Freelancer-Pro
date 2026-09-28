'use client'

import { useEffect, useState } from 'react'
import { Bar, Doughnut } from 'react-chartjs-2'
import { createClient } from '@/utils/supabase/client'
import { etiquetaMonto } from '@/components/charts'
import { Cargando } from '@/components/ui'
import { MESES, formatoMoneda } from '@/lib/fechas'
import { cargarMovimientosUsuario } from '@/lib/movimientos'
import { metricasDashboard } from '@/lib/metricas'

type Metricas = ReturnType<typeof metricasDashboard>

const etiquetasDona = {
  color: '#000000',
  textStrokeColor: '#ffffff',
  textStrokeWidth: 3,
  font: { weight: 'bold' as const, size: 12 },
  formatter: etiquetaMonto,
}

const sombraBlanca = { textShadow: '-1.5px -1.5px 0 #fff, 1.5px -1.5px 0 #fff, -1.5px 1.5px 0 #fff, 1.5px 1.5px 0 #fff' }

function Tarjeta({ titulo, valor, color }: { titulo: string; valor: string; color: string }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-md text-center border-t-[5px]" style={{ borderTopColor: color }}>
      <label className="text-[0.75em] font-bold uppercase" style={{ color }}>{titulo}</label>
      <h2 className="text-[2.2em] font-bold mt-2" style={{ color: color === '#fbc02d' ? '#d32f2f' : color }}>{valor}</h2>
    </div>
  )
}

function Grafico({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-5 flex-1 min-w-[220px] text-center">
      <label className="etiqueta">{titulo}</label>
      <div className="h-[200px] mt-2">{children}</div>
    </div>
  )
}

export default function DashboardVisualPage() {
  const [datos, setDatos] = useState<{ m: Metricas; nombre: string } | null>(null)
  const hoy = new Date()

  useEffect(() => {
    let activo = true
    Promise.all([
      cargarMovimientosUsuario(),
      createClient().from('perfil').select('nombre, meta_mensual').maybeSingle(),
    ]).then(([movimientos, { data: perfil }]) => {
      if (!activo) return
      setDatos({
        m: metricasDashboard(movimientos, Number(perfil?.meta_mensual) || 0, new Date()),
        nombre: perfil?.nombre ?? '',
      })
    })
    return () => {
      activo = false
    }
  }, [])

  const m = datos?.m

  return (
    <div>
      <h1 className="titulo-seccion uppercase">📊 {datos?.nombre ? `Dashboard de ${datos.nombre}` : 'Dashboard'}</h1>

      <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
        <Tarjeta titulo="💰 TOTAL COBRADO 💵" valor={formatoMoneda(m?.totalCobrado ?? 0)} color="#2e7d32" />
        <Tarjeta titulo="⏳ FACTURAS PENDIENTES ⏰" valor={formatoMoneda(m?.pendiente ?? 0)} color="#fbc02d" />
        <Tarjeta titulo="🚀 PROYECTOS/CURSOS ACTIVOS 🚀" valor={String(m?.activos ?? 0)} color="#1976d2" />
      </div>

      <h2 className="text-center text-2xl font-extrabold text-[#2e7d32] my-5">
        {MESES[hoy.getMonth()]}-{hoy.getFullYear()}
      </h2>

      {m && (
        <div className="flex flex-wrap gap-4 justify-center">
          <Grafico titulo="Ingresos por Cliente">
            <Doughnut
              data={{ labels: m.porCliente.labels, datasets: [{ data: m.porCliente.valores, backgroundColor: ['#2ecc71', '#3498db', '#f1c40f', '#e74c3c', '#9b59b6'] }] }}
              options={{ responsive: true, maintainAspectRatio: false, plugins: { datalabels: etiquetasDona } }}
            />
          </Grafico>
          <Grafico titulo="Meta Mensual">
            <Bar
              data={{ labels: ['Cobrado', 'Por cobrar'], datasets: [{ data: [m.totalCobrado, m.pendiente], backgroundColor: ['#ffff00', '#ff00ff'] }] }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  datalabels: { color: '#000000', anchor: 'end', align: 'top', offset: 5, font: { weight: 'bold', size: 13 }, formatter: etiquetaMonto },
                },
              }}
            />
          </Grafico>
          <Grafico titulo="Gráfico Meta Mensual %">
            <Doughnut
              data={{ labels: ['Alcanzado', 'Por alcanzar'], datasets: [{ data: [m.meta.alcanzado, m.meta.porAlcanzar], backgroundColor: ['#2ecc71', '#e74c3c'] }] }}
              options={{ responsive: true, maintainAspectRatio: false, plugins: { datalabels: etiquetasDona } }}
            />
          </Grafico>

          <div className="bg-white rounded-xl shadow-md p-5 flex-1 min-w-[220px] flex flex-col">
            <label className="etiqueta mb-2.5">Meta Mensual Alcanzada Y Por Alcanzar</label>
            <div className="flex flex-col grow text-[11px] rounded overflow-hidden border border-gray-300 font-bold text-black">
              <div className="bg-[#f9d423] text-center p-4 border-b border-gray-300 grow flex items-center justify-center text-xs">
                META MENSUAL: {formatoMoneda(m.meta.total)}
              </div>
              <div className="flex text-center grow">
                <div className="flex-1 bg-success p-4 border-r border-gray-300 flex flex-col items-center justify-center" style={sombraBlanca}>
                  ALCANZADO: <span className="text-[15px]">{formatoMoneda(m.totalCobrado)}</span>
                </div>
                <div className="flex-1 bg-danger p-4 flex flex-col items-center justify-center" style={sombraBlanca}>
                  POR ALCANZAR: <span className="text-[15px]">{m.meta.superada ? '¡META SUPERADA!' : formatoMoneda(m.meta.porAlcanzar)}</span>
                </div>
              </div>
              {m.meta.extra > 0 && (
                <div className="bg-[#f9d423] text-center p-2 border-t border-gray-300">
                  ¡FELICIDADES! HAS GANADO {formatoMoneda(m.meta.extra)} EXTRAS ESTE MES 🚀
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="card-ancha mt-6">
        <div className="bg-warning-gold text-black p-1.5 font-extrabold text-center text-sm">
          PROYECTOS Y CUOTAS PENDIENTES DE COBRO
        </div>
        <div className="tabla-contenedor">
          <table className="tabla min-w-0!">
            <thead>
              <tr><th>PROYECTO / CURSO</th><th>CLIENTE</th><th>MONTO ($)</th></tr>
            </thead>
            <tbody>
              {!m ? (
                <Cargando columnas={3} texto="Cargando pendientes..." />
              ) : m.pendientes.length === 0 ? (
                <Cargando columnas={3} texto="No hay pendientes" />
              ) : (
                m.pendientes.map((p, i) => (
                  <tr key={i}>
                    <td>{p.concepto}</td>
                    <td>{p.cliente}</td>
                    <td className="font-bold text-[#d32f2f]!">{formatoMoneda(p.monto)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
