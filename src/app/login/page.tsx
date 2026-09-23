'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [telefono, setTelefono] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'Correo o contraseña incorrectos'
        : error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validaciones de contraseña
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      setLoading(false)
      return
    }
    if (!/[A-Z]/.test(password)) {
      setError('La contraseña debe tener al menos 1 letra mayúscula')
      setLoading(false)
      return
    }
    if (!/[a-z]/.test(password)) {
      setError('La contraseña debe tener al menos 1 letra minúscula')
      setLoading(false)
      return
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      setError('La contraseña debe tener al menos 1 carácter especial')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { telefono },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setError('')
    alert('¡Cuenta creada! Revisa tu correo para confirmar tu cuenta.')
    setMode('login')
    setLoading(false)
  }

  async function handleGoogleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) setError(error.message)
  }

  async function handleForgotPassword() {
    if (!email) {
      setError('Ingresa tu correo electrónico primero')
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })
    if (error) {
      setError(error.message)
    } else {
      alert('Se envió un enlace de recuperación a tu correo.')
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Video de fondo */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source
          src="https://github.com/alexanderguerrab/Control-Freelancer-Pro/raw/refs/heads/main/video%20animado.mp4"
          type="video/mp4"
        />
      </video>

      {/* Overlay oscuro */}
      <div className="absolute inset-0 bg-black/85 z-[1]" />

      {/* Modal de Login */}
      <div className="relative z-10 w-full max-w-[380px] mx-4">
        <div className="bg-bg-card-dark border border-border-dark rounded-2xl p-8 shadow-2xl">
          <h2 className="text-accent text-2xl font-bold text-center mb-1">
            {mode === 'login' ? '🔐 ACCESO FREELANCER' : 'Crear Cuenta Nueva'}
          </h2>
          <p className="text-text-muted text-sm text-center mb-6">
            {mode === 'login'
              ? 'Inicia sesión en tu panel administrativo'
              : 'Regístrate para acceder al sistema'}
          </p>

          {error && (
            <div className="bg-danger/20 border border-danger/50 text-danger text-sm rounded-lg p-3 mb-4 text-center">
              {error}
            </div>
          )}

          <form onSubmit={mode === 'login' ? handleLogin : handleRegister}>
            <label className="text-accent-cyan text-[11px] uppercase font-bold block text-center mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@gmail.com"
              className="w-full bg-bg-dark text-white border border-border-dark p-3 mb-3 rounded-lg text-center text-[15px] outline-none focus:border-accent transition-colors"
              required
            />

            {mode === 'register' && (
              <>
                <label className="text-accent-cyan text-[11px] uppercase font-bold block text-center mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="+123456789"
                  className="w-full bg-bg-dark text-white border border-border-dark p-3 mb-3 rounded-lg text-center text-[15px] outline-none focus:border-accent transition-colors"
                />
              </>
            )}

            <label className="text-accent-cyan text-[11px] uppercase font-bold block text-center mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              className="w-full bg-bg-dark text-white border border-border-dark p-3 mb-2 rounded-lg text-center text-[15px] outline-none focus:border-accent transition-colors"
              required
            />

            {/* Requisitos de contraseña */}
            <ul className="text-text-muted text-[11px] text-left ml-5 mb-3 list-disc leading-relaxed">
              <li>Mínimo 8 caracteres</li>
              <li>Al menos 1 letra mayúscula</li>
              <li>Al menos 1 letra minúscula</li>
              <li>Al menos 1 carácter especial (ej. @, #, !, $)</li>
            </ul>

            {mode === 'login' && (
              <div className="text-right mb-3 -mt-1">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-accent-cyan text-xs hover:text-success transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent-cyan text-black font-bold py-3 rounded-lg text-[15px] hover:bg-success transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading
                ? '⏳ Procesando...'
                : mode === 'login'
                  ? '🚀 Iniciar Sesión'
                  : 'Registrarse'}
            </button>
          </form>

          {mode === 'login' && (
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-2.5 bg-bg-dark text-white border border-border-dark py-2.5 rounded-lg mt-3 hover:bg-primary-light transition-colors cursor-pointer"
            >
              <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              Iniciar sesión con Google
            </button>
          )}

          <button
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login')
              setError('')
            }}
            className="w-full text-accent-cyan border border-accent-cyan bg-transparent py-2 rounded-lg mt-4 hover:bg-primary-light/50 transition-colors cursor-pointer text-sm"
          >
            {mode === 'login' ? 'Crear Cuenta Nueva' : 'Volver al Login'}
          </button>

          {mode === 'login' && (
            <div className="flex gap-2.5 mt-4">
              <a
                href="https://wa.me/584124231008"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center text-success border border-success bg-transparent py-2 rounded-lg hover:bg-primary-light/50 transition-colors text-sm"
              >
                📱 WhatsApp
              </a>
              <a
                href="mailto:alexanderguerra1129@gmail.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center text-accent-cyan border border-accent-cyan bg-transparent py-2 rounded-lg hover:bg-primary-light/50 transition-colors text-sm"
              >
                ✉️ Email
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
