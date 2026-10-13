'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTabla } from '@/lib/useTabla'
import { useMetodosPago } from '@/lib/useMetodosPago'
import { useWhatsApp } from '@/lib/whatsapp'
import { aviso, confirmar, exito, pedirNumero } from '@/lib/alertas'
import { ejecutarCobro } from '@/lib/ejecutarCobro'
import { fechaPagoDeCiclo, hoyISO, siguienteCiclo, TIPOS_SUSCRIPCION, type TipoSuscripcion } from '@/lib/fechas'
import type { TipoCobro } from '@/lib/cobros'
import type { RegistroCobrable } from '@/lib/types'
import { Cargando, CeldasVencimiento, InputFechaTabla, InputMonto, InputTabla, SelectMetodo } from './ui'

/**
 * Tabla de cuotas recurrentes: la usan Cursos y Suscripciones (tabla
 * `cursos`, por cliente) y Control Suscripciones Admin (`control_saas`,
 * por usuario del sistema). Ambas funcionaban igual en el legacy.
 */
interface Suscripcion extends RegistroCobrable {
  tipo_suscripcion: TipoSuscripcion | null
  fecha_suscripcion: string | null
  metodo_pago: string | null
  [campo: string]: unknown
}

export interface ConfigTabla {
  tabla: 'cursos' | 'control_saas'
  tipoCobro: TipoCobro
  campoNombre: 'nombre' | 'plan'
  campoPersona: 'cliente_id' | 'usuario_id'
  columnaNombre: string
  columnaPersona: string
  placeholderNombre: string
  opcionVacia: string
  subtitulo: string
  textoBotonCobro: string
}

const COLUMNAS_FIJAS = ['Tipo de Suscripción', 'Monto', 'Cobrado', 'Método de Pago', 'Fecha de Suscripción', 'Fecha de Pago', 'Vence Hoy', 'Vencido 7 Días', 'Vencido 15 Días', 'Comprobante', 'Acciones']

