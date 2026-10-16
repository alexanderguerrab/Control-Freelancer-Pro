import { enlaceSeguro } from './urls'
import type { MetodoPago } from './types'

/** Lo mínimo de un método que necesitan copiar y compartir (sirve también para borradores sin guardar). */
export type MetodoCompartible = Pick<MetodoPago, 'nombre' | 'datos' | 'enlace' | 'qr'>

export const MAX_METODOS = 20
export const MAX_NOMBRE = 80
export const MAX_DATOS = 2000
export const MAX_ENLACE = 500

/** Texto de un método listo para pegar en WhatsApp (el *asterisco* es negrita allí). */
export function textoMetodo(m: MetodoCompartible): string {
  const lineas = [`💳 *${m.nombre.trim() || 'Método de pago'}*`]
  const datos = m.datos.trim()
  if (datos) lineas.push(datos)
  const enlace = enlaceSeguro(m.enlace)
  if (enlace) lineas.push(`🔗 ${enlace}`)
  return lineas.join('\n')
}

/** Varios métodos en un solo mensaje, separados por una línea en blanco. */
export function textoMetodos(lista: MetodoCompartible[]): string {
  return ['Mis métodos de pago:', ...lista.map(textoMetodo)].join('\n\n')
}

/** Solo los datos, tal cual, para «Copiar datos». */
export function textoDatos(m: MetodoCompartible): string {
  const partes = [m.datos.trim()]
  const enlace = enlaceSeguro(m.enlace)
  if (enlace) partes.push(enlace)
  return partes.filter(Boolean).join('\n')
}

export async function copiarAlPortapapeles(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    return false
  }
}

export function abrirWhatsApp(texto: string) {
  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer')
}

function dataUrlABlob(dataUrl: string): Blob | null {
  const m = /^data:([^;,]+)(;base64)?,([\s\S]*)$/.exec(dataUrl)
  if (!m) return null
  try {
    const binario = m[2] ? atob(m[3]) : decodeURIComponent(m[3])
    const bytes = new Uint8Array(binario.length)
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
    return new Blob([bytes], { type: m[1] })
  } catch {
    return null
  }
}

function archivosQr(lista: MetodoCompartible[]): File[] {
  const archivos: File[] = []
  for (const m of lista) {
    if (!m.qr) continue
    const blob = dataUrlABlob(m.qr)
    if (!blob) continue
    const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg'
    // Sin tildes ni símbolos para que el nombre del archivo sea válido en cualquier sistema.
    const base = (m.nombre.trim() || 'metodo').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'metodo'
    archivos.push(new File([blob], `qr-${base}.${ext}`, { type: blob.type }))
  }
  return archivos
}

export type ResultadoCompartir = 'compartido' | 'cancelado' | 'sin-soporte'

/**
 * Abre el menú nativo de compartir (móvil y navegadores compatibles) con el
 * texto y, si el dispositivo lo permite, las imágenes de QR. Devuelve
 * «sin-soporte» cuando el navegador no tiene esa función para que quien
 * llama ofrezca WhatsApp o copiar.
 */
export async function compartirNativo(texto: string, lista: MetodoCompartible[], titulo: string): Promise<ResultadoCompartir> {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return 'sin-soporte'
  const archivos = archivosQr(lista)
  const datos: ShareData = { title: titulo, text: texto }
  if (archivos.length && typeof navigator.canShare === 'function' && navigator.canShare({ files: archivos })) {
    datos.files = archivos
  }
  try {
    await navigator.share(datos)
    return 'compartido'
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return 'cancelado'
    if (datos.files) {
      // Algunos navegadores anuncian soporte de archivos y luego fallan: se reintenta solo con texto.
      try {
        await navigator.share({ title: titulo, text: texto })
        return 'compartido'
      } catch (e2) {
        if (e2 instanceof DOMException && e2.name === 'AbortError') return 'cancelado'
      }
    }
    return 'sin-soporte'
  }
}

const LADO_MAXIMO_QR = 480

/**
 * Lee una imagen de QR, la reduce (lado máximo 480 px) y la devuelve como
 * data URL ligera para guardarla en la base de datos. Usa WebP si el
 * navegador lo permite y, si no, JPEG sobre fondo blanco.
 */
export async function imagenQrADataUrl(archivo: File): Promise<string> {
  if (!archivo.type.startsWith('image/')) throw new Error('El archivo debe ser una imagen (PNG, JPG o WebP).')
  if (archivo.size > 10 * 1024 * 1024) throw new Error('La imagen es muy pesada (máximo 10 MB).')

  const bitmap = await createImageBitmap(archivo).catch(() => {
    throw new Error('No se pudo leer la imagen. Prueba con un PNG o JPG.')
  })
  const escala = Math.min(1, LADO_MAXIMO_QR / Math.max(bitmap.width, bitmap.height))
  const ancho = Math.max(1, Math.round(bitmap.width * escala))
  const alto = Math.max(1, Math.round(bitmap.height * escala))

  const lienzo = document.createElement('canvas')
  lienzo.width = ancho
  lienzo.height = alto
  const ctx = lienzo.getContext('2d')
  if (!ctx) throw new Error('Tu navegador no pudo procesar la imagen.')
  ctx.fillStyle = '#ffffff' // los PNG transparentes se verían negros en JPEG
  ctx.fillRect(0, 0, ancho, alto)
  ctx.drawImage(bitmap, 0, 0, ancho, alto)
  bitmap.close()

  const webp = lienzo.toDataURL('image/webp', 0.92)
  const resultado = webp.startsWith('data:image/webp') ? webp : lienzo.toDataURL('image/jpeg', 0.9)
  if (resultado.length > 600_000) throw new Error('La imagen sigue siendo muy pesada. Usa una captura más pequeña del QR.')
  return resultado
}
