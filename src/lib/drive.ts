/**
 * Convierte un enlace de Google Drive en una URL de miniatura que se puede
 * usar en <img> (misma lógica que obtenerDatosPerfil del legacy).
 */
export function urlImagenDrive(url: string | null | undefined): string | null {
  if (!url) return null
  if (!url.includes('drive.google.com') && !url.includes('google.com/open')) return url

  let id = ''
  if (url.includes('id=')) id = url.split('id=')[1].split('&')[0]
  else if (url.includes('/d/')) id = url.split('/d/')[1].split('/')[0]

  return id ? `https://drive.google.com/thumbnail?sz=w500&id=${id}` : url
}
