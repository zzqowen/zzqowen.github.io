// 轻量 AXML（Android 二进制 XML）解析器
// 只提取元素名和属性，够 vector drawable / adaptive icon 使用

export interface AxmlAttribute {
  name: string
  rawValue?: string
  typedValue?: string | number
  dataType: number
  data: number
}

export interface AxmlElement {
  name: string
  attributes: AxmlAttribute[]
}

export interface AxmlDocument {
  elements: AxmlElement[]
}

// ---- String Pool ----

function readStringPool(view: DataView, chunkStart: number): string[] {
  const stringCount = view.getUint32(chunkStart + 8, true)
  const flags = view.getUint32(chunkStart + 16, true)
  const stringsStart = view.getUint32(chunkStart + 20, true)
  const isUtf8 = (flags & 0x100) !== 0

  const strings: string[] = new Array(stringCount)
  const dataStart = chunkStart + stringsStart

  for (let i = 0; i < stringCount; i += 1) {
    const offset = view.getUint32(chunkStart + 28 + i * 4, true)
    const pos = dataStart + offset
    if (isUtf8) {
      strings[i] = readUtf8String(view, pos)
    } else {
      strings[i] = readUtf16String(view, pos)
    }
  }
  return strings
}

function readUtf8String(view: DataView, pos: number): string {
  // 跳过 UTF16 长度（变长 1-2 字节）
  let cursor = pos
  const u16first = view.getUint8(cursor)
  cursor += (u16first & 0x80) !== 0 ? 2 : 1
  // UTF8 长度（变长 1-2 字节）
  const u8first = view.getUint8(cursor)
  let utf8Len: number
  if ((u8first & 0x80) !== 0) {
    utf8Len = ((u8first & 0x7f) << 8) | view.getUint8(cursor + 1)
    cursor += 2
  } else {
    utf8Len = u8first
    cursor += 1
  }
  const bytes = new Uint8Array(view.buffer, view.byteOffset + cursor, utf8Len)
  return new TextDecoder('utf-8').decode(bytes)
}

function readUtf16String(view: DataView, pos: number): string {
  let cursor = pos
  const first = view.getUint16(cursor, true)
  let len: number
  if ((first & 0x8000) !== 0) {
    len = ((first & 0x7fff) << 16) | view.getUint16(cursor + 2, true)
    cursor += 4
  } else {
    len = first
    cursor += 2
  }
  const chars: number[] = []
  for (let i = 0; i < len; i += 1) {
    chars.push(view.getUint16(cursor + i * 2, true))
  }
  return String.fromCharCode(...chars)
}

// ---- Typed Value ----

function decodeTypedValue(dataType: number, data: number, strings: string[]): string | number | undefined {
  switch (dataType) {
    case 0x03: // TYPE_STRING
      return strings[data] ?? ''
    case 0x01: // TYPE_REFERENCE
      return `@0x${data.toString(16).padStart(8, '0')}`
    case 0x10: // TYPE_INT_DEC
      return data
    case 0x11: // TYPE_INT_HEX
      return `0x${data.toString(16)}`
    case 0x12: // TYPE_INT_BOOLEAN
      return data !== 0 ? 'true' : 'false'
    case 0x04: { // TYPE_FLOAT
      const buf = new ArrayBuffer(4)
      new DataView(buf).setUint32(0, data, true)
      return new DataView(buf).getFloat32(0, true)
    }
    case 0x1c: // TYPE_INT_COLOR_ARGB8
      return `#${data.toString(16).padStart(8, '0')}`
    case 0x1d: // TYPE_INT_COLOR_RGB8
      return `#${data.toString(16).padStart(6, '0')}`
    case 0x05: { // TYPE_DIMENSION
      // complex: mantissa * radix + unit，简化返回数值
      const mantissa = (data >> 8) & 0xffffff
      const signed = mantissa >= 0x800000 ? mantissa - 0x1000000 : mantissa
      const radix = (data >> 4) & 0x3
      const multipliers = [1 / 256, 1 / 16, 1, 1]
      return signed * (multipliers[radix] ?? 1)
    }
    default:
      return data
  }
}

// ---- Main Parser ----

export function parseAxml(bytes: Uint8Array): AxmlDocument {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const elements: AxmlElement[] = []
  let strings: string[] = []

  let cursor = 0
  while (cursor + 8 <= bytes.length) {
    const type = view.getUint16(cursor, true)
    const headerSize = view.getUint16(cursor + 2, true)
    const chunkSize = view.getUint32(cursor + 4, true)
    if (chunkSize <= 0 || cursor + chunkSize > bytes.length) break

    if (type === 0x0001) {
      // String Pool
      strings = readStringPool(view, cursor)
    } else if (type === 0x0102 && headerSize >= 16) {
      // XML Start Element
      const nameIdx = view.getUint32(cursor + 20, true)
      const attrStart = view.getUint16(cursor + 22, true)
      const attrCount = view.getUint16(cursor + 26, true)
      const name = strings[nameIdx] ?? ''

      const attributes: AxmlAttribute[] = []
      const attrsBase = cursor + 16 + attrStart
      for (let i = 0; i < attrCount; i += 1) {
        const aOff = attrsBase + i * 20
        if (aOff + 20 > bytes.length) break
        const aNameIdx = view.getUint32(aOff + 4, true)
        const rawIdx = view.getInt32(aOff + 8, true)
        const dataType = view.getUint8(aOff + 15)
        const data = view.getUint32(aOff + 16, true)
        const aName = strings[aNameIdx] ?? ''
        const rawValue = rawIdx >= 0 ? (strings[rawIdx] ?? '') : undefined
        const typedValue = decodeTypedValue(dataType, data, strings)
        attributes.push({ name: aName, rawValue, typedValue, dataType, data })
      }

      elements.push({ name, attributes })
    }

    cursor += chunkSize
  }

  return { elements }
}

// ---- 便捷查询 ----

export function findElements(doc: AxmlDocument, name: string): AxmlElement[] {
  return doc.elements.filter((e) => e.name === name)
}

export function getAttr(el: AxmlElement, name: string): AxmlAttribute | undefined {
  return el.attributes.find((a) => a.name === name)
}

export function getAttrString(el: AxmlElement, name: string): string | undefined {
  const a = getAttr(el, name)
  if (!a) return undefined
  if (a.rawValue) return a.rawValue
  if (a.typedValue !== undefined) return String(a.typedValue)
  return undefined
}

export function getAttrFloat(el: AxmlElement, name: string): number | undefined {
  const a = getAttr(el, name)
  if (!a) return undefined
  if (typeof a.typedValue === 'number') return a.typedValue
  if (a.rawValue) {
    const n = parseFloat(a.rawValue)
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}
