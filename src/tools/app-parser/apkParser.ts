import JSZip from 'jszip'
import { parseApkMeta, ApkParseError } from 'apk-meta-parser'
import type { ApkMeta } from 'apk-meta-parser'
import type { AndroidAppInfo, AppIcon, ParsedApp } from './types'

// APK 图标候选：任何 res/ 下的图片都纳入（包括 adaptive XML 里可能用到的 foreground 图）
const APK_ICON_ANY = /^res\/.+?\/.+\.(png|webp|jpg|jpeg)$/i

// 文件名关键词权重
const KEYWORD_SCORE: Array<[RegExp, number]> = [
  [/ic_launcher_round/i, 260_000],  // 最优先：圆图标
  [/ic_launcher_foreground/i, 180_000], // adaptive icon 的前景层
  [/ic_launcher$/i, 260_000],  // 标准 ic_launcher（无后缀）
  [/ic_launcher/i, 150_000],   // 其他 ic_launcher
  [/app[_-]?icon/i, 100_000],
  [/application[_-]?icon/i, 100_000],
  [/ic_app/i, 90_000],
  [/adaptive[_-]?foreground/i, 180_000],
  [/foreground/i, 50_000],
  [/background/i, -30_000],   // adaptive 的背景层不要
  [/splash/i, -50_000],       // 启动图不要
  [/notification/i, -20_000], // 通知图标小且不是主图标
]

// 密度目录权重（数值越高优先级越大）
const DENSITY_SCORE: Array<[RegExp, number]> = [
  [/xxxhdpi/i, 100_000],
  [/xxhdpi/i, 80_000],
  [/xhdpi/i, 60_000],
  [/hdpi/i, 40_000],
  [/nodpi/i, 20_000],
  [/mdpi/i, 0],
  [/ldpi/i, -20_000],
  [/dpi-?v26/i, 10_000], // anydpi-v26 也可能有 PNG
]

function mimeFromName(name: string): string {
  const lower = name.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  return 'application/octet-stream'
}

function scorePath(path: string, size: number): number {
  let score = size // 基础：越大越好
  for (const [re, w] of KEYWORD_SCORE) if (re.test(path)) score += w
  for (const [re, w] of DENSITY_SCORE) if (re.test(path)) score += w
  // 路径里目录层级越多通常越底层（xxxhdpi/ic_launcher.png 胜过 ic_launcher.png）
  const slashCount = (path.match(/\//g) || []).length
  score += slashCount * 1000
  return score
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

  const candidatePaths: string[] = []
  zip.forEach((relativePath, zipEntry) => {
    if (zipEntry.dir) return
    if (!APK_ICON_ANY.test(relativePath)) return
    candidatePaths.push(relativePath)
  })

  if (candidatePaths.length === 0) {
    warnings.push('APK 中没有可提取的 PNG/WebP/JPG 图标')
  }

  const withSize = await Promise.all(candidatePaths.map(async (path) => {
    const entry = zip.file(path)
    if (!entry) return null
    const bytes = new Uint8Array(await entry.async('arraybuffer'))
    return { path, bytes, size: bytes.length, score: scorePath(path, bytes.length) }
  }))

  const valid = withSize.filter((c): c is NonNullable<typeof c> => c !== null)
  valid.sort((a, b) => b.score - a.score)

  const allIcons: AppIcon[] = valid.slice(0, 24).map((item) => ({
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
