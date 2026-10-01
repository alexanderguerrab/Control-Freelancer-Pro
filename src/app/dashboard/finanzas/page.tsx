'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useMetodosPago } from '@/lib/useMetodosPago'
import { aviso, error, exito } from '@/lib/alertas'
import { estadoSuscripcion } from '@/lib/saas'
import { Cargando, EstadoSuscripcion } from '@/components/ui'
import type { PagoCliente, PlanSaaS, SuscripcionCliente } from '@/lib/types'

/**
 * Finanzas del freelancer sobre SUS clientes: es el equivalente de
 * /dashboard/admin/finanzas, pero con clientes, suscripciones_clientes y
 * pagos_clientes. RLS (owner_id) garantiza que solo vea lo suyo.
 */

interface ClienteConSuscripcion {
  id: string
  nombre: string
  email: string | null
  suscripcion: SuscripcionCliente | null
}

const PAGO_VACIO = {
  cliente: '',
  plan: 'Mensual' as PlanSaaS,
  fechaSuscripcion: '',
  fechaPago: '',
  periodo: '',
  metodo: '', // vacío = el primero de la lista del perfil
  costo: '',
  recibo: '',
}

/** Vencidos primero, luego por próximo pago; los que no tienen plan al final. */
function ordenar(a: ClienteConSuscripcion, b: ClienteConSuscripcion) {
  const va = estadoSuscripcion(a.suscripcion) === 'Vencido' ? 0 : 1
  const vb = estadoSuscripcion(b.suscripcion) === 'Vencido' ? 0 : 1
  if (va !== vb) return va - vb
  const pa = a.suscripcion?.proximo_pago ?? '9999-12-31'
  const pb = b.suscripcion?.proximo_pago ?? '9999-12-31'
  return pa.localeCompare(pb) || a.nombre.localeCompare(b.nombre)
}

