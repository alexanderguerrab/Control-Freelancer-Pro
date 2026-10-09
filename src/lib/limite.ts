/**
 * Límite de peticiones por clave (p. ej. usuario + ruta) en memoria.
 * Frena abusos básicos y dobles clics; en serverless cada instancia cuenta
 * por separado, así que para un límite global usa Redis/Upstash.
 */
const ventanas = new Map<string, number[]>()

/** true si la petición se permite; false si se superó el máximo en la ventana. */
export function permitir(clave: string, max: number, ventanaMs = 60_000): boolean {
  const ahora = Date.now()
  const recientes = (ventanas.get(clave) ?? []).filter((t) => ahora - t < ventanaMs)
  if (recientes.length >= max) {
    ventanas.set(clave, recientes)
    return false
  }
  recientes.push(ahora)
  ventanas.set(clave, recientes)

  // Limpieza ocasional para que el mapa no crezca sin fin.
  if (ventanas.size > 5000) {
    for (const [k, v] of ventanas) {
      if (!v.some((t) => ahora - t < ventanaMs)) ventanas.delete(k)
    }
  }
  return true
}
