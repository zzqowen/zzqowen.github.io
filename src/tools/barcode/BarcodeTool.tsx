import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Download, ImagePlus, QrCode, ScanLine, Trash2, WandSparkles } from 'lucide-react'
import { useI18n } from '../../i18n/context'
import type { TranslationKey } from '../../i18n/dictionary'
import Select from '../../components/Select'
import type { SelectOption } from '../../components/Select'
import { renderQr, renderBarcode } from './renderers'
import type { BarcodeFormat, QrDotStyle } from './renderers'
import type { QRCodeErrorCorrectionLevel } from 'qrcode'
import './BarcodeTool.css'

const DEFAULT_FOREGROUND = '#17241d'
const DEFAULT_BACKGROUND = '#ffffff'

type Mode = 'qr' | 'barcode'

interface Notice {
  tone: 'neutral' | 'success' | 'error'
  key: TranslationKey
  vars?: Record<string, string | number>
}

interface IconState {
  url: string
  image: HTMLImageElement
  name: string
}

const ECL_OPTIONS: SelectOption<QRCodeErrorCorrectionLevel>[] = [
  { value: 'L', label: 'L (7%)' },
  { value: 'M', label: 'M (15%)' },
  { value: 'Q', label: 'Q (25%)' },
  { value: 'H', label: 'H (30%)' },
]

const FORMAT_OPTIONS: SelectOption<BarcodeFormat>[] = [
  { value: 'CODE128', label: 'CODE 128' },
  { value: 'CODE39', label: 'CODE 39' },
  { value: 'EAN13', label: 'EAN-13' },
  { value: 'EAN8', label: 'EAN-8' },
  { value: 'UPC', label: 'UPC-A' },
  { value: 'ITF14', label: 'ITF-14' },
  { value: 'MSI', label: 'MSI' },
  { value: 'pharmacode', label: 'Pharmacode' },
  { value: 'codabar', label: 'Codabar' },
]

function downloadCanvas(canvas: HTMLCanvasElement, fileName: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, 'image/png')
}

