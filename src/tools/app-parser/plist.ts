export type PlistValue =
  | string
  | number
  | boolean
  | null
  | Uint8Array
  | PlistValue[]
  | { [key: string]: PlistValue }

const BPLIST_MAGIC = 'bplist00'

function readUintN(view: DataView, offset: number, bytes: number): number {
  let result = 0
  for (let i = 0; i < bytes; i += 1) result = result * 256 + view.getUint8(offset + i)
  return result
}

function readInt64(view: DataView, offset: number): number {
  const high = view.getInt32(offset, false)
  const low = view.getUint32(offset + 4, false)
  if (high >= 0) return high * 4_294_967_296 + low
  return high * 4_294_967_296 + low
}

function getPlistStringLength(view: DataView, offset: number): { length: number; next: number } {
  const nibble = view.getUint8(offset) & 0x0F
  if (nibble < 0x0F) return { length: nibble, next: offset + 1 }
  const extra = view.getUint8(offset + 1)
  switch (extra) {
    case 0: return { length: view.getUint8(offset + 2), next: offset + 3 }
    case 1: return { length: view.getUint16(offset + 2, false), next: offset + 4 }
    case 2: return { length: view.getUint32(offset + 2, false), next: offset + 6 }
    default: throw new Error(`不支持的 plist 长度前缀: ${extra}`)
  }
}

function parseBinaryPlist(bytes: Uint8Array): PlistValue {
  if (bytes.length < 32) throw new Error('二进制 plist 过短')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const magic = new TextDecoder('ascii').decode(bytes.subarray(0, 8))
  if (magic !== BPLIST_MAGIC) throw new Error('不是二进制 plist 文件')

  const trailerStart = bytes.length - 32
  const offsetTableOffset = readInt64(view, trailerStart + 8)
  const objectCount = readInt64(view, trailerStart + 16)
  const offsetTableEntrySize = readInt64(view, trailerStart + 24)

  const offsets: number[] = []
  for (let i = 0; i < objectCount; i += 1) {
    offsets.push(readUintN(view, offsetTableOffset + i * offsetTableEntrySize, offsetTableEntrySize))
  }

  const cache: (PlistValue | undefined)[] = new Array(objectCount)
  const visiting = new Set<number>()

  function resolve(index: number): PlistValue {
    if (cache[index] !== undefined) return cache[index] as PlistValue
    if (visiting.has(index)) throw new Error('plist 含有循环引用')
    visiting.add(index)
    const value = decodeObject(index)
    visiting.delete(index)
    cache[index] = value
    return value
  }

  function decodeObject(index: number): PlistValue {
    const start = offsets[index]
    const typeAndLength = view.getUint8(start)
    const type = typeAndLength & 0xF0
    const shortLen = typeAndLength & 0x0F

    switch (type) {
      case 0x00: {
        if (shortLen === 0x00 || shortLen === 0x0F) return null
        if (shortLen === 0x08) return false
        if (shortLen === 0x09) return true
        throw new Error(`未知 0x00 类型子类型 ${shortLen}`)
      }
      case 0x10: {
        const length = 1 << shortLen
        if (length > 8) throw new Error(`plst 不支持 UInt 长度 ${length}`)
        const result = readUintN(view, start + 1, length)
        return result > Number.MAX_SAFE_INTEGER ? Number(result.toString()) : result
      }
      case 0x20: {
        const length = 1 << shortLen
        if (length > 8) throw new Error(`plst 不支持 Int 长度 ${length}`)
        if (length === 8) return readInt64(view, start + 1)
        return view.getInt32(start + 1, false) >> (32 - length * 8)
      }
      case 0x30: {
        const length = 1 << shortLen
        if (length === 4) return view.getFloat32(start + 1, false)
        if (length === 8) return view.getFloat64(start + 1, false)
        throw new Error(`plst 不支持 Real 长度 ${length}`)
      }
      case 0x40: {
        const seconds = view.getFloat64(start + 1, false)
        const base = new Date('2001-01-01T00:00:00Z').getTime() / 1000
        return new Date((base + seconds) * 1000).toISOString()
      }
      case 0x50: {
        const { length, next } = getPlistStringLength(view, start)
        return bytes.subarray(next, next + length)
      }
      case 0x60: {
        const { length, next } = getPlistStringLength(view, start)
        return new TextDecoder('ascii').decode(bytes.subarray(next, next + length))
      }
      case 0x70: {
        const { length, next } = getPlistStringLength(view, start)
        const u16 = bytes.subarray(next, next + length * 2)
        let out = ''
        for (let i = 0; i < u16.length; i += 2) {
          out += String.fromCharCode(u16[i] * 256 + u16[i + 1])
        }
        return out
      }
      case 0x80: {
        const length = shortLen
        return { __uid: readUintN(view, start + 1, length) }
      }
      case 0xA0: {
        const { length, next } = getPlistStringLength(view, start)
        const result: PlistValue[] = new Array(length)
        let cursor = next
        const indexBytes = offsetTableEntrySize
        for (let i = 0; i < length; i += 1) {
          result[i] = resolve(readUintN(view, cursor, indexBytes))
          cursor += indexBytes
        }
        return result
      }
      case 0xD0: {
        const { length, next } = getPlistStringLength(view, start)
        const result: { [key: string]: PlistValue } = {}
        let cursor = next
        const indexBytes = offsetTableEntrySize
        const keys: PlistValue[] = new Array(length)
        const values: PlistValue[] = new Array(length)
        for (let i = 0; i < length; i += 1) {
          keys[i] = resolve(readUintN(view, cursor, indexBytes)); cursor += indexBytes
        }
        for (let i = 0; i < length; i += 1) {
          values[i] = resolve(readUintN(view, cursor, indexBytes)); cursor += indexBytes
        }
        for (let i = 0; i < length; i += 1) result[String(keys[i])] = values[i]
        return result
      }
      default:
        throw new Error(`未知 plist 类型 0x${type.toString(16).padStart(2, '0')}`)
    }
  }

  return resolve(readInt64(view, trailerStart + 0))
}

