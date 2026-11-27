import type { AndroidAppInfo } from './types'

interface StringTable {
  strings: string[]
}

interface ResourceMap {
  readonly byId: Map<number, number>
  readonly byIndex: Map<number, number>
}

interface ResChunkHeader {
  type: number
  headerSize: number
  totalSize: number
}

const CHUNK_STRING_POOL = 0x0003
const CHUNK_XML_RESOURCE_IDS = 0x0180
const CHUNK_XML_START_ELEMENT = 0x0102
const CHUNK_XML_START_NAMESPACE = 0x0101

export interface ParsedElement {
  name: string
  namespace?: string
  attributes: Array<{ name: string; resourceId?: number; rawValue?: string; typedValue?: string; namespace?: string }>
}

function readHeader(view: DataView, offset: number): ResChunkHeader {
  return {
    type: view.getUint16(offset, true),
    headerSize: view.getUint16(offset + 2, true),
    totalSize: view.getUint32(offset + 4, true),
  }
}

function readStringBlock(view: DataView, header: ResChunkHeader): StringTable {
  // ResStringPool_header 紧跟在 ResChunk_header 之后，总共 28 字节
  const start = 8 // 块头部之后
  const stringCount = view.getUint32(start + 8, true)
  // styleCount = + 12
  const flags = view.getUint32(start + 16, true)
  const stringsStart = view.getUint32(start + 20, true)
  // stylesStart = + 24

  const blockStart = 0
  const strPoolStart = blockStart + stringsStart
  const isUtf16 = (flags & 0x100) !== 0

  const strings: string[] = new Array(stringCount)
  const offsetTableStart = start + 28 // 紧接 ResStringPool_header
  for (let i = 0; i < stringCount; i += 1) {
    const entryOffset = view.getUint32(offsetTableStart + i * 4, true)
    const stringStart = strPoolStart + entryOffset
    let out = ''
    if (isUtf16) {
      let cursor = stringStart
      while (true) {
        const code = view.getUint16(cursor, true)
        if (code === 0) break
        out += String.fromCharCode(code)
        cursor += 2
      }
    } else {
      let cursor = stringStart
      while (true) {
        const code = view.getUint8(cursor)
        if (code === 0) break
        out += String.fromCharCode(code)
        cursor += 1
      }
    }
    strings[i] = out
  }

  void header
  return { strings }
}

function readResourceMap(view: DataView, header: ResChunkHeader): ResourceMap {
  // ResResourceIdents_header: 在 ResChunk_header 之后 20 字节
  const idsCount = view.getUint32(8 + 0, true)
  // idsSize = + 4
  const namesCount = view.getUint32(8 + 8, true)
  // namesSize = + 12
  // flags = + 16
  const mapStart = 8 + 20
  void header

  const byId = new Map<number, number>()
  const byIndex = new Map<number, number>()
  const count = Math.min(idsCount, namesCount)
  for (let i = 0; i < count; i += 1) {
    const id = view.getUint32(mapStart + i * 4, true)
    const stringIndex = view.getUint32(mapStart + idsCount * 4 + i * 4, true)
    byId.set(id, stringIndex)
    byIndex.set(stringIndex, id)
  }
  return { byId, byIndex }
}

// Res_value 结构：8 字节
//   uint16 size (2)
//   uint8  res0 (1)
//   uint8  dataType (1)   ← offset + 3
//   uint32 data (4)        ← offset + 4..7
function decodeTypedValue(view: DataView, offset: number, strTable: StringTable): string | undefined {
  const typeByte = view.getUint8(offset + 3)
  const data = view.getUint32(offset + 4, true)

  switch (typeByte) {
    case 0x00: return undefined
    case 0x01: return String(view.getInt32(offset + 4, true))
    case 0x02: return String(data)
    case 0x03: {
      if (data >= strTable.strings.length) return undefined
      return strTable.strings[data]
    }
    case 0x10:
    case 0x11:
    case 0x12:
    case 0x13:
      return data ? 'true' : 'false'
    case 0x20: return String(view.getInt32(offset + 4, true))
    case 0x21: return String(data)
    case 0x30: return String(view.getInt16(offset + 4, true))
    case 0x31: return String(view.getUint16(offset + 4, true))
    case 0x32: return String(view.getInt8(offset + 4))
    case 0x33: return String(view.getUint8(offset + 4))
    case 0x40: return String(view.getFloat32(offset + 4, true))
    case 0x41: return String(view.getFloat32(offset + 4, true) === 0 ? view.getFloat32(offset + 4, true) : view.getFloat32(offset + 4, true))
    case 0x100: // int reference
      return `@+0x${data.toString(16).padStart(8, '0')}`
    case 0x101: return `@-0x${data.toString(16).padStart(8, '0')}`
    case 0x110:
    case 0x111: {
      const r = (data >> 16) & 0xFF
      const g = (data >> 8) & 0xFF
      const b = data & 0xFF
      const a = typeByte === 0x110 ? ((data >> 24) & 0xFF) : 0xFF
      return `#${[a, r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`
    }
    case 0x112: return `#112 0x${data.toString(16).padStart(8, '0')}`
    default:
      return undefined
  }
}

