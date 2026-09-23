import { createClient } from '@/utils/supabase/server'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="text-center py-10 px-5">
      <h1 className="text-3xl font-extrabold text-primary mb-6">
        🌈 Bienvenido{user?.email ? `, ${user.email.split('@')[0]}` : ''}
      </h1>

      <div className="mx-auto w-[300px] mb-8">
        <div className="w-[300px] h-[300px] rounded-full border-3 border-accent bg-gray-200 shadow-lg flex items-center justify-center mx-auto overflow-hidden">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#cccccc" className="w-40 h-40">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-md max-w-[500px] mx-auto">
        <p className="text-gray-500 mb-5">
          Selecciona una opción en el menú <span className="max-md:hidden">lateral</span><span className="hidden max-md:inline">de arriba</span> para comenzar.
        </p>

        {/* Info del usuario */}
        <div className="text-sm text-gray-400 space-y-1">
          <p>📧 {user?.email}</p>
          <p>🆔 {user?.id?.slice(0, 8)}...</p>
        </div>
      </div>
    </div>
  )
}
