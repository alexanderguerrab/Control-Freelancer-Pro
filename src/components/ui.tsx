'use client'

import { estadosVencimiento } from '@/lib/cobros'
import type { RegistroCobrable } from '@/lib/types'

/** Celda de estado de vencimiento (clase estado-celda del legacy). */
export function EstadoBadge({ valor }: { valor: string }) {
  if (!valor) return <span className="estado">---</span>
  return <span className={`estado ${valor.includes('VENCIDO') ? 'estado-rojo' : 'estado-azul'}`}>{valor}</span>
}

/** Las tres columnas Vence Hoy / 7 Días / 15 Días de un registro. */
export function CeldasVencimiento({ registro, hoy }: { registro: RegistroCobrable; hoy: string }) {
  return (
    <>
      {estadosVencimiento(registro, hoy).map((valor, i) => (
        <td key={i}><EstadoBadge valor={valor} /></td>
      ))}
    </>
  )
}

/** Estado de una suscripción SaaS: rojo si vencida, verde si al día. */
export function EstadoSuscripcion({ estado }: { estado: string }) {
  const clase = estado.includes('Vencido') ? 'estado-rojo' : estado === 'Al día' ? 'estado-verde' : 'estado-azul'
  return <span className={`estado ${clase}`}>{estado}</span>
}

/** Input de monto con el prefijo "$" en verde. */
export function InputMonto({ valor, onGuardar }: { valor: number; onGuardar: (v: number) => void }) {
  return (
    <div className="flex items-center justify-center text-green-700 font-bold">
      $
      <input
        type="number"
        defaultValue={valor}
        onBlur={(e) => {
          const nuevo = parseFloat(e.target.value) || 0
          if (nuevo !== valor) onGuardar(nuevo)
        }}
        className="w-20 border-0 bg-transparent font-bold text-green-700 text-center p-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
    </div>
  )
}

/** Input de texto de tabla que guarda al salir del campo si cambió. */
export function InputTabla({
  valor,
  onGuardar,
  placeholder,
}: {
  valor: string | null
  onGuardar: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      type="text"
      defaultValue={valor ?? ''}
      placeholder={placeholder}
      onBlur={(e) => {
        if (e.target.value !== (valor ?? '')) onGuardar(e.target.value)
      }}
      className="input-tabla"
    />
  )
}

export function InputFechaTabla({ valor, onGuardar }: { valor: string | null; onGuardar: (v: string | null) => void }) {
  return (
    <input
      type="date"
      value={valor ?? ''}
      onChange={(e) => onGuardar(e.target.value || null)}
      className="input-tabla text-[11px]"
    />
  )
}

/**
 * Desplegable de método de pago para las tablas. Si la fila guardó un método
 * que ya no está en la lista del perfil, se conserva como opción para no
 * perder el dato.
 */
export function SelectMetodo({ valor, opciones, onChange }: {
  valor: string | null
  opciones: string[]
  onChange: (v: string | null) => void
}) {
  const lista = valor && !opciones.includes(valor) ? [valor, ...opciones] : opciones
  return (
    <select value={valor ?? ''} className="select-tabla" onChange={(e) => onChange(e.target.value || null)}>
      <option value="">-- Método --</option>
      {lista.map((m) => <option key={m} value={m}>{m}</option>)}
    </select>
  )
}

export function Cargando({ columnas, texto = 'Cargando...' }: { columnas: number; texto?: string }) {
  return (
    <tr>
      <td colSpan={columnas} className="py-8! text-gray-400!">{texto}</td>
    </tr>
  )
}