// ResXMLTree_element_start：
//   ResChunk_header       8 字节（type + headerSize + size）
//   int32 ns              +8
//   int32 name            +12
//   ResXMLTree_attrExt    +16..31 共 16 字节：
//     uint16 attributeStart   +16  (块内偏移)
//     uint16 attributeSize    +18
//     uint16 attributeCount   +20
//     uint16 idIndex         +22
//     uint32 styleIndex       +24
//     uint32 customStyleIndex +28
// headerSize 应该是 28
// 每个 Attribute 28 字节：
//   uint32 nameResourceId    +0
//   int32  ns                +4
//   int32  name              +8
//   int32  rawValue          +12
//   uint16 size              +16
//   uint16 res0              +18
//   Res_value typedValue     +20..27
function parseStartElement(view: DataView, offset: number, strTable: StringTable, resMap: ResourceMap): ParsedElement {
  const headerSize = view.getUint16(offset + 2, true)
  const nsIndex = view.getInt32(offset + 8, true)
  const nameIndex = view.getInt32(offset + 12, true)
  const attrStart = view.getUint16(offset + 16, true)
  const _attrSize = view.getUint16(offset + 18, true)
  const attrCount = view.getUint16(offset + 20, true)
  void _attrSize

  void headerSize

  const name = strTable.strings[nameIndex] ?? ''
  const namespace = nsIndex >= 0 && nsIndex < strTable.strings.length ? strTable.strings[nsIndex] : undefined

  const attrs: ParsedElement['attributes'] = []
  const attrsStart = offset + attrStart
  for (let i = 0; i < attrCount; i += 1) {
    const attrOffset = attrsStart + i * 28
    const nameResourceId = view.getUint32(attrOffset + 0, true)
    const ns = view.getInt32(attrOffset + 4, true)
    const _nameRef = view.getInt32(attrOffset + 8, true) // 在 ResourceIDBlock 可用时是 string index
    const rawValueIndex = view.getInt32(attrOffset + 12, true)
    // size @ +16, res0 @ +18, typedValue @ +20
    const typed = decodeTypedValue(view, attrOffset + 20, strTable)

    const attrNs = ns >= 0 && ns < strTable.strings.length ? strTable.strings[ns] : undefined

    let attrName: string
    if (resMap.byId.has(nameResourceId)) {
      const idx = resMap.byId.get(nameResourceId)!
      attrName = idx < strTable.strings.length ? strTable.strings[idx] : ''
    } else if (nameResourceId < strTable.strings.length && strTable.strings[nameResourceId]) {
      attrName = strTable.strings[nameResourceId]
    } else {
      attrName = `0x${nameResourceId.toString(16).padStart(8, '0')}`
    }

    void _nameRef

    let rawValue: string | undefined
    if (rawValueIndex >= 0 && rawValueIndex < strTable.strings.length && strTable.strings[rawValueIndex].length > 0) {
      rawValue = strTable.strings[rawValueIndex]
    }

    attrs.push({
      name: attrName,
      resourceId: nameResourceId,
      rawValue,
      typedValue: typed,
      namespace: attrNs,
    })
  }

  return { name, namespace, attributes: attrs }
}

export interface ManifestDocument {
  elements: ParsedElement[]
}

export function parseAndroidManifestXml(bytes: Uint8Array): ManifestDocument {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (bytes.length < 28) throw new Error('AndroidManifest.xml 过短')

  let strTable: StringTable | null = null
  let resMap: ResourceMap = { byId: new Map(), byIndex: new Map() }
  const elements: ParsedElement[] = []

  let cursor = 0
  while (cursor < bytes.length) {
    if (cursor + 8 > bytes.length) break
    const header = readHeader(view, cursor)
    if (header.totalSize <= 0 || header.totalSize > bytes.length - cursor) break

    switch (header.type) {
      case CHUNK_STRING_POOL:
        strTable = readStringBlock(view, header)
        break
      case CHUNK_XML_RESOURCE_IDS:
        resMap = readResourceMap(view, header)
        break
      case CHUNK_XML_START_ELEMENT:
      case CHUNK_XML_START_NAMESPACE:
        if (strTable) {
          elements.push(parseStartElement(view, cursor, strTable, resMap))
        }
        break
      default:
        break
    }

    cursor += header.totalSize
  }

  if (!strTable) throw new Error('AndroidManifest.xml 中找不到字符串表')

  return { elements }
}

function attrValue(el: ParsedElement, name: string): string | undefined {
  const a = el.attributes.find((item) => item.name === name)
  return a?.rawValue ?? a?.typedValue
}

export function buildAndroidAppInfo(manifest: ManifestDocument): AndroidAppInfo {
  const info: AndroidAppInfo = {
    platform: 'android',
    packageName: '',
    permissions: [],
    features: [],
    usesFeatures: [],
    activities: [],
  }

  for (const el of manifest.elements) {
    if (el.name === 'manifest') {
      const packageAttr = el.attributes.find((a) => a.name === 'package')
      if (packageAttr) info.packageName = packageAttr.rawValue ?? packageAttr.typedValue ?? ''
      info.versionName = attrValue(el, 'versionName')
      info.versionCode = attrValue(el, 'versionCode')
    } else if (el.name === 'application') {
      const icon = attrValue(el, 'icon')
      if (icon) info.iconResource = icon
      const round = attrValue(el, 'roundIcon')
      if (round) info.roundIconResource = round
      info.label = attrValue(el, 'label')
    } else if (el.name === 'activity') {
      const name = attrValue(el, 'name')
      if (name) {
        info.activities.push(name)
        if (attrValue(el, 'exported') === 'true' && !info.mainActivity) info.mainActivity = name
      }
    } else if (el.name === 'uses-permission') {
      const name = attrValue(el, 'name')
      if (name) info.permissions.push(name)
    } else if (el.name === 'uses-sdk') {
      info.minSdkVersion = attrValue(el, 'minSdkVersion')
      info.targetSdkVersion = attrValue(el, 'targetSdkVersion')
    } else if (el.name === 'feature') {
      const name = attrValue(el, 'name')
      if (name) info.features.push(name)
    } else if (el.name === 'uses-feature') {
      const name = attrValue(el, 'name')
      if (name) info.usesFeatures.push(name)
    }
  }

  return info
}
