'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { aviso, confirmar, elegirCanalCompartir, error, exito, toast } from '@/lib/alertas'
import { enlaceSeguro } from '@/lib/urls'
import {
  abrirWhatsApp, compartirNativo, copiarAlPortapapeles, imagenQrADataUrl,
  MAX_DATOS, MAX_ENLACE, MAX_METODOS, MAX_NOMBRE, textoDatos, textoMetodo, textoMetodos,
} from '@/lib/metodosPago'
import type { MetodoCompartible } from '@/lib/metodosPago'

/**
 * Lista de métodos de pago de Mi Perfil (tabla metodos_pago).
 *
 * Los cambios (agregar, editar, eliminar) se hacen en pantalla y solo se
 * guardan al pulsar «Guardar métodos de pago». Los nombres alimentan el
 * desplegable «Método de Pago» de Proyectos y Finanzas, Cursos y
 * Suscripciones y Control Suscripciones Admin (hook useMetodosPago).
 */

interface Borrador {
  id: string
  nombre: string
  datos: string
  enlace: string
  qr: string | null
}

const nuevoId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
        (Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))).toString(16)
      )

const vacio = (): Borrador => ({ id: nuevoId(), nombre: '', datos: '', enlace: '', qr: null })
const estaVacio = (b: Borrador) => !b.nombre.trim() && !b.datos.trim() && !b.enlace.trim() && !b.qr
const clave = (b: Borrador) => b.nombre.trim().toLowerCase()

/** Lo que cuenta como contenido: sin tarjetas totalmente vacías y sin espacios sobrantes. */
const normalizar = (lista: Borrador[]) =>
  lista.filter((b) => !estaVacio(b)).map((b) => ({
    id: b.id, nombre: b.nombre.trim(), datos: b.datos.trim(), enlace: b.enlace.trim(), qr: b.qr,
  }))

const aCompartible = (b: Borrador): MetodoCompartible => ({
  nombre: b.nombre, datos: b.datos, enlace: b.enlace.trim() || null, qr: b.qr,
})

const claseEntrada =
  'w-full rounded-lg border border-[#3b3f99]/70 bg-[#0d0f2e] px-3 py-2.5 text-center text-sm text-white placeholder-slate-500 outline-none focus:border-sky-400'
const claseEtiqueta = 'mb-1 block text-center text-xs text-slate-300'
const claseBoton =
  'cursor-pointer rounded-lg px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50'

