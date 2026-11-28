import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import {
  AlertCircle,
  Download,
  FileCode2,
  FileQuestion,
  LoaderCircle,
  Package,
  Smartphone,
  Trash2,
  Upload,
  WandSparkles,
} from 'lucide-react'
import { parseApk } from './apkParser'
import { parseIpa } from './ipaParser'
import type { AndroidAppInfo, AppIcon, AppInfo, IosAppInfo, ParsedApp } from './types'
import { translatePermission } from './permissionsCn'
import { useI18n } from '../../i18n/context'
import type { TranslationKey } from '../../i18n/dictionary'
import './AppParser.css'

type NoticeTone = 'neutral' | 'success' | 'error'
type Notice = { tone: NoticeTone; key: TranslationKey; vars?: Record<string, string | number>; detail?: string }

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

const LOCALIZED_MESSAGES: Record<string, TranslationKey> = {
  'APK 中找不到 AndroidManifest.xml': 'app.errorNoManifest',
  'APK 中找不到字符串表': 'app.errorNoStringPool',
  'AndroidManifest.xml 过短': 'app.errorBadManifest',
  'IPA 中找不到 Payload/*.app 目录': 'app.errorNoAppDir',
  'IPA 中找不到 Info.plist': 'app.errorNoPlist',
  '二进制 plist 过短': 'app.errorBadPlist',
  '不是二进制 plist 文件': 'app.errorBadPlist',
  'plist 解析失败': 'app.errorBadPlist',
}

function errorToNotice(error: unknown): Notice {
  if (error instanceof LocalizedError) return { tone: 'error', key: error.key, vars: error.vars }
  if (error instanceof Error) {
    const mapped = LOCALIZED_MESSAGES[error.message]
    if (mapped) return { tone: 'error', key: mapped }
  }
  return { tone: 'error', key: 'app.errorGeneric' }
}

