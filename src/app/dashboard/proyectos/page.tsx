'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOpcionesClientes, useTabla } from '@/lib/useTabla'
import { confirmar } from '@/lib/alertas'
import { ejecutarCobro } from '@/lib/ejecutarCobro'
import { hoyISO } from '@/lib/fechas'
import { useMetodosPago } from '@/lib/useMetodosPago'
import { Cargando, CeldasVencimiento, InputFechaTabla, InputMonto, InputTabla, SelectMetodo } from '@/components/ui'
import type { EstadoProceso, Proyecto } from '@/lib/types'

const ESTADOS: EstadoProceso[] = ['En Proceso', 'Terminado', 'Pausado']

const PROYECTO_VACIO: Proyecto = {
  id: '', cliente_id: null, nombre: '', monto: 0, cobrado: false,
  fecha_recepcion: null, fecha_entrega: null, fecha_pago: null, estado_proceso: null,
  aviso_hoy_enviado_at: null, aviso_7d_enviado_at: null, aviso_15d_enviado_at: null,
  comprobante_url: null, metodo_pago: null,
}

const COLUMNAS = [
  'Proyecto', 'Cliente', 'Monto', 'Cobrado', 'Método de Pago', 'F. Rec.', 'F. Entr.', 'F. Pago',
  ...ESTADOS, 'Vence Hoy', 'Vence 7 Días', 'Vence 15 Días', 'Comprobante', '',
]

function FilaProyecto({ p, clientes, metodos, hoy, onCambio, onBorrar }: {
  p: Proyecto
  clientes: { id: string; nombre: string }[]
  metodos: string[]
  hoy: string
  onCambio: (cambios: Partial<Proyecto>) => void
  onBorrar?: () => void
}) {
  return (
    <tr>
      <td><InputTabla valor={p.nombre} placeholder="Proyecto..." onGuardar={(v) => onCambio({ nombre: v })} /></td>
      <td>
        <select value={p.cliente_id ?? ''} onChange={(e) => onCambio({ cliente_id: e.target.value || null })} className="select-tabla">
          <option value="">-- Cliente --</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </td>
      <td><InputMonto valor={p.monto} onGuardar={(v) => onCambio({ monto: v })} /></td>
      <td>
        <input type="checkbox" checked={p.cobrado} onChange={(e) => onCambio({ cobrado: e.target.checked })} className="w-4 h-4 cursor-pointer" />
      </td>
      <td><SelectMetodo valor={p.metodo_pago} opciones={metodos} onChange={(v) => onCambio({ metodo_pago: v })} /></td>
      <td><InputFechaTabla valor={p.fecha_recepcion} onGuardar={(v) => onCambio({ fecha_recepcion: v })} /></td>
      <td><InputFechaTabla valor={p.fecha_entrega} onGuardar={(v) => onCambio({ fecha_entrega: v })} /></td>
      <td><InputFechaTabla valor={p.fecha_pago} onGuardar={(v) => onCambio({ fecha_pago: v })} /></td>
      {ESTADOS.map((estado) => (
        <td key={estado}>
          <input type="checkbox" checked={p.estado_proceso === estado} className="w-4 h-4 cursor-pointer"
            onChange={(e) => onCambio({ estado_proceso: e.target.checked ? estado : null })} />
        </td>
      ))}
      {p.id ? <CeldasVencimiento registro={p} hoy={hoy} /> : <><td /><td /><td /></>}
      <td><InputTabla valor={p.comprobante_url} placeholder="URL o Comprobante..." onGuardar={(v) => onCambio({ comprobante_url: v })} /></td>
      <td>
        {onBorrar && <button onClick={onBorrar} className="btn-icono btn-eliminar" title="Eliminar Proyecto">🗑️</button>}
      </td>
    </tr>
  )
}

export default function ProyectosPage() {
  const { filas: proyectos, cargar, actualizar, insertar, eliminar } = useTabla<Proyecto>('proyectos')
  const clientes = useOpcionesClientes()
  const metodos = useMetodosPago()
  const router = useRouter()
  const [hoy] = useState(hoyISO)
  // Cambia la key de la fila en blanco para vaciarla tras crear un proyecto.
  const [versionNueva, setVersionNueva] = useState(0)

  async function crear(cambios: Partial<Proyecto>) {
    if (await insertar(cambios)) setVersionNueva((v) => v + 1)
  }

  async function borrar(p: Proyecto) {
    if (await confirmar('¿Eliminar proyecto?', p.nombre || 'Proyecto sin nombre')) await eliminar(p.id)
  }

  async function cobrar() {
    if (await ejecutarCobro('proyectos', router.push)) await cargar()
  }

  return (
    <div>
      <h1 className="titulo-seccion">📂 Proyectos y Finanzas</h1>
      <div className="card-ancha">
        <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
          <h3 className="text-primary-light font-semibold">📊 Gestión de Proyectos Freelance</h3>
          <button onClick={cobrar} className="btn-cobro">🚀 Ejecutar Cobro de Proyectos</button>
        </div>
        <div className="tabla-contenedor">
          <table className="tabla min-w-[1550px]">
            <thead>
              <tr>{COLUMNAS.map((h, i) => <th key={i}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {!proyectos ? (
                <Cargando columnas={COLUMNAS.length} texto="Cargando proyectos..." />
              ) : (
                <>
                  {proyectos.map((p) => (
                    <FilaProyecto key={p.id} p={p} clientes={clientes} metodos={metodos} hoy={hoy}
                      onCambio={(cambios) => actualizar(p.id, cambios)} onBorrar={() => borrar(p)} />
                  ))}
                  <FilaProyecto key={`nuevo-${versionNueva}`} p={PROYECTO_VACIO} clientes={clientes} metodos={metodos} hoy={hoy} onCambio={crear} />
                </>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-3 text-center">
          Escribe en la última fila para agregar un proyecto nuevo.
        </p>
      </div>
    </div>
  )
}
