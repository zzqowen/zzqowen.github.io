import { useEffect, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import JSZip from 'jszip'
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileImage,
  Image as ImageIcon,
  LoaderCircle,
  LockKeyhole,
  Package,
  Play,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import {
  calculateOutputDimensions,
  formatBytes,
  getOutputFileName,
  getSizeChangePercent,
  getUniqueFileName,
  isSupportedImageType,
  resolveOutputType,
  shouldKeepOriginal,
} from './imageUtils'
import type { ImageMimeType, OutputFormat } from './imageUtils'
import { useI18n } from '../../i18n/context'
import type { TranslationKey } from '../../i18n/dictionary'
import Select from '../../components/Select'
import './ImageTool.css'

const MAX_FILE_COUNT = 20
const MAX_FILE_SIZE = 20 * 1024 * 1024
const MAX_TOTAL_SIZE = 100 * 1024 * 1024

const FORMAT_LABELS: Record<ImageMimeType, string> = {
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
}

interface Message {
  key: TranslationKey
  vars?: Record<string, string | number>
}

const UTIL_ERROR_KEYS: Record<string, TranslationKey> = {
  '无法识别原始图片格式': 'image.errorUnknownFormat',
  '原始图片尺寸必须大于 0': 'image.errorSourceDimensions',
  '最大宽度必须大于 0': 'image.errorMaxWidthZero',
  '最大高度必须大于 0': 'image.errorMaxHeightZero',
}

class LocalizedError extends Error {
  key: TranslationKey
  vars?: Record<string, string | number>

  constructor(key: TranslationKey, vars?: Record<string, string | number>) {
    super(key)
    this.name = 'LocalizedError'
    this.key = key
    this.vars = vars
  }
}

function toErrorMessage(error: unknown): Message {
  if (error instanceof LocalizedError) return { key: error.key, vars: error.vars }
  if (error instanceof Error) {
    const key = UTIL_ERROR_KEYS[error.message]
    if (key) return { key }
  }
  return { key: 'image.errorGeneric' }
}

interface OutputSettings {
  format: OutputFormat
  quality: number
  maxWidth: string
  maxHeight: string
  keepAspectRatio: boolean
}

interface ProcessedImage {
  blob: Blob
  url: string
  fileName: string
  type: ImageMimeType
  width: number
  height: number
  keptOriginal?: boolean
}

interface ImageItem {
  id: string
  file: File
  sourceType: ImageMimeType
  previewUrl: string
  width: number
  height: number
  status: 'reading' | 'ready' | 'processing' | 'done' | 'error'
  progress: number
  error?: Message
  output?: ProcessedImage
}

interface PreparedSettings {
  format: OutputFormat
  quality: number
  maxWidth?: number
  maxHeight?: number
  keepAspectRatio: boolean
}

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const cleanUp = () => {
      image.onload = null
      image.onerror = null
    }

    image.onload = () => {
      cleanUp()
      if (image.naturalWidth > 0 && image.naturalHeight > 0) resolve(image)
      else reject(new LocalizedError('image.errorReadDimensions'))
    }
    image.onerror = () => {
      cleanUp()
      reject(new LocalizedError('image.errorReadFailed'))
    }
    image.decoding = 'async'
    image.src = url
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: ImageMimeType, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new LocalizedError('image.errorCanvasBlob'))
          return
        }
        if (blob.type !== type) {
          reject(new LocalizedError('image.errorUnsupportedExport', { format: FORMAT_LABELS[type] }))
          return
        }
        resolve(blob)
      },
      type,
      type === 'image/png' ? undefined : quality,
    )
  })
}