function formatBytes(bytes: number): string {
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

function detectPlatform(name: string): 'android' | 'ios' | null {
  const lower = name.toLowerCase()
  if (lower.endsWith('.apk')) return 'android'
  if (lower.endsWith('.ipa')) return 'ios'
  return null
}

function iconToBlob(icon: AppIcon): Blob {
  return new Blob([icon.bytes], { type: icon.mime })
}

function isAndroidInfo(info: AppInfo): info is AndroidAppInfo {
  return info.platform === 'android'
}

function isIosInfo(info: AppInfo): info is IosAppInfo {
  return info.platform === 'ios'
}

export default function AppParserTool() {
  const { t } = useI18n()
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ParsedApp | null>(null)
  const [iconUrl, setIconUrl] = useState<string | undefined>()
  const [allIconUrls, setAllIconUrls] = useState<Array<{ path: string; url: string }>>([])
  const [isParsing, setIsParsing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [expandedIcons, setExpandedIcons] = useState(false)
  const dragDepthRef = useRef(0)

  // 清理 object URLs
  useEffect(() => {
    return () => {
      if (iconUrl) URL.revokeObjectURL(iconUrl)
      allIconUrls.forEach((entry) => URL.revokeObjectURL(entry.url))
    }
  }, [iconUrl, allIconUrls])

  const revokeAll = () => {
    if (iconUrl) URL.revokeObjectURL(iconUrl)
    allIconUrls.forEach((entry) => URL.revokeObjectURL(entry.url))
  }

  const handleFile = async (fileEntry: File): Promise<void> => {
    const platform = detectPlatform(fileEntry.name)
    if (!platform) {
      setNotice({ tone: 'error', key: 'app.errorUnsupportedFile', vars: { name: fileEntry.name } })
      return
    }
    if (fileEntry.size === 0) {
      setNotice({ tone: 'error', key: 'app.errorEmptyFile', vars: { name: fileEntry.name } })
      return
    }

    revokeAll()
    setIconUrl(undefined)
    setAllIconUrls([])
    setResult(null)
    setFile(fileEntry)
    setIsParsing(true)

    try {
      const parsed = platform === 'android'
        ? await parseApk(fileEntry)
        : await parseIpa(fileEntry)

      setResult(parsed)
      if (parsed.icon) {
        setIconUrl(URL.createObjectURL(iconToBlob(parsed.icon)))
      }
      const previewable = parsed.allIcons.slice(0, 8).map((icon) => ({
        path: icon.path,
        url: URL.createObjectURL(iconToBlob(icon)),
      }))
      setAllIconUrls(previewable)
      setNotice({ tone: 'success', key: 'app.noticeParsed' })
    } catch (error) {
      const notice = errorToNotice(error)
      setNotice(notice)
    } finally {
      setIsParsing(false)
    }
  }

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const f = event.target.files?.[0]
    if (f) handleFile(f)
    event.target.value = ''
  }

  const onDragEnter = (event: DragEvent) => {
    event.preventDefault()
    if (isParsing) return
    dragDepthRef.current += 1
    setIsDragging(true)
  }
  const onDragOver = (event: DragEvent) => event.preventDefault()
  const onDragLeave = (event: DragEvent) => {
    event.preventDefault()
    dragDepthRef.current -= 1
    if (dragDepthRef.current <= 0) {
      setIsDragging(false)
      dragDepthRef.current = 0
    }
  }
  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
    dragDepthRef.current = 0
    const f = event.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  const clearResult = () => {
    revokeAll()
    setIconUrl(undefined)
    setAllIconUrls([])
    setResult(null)
    setFile(null)
    setNotice(null)
    setExpandedIcons(false)
  }

  const downloadIcon = async () => {
    if (!result?.icon) return
    const url = URL.createObjectURL(iconToBlob(result.icon))
    const a = document.createElement('a')
    a.href = url
    a.download = `${result.fileName.replace(/\.(apk|ipa)$/i, '')}-icon.png`
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const handleReprocess = async () => {
    if (!file) return
    setNotice(null)
    revokeAll()
    setIconUrl(undefined)
    setAllIconUrls([])
    setResult(null)
    setIsParsing(true)
    try {
      const parsed = (detectPlatform(file.name) ?? '') === 'android' ? await parseApk(file) : await parseIpa(file)
      setResult(parsed)
      if (parsed.icon) setIconUrl(URL.createObjectURL(iconToBlob(parsed.icon)))
      const previewable = parsed.allIcons.slice(0, 8).map((icon) => ({
        path: icon.path,
        url: URL.createObjectURL(iconToBlob(icon)),
      }))
      setAllIconUrls(previewable)
      setNotice({ tone: 'success', key: 'app.noticeParsed' })
    } catch (error) {
      setNotice(errorToNotice(error))
    } finally {
      setIsParsing(false)
    }
  }

  const platformBadge = (p: 'android' | 'ios') => (
    <span className={`app-platform app-platform-${p}`}>
      <Smartphone size={13} aria-hidden />
      {t(`app.platform.${p}`)}
    </span>
  )

  return (
    <div className="app-parser">
      <div className={`app-dropzone${isDragging ? ' app-dropzone-active' : ''}${file ? ' app-dropzone-compact' : ''}${isParsing ? ' app-dropzone-disabled' : ''}`}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <Upload size={26} aria-hidden />
        <div className="app-dropzone-text">
          <h2>{t('app.dropTitle')}</h2>
          <p>{t('app.dropHint')}</p>
        </div>
        <label className="app-choose">
          <input
            type="file"
            accept=".apk,.ipa"
            disabled={isParsing}
            onChange={onInputChange}
            aria-label={t('app.dropAria')}
          />
          <span>{t('app.chooseFile')}</span>
        </label>
      </div>

      {notice && (
        <div className="app-notice" data-tone={notice.tone} role={notice.tone === 'error' ? 'alert' : 'status'} aria-live="polite">
          {notice.tone === 'success' ? <WandSparkles size={17} /> : notice.tone === 'error' ? <AlertCircle size={17} /> : <Package size={17} />}
          <span>{t(notice.key, notice.vars)}</span>
        </div>
      )}

      {file && (
        <div className="app-file-bar">
          <div>
            <h3>{file.name}</h3>
            <p>{formatBytes(file.size)} · {(() => { const p = detectPlatform(file.name); return p ? t(`app.platform.${p}`) : ''; })()}</p>
          </div>
          <button className="app-btn-ghost" type="button" onClick={clearResult} disabled={isParsing} aria-label={t('app.clearAria')}>
            <Trash2 size={15} /><span>{t('app.clear')}</span>
          </button>
        </div>
      )}

      {isParsing && (
        <div className="app-processing">
          <LoaderCircle className="app-spin" size={18} />
          <span>{t('app.parsing')}</span>
        </div>
      )}

      {!isParsing && result && (
        <section className="app-result" aria-labelledby="app-result-title">
          <header className="app-result-header">
            <div className="app-result-icon-box">
              {iconUrl ? <img src={iconUrl} alt={t('app.iconAlt')} /> : <FileQuestion size={26} />}
            </div>
            <div className="app-result-title-row">
              {(() => {
                const android = isAndroidInfo(result.info) ? result.info : null
                const ios = isIosInfo(result.info) ? result.info : null
                const mainTitle = android?.label ?? android?.packageName ?? ios?.displayName ?? ios?.bundleName ?? ios?.bundleId ?? ''
                const subtitle = android?.packageName ?? ios?.bundleId ?? ''
                return (
                  <>
                    <h2 id="app-result-title">{mainTitle}</h2>
                    <div className="app-result-subtitle">
                      {platformBadge(result.info.platform)}
                      {subtitle}
                    </div>
                  </>
                )
              })()}
            </div>
            <div className="app-result-actions">
              {result.icon && (
                <button className="app-btn-secondary" type="button" onClick={downloadIcon} aria-label={t('app.downloadIconAria')}>
                  <Download size={15} /><span>{t('app.downloadIcon')}</span>
                </button>
              )}
              <button className="app-btn-ghost" type="button" onClick={handleReprocess} aria-label={t('app.reprocessAria')}>
                <LoaderCircle size={15} /><span>{t('app.reprocess')}</span>
              </button>
            </div>
          </header>

          {result.warnings.length > 0 && (
            <ul className="app-warnings" aria-label={t('app.warningsAria')}>
              {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          )}

          <div className="app-result-grid">
            <div className="app-info-card">
              <h3>{t('app.infoTitle')}</h3>
              {result.info.platform === 'android' ? (
                <dl className="app-kv">
                  {result.info.versionName && <><dt>{t('app.versionName')}</dt><dd>{result.info.versionName}{result.info.versionCode ? ` (${result.info.versionCode})` : ''}</dd></>}
                  <dt>{t('app.apkSize')}</dt><dd>{formatBytes(file?.size ?? 0)}</dd>
                  {result.info.minSdkVersion && <><dt>{t('app.minSdk')}</dt><dd>{result.info.minSdkVersion}</dd></>}
                  {result.info.targetSdkVersion && <><dt>{t('app.targetSdk')}</dt><dd>{result.info.targetSdkVersion}</dd></>}
                  {result.info.iconResource && <><dt>{t('app.iconResource')}</dt><dd className="app-code">{result.info.iconResource}</dd></>}
                  {result.info.mainActivity && <><dt>{t('app.mainActivity')}</dt><dd className="app-code">{result.info.mainActivity}</dd></>}
                  {result.info.activities.length > 0 && <><dt>{t('app.activityCount')}</dt><dd>{result.info.activities.length}</dd></>}
                </dl>
              ) : (
                <dl className="app-kv">
                  <dt>{t('app.apkSize')}</dt><dd>{formatBytes(file?.size ?? 0)}</dd>
                  {result.info.shortVersion && <><dt>{t('app.versionShort')}</dt><dd>{result.info.shortVersion}</dd></>}
                  {result.info.buildVersion && <><dt>{t('app.versionBuild')}</dt><dd>{result.info.buildVersion}</dd></>}
                  {result.info.minimumOsVersion && <><dt>{t('app.minOs')}</dt><dd>{result.info.minimumOsVersion}</dd></>}
                  {result.info.platformName && <><dt>{t('app.platformName')}</dt><dd>{result.info.platformName}{result.info.platformVersion ? ` · ${result.info.platformVersion}` : ''}</dd></>}
                  {result.info.developmentRegion && <><dt>{t('app.region')}</dt><dd>{result.info.developmentRegion}</dd></>}
                  {result.info.deviceFamily && result.info.deviceFamily.length > 0 && <><dt>{t('app.deviceFamily')}</dt><dd>{result.info.deviceFamily.map((d) => Number(d) === 1 ? 'iPhone' : Number(d) === 2 ? 'iPad' : d).join('、')}</dd></>}
                </dl>
              )}
            </div>

            {result.info.platform === 'android' && result.info.permissions.length > 0 && (
              <div className="app-info-card">
                <h3>{t('app.permissionsTitle')}</h3>
                <ul className="app-chip-list">
                  {result.info.permissions.map((p) => {
                    const t = translatePermission(p)
                    return (
                      <li key={p} title={`${p}\n${t.category}`}>
                        <span className="app-chip-cn">{t.cn}</span>
                        <span className="app-chip-en">{p.replace(/^android\.permission\./, '')}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {result.info.platform === 'android' && result.info.features.length + result.info.usesFeatures.length > 0 && (
              <div className="app-info-card">
                <h3>{t('app.featuresTitle')}</h3>
                <ul className="app-chip-list">
                  {[...result.info.features, ...result.info.usesFeatures].map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}

            {allIconUrls.length > 1 && (
              <div className="app-info-card">
                <h3>{t('app.otherIconsTitle')}</h3>
                <div className="app-other-icons">
                  {allIconUrls.slice(0, expandedIcons ? allIconUrls.length : 6).map((entry) => (
                    <div key={entry.path} className="app-icon-item" title={entry.path}>
                      <img src={entry.url} alt="" />
                    </div>
                  ))}
                </div>
                {allIconUrls.length > 6 && (
                  <button type="button" className="app-show-more" onClick={() => setExpandedIcons((v) => !v)}>
                    {expandedIcons ? t('app.showLess') : t('app.showMore', { count: allIconUrls.length - 6 })}
                  </button>
                )}
              </div>
            )}
          </div>

          <details className="app-raw">
            <summary>{t('app.rawTitle')}</summary>
            <pre><code>{JSON.stringify({ ...result, icon: result.icon ? { path: result.icon.path, size: result.icon.size, mime: result.icon.mime } : undefined, allIcons: result.allIcons.map((i) => ({ path: i.path, size: i.size, mime: i.mime })) }, null, 2)}</code></pre>
          </details>
        </section>
      )}

      {!file && !isParsing && (
        <div className="app-empty-state" role="status">
          <FileCode2 size={32} aria-hidden />
          <p>{t('app.emptyHint')}</p>
        </div>
      )}
    </div>
  )
}
