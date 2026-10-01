export type Rol = 'Cliente' | 'Administrador'
export type EstadoUsuario = 'Pendiente' | 'Autorizado' | 'Bloqueado'
export type PlanSaaS = 'Mensual' | 'Anual'
export type EstadoProceso = 'En Proceso' | 'Terminado' | 'Pausado'

export interface Usuario {
  id: string
  email: string | null
  telefono: string | null
  rol: Rol
  estado: EstadoUsuario
  fecha_registro: string
}

export interface Perfil {
  owner_id?: string
  nombre: string | null
  marca: string | null
  especialidad: string | null
  logo_url: string | null
  moneda: string | null
  meta_mensual: number
  red_social_1_nombre: string | null
  red_social_1_url: string | null
  red_social_2_nombre: string | null
  red_social_2_url: string | null
  red_social_3_nombre: string | null
  red_social_3_url: string | null
  pasarela_1_nombre: string | null
  pasarela_1_url: string | null
  pasarela_2_nombre: string | null
  pasarela_2_url: string | null
  pasarela_3_nombre: string | null
  pasarela_3_url: string | null
  pasarela_4_nombre: string | null
  pasarela_4_url: string | null
  pasarela_5_nombre: string | null
  pasarela_5_url: string | null
  pasarela_6_nombre: string | null
  pasarela_6_url: string | null
}

export interface Cliente {
  id: string
  nombre: string
  email: string | null
  telefono: string | null
  dni: string | null
  pais: string | null
  fecha_registro: string | null
  drive_link: string | null
  notas: string | null
}

/** Campos comunes a todo registro que genera cobros con recordatorios. */
export interface RegistroCobrable {
  id: string
  monto: number
  cobrado: boolean
  fecha_pago: string | null
  aviso_hoy_enviado_at: string | null
  aviso_7d_enviado_at: string | null
  aviso_15d_enviado_at: string | null
  comprobante_url: string | null
}

export interface Proyecto extends RegistroCobrable {
  cliente_id: string | null
  nombre: string
  fecha_recepcion: string | null
  fecha_entrega: string | null
  estado_proceso: EstadoProceso | null
}

export interface Curso extends RegistroCobrable {
  cliente_id: string | null
  nombre: string
  fecha_suscripcion: string | null
  metodo_pago: string | null
}

export interface ControlSaaS extends RegistroCobrable {
  usuario_id: string | null
  plan: string
  fecha_suscripcion: string | null
  metodo_pago: string | null
}

export interface ScriptsCobro {
  plantilla_hoy: string
  plantilla_7d: string
  plantilla_15d: string
}

export interface SuscripcionSaaS {
  usuario_id: string
  plan: PlanSaaS
  proximo_pago: string | null
  estado: string
}

export interface PagoSaaS {
  id: string
  usuario_id: string
  fecha_pago: string
  fecha_suscripcion: string | null
  periodo: string | null
  plan: PlanSaaS
  metodo: string | null
  monto: number
  recibo_url: string | null
}

/** Plan y próximo pago de un cliente del freelancer (tabla suscripciones_clientes). */
export interface SuscripcionCliente {
  cliente_id: string
  plan: PlanSaaS
  proximo_pago: string | null
  estado: string
}

/** Pago que el freelancer registró de uno de sus clientes (tabla pagos_clientes). */
export interface PagoCliente {
  id: string
  cliente_id: string
  fecha_pago: string
  fecha_suscripcion: string | null
  periodo: string | null
  plan: PlanSaaS
  metodo: string | null
  monto: number
  recibo_url: string | null
}
