'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

/** Lista que se usa mientras el usuario no haya configurado ninguno en su perfil. */
export const METODOS_POR_DEFECTO = ['Zelle', 'Binance', 'PayPal', 'Transferencia', 'Pago Móvil', 'Efectivo']

/**
 * Métodos de pago del usuario: los nombres de la lista que guardó en
 * Mi Perfil (tabla metodos_pago), en el orden que los puso. Si no guardó
 * ninguno, la lista por defecto. Mientras carga devuelve una lista vacía
 * para no mostrar opciones que luego cambian.
 *
 * Es lo que alimenta el desplegable «Método de Pago» de Proyectos y
 * Finanzas, Cursos y Suscripciones y Control Suscripciones Admin; el método
 * elegido viaja a los historiales de Finanzas al cobrar.
 */
export function useMetodosPago(): string[] {
  const [metodos, setMetodos] = useState<string[] | null>(null)

  useEffect(() => {
    let activo = true
    createClient()
      .from('metodos_pago')
      .select('nombre')
      .order('orden')
      .order('created_at')
      .then(({ data }) => {
        if (!activo) return
        const nombres = (data ?? []).map((f) => String(f.nombre ?? '').trim()).filter(Boolean)
        const unicos = [...new Set(nombres)]
        setMetodos(unicos.length ? unicos : METODOS_POR_DEFECTO)
      })
    return () => {
      activo = false
    }
  }, [])

  return metodos ?? []
}
