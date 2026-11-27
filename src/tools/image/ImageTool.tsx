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
} from './imageUtils'
import type { ImageMimeType, OutputFormat } from './imageUtils'
import './ImageTool.css'

const MAX_FILE_COUNT = 20
const MAX_FILE_SIZE = 20 * 1024 * 1024
const MAX_TOTAL_SIZE = 100 * 1024 * 1024

const FORMAT_LABELS: Record<ImageMimeType, string> = {
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
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
  error?: string
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
      else reject(new Error('无法读取图片尺寸'))
    }
    image.onerror = () => {
      cleanUp()
      reject(new Error('图片读取失败，文件可能已损坏或格式不正确'))
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
          reject(new Error('浏览器未能生成图片，请尝试降低输出尺寸'))
          return
        }
        if (blob.type !== type) {
          reject(new Error(`当前浏览器不支持导出 ${FORMAT_LABELS[type]} 格式`))
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
  if (!context) throw new Error('无法创建图片画布，请尝试降低输出尺寸')

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

function parseMaxDimension(value: string, label: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const parsed = Number(trimmed)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label}需为大于 0 的整数，或留空表示不限制`)
  }
  return parsed
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : '图片处理失败，请重试'
}

export default function ImageTool() {
  const [items, setItems] = useState<ImageItem[]>([])
  const [settings, setSettings] = useState<OutputSettings>({
    format: 'original',
    quality: 85,
    maxWidth: '',
    maxHeight: '',
    keepAspectRatio: true,
  })
  const [uploadErrors, setUploadErrors] = useState<string[]>([])
  const [processError, setProcessError] = useState('')
  const [settingsNotice, setSettingsNotice] = useState('')
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
      patchItem(id, { status: 'error', progress: 0, error: getErrorMessage(error) })
    }
  }

  const addFiles = (incomingFiles: File[]): void => {
    if (isBusy || incomingFiles.length === 0) return

    const errors: string[] = []
    const accepted: ImageItem[] = []
    let totalSize = items.reduce((sum, item) => sum + item.file.size, 0)
    let countRejected = 0

    for (const file of incomingFiles) {
      if (items.length + accepted.length >= MAX_FILE_COUNT) {
        countRejected += 1
        continue
      }
      if (!isSupportedImageType(file.type)) {
        errors.push(`${file.name}：仅支持 JPEG、PNG、WebP 格式`)
        continue
      }
      if (file.size === 0) {
        errors.push(`${file.name}：文件为空`)
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}：单张图片不能超过 ${formatBytes(MAX_FILE_SIZE)}`)
        continue
      }
      if (totalSize + file.size > MAX_TOTAL_SIZE) {
        errors.push(`${file.name}：添加后将超过 ${formatBytes(MAX_TOTAL_SIZE)} 的总大小限制`)
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
      errors.push(`最多添加 ${MAX_FILE_COUNT} 张图片，本次有 ${countRejected} 张未加入`)
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
    setProcessError('')
    if (items.length === 1) {
      setSettingsNotice('')
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
    setProcessError('')
    setSettingsNotice('')
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
    setProcessError('')
    if (hadResults) setSettingsNotice('输出设置已更改，旧结果已清除，请重新处理图片。')
  }

  const processImages = async (): Promise<void> => {
    if (isBusy || isReading) return
    setProcessError('')
    setSettingsNotice('')

    let preparedSettings: PreparedSettings
    try {
      preparedSettings = {
        format: settings.format,
        quality: settings.quality,
        maxWidth: parseMaxDimension(settings.maxWidth, '最大宽度'),
        maxHeight: parseMaxDimension(settings.maxHeight, '最大高度'),
        keepAspectRatio: settings.keepAspectRatio,
      }
    } catch (error) {
      setProcessError(getErrorMessage(error))
      return
    }

    const candidates = items.filter((item) => item.status !== 'reading' && item.width > 0 && item.height > 0)
    if (candidates.length === 0) {
      setProcessError('请先添加可正常读取的图片')
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
            error: getErrorMessage(error),
          })
        }
      }
      if (failedCount > 0) setProcessError(`${failedCount} 张图片处理失败，可调整设置后重试`)
    } finally {
      if (!disposedRef.current && processingRunRef.current === runId) setIsProcessing(false)
    }
  }

  const downloadAll = async (): Promise<void> => {
    if (isBusy || completedCount === 0) return
    setIsZipping(true)
    setZipProgress(0)
    setProcessError('')

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
      downloadFile(zipUrl, '图片处理结果.zip')
      window.setTimeout(() => revokeObjectUrl(zipUrl), 1000)
    } catch {
      if (!disposedRef.current) setProcessError('打包下载失败，请重试或逐个下载')
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
              aria-label="选择 JPEG、PNG 或 WebP 图片"
              onChange={(event) => {
                const files = Array.from(event.target.files ?? [])
                event.target.value = ''
                addFiles(files)
              }}
            />
            <span className="image-upload-icon"><Upload size={25} strokeWidth={1.8} /></span>
            <div className="image-upload-copy">
              <h2>{isDragging ? '松开即可添加图片' : '点击选择，或拖拽图片到这里'}</h2>
              <p>JPEG、PNG、WebP · 最多 {MAX_FILE_COUNT} 张 · 单张不超过 {formatBytes(MAX_FILE_SIZE)}</p>
            </div>
            <span className="image-upload-local"><ShieldCheck size={14} />图片不会上传</span>
          </div>

          {uploadErrors.length > 0 && (
            <div className="image-error-summary" role="alert">
              <AlertCircle size={19} />
              <div>
                <strong>部分文件未能添加</strong>
                <ul>{uploadErrors.map((error, index) => <li key={`${index}-${error}`}>{error}</li>)}</ul>
              </div>
              <button type="button" onClick={() => setUploadErrors([])} aria-label="关闭上传错误提示"><X size={16} /></button>
            </div>
          )}

          {items.length > 0 && (
            <section className="image-list-section" aria-labelledby="image-list-heading">
              <div className="image-list-toolbar">
                <div>
                  <h2 id="image-list-heading">图片列表</h2>
                  <span>{items.length} / {MAX_FILE_COUNT}</span>
                </div>
                <button className="button button-ghost" type="button" onClick={clearImages} disabled={isBusy}>
                  <Trash2 size={15} />清空全部
                </button>
              </div>

              <ul className="image-list">
                {items.map((item) => {
                  const output = item.output
                  const sizeChange = output ? getSizeChangePercent(item.file.size, output.blob.size) : 0
                  const sizeChangeLabel = !output
                    ? ''
                    : output.blob.size === item.file.size
                      ? '大小不变'
                      : sizeChange === 0
                        ? '大小变化不到 1%'
                        : sizeChange > 0
                          ? `增加 ${sizeChange}%`
                          : `减少 ${Math.abs(sizeChange)}%`

                  return (
                    <li className="image-item" data-status={item.status} key={item.id}>
                      <div className="image-preview">
                        {item.width > 0
                          ? <img src={item.previewUrl} alt={`${item.file.name} 缩略图`} />
                          : <FileImage size={31} strokeWidth={1.4} aria-label="正在读取图片" />}
                        <span>{FORMAT_LABELS[item.sourceType]}</span>
                      </div>

                      <div className="image-item-body">
                        <div className="image-item-name-row">
                          <h3 title={item.file.name}>{item.file.name}</h3>
                          <span className={`image-status image-status-${item.status}`}>
                            {item.status === 'reading' && <><LoaderCircle className="image-spin" size={13} />读取中</>}
                            {item.status === 'ready' && '等待处理'}
                            {item.status === 'processing' && '正在处理'}
                            {item.status === 'done' && <><CheckCircle2 size={13} />已完成</>}
                            {item.status === 'error' && <><AlertCircle size={13} />失败</>}
                          </span>
                        </div>
                        <p className="image-original-meta">
                          原始：{item.width > 0 ? `${item.width} × ${item.height} · ` : ''}{formatBytes(item.file.size)}
                        </p>

                        {item.status === 'processing' && (
                          <div className="image-progress-row">
                            <div
                              className="image-progress"
                              role="progressbar"
                              aria-label={`${item.file.name} 处理进度`}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={item.progress}
                            >
                              <span style={{ width: `${item.progress}%` }} />
                            </div>
                            <span>{item.progress}%</span>
                          </div>
                        )}

                        {item.error && <p className="image-item-error" role="alert">{item.error}</p>}

                        {output && (
                          <div className="image-output-summary">
                            <div>
                              <span>输出：{FORMAT_LABELS[output.type]}</span>
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
                          aria-label={output ? `下载 ${output.fileName}` : `${item.file.name} 尚未生成下载文件`}
                        >
                          <Download size={16} /><span>下载</span>
                        </button>
                        <button
                          className="image-delete-button"
                          type="button"
                          onClick={() => removeImage(item.id)}
                          disabled={isBusy}
                          aria-label={`删除 ${item.file.name}`}
                          title="删除图片"
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

        <aside className="image-settings-panel" aria-label="图片输出设置">
          <div className="image-settings-heading">
            <span><Settings2 size={19} /></span>
            <div><h2>输出设置</h2><p>统一应用到全部图片</p></div>
          </div>

          <fieldset className="image-settings-fields" disabled={isBusy}>
            <label className="image-field">
              <span className="image-field-label">输出格式</span>
              <select
                value={settings.format}
                onChange={(event) => updateSettings({ format: event.target.value as OutputFormat })}
              >
                <option value="original">保持原格式</option>
                <option value="image/jpeg">JPEG (.jpg)</option>
                <option value="image/png">PNG (.png)</option>
                <option value="image/webp">WebP (.webp)</option>
              </select>
            </label>

            <div className="image-field">
              <label className="image-quality-label" htmlFor="image-quality-range">
                <span className="image-field-label">输出质量</span>
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
              <div className="image-range-labels"><span>更小文件</span><span>更高质量</span></div>
              {settings.format === 'image/png' && <p className="image-field-hint">PNG 为无损格式，质量滑杆不影响输出。</p>}
            </div>

            <div className="image-field">
              <span className="image-field-label">最大输出尺寸</span>
              <div className="image-dimension-inputs">
                <label>
                  <span className="sr-only">最大宽度</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    placeholder="原始宽度"
                    value={settings.maxWidth}
                    onChange={(event) => updateSettings({ maxWidth: event.target.value })}
                  />
                  <span>W px</span>
                </label>
                <span className="image-dimension-cross">×</span>
                <label>
                  <span className="sr-only">最大高度</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    placeholder="原始高度"
                    value={settings.maxHeight}
                    onChange={(event) => updateSettings({ maxHeight: event.target.value })}
                  />
                  <span>H px</span>
                </label>
              </div>
              <p className="image-field-hint">留空则不限制，输出不会放大原图。</p>
            </div>

            <label className="image-switch-row">
              <span><strong>保持宽高比</strong><small>避免图片拉伸变形</small></span>
              <input
                type="checkbox"
                role="switch"
                checked={settings.keepAspectRatio}
                onChange={(event) => updateSettings({ keepAspectRatio: event.target.checked })}
              />
              <span className="image-switch-control" aria-hidden="true"><span /></span>
            </label>
          </fieldset>

          {settingsNotice && <p className="image-settings-notice" role="status"><RefreshCw size={14} />{settingsNotice}</p>}
          {processError && <p className="image-process-error" role="alert"><AlertCircle size={16} />{processError}</p>}

          <div className="image-main-actions">
            <button
              className="button button-primary button-large"
              type="button"
              onClick={() => { void processImages() }}
              disabled={isBusy || isReading || processableCount === 0}
            >
              {isProcessing ? <LoaderCircle className="image-spin" size={18} /> : <Play size={17} fill="currentColor" />}
              {isProcessing ? '正在处理…' : completedCount > 0 ? '重新处理全部' : '开始处理'}
            </button>
            <button
              className="button button-secondary button-large"
              type="button"
              onClick={() => { void downloadAll() }}
              disabled={isBusy || completedCount === 0}
            >
              {isZipping ? <LoaderCircle className="image-spin" size={18} /> : <Package size={18} />}
              {isZipping ? `正在打包 ${zipProgress}%` : `批量下载 ZIP${completedCount > 0 ? ` (${completedCount})` : ''}`}
            </button>
          </div>

          <p className="image-processing-note" aria-live="polite">
            {isProcessing
              ? `正在逐项处理，已完成 ${completedCount} / ${processableCount}`
              : completedCount > 0
                ? `已生成 ${completedCount} 个文件，可单独或打包下载`
                : '设置完成后，点击开始处理'}
          </p>
          <div className="image-privacy-note"><LockKeyhole size={15} />Canvas 本地转换，数据不离开浏览器</div>
        </aside>
      </div>

      <div className="image-bottom-note">
        <ImageIcon size={17} />
        <span>支持透明 PNG / WebP；导出 JPEG 时，透明区域自动填充为白色。</span>
      </div>
    </div>
  )
}