async function convertImage(
  item: ImageItem,
  settings: PreparedSettings,
  createObjectUrl: (blob: Blob) => string,
  onProgress: (progress: number) => void,
): Promise<ProcessedImage> {
  const outputType = resolveOutputType(item.sourceType, settings.format)
  const dimensions = calculateOutputDimensions(item.width, item.height, settings)
  const image = await loadImage(item.previewUrl)
  onProgress(40)

  const canvas = document.createElement('canvas')
  canvas.width = dimensions.width
  canvas.height = dimensions.height
  const context = canvas.getContext('2d')
  if (!context) throw new LocalizedError('image.errorCanvasContext')

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  if (outputType === 'image/jpeg') {
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, dimensions.width, dimensions.height)
  }
  context.drawImage(image, 0, 0, dimensions.width, dimensions.height)
  onProgress(72)

  const blob = await canvasToBlob(canvas, outputType, settings.quality / 100)
  canvas.width = 0
  canvas.height = 0
  onProgress(92)

  // 同格式同尺寸时，如果重新编码没有得到更小体积，直接保留原图，避免压缩后反而变大
  if (shouldKeepOriginal(
    item.file.size,
    blob.size,
    { width: item.width, height: item.height },
    dimensions,
    item.sourceType,
    outputType,
  )) {
    return {
      blob: item.file,
      url: createObjectUrl(item.file),
      fileName: getOutputFileName(item.file.name, outputType),
      type: outputType,
      width: item.width,
      height: item.height,
      keptOriginal: true,
    }
  }

  return {
    blob,
    url: createObjectUrl(blob),
    fileName: getOutputFileName(item.file.name, outputType),
    type: outputType,
    width: dimensions.width,
    height: dimensions.height,
  }
}

function downloadFile(url: string, fileName: string): void {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

function parseMaxDimension(value: string, dimension: 'width' | 'height'): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const parsed = Number(trimmed)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new LocalizedError(dimension === 'width' ? 'image.errorInvalidMaxWidth' : 'image.errorInvalidMaxHeight')
  }
  return parsed
}

