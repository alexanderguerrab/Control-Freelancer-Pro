'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { abrirSoporteEmail, WHATSAPP_SOPORTE } from '@/lib/alertas'

interface ItemMenu {
  label: string
  path: string
}

const itemsPrincipales: ItemMenu[] = [
  { label: '🏠 Panel de Inicio', path: '/dashboard' },
  { label: '🚀 Mi Perfil', path: '/dashboard/perfil' },
  { label: '💳 Mi Suscripción', path: '/dashboard/suscripcion' },
]

const itemsAdmin: ItemMenu[] = [
  { label: '💰 Finanzas y Pagos Admin', path: '/dashboard/admin/finanzas' },
  { label: '👩‍💻 Gestión Usuarios Admin', path: '/dashboard/admin/usuarios' },
  { label: '🛠️ Control Suscripciones Admin', path: '/dashboard/admin/control' },
  { label: '📊 Reporte Financiero Admin', path: '/dashboard/admin/reporte' },
]

const itemsUsuario: ItemMenu[] = [
  { label: '💼 Registro de Clientes', path: '/dashboard/clientes' },
  { label: '📊 Dashboard Visual', path: '/dashboard/visual' },
  { label: '📂 Proyectos y Finanzas', path: '/dashboard/proyectos' },
  { label: '🎓 Cursos y Suscripciones', path: '/dashboard/cursos' },
  { label: '📈 Reporte Mensual', path: '/dashboard/reporte' },
  { label: '✉️ Scripts de Cobro', path: '/dashboard/scripts' },
]

const claseItem = `px-6 py-3.5 cursor-pointer border-b border-white/5 text-[0.9em] text-left transition-all duration-300
  flex items-center whitespace-nowrap border-l-[5px] hover:bg-primary-light
  max-md:px-4 max-md:py-3 max-md:border-b-0 max-md:border-l-0 max-md:border-r max-md:border-r-white/5
  max-md:text-[0.8em] max-md:justify-center`

const claseActivo = 'bg-primary-light border-l-accent max-md:border-b-[3px] max-md:border-b-accent'
const claseInactivo = 'border-l-transparent hover:border-l-accent max-md:hover:border-b-[3px] max-md:hover:border-b-accent'

function Categoria({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] text-warning-gold px-6 pt-5 pb-1 uppercase font-bold tracking-wider max-md:hidden">
      {children}
    </div>
  )
}

export default function Sidebar({ esAdmin, logoUrl }: { esAdmin: boolean; logoUrl: string | null }) {
  const router = useRouter()
  const pathname = usePathname()

  function esActivo(path: string) {
    return path === '/dashboard' ? pathname === path : pathname.startsWith(path)
  }

  function renderItems(items: ItemMenu[]) {
    return items.map((item) => (
      <Link key={item.path} href={item.path}
        className={`${claseItem} ${esActivo(item.path) ? claseActivo : claseInactivo}`}>
        {item.label}
      </Link>
    ))
  }

  async function cerrarSesion() {
    await createClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-[260px] h-screen bg-primary text-white fixed z-50 flex flex-col overflow-y-auto
      max-md:w-full max-md:h-auto max-md:relative max-md:flex-row max-md:flex-nowrap max-md:overflow-x-auto max-md:overflow-y-hidden max-md:shadow-md">
      <div className="px-5 py-6 text-center border-b border-white/10 flex items-center justify-center gap-3
        max-md:px-4 max-md:py-2.5 max-md:border-b-0 max-md:border-r max-md:border-white/10">
        <div className="w-[38px] h-[38px] rounded-full overflow-hidden border-2 border-accent bg-primary-light flex items-center justify-center shrink-0">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo externo (Drive) sin dominio fijo
            <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#cccccc" className="w-6 h-6">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          )}
        </div>
        <span className="text-[1.1em] font-extrabold uppercase tracking-wider">Navegador</span>
      </div>

      {renderItems(itemsPrincipales)}

      {esAdmin && (
        <>
          <Categoria>Panel de Administrador</Categoria>
          {renderItems(itemsAdmin)}
        </>
      )}

      <Categoria>Panel de Usuarios</Categoria>
      {renderItems(itemsUsuario)}

      <Categoria>Soporte y Ayuda</Categoria>
      <a href={WHATSAPP_SOPORTE} target="_blank" rel="noopener noreferrer" className={`${claseItem} ${claseInactivo}`}>
        📱 Soporte WhatsApp
      </a>
      <button onClick={abrirSoporteEmail} className={`${claseItem} ${claseInactivo}`}>
        ✉️ Soporte Email
      </button>

      <button onClick={cerrarSesion}
        className={`${claseItem} text-danger border-t border-t-white/10 border-l-transparent hover:border-l-danger mt-auto
          max-md:mt-0 max-md:ml-auto max-md:border-t-0`}>
        🚪 Cerrar Sesión
      </button>
    </aside>
  )
}
