/**
 * Devuelve la URL solo si es http(s); si no, null. Evita enlaces
 * `javascript:` o `data:` guardados en campos de texto libre. Si el usuario
 * escribió "www.sitio.com" sin esquema se asume https.
 */
export function enlaceSeguro(url: string | null | undefined): string | null {
  const texto = (url ?? '').trim()
  if (!texto) return null
  const conEsquema = /^[a-z][a-z0-9+.-]*:/i.test(texto) ? texto : `https://${texto}`
  try {
    const u = new URL(conEsquema)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null
  } catch {
    return null
  }
}
