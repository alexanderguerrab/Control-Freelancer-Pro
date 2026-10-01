import type { TipoCobro } from './cobros'

/**
 * Solo servidor. Construye el correo de cobro con formato que los filtros
 * anti-spam toleran mejor: asunto sobrio (sin emojis ni símbolos de alarma),
 * versión texto + HTML (multipart/alternative) y un pie que identifica quién
 * envía y por qué.
 */

const PREFIJO_ASUNTO: Record<TipoCobro, string> = {
  proyectos: 'Recordatorio de pago: ',
  cursos: 'Recordatorio de pago de suscripción: ',
  saas: 'Recordatorio de pago de tu plan: ',
}

/** Asunto sin saltos de línea ni emojis/símbolos de alarma. */
export function asuntoCobro(tipo: TipoCobro, concepto: string): string {
  const limpio = (concepto || 'Pendiente').replace(/[\r\n]+/g, ' ').trim().slice(0, 80)
  return PREFIJO_ASUNTO[tipo] + limpio
}

const escapar = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export interface CorreoCobro {
  subject: string
  text: string
  html: string
}

export function construirCorreo(
  tipo: TipoCobro,
  datos: { concepto: string; cuerpo: string; remitente: string; responderA: string }
): CorreoCobro {
  const { concepto, cuerpo, remitente, responderA } = datos
  const firma = remitente || responderA
  const pie = `Recibes este mensaje de ${firma} por un pago pendiente. Si ya realizaste el pago, ignora este recordatorio o responde a este correo.`

  const text = `${cuerpo.trim()}\n\nSaludos,\n${firma}\n\n--\n${pie}`

  const parrafos = cuerpo
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${escapar(p).replace(/\n/g, '<br>')}</p>`)
    .join('')

  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#222;max-width:560px">` +
    parrafos +
    `<p style="margin:18px 0 0">Saludos,<br>${escapar(firma)}</p>` +
    `<hr style="border:none;border-top:1px solid #ddd;margin:22px 0 10px">` +
    `<p style="margin:0;font-size:12px;color:#777">${escapar(pie)}</p>` +
    `</div>`

  return { subject: asuntoCobro(tipo, concepto), text, html }
}

export const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms))
