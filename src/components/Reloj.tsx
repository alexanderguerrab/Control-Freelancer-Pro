'use client'

import { useEffect, useState } from 'react'

export default function Reloj() {
  const [ahora, setAhora] = useState<Date | null>(null)

  useEffect(() => {
    const tick = () => setAhora(new Date())
    const intervalo = setInterval(tick, 1000)
    const inicial = setTimeout(tick, 0)
    return () => {
      clearInterval(intervalo)
      clearTimeout(inicial)
    }
  }, [])

  // Se pinta solo en el cliente para no chocar con la hora del servidor.
  return (
    <div className="font-bold text-gray-700 mt-1 min-h-6">
      {ahora && `${ahora.toLocaleDateString('es-ES')} ${ahora.toLocaleTimeString('es-ES')}`}
    </div>
  )
}
