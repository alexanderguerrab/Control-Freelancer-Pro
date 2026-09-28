'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { error, exito } from '@/lib/alertas'
import type { ScriptsCobro } from '@/lib/types'

const PLANTILLAS: { campo: keyof ScriptsCobro; label: string }[] = [
  { campo: 'plantilla_hoy', label: 'Plantilla 1: Recordatorio (Vence Hoy)' },
  { campo: 'plantilla_7d', label: 'Plantilla 2: Recordatorio (Vencido 7 Días)' },
  { campo: 'plantilla_15d', label: 'Plantilla 3: Recordatorio (Vencido 15 Días)' },
]

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<ScriptsCobro | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('scripts_cobro')
      .select('plantilla_hoy, plantilla_7d, plantilla_15d')
      .maybeSingle()
      .then(async ({ data }) => {
        if (data) return setScripts(data)
        // Sin fila todavía: se crea con las plantillas por defecto de la base de datos.
        const { data: nueva } = await supabase
          .from('scripts_cobro')
          .insert({})
          .select('plantilla_hoy, plantilla_7d, plantilla_15d')
          .single()
        setScripts(nueva ?? { plantilla_hoy: '', plantilla_7d: '', plantilla_15d: '' })
      })
  }, [])

  async function guardar(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!scripts) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { error: err } = await supabase
      .from('scripts_cobro')
      .upsert({ ...scripts, owner_id: user?.id, updated_at: new Date().toISOString() })
    if (err) return error(err.message)
    exito('Scripts guardados exitosamente', '¡Éxito!')
  }

  return (
    <div>
      <h1 className="titulo-seccion">✉️ Scripts de Cobro</h1>
      <form onSubmit={guardar} className="card">
        <div className="bg-[#ffeb3b] text-black text-center font-bold p-2.5 rounded-md mb-2.5">CONFIGURACIÓN DE MENSAJES</div>
        <p className="text-center mb-5 text-xs">
          Variables permitidas: <b>[Nombre]</b>, <b>[Proyecto]</b> (También se usa para el Curso), <b>[Monto]</b>
        </p>
        {PLANTILLAS.map(({ campo, label }) => (
          <div key={campo}>
            <label className="etiqueta">{label}</label>
            <textarea rows={5} className="campo" disabled={!scripts} value={scripts?.[campo] ?? ''}
              onChange={(e) => setScripts((s) => (s ? { ...s, [campo]: e.target.value } : s))} />
          </div>
        ))}
        <button type="submit" disabled={!scripts} className="btn-principal">💾 GUARDAR SCRIPTS</button>
      </form>
    </div>
  )
}
