'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import TablaSuscripciones from '@/components/TablaSuscripciones'

export default function ControlSaaSPage() {
  const [usuarios, setUsuarios] = useState<{ id: string; nombre: string; telefono: string | null }[]>([])

  useEffect(() => {
    createClient()
      .from('usuarios')
      .select('id, cliente, email, telefono')
      .then(({ data }) =>
        setUsuarios(
          (data ?? [])
            // Se muestra el nombre del cliente; si aún no tiene, el correo para no dejarlo en blanco.
            .map((u) => ({ id: u.id, nombre: u.cliente?.trim() || u.email || u.id, telefono: u.telefono as string | null }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
        )
      )
  }, [])

  return (
    <div>
      <h1 className="titulo-seccion">🛠️ Control Suscripciones Admin</h1>
      <TablaSuscripciones
        personas={usuarios}
        config={{
          tabla: 'control_saas',
          tipoCobro: 'saas',
          campoNombre: 'plan',
          campoPersona: 'usuario_id',
          columnaNombre: 'Plan / Servicio',
          columnaPersona: 'Cliente',
          placeholderNombre: 'Plan / Servicio...',
          opcionVacia: '-- Cliente --',
          subtitulo: '📊 Gestión de Alumnos y Membresías (SaaS)',
          textoBotonCobro: '🚀 Ejecutar Cobro SaaS',
        }}
      />
    </div>
  )
}
