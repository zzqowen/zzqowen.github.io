// Vector Drawable → Canvas → PNG 渲染器
// 支持 path / group 基本属性，用 Path2D 渲染 SVG 兼容的 pathData

import type { AxmlDocument, AxmlElement } from './axmlReader'
import { getAttrString, getAttrFloat, findElements } from './axmlReader'

interface VectorPath {
  pathData: string
  fillColor?: string
  strokeColor?: string
  strokeWidth: number
  fillAlpha: number
  strokeAlpha: number
}

interface VectorGroup {
  rotation: number
  pivotX: number
  pivotY: number
  scaleX: number
  scaleY: number
  translateX: number
  translateY: number
  children: Array<VectorPath | VectorGroup>
}

interface VectorDrawable {
  viewportWidth: number
  viewportHeight: number
  paths: Array<VectorPath | VectorGroup>
}

function isGroup(item: VectorPath | VectorGroup): item is VectorGroup {
  return 'children' in item
}

function parseColor(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  if (raw.startsWith('#')) {
    // Android #AARRGGBB → CSS rgba
    if (raw.length === 9) {
      const a = parseInt(raw.slice(1, 3), 16) / 255
      const r = parseInt(raw.slice(3, 5), 16)
      const g = parseInt(raw.slice(5, 7), 16)
      const b = parseInt(raw.slice(7, 9), 16)
      return `rgba(${r},${g},${b},${a})`
    }
    return raw // #RRGGBB 直接用
  }
  // @color/xxx 或 ?attr/xxx 无法解析，返回 undefined 由调用方决定默认值
  return undefined
}

function parsePathElement(el: AxmlElement): VectorPath {
  return {
    pathData: getAttrString(el, 'pathData') ?? '',
    fillColor: parseColor(getAttrString(el, 'fillColor')),
    strokeColor: parseColor(getAttrString(el, 'strokeColor')),
    strokeWidth: getAttrFloat(el, 'strokeWidth') ?? 0,
    fillAlpha: getAttrFloat(el, 'fillAlpha') ?? 1,
    strokeAlpha: getAttrFloat(el, 'strokeAlpha') ?? 1,
  }
}

function parseGroupElement(el: AxmlElement, allElements: AxmlElement[], startIdx: number): { group: VectorGroup; endIdx: number } {
  const group: VectorGroup = {
    rotation: getAttrFloat(el, 'rotation') ?? 0,
    pivotX: getAttrFloat(el, 'pivotX') ?? 0,
    pivotY: getAttrFloat(el, 'pivotY') ?? 0,
    scaleX: getAttrFloat(el, 'scaleX') ?? 1,
    scaleY: getAttrFloat(el, 'scaleY') ?? 1,
    translateX: getAttrFloat(el, 'translateX') ?? 0,
    translateY: getAttrFloat(el, 'translateY') ?? 0,
    children: [],
  }

  // AXML 只有 start element，没有 end element 信息在这个简化解析器里
  // 用深度追踪：group 的子元素是后续直到同级或更高级的 path/group
  // 简化方案：把后续所有 path 都归为这个 group 的子元素（够用于大多数 vector）
  let i = startIdx + 1
  while (i < allElements.length) {
    const child = allElements[i]
    if (child.name === 'path') {
      group.children.push(parsePathElement(child))
      i += 1
    } else if (child.name === 'group') {
      const sub = parseGroupElement(child, allElements, i)
      group.children.push(sub.group)
      i = sub.endIdx
    } else {
      break
    }
  }
  return { group, endIdx: i }
}

export function parseVectorDrawable(doc: AxmlDocument): VectorDrawable | null {
  const vectorEl = findElements(doc, 'vector')[0]
  if (!vectorEl) return null

  const vw = getAttrFloat(vectorEl, 'viewportWidth') ?? 24
  const vh = getAttrFloat(vectorEl, 'viewportHeight') ?? 24

  const paths: Array<VectorPath | VectorGroup> = []
  const els = doc.elements
  let i = els.indexOf(vectorEl) + 1
  while (i < els.length) {
    const el = els[i]
    if (el.name === 'path') {
      paths.push(parsePathElement(el))
      i += 1
    } else if (el.name === 'group') {
      const sub = parseGroupElement(el, els, i)
      paths.push(sub.group)
      i = sub.endIdx
    } else {
      break
    }
  }

  return { viewportWidth: vw, viewportHeight: vh, paths }
}

function renderPath(ctx: CanvasRenderingContext2D, p: VectorPath): void {
  if (!p.pathData) return
  try {
    const path2d = new Path2D(p.pathData)
    if (p.fillColor) {
      ctx.globalAlpha = p.fillAlpha
      ctx.fillStyle = p.fillColor
      ctx.fill(path2d)
    }
    if (p.strokeColor && p.strokeWidth > 0) {
      ctx.globalAlpha = p.strokeAlpha
      ctx.strokeStyle = p.strokeColor
      ctx.lineWidth = p.strokeWidth
      ctx.stroke(path2d)
    }
    ctx.globalAlpha = 1
  } catch {
    // pathData 解析失败跳过
  }
}

function renderGroup(ctx: CanvasRenderingContext2D, g: VectorGroup): void {
  ctx.save()
  ctx.translate(g.translateX, g.translateY)
  if (g.rotation !== 0) {
    ctx.translate(g.pivotX, g.pivotY)
    ctx.rotate((g.rotation * Math.PI) / 180)
    ctx.translate(-g.pivotX, -g.pivotY)
  }
  ctx.scale(g.scaleX, g.scaleY)
  for (const child of g.children) {
    if (isGroup(child)) renderGroup(ctx, child)
    else renderPath(ctx, child)
  }
  ctx.restore()
}

export function renderVectorToCanvas(
  vector: VectorDrawable,
  canvas: HTMLCanvasElement,
  size: number,
): void {
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const scaleX = size / vector.viewportWidth
  const scaleY = size / vector.viewportHeight
  ctx.scale(scaleX, scaleY)

  for (const item of vector.paths) {
    if (isGroup(item)) renderGroup(ctx, item)
    else renderPath(ctx, item)
  }
}

export function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('canvas toBlob 失败')); return }
      blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf))).catch(reject)
    }, 'image/png')
  })
}
