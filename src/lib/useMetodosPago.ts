'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

/** Lista que se usa mientras el usuario no haya configurado ninguno en su perfil. */
export const METODOS_POR_DEFECTO = ['Zelle', 'Binance', 'PayPal', 'Transferencia', 'Pago Móvil', 'Efectivo']

const CAMPOS = [1, 2, 3, 4, 5, 6].map((i) => `pasarela_${i}_nombre`)

/**
 * Métodos de pago del usuario: los nombres que escribió en Mi Perfil
 * (hasta 6). Si no escribió ninguno, la lista por defecto. Mientras carga
 * devuelve una lista vacía para no mostrar opciones que luego cambian.
 */
export function useMetodosPago(): string[] {
  const [metodos, setMetodos] = useState<string[] | null>(null)

  useEffect(() => {
    let activo = true
    createClient()
      .from('perfil')
      .select(CAMPOS.join(', '))
      .maybeSingle()
      .then(({ data }) => {
        if (!activo) return
        const fila = (data ?? {}) as unknown as Record<string, string | null>
        const nombres = CAMPOS.map((c) => (fila[c] ?? '').trim()).filter(Boolean)
        const unicos = [...new Set(nombres)]
        setMetodos(unicos.length ? unicos : METODOS_POR_DEFECTO)
      })
    return () => {
      activo = false
    }
  }, [])

  return metodos ?? []
}
