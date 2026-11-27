import JSZip from 'jszip'
import { parseApkMeta, ApkParseError } from 'apk-meta-parser'
import type { ApkMeta } from 'apk-meta-parser'
import type { AndroidAppInfo, AppIcon, ParsedApp } from './types'

const APK_ICON_DIRS = /^res\/(mipmap|drawable)[a-z0-9-]*\/.+\.(png|webp|jpg|jpeg)$/i
const APK_ICON_KEYWORDS = /(?:ic_launcher|ic_app|app_icon|application_icon|adaptive|launcher)/i

function mimeFromName(name: string): string {
  const lower = name.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  return 'application/octet-stream'
}

function score(path: string, size: number): number {
  const hasKeyword = APK_ICON_KEYWORDS.test(path)
  return size * (hasKeyword ? 1.3 : 1) + (hasKeyword ? 20_000 : 0)
}

const ERROR_MAP: Record<string, { zh: string; en: string; code: string }> = {
  NOT_A_ZIP: { zh: '文件不是有效的 APK 压缩包', en: 'Not a valid APK archive', code: 'app.errorBadManifest' },
  MANIFEST_NOT_FOUND: { zh: 'APK 中找不到 AndroidManifest.xml', en: 'AndroidManifest.xml not found', code: 'app.errorNoManifest' },
  INVALID_AXML: { zh: 'AndroidManifest.xml 格式损坏', en: 'AndroidManifest.xml is malformed', code: 'app.errorBadManifest' },
  INCOMPLETE_MANIFEST: { zh: 'AndroidManifest.xml 缺少必需字段', en: 'AndroidManifest.xml missing required fields', code: 'app.errorBadManifest' },
}

export async function parseApk(file: File): Promise<ParsedApp> {
  let meta: ApkMeta
  try {
    meta = await parseApkMeta(file, { skipMd5: true, locale: 'zh', partial: true })
  } catch (error) {
    if (error instanceof ApkParseError) {
      const detail = ERROR_MAP[error.code]
      if (detail) {
        const e = new Error(detail.zh)
        e.name = 'LocalizedError'
        throw e
      }
    }
    throw error
  }

  const info: AndroidAppInfo = {
    platform: 'android',
    packageName: meta.packageName || '',
    label: meta.label,
    versionName: meta.versionName,
    versionCode: typeof meta.versionCode === 'number' ? String(meta.versionCode) : meta.versionCode,
    minSdkVersion: meta.minSdkVersion !== undefined ? String(meta.minSdkVersion) : undefined,
    targetSdkVersion: meta.targetSdkVersion !== undefined ? String(meta.targetSdkVersion) : undefined,
    permissions: meta.permissions ?? [],
    mainActivity: meta.mainActivity,
    // apk-meta-parser 不返回 features / activities / iconResource，保持为空数组
    features: [],
    usesFeatures: [],
    activities: meta.mainActivity ? [meta.mainActivity] : [],
  }

  const warnings: string[] = []
  if (meta.labelIsResourceId) {
    warnings.push(`应用名称未解析到文字（label 是资源 ID），已回退为包名 ${meta.packageName}`)
  }
  if (!meta.packageName) warnings.push('未找到包名')

  // 从 APK ZIP 里提取图标
  const arrayBuffer = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(arrayBuffer)

  const candidateEntries: Array<{ path: string; entry: JSZip.JSZipObject; size: number; score: number }> = []
  zip.forEach((relativePath, zipEntry) => {
    if (zipEntry.dir) return
    if (!APK_ICON_DIRS.test(relativePath)) return
    if (relativePath.toLowerCase().endsWith('.xml')) return
    // 将 entry 先列为占位，稍后再读 bytes
    candidateEntries.push({ path: relativePath, entry: zipEntry, size: 0, score: 0 })
  })

  // 并发读取 bytes 并用实际体积打分
  const withSize = await Promise.all(candidateEntries.map(async (c) => {
    const bytes = new Uint8Array(await c.entry.async('arraybuffer'))
    return { ...c, bytes, size: bytes.length, score: score(c.path, bytes.length) }
  }))
  withSize.sort((a, b) => b.score - a.score)

  const allIcons: AppIcon[] = withSize.slice(0, 24).map((item) => ({
    path: item.path,
    bytes: item.bytes,
    mime: mimeFromName(item.path),
    size: item.bytes.length,
  }))

  return {
    fileName: file.name,
    platform: 'android',
    info,
    icon: allIcons[0],
    allIcons,
    warnings,
  }
}
