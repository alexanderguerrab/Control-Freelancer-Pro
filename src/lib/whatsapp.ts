'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { aviso } from './alertas'
import { etapaPorAtraso, plantillaDe, rellenarPlantilla } from './cobros'
import { hoyISO } from './fechas'
import type { RegistroCobrable, ScriptsCobro } from './types'

/**
 * Recordatorio de cobro por WhatsApp. Abre WhatsApp (app o web) con el chat
 * del cliente y el mensaje ya escrito con la plantilla que toca según el
 * atraso (las mismas de «Scripts de Cobro»). Lo envía la persona con un toque:
 * no hace falta ninguna cuenta ni configuración extra, y no toca los avisos
 * por correo.
 */

/**
 * Deja el teléfono en el formato de wa.me (solo dígitos con código de país).
 * - "+58 412-1234567" o "0058 412…"  -> ya traen país.
 * - "0412-1234567" / "4121234567"    -> se completan con `codigoPais` (de Mi Perfil).
 * Devuelve null si no se puede construir un número válido.
 */
export function normalizarTelefono(telefono: string | null | undefined, codigoPais?: string | null): string | null {
  const bruto = (telefono ?? '').trim()
  let digitos = bruto.replace(/\D/g, '')
  if (!digitos) return null

  const cc = (codigoPais ?? '').replace(/\D/g, '')
  if (bruto.startsWith('+')) {
    // ya es internacional
  } else if (digitos.startsWith('00')) {
    digitos = digitos.slice(2)
  } else if (cc) {
    if (digitos.startsWith('0')) digitos = cc + digitos.replace(/^0+/, '')
    else if (!(digitos.startsWith(cc) && digitos.length >= cc.length + 7)) digitos = cc + digitos
  } else if (digitos.startsWith('0')) {
    return null // formato local y no sabemos de qué país
  }
  return digitos.length >= 8 && digitos.length <= 15 ? digitos : null
}

interface Datos {
  scripts: ScriptsCobro
  codigoPais: string
}

export interface RecordatorioWhatsApp {
  nombre: string
  telefono: string | null | undefined
  /** Proyecto, curso o plan: lo que sustituye a [Proyecto] en la plantilla. */
  concepto: string
  registro: RegistroCobrable
}

export function useWhatsApp() {
  const [datos, setDatos] = useState<Datos | null>(null)

  // Las plantillas se cargan al abrir la página (no al pulsar) para que
  // window.open ocurra dentro del clic y el navegador no lo bloquee.
  useEffect(() => {
    let activo = true
    ;(async () => {
      const supabase = createClient()
      const [{ data: fila }, { data: perfil }] = await Promise.all([
        supabase.from('scripts_cobro').select('plantilla_hoy, plantilla_7d, plantilla_15d').maybeSingle(),
        supabase.from('perfil').select('codigo_pais_whatsapp').maybeSingle(),
      ])
      let scripts = fila as ScriptsCobro | null
      if (!scripts) {
        // Primera vez: se crea con las plantillas por defecto de la base de datos.
        const { data: nueva } = await supabase
          .from('scripts_cobro')
          .insert({})
          .select('plantilla_hoy, plantilla_7d, plantilla_15d')
          .single()
        scripts = nueva as ScriptsCobro | null
      }
      if (!activo || !scripts) return
      setDatos({ scripts, codigoPais: (perfil as { codigo_pais_whatsapp?: string | null } | null)?.codigo_pais_whatsapp ?? '' })
    })()
    return () => {
      activo = false
    }
  }, [])

  const enviar = useCallback(
    ({ nombre, telefono, concepto, registro }: RecordatorioWhatsApp) => {
      // Los usuarios sin nombre se muestran con su correo; para el saludo basta lo de antes de la @.
      const saludo = nombre.includes('@') ? nombre.split('@')[0] : nombre

      if (!datos) {
        void aviso('Se están cargando tus plantillas. Vuelve a pulsar en un momento.')
        return
      }
      if (!telefono?.trim()) {
        void aviso(`${saludo || 'Este cliente'} no tiene teléfono registrado. Agrégalo en Registro de Clientes.`, 'Falta el teléfono')
        return
      }
      const numero = normalizarTelefono(telefono, datos.codigoPais)
      if (!numero) {
        void aviso(
          `El teléfono «${telefono}» no es válido. Escríbelo con el código de país (ej. +58 412 1234567) en Registro de Clientes, ` +
            'o define tu código de país por defecto en Mi Perfil.',
          'Teléfono no válido'
        )
        return
      }

      const etapa = etapaPorAtraso(registro, hoyISO())
      const texto = rellenarPlantilla(plantillaDe(datos.scripts, etapa), {
        nombre: saludo,
        proyecto: concepto,
        monto: registro.monto,
      })
      window.open(`https://wa.me/${numero}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer')
    },
    [datos]
  )

  return { enviar }
}
