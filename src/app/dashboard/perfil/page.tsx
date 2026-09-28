'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { error, exito } from '@/lib/alertas'
import type { Perfil } from '@/lib/types'

type CampoPerfil = Exclude<keyof Perfil, 'owner_id'>

const PERFIL_VACIO: Perfil = {
  nombre: '', marca: '', especialidad: '', logo_url: '',
  moneda: 'USD', meta_mensual: 0,
  red_social_1_nombre: '', red_social_1_url: '',
  red_social_2_nombre: '', red_social_2_url: '',
  red_social_3_nombre: '', red_social_3_url: '',
  pasarela_1_nombre: '', pasarela_1_url: '',
  pasarela_2_nombre: '', pasarela_2_url: '',
  pasarela_3_nombre: '', pasarela_3_url: '',
}

// Definido fuera de la página: si se crea dentro, React lo remonta en cada
// render y el input pierde el foco con cada tecla.
function Campo({ label, valor, tipo = 'text', onChange }: {
  label: string
  valor: string | number | null
  tipo?: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="etiqueta">{label}</label>
      <input type={tipo} value={valor ?? ''} onChange={(e) => onChange(e.target.value)} className="campo" />
    </div>
  )
}

export default function PerfilPage() {
  const router = useRouter()
  const [form, setForm] = useState<Perfil>(PERFIL_VACIO)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    createClient()
      .from('perfil')
      .select('*')
      .maybeSingle()
      .then(({ data }) => {
        if (data) setForm({ ...PERFIL_VACIO, ...data })
      })
  }, [])

  function cambiar(campo: CampoPerfil, valor: string) {
    setForm((prev) => ({ ...prev, [campo]: campo === 'meta_mensual' ? parseFloat(valor) || 0 : valor }))
  }

  const campo = (label: string, nombre: CampoPerfil, tipo?: string) => (
    <Campo label={label} valor={form[nombre]} tipo={tipo} onChange={(v) => cambiar(nombre, v)} />
  )

  async function guardar(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    setGuardando(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error: err } = await supabase
      .from('perfil')
      .upsert({ ...form, owner_id: user?.id, updated_at: new Date().toISOString() })
    setGuardando(false)
    if (err) return error(err.message)
    exito('Perfil actualizado', '¡Éxito!')
    router.refresh() // actualiza el logo del menú lateral
  }

  return (
    <div>
      <h1 className="titulo-seccion">🚀 Configuración de Perfil</h1>

      <form onSubmit={guardar} className="card">
        <div className="banda bg-accent-cyan">DATOS DE IDENTIDAD</div>
        <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1 max-md:gap-0">
          {campo('Nombre', 'nombre')}
          {campo('Marca', 'marca')}
          {campo('Especialidad', 'especialidad')}
          {campo('URL Logo (Drive)', 'logo_url')}
        </div>

        <div className="banda bg-cyan-100">CONFIGURACIÓN NEGOCIO</div>
        <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1 max-md:gap-0">
          {campo('Moneda', 'moneda')}
          {campo('Meta Mensual', 'meta_mensual', 'number')}
        </div>

        <div className="banda bg-[#ffd700]">CONTACTO Y REDES</div>
        {([1, 2, 3] as const).map((i) => (
          <div key={i} className="grid grid-cols-2 gap-4 max-md:grid-cols-1 max-md:gap-0">
            {campo(`Red Social ${i}`, `red_social_${i}_nombre`)}
            {campo(`Enlace ${i}`, `red_social_${i}_url`)}
          </div>
        ))}

        <div className="banda bg-[#98fb98]">PASARELAS DE PAGO</div>
        {([1, 2, 3] as const).map((i) => (
          <div key={i} className="grid grid-cols-2 gap-4 max-md:grid-cols-1 max-md:gap-0">
            {campo(`Pasarela ${i}`, `pasarela_${i}_nombre`)}
            {campo(`Enlace ${i}`, `pasarela_${i}_url`)}
          </div>
        ))}

        <button type="submit" disabled={guardando} className="btn-principal">
          {guardando ? '⏳ Guardando...' : 'GUARDAR TODOS LOS CAMBIOS'}
        </button>
      </form>
    </div>
  )
}
