'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { error as alertaError } from './alertas'

type Fila = { id: string }

/**
 * Carga una tabla de Supabase y expone operaciones de edición. RLS ya
 * limita las filas a las del usuario, así que no se filtra por owner.
 */
export function useTabla<T extends Fila>(tabla: string, orden = 'created_at', ascendente = true) {
  const [filas, setFilas] = useState<T[] | null>(null)

  const obtener = useCallback(async () => {
    const { data, error } = await createClient()
      .from(tabla)
      .select('*')
      .order(orden, { ascending: ascendente })
    if (error) alertaError(error.message, 'Error del Servidor')
    return (data ?? []) as T[]
  }, [tabla, orden, ascendente])

  const cargar = useCallback(async () => {
    setFilas(await obtener())
  }, [obtener])

  useEffect(() => {
    let activo = true
    obtener().then((datos) => {
      if (activo) setFilas(datos)
    })
    return () => {
      activo = false
    }
  }, [obtener])

  const actualizar = useCallback(
    async (id: string, cambios: Partial<T>) => {
      const { error } = await createClient().from(tabla).update(cambios as Record<string, unknown>).eq('id', id)
      if (error) {
        alertaError(error.message)
        return false
      }
      await cargar()
      return true
    },
    [tabla, cargar]
  )

  const insertar = useCallback(
    async (nueva: Partial<T>) => {
      const { error } = await createClient().from(tabla).insert(nueva as Record<string, unknown>)
      if (error) {
        alertaError(error.message)
        return false
      }
      await cargar()
      return true
    },
    [tabla, cargar]
  )

  const eliminar = useCallback(
    async (id: string) => {
      const { error } = await createClient().from(tabla).delete().eq('id', id)
      if (error) {
        alertaError(error.message)
        return false
      }
      await cargar()
      return true
    },
    [tabla, cargar]
  )

  return { filas, cargar, actualizar, insertar, eliminar }
}

/** Lista {id, nombre} para los desplegables de cliente. */
export function useOpcionesClientes() {
  const [opciones, setOpciones] = useState<{ id: string; nombre: string }[]>([])

  useEffect(() => {
    let activo = true
    createClient()
      .from('clientes')
      .select('id, nombre')
      .order('nombre')
      .then(({ data }) => {
        if (activo) setOpciones(data ?? [])
      })
    return () => {
      activo = false
    }
  }, [])

  return opciones
}
