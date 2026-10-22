'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'

// Video de fondo del login (mismo formato que Ayudante Integral y Trading Journal):
// - Escritorio y celular acostado: pantalla completa, recortado al centro.
// - Celular vertical: el video se ve COMPLETO arriba y una copia difuminada rellena el fondo.
// Los estilos están en globals.css (.login-video, .login-video-blur, .login-velo).
// Se asume un video 16:9 (1280×720); si cambias el video por otro formato, ajusta globals.css.

const VIDEO = '/video-animado.mp4'
const CONSULTA_VERTICAL = '(max-width: 820px) and (orientation: portrait)'

function suscribirVertical(avisar: () => void) {
  const mq = window.matchMedia(CONSULTA_VERTICAL)
  mq.addEventListener('change', avisar)
  return () => mq.removeEventListener('change', avisar)
}
const esVertical = () => window.matchMedia(CONSULTA_VERTICAL).matches

export function VideoFondo() {
  // La copia difuminada solo existe en celular vertical, para no reproducir el video dos veces en escritorio
  const vertical = useSyncExternalStore(suscribirVertical, esVertical, () => false)
  const principal = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const v = principal.current
    if (!v) return
    v.muted = true // iOS lo exige por JavaScript, no basta con el atributo
    v.defaultMuted = true
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      v.pause()
      return
    }
    const reproducir = () => { if (v.paused) v.play().catch(() => { }) } // si falla, queda el fondo oscuro
    reproducir()
    // Móviles en ahorro de batería bloquean el autoplay: se reintenta al primer toque
    document.addEventListener('touchstart', reproducir, { once: true, passive: true })
    document.addEventListener('click', reproducir, { once: true })
    const alVolver = () => { if (!document.hidden) reproducir() }
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      document.removeEventListener('touchstart', reproducir)
      document.removeEventListener('click', reproducir)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [])

  return (
    <>
      {vertical && (
        <video
          className="login-video-blur"
          autoPlay muted loop playsInline preload="auto" aria-hidden="true"
          ref={(el) => { if (el) { el.muted = true; el.play().catch(() => { }) } }}
        >
          <source src={VIDEO} type="video/mp4" />
        </video>
      )}
      <video ref={principal} className="login-video" autoPlay muted loop playsInline preload="auto" aria-hidden="true">
        <source src={VIDEO} type="video/mp4" />
      </video>
      <div className="login-velo" />
    </>
  )
}
