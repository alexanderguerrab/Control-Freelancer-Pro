'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { error, exito } from '@/lib/alertas'
import MetodosPagoEditor from '@/components/MetodosPagoEditor'
import type { Perfil } from '@/lib/types'

type CampoPerfil = Exclude<keyof Perfil, 'owner_id'>

const PERFIL_VACIO: Perfil = {
  nombre: '', marca: '', especialidad: '', logo_url: '',
  moneda: 'USD', meta_mensual: 0, codigo_pais_whatsapp: '',
  red_social_1_nombre: '', red_social_1_url: '',
  red_social_2_nombre: '', red_social_2_url: '',
  red_social_3_nombre: '', red_social_3_url: '',
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
    // La moneda es un código ISO de 3 letras (USD, EUR, COP…); si no lo es se usa USD.
    const moneda = (form.moneda ?? '').trim().toUpperCase()
    // Código de país de WhatsApp: solo dígitos (1 a 4); vacío se guarda como null.
    const codigoPais = (form.codigo_pais_whatsapp ?? '').replace(/\D/g, '')
    if (codigoPais.length > 4) {
      setGuardando(false)
      return error('El código de país de WhatsApp debe tener de 1 a 4 dígitos (ej. 58, 57, 52, 1).')
    }
    const { error: err } = await supabase
      .from('perfil')
      .upsert({ ...form, moneda: /^[A-Z]{3}$/.test(moneda) ? moneda : 'USD', codigo_pais_whatsapp: codigoPais || null, owner_id: user?.id, updated_at: new Date().toISOString() })
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
          {campo('Moneda (código: USD, EUR, COP…)', 'moneda')}
          {campo('Meta Mensual', 'meta_mensual', 'number')}
          {campo('Código de país para WhatsApp (ej. 58, 57, 52, 1)', 'codigo_pais_whatsapp')}
        </div>
        <p className="text-center mb-4 text-xs">
          El código de país completa los teléfonos de tus clientes que estén escritos en formato local
          (por ejemplo, <b>0412-1234567</b> con código <b>58</b> se envía a <b>+58 412 1234567</b>) al usar el botón 💬 WhatsApp.
        </p>

        <div className="banda bg-[#ffd700]">CONTACTO Y REDES</div>
        {([1, 2, 3] as const).map((i) => (
          <div key={i} className="grid grid-cols-2 gap-4 max-md:grid-cols-1 max-md:gap-0">
            {campo(`Red Social ${i}`, `red_social_${i}_nombre`)}
            {campo(`Enlace ${i}`, `red_social_${i}_url`)}
          </div>
        ))}

        <button type="submit" disabled={guardando} className="btn-principal">
          {guardando ? '⏳ Guardando...' : 'GUARDAR TODOS LOS CAMBIOS'}
        </button>
      </form>

      {/* Fuera del formulario: tiene su propio botón de guardar. */}
      <MetodosPagoEditor />
    </div>
  )
}
