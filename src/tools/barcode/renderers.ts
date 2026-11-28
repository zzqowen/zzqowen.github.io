import QRCode from 'qrcode'
import type { QRCodeErrorCorrectionLevel } from 'qrcode'
import JsBarcode from 'jsbarcode'

export type QrDotStyle = 'square' | 'rounded' | 'dots'

export interface QrRenderOptions {
  text: string
  foreground: string
  background: string
  size: number
  margin: number
  ecl: QRCodeErrorCorrectionLevel
  dotStyle: QrDotStyle
  icon?: {
    image: HTMLImageElement
    ratio: number
    withBg: boolean
  }
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radius)
  } else {
    ctx.moveTo(x + radius, y)
    ctx.arcTo(x + w, y, x + w, y + h, radius)
    ctx.arcTo(x + w, y + h, x, y + h, radius)
    ctx.arcTo(x, y + h, x, y, radius)
    ctx.arcTo(x, y, x + w, y, radius)
    ctx.closePath()
  }
}

export function renderQr(canvas: HTMLCanvasElement, opts: QrRenderOptions): { ok: true } | { ok: false; error: string } {
  if (!opts.text.trim()) {
    return { ok: false, error: 'empty' }
  }

  let qr
  try {
    qr = QRCode.create(opts.text, { errorCorrectionLevel: opts.ecl })
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }

  const { size, data } = qr.modules
  const margin = Math.max(0, Math.floor(opts.margin))
  const total = size + margin * 2
  const canvasSize = Math.max(32, Math.floor(opts.size))
  const cell = canvasSize / total

  canvas.width = canvasSize
  canvas.height = canvasSize
  const ctx = canvas.getContext('2d')
  if (!ctx) return { ok: false, error: 'canvas' }

  // 背景
  ctx.fillStyle = opts.background
  ctx.fillRect(0, 0, canvasSize, canvasSize)

  // 码点
  ctx.fillStyle = opts.foreground
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (!data[row * size + col]) continue
      const x = (margin + col) * cell
      const y = (margin + row) * cell
      const pad = opts.dotStyle === 'square' ? 0 : cell * 0.08
      if (opts.dotStyle === 'rounded') {
        roundRectPath(ctx, x + pad, y + pad, cell - pad * 2, cell - pad * 2, cell * 0.35)
        ctx.fill()
      } else if (opts.dotStyle === 'dots') {
        ctx.beginPath()
        ctx.arc(x + cell / 2, y + cell / 2, cell / 2 - pad, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.fillRect(x + pad, y + pad, cell - pad * 2, cell - pad * 2)
      }
    }
  }

  // 中心图标
  if (opts.icon) {
    const { image, ratio, withBg } = opts.icon
    const iconBox = canvasSize * Math.min(0.32, Math.max(0.1, ratio))
    const cx = canvasSize / 2
    const cy = canvasSize / 2
    const pad = iconBox * 0.12
    if (withBg) {
      ctx.fillStyle = opts.background
      roundRectPath(ctx, cx - iconBox / 2 - pad, cy - iconBox / 2 - pad, iconBox + pad * 2, iconBox + pad * 2, iconBox * 0.22)
      ctx.fill()
    }
    ctx.save()
    roundRectPath(ctx, cx - iconBox / 2, cy - iconBox / 2, iconBox, iconBox, iconBox * 0.18)
    ctx.clip()
    // 保持图标宽高比，居中绘制
    const iw = image.naturalWidth || image.width
    const ih = image.naturalHeight || image.height
    if (iw > 0 && ih > 0) {
      const scale = Math.min(iconBox / iw, iconBox / ih)
      const dw = iw * scale
      const dh = ih * scale
      ctx.drawImage(image, cx - dw / 2, cy - dh / 2, dw, dh)
    }
    ctx.restore()
  }

  return { ok: true }
}

export type BarcodeFormat =
  | 'CODE128'
  | 'CODE39'
  | 'EAN13'
  | 'EAN8'
  | 'UPC'
  | 'ITF14'
  | 'MSI'
  | 'pharmacode'
  | 'codabar'

export interface BarcodeRenderOptions {
  text: string
  format: BarcodeFormat
  foreground: string
  background: string
  width: number
  height: number
  margin: number
  displayValue: boolean
  fontSize: number
}

export function renderBarcode(canvas: HTMLCanvasElement, opts: BarcodeRenderOptions): { ok: true } | { ok: false; error: string } {
  if (!opts.text) {
    return { ok: false, error: 'empty' }
  }
  try {
    JsBarcode(canvas, opts.text, {
      format: opts.format,
      lineColor: opts.foreground,
      background: opts.background,
      width: opts.width,
      height: opts.height,
      margin: opts.margin,
      displayValue: opts.displayValue,
      fontSize: opts.fontSize,
      font: 'monospace',
      textAlign: 'center',
      textPosition: 'bottom',
    })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
