'use client'

import { useEffect } from 'react'

// Registra el service worker (public/sw.js) para que la app sea instalable y cargue más rápido.
// Solo en producción: en desarrollo (npm run dev) la caché confundiría al probar cambios.
export default function RegistrarSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('SW no registrado', e))
  }, [])
  return null
}
