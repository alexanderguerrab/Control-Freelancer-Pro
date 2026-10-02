'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { estadoSuscripcion } from '@/lib/saas'
import { Cargando, EstadoSuscripcion } from '@/components/ui'
import type { PagoCliente, SuscripcionCliente } from '@/lib/types'

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
  const [nombres, setNombres] = useState<Map<string, string>>(new Map())

  const obtener = useCallback(async () => {
    const supabase = createClient()
    const [{ data: lista }, { data: suscripciones }, { data: servicios }, { data: historial }] = await Promise.all([
      supabase.from('clientes').select('id, nombre, email').order('nombre'),
      supabase.from('suscripciones_clientes').select('*'),
      supabase.from('cursos').select('cliente_id'),
      supabase.from('pagos_clientes').select('*').order('created_at', { ascending: false }).limit(100),
    ])
    const porCliente = new Map((suscripciones ?? []).map((s) => [s.cliente_id, s as SuscripcionCliente]))
    // Aquí solo van clientes con suscripción: los que tienen un servicio en
    // Cursos y Suscripciones o ya tienen plan registrado. Los proyectos son
    // trabajos únicos con su propio control de pago y no cuentan; un cliente
    // sin suscripción (con o sin proyectos) no se lista.
    const conServicio = new Set((servicios ?? []).map((s) => s.cliente_id))
    const suscritos: ClienteConSuscripcion[] = (lista ?? [])
      .filter((c) => porCliente.has(c.id) || conServicio.has(c.id))
      .map((c) => ({
        id: c.id,
        nombre: c.nombre,
        email: c.email,
        suscripcion: porCliente.get(c.id) ?? null,
      }))
    return {
      clientes: suscritos.sort(ordenar),
      nombres: new Map((lista ?? []).map((c) => [c.id as string, c.nombre as string])),
      pagos: (historial ?? []) as PagoCliente[],
    }
  }, [])

  useEffect(() => {
    let activo = true
    const recargarDatos = () => {
      obtener().then((r) => {
        if (!activo) return
        setClientes(r.clientes)
        setNombres(r.nombres)
        setPagos(r.pagos)
      })
    }
    recargarDatos()
    // Al volver a esta pestaña (p. ej. después de editar Cursos y Suscripciones) se refresca.
    const alVolver = () => {
      if (document.visibilityState === 'visible') recargarDatos()
    }
    document.addEventListener('visibilitychange', alVolver)
    window.addEventListener('focus', alVolver)
    return () => {
      activo = false
      document.removeEventListener('visibilitychange', alVolver)
      window.removeEventListener('focus', alVolver)
    }
  }, [obtener])

  const nombrePorId = nombres

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
                <Cargando columnas={4} texto="Aún no hay clientes con suscripción. Agrégalos en Cursos y Suscripciones." />
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
          Aquí solo se listan clientes con suscripción (se agregan en Cursos y Suscripciones). Los proyectos son de pago único y se cobran desde Proyectos y Finanzas.
        </p>
      </div>

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
