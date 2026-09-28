import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import AccesoRestringido from '@/components/AccesoRestringido'
import { createClient } from '@/utils/supabase/server'
import { urlImagenDrive } from '@/lib/drive'
import type { Usuario } from '@/lib/types'

export default async function DashboardLayout({ children }: LayoutProps<'/dashboard'>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Crea el registro si falta y devuelve rol/estado (verificarAccesoUsuario).
  const { data } = await supabase.rpc('asegurar_usuario')
  const usuario = data as Usuario | null

  if (!usuario || usuario.estado !== 'Autorizado') {
    return <AccesoRestringido estado={usuario?.estado ?? 'Pendiente'} />
  }

  const { data: perfil } = await supabase.from('perfil').select('logo_url').maybeSingle()

  return (
    <div className="flex min-h-screen max-md:flex-col">
      <Sidebar
        esAdmin={usuario.rol === 'Administrador'}
        logoUrl={urlImagenDrive(perfil?.logo_url)}
      />
      <main className="ml-[260px] grow p-8 overflow-y-auto h-screen box-border
        max-md:ml-0 max-md:w-full max-md:p-4 max-md:h-auto">
        {children}
      </main>
    </div>
  )
}
