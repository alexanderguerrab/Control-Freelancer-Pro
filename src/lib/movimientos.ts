'use client'

import { createClient } from '@/utils/supabase/client'
import { error as alertaError } from './alertas'
import type { Movimiento } from './metricas'

type FilaConCliente = {
  nombre: string
  monto: number
  cobrado: boolean
  fecha_pago: string | null
  fecha_cobro: string | null
  clientes: { nombre: string } | null
}

const aMovimiento = (f: FilaConCliente): Movimiento => ({
  concepto: f.nombre,
  cliente: f.clientes?.nombre ?? 'Sin Cliente',
  monto: Number(f.monto) || 0,
  cobrado: f.cobrado,
  fecha_pago: f.fecha_pago,
  fecha_cobro: f.fecha_cobro,
})

const TAMANO_PAGINA = 1000

/**
 * PostgREST devuelve como máximo 1000 filas por consulta: sin paginar, los
 * totales se quedaban cortos en silencio al pasar de ese número.
 */
async function traerTodo(
  consulta: (desde: number, hasta: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>
): Promise<unknown[]> {
  const filas: unknown[] = []
  for (let desde = 0; ; desde += TAMANO_PAGINA) {
    const { data, error } = await consulta(desde, desde + TAMANO_PAGINA - 1)
    if (error) {
      alertaError(error.message, 'Error del Servidor')
      break
    }
    filas.push(...(data ?? []))
    if (!data || data.length < TAMANO_PAGINA) break
  }
  return filas
}

/** Proyectos y cursos del usuario (en ese orden, como el dashboard legacy). */
export async function cargarMovimientosUsuario(): Promise<Movimiento[]> {
  const supabase = createClient()
  const columnas = 'nombre, monto, cobrado, fecha_pago, fecha_cobro, clientes(nombre)'
  const [proyectos, cursos] = await Promise.all([
    traerTodo((a, b) => supabase.from('proyectos').select(columnas).order('created_at').order('id').range(a, b)),
    traerTodo((a, b) => supabase.from('cursos').select(columnas).order('created_at').order('id').range(a, b)),
  ])
  return ([...proyectos, ...cursos] as FilaConCliente[]).map(aMovimiento)
}

/** Cuotas de Control SaaS, con el correo del usuario como "cliente". */
export async function cargarMovimientosSaaS(): Promise<Movimiento[]> {
  const supabase = createClient()
  const [filas, usuarios] = await Promise.all([
    traerTodo((a, b) =>
      supabase.from('control_saas').select('plan, monto, cobrado, fecha_pago, fecha_cobro, usuario_id')
        .order('created_at').order('id').range(a, b)
    ),
    traerTodo((a, b) => supabase.from('usuarios').select('id, email').order('id').range(a, b)),
  ])
  const correos = new Map((usuarios as { id: string; email: string }[]).map((u) => [u.id, u.email]))
  return (filas as {
    plan: string; monto: number; cobrado: boolean; fecha_pago: string | null; fecha_cobro: string | null; usuario_id: string | null
  }[]).map((f) => ({
    concepto: f.plan,
    cliente: (f.usuario_id && correos.get(f.usuario_id)) || 'Sin Usuario',
    monto: Number(f.monto) || 0,
    cobrado: f.cobrado,
    fecha_pago: f.fecha_pago,
    fecha_cobro: f.fecha_cobro,
  }))
}
