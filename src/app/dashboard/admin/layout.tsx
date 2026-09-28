import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

// La UI se oculta a no-admins, pero la protección real está en RLS (es_admin()).
export default async function AdminLayout({ children }: LayoutProps<'/dashboard/admin'>) {
  const supabase = await createClient()
  const { data: esAdmin } = await supabase.rpc('es_admin')
  if (!esAdmin) redirect('/dashboard')
  return <>{children}</>
}
