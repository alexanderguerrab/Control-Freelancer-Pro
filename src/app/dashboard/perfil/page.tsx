'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function PerfilPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nombre: '', marca: '', especialidad: '', logo_url: '',
    moneda: 'USD', meta_mensual: 0,
    red_social_1_nombre: '', red_social_1_url: '',
    red_social_2_nombre: '', red_social_2_url: '',
    red_social_3_nombre: '', red_social_3_url: '',
    pasarela_1_nombre: '', pasarela_1_url: '',
    pasarela_2_nombre: '', pasarela_2_url: '',
    pasarela_3_nombre: '', pasarela_3_url: '',
  })
  const [perfilId, setPerfilId] = useState<string | null>(null)

  useEffect(() => { cargarPerfil() }, [])

  async function cargarPerfil() {
    const { data } = await supabase.from('perfil_admin').select('*').limit(1).single()
    if (data) {
      setPerfilId(data.id)
      setForm({
        nombre: data.nombre || '', marca: data.marca || '',
        especialidad: data.especialidad || '', logo_url: data.logo_url || '',
        moneda: data.moneda || 'USD', meta_mensual: data.meta_mensual || 0,
        red_social_1_nombre: data.red_social_1_nombre || '', red_social_1_url: data.red_social_1_url || '',
        red_social_2_nombre: data.red_social_2_nombre || '', red_social_2_url: data.red_social_2_url || '',
        red_social_3_nombre: data.red_social_3_nombre || '', red_social_3_url: data.red_social_3_url || '',
        pasarela_1_nombre: data.pasarela_1_nombre || '', pasarela_1_url: data.pasarela_1_url || '',
        pasarela_2_nombre: data.pasarela_2_nombre || '', pasarela_2_url: data.pasarela_2_url || '',
        pasarela_3_nombre: data.pasarela_3_nombre || '', pasarela_3_url: data.pasarela_3_url || '',
      })
    }
  }

  function handleChange(field: string, value: string | number) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function guardarPerfil(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    if (perfilId) {
      const { error } = await supabase.from('perfil_admin').update(form).eq('id', perfilId)
      if (error) alert('❌ Error: ' + error.message)
      else alert('✅ Perfil actualizado correctamente')
    } else {
      const { error } = await supabase.from('perfil_admin').insert([form])
      if (error) alert('❌ Error: ' + error.message)
      else { alert('✅ Perfil creado correctamente'); cargarPerfil() }
    }
    setLoading(false)
  }

  const InputField = ({ label, field, type = 'text' }: { label: string; field: string; type?: string }) => (
    <div>
      <label className="block text-[0.75em] font-bold text-gray-500 uppercase text-center mb-0.5">{label}</label>
      <input type={type} value={(form as Record<string, string | number>)[field]}
        onChange={e => handleChange(field, type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
        className="w-full p-2.5 border border-gray-200 rounded-md text-center text-primary" />
    </div>
  )

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-center text-primary mb-6">🚀 Configuración de Perfil</h1>

      <div className="bg-white p-6 rounded-xl shadow-md max-w-[950px] mx-auto">
        <form onSubmit={guardarPerfil}>
          <div className="bg-accent-cyan p-1.5 text-center font-bold mb-3 text-sm">DATOS DE IDENTIDAD</div>
          <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <InputField label="Nombre" field="nombre" />
            <InputField label="Marca" field="marca" />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-3 max-md:grid-cols-1">
            <InputField label="Especialidad" field="especialidad" />
            <InputField label="URL Logo (Drive)" field="logo_url" />
          </div>

          <div className="bg-cyan-100 p-1.5 text-center font-bold mb-3 mt-4 text-sm">CONFIGURACIÓN NEGOCIO</div>
          <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <InputField label="Moneda" field="moneda" />
            <InputField label="Meta Mensual" field="meta_mensual" type="number" />
          </div>

          <div className="bg-yellow-300 p-1.5 text-center font-bold mb-3 mt-4 text-sm">CONTACTO Y REDES</div>
          {[1, 2, 3].map(i => (
            <div key={i} className="grid grid-cols-2 gap-4 mt-2 max-md:grid-cols-1">
              <InputField label={`Red Social ${i}`} field={`red_social_${i}_nombre`} />
              <InputField label={`Enlace ${i}`} field={`red_social_${i}_url`} />
            </div>
          ))}

          <div className="bg-green-200 p-1.5 text-center font-bold mb-3 mt-4 text-sm">PASARELAS DE PAGO</div>
          {[1, 2, 3].map(i => (
            <div key={i} className="grid grid-cols-2 gap-4 mt-2 max-md:grid-cols-1">
              <InputField label={`Pasarela ${i}`} field={`pasarela_${i}_nombre`} />
              <InputField label={`Enlace ${i}`} field={`pasarela_${i}_url`} />
            </div>
          ))}

          <button type="submit" disabled={loading}
            className="w-full bg-success text-white font-bold py-4 rounded-lg text-[1.1em] mt-4 hover:bg-success/80 transition-colors cursor-pointer disabled:opacity-50">
            {loading ? '⏳ Guardando...' : 'GUARDAR TODOS LOS CAMBIOS'}
          </button>
        </form>
      </div>
    </div>
  )
}
