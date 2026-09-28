'use client'

import { cargando, error, exito, preguntar } from './alertas'
import { hoyISO } from './fechas'
import type { TipoCobro } from './cobros'

const TEXTOS: Record<TipoCobro, { titulo: string; texto: string }> = {
  proyectos: {
    titulo: '¿Ejecutar Sistema de Cobro?',
    texto: 'Se enviarán recordatorios a todos los proyectos con estado VENCIDO.',
  },
  cursos: {
    titulo: '¿Ejecutar Cobro de Cursos?',
    texto: 'Se enviarán recordatorios usando las plantillas actuales a todas las cuotas vencidas.',
  },
  saas: {
    titulo: '¿Ejecutar Cobro SaaS?',
    texto: 'Se enviarán recordatorios automáticos a las cuotas SaaS vencidas usando tus scripts de cobro.',
  },
}

/** Pide confirmación y llama a /api/cobros. Devuelve true si se ejecutó. */
export async function ejecutarCobro(tipo: TipoCobro): Promise<boolean> {
  const { titulo, texto } = TEXTOS[tipo]
  if (!(await preguntar(titulo, texto, 'Sí, enviar correos 🚀'))) return false

  cargando('Enviando recordatorios...')
  try {
    const res = await fetch('/api/cobros', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // La fecha de hoy va del navegador para usar la zona horaria del usuario.
      body: JSON.stringify({ tipo, hoy: hoyISO() }),
    })
    const json = await res.json()
    if (!res.ok) {
      await error(json.error ?? 'No se pudo ejecutar el cobro.')
      return false
    }
    await exito(json.mensaje, '¡Completado!')
    return true
  } catch {
    await error('No se pudo conectar con el servidor.', 'Error de Conexión')
    return false
  }
}
