/**
 * Generador mínimo de archivos .xlsx sin dependencias.
 *
 * Un .xlsx es un ZIP con varios XML. Aquí se arma con el ZIP "sin
 * compresión" (método 0), que Excel, LibreOffice y Google Sheets abren sin
 * problema; para respaldos de este tamaño el peso extra es irrelevante.
 *
 * Cada hoja tiene encabezado con estilo, primera fila inmovilizada, filtros
 * y anchos de columna según el contenido. Los textos van como texto, así
 * que nada de lo que escriba un usuario se interpreta como fórmula.
 */

export type Celda = string | number | boolean | null | undefined

export interface Hoja {
  nombre: string
  encabezados: string[]
  filas: Celda[][]
  /** Índices (base 0) de las columnas numéricas que se muestran con 2 decimales. */
  columnasMoneda?: number[]
}

const LIMITE_TEXTO_EXCEL = 32000 // Excel admite 32 767 caracteres por celda

// ---------------------------------------------------------------- XML ----

const sinInvalidos = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g

function escaparXml(texto: string): string {
  return texto
    .replace(sinInvalidos, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** A, B, … Z, AA, AB… (índice base 0). */
function letraColumna(indice: number): string {
  let n = indice + 1
  let letras = ''
  while (n > 0) {
    const resto = (n - 1) % 26
    letras = String.fromCharCode(65 + resto) + letras
    n = Math.floor((n - 1) / 26)
  }
  return letras
}

/** Nombre de hoja válido para Excel: ≤ 31 caracteres, sin []:*?/\ y sin repetirse. */
function nombresDeHojaUnicos(nombres: string[]): string[] {
  const usados = new Set<string>()
  return nombres.map((original) => {
    const base = (original.replace(/[[\]:*?/\\]/g, ' ').replace(/^'+|'+$/g, '').trim() || 'Hoja').slice(0, 31)
    let nombre = base
    for (let n = 2; usados.has(nombre.toLowerCase()); n++) {
      const sufijo = ` (${n})`
      nombre = base.slice(0, 31 - sufijo.length) + sufijo
    }
    usados.add(nombre.toLowerCase())
    return nombre
  })
}

const ESTILO_NORMAL = 0
const ESTILO_ENCABEZADO = 1
const ESTILO_MONEDA = 2

function celdaXml(ref: string, valor: Celda, estilo: number): string {
  if (valor === null || valor === undefined || valor === '') return ''
  const s = estilo ? ` s="${estilo}"` : ''
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? `<c r="${ref}"${s}><v>${valor}</v></c>` : ''
  }
  if (typeof valor === 'boolean') return `<c r="${ref}"${s} t="b"><v>${valor ? 1 : 0}</v></c>`
  const texto = escaparXml(valor.length > LIMITE_TEXTO_EXCEL ? `${valor.slice(0, LIMITE_TEXTO_EXCEL)}…` : valor)
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${texto}</t></is></c>`
}

function anchoDeColumna(hoja: Hoja, col: number): number {
  let max = hoja.encabezados[col]?.length ?? 0
  for (const fila of hoja.filas) {
    const v = fila[col]
    if (v === null || v === undefined) continue
    const largo = typeof v === 'string' ? Math.max(...v.split('\n').map((l) => l.length), 0) : String(v).length
    if (largo > max) max = largo
  }
  return Math.min(60, Math.max(10, max + 2))
}

function hojaXml(hoja: Hoja): string {
  const monedas = new Set(hoja.columnasMoneda ?? [])
  const columnas = Math.max(hoja.encabezados.length, 1)
  const ultimaFila = hoja.filas.length + 1

  const cols = Array.from({ length: columnas }, (_, c) =>
    `<col min="${c + 1}" max="${c + 1}" width="${anchoDeColumna(hoja, c)}" customWidth="1"/>`
  ).join('')

  const filaEncabezado =
    `<row r="1" ht="22" customHeight="1">` +
    hoja.encabezados.map((h, c) => celdaXml(`${letraColumna(c)}1`, h, ESTILO_ENCABEZADO)).join('') +
    `</row>`

  const filas = hoja.filas
    .map((fila, i) => {
      const r = i + 2
      const celdas = fila
        .map((v, c) => celdaXml(`${letraColumna(c)}${r}`, v, monedas.has(c) ? ESTILO_MONEDA : ESTILO_NORMAL))
        .join('')
      return `<row r="${r}">${celdas}</row>`
    })
    .join('')

  const filtro = hoja.filas.length ? `<autoFilter ref="A1:${letraColumna(columnas - 1)}${ultimaFila}"/>` : ''

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<dimension ref="A1:${letraColumna(columnas - 1)}${ultimaFila}"/>` +
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>` +
    `<selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="15"/>` +
    `<cols>${cols}</cols>` +
    `<sheetData>${filaEncabezado}${filas}</sheetData>` +
    filtro +
    `</worksheet>`
  )
}

const ESTILOS_XML =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
  `<fonts count="2">` +
  `<font><sz val="11"/><name val="Calibri"/></font>` +
  `<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>` +
  `</fonts>` +
  `<fills count="3">` +
  `<fill><patternFill patternType="none"/></fill>` +
  `<fill><patternFill patternType="gray125"/></fill>` +
  `<fill><patternFill patternType="solid"><fgColor rgb="FF1A2A3A"/><bgColor indexed="64"/></patternFill></fill>` +
  `</fills>` +
  `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
  `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
  `<cellXfs count="3">` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
  `<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1">` +
  `<alignment horizontal="center" vertical="center" wrapText="1"/></xf>` +
  `<xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
  `</cellXfs>` +
  `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
  `</styleSheet>`

// ---------------------------------------------------------------- ZIP ----

const TABLA_CRC = (() => {
  const tabla = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    tabla[n] = c >>> 0
  }
  return tabla
})()

function crc32(datos: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < datos.length; i++) c = TABLA_CRC[(c ^ datos[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

interface ArchivoZip {
  ruta: string
  datos: Uint8Array
}

/** ZIP sin compresión (método 0), con nombres UTF-8. */
function crearZip(archivos: ArchivoZip[]): Uint8Array<ArrayBuffer> {
  const codificador = new TextEncoder()
  const ahora = new Date()
  const hora = (ahora.getHours() << 11) | (ahora.getMinutes() << 5) | (ahora.getSeconds() >> 1)
  const fecha = ((ahora.getFullYear() - 1980) << 9) | ((ahora.getMonth() + 1) << 5) | ahora.getDate()

  const partes: Uint8Array[] = []
  const central: Uint8Array[] = []
  let desplazamiento = 0

  for (const archivo of archivos) {
    const nombre = codificador.encode(archivo.ruta)
    const crc = crc32(archivo.datos)
    const tamano = archivo.datos.length

    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true) // versión necesaria
    local.setUint16(6, 0x0800, true) // bit 11: nombres en UTF-8
    local.setUint16(8, 0, true) // método 0 = sin compresión
    local.setUint16(10, hora, true)
    local.setUint16(12, fecha, true)
    local.setUint32(14, crc, true)
    local.setUint32(18, tamano, true)
    local.setUint32(22, tamano, true)
    local.setUint16(26, nombre.length, true)
    local.setUint16(28, 0, true)
    partes.push(new Uint8Array(local.buffer), nombre, archivo.datos)

    const dir = new DataView(new ArrayBuffer(46))
    dir.setUint32(0, 0x02014b50, true)
    dir.setUint16(4, 20, true) // versión de creación
    dir.setUint16(6, 20, true) // versión necesaria
    dir.setUint16(8, 0x0800, true)
    dir.setUint16(10, 0, true)
    dir.setUint16(12, hora, true)
    dir.setUint16(14, fecha, true)
    dir.setUint32(16, crc, true)
    dir.setUint32(20, tamano, true)
    dir.setUint32(24, tamano, true)
    dir.setUint16(28, nombre.length, true)
    dir.setUint32(42, desplazamiento, true)
    central.push(new Uint8Array(dir.buffer), nombre)

    desplazamiento += 30 + nombre.length + tamano
  }

  const tamanoCentral = central.reduce((suma, p) => suma + p.length, 0)
  const fin = new DataView(new ArrayBuffer(22))
  fin.setUint32(0, 0x06054b50, true)
  fin.setUint16(8, archivos.length, true)
  fin.setUint16(10, archivos.length, true)
  fin.setUint32(12, tamanoCentral, true)
  fin.setUint32(16, desplazamiento, true)

  const todas = [...partes, ...central, new Uint8Array(fin.buffer)]
  const salida = new Uint8Array(new ArrayBuffer(todas.reduce((suma, p) => suma + p.length, 0)))
  let pos = 0
  for (const parte of todas) {
    salida.set(parte, pos)
    pos += parte.length
  }
  return salida
}

// ------------------------------------------------------------ Público ----

export const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/** Construye el libro completo; devuelve los bytes del .xlsx. */
export function crearXlsx(hojas: Hoja[]): Uint8Array<ArrayBuffer> {
  const lista = hojas.length ? hojas : [{ nombre: 'Datos', encabezados: [], filas: [] }]
  const nombres = nombresDeHojaUnicos(lista.map((h) => h.nombre))
  const codificador = new TextEncoder()
  const texto = (ruta: string, contenido: string): ArchivoZip => ({ ruta, datos: codificador.encode(contenido) })

  const cabecera = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
  const archivos: ArchivoZip[] = [
    texto(
      '[Content_Types].xml',
      `${cabecera}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
        `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
        lista
          .map((_, i) =>
            `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
          )
          .join('') +
        `</Types>`
    ),
    texto(
      '_rels/.rels',
      `${cabecera}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
        `</Relationships>`
    ),
    texto(
      'xl/workbook.xml',
      `${cabecera}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
        `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>` +
        nombres.map((n, i) => `<sheet name="${escaparXml(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') +
        `</sheets></workbook>`
    ),
    texto(
      'xl/_rels/workbook.xml.rels',
      `${cabecera}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        lista
          .map((_, i) =>
            `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
          )
          .join('') +
        `<Relationship Id="rId${lista.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
        `</Relationships>`
    ),
    texto('xl/styles.xml', ESTILOS_XML),
    ...lista.map((h, i) => texto(`xl/worksheets/sheet${i + 1}.xml`, hojaXml(h))),
  ]

  return crearZip(archivos)
}