export default function TablaSuscripciones({ config, personas }: {
  config: ConfigTabla
  personas: { id: string; nombre: string; telefono?: string | null }[]
}) {
  const { filas, cargar, actualizar, insertar, eliminar } = useTabla<Suscripcion>(config.tabla, 'created_at', false)
  const [hoy] = useState(hoyISO)
  const metodos = useMetodosPago()
  const router = useRouter()
  const whatsapp = useWhatsApp()
  const [versionNueva, setVersionNueva] = useState(0)
  // Lo que se va escribiendo en la fila en blanco. El registro se crea cuando
  // ya tiene nombre, así no aparecen filas vacías ni duplicadas por ediciones rápidas.
  const [borrador, setBorrador] = useState<Partial<Suscripcion>>({})
  const creando = useRef(false)
  const columnas = [config.columnaNombre, config.columnaPersona, ...COLUMNAS_FIJAS]

  // Al cambiar la fecha de suscripción o el tipo, la fecha de pago se recalcula:
  // mensual = mismo día del mes siguiente; anual = la misma fecha. Si solo cambia
  // el tipo y la fecha de pago se había ajustado a mano, no se pisa. Al marcar
  // como cobrado sin fecha de pago se usa hoy (legacy).
  function completar(fila: Partial<Suscripcion> | null, cambios: Partial<Suscripcion>) {
    const resultado = { ...cambios }
    const cambiaFecha = 'fecha_suscripcion' in cambios
    const cambiaTipo = 'tipo_suscripcion' in cambios
    if ((cambiaFecha || cambiaTipo) && !('fecha_pago' in cambios)) {
      const inicio = cambiaFecha ? cambios.fecha_suscripcion : fila?.fecha_suscripcion
      const tipoNuevo = cambios.tipo_suscripcion ?? fila?.tipo_suscripcion ?? 'Mensual'
      const tipoAnterior = fila?.tipo_suscripcion ?? 'Mensual'
      const inicioAnterior = fila?.fecha_suscripcion
      const esAutomatica =
        !fila?.fecha_pago || (!!inicioAnterior && fila.fecha_pago === fechaPagoDeCiclo(inicioAnterior, tipoAnterior))
      if (inicio && (cambiaFecha || esAutomatica)) resultado.fecha_pago = fechaPagoDeCiclo(inicio, tipoNuevo)
    }
    if (cambios.cobrado === true && !fila?.fecha_pago && !resultado.fecha_pago) {
      resultado.fecha_pago = hoyISO()
    }
    return resultado
  }

  async function crear(datos: Partial<Suscripcion>) {
    if (creando.current) return
    creando.current = true
    try {
      if (await insertar(datos)) {
        setBorrador({})
        setVersionNueva((v) => v + 1)
      }
    } finally {
      creando.current = false
    }
  }

  function cambioEnFilaNueva(cambios: Partial<Suscripcion>) {
    const unido = { ...borrador, ...completar(borrador, cambios) }
    if (String(unido[config.campoNombre] ?? '').trim()) void crear(unido)
    else setBorrador(unido)
  }

  // Renovar abre un ciclo nuevo: su fecha de suscripción es donde terminó el
  // anterior (la fecha de pago en mensual, un año después en anual) y su
  // fecha de pago sale de ahí.
  async function renovar(fila: Suscripcion, nuevoMonto?: number) {
    const tipo = fila.tipo_suscripcion ?? 'Mensual'
    const ciclo = siguienteCiclo(fila.fecha_suscripcion, fila.fecha_pago, tipo, hoyISO())
    const ok = await insertar({
      [config.campoNombre]: fila[config.campoNombre],
      [config.campoPersona]: fila[config.campoPersona],
      monto: nuevoMonto ?? fila.monto,
      cobrado: false,
      metodo_pago: fila.metodo_pago,
      tipo_suscripcion: tipo,
      ...ciclo,
    })
    if (ok) exito('Se ha generado el nuevo periodo.', '¡Éxito!')
  }

  async function renovarConPrecio(fila: Suscripcion) {
    const monto = await pedirNumero(
      'Nuevo Precio o Ajuste de Suscripción',
      'Ingrese el nuevo precio para generar el renglón del siguiente periodo:',
      'Ej. 25'
    )
    if (monto !== null) await renovar(fila, monto)
  }

  async function borrar(fila: Suscripcion) {
    if (await confirmar('¿Eliminar registro?', 'Esta fila será borrada del sistema.')) await eliminar(fila.id)
  }

  function recordarWhatsApp(fila: Suscripcion) {
    const persona = personas.find((p) => p.id === fila[config.campoPersona])
    if (!persona) return void aviso('Elige primero el cliente de esta fila.')
    whatsapp.enviar({
      nombre: persona.nombre,
      telefono: persona.telefono,
      concepto: String(fila[config.campoNombre] ?? ''),
      registro: fila,
    })
  }

  async function cobrar() {
    if (await ejecutarCobro(config.tipoCobro, router.push)) await cargar()
  }

  function renderFila(fila: Suscripcion, onCambio: (c: Partial<Suscripcion>) => void, acciones: boolean, key: string) {
    return (
      <tr key={key}>
        <td>
          <InputTabla valor={fila[config.campoNombre] as string} placeholder={config.placeholderNombre}
            onGuardar={(v) => onCambio({ [config.campoNombre]: v })} />
        </td>
        <td>
          <select value={(fila[config.campoPersona] as string | null) ?? ''} className="select-tabla"
            onChange={(e) => onCambio({ [config.campoPersona]: e.target.value || null })}>
            <option value="">{config.opcionVacia}</option>
            {personas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </td>
        <td>
          <select value={fila.tipo_suscripcion ?? 'Mensual'} className="select-tabla"
            onChange={(e) => onCambio({ tipo_suscripcion: e.target.value as TipoSuscripcion })}>
            {TIPOS_SUSCRIPCION.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </td>
        <td><InputMonto valor={fila.monto} onGuardar={(v) => onCambio({ monto: v })} /></td>
        <td>
          <input type="checkbox" checked={fila.cobrado} className="w-4 h-4 cursor-pointer"
            onChange={(e) => onCambio({ cobrado: e.target.checked })} />
        </td>
        <td><SelectMetodo valor={fila.metodo_pago} opciones={metodos} onChange={(v) => onCambio({ metodo_pago: v })} /></td>
        <td><InputFechaTabla valor={fila.fecha_suscripcion} onGuardar={(v) => onCambio({ fecha_suscripcion: v })} /></td>
        <td><InputFechaTabla valor={fila.fecha_pago} onGuardar={(v) => onCambio({ fecha_pago: v })} /></td>
        {acciones ? <CeldasVencimiento registro={fila} hoy={hoy} /> : <><td /><td /><td /></>}
        <td>
          <InputTabla valor={fila.comprobante_url} placeholder="URL o Comprobante..."
            onGuardar={(v) => onCambio({ comprobante_url: v })} />
        </td>
        <td>
          {acciones && (
            <div className="flex gap-1.5 justify-center">
              <button onClick={() => recordarWhatsApp(fila)} disabled={fila.cobrado} className="btn-icono btn-whatsapp"
                title={fila.cobrado ? 'Este registro ya está cobrado' : 'Enviar recordatorio por WhatsApp'}>💬 WhatsApp</button>
              <button onClick={() => renovar(fila)} className="btn-icono btn-renovar" title={fila.tipo_suscripcion === 'Anual' ? 'Renovar por un año' : 'Renovar por 30 días (mes siguiente)'}>🔄 Renovar</button>
              <button onClick={() => renovarConPrecio(fila)} className="btn-icono btn-precio" title="Nuevo precio / siguiente periodo">💵 Precio</button>
              <button onClick={() => borrar(fila)} className="btn-icono btn-eliminar" title="Eliminar Registro">🗑️ Borrar</button>
            </div>
          )}
        </td>
      </tr>
    )
  }

  const filaVacia: Suscripcion = {
    id: '', [config.campoNombre]: '', [config.campoPersona]: null, tipo_suscripcion: 'Mensual', monto: 0, cobrado: false, metodo_pago: null,
    fecha_suscripcion: null, fecha_pago: null, comprobante_url: null,
    aviso_hoy_enviado_at: null, aviso_7d_enviado_at: null, aviso_15d_enviado_at: null,
  }

  return (
    <div className="card-ancha">
      <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
        <h3 className="text-primary-light font-semibold">{config.subtitulo}</h3>
        <button onClick={cobrar} className="btn-cobro">{config.textoBotonCobro}</button>
      </div>
      <div className="tabla-contenedor">
        <table className="tabla min-w-[1850px]">
          <thead>
            <tr>{columnas.map((h) => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {!filas ? (
              <Cargando columnas={columnas.length} />
            ) : (
              <>
                {filas.map((f) => renderFila(f, (c) => actualizar(f.id, completar(f, c)), true, f.id))}
                {renderFila({ ...filaVacia, ...borrador }, cambioEnFilaNueva, false, `nuevo-${versionNueva}`)}
              </>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-3 text-center">Escribe en la última fila para agregar un registro nuevo; se crea al ponerle nombre.</p>
    </div>
  )
}
