'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

interface Cliente {
  id: string
  dni: string
  nombre: string
  email: string
  telefono: string
  pais: string
  fecha_registro: string
  drive_link: string
  notas: string
}

export default function ClientesPage() {
  const supabase = createClient()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form state
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [dni, setDni] = useState('')
  const [pais, setPais] = useState('')
  const [fechaRegistro, setFechaRegistro] = useState('')
  const [driveLink, setDriveLink] = useState('')
  const [notas, setNotas] = useState('')

  useEffect(() => {
    cargarClientes()
  }, [])

  async function cargarClientes() {
    setLoading(true)
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) setClientes(data)
    setLoading(false)
  }

  function limpiarFormulario() {
    setNombre(''); setEmail(''); setTelefono(''); setDni('');
    setPais(''); setFechaRegistro(''); setDriveLink(''); setNotas('');
    setEditingId(null)
  }

  async function guardarCliente(e: React.FormEvent) {
    e.preventDefault()

    const clienteData = {
      nombre, email, telefono, dni, pais,
      fecha_registro: fechaRegistro || new Date().toISOString().split('T')[0],
      drive_link: driveLink, notas,
    }

    if (editingId) {
      const { error } = await supabase
        .from('clientes')
        .update(clienteData)
        .eq('id', editingId)
      if (error) { alert('❌ Error: ' + error.message); return }
      alert('✅ Cliente actualizado correctamente')
    } else {
      const { error } = await supabase
        .from('clientes')
        .insert([clienteData])
      if (error) { alert('❌ Error: ' + error.message); return }
      alert('✅ Cliente guardado correctamente')
    }

    limpiarFormulario()
    cargarClientes()
  }

  function editarCliente(c: Cliente) {
    setEditingId(c.id)
    setNombre(c.nombre || ''); setEmail(c.email || ''); setTelefono(c.telefono || '');
    setDni(c.dni || ''); setPais(c.pais || ''); setFechaRegistro(c.fecha_registro || '');
    setDriveLink(c.drive_link || ''); setNotas(c.notas || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function eliminarCliente(id: string, nombre: string) {
    if (!confirm(`¿Estás seguro de eliminar a "${nombre}"?`)) return
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (error) { alert('❌ Error: ' + error.message); return }
    alert('🗑️ Cliente eliminado')
    cargarClientes()
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-center text-primary mb-6">💼 Registro de Clientes</h1>

      {/* Formulario */}
      <div className="bg-white p-6 rounded-xl shadow-md max-w-[950px] mx-auto mb-6">
        <div className={`${editingId ? 'bg-accent' : 'bg-yellow-400'} p-1.5 text-center font-bold mb-4 text-sm`}>
          {editingId ? '✏️ EDITANDO CLIENTE' : 'NUEVO REGISTRO'}
        </div>

        <form onSubmit={guardarCliente}>
          <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <div>
              <label className="block text-[0.75em] font-bold text-gray-500 uppercase text-center mb-0.5">Nombre</label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required
                className="w-full p-2.5 border border-gray-200 rounded-md text-center text-primary" />
            </div>
            <div>
              <label className="block text-[0.75em] font-bold text-gray-500 uppercase text-center mb-0.5">Email</label>
              <input type="text" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full p-2.5 border border-gray-200 rounded-md text-center text-primary" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-3 max-md:grid-cols-1">
            <div>
              <label className="block text-[0.75em] font-bold text-gray-500 uppercase text-center mb-0.5">Teléfono</label>
              <input type="text" value={telefono} onChange={e => setTelefono(e.target.value)}
                className="w-full p-2.5 border border-gray-200 rounded-md text-center text-primary" />
            </div>
            <div>
              <label className="block text-[0.75em] font-bold text-gray-500 uppercase text-center mb-0.5">ID</label>
              <input type="text" value={dni} onChange={e => setDni(e.target.value)} required
                className="w-full p-2.5 border border-gray-200 rounded-md text-center text-primary" />
            </div>
            <div>
              <label className="block text-[0.75em] font-bold text-gray-500 uppercase text-center mb-0.5">País</label>
              <input type="text" value={pais} onChange={e => setPais(e.target.value)}
                className="w-full p-2.5 border border-gray-200 rounded-md text-center text-primary" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-3 max-md:grid-cols-1">
            <div>
              <label className="block text-[0.75em] font-bold text-gray-500 uppercase text-center mb-0.5">Fecha Registro</label>
              <input type="date" value={fechaRegistro} onChange={e => setFechaRegistro(e.target.value)}
                className="w-full p-2.5 border border-gray-200 rounded-md text-center text-primary" />
            </div>
            <div>
              <label className="block text-[0.75em] font-bold text-gray-500 uppercase text-center mb-0.5">Drive Link</label>
              <input type="text" value={driveLink} onChange={e => setDriveLink(e.target.value)}
                className="w-full p-2.5 border border-gray-200 rounded-md text-center text-primary" />
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-[0.75em] font-bold text-gray-500 uppercase text-center mb-0.5">Notas</label>
            <input type="text" value={notas} onChange={e => setNotas(e.target.value)}
              className="w-full p-2.5 border border-gray-200 rounded-md text-center text-primary" />
          </div>

          <div className="flex gap-2.5 mt-4 max-md:flex-col">
            <button type="submit"
              className="flex-1 bg-accent text-white font-bold py-3.5 rounded-lg text-[1.1em] hover:bg-accent/80 transition-colors cursor-pointer">
              {editingId ? '✏️ ACTUALIZAR CLIENTE' : '+ GUARDAR CLIENTE'}
            </button>
            {editingId && (
              <button type="button" onClick={limpiarFormulario}
                className="flex-1 bg-gray-400 text-white font-bold py-3.5 rounded-lg text-[1.1em] hover:bg-gray-500 transition-colors cursor-pointer">
                CANCELAR EDICIÓN
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Tabla de Clientes */}
      <div className="bg-white p-6 rounded-xl shadow-md w-full">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse min-w-[1100px]">
            <thead>
              <tr>
                {['Cliente', 'Email', 'Tel', 'ID', 'País', 'Fecha', 'Files', 'Notas', 'Acciones'].map(h => (
                  <th key={h} className="bg-gray-50 border-b-2 border-gray-200 py-3 px-2 text-center text-[0.85em] font-bold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400">Cargando clientes...</td></tr>
              ) : clientes.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400">No hay clientes registrados</td></tr>
              ) : (
                clientes.map((c) => (
                  <tr key={c.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="py-2 px-1 border-b border-gray-100 text-center text-[0.85em] text-primary">{c.nombre}</td>
                    <td className="py-2 px-1 border-b border-gray-100 text-center text-[0.85em] text-primary">{c.email}</td>
                    <td className="py-2 px-1 border-b border-gray-100 text-center text-[0.85em] text-primary">{c.telefono}</td>
                    <td className="py-2 px-1 border-b border-gray-100 text-center text-[0.85em] text-primary">{c.dni}</td>
                    <td className="py-2 px-1 border-b border-gray-100 text-center text-[0.85em] text-primary">{c.pais}</td>
                    <td className="py-2 px-1 border-b border-gray-100 text-center text-[0.85em] text-primary">{c.fecha_registro}</td>
                    <td className="py-2 px-1 border-b border-gray-100 text-center text-[0.85em]">
                      {c.drive_link && (
                        <a href={c.drive_link} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                          📂 Ver
                        </a>
                      )}
                    </td>
                    <td className="py-2 px-1 border-b border-gray-100 text-center text-[0.85em] text-primary max-w-[150px] truncate">{c.notas}</td>
                    <td className="py-2 px-1 border-b border-gray-100 text-center">
                      <div className="flex gap-1.5 justify-center">
                        <button onClick={() => editarCliente(c)}
                          className="bg-blue-500 text-white px-2.5 py-1.5 rounded text-[13px] font-medium hover:bg-blue-600 transition-colors cursor-pointer">
                          ✏️ Editar
                        </button>
                        <button onClick={() => eliminarCliente(c.id, c.nombre)}
                          className="bg-red-500 text-white px-2.5 py-1.5 rounded text-[13px] font-medium hover:bg-red-600 transition-colors cursor-pointer">
                          🗑️ Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