export default function FinanzasClientesPage() {
  const [clientes, setClientes] = useState<ClienteConSuscripcion[] | null>(null)
  const [pagos, setPagos] = useState<PagoCliente[] | null>(null)
  const metodos = useMetodosPago()
  const [busqueda, setBusqueda] = useState('')
  const [pago, setPago] = useState(PAGO_VACIO)

  const obtener = useCallback(async () => {
    const supabase = createClient()
    const [{ data: lista }, { data: suscripciones }, { data: historial }] = await Promise.all([
      supabase.from('clientes').select('id, nombre, email').order('nombre'),
      supabase.from('suscripciones_clientes').select('*'),
      supabase.from('pagos_clientes').select('*').order('fecha_pago', { ascending: false }).limit(100),
    ])
    const porCliente = new Map((suscripciones ?? []).map((s) => [s.cliente_id, s as SuscripcionCliente]))
    const conSuscripcion: ClienteConSuscripcion[] = (lista ?? []).map((c) => ({
      id: c.id,
      nombre: c.nombre,
      email: c.email,
      suscripcion: porCliente.get(c.id) ?? null,
    }))
    return { clientes: conSuscripcion.sort(ordenar), pagos: (historial ?? []) as PagoCliente[] }
  }, [])

  useEffect(() => {
    let activo = true
    obtener().then((r) => {
      if (!activo) return
      setClientes(r.clientes)
      setPagos(r.pagos)
    })
    return () => {
      activo = false
    }
  }, [obtener])

  async function recargar() {
    const r = await obtener()
    setClientes(r.clientes)
    setPagos(r.pagos)
  }

  const nombrePorId = new Map((clientes ?? []).map((c) => [c.id, c.nombre]))
  const filtrados = (clientes ?? []).filter((c) =>
    `${c.nombre} ${c.email ?? ''}`.toLowerCase().includes(busqueda.toLowerCase())
  )

  function campo(nombre: keyof typeof PAGO_VACIO) {
    return {
      value: pago[nombre],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setPago((p) => ({ ...p, [nombre]: e.target.value })),
      className: 'campo',
    }
  }

  async function registrar(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!pago.cliente || !pago.fechaSuscripcion || !pago.fechaPago || !pago.costo) {
      return aviso('Selecciona el cliente, las fechas y el costo.')
    }
    const { error: err } = await createClient().rpc('registrar_pago_cliente', {
      p_cliente: pago.cliente,
      p_plan: pago.plan,
      p_fecha_suscripcion: pago.fechaSuscripcion,
      p_fecha_pago: pago.fechaPago,
      p_periodo: pago.periodo,
      p_metodo: pago.metodo || metodos[0] || '',
      p_monto: Number(pago.costo),
      p_recibo: pago.recibo,
    })
    if (err) return error(err.message)
    exito('Pago registrado y mes sincronizado.', '¡Pago Exitoso!')
    setPago((p) => ({ ...p, fechaSuscripcion: '', fechaPago: '', periodo: '', recibo: '' }))
    await recargar()
  }

  return (
    <div>
      <h1 className="titulo-seccion text-warning-gold!">💰 FINANZAS Y COBROS</h1>

      <div className="card-ancha">
        <h3 className="text-accent font-semibold mb-3">⚠️ Clientes Vencidos o Próximos a Vencer</h3>
        <div className="tabla-contenedor">
          <table className="tabla min-w-[600px]!">
            <thead>
              <tr><th>CLIENTE</th><th>PLAN</th><th>PRÓXIMO PAGO</th><th>ESTADO</th></tr>
            </thead>
            <tbody>
              {!clientes ? (
                <Cargando columnas={4} texto="Cargando estatus de clientes..." />
              ) : clientes.length === 0 ? (
                <Cargando columnas={4} texto="Aún no tienes clientes. Agrégalos en Registro de Clientes." />
              ) : (
                clientes.map((c) => (
                  <tr key={c.id}>
                    <td>{c.nombre}{c.email ? <div className="text-xs text-gray-400">{c.email}</div> : null}</td>
                    <td>{c.suscripcion?.plan ?? 'Sin plan'}</td>
                    <td>{c.suscripcion?.proximo_pago ?? '---'}</td>
                    <td><EstadoSuscripcion estado={estadoSuscripcion(c.suscripcion)} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-3 text-center">
          Los recordatorios de cobro se envían desde Proyectos y Finanzas y desde Cursos y Suscripciones, usando tus Scripts de Cobro.
        </p>
      </div>

      <form onSubmit={registrar} className="card-ancha mt-5">
        <h3 className="text-success text-center font-semibold mb-4">💰 GESTIÓN DE PAGOS E INGRESOS</h3>
        <label className="etiqueta">Buscar Cliente Rápido</label>
        <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Escribe para filtrar clientes..." className="campo" />

        <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1 max-md:gap-0">
          <div>
            <label className="etiqueta">Seleccionar Cliente</label>
            <select {...campo('cliente')}>
              <option value="">-- Selecciona un Cliente --</option>
              {filtrados.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="etiqueta">Suscripción</label>
            <select {...campo('plan')}>
              <option value="Mensual">Mensual</option>
              <option value="Anual">Anual</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1 max-md:gap-0">
          <div><label className="etiqueta">Fecha de Suscripción</label><input type="date" {...campo('fechaSuscripcion')} /></div>
          <div><label className="etiqueta">Fecha de Pago</label><input type="date" {...campo('fechaPago')} /></div>
          <div><label className="etiqueta">Periodo Abonado</label><input placeholder="Ej: Septiembre 2026" {...campo('periodo')} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1 max-md:gap-0">
          <div>
            <label className="etiqueta">Método de Pago</label>
            <select className="campo" value={pago.metodo || metodos[0] || ''}
              onChange={(e) => setPago((p) => ({ ...p, metodo: e.target.value }))}>
              {metodos.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div><label className="etiqueta">Costo a Cobrar ($)</label><input type="number" placeholder="Ej: 20" {...campo('costo')} /></div>
        </div>
        <label className="etiqueta">Enlace de Comprobante (Drive/Imgur)</label>
        <input placeholder="URL del recibo" {...campo('recibo')} />
        <button type="submit" className="btn-principal">Registrar Pago y Sincronizar Mes</button>
      </form>

      <div className="card-ancha mt-5">
        <div className="bg-warning-gold p-2 font-bold text-center text-sm">HISTORIAL DE PAGOS DE MIS CLIENTES</div>
        <div className="tabla-contenedor mt-2">
          <table className="tabla min-w-[800px]">
            <thead>
              <tr>{['FECHA DE PAGO', 'CLIENTE', 'PERIODO', 'PLAN', 'MÉTODO', 'MONTO', 'RECIBO'].map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {!pagos ? (
                <Cargando columnas={7} />
              ) : pagos.length === 0 ? (
                <Cargando columnas={7} texto="Todavía no has registrado pagos." />
              ) : (
                pagos.map((p) => (
                  <tr key={p.id}>
                    <td>{p.fecha_pago}</td>
                    <td>{nombrePorId.get(p.cliente_id) ?? '—'}</td>
                    <td>{p.periodo}</td>
                    <td>{p.plan}</td>
                    <td>{p.metodo ?? '—'}</td>
                    <td>${p.monto}</td>
                    <td>
                      {p.recibo_url && (
                        <a href={p.recibo_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">🧾 Ver Recibo</a>
                      )}
                    </td>
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
