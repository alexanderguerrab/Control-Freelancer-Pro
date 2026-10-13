'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

/**
 * Contacto de soporte (email y WhatsApp). Se lee de la tabla `config_app`,
 * que el administrador edita en «Configuración Admin», así que cambiar el
 * número o el correo ya no requiere tocar el código.
 *
 * Los valores por defecto solo se usan si la tabla aún no existe (migración
 * sin aplicar) o si la lectura falla, para que los botones nunca queden rotos.
 */

export interface Soporte {
  email: string
  /** Solo dígitos con código de país, sin "+". Ej: 584124231008 */
  whatsapp: string
}

export const SOPORTE_POR_DEFECTO: Soporte = {
  email: 'alexanderguerra1129@gmail.com',
  whatsapp: '584124231008',
}

export const EMAIL_VALIDO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/** "+58 412-4231008" -> "584124231008". Devuelve null si no parece un número válido. */
export function normalizarWhatsappSoporte(texto: string): string | null {
  const digitos = texto.replace(/\D/g, '')
  return digitos.length >= 8 && digitos.length <= 15 ? digitos : null
}

export const urlWhatsapp = (numero: string, texto?: string) =>
  `https://wa.me/${numero}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`

// Se lee una sola vez por carga de página y se comparte entre componentes.
let ultimo: Soporte | null = null
let pendiente: Promise<Soporte> | null = null

async function leer(): Promise<Soporte> {
  try {
    const { data } = await createClient()
      .from('config_app')
      .select('soporte_email, soporte_whatsapp')
      .maybeSingle()
    if (data) {
      ultimo = { email: data.soporte_email, whatsapp: data.soporte_whatsapp }
    } else {
      pendiente = null // sin dato: se vuelve a intentar la próxima vez
    }
  } catch {
    pendiente = null
  }
  return ultimo ?? SOPORTE_POR_DEFECTO
}

/** `forzar` ignora lo ya leído (tras guardar cambios en la pantalla de configuración). */
export function cargarSoporte(forzar = false): Promise<Soporte> {
  if (forzar || !pendiente) pendiente = leer()
  return pendiente
}

export function useSoporte() {
  const [soporte, setSoporte] = useState<Soporte>(ultimo ?? SOPORTE_POR_DEFECTO)

  useEffect(() => {
    let activo = true
    cargarSoporte().then((s) => {
      if (activo) setSoporte(s)
    })
    return () => {
      activo = false
    }
  }, [])

  return { ...soporte, whatsappUrl: urlWhatsapp(soporte.whatsapp) }
}
