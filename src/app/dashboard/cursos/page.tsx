'use client'

import TablaSuscripciones from '@/components/TablaSuscripciones'
import { useOpcionesClientes } from '@/lib/useTabla'

export default function CursosPage() {
  const clientes = useOpcionesClientes()

  return (
    <div>
      <h1 className="titulo-seccion">🎓 Cursos y Suscripciones</h1>
      <TablaSuscripciones
        personas={clientes}
        config={{
          tabla: 'cursos',
          tipoCobro: 'cursos',
          campoNombre: 'nombre',
          campoPersona: 'cliente_id',
          columnaNombre: 'Curso / Servicio',
          columnaPersona: 'Cliente',
          placeholderNombre: 'Nombre del Curso/Servicio...',
          opcionVacia: '-- Cliente --',
          subtitulo: '📊 Gestión de Alumnos y Membresías',
          textoBotonCobro: '🚀 Ejecutar Cobro',
        }}
      />
    </div>
  )
}
