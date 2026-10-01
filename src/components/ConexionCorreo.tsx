'use client'

import { useEffect, useState } from 'react'
import { cargando, cerrar, confirmar, error, exito } from '@/lib/alertas'

const URL_CLAVES_GOOGLE = 'https://myaccount.google.com/apppasswords'

/**
 * Permite al usuario conectar su Gmail para que los recordatorios de cobro
 * salgan desde su propia dirección. Sin conexión no se envía ningún
 * recordatorio (salvo el administrador, que usa el correo del sistema).
 */
export default function ConexionCorreo() {
  // undefined = cargando; null = sin Gmail conectado
  const [conectado, setConectado] = useState<string | null | undefined>(undefined)
  const [usaSistema, setUsaSistema] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    let activo = true
    fetch('/api/correo')
      .then((r) => r.json())
      .then((j) => {
        if (!activo) return
        setConectado(j.email ?? null)
        setUsaSistema(Boolean(j.sistema))
      })
      .catch(() => {
        if (activo) setConectado(null)
      })
    return () => {
      activo = false
    }
  }, [])

  async function conectar(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    cargando('Comprobando con Gmail...')
    try {
      const res = await fetch('/api/correo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const j = await res.json()
      cerrar()
      if (!res.ok) return error(j.error ?? 'No se pudo conectar el correo.')
      setConectado(j.email)
      setPassword('')
      exito(`Tus recordatorios ahora saldrán desde ${j.email}.`, '¡Correo conectado!')
    } catch {
      cerrar()
      error('No se pudo conectar con el servidor.', 'Error de Conexión')
    }
  }

  async function desconectar() {
    const ok = await confirmar(
      '¿Desconectar tu Gmail?',
      usaSistema
        ? 'Tus recordatorios volverán a salir desde el correo del sistema.'
        : 'No se enviarán recordatorios hasta que vuelvas a conectar un correo.',
      'Sí, desconectar'
    )
    if (!ok) return
    const res = await fetch('/api/correo', { method: 'DELETE' })
    if (!res.ok) return error('No se pudo desconectar el correo.')
    setConectado(null)
  }

  return (
    <div className="card mb-6">
      <div className="bg-accent-cyan text-black text-center font-bold p-2.5 rounded-md mb-3">CORREO DESDE EL QUE SE ENVÍAN TUS COBROS</div>

      {conectado === undefined ? (
        <p className="text-center text-gray-400 text-sm py-3">Cargando...</p>
      ) : conectado ? (
        <div className="text-center">
          <p className="text-sm mb-1">Tus recordatorios salen desde:</p>
          <p className="font-bold text-primary text-lg mb-3">✅ {conectado}</p>
          <button onClick={desconectar} className="btn-icono btn-eliminar">Desconectar</button>
        </div>
      ) : (
        <form onSubmit={conectar}>
          {usaSistema ? (
            <p className="text-center text-xs mb-4">
              Como administrador, tus recordatorios salen desde el correo del sistema. Puedes conectar otro Gmail si quieres.
            </p>
          ) : (
            <p className="text-center text-sm mb-4 bg-red-50 border border-red-200 text-red-700 rounded-md p-2.5">
              ⚠️ <b>Aún no has configurado tu correo.</b> No se enviará ningún recordatorio de cobro hasta que conectes tu Gmail.
            </p>
          )}

          <p className="text-center text-xs mb-2"><b>Paso 1:</b> crea tu contraseña de aplicación en Google (no es tu contraseña normal).</p>
          <a href={URL_CLAVES_GOOGLE} target="_blank" rel="noopener noreferrer"
            className="btn-principal bg-warning-gold text-black! block text-center mt-0 mb-4">
            🔑 CREAR MI CONTRASEÑA DE APLICACIÓN
          </a>

          <p className="text-center text-xs mb-2"><b>Paso 2:</b> pega aquí la clave de 16 letras que te dio Google.</p>
          <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1 max-md:gap-0">
            <div>
              <label className="etiqueta">Tu correo de Gmail</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@gmail.com" className="campo" required />
            </div>
            <div>
              <label className="etiqueta">Contraseña de aplicación</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="16 letras" className="campo" autoComplete="off" required />
            </div>
          </div>
          <button type="submit" className="btn-principal bg-accent">🔗 CONECTAR MI GMAIL</button>
          <div className="text-xs text-gray-500 mt-4 leading-relaxed">
            <b>¿El botón amarillo dice que la opción no está disponible?</b> Primero activa la verificación en 2 pasos en{' '}
            <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="text-accent underline">myaccount.google.com/security</a>{' '}
            y vuelve a pulsarlo. En la pantalla de Google escribe un nombre (por ejemplo «Cobros»), pulsa Crear y copia la clave. Aquí se guarda cifrada.
          </div>
        </form>
      )}
    </div>
  )
}
