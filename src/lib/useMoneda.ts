'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

/** Moneda (código ISO) que el usuario puso en Mi Perfil; "USD" mientras carga o si no hay. */
export function useMoneda(): string {
  const [moneda, setMoneda] = useState('USD')

  useEffect(() => {
    let activo = true
    createClient()
      .from('perfil')
      .select('moneda')
      .maybeSingle()
      .then(({ data }) => {
        if (activo && data?.moneda) setMoneda(String(data.moneda))
      })
    return () => {
      activo = false
    }
  }, [])

  return moneda
}