export default function BarcodeTool() {
  const { t } = useI18n()
  const dotOptions: SelectOption<QrDotStyle>[] = useMemo(
    () => [
      { value: 'square', label: t('barcode.dot.square') },
      { value: 'rounded', label: t('barcode.dot.rounded') },
      { value: 'dots', label: t('barcode.dot.dots') },
    ],
    [t],
  )
  const [mode, setMode] = useState<Mode>('qr')
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)
  const barcodeCanvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const iconUrlRef = useRef<string | null>(null)

  // QR 状态
  const [qrText, setQrText] = useState('https://zzqowen.github.io/')
  const [qrForeground, setQrForeground] = useState(DEFAULT_FOREGROUND)
  const [qrBackground, setQrBackground] = useState(DEFAULT_BACKGROUND)
  const [qrSize, setQrSize] = useState(320)
  const [qrMargin, setQrMargin] = useState(2)
  const [qrEcl, setQrEcl] = useState<QRCodeErrorCorrectionLevel>('M')
  const [qrDotStyle, setQrDotStyle] = useState<QrDotStyle>('square')
  const [qrIcon, setQrIcon] = useState<IconState | null>(null)
  const [qrIconRatio, setQrIconRatio] = useState(22)
  const [qrIconWithBg, setQrIconWithBg] = useState(true)

  // 条码状态
  const [barText, setBarText] = useState('123456789012')
  const [barFormat, setBarFormat] = useState<BarcodeFormat>('CODE128')
  const [barForeground, setBarForeground] = useState(DEFAULT_FOREGROUND)
  const [barBackground, setBarBackground] = useState(DEFAULT_BACKGROUND)
  const [barWidth, setBarWidth] = useState(2)
  const [barHeight, setBarHeight] = useState(100)
  const [barMargin, setBarMargin] = useState(10)
  const [barDisplayValue, setBarDisplayValue] = useState(true)
  const [barFontSize, setBarFontSize] = useState(16)

  const [notice, setNotice] = useState<Notice | null>(null)
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null)

  // 渲染 QR
  useEffect(() => {
    const canvas = qrCanvasRef.current
    if (!canvas) return
    const result = renderQr(canvas, {
      text: qrText,
      foreground: qrForeground,
      background: qrBackground,
      size: qrSize,
      margin: qrMargin,
      ecl: qrEcl,
      dotStyle: qrDotStyle,
      icon: qrIcon
        ? { image: qrIcon.image, ratio: qrIconRatio / 100, withBg: qrIconWithBg }
        : undefined,
    })
    if (!result.ok) {
      setErrorKey(result.error === 'empty' ? 'barcode.errorEmpty' : 'barcode.errorQrFailed')
      // 清空画布
      const ctx = canvas.getContext('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
    } else {
      setErrorKey(null)
    }
  }, [qrText, qrForeground, qrBackground, qrSize, qrMargin, qrEcl, qrDotStyle, qrIcon, qrIconRatio, qrIconWithBg])

  // 渲染条码
  useEffect(() => {
    const canvas = barcodeCanvasRef.current
    if (!canvas) return
    const result = renderBarcode(canvas, {
      text: barText,
      format: barFormat,
      foreground: barForeground,
      background: barBackground,
      width: barWidth,
      height: barHeight,
      margin: barMargin,
      displayValue: barDisplayValue,
      fontSize: barFontSize,
    })
    if (!result.ok) {
      setErrorKey(result.error === 'empty' ? 'barcode.errorEmpty' : 'barcode.errorBarcodeFailed')
      const ctx = canvas.getContext('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
    } else {
      setErrorKey(null)
    }
  }, [barText, barFormat, barForeground, barBackground, barWidth, barHeight, barMargin, barDisplayValue, barFontSize])

  // 卸载时清理图标 URL
  useEffect(() => {
    return () => {
      if (iconUrlRef.current) URL.revokeObjectURL(iconUrlRef.current)
    }
  }, [])

  const handleIconUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setNotice({ tone: 'error', key: 'barcode.errorNotImage' })
      return
    }
    if (iconUrlRef.current) {
      URL.revokeObjectURL(iconUrlRef.current)
      iconUrlRef.current = null
    }
    const url = URL.createObjectURL(file)
    iconUrlRef.current = url
    const img = new Image()
    img.onload = () => {
      setQrIcon({ url, image: img, name: file.name })
      setNotice({ tone: 'success', key: 'barcode.noticeIconAdded', vars: { name: file.name } })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      iconUrlRef.current = null
      setNotice({ tone: 'error', key: 'barcode.errorIconLoad' })
    }
    img.src = url
    event.target.value = ''
  }

  const removeIcon = () => {
    if (iconUrlRef.current) {
      URL.revokeObjectURL(iconUrlRef.current)
      iconUrlRef.current = null
    }
    setQrIcon(null)
  }

  const handleDownload = () => {
    const canvas = mode === 'qr' ? qrCanvasRef.current : barcodeCanvasRef.current
    if (!canvas) return
    const name = mode === 'qr' ? 'qrcode.png' : `barcode-${barFormat.toLowerCase()}.png`
    downloadCanvas(canvas, name)
    setNotice({ tone: 'success', key: 'barcode.noticeDownloaded', vars: { name } })
  }

  const resetColors = () => {
    if (mode === 'qr') {
      setQrForeground(DEFAULT_FOREGROUND)
      setQrBackground(DEFAULT_BACKGROUND)
    } else {
      setBarForeground(DEFAULT_FOREGROUND)
      setBarBackground(DEFAULT_BACKGROUND)
    }
  }

  const sample = useMemo(() => (mode === 'qr' ? 'https://zzqowen.github.io/' : '123456789012'), [mode])

  return (
    <div className="barcode-tool">
      <div className="barcode-tabs" role="tablist" aria-label={t('barcode.tabsAria')}>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'qr'}
          className={`barcode-tab${mode === 'qr' ? ' is-active' : ''}`}
          onClick={() => { setMode('qr'); setErrorKey(null) }}
        >
          <QrCode size={16} /> {t('barcode.tabQr')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'barcode'}
          className={`barcode-tab${mode === 'barcode' ? ' is-active' : ''}`}
          onClick={() => { setMode('barcode'); setErrorKey(null) }}
        >
          <ScanLine size={16} /> {t('barcode.tabBarcode')}
        </button>
      </div>

      <div className="barcode-layout">
        <div className="barcode-panel">
          <label className="barcode-field">
            <span className="barcode-label">{t('barcode.content')}</span>
            {mode === 'qr' ? (
              <textarea
                className="barcode-input barcode-textarea"
                value={qrText}
                onChange={(e) => setQrText(e.target.value)}
                placeholder={t('barcode.qrPlaceholder')}
                aria-label={t('barcode.content')}
                rows={3}
              />
            ) : (
              <input
                className="barcode-input"
                value={barText}
                onChange={(e) => setBarText(e.target.value)}
                placeholder={t('barcode.barcodePlaceholder')}
                aria-label={t('barcode.content')}
              />
            )}
          </label>

          <div className="barcode-colors">
            <label className="barcode-color">
              <span className="barcode-label">{t('barcode.foreground')}</span>
              <span className="barcode-color-row">
                <input
                  type="color"
                  value={mode === 'qr' ? qrForeground : barForeground}
                  onChange={(e) => (mode === 'qr' ? setQrForeground(e.target.value) : setBarForeground(e.target.value))}
                  aria-label={t('barcode.foreground')}
                />
                <input
                  type="text"
                  className="barcode-color-text"
                  value={mode === 'qr' ? qrForeground : barForeground}
                  onChange={(e) => (mode === 'qr' ? setQrForeground(e.target.value) : setBarForeground(e.target.value))}
                  aria-label={t('barcode.foregroundHex')}
                />
              </span>
            </label>
            <label className="barcode-color">
              <span className="barcode-label">{t('barcode.background')}</span>
              <span className="barcode-color-row">
                <input
                  type="color"
                  value={mode === 'qr' ? qrBackground : barBackground}
                  onChange={(e) => (mode === 'qr' ? setQrBackground(e.target.value) : setBarBackground(e.target.value))}
                  aria-label={t('barcode.background')}
                />
                <input
                  type="text"
                  className="barcode-color-text"
                  value={mode === 'qr' ? qrBackground : barBackground}
                  onChange={(e) => (mode === 'qr' ? setQrBackground(e.target.value) : setBarBackground(e.target.value))}
                  aria-label={t('barcode.backgroundHex')}
                />
              </span>
            </label>
            <button type="button" className="button button-ghost barcode-reset" onClick={resetColors}>
              <WandSparkles size={14} /> {t('barcode.resetColors')}
            </button>
          </div>

          {mode === 'qr' ? (
            <div className="barcode-settings">
              <label className="barcode-field">
                <span className="barcode-label">{t('barcode.size')}</span>
                <input
                  type="range" min={120} max={640} step={8}
                  value={qrSize}
                  onChange={(e) => setQrSize(Number(e.target.value))}
                  aria-label={t('barcode.size')}
                />
                <span className="barcode-value">{qrSize}px</span>
              </label>
              <label className="barcode-field">
                <span className="barcode-label">{t('barcode.margin')}</span>
                <input
                  type="range" min={0} max={8} step={1}
                  value={qrMargin}
                  onChange={(e) => setQrMargin(Number(e.target.value))}
                  aria-label={t('barcode.margin')}
                />
                <span className="barcode-value">{qrMargin}</span>
              </label>
              <label className="barcode-field">
                <span className="barcode-label">{t('barcode.ecl')}</span>
                <Select value={qrEcl} options={ECL_OPTIONS} onChange={setQrEcl} ariaLabel={t('barcode.ecl')} variant="field" />
              </label>
              <label className="barcode-field">
                <span className="barcode-label">{t('barcode.dotStyle')}</span>
                <Select value={qrDotStyle} options={dotOptions} onChange={setQrDotStyle} ariaLabel={t('barcode.dotStyle')} variant="field" />
              </label>

              <div className="barcode-icon-section">
                <span className="barcode-label">{t('barcode.icon')}</span>
                {qrIcon ? (
                  <div className="barcode-icon-chosen">
                    <img src={qrIcon.url} alt={qrIcon.name} />
                    <div className="barcode-icon-info">
                      <span className="barcode-icon-name">{qrIcon.name}</span>
                      <button type="button" className="button button-ghost" onClick={removeIcon}>
                        <Trash2 size={13} /> {t('barcode.removeIcon')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" className="button button-secondary" onClick={() => fileInputRef.current?.click()}>
                    <ImagePlus size={15} /> {t('barcode.uploadIcon')}
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleIconUpload}
                  style={{ display: 'none' }}
                />
                {qrIcon && (
                  <>
                    <label className="barcode-field">
                      <span className="barcode-label">{t('barcode.iconSize')}</span>
                      <input
                        type="range" min={10} max={32} step={1}
                        value={qrIconRatio}
                        onChange={(e) => setQrIconRatio(Number(e.target.value))}
                        aria-label={t('barcode.iconSize')}
                      />
                      <span className="barcode-value">{qrIconRatio}%</span>
                    </label>
                    <label className="barcode-checkbox">
                      <input
                        type="checkbox"
                        checked={qrIconWithBg}
                        onChange={(e) => setQrIconWithBg(e.target.checked)}
                      />
                      {t('barcode.iconBg')}
                    </label>
                  </>
                )}
                {qrIcon && (qrEcl === 'L' || qrEcl === 'M') && (
                  <p className="barcode-hint">{t('barcode.iconEclHint')}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="barcode-settings">
              <label className="barcode-field">
                <span className="barcode-label">{t('barcode.format')}</span>
                <Select value={barFormat} options={FORMAT_OPTIONS} onChange={setBarFormat} ariaLabel={t('barcode.format')} variant="field" />
              </label>
              <label className="barcode-field">
                <span className="barcode-label">{t('barcode.barWidth')}</span>
                <input
                  type="range" min={1} max={6} step={1}
                  value={barWidth}
                  onChange={(e) => setBarWidth(Number(e.target.value))}
                  aria-label={t('barcode.barWidth')}
                />
                <span className="barcode-value">{barWidth}px</span>
              </label>
              <label className="barcode-field">
                <span className="barcode-label">{t('barcode.barHeight')}</span>
                <input
                  type="range" min={40} max={240} step={10}
                  value={barHeight}
                  onChange={(e) => setBarHeight(Number(e.target.value))}
                  aria-label={t('barcode.barHeight')}
                />
                <span className="barcode-value">{barHeight}px</span>
              </label>
              <label className="barcode-field">
                <span className="barcode-label">{t('barcode.margin')}</span>
                <input
                  type="range" min={0} max={30} step={1}
                  value={barMargin}
                  onChange={(e) => setBarMargin(Number(e.target.value))}
                  aria-label={t('barcode.margin')}
                />
                <span className="barcode-value">{barMargin}px</span>
              </label>
              <label className="barcode-field">
                <span className="barcode-label">{t('barcode.fontSize')}</span>
                <input
                  type="range" min={10} max={28} step={1}
                  value={barFontSize}
                  onChange={(e) => setBarFontSize(Number(e.target.value))}
                  disabled={!barDisplayValue}
                  aria-label={t('barcode.fontSize')}
                />
                <span className="barcode-value">{barFontSize}px</span>
              </label>
              <label className="barcode-checkbox">
                <input
                  type="checkbox"
                  checked={barDisplayValue}
                  onChange={(e) => setBarDisplayValue(e.target.checked)}
                />
                {t('barcode.showText')}
              </label>
            </div>
          )}

          <button
            type="button"
            className="button button-ghost"
            onClick={() => (mode === 'qr' ? setQrText(sample) : setBarText(sample))}
          >
            {t('barcode.sample')}
          </button>
        </div>

        <div className="barcode-preview">
          <div className="barcode-preview-card">
            {errorKey && (
              <div className="barcode-error">
                {t(errorKey)}
                {errorKey === 'barcode.errorBarcodeFailed' && (
                  <span className="barcode-error-sub">{t('barcode.errorBarcodeHint')}</span>
                )}
              </div>
            )}
            <div className="barcode-canvas-wrap">
              {mode === 'qr' ? (
                <canvas ref={qrCanvasRef} className="barcode-canvas" />
              ) : (
                <canvas ref={barcodeCanvasRef} className="barcode-canvas barcode-canvas--barcode" />
              )}
            </div>
          </div>
          <div className="barcode-actions">
            <button type="button" className="button button-primary" onClick={handleDownload} disabled={!!errorKey}>
              <Download size={16} /> {t('barcode.download')}
            </button>
          </div>
          {notice && (
            <p className={`barcode-notice barcode-notice--${notice.tone}`}>
              {notice.vars ? t(notice.key, notice.vars) : t(notice.key)}
            </p>
          )}
          <p className="barcode-privacy">{t('barcode.privacy')}</p>
        </div>
      </div>
    </div>
  )
}
