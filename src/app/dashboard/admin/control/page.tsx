'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import TablaSuscripciones from '@/components/TablaSuscripciones'

export default function ControlSaaSPage() {
  const [usuarios, setUsuarios] = useState<{ id: string; nombre: string }[]>([])

  useEffect(() => {
    createClient()
      .from('usuarios')
      .select('id, email')
      .order('email')
      .then(({ data }) => setUsuarios((data ?? []).map((u) => ({ id: u.id, nombre: u.email ?? u.id }))))
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
          columnaPersona: 'Correo Usuario',
          placeholderNombre: 'Plan / Servicio...',
          opcionVacia: '-- Correo Usuario --',
          subtitulo: '📊 Gestión de Alumnos y Membresías (SaaS)',
          textoBotonCobro: '🚀 Ejecutar Cobro SaaS',
        }}
      />
    </div>
  )
}
