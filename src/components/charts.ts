'use client'

import { useSyncExternalStore } from 'react'
import {
  ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip,
} from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import { formatoMoneda } from '@/lib/fechas'

// Igual que el legacy: datalabels registrado para todos los gráficos.
ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, ChartDataLabels)

export const COLORES_PASTEL = ['#00ff00', '#ffff00', '#3498db', '#e74c3c', '#9b59b6', '#e67e22']

/** Formateador de etiquetas de Chart.js con la moneda del usuario. */
export function crearEtiquetaMonto(moneda?: string | null) {
  return (valor: number) => (valor ? formatoMoneda(valor, moneda) : '')
}

export const etiquetaMonto = crearEtiquetaMonto('USD')

const CONSULTA_MOVIL = '(max-width: 768px)'

/** true en pantallas de móvil; se usa para rotar las etiquetas de las barras. */
export function useEsMovil() {
  return useSyncExternalStore(
    (avisar) => {
      const mq = window.matchMedia(CONSULTA_MOVIL)
      mq.addEventListener('change', avisar)
      return () => mq.removeEventListener('change', avisar)
    },
    () => window.matchMedia(CONSULTA_MOVIL).matches,
    () => false
  )
}
