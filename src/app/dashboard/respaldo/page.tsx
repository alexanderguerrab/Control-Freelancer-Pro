'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { error, toast } from '@/lib/alertas'
import { generarRespaldo, leerUltimoRespaldo } from '@/lib/respaldo'
import type { FormatoRespaldo, ModoRespaldo } from '@/lib/respaldo'

const fechaLarga = (iso: string) =>
  new Date(iso).toLocaleString('es', { dateStyle: 'long', timeStyle: 'short' })

const claseBoton =
  'cursor-pointer rounded-lg px-4 py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-85 disabled:cursor-wait disabled:opacity-50'

function BotonesRespaldo({ modo, colorExcel, ocupado, onDescargar }: {
  modo: ModoRespaldo
  colorExcel: string
  ocupado: string | null
  onDescargar: (modo: ModoRespaldo, formato: FormatoRespaldo) => void
}) {
  const boton = (formato: FormatoRespaldo, texto: string, color: string) => {
    const id = `${modo}-${formato}`
    return (
      <button type="button" disabled={ocupado !== null} onClick={() => onDescargar(modo, formato)}
        className={`${claseBoton} ${color}`}>
        {ocupado === id ? '⏳ Generando...' : texto}
      </button>
    )
  }
  return (
    <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
      {boton('xlsx', '📊 Descargar Excel (.xlsx)', colorExcel)}
      {boton('json', '🧾 Respaldo completo (.json)', 'bg-[#334155]')}
    </div>
  )
}

export default function RespaldoPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [esAdmin, setEsAdmin] = useState(false)
  const [ultimo, setUltimo] = useState<Record<ModoRespaldo, string | null>>({ usuario: null, plataforma: null })
  const [ocupado, setOcupado] = useState<string | null>(null)

  useEffect(() => {
    let activo = true
    const supabase = createClient()
    Promise.all([supabase.auth.getUser(), supabase.rpc('es_admin')]).then(([{ data: { user } }, { data: admin }]) => {
      if (!activo || !user) return
      setUserId(user.id)
      setEsAdmin(admin === true)
      setUltimo({ usuario: leerUltimoRespaldo(user.id, 'usuario'), plataforma: leerUltimoRespaldo(user.id, 'plataforma') })
    })
    return () => {
      activo = false
    }
  }, [])

  async function descargar(modo: ModoRespaldo, formato: FormatoRespaldo) {
    setOcupado(`${modo}-${formato}`)
    try {
      const fecha = await generarRespaldo(modo, formato)
      setUltimo((prev) => ({ ...prev, [modo]: fecha }))
      toast('Respaldo descargado')
    } catch (e) {
      error(e instanceof Error ? e.message : 'No se pudo generar el respaldo.')
    } finally {
      setOcupado(null)
    }
  }

  const lineaUltimo = (modo: ModoRespaldo) =>
    ultimo[modo]
      ? `Último respaldo descargado desde este navegador: ${fechaLarga(ultimo[modo]!)}.`
      : 'Todavía no has descargado ningún respaldo desde este navegador.'

  return (
    <div className="mx-auto max-w-[900px] rounded-2xl bg-[#0f172a] p-6 max-md:p-4">
      <h1 className="mb-5 text-2xl font-bold text-white">💾 Respaldo de datos</h1>

      <section className="rounded-xl border border-[#334155] bg-[#1e293b] p-6 max-md:p-4">
        <h2 className="mb-2 text-lg font-bold text-green-400">📥 Mi respaldo</h2>
        <p className="mb-4 text-sm text-slate-400">
          Descarga una copia de todo lo tuyo: perfil, métodos de pago, clientes, proyectos, cursos y suscripciones,
          cobros, plantillas de cobro y tu suscripción. El archivo de Excel es para revisar tus datos; el de respaldo
          completo (JSON) es para guardarlos todos tal cual.
        </p>
        <BotonesRespaldo modo="usuario" colorExcel="bg-[#16a34a]" ocupado={ocupado} onDescargar={descargar} />
        <p className="mt-2 text-xs text-slate-400">{userId ? lineaUltimo('usuario') : ' '}</p>
      </section>

      {esAdmin && (
        <section className="mt-5 rounded-xl border border-orange-500 bg-[#1e293b] p-6 max-md:p-4">
          <h2 className="mb-2 text-lg font-bold text-orange-400">🛡️ Respaldo de la plataforma (administrador)</h2>
          <p className="mb-4 text-sm text-slate-400">
            Incluye usuarios, suscripciones, pagos y control de suscripciones de la plataforma, la configuración de
            soporte, tus métodos de pago y plantillas de cobro, además de tus propios datos. Por privacidad, no incluye
            los clientes, proyectos ni cursos de otros usuarios.
          </p>
          <BotonesRespaldo modo="plataforma" colorExcel="bg-[#4f46e5]" ocupado={ocupado} onDescargar={descargar} />
          {ultimo.plataforma && <p className="mt-2 text-xs text-slate-400">{lineaUltimo('plataforma')}</p>}
        </section>
      )}

      <p className="mt-5 text-xs text-slate-400">
        Recomendación: haz un respaldo cada semana y guárdalo fuera de la aplicación (tu computador o Google Drive).
        Los respaldos no incluyen la contraseña de correo que conectaste para enviar cobros.
      </p>
    </div>
  )
}
