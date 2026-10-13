'use client'

import Swal from 'sweetalert2'
import { cargarSoporte } from './soporte'

/** Diálogos con SweetAlert2, igual que en la versión legacy. */

export function exito(mensaje: string, titulo = '¡Listo!') {
  return Swal.fire(titulo, mensaje, 'success')
}

export function error(mensaje: string, titulo = 'Error') {
  return Swal.fire(titulo, mensaje, 'error')
}

export function aviso(mensaje: string, titulo = 'Atención') {
  return Swal.fire(titulo, mensaje, 'warning')
}

export async function confirmar(titulo: string, texto: string, textoBoton = 'Sí, borrar') {
  const r = await Swal.fire({
    title: titulo,
    text: texto,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    confirmButtonText: textoBoton,
    cancelButtonText: 'Cancelar',
  })
  return r.isConfirmed
}

export async function preguntar(titulo: string, texto: string, textoBoton: string) {
  const r = await Swal.fire({
    title: titulo,
    text: texto,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: textoBoton,
    cancelButtonText: 'Cancelar',
  })
  return r.isConfirmed
}

export async function pedirNumero(titulo: string, etiqueta: string, placeholder: string) {
  const r = await Swal.fire({
    title: titulo,
    input: 'number',
    inputLabel: etiqueta,
    inputPlaceholder: placeholder,
    showCancelButton: true,
    confirmButtonText: 'Generar Siguiente Mes 🚀',
    cancelButtonText: 'Cancelar',
  })
  return r.isConfirmed && r.value ? Number(r.value) : null
}

export function cargando(titulo = 'Cargando...') {
  Swal.fire({ title: titulo, allowOutsideClick: false, didOpen: () => Swal.showLoading() })
}

export function cerrar() {
  Swal.close()
}

const escaparHtml = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** El correo de soporte se configura en «Configuración Admin» (tabla config_app). */
export async function abrirSoporteEmail() {
  const { email: EMAIL_SOPORTE } = await cargarSoporte()
  const r = await Swal.fire({
    title: '✉️ Soporte por Correo',
    html: `Puedes escribirnos directamente a:<br><strong style="color:#00BFFF; font-size:18px;">${escaparHtml(EMAIL_SOPORTE)}</strong>`,
    background: '#151A23',
    color: '#FFF',
    showCloseButton: true,
    showCancelButton: true,
    showDenyButton: true,
    confirmButtonText: '📱 App Móvil',
    denyButtonText: '💻 Gmail Web',
    cancelButtonText: '📋 Copiar Correo',
    confirmButtonColor: '#FF00FF',
    denyButtonColor: '#00BFFF',
    cancelButtonColor: '#00FF7F',
  })
  const asunto = encodeURIComponent('Soporte Freelancer Control Pro')
  if (r.isConfirmed) {
    window.location.href = `mailto:${EMAIL_SOPORTE}?subject=${asunto}`
  } else if (r.isDenied) {
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(EMAIL_SOPORTE)}&su=${asunto}`, '_blank')
  } else if (r.dismiss === Swal.DismissReason.cancel) {
    await navigator.clipboard.writeText(EMAIL_SOPORTE)
    Swal.fire({
      title: '¡Copiado!',
      text: 'Correo copiado al portapapeles',
      icon: 'success',
      timer: 2000,
      showConfirmButton: false,
      background: '#151A23',
      color: '#FFF',
    })
  }
}
