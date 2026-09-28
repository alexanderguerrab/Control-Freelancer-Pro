'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { abrirSoporteEmail, WHATSAPP_SOPORTE } from '@/lib/alertas'

export default function AccesoRestringido({ estado }: { estado: string }) {
  const router = useRouter()

  async function salir() {
    await createClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-dark px-4">
      <div className="bg-bg-card-dark border border-border-dark rounded-2xl p-8 max-w-[400px] w-full text-center shadow-2xl">
        <div className="text-5xl mb-3">⚠️</div>
        <h2 className="text-login-cyan text-xl font-bold mb-2">Acceso Restringido</h2>
        <p className="text-text-muted text-sm mb-6">
          Tu cuenta se encuentra <strong className="text-white">({estado})</strong>. Por favor contacta
          al administrador para que autorice tu acceso.
        </p>
        <div className="flex gap-2.5 mb-3">
          <a href={WHATSAPP_SOPORTE} target="_blank" rel="noopener noreferrer"
            className="flex-1 text-login-green border border-login-green py-2.5 rounded-lg text-sm font-semibold hover:bg-login-green/10 transition-colors">
            📱 WhatsApp
          </a>
          <button onClick={abrirSoporteEmail}
            className="flex-1 text-login-cyan border border-login-cyan py-2.5 rounded-lg text-sm font-semibold hover:bg-login-cyan/10 transition-colors cursor-pointer">
            ✉️ Email
          </button>
        </div>
        <button onClick={salir}
          className="w-full text-white border border-border-dark py-2.5 rounded-lg text-sm font-semibold hover:bg-white/5 transition-colors cursor-pointer">
          🚪 Cerrar Sesión
        </button>
      </div>
    </div>
  )
}
