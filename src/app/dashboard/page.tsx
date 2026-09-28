import { createClient } from '@/utils/supabase/server'
import { urlImagenDrive } from '@/lib/drive'
import Reloj from '@/components/Reloj'

export default async function InicioPage() {
  const supabase = await createClient()
  const [{ data: { user } }, { data: perfil }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('perfil').select('nombre, logo_url').maybeSingle(),
  ])
  const logo = urlImagenDrive(perfil?.logo_url)
  const nombre = perfil?.nombre || user?.email?.split('@')[0]

  return (
    <div className="text-center py-10 px-5">
      <h1 className="text-3xl font-extrabold text-primary mb-6">
        🌈 Bienvenido{nombre ? `, ${nombre}` : ''}
      </h1>

      <div className="w-[300px] h-[300px] max-md:w-[220px] max-md:h-[220px] rounded-full border-3 border-accent bg-gray-200 shadow-lg flex items-center justify-center mx-auto mb-8 overflow-hidden">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- logo externo (Drive) sin dominio fijo
          <img src={logo} alt="Logo" className="w-full h-full object-cover" />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#cccccc" className="w-40 h-40">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        )}
      </div>

      <div className="bg-white p-5 rounded-xl shadow-md max-w-[500px] mx-auto">
        <p className="text-gray-500 mb-5">
          Selecciona una opción en el menú <span className="max-md:hidden">lateral</span>
          <span className="hidden max-md:inline">de arriba</span> para comenzar.
        </p>
        <div className="border-t border-gray-100 pt-4">
          <small className="block font-bold text-gray-400 text-[10px]">HORA ACTUAL</small>
          <Reloj />
        </div>
      </div>
    </div>
  )
}
