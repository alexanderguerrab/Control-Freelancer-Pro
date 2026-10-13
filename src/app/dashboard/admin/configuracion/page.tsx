'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { error, exito } from '@/lib/alertas'
import { cargarSoporte, EMAIL_VALIDO, normalizarWhatsappSoporte, urlWhatsapp } from '@/lib/soporte'

/**
 * Contacto de soporte que ven todos los usuarios (menú lateral, login y
 * pantalla de acceso restringido). Antes estaba fijo en el código.
 * Solo el administrador entra aquí (admin/layout.tsx) y RLS lo impone en la
 * base de datos (tabla config_app).
 */
export default function ConfiguracionAdminPage() {
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [cargado, setCargado] = useState(false)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    let activo = true
    cargarSoporte(true).then((s) => {
      if (!activo) return
      setEmail(s.email)
      setWhatsapp(s.whatsapp)
      setCargado(true)
    })
    return () => {
      activo = false
    }
  }, [])

  async function guardar(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    const correo = email.trim().toLowerCase()
    const numero = normalizarWhatsappSoporte(whatsapp)
    if (!EMAIL_VALIDO.test(correo)) return error('Escribe un correo de soporte válido.')
    if (!numero) return error('El WhatsApp debe tener entre 8 y 15 dígitos e incluir el código de país (ej. 584124231008).')

    setGuardando(true)
    const { error: err } = await createClient()
      .from('config_app')
      .upsert({ id: true, soporte_email: correo, soporte_whatsapp: numero, updated_at: new Date().toISOString() })
    setGuardando(false)
    if (err) return error(err.message)

    setEmail(correo)
    setWhatsapp(numero)
    await cargarSoporte(true) // los botones de soporte usan el valor nuevo desde ya
    exito('Los botones de Soporte ya usan estos datos.', '¡Guardado!')
  }

  const numeroValido = normalizarWhatsappSoporte(whatsapp)

  return (
    <div>
      <h1 className="titulo-seccion">⚙️ Configuración Admin</h1>

      <form onSubmit={guardar} className="card">
        <div className="banda bg-accent-cyan">CONTACTO DE SOPORTE</div>
        <p className="text-center mb-5 text-xs">
          Estos datos aparecen en <b>Soporte WhatsApp</b> y <b>Soporte Email</b> (menú lateral, pantalla de login
          y pantalla de acceso restringido). Si cambias de número o de correo, solo actualízalos aquí.
        </p>

        <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1 max-md:gap-0">
          <div>
            <label className="etiqueta">Correo de soporte</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="soporte@tudominio.com" className="campo" disabled={!cargado} required />
          </div>
          <div>
            <label className="etiqueta">WhatsApp de soporte (con código de país)</label>
            <input type="text" inputMode="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="584124231008" className="campo" disabled={!cargado} required />
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 mt-1">
          Puedes escribir el número con espacios, guiones o «+»; se guarda solo con dígitos.{' '}
          {numeroValido && (
            <a href={urlWhatsapp(numeroValido)} target="_blank" rel="noopener noreferrer" className="text-accent underline">
              Probar enlace de WhatsApp
            </a>
          )}
        </p>

        <button type="submit" disabled={!cargado || guardando} className="btn-principal">
          {guardando ? '⏳ Guardando...' : '💾 GUARDAR CONFIGURACIÓN'}
        </button>
      </form>
    </div>
  )
}
