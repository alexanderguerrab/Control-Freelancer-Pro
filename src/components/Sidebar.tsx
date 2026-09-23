'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

const menuItems = [
  { id: 'inicio', label: '🏠 Panel de Inicio', path: '/dashboard', category: null },
  { id: 'perfil', label: '🚀 Mi Perfil', path: '/dashboard/perfil', category: null },
  { id: 'suscripcion', label: '💳 Mi Suscripción', path: '/dashboard/suscripcion', category: null },
]

const adminItems = [
  { id: 'finanzas-saas', label: '💰 Finanzas y Pagos Admin', path: '/dashboard/admin/finanzas' },
  { id: 'usuarios-saas', label: '👩‍💻 Gestión Usuarios Admin', path: '/dashboard/admin/usuarios' },
  { id: 'control-saas', label: '🛠️ Control Suscripciones Admin', path: '/dashboard/admin/control' },
  { id: 'reporte-saas', label: '📊 Reporte Financiero Admin', path: '/dashboard/admin/reporte' },
]

const userItems = [
  { id: 'clientes', label: '💼 Registro de Clientes', path: '/dashboard/clientes' },
  { id: 'visual', label: '📊 Dashboard Visual', path: '/dashboard/visual' },
  { id: 'proyectos', label: '📂 Proyectos y Finanzas', path: '/dashboard/proyectos' },
  { id: 'cursos', label: '🎓 Cursos y Suscripciones', path: '/dashboard/cursos' },
  { id: 'reporte', label: '📈 Reporte Mensual', path: '/dashboard/reporte' },
  { id: 'scripts', label: '✉️ Scripts de Cobro', path: '/dashboard/scripts' },
]

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [isAdmin] = useState(false) // TODO: verificar rol admin desde Supabase

  function isActive(path: string) {
    if (path === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(path)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function navigateTo(path: string) {
    router.push(path)
  }

  return (
    <aside className="w-[260px] h-screen bg-primary text-white fixed z-50 flex flex-col overflow-y-auto
      max-md:w-full max-md:h-auto max-md:relative max-md:flex-row max-md:flex-nowrap max-md:overflow-x-auto max-md:overflow-y-hidden max-md:shadow-md">
      {/* Header del Sidebar */}
      <div className="px-5 py-6 text-center border-b border-white/10 flex items-center justify-center gap-3
        max-md:px-4 max-md:py-2.5 max-md:border-b-0 max-md:border-r max-md:border-white/10">
        <div className="w-[38px] h-[38px] rounded-full overflow-hidden border-2 border-accent bg-primary-light flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#cccccc" className="w-6 h-6">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>
        <span className="text-[1.1em] font-extrabold uppercase tracking-wider">Navegador</span>
      </div>

      {/* Items principales */}
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => navigateTo(item.path)}
          className={`px-6 py-3.5 cursor-pointer border-b border-white/5 text-[0.9em] text-left transition-all duration-300 flex items-center hover:bg-primary-light hover:border-l-[5px] hover:border-l-accent whitespace-nowrap
            max-md:px-4 max-md:py-3 max-md:border-b-0 max-md:border-r max-md:border-r-white/5 max-md:text-[0.8em] max-md:text-center max-md:justify-center max-md:hover:border-l-0 max-md:hover:border-b-[3px] max-md:hover:border-b-accent
            ${isActive(item.path) ? 'bg-primary-light border-l-[5px] border-l-accent max-md:border-l-0 max-md:border-b-[3px] max-md:border-b-accent' : 'border-l-[5px] border-l-transparent max-md:border-l-0'}`}
        >
          {item.label}
        </button>
      ))}

      {/* Admin Items */}
      {isAdmin && (
        <>
          <div className="text-[10px] text-warning-gold px-6 pt-5 pb-1 uppercase font-bold tracking-wider max-md:hidden">
            PANEL DE ADMINISTRADOR
          </div>
          {adminItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigateTo(item.path)}
              className={`px-6 py-3.5 cursor-pointer border-b border-white/5 text-[0.9em] text-left transition-all duration-300 flex items-center hover:bg-primary-light hover:border-l-[5px] hover:border-l-accent whitespace-nowrap
                max-md:px-4 max-md:py-3 max-md:border-b-0 max-md:border-r max-md:border-r-white/5 max-md:text-[0.8em] max-md:text-center max-md:justify-center
                ${isActive(item.path) ? 'bg-primary-light border-l-[5px] border-l-accent' : 'border-l-[5px] border-l-transparent'}`}
            >
              {item.label}
            </button>
          ))}
        </>
      )}

      {/* Sección de Usuarios */}
      <div className="text-[10px] text-warning-gold px-6 pt-5 pb-1 uppercase font-bold tracking-wider max-md:hidden">
        PANEL DE USUARIOS
      </div>
      {userItems.map((item) => (
        <button
          key={item.id}
          onClick={() => navigateTo(item.path)}
          className={`px-6 py-3.5 cursor-pointer border-b border-white/5 text-[0.9em] text-left transition-all duration-300 flex items-center hover:bg-primary-light hover:border-l-[5px] hover:border-l-accent whitespace-nowrap
            max-md:px-4 max-md:py-3 max-md:border-b-0 max-md:border-r max-md:border-r-white/5 max-md:text-[0.8em] max-md:text-center max-md:justify-center
            ${isActive(item.path) ? 'bg-primary-light border-l-[5px] border-l-accent max-md:border-l-0 max-md:border-b-[3px] max-md:border-b-accent' : 'border-l-[5px] border-l-transparent max-md:border-l-0'}`}
        >
          {item.label}
        </button>
      ))}

      {/* Soporte */}
      <div className="text-[10px] text-warning-gold px-6 pt-5 pb-1 uppercase font-bold tracking-wider max-md:hidden">
        SOPORTE Y AYUDA
      </div>
      <a
        href="https://wa.me/584124231008"
        target="_blank"
        rel="noopener noreferrer"
        className="px-6 py-3.5 cursor-pointer border-b border-white/5 text-[0.9em] transition-all duration-300 flex items-center hover:bg-primary-light hover:border-l-[5px] hover:border-l-accent whitespace-nowrap border-l-[5px] border-l-transparent
          max-md:px-4 max-md:py-3 max-md:border-b-0 max-md:border-r max-md:text-[0.8em] max-md:text-center max-md:justify-center max-md:border-l-0"
      >
        💬 Soporte WhatsApp
      </a>
      <a
        href="mailto:alexanderguerra1129@gmail.com"
        target="_blank"
        rel="noopener noreferrer"
        className="px-6 py-3.5 cursor-pointer border-b border-white/5 text-[0.9em] transition-all duration-300 flex items-center hover:bg-primary-light hover:border-l-[5px] hover:border-l-accent whitespace-nowrap border-l-[5px] border-l-transparent
          max-md:px-4 max-md:py-3 max-md:border-b-0 max-md:border-r max-md:text-[0.8em] max-md:text-center max-md:justify-center max-md:border-l-0"
      >
        ✉️ Soporte Email
      </a>

      {/* Cerrar Sesión */}
      <button
        onClick={handleLogout}
        className="px-6 py-3.5 cursor-pointer border-t border-white/10 text-[0.9em] text-danger transition-all duration-300 flex items-center hover:bg-primary-light hover:border-l-[5px] hover:border-l-danger mt-auto whitespace-nowrap border-l-[5px] border-l-transparent
          max-md:mt-0 max-md:ml-auto max-md:border-t-0 max-md:border-l-0 max-md:border-l-0 max-md:px-4 max-md:py-3 max-md:text-[0.8em]"
      >
        🚪 Cerrar Sesión
      </button>
    </aside>
  )
}