export default function ImageTool() {
  const { language, t } = useI18n()
  const [items, setItems] = useState<ImageItem[]>([])
  const [settings, setSettings] = useState<OutputSettings>({
    format: 'original',
    quality: 85,
    maxWidth: '',
    maxHeight: '',
    keepAspectRatio: true,
  })
  const [uploadErrors, setUploadErrors] = useState<Message[]>([])
  const [processError, setProcessError] = useState<Message | null>(null)
  const [settingsNotice, setSettingsNotice] = useState<Message | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isZipping, setIsZipping] = useState(false)
  const [zipProgress, setZipProgress] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepthRef = useRef(0)
  const objectUrlsRef = useRef<Set<string>>(new Set())
  const processingRunRef = useRef(0)
  const disposedRef = useRef(false)

  const isBusy = isProcessing || isZipping
  const isReading = items.some((item) => item.status === 'reading')
  const processableCount = items.filter((item) => item.status !== 'reading' && item.width > 0).length
  const completedCount = items.filter((item) => item.output).length

  useEffect(() => {
    disposedRef.current = false
    const objectUrls = objectUrlsRef.current
    return () => {
      disposedRef.current = true
      processingRunRef.current += 1
      objectUrls.forEach((url) => URL.revokeObjectURL(url))
      objectUrls.clear()
    }
  }, [])

  const createObjectUrl = (blob: Blob): string => {
    const url = URL.createObjectURL(blob)
    objectUrlsRef.current.add(url)
    return url
  }

  const revokeObjectUrl = (url: string): void => {
    if (objectUrlsRef.current.delete(url)) URL.revokeObjectURL(url)
  }

  const patchItem = (id: string, patch: Partial<ImageItem>): void => {
    setItems((currentItems) => currentItems.map((item) => (
      item.id === id ? { ...item, ...patch } : item
    )))
  }

  const inspectImage = async (id: string, previewUrl: string): Promise<void> => {
    try {
      const image = await loadImage(previewUrl)
      if (disposedRef.current) return
      patchItem(id, {
        width: image.naturalWidth,
        height: image.naturalHeight,
        status: 'ready',
        progress: 0,
      })
    } catch (error) {
      if (disposedRef.current) return
      patchItem(id, { status: 'error', progress: 0, error: toErrorMessage(error) })
    }
  }

  const addFiles = (incomingFiles: File[]): void => {
    if (isBusy || incomingFiles.length === 0) return

    const errors: Message[] = []
    const accepted: ImageItem[] = []
    let totalSize = items.reduce((sum, item) => sum + item.file.size, 0)
    let countRejected = 0

    for (const file of incomingFiles) {
      if (items.length + accepted.length >= MAX_FILE_COUNT) {
        countRejected += 1
        continue
      }
      if (!isSupportedImageType(file.type)) {
        errors.push({ key: 'image.errorUnsupportedType', vars: { name: file.name } })
        continue
      }
      if (file.size === 0) {
        errors.push({ key: 'image.errorEmptyFile', vars: { name: file.name } })
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push({
          key: 'image.errorFileTooLarge',
          vars: { name: file.name, size: formatBytes(MAX_FILE_SIZE) },
        })
        continue
      }
      if (totalSize + file.size > MAX_TOTAL_SIZE) {
        errors.push({
          key: 'image.errorTotalTooLarge',
          vars: { name: file.name, size: formatBytes(MAX_TOTAL_SIZE) },
        })
        continue
      }

      const previewUrl = createObjectUrl(file)
      accepted.push({
        id: createId(),
        file,
        sourceType: file.type,
        previewUrl,
        width: 0,
        height: 0,
        status: 'reading',
        progress: 0,
      })
      totalSize += file.size
    }

    if (countRejected > 0) {
      errors.push({
        key: 'image.errorTooManyFiles',
        vars: { max: MAX_FILE_COUNT, count: countRejected },
      })
    }

    setUploadErrors(errors)
    if (accepted.length > 0) {
      setItems((currentItems) => [...currentItems, ...accepted])
      accepted.forEach((item) => { void inspectImage(item.id, item.previewUrl) })
    }
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault()
    dragDepthRef.current = 0
    setIsDragging(false)
    if (!isBusy) addFiles(Array.from(event.dataTransfer.files))
  }

  const handleDragLeave = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault()
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) setIsDragging(false)
  }

  const removeImage = (id: string): void => {
    if (isBusy) return
    const target = items.find((item) => item.id === id)
    if (!target) return
    revokeObjectUrl(target.previewUrl)
    if (target.output) revokeObjectUrl(target.output.url)
    setItems((currentItems) => currentItems.filter((item) => item.id !== id))
    setProcessError(null)
    if (items.length === 1) {
      setSettingsNotice(null)
      setUploadErrors([])
    }
  }

  const clearImages = (): void => {
    if (isBusy) return
    items.forEach((item) => {
      revokeObjectUrl(item.previewUrl)
      if (item.output) revokeObjectUrl(item.output.url)
    })
    processingRunRef.current += 1
    setItems([])
    setUploadErrors([])
    setProcessError(null)
    setSettingsNotice(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const updateSettings = (patch: Partial<OutputSettings>): void => {
    if (isBusy) return
    const hadResults = items.some((item) => item.output)
    items.forEach((item) => {
      if (item.output) revokeObjectUrl(item.output.url)
    })
    setItems((currentItems) => currentItems.map((item) => {
      if (item.status === 'reading' || item.width <= 0 || item.height <= 0) return item
      return { ...item, status: 'ready', progress: 0, error: undefined, output: undefined }
    }))
    setSettings((currentSettings) => ({ ...currentSettings, ...patch }))
    setProcessError(null)
    if (hadResults) setSettingsNotice({ key: 'image.noticeSettingsChanged' })
  }

  const processImages = async (): Promise<void> => {
    if (isBusy || isReading) return
    setProcessError(null)
    setSettingsNotice(null)

    let preparedSettings: PreparedSettings
    try {
      preparedSettings = {
        format: settings.format,
        quality: settings.quality,
        maxWidth: parseMaxDimension(settings.maxWidth, 'width'),
        maxHeight: parseMaxDimension(settings.maxHeight, 'height'),
        keepAspectRatio: settings.keepAspectRatio,
      }
    } catch (error) {
      setProcessError(toErrorMessage(error))
      return
    }

    const candidates = items.filter((item) => item.status !== 'reading' && item.width > 0 && item.height > 0)
    if (candidates.length === 0) {
      setProcessError({ key: 'image.errorNoValidImages' })
      return
    }

    const runId = ++processingRunRef.current
    const candidateIds = new Set(candidates.map((item) => item.id))
    let failedCount = 0
    setIsProcessing(true)
    candidates.forEach((item) => {
      if (item.output) revokeObjectUrl(item.output.url)
    })
    setItems((currentItems) => currentItems.map((item) => (
      candidateIds.has(item.id)
        ? { ...item, status: 'ready', progress: 0, error: undefined, output: undefined }
        : item
    )))

    try {
      for (const item of candidates) {
        if (disposedRef.current || processingRunRef.current !== runId) return
        patchItem(item.id, { status: 'processing', progress: 12, error: undefined })

        try {
          const output = await convertImage(item, preparedSettings, createObjectUrl, (progress) => {
            if (!disposedRef.current && processingRunRef.current === runId) {
              patchItem(item.id, { progress })
            }
          })
          if (disposedRef.current || processingRunRef.current !== runId) {
            revokeObjectUrl(output.url)
            return
          }
          patchItem(item.id, { status: 'done', progress: 100, output, error: undefined })
        } catch (error) {
          if (disposedRef.current || processingRunRef.current !== runId) return
          failedCount += 1
          patchItem(item.id, {
            status: 'error',
            progress: 0,
            output: undefined,
            error: toErrorMessage(error),
          })
        }
      }
      if (failedCount > 0) {
        setProcessError({ key: 'image.errorProcessFailedCount', vars: { count: failedCount } })
      }
    } finally {
      if (!disposedRef.current && processingRunRef.current === runId) setIsProcessing(false)
    }
  }

  const downloadAll = async (): Promise<void> => {
    if (isBusy || completedCount === 0) return
    setIsZipping(true)
    setZipProgress(0)
    setProcessError(null)

    try {
      const zip = new JSZip()
      const usedNames = new Set<string>()
      items.forEach((item) => {
        if (!item.output) return
        const fileName = getUniqueFileName(item.output.fileName, usedNames)
        usedNames.add(fileName.toLocaleLowerCase())
        zip.file(fileName, item.output.blob)
      })
      const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' }, (metadata) => {
        if (!disposedRef.current) setZipProgress(Math.round(metadata.percent))
      })
      if (disposedRef.current) return
      const zipUrl = createObjectUrl(blob)
      downloadFile(zipUrl, language === 'zh' ? '图片处理结果.zip' : 'processed-images.zip')
      window.setTimeout(() => revokeObjectUrl(zipUrl), 1000)
    } catch {
      if (!disposedRef.current) setProcessError({ key: 'image.errorZipFailed' })
    } finally {
      if (!disposedRef.current) setIsZipping(false)
    }
  }

  return (
    <div className="image-tool">
      <div className="image-workspace">
        <div className="image-main-column">
          <div
            className={`image-dropzone${isDragging ? ' image-dropzone-active' : ''}${items.length > 0 ? ' image-dropzone-compact' : ''}${isBusy ? ' image-dropzone-disabled' : ''}`}
            onDragEnter={(event) => {
              event.preventDefault()
              if (isBusy) return
              dragDepthRef.current += 1
              setIsDragging(true)
            }}
            onDragOver={(event) => { event.preventDefault() }}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={inputRef}
              className="image-file-input"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              multiple
              disabled={isBusy}
              aria-label={t('image.selectAria')}
              onChange={(event) => {
                const files = Array.from(event.target.files ?? [])
                event.target.value = ''
                addFiles(files)
              }}
            />
            <span className="image-upload-icon"><Upload size={25} strokeWidth={1.8} /></span>
            <div className="image-upload-copy">
              <h2>{isDragging ? t('image.dropTitleActive') : t('image.dropTitle')}</h2>
              <p>{t('image.dropHint', { count: MAX_FILE_COUNT, size: formatBytes(MAX_FILE_SIZE) })}</p>
            </div>
            <span className="image-upload-local"><ShieldCheck size={14} />{t('image.dropLocal')}</span>
          </div>

          {uploadErrors.length > 0 && (
            <div className="image-error-summary" role="alert">
              <AlertCircle size={19} />
              <div>
                <strong>{t('image.errorSummaryTitle')}</strong>
                <ul>{uploadErrors.map((error, index) => <li key={`${index}-${error.key}`}>{t(error.key, error.vars)}</li>)}</ul>
              </div>
              <button type="button" onClick={() => setUploadErrors([])} aria-label={t('image.dismissErrorsAria')}><X size={16} /></button>
            </div>
          )}

          {items.length > 0 && (
            <section className="image-list-section" aria-labelledby="image-list-heading">
              <div className="image-list-toolbar">
                <div>
                  <h2 id="image-list-heading">{t('image.listTitle')}</h2>
                  <span>{items.length} / {MAX_FILE_COUNT}</span>
                </div>
                <button className="button button-ghost" type="button" onClick={clearImages} disabled={isBusy}>
                  <Trash2 size={15} />{t('image.clearAll')}
                </button>
              </div>

              <ul className="image-list">
                {items.map((item) => {
                  const output = item.output
                  const sizeChange = output ? getSizeChangePercent(item.file.size, output.blob.size) : 0
                  const sizeChangeLabel = !output
                    ? ''
                    : output.keptOriginal
                      ? t('image.sizeKeptOriginal')
                      : output.blob.size === item.file.size
                        ? t('image.sizeSame')
                        : sizeChange === 0
                          ? t('image.sizeUnderOne')
                          : sizeChange > 0
                            ? t('image.sizeIncreased', { percent: sizeChange })
                            : t('image.sizeDecreased', { percent: Math.abs(sizeChange) })

                  return (
                    <li className="image-item" data-status={item.status} key={item.id}>
                      <div className="image-preview">
                        {item.width > 0
                          ? <img src={item.previewUrl} alt={t('image.thumbnailAlt', { name: item.file.name })} />
                          : <FileImage size={31} strokeWidth={1.4} aria-label={t('image.readingImageAria')} />}
                        <span>{FORMAT_LABELS[item.sourceType]}</span>
                      </div>

                      <div className="image-item-body">
                        <div className="image-item-name-row">
                          <h3 title={item.file.name}>{item.file.name}</h3>
                          <span className={`image-status image-status-${item.status}`}>
                            {item.status === 'reading' && <><LoaderCircle className="image-spin" size={13} />{t('image.statusReading')}</>}
                            {item.status === 'ready' && t('image.statusReady')}
                            {item.status === 'processing' && t('image.statusProcessing')}
                            {item.status === 'done' && <><CheckCircle2 size={13} />{t('image.statusDone')}</>}
                            {item.status === 'error' && <><AlertCircle size={13} />{t('image.statusError')}</>}
                          </span>
                        </div>
                        <p className="image-original-meta">
                          {t('image.originalMeta', {
                            value: `${item.width > 0 ? `${item.width} × ${item.height} · ` : ''}${formatBytes(item.file.size)}`,
                          })}
                        </p>

                        {item.status === 'processing' && (
                          <div className="image-progress-row">
                            <div
                              className="image-progress"
                              role="progressbar"
                              aria-label={t('image.progressAria', { name: item.file.name })}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={item.progress}
                            >
                              <span style={{ width: `${item.progress}%` }} />
                            </div>
                            <span>{item.progress}%</span>
                          </div>
                        )}

                        {item.error && <p className="image-item-error" role="alert">{t(item.error.key, item.error.vars)}</p>}

                        {output && (
                          <div className="image-output-summary">
                            <div>
                              <span>{t('image.outputLabel', { format: FORMAT_LABELS[output.type] })}</span>
                              <strong>{output.width} × {output.height}</strong>
                              <span>{formatBytes(output.blob.size)}</span>
                            </div>
                            <span
                              className="image-size-change"
                              data-increased={output.blob.size > item.file.size}
                            >
                              {sizeChangeLabel}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="image-item-actions">
                        <button
                          className="button button-secondary image-download-one"
                          type="button"
                          disabled={!output || isBusy}
                          onClick={() => { if (output) downloadFile(output.url, output.fileName) }}
                          aria-label={output ? t('image.downloadFileAria', { name: output.fileName }) : t('image.downloadPendingAria', { name: item.file.name })}
                        >
                          <Download size={16} /><span>{t('image.download')}</span>
                        </button>
                        <button
                          className="image-delete-button"
                          type="button"
                          onClick={() => removeImage(item.id)}
                          disabled={isBusy}
                          aria-label={t('image.deleteAria', { name: item.file.name })}
                          title={t('image.deleteTitle')}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </div>

        <aside className="image-settings-panel" aria-label={t('image.settingsAria')}>
          <div className="image-settings-heading">
            <span><Settings2 size={19} /></span>
            <div><h2>{t('image.settingsTitle')}</h2><p>{t('image.settingsDesc')}</p></div>
          </div>

          <fieldset className="image-settings-fields" disabled={isBusy}>
            <div className="image-field">
              <span className="image-field-label">{t('image.formatLabel')}</span>
              <Select<OutputFormat>
                ariaLabel={t('image.formatLabel')}
                value={settings.format}
                options={[
                  { value: 'original', label: t('image.formatOriginal') },
                  { value: 'image/jpeg', label: 'JPEG (.jpg)' },
                  { value: 'image/png', label: 'PNG (.png)' },
                  { value: 'image/webp', label: 'WebP (.webp)' },
                ]}
                onChange={(nextFormat) => updateSettings({ format: nextFormat })}
              />
            </div>

            <div className="image-field">
              <label className="image-quality-label" htmlFor="image-quality-range">
                <span className="image-field-label">{t('image.qualityLabel')}</span>
                <output>{settings.quality}%</output>
              </label>
              <input
                id="image-quality-range"
                className="image-quality-range"
                type="range"
                min="1"
                max="100"
                step="1"
                value={settings.quality}
                disabled={settings.format === 'image/png'}
                onChange={(event) => updateSettings({ quality: Number(event.target.value) })}
              />
              <div className="image-range-labels"><span>{t('image.qualitySmaller')}</span><span>{t('image.qualityBetter')}</span></div>
              {settings.format === 'image/png' && <p className="image-field-hint">{t('image.qualityPngHint')}</p>}
            </div>

            <div className="image-field">
              <span className="image-field-label">{t('image.maxDimensionsLabel')}</span>
              <div className="image-dimension-inputs">
                <label>
                  <span className="sr-only">{t('image.maxWidthAria')}</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    placeholder={t('image.maxWidthPlaceholder')}
                    value={settings.maxWidth}
                    onChange={(event) => updateSettings({ maxWidth: event.target.value })}
                  />
                  <span>W px</span>
                </label>
                <span className="image-dimension-cross">×</span>
                <label>
                  <span className="sr-only">{t('image.maxHeightAria')}</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    placeholder={t('image.maxHeightPlaceholder')}
                    value={settings.maxHeight}
                    onChange={(event) => updateSettings({ maxHeight: event.target.value })}
                  />
                  <span>H px</span>
                </label>
              </div>
              <p className="image-field-hint">{t('image.maxDimensionsHint')}</p>
            </div>

            <label className="image-switch-row">
              <span><strong>{t('image.keepAspectLabel')}</strong><small>{t('image.keepAspectHint')}</small></span>
              <input
                type="checkbox"
                role="switch"
                checked={settings.keepAspectRatio}
                onChange={(event) => updateSettings({ keepAspectRatio: event.target.checked })}
              />
              <span className="image-switch-control" aria-hidden="true"><span /></span>
            </label>
          </fieldset>

          {settingsNotice && <p className="image-settings-notice" role="status"><RefreshCw size={14} />{t(settingsNotice.key, settingsNotice.vars)}</p>}
          {processError && <p className="image-process-error" role="alert"><AlertCircle size={16} />{t(processError.key, processError.vars)}</p>}

          <div className="image-main-actions">
            <button
              className="button button-primary button-large"
              type="button"
              onClick={() => { void processImages() }}
              disabled={isBusy || isReading || processableCount === 0}
            >
              {isProcessing ? <LoaderCircle className="image-spin" size={18} /> : <Play size={17} fill="currentColor" />}
              {isProcessing ? t('image.processing') : completedCount > 0 ? t('image.reprocessAll') : t('image.startProcess')}
            </button>
            <button
              className="button button-secondary button-large"
              type="button"
              onClick={() => { void downloadAll() }}
              disabled={isBusy || completedCount === 0}
            >
              {isZipping ? <LoaderCircle className="image-spin" size={18} /> : <Package size={18} />}
              {isZipping
                ? t('image.zipping', { progress: zipProgress })
                : completedCount > 0
                  ? t('image.downloadZipCount', { count: completedCount })
                  : t('image.downloadZip')}
            </button>
          </div>

          <p className="image-processing-note" aria-live="polite">
            {isProcessing
              ? t('image.noteProcessing', { done: completedCount, total: processableCount })
              : completedCount > 0
                ? t('image.noteDone', { count: completedCount })
                : t('image.noteIdle')}
          </p>
          <div className="image-privacy-note"><LockKeyhole size={15} />{t('image.privacy')}</div>
        </aside>
      </div>

      <div className="image-bottom-note">
        <ImageIcon size={17} />
        <span>{t('image.bottomNote')}</span>
      </div>
    </div>
  )
}
