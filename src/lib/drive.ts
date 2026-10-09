import { enlaceSeguro } from './urls'

/**
 * Convierte un enlace de Google Drive en una URL de miniatura que se puede
 * usar en <img>. Cualquier URL que no sea http(s) se descarta.
 */
export function urlImagenDrive(url: string | null | undefined): string | null {
  const segura = enlaceSeguro(url)
  if (!segura) return null

  const u = new URL(segura)
  const esDrive = u.hostname === 'drive.google.com' || u.hostname === 'docs.google.com'
  if (!esDrive) return segura

  const id = u.searchParams.get('id') ?? u.pathname.match(/\/d\/([^/]+)/)?.[1]
  return id ? `https://drive.google.com/thumbnail?sz=w500&id=${encodeURIComponent(id)}` : segura
}
