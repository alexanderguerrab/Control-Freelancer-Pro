'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useMetodosPago } from '@/lib/useMetodosPago'
import { aviso, error, exito } from '@/lib/alertas'
import { estadoSuscripcion } from '@/lib/saas'
import { Cargando, EstadoSuscripcion } from '@/components/ui'
import type { PlanSaaS, SuscripcionSaaS } from '@/lib/types'

interface UsuarioConSuscripcion {
  id: string
  nombre: string
  email: string
  suscripcion: SuscripcionSaaS | null
}

const PAGO_VACIO = {
  usuario: '',
  plan: 'Mensual' as PlanSaaS,
  fechaSuscripcion: '',
  fechaPago: '',
  periodo: '',
  metodo: '', // vacío = el primero de la lista del perfil
  costo: '',
  recibo: '',
}

export default function FinanzasSaaSPage() {
  const [usuarios, setUsuarios] = useState<UsuarioConSuscripcion[] | null>(null)
  const metodos = useMetodosPago()
  const [busqueda, setBusqueda] = useState('')
  const [pago, setPago] = useState(PAGO_VACIO)

  const obtener = useCallback(async (): Promise<UsuarioConSuscripcion[]> => {
    const supabase = createClient()
    const [{ data: lista }, { data: suscripciones }] = await Promise.all([
      supabase.from('usuarios').select('id, cliente, email').eq('estado', 'Autorizado'),
      supabase.from('suscripciones_saas').select('*'),
    ])
    const porUsuario = new Map((suscripciones ?? []).map((s) => [s.usuario_id, s as SuscripcionSaaS]))
    // Igual que en Finanzas y Cobros: el nombre es lo principal y el correo va debajo.
    // Si el usuario aún no tiene nombre, se usa el correo para no dejarlo en blanco.
    return (lista ?? [])
      .map((u) => ({
        id: u.id,
        nombre: u.cliente?.trim() || u.email || u.id,
        email: u.email ?? '',
        suscripcion: porUsuario.get(u.id) ?? null,
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
  }, [])

  useEffect(() => {
    let activo = true
    const recargar = () => {
      obtener().then((lista) => {
        if (activo) setUsuarios(lista)
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

  const filtrados = (usuarios ?? []).filter((u) =>
    `${u.nombre} ${u.email}`.toLowerCase().includes(busqueda.toLowerCase())
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
    if (!pago.usuario || !pago.fechaSuscripcion || !pago.fechaPago || !pago.costo) {
      return aviso('Selecciona el cliente, las fechas y el costo.')
    }
    const { error: err } = await createClient().rpc('registrar_pago_saas', {
      p_usuario: pago.usuario,
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
    setUsuarios(await obtener())
  }

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
      </div>

      <form onSubmit={registrar} className="card-ancha mt-5">
        <h3 className="text-success text-center font-semibold mb-4">💰 GESTIÓN DE PAGOS E INGRESOS</h3>
        <label className="etiqueta">Buscar Cliente Rápido</label>
        <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Escribe para filtrar clientes..." className="campo" />

        <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1 max-md:gap-0">
          <div>
            <label className="etiqueta">Seleccionar Cliente</label>
            <select {...campo('usuario')}>
              <option value="">-- Selecciona un Cliente --</option>
              {filtrados.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
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
    </div>
  )
}
