import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cifrar, limpiarPassword, mensajeError, transporteGmail } from '@/lib/correo'

/**
 * Gmail propio para enviar los cobros. La contraseña de aplicación solo
 * viaja hacia el servidor: se prueba contra Gmail, se cifra y se guarda.
 * Nunca se devuelve al navegador.
 */

// Gmail puede tardar en responder tras varios intentos fallidos.
export const maxDuration = 60

const json = (cuerpo: object, status = 200) => NextResponse.json(cuerpo, { status })

async function sesion() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

/** Dirección conectada, o null si se usa el correo del sistema. */
export async function GET() {
  const { supabase, user } = await sesion()
  if (!user) return json({ error: 'Sesión no válida.' }, 401)
  const { data } = await supabase.from('correo_envio').select('email').maybeSingle()
  return json({ email: data?.email ?? null })
}

export async function POST(request: Request) {
  const { supabase, user } = await sesion()
  if (!user) return json({ error: 'Sesión no válida.' }, 401)

  const body = await request.json().catch(() => null)
  const email = String(body?.email ?? '').trim().toLowerCase()
  const password = limpiarPassword(String(body?.password ?? ''))
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !password) {
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

  const { error } = await supabase
    .from('correo_envio')
    .upsert({ owner_id: user.id, email, password_cifrada, updated_at: new Date().toISOString() })
  if (error) return json({ error: error.message }, 500)
  return json({ email })
}

export async function DELETE() {
  const { supabase, user } = await sesion()
  if (!user) return json({ error: 'Sesión no válida.' }, 401)
  const { error } = await supabase.from('correo_envio').delete().eq('owner_id', user.id)
  if (error) return json({ error: error.message }, 500)
  return json({ email: null })
}
