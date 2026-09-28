'use client'

import { createClient } from '@/utils/supabase/client'
import type { Movimiento } from './metricas'

type FilaConCliente = {
  nombre: string
  monto: number
  cobrado: boolean
  fecha_pago: string | null
  clientes: { nombre: string } | null
}

const aMovimiento = (f: FilaConCliente): Movimiento => ({
  concepto: f.nombre,
  cliente: f.clientes?.nombre ?? 'Sin Cliente',
  monto: Number(f.monto) || 0,
  cobrado: f.cobrado,
  fecha_pago: f.fecha_pago,
})

/** Proyectos y cursos del usuario (en ese orden, como el dashboard legacy). */
export async function cargarMovimientosUsuario(): Promise<Movimiento[]> {
  const supabase = createClient()
  const columnas = 'nombre, monto, cobrado, fecha_pago, clientes(nombre)'
  const [proyectos, cursos] = await Promise.all([
    supabase.from('proyectos').select(columnas).order('created_at'),
    supabase.from('cursos').select(columnas).order('created_at'),
  ])
  const filas = [...(proyectos.data ?? []), ...(cursos.data ?? [])] as unknown as FilaConCliente[]
  return filas.map(aMovimiento)
}

/** Cuotas de Control SaaS, con el correo del usuario como "cliente". */
export async function cargarMovimientosSaaS(): Promise<Movimiento[]> {
  const supabase = createClient()
  const [{ data: filas }, { data: usuarios }] = await Promise.all([
    supabase.from('control_saas').select('plan, monto, cobrado, fecha_pago, usuario_id').order('created_at'),
    supabase.from('usuarios').select('id, email'),
  ])
  const correos = new Map((usuarios ?? []).map((u) => [u.id as string, u.email as string]))
  return (filas ?? []).map((f) => ({
    concepto: f.plan,
    cliente: (f.usuario_id && correos.get(f.usuario_id)) || 'Sin Usuario',
    monto: Number(f.monto) || 0,
    cobrado: f.cobrado,
    fecha_pago: f.fecha_pago,
  }))
}