export default function MetodosPagoEditor() {
  const [lista, setLista] = useState<Borrador[]>([])
  const [guardados, setGuardados] = useState<ReturnType<typeof normalizar>>([])
  const [cargado, setCargado] = useState(false)
  const [falloCarga, setFalloCarga] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  // Ids de las tarjetas desplegadas; por defecto todas van plegadas para que la lista sea corta.
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set())

  useEffect(() => {
    let activo = true
    createClient()
      .from('metodos_pago')
      .select('id, nombre, datos, enlace, qr')
      .order('orden')
      .order('created_at')
      .then(({ data, error: err }) => {
        if (!activo) return
        if (err) {
          setFalloCarga(err.message)
          return
        }
        const filas: Borrador[] = (data ?? []).map((f) => ({
          id: String(f.id),
          nombre: String(f.nombre ?? ''),
          datos: String(f.datos ?? ''),
          enlace: String(f.enlace ?? ''),
          qr: f.qr ? String(f.qr) : null,
        }))
        setGuardados(normalizar(filas))
        const inicial = filas.length ? filas : [vacio()]
        setLista(inicial)
        // Sin métodos guardados se muestra la tarjeta vacía ya desplegada para empezar a escribir.
        if (!filas.length) setAbiertos(new Set([inicial[0].id]))
        setCargado(true)
      })
    return () => {
      activo = false
    }
  }, [])

  const hayCambios = useMemo(
    () => JSON.stringify(normalizar(lista)) !== JSON.stringify(guardados),
    [lista, guardados]
  )

  // Avisa si se intenta cerrar o recargar la pestaña con cambios sin guardar.
  useEffect(() => {
    if (!hayCambios) return
    const alSalir = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', alSalir)
    return () => window.removeEventListener('beforeunload', alSalir)
  }, [hayCambios])

  function cambiar(id: string, campo: 'nombre' | 'datos' | 'enlace', valor: string) {
    setLista((prev) => prev.map((b) => (b.id === id ? { ...b, [campo]: valor } : b)))
  }

  function alternar(id: string) {
    setAbiertos((prev) => {
      const siguiente = new Set(prev)
      if (!siguiente.delete(id)) siguiente.add(id)
      return siguiente
    })
  }

  function agregar() {
    if (lista.length >= MAX_METODOS) return aviso(`Puedes tener hasta ${MAX_METODOS} métodos de pago.`)
    const nuevo = vacio()
    setLista((prev) => [...prev, nuevo])
    setAbiertos((prev) => new Set(prev).add(nuevo.id)) // el método nuevo se abre solo
  }

  async function eliminar(b: Borrador) {
    if (!estaVacio(b)) {
      const ok = await confirmar(
        '¿Eliminar este método?',
        'Se quitará de la lista cuando guardes los cambios. Los cobros que ya lo usan conservan su método.',
        'Sí, eliminar'
      )
      if (!ok) return
    }
    setLista((prev) => prev.filter((x) => x.id !== b.id))
  }

  async function subirQr(id: string, archivo: File | undefined) {
    if (!archivo) return
    try {
      const qr = await imagenQrADataUrl(archivo)
      setLista((prev) => prev.map((b) => (b.id === id ? { ...b, qr } : b)))
    } catch (e) {
      error(e instanceof Error ? e.message : 'No se pudo cargar la imagen.')
    }
  }

  function quitarQr(id: string) {
    setLista((prev) => prev.map((b) => (b.id === id ? { ...b, qr: null } : b)))
  }

  async function copiar(texto: string) {
    if (await copiarAlPortapapeles(texto)) toast('¡Copiado!')
    else error('No se pudo copiar. Selecciona el texto y cópialo a mano.')
  }

  async function enviar(texto: string, elementos: MetodoCompartible[], titulo: string) {
    const resultado = await compartirNativo(texto, elementos, titulo)
    if (resultado !== 'sin-soporte') return
    const canal = await elegirCanalCompartir()
    if (canal === 'whatsapp') abrirWhatsApp(texto)
    else if (canal === 'copiar') await copiar(texto)
  }

  async function compartir(b: Borrador) {
    if (!b.nombre.trim() && !b.datos.trim()) return aviso('Escribe el nombre y los datos del método antes de compartirlo.')
    return enviar(textoMetodo(aCompartible(b)), [aCompartible(b)], b.nombre.trim() || 'Método de pago')
  }

  async function copiarDatos(b: Borrador) {
    const texto = textoDatos(aCompartible(b))
    if (!texto) return aviso('Este método todavía no tiene datos para copiar.')
    return copiar(texto)
  }

  async function compartirTodos() {
    const conContenido = lista.filter((b) => b.nombre.trim() || b.datos.trim())
    if (!conContenido.length) return aviso('Agrega al menos un método de pago para compartirlo.')
    const elementos = conContenido.map(aCompartible)
    return enviar(textoMetodos(elementos), elementos, 'Mis métodos de pago')
  }

  async function guardar() {
    const filas = normalizar(lista)

    for (let i = 0; i < filas.length; i++) {
      const f = filas[i]
      const n = i + 1
      if (!f.nombre) return error(`El método ${n} tiene datos pero no tiene nombre. Escríbelo o elimínalo.`)
      if (f.nombre.length > MAX_NOMBRE) return error(`El nombre del método ${n} es muy largo (máximo ${MAX_NOMBRE} caracteres).`)
      if (f.datos.length > MAX_DATOS) return error(`Los datos del método ${n} son muy largos (máximo ${MAX_DATOS} caracteres).`)
      if (f.enlace && (f.enlace.length > MAX_ENLACE || !enlaceSeguro(f.enlace))) {
        return error(`El enlace de pago del método ${n} no es válido. Debe empezar con https://`)
      }
    }
    const vistos = new Set<string>()
    for (const f of filas) {
      const k = f.nombre.toLowerCase()
      if (vistos.has(k)) return error(`Tienes dos métodos llamados «${f.nombre}». Cada nombre debe ser distinto.`)
      vistos.add(k)
    }

    setGuardando(true)
    const supabase = createClient()

    const idsNuevos = new Set(filas.map((f) => f.id))
    const quitados = guardados.filter((g) => !idsNuevos.has(g.id)).map((g) => g.id)
    if (quitados.length) {
      const { error: errBorrar } = await supabase.from('metodos_pago').delete().in('id', quitados)
      if (errBorrar) {
        setGuardando(false)
        return error(errBorrar.message)
      }
    }

    if (filas.length) {
      const ahora = new Date().toISOString()
      const { error: errGuardar } = await supabase.from('metodos_pago').upsert(
        filas.map((f, i) => ({
          id: f.id, nombre: f.nombre, datos: f.datos, enlace: f.enlace || null, qr: f.qr, orden: i, updated_at: ahora,
        }))
      )
      if (errGuardar) {
        setGuardando(false)
        return error(
          errGuardar.code === '23505'
            ? 'Hay dos métodos con el mismo nombre. Cambia uno e inténtalo de nuevo.'
            : errGuardar.message
        )
      }
    }

    // Si se renombró un método, los cobros que ya lo usaban pasan a llamarse igual.
    // (Se omite si hay un intercambio de nombres entre dos métodos: sería ambiguo.)
    const renombrados = filas
      .map((f) => ({ nuevo: f.nombre, viejo: guardados.find((g) => g.id === f.id)?.nombre }))
      .filter((r): r is { nuevo: string; viejo: string } => !!r.viejo && r.viejo !== r.nuevo)
    const viejos = new Set(renombrados.map((r) => r.viejo))
    let fallosRenombre = 0
    for (const r of renombrados.filter((x) => !viejos.has(x.nuevo))) {
      for (const tabla of ['proyectos', 'cursos', 'control_saas']) {
        const { error: errRenombre } = await supabase.from(tabla).update({ metodo_pago: r.nuevo }).eq('metodo_pago', r.viejo)
        if (errRenombre) fallosRenombre++
      }
    }

    // Se vuelve a leer lo guardado para que pantalla y base de datos coincidan.
    const { data } = await supabase
      .from('metodos_pago')
      .select('id, nombre, datos, enlace, qr')
      .order('orden')
      .order('created_at')
    setGuardando(false)
    if (data) {
      const guardadosAhora: Borrador[] = data.map((f) => ({
        id: String(f.id), nombre: String(f.nombre ?? ''), datos: String(f.datos ?? ''),
        enlace: String(f.enlace ?? ''), qr: f.qr ? String(f.qr) : null,
      }))
      setGuardados(normalizar(guardadosAhora))
      const tras = guardadosAhora.length ? guardadosAhora : [vacio()]
      setLista(tras)
      if (!guardadosAhora.length) setAbiertos(new Set([tras[0].id]))
    }

    if (fallosRenombre) {
      aviso('Los métodos se guardaron, pero no se pudo actualizar el nombre en algunos cobros existentes.', 'Guardado con avisos')
    } else {
      exito('Métodos de pago guardados', '¡Éxito!')
    }
  }

  if (falloCarga) {
    return (
      <div className="mx-auto mt-6 max-w-[950px] rounded-2xl bg-[#0b1224] p-6 text-center text-sm text-red-300">
        No se pudieron cargar tus métodos de pago: {falloCarga}
        <div className="mt-2 text-xs text-slate-400">
          Si acabas de actualizar la aplicación, aplica la migración 20261016000000_metodos_pago_lista.sql en Supabase.
        </div>
      </div>
    )
  }

  return (
    <section className="mx-auto mt-6 max-w-[950px] rounded-2xl bg-[#0b1224] p-5 max-md:p-3">
      <div className="mb-5 text-center">
        <h2 className="text-lg font-extrabold text-white">💳 Métodos de pago</h2>
        <p className="mt-1 text-xs text-slate-400">Guarda tus datos de cobro y compártelos con tus clientes</p>
        <p className="mx-auto mt-1 max-w-[640px] text-[11px] text-slate-500">
          Los nombres aparecen en el menú «Método de Pago» de Proyectos y Finanzas, Cursos y Suscripciones y Control
          Suscripciones Admin. Si no guardas ninguno se usa una lista por defecto.
        </p>
        <div className="mx-auto mt-3 h-[3px] w-[85%] rounded bg-sky-400" />
      </div>

      {!cargado ? (
        <div className="py-10 text-center text-sm text-slate-400">Cargando métodos de pago...</div>
      ) : (
        <>
          {lista.length === 0 && (
            <div className="mb-4 rounded-2xl border border-dashed border-[#3b3f99]/70 py-8 text-center text-sm text-slate-400">
              No tienes métodos de pago. Pulsa «Agregar método de pago».
            </div>
          )}

          {lista.map((b, i) => {
            const abierto = abiertos.has(b.id)
            return (
            <div key={b.id}
              className="mb-4 rounded-2xl border border-[#312e81] bg-gradient-to-b from-[#1e2050] to-[#141636] p-5 max-md:p-3">
              <div className={`flex items-center justify-between gap-2 ${abierto ? 'mb-3' : ''}`}>
                <button type="button" onClick={() => alternar(b.id)} aria-expanded={abierto}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left">
                  <span className="text-xs text-indigo-400">{abierto ? '▼' : '▶'}</span>
                  <span className="shrink-0 text-sm font-extrabold uppercase tracking-wide text-indigo-400">Método {i + 1}</span>
                  {b.nombre.trim() && <span className="truncate text-sm font-semibold text-white">· {b.nombre.trim()}</span>}
                  {b.qr && <span title="Tiene código QR" className="shrink-0 text-xs">🔳</span>}
                </button>
                <button type="button" onClick={() => eliminar(b)}
                  className="shrink-0 cursor-pointer rounded-md bg-[#dc2626] px-3 py-1.5 text-xs font-bold text-white hover:opacity-85">
                  🗑️ Eliminar
                </button>
              </div>

              {abierto && (
              <>
              <label className={claseEtiqueta} htmlFor={`mp-nombre-${b.id}`}>Nombre del método</label>
              <input id={`mp-nombre-${b.id}`} type="text" value={b.nombre} maxLength={MAX_NOMBRE}
                onChange={(e) => cambiar(b.id, 'nombre', e.target.value)}
                placeholder="Ej: Pago móvil, Zelle, Binance Pay..." className={`${claseEntrada} mb-3`} />

              <label className={claseEtiqueta} htmlFor={`mp-datos-${b.id}`}>Datos para pagar (cuenta, banco, teléfono, cédula...)</label>
              <textarea id={`mp-datos-${b.id}`} value={b.datos} maxLength={MAX_DATOS} rows={3}
                onChange={(e) => cambiar(b.id, 'datos', e.target.value)}
                className={`${claseEntrada} mb-3 resize-y`} />

              <label className={claseEtiqueta} htmlFor={`mp-enlace-${b.id}`}>Enlace de pago (opcional)</label>
              <input id={`mp-enlace-${b.id}`} type="text" inputMode="url" value={b.enlace} maxLength={MAX_ENLACE}
                onChange={(e) => cambiar(b.id, 'enlace', e.target.value)}
                placeholder="https://..." className={`${claseEntrada} mb-3`} />

              <span className={claseEtiqueta}>Código QR (opcional)</span>
              <div className="mb-4 flex items-center justify-center gap-4">
                <div className="flex h-[130px] w-[130px] shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-[#3b3f99] bg-[#0d0f2e] text-xs text-slate-500">
                  {b.qr ? (
                    // eslint-disable-next-line @next/next/no-img-element -- imagen en data URL, no admite next/image
                    <img src={b.qr} alt={`QR de ${b.nombre || 'método de pago'}`} className="h-full w-full object-contain bg-white" />
                  ) : (
                    'Sin QR'
                  )}
                </div>
                <div className="flex flex-col items-start gap-2">
                  <label className="cursor-pointer rounded-lg bg-[#4f46e5] px-4 py-2.5 text-xs font-bold text-white hover:opacity-85">
                    📷 Subir QR
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => {
                        const archivo = e.target.files?.[0]
                        e.target.value = '' // permite volver a elegir la misma imagen
                        subirQr(b.id, archivo)
                      }} />
                  </label>
                  {b.qr && (
                    <button type="button" onClick={() => quitarQr(b.id)}
                      className="cursor-pointer text-xs text-slate-400 underline hover:text-white">
                      Quitar QR
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                <button type="button" onClick={() => compartir(b)} className={`${claseBoton} bg-[#16a34a]`}>📤 Compartir</button>
                <button type="button" onClick={() => copiarDatos(b)} className={`${claseBoton} bg-[#334155]`}>📋 Copiar datos</button>
              </div>
              </>
              )}
            </div>
            )
          })}

          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <button type="button" onClick={agregar} className={`${claseBoton} bg-[#4f46e5] py-3.5`}>➕ Agregar método de pago</button>
            <button type="button" onClick={compartirTodos} className={`${claseBoton} bg-[#334155] py-3.5`}>📤 Compartir todos mis métodos</button>
          </div>

          <div className="mt-5 rounded-xl border border-green-700/70 bg-[#0c1a16] p-3">
            <button type="button" onClick={guardar} disabled={guardando || !hayCambios}
              className={`${claseBoton} w-full bg-[#4f46e5] py-3.5`}>
              {guardando
                ? '⏳ Guardando...'
                : hayCambios
                  ? '💾 Guardar métodos de pago (hay cambios sin guardar)'
                  : '💾 Guardar métodos de pago'}
            </button>
          </div>
          <p className="mt-3 text-center text-[11px] text-slate-400">
            Los cambios no se guardan hasta que pulses «Guardar métodos de pago». Solo tú ves esta lista.
          </p>
        </>
      )}
    </section>
  )
}
