'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useTabla } from '@/lib/useTabla'
import { aviso, confirmar, exito } from '@/lib/alertas'
import { Cargando } from '@/components/ui'
import type { EstadoUsuario, Rol, Usuario } from '@/lib/types'

const ROLES: Rol[] = ['Cliente', 'Administrador']
const ESTADOS: EstadoUsuario[] = ['Pendiente', 'Autorizado', 'Bloqueado']

function FilaUsuario({ u, esYo, onGuardar, onEliminar }: {
  u: Usuario
  esYo: boolean
  onGuardar: (cambios: Pick<Usuario, 'telefono' | 'rol' | 'estado'>) => void
  onEliminar: () => void
}) {
  const [telefono, setTelefono] = useState(u.telefono ?? '')
  const [rol, setRol] = useState(u.rol)
  const [estado, setEstado] = useState(u.estado)

  return (
    <tr>
      <td className="text-[10px]!">{u.id}</td>
      {/* Viene de Registro de Clientes (mismo correo); se sincroniza solo en la base de datos. */}
      <td className="font-semibold">{u.cliente || <span className="text-gray-400 font-normal">Sin registrar</span>}</td>
      <td>{u.email}</td>
      <td><input value={telefono} onChange={(e) => setTelefono(e.target.value)} className="input-tabla w-[120px]" /></td>
      <td>{u.fecha_registro}</td>
      <td>
        <select value={rol} onChange={(e) => setRol(e.target.value as Rol)} className="select-tabla min-w-[130px]!" disabled={esYo}>
          {ROLES.map((r) => <option key={r}>{r}</option>)}
        </select>
      </td>
      <td>
        <select value={estado} onChange={(e) => setEstado(e.target.value as EstadoUsuario)} className="select-tabla min-w-[120px]!" disabled={esYo}>
          {ESTADOS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </td>
      <td>
        <div className="flex gap-1.5 justify-center">
          <button onClick={() => onGuardar({ telefono, rol, estado })} className="btn-icono btn-editar">✏️ Editar</button>
          <button onClick={onEliminar} className="btn-icono btn-eliminar" disabled={esYo}>🗑️ Eliminar</button>
        </div>
      </td>
    </tr>
  )
}

export default function UsuariosSaaSPage() {
  const { filas: usuarios, actualizar, eliminar } = useTabla<Usuario & { id: string }>('usuarios', 'created_at', false)
  const [miId, setMiId] = useState<string | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setMiId(data.user?.id ?? null))
  }, [])

  async function guardar(u: Usuario, cambios: Pick<Usuario, 'telefono' | 'rol' | 'estado'>) {
    if (await actualizar(u.id, cambios)) exito('Usuario actualizado', 'Éxito')
  }

  async function borrar(u: Usuario) {
    if (u.id === miId) return aviso('No puedes eliminar tu propia cuenta de administrador.')
    const ok = await confirmar(
      '¿Estás seguro?',
      'Esta acción eliminará al usuario del panel. Si vuelve a iniciar sesión, quedará como Pendiente.',
      'Sí, eliminar'
    )
    if (ok && (await eliminar(u.id))) exito('Usuario eliminado correctamente', 'Eliminado')
  }

  return (
    <div>
      <h1 className="titulo-seccion">👩‍💻 ADMINISTRACIÓN DE USUARIOS</h1>
      <div className="card-ancha">
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>{['UID', 'CLIENTE', 'CORREO', 'TELÉFONO', 'FECHA REGISTRO', 'ROL', 'ESTATUS', 'ACCIÓN'].map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {!usuarios ? (
                <Cargando columnas={8} texto="Cargando usuarios..." />
              ) : (
                usuarios.map((u) => (
                  <FilaUsuario key={`${u.id}-${u.cliente}-${u.rol}-${u.estado}-${u.telefono}`} u={u} esYo={u.id === miId}
                    onGuardar={(c) => guardar(u, c)} onEliminar={() => borrar(u)} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
