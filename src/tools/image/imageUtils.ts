export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export type ImageMimeType = (typeof SUPPORTED_IMAGE_TYPES)[number]
export type OutputFormat = 'original' | ImageMimeType

export interface Dimensions {
  width: number
  height: number
}

export interface ResizeOptions {
  maxWidth?: number
  maxHeight?: number
  keepAspectRatio: boolean
}

const EXTENSIONS: Record<ImageMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export function isSupportedImageType(type: string): type is ImageMimeType {
  return (SUPPORTED_IMAGE_TYPES as readonly string[]).includes(type)
}

export function resolveOutputType(sourceType: string, format: OutputFormat): ImageMimeType {
  if (format !== 'original') return format
  if (isSupportedImageType(sourceType)) return sourceType
  throw new Error('无法识别原始图片格式')
}

export function getExtension(type: ImageMimeType): string {
  return EXTENSIONS[type]
}

export function getOutputFileName(originalName: string, outputType: ImageMimeType): string {
  const nameWithoutExtension = originalName.replace(/\.[^.]+$/, '').trim()
  const baseName = nameWithoutExtension || 'image'
  return `${baseName}-processed.${getExtension(outputType)}`
}

export function getUniqueFileName(fileName: string, usedNames: ReadonlySet<string>): string {
  if (!usedNames.has(fileName.toLocaleLowerCase())) return fileName

  const dotIndex = fileName.lastIndexOf('.')
  const baseName = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName
  const extension = dotIndex > 0 ? fileName.slice(dotIndex) : ''
  let index = 2
  let candidate = `${baseName}-${index}${extension}`

  while (usedNames.has(candidate.toLocaleLowerCase())) {
    index += 1
    candidate = `${baseName}-${index}${extension}`
  }

  return candidate
}

export function calculateOutputDimensions(
  sourceWidth: number,
  sourceHeight: number,
  { maxWidth, maxHeight, keepAspectRatio }: ResizeOptions,
): Dimensions {
  if (
    !Number.isFinite(sourceWidth) || sourceWidth <= 0
    || !Number.isFinite(sourceHeight) || sourceHeight <= 0
  ) {
    throw new Error('原始图片尺寸必须大于 0')
  }

  if (maxWidth !== undefined && (!Number.isFinite(maxWidth) || maxWidth <= 0)) {
    throw new Error('最大宽度必须大于 0')
  }
  if (maxHeight !== undefined && (!Number.isFinite(maxHeight) || maxHeight <= 0)) {
    throw new Error('最大高度必须大于 0')
  }

  if (!keepAspectRatio) {
    return {
      width: Math.max(1, Math.round(Math.min(sourceWidth, maxWidth ?? sourceWidth))),
      height: Math.max(1, Math.round(Math.min(sourceHeight, maxHeight ?? sourceHeight))),
    }
  }

  const widthRatio = maxWidth === undefined ? Number.POSITIVE_INFINITY : maxWidth / sourceWidth
  const heightRatio = maxHeight === undefined ? Number.POSITIVE_INFINITY : maxHeight / sourceHeight
  const scale = Math.min(1, widthRatio, heightRatio)

  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  }
}

export function getSizeChangePercent(originalSize: number, outputSize: number): number {
  if (originalSize <= 0) return 0
  return Math.round(((outputSize - originalSize) / originalSize) * 100)
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  if (bytes < 1024) return `${Math.round(bytes)} B`

  const units = ['KB', 'MB', 'GB'] as const
  let value = bytes / 1024
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2
  return `${value.toFixed(digits)} ${units[unitIndex]}`
}
