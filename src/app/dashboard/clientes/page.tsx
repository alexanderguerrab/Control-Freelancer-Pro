'use client'

import { useState } from 'react'
import { useTabla } from '@/lib/useTabla'
import { confirmar, error, exito } from '@/lib/alertas'
import { Cargando } from '@/components/ui'
import type { Cliente } from '@/lib/types'

type FormCliente = Omit<Cliente, 'id'>

const VACIO: FormCliente = {
  nombre: '', email: '', telefono: '', dni: '', pais: '',
  fecha_registro: '', drive_link: '', notas: '',
}

export default function ClientesPage() {
  const { filas: clientes, actualizar, insertar, eliminar } = useTabla<Cliente>('clientes', 'nombre')
  const [form, setForm] = useState<FormCliente>(VACIO)
  const [editandoId, setEditandoId] = useState<string | null>(null)

  function campo(label: string, nombre: keyof FormCliente, tipo = 'text') {
    return (
      <div>
        <label className="etiqueta">{label}</label>
        <input type={tipo} value={form[nombre] ?? ''} className="campo"
          onChange={(e) => setForm((f) => ({ ...f, [nombre]: e.target.value }))} />
      </div>
    )
  }

  function limpiar() {
    setForm(VACIO)
    setEditandoId(null)
  }

  async function guardar(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form.nombre?.trim()) return error('Nombre obligatorio')

    const datos = { ...form, fecha_registro: form.fecha_registro || null }
    const ok = editandoId ? await actualizar(editandoId, datos) : await insertar(datos)
    if (!ok) return
    exito(editandoId ? `Cliente ${form.nombre} actualizado.` : 'Cliente guardado', editandoId ? '¡Actualizado!' : '¡Listo!')
    limpiar()
  }

  function editar(c: Cliente) {
    const { id, ...resto } = c
    setEditandoId(id)
    setForm(resto)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function borrar(c: Cliente) {
    if (!(await confirmar('¿Eliminar cliente?', `${c.nombre}${c.dni ? ` (ID: ${c.dni})` : ''}`))) return
    if (await eliminar(c.id)) exito('Cliente eliminado.', 'Borrado')
  }

  return (
    <div>
      <h1 className="titulo-seccion">💼 Registro de Clientes</h1>

      <form onSubmit={guardar} className="card mb-6">
        <div className={`banda ${editandoId ? 'bg-accent text-white' : 'bg-[#ffeb3b]'}`}>
          {editandoId ? 'EDITAR CLIENTE' : 'NUEVO REGISTRO'}
        </div>
        <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1 max-md:gap-0">
          {campo('Nombre', 'nombre')}
          {campo('Email', 'email', 'email')}
        </div>
        <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1 max-md:gap-0">
          {campo('Teléfono', 'telefono')}
          {campo('ID', 'dni')}
          {campo('País', 'pais')}
        </div>
        <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1 max-md:gap-0">
          {campo('Fecha Registro', 'fecha_registro', 'date')}
          {campo('Drive Link', 'drive_link')}
        </div>
        {campo('Notas', 'notas')}

        <div className="flex gap-2.5 max-md:flex-col">
          <button type="submit" className="btn-principal bg-accent">
            {editandoId ? '💾 ACTUALIZAR CLIENTE' : '+ GUARDAR CLIENTE'}
          </button>
          {editandoId && (
            <button type="button" onClick={limpiar} className="btn-principal bg-gray-400">
              CANCELAR EDICIÓN
            </button>
          )}
        </div>
      </form>

      <div className="card-ancha">
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                {['Cliente', 'Email', 'Tel', 'ID', 'País', 'Fecha', 'Files', 'Notas', 'Acciones'].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!clientes ? (
                <Cargando columnas={9} texto="Cargando clientes..." />
              ) : clientes.length === 0 ? (
                <Cargando columnas={9} texto="No hay clientes registrados" />
              ) : (
                clientes.map((c) => (
                  <tr key={c.id}>
                    <td className="font-bold">{c.nombre}</td>
                    <td>{c.email}</td>
                    <td>{c.telefono}</td>
                    <td>{c.dni}</td>
                    <td>{c.pais}</td>
                    <td>{c.fecha_registro}</td>
                    <td>
                      {c.drive_link && (
                        <a href={c.drive_link} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                          📂 Ver
                        </a>
                      )}
                    </td>
                    <td className="max-w-[150px] truncate">{c.notas}</td>
                    <td>
                      <div className="flex gap-1.5 justify-center">
                        <button onClick={() => editar(c)} className="btn-icono btn-editar" title="Editar Cliente">✏️ Editar</button>
                        <button onClick={() => borrar(c)} className="btn-icono btn-eliminar" title="Eliminar Cliente">🗑️ Eliminar</button>
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
