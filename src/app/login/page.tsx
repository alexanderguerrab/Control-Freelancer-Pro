'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { abrirSoporteEmail, WHATSAPP_SOPORTE } from '@/lib/alertas'

const REQUISITOS = [
  { texto: 'Mínimo 8 caracteres', ok: (p: string) => p.length >= 8 },
  { texto: 'Al menos 1 letra mayúscula', ok: (p: string) => /[A-Z]/.test(p) },
  { texto: 'Al menos 1 letra minúscula', ok: (p: string) => /[a-z]/.test(p) },
  { texto: 'Al menos 1 carácter especial (ej. @, #, !, $)', ok: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

const claseInput = `w-full bg-bg-dark text-white border border-border-dark p-2.5 mb-3 rounded-lg text-center
  text-[15px] outline-none focus:border-login-cyan transition-colors`
const claseEtiqueta = 'text-login-cyan text-[11px] uppercase font-bold block text-center mb-1'
const claseBoton = `w-full flex items-center justify-center gap-2.5 py-3 rounded-lg text-sm font-semibold
  transition-all duration-300 cursor-pointer mb-3 disabled:opacity-50`

function GoogleIcono() {
  return (
    <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [modo, setModo] = useState<'login' | 'registro'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [telefono, setTelefono] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'error' | 'ok'; texto: string } | null>(null)

  const esLogin = modo === 'login'

  function cambiarModo() {
    setModo(esLogin ? 'registro' : 'login')
    setMensaje(null)
  }

  async function iniciarSesion() {
    const { error } = await createClient().auth.signInWithPassword({ email, password })
    if (error) {
      setMensaje({ tipo: 'error', texto: error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos' : error.message })
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  async function registrarse() {
    const fallido = REQUISITOS.find((r) => !r.ok(password))
    if (fallido) {
      setMensaje({ tipo: 'error', texto: `La contraseña no cumple: ${fallido.texto.toLowerCase()}` })
      return
    }
    const { data, error } = await createClient().auth.signUp({
      email,
      password,
      options: {
        data: { telefono },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setMensaje({ tipo: 'error', texto: error.message })
      return
    }
    if (data.session) {
      // Sin confirmación por correo: entra directo y verá si está pendiente.
      router.push('/dashboard')
      router.refresh()
      return
    }
    setModo('login')
    setMensaje({ tipo: 'ok', texto: '¡Cuenta creada! Revisa tu correo para confirmarla. Luego el administrador autorizará tu acceso.' })
  }

  async function enviar(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    setCargando(true)
    setMensaje(null)
    await (esLogin ? iniciarSesion() : registrarse())
    setCargando(false)
  }

  async function entrarConGoogle() {
    const { error } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setMensaje({ tipo: 'error', texto: error.message })
  }

  async function recuperarPassword() {
    if (!email) {
      setMensaje({ tipo: 'error', texto: 'Ingresa tu correo electrónico primero.' })
      return
    }
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/nueva-password`,
    })
    setMensaje(error ? { tipo: 'error', texto: error.message } : { tipo: 'ok', texto: 'Enviado. Revisa tu bandeja de entrada.' })
  }

  const listaRequisitos = (
    <ul className="text-[#A0AEC0] text-[11px] text-left ml-5 mb-3 list-disc leading-snug">
      {REQUISITOS.map((r) => (
        <li key={r.texto} className={!esLogin && password && r.ok(password) ? 'text-login-green' : ''}>{r.texto}</li>
      ))}
    </ul>
  )

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover pointer-events-none">
        <source src="/video-animado.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/85" />

      <div className="relative z-10 w-[380px] max-w-[95%] bg-bg-card-dark border border-border-dark rounded-2xl p-8 text-center shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
        <h2 className="text-login-cyan text-[22px] font-bold mb-1">
          {esLogin ? '🔐 ACCESO FREELANCER CONTROL PRO' : 'Crear Cuenta Nueva'}
        </h2>
        {esLogin && <p className="text-text-muted text-[13px] mb-5">Inicia sesión con tu cuenta para ver tus datos</p>}

        {mensaje && (
          <div className={`text-sm rounded-lg p-3 mb-4 border ${mensaje.tipo === 'error'
            ? 'bg-danger/20 border-danger/50 text-danger'
            : 'bg-login-green/10 border-login-green/40 text-login-green'}`}>
            {mensaje.texto}
          </div>
        )}

        <form onSubmit={enviar}>
          <label className={claseEtiqueta}>Correo Electrónico</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@gmail.com" className={claseInput} required />

          <label className={claseEtiqueta}>Contraseña</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" className={claseInput} required />
          {listaRequisitos}

          {esLogin ? (
            <div className="text-right -mt-1 mb-3">
              <button type="button" onClick={recuperarPassword} className="text-login-cyan text-xs hover:text-login-green transition-colors cursor-pointer">
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          ) : (
            <>
              <label className={claseEtiqueta}>Teléfono (con cód. de área)</label>
              <input type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+1234567890" className={claseInput} />
            </>
          )}

          <button type="submit" disabled={cargando} className={`${claseBoton} bg-login-cyan text-black hover:bg-[#0099cc]`}>
            {cargando ? '⏳ Procesando...' : esLogin ? '🚀 Iniciar Sesión' : 'Registrarse'}
          </button>
        </form>

        {esLogin && (
          <button onClick={entrarConGoogle} className={`${claseBoton} bg-transparent text-white border border-border-dark hover:bg-white/5`}>
            <GoogleIcono />
            Iniciar sesión con Google
          </button>
        )}

        <button onClick={cambiarModo}
          className={`${claseBoton} ${esLogin
            ? 'bg-transparent text-login-cyan border border-login-cyan hover:bg-login-cyan/10'
            : 'bg-transparent text-white border border-border-dark hover:bg-white/5'}`}>
          {esLogin ? 'Crear Cuenta Nueva' : 'Volver al Login'}
        </button>

        {esLogin && (
          <div className="flex gap-2.5 mt-1">
            <a href={WHATSAPP_SOPORTE} target="_blank" rel="noopener noreferrer"
              className={`${claseBoton} mb-0! flex-1 text-login-green border border-login-green hover:bg-login-green/10`}>
              📱 WhatsApp
            </a>
            <button onClick={abrirSoporteEmail}
              className={`${claseBoton} mb-0! flex-1 text-login-cyan border border-login-cyan hover:bg-login-cyan/10`}>
              ✉️ Email
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
