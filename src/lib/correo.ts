import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import nodemailer, { type Transporter } from 'nodemailer'
import type { createClient } from '@/utils/supabase/server'

/**
 * Solo servidor. Envío de correos de cobro: con el Gmail propio del usuario
 * si lo conectó (tabla correo_envio), o con el SMTP del sistema si no.
 */

type Supabase = Awaited<ReturnType<typeof createClient>>

function claveCifrado(): Buffer {
  const clave = Buffer.from(process.env.CORREO_CLAVE_CIFRADO ?? '', 'base64')
  if (clave.length !== 32) {
    throw new Error('Falta la variable CORREO_CLAVE_CIFRADO (32 bytes en base64) en el servidor.')
  }
  return clave
}

/** AES-256-GCM. Formato: iv.tag.datos, cada parte en base64. */
export function cifrar(texto: string): string {
  const iv = randomBytes(12)
  const cifrador = createCipheriv('aes-256-gcm', claveCifrado(), iv)
  const datos = Buffer.concat([cifrador.update(texto, 'utf8'), cifrador.final()])
  return [iv, cifrador.getAuthTag(), datos].map((b) => b.toString('base64')).join('.')
}

export function descifrar(cifrado: string): string {
  const [iv, tag, datos] = cifrado.split('.').map((p) => Buffer.from(p, 'base64'))
  const descifrador = createDecipheriv('aes-256-gcm', claveCifrado(), iv)
  descifrador.setAuthTag(tag)
  return Buffer.concat([descifrador.update(datos), descifrador.final()]).toString('utf8')
}

const TIEMPOS = { connectionTimeout: 15_000, greetingTimeout: 15_000, socketTimeout: 20_000 }

// Google muestra la contraseña de aplicación en bloques con espacios.
export const limpiarPassword = (pass: string) => pass.replace(/\s+/g, '')

export function transporteGmail(email: string, password: string) {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: email.trim(), pass: limpiarPassword(password) },
    ...TIEMPOS,
  })
}

export function mensajeError(e: unknown): string {
  const texto = e instanceof Error ? e.message : String(e)
  return texto.split('\n')[0].slice(0, 200)
}

export interface ConfigEnvio {
  transporte: Transporter
  /** Dirección desde la que sale el correo. */
  direccion: string
  /** true si es el Gmail del propio usuario; false si es el SMTP del sistema. */
  propio: boolean
}

/** Elige con qué cuenta enviar. Devuelve un texto de error si no hay ninguna utilizable. */
export async function configuracionEnvio(supabase: Supabase): Promise<ConfigEnvio | string> {
  const { data: propio } = await supabase.from('correo_envio').select('email, password_cifrada').maybeSingle()
  if (propio) {
    try {
      return {
        transporte: transporteGmail(propio.email, descifrar(propio.password_cifrada)),
        direccion: propio.email,
        propio: true,
      }
    } catch (e) {
      return `No se pudo usar tu Gmail conectado: ${mensajeError(e)}`
    }
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return 'El envío de correos no está configurado. Conecta tu Gmail en Scripts de Cobro.'
  }
  const puerto = Number(SMTP_PORT ?? 465)
  return {
    transporte: nodemailer.createTransport({
      host: SMTP_HOST,
      port: puerto,
      secure: puerto === 465,
      auth: { user: SMTP_USER.trim(), pass: limpiarPassword(SMTP_PASS) },
      ...TIEMPOS,
    }),
    direccion: (SMTP_FROM || SMTP_USER).match(/<([^>]+)>/)?.[1] ?? (SMTP_FROM || SMTP_USER),
    propio: false,
  }
}
