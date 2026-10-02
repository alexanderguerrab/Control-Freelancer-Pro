'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { estadoSuscripcion } from '@/lib/saas'
import { Cargando, EstadoSuscripcion } from '@/components/ui'
import type { PagoSaaS, SuscripcionSaaS } from '@/lib/types'

interface UsuarioConSuscripcion {
  id: string
  nombre: string
  email: string
  suscripcion: SuscripcionSaaS | null
}

interface Datos {
  usuarios: UsuarioConSuscripcion[]
  nombres: Map<string, string>
  pagos: PagoSaaS[]
}

export default function FinanzasSaaSPage() {
  const [datos, setDatos] = useState<Datos | null>(null)

  const obtener = useCallback(async (): Promise<Datos> => {
    const supabase = createClient()
    const [{ data: lista }, { data: suscripciones }, { data: historial }] = await Promise.all([
      supabase.from('usuarios').select('id, cliente, email').eq('estado', 'Autorizado'),
      supabase.from('suscripciones_saas').select('*'),
      // Lo más reciente (último registrado) arriba.
      supabase.from('pagos_saas').select('*').order('created_at', { ascending: false }).limit(100),
    ])
    const porUsuario = new Map((suscripciones ?? []).map((s) => [s.usuario_id, s as SuscripcionSaaS]))
    // El nombre es lo principal y el correo va debajo.
    // Si el usuario aún no tiene nombre, se usa el correo para no dejarlo en blanco.
    const usuarios = (lista ?? [])
      .map((u) => ({
        id: u.id as string,
        nombre: (u.cliente?.trim() || u.email || u.id) as string,
        email: (u.email ?? '') as string,
        suscripcion: porUsuario.get(u.id) ?? null,
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
    return {
      usuarios,
      nombres: new Map(usuarios.map((u) => [u.id, u.nombre])),
      pagos: (historial ?? []) as PagoSaaS[],
    }
  }, [])

  useEffect(() => {
    let activo = true
    const recargar = () => {
      obtener().then((d) => {
        if (activo) setDatos(d)
      })
    }
    recargar()
    // Al volver a esta pestaña (p. ej. después de editar Control Suscripciones Admin) se refresca.
    const alVolver = () => {
      if (document.visibilityState === 'visible') recargar()
    }
    document.addEventListener('visibilitychange', alVolver)
    window.addEventListener('focus', alVolver)
    return () => {
      activo = false
      document.removeEventListener('visibilitychange', alVolver)
      window.removeEventListener('focus', alVolver)
    }
  }, [obtener])

  const usuarios = datos?.usuarios
  const pagos = datos?.pagos

  return (
    <div>
      <h1 className="titulo-seccion text-warning-gold!">PANEL DE FINANZAS</h1>

      <div className="card-ancha">
        <h3 className="text-accent text-center font-semibold mb-3">⚠️ Clientes Vencidos o Próximos a Vencer</h3>
        <div className="tabla-contenedor">
          <table className="tabla min-w-[600px]!">
            <thead>
              <tr><th>CLIENTE</th><th>PLAN</th><th>PRÓXIMO PAGO</th><th>ESTADO</th></tr>
            </thead>
            <tbody>
              {!usuarios ? (
                <Cargando columnas={4} texto="Cargando estatus de clientes..." />
              ) : usuarios.length === 0 ? (
                <Cargando columnas={4} texto="No hay usuarios autorizados." />
              ) : (
                usuarios.map((u) => (
                  <tr key={u.id}>
                    <td>
                      {u.nombre}
                      {u.email && u.email !== u.nombre ? <div className="text-xs text-gray-400">{u.email}</div> : null}
                    </td>
                    <td>{u.suscripcion?.plan ?? 'Sin plan'}</td>
                    <td>{u.suscripcion?.proximo_pago ?? '---'}</td>
                    <td><EstadoSuscripcion estado={estadoSuscripcion(u.suscripcion)} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-3 text-center">
          Los pagos se registran en Control Suscripciones Admin (casilla Cobrado) y aparecen aquí automáticamente.
        </p>
      </div>

      <div className="card-ancha mt-5">
        <div className="bg-warning-gold p-2 font-bold text-center text-sm">HISTORIAL DE PAGOS</div>
        <div className="tabla-contenedor mt-2">
          <table className="tabla min-w-[800px]">
            <thead>
              <tr>{['FECHA DE PAGO', 'CLIENTE', 'PERIODO', 'PLAN', 'MÉTODO', 'MONTO', 'RECIBO'].map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {!pagos ? (
                <Cargando columnas={7} />
              ) : pagos.length === 0 ? (
                <Cargando columnas={7} texto="Todavía no hay pagos registrados." />
              ) : (
                pagos.map((p) => (
                  <tr key={p.id}>
                    <td>{p.fecha_pago}</td>
                    <td>{datos?.nombres.get(p.usuario_id) ?? '—'}</td>
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