function nodeToPlist(node: Element): PlistValue {
  const tag = node.nodeName
  const content = (node.textContent ?? '').trim()

  switch (tag) {
    case 'string': return content
    case 'integer': return Number.parseInt(content, 10)
    case 'real': return Number.parseFloat(content)
    case 'true': return true
    case 'false': return false
    case 'null': return null
    case 'date': return content
    case 'data': {
      const hex = content.replace(/\s+/g, '')
      const arr = new Uint8Array(hex.length / 2)
      for (let i = 0; i < hex.length; i += 2) arr[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16)
      return arr
    }
    case 'array':
      return Array.from(node.children).map((child) => nodeToPlist(child as Element))
    case 'dict': {
      const result: { [key: string]: PlistValue } = {}
      const children = Array.from(node.children)
      for (let i = 0; i < children.length; i += 2) {
        const keyNode = children[i]
        const valueNode = children[i + 1]
        if (keyNode.nodeName !== 'key' || !valueNode) continue
        result[(keyNode.textContent ?? '').trim()] = nodeToPlist(valueNode as Element)
      }
      return result
    }
    default: return content
  }
}

export function parsePlist(bytes: Uint8Array): PlistValue {
  if (bytes.length >= 8 && new TextDecoder('ascii').decode(bytes.subarray(0, 8)) === BPLIST_MAGIC) {
    return parseBinaryPlist(bytes)
  }

  const xml = new TextDecoder('utf-8').decode(bytes)
  try {
    const dom = new DOMParser().parseFromString(xml, 'text/xml')
    const plistNode = dom.getElementsByTagName('plist')[0]
    if (!plistNode) throw new Error('找不到 <plist> 根节点')
    return nodeToPlist(plistNode.children[0] as Element)
  } catch (error) {
    throw new Error(`plist 解析失败: ${(error as Error).message}`)
  }
}
