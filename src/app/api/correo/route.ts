import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cifrar, limpiarPassword, mensajeError, transporteGmail } from '@/lib/correo'
import { permitir } from '@/lib/limite'

/**
 * Gmail propio para enviar los cobros. La contraseña de aplicación solo
 * viaja hacia el servidor: se prueba contra Gmail, se cifra y se guarda.
 * Nunca se devuelve al navegador, y la tabla ya no permite leerla desde
 * el cliente (se guarda y se lee mediante funciones de la base de datos).
 */

// Gmail puede tardar en responder tras varios intentos fallidos.
export const maxDuration = 60

const json = (cuerpo: object, status = 200) => NextResponse.json(cuerpo, { status })

const EMAIL_VALIDO = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

async function sesion() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

/**
 * Dirección conectada, o null si no hay. `sistema` indica que, sin conexión
 * propia, los cobros igual salen por el correo del sistema (solo el admin).
 * `sugerido` es el Gmail de registro del usuario, para rellenar el formulario.
 */
export async function GET() {
  const { supabase, user } = await sesion()
  if (!user) return json({ error: 'Sesión no válida.' }, 401)
  const [{ data }, { data: esAdmin }] = await Promise.all([
    supabase.from('correo_envio').select('email').maybeSingle(),
    supabase.rpc('es_admin'),
  ])
  // Si se registró con un Gmail, se sugiere como remitente para que solo tenga que pegar la contraseña de aplicación.
  const registro = user.email?.trim().toLowerCase() ?? ''
  const sugerido = /@(gmail|googlemail)\.com$/.test(registro) ? registro : null
  return json({ email: data?.email ?? null, sistema: Boolean(esAdmin), sugerido })
}

export async function POST(request: Request) {
  const { supabase, user } = await sesion()
  if (!user) return json({ error: 'Sesión no válida.' }, 401)

  // Cada intento abre una conexión con Gmail: se limita para no quemar la IP del servidor.
  if (!permitir(`correo:${user.id}`, 5)) {
    return json({ error: 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.' }, 429)
  }

  const body = await request.json().catch(() => null)
  const email = String(body?.email ?? '').trim().toLowerCase()
  const password = limpiarPassword(String(body?.password ?? ''))
  if (email.length > 254 || !EMAIL_VALIDO.test(email) || !password || password.length > 100) {
    return json({ error: 'Escribe tu correo de Gmail y la contraseña de aplicación.' }, 400)
  }

  let password_cifrada: string
  try {
    password_cifrada = cifrar(password)
  } catch (e) {
    console.error('No se pudo cifrar la contraseña de correo', e)
    return json({ error: 'El servidor no tiene configurado el cifrado de correos. Avisa al administrador.' }, 500)
  }

  // Se comprueba contra Gmail antes de guardar, para no dejar una clave que no sirve.
  try {
    await transporteGmail(email, password).verify()
  } catch (e) {
    const detalle = mensajeError(e)
    const mensaje = detalle.includes('535')
      ? 'Gmail no aceptó el correo o la contraseña de aplicación. Revisa que la contraseña sea de esa misma cuenta.'
      : `No se pudo conectar con Gmail: ${detalle}`
    return json({ error: mensaje }, 400)
  }

  const { error } = await supabase.rpc('guardar_correo_envio', { p_email: email, p_password_cifrada: password_cifrada })
  if (error) return json({ error: error.message }, 500)
  return json({ email })
}

export async function DELETE() {
  const { supabase, user } = await sesion()
  if (!user) return json({ error: 'Sesión no válida.' }, 401)
  const { error } = await supabase.rpc('borrar_correo_envio')
  if (error) return json({ error: error.message }, 500)
  return json({ email: null })
}
