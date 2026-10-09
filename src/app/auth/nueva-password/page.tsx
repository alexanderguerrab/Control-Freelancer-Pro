'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { primerRequisitoFallido } from '@/lib/password'

/** Destino del enlace de "¿Olvidaste tu contraseña?" (ya con sesión de recuperación). */
export default function NuevaPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function guardar(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    const fallido = primerRequisitoFallido(password)
    if (fallido) {
      setError(`La contraseña no cumple: ${fallido.texto.toLowerCase()}`)
      return
    }
    setGuardando(true)
    const { error: err } = await createClient().auth.updateUser({ password })
    setGuardando(false)
    if (err) {
      setError(err.message)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-dark px-4">
      <form onSubmit={guardar} className="bg-bg-card-dark border border-border-dark rounded-2xl p-8 w-[380px] max-w-full text-center shadow-2xl">
        <h2 className="text-login-cyan text-xl font-bold mb-5">🔑 Nueva Contraseña</h2>
        {error && <div className="bg-danger/20 border border-danger/50 text-danger text-sm rounded-lg p-3 mb-4">{error}</div>}
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" required
          className="w-full bg-bg-dark text-white border border-border-dark p-2.5 mb-4 rounded-lg text-center outline-none focus:border-login-cyan" />
        <button type="submit" disabled={guardando}
          className="w-full bg-login-cyan text-black font-semibold py-3 rounded-lg hover:bg-[#0099cc] transition-colors cursor-pointer disabled:opacity-50">
          {guardando ? '⏳ Guardando...' : 'Guardar Contraseña'}
        </button>
      </form>
    </div>
  )
}
