'use client'

import { useEffect, useState } from 'react'
import { cargando, cerrar, confirmar, error, exito } from '@/lib/alertas'

/**
 * Permite al usuario conectar su Gmail para que los recordatorios de cobro
 * salgan desde su propia dirección. Sin conexión, salen por el correo del
 * sistema y las respuestas llegan al correo de su cuenta.
 */
export default function ConexionCorreo() {
  // undefined = cargando; null = usa el correo del sistema
  const [conectado, setConectado] = useState<string | null | undefined>(undefined)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    let activo = true
    fetch('/api/correo')
      .then((r) => r.json())
      .then((j) => {
        if (activo) setConectado(j.email ?? null)
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
      'Tus recordatorios volverán a salir desde el correo del sistema.',
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
          <p className="text-center text-xs mb-4">
            Ahora tus recordatorios salen desde el correo del sistema. Conecta tu Gmail para que salgan desde <b>tu dirección</b>.
          </p>
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
            <b>¿Cómo obtengo la contraseña de aplicación?</b> No es tu contraseña normal de Gmail.
            <ol className="list-decimal ml-5 mt-1">
              <li>Activa la verificación en 2 pasos en <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="text-accent underline">myaccount.google.com/security</a>.</li>
              <li>Entra a <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-accent underline">myaccount.google.com/apppasswords</a>, escribe un nombre y pulsa Crear.</li>
              <li>Copia la clave de 16 letras y pégala aquí. Se guarda cifrada.</li>
            </ol>
          </div>
        </form>
      )}
    </div>
  )
}
