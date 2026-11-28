import JSZip from 'jszip'
import { parseApkMeta, ApkParseError } from 'apk-meta-parser'
import type { ApkMeta } from 'apk-meta-parser'
import type { AndroidAppInfo, AppIcon, ParsedApp } from './types'
import { parseAxml, findElements, getAttrString } from './axmlReader'
import { parseVectorDrawable, renderVectorToCanvas, canvasToPngBytes } from './vectorRenderer'

// 位图扫描：APK 里任何位置的 PNG/WebP/JPG 都算候选
const BITMAP_RE = /\.(png|webp|jpg|jpeg)$/i

// 文件名关键词权重
const KEYWORD_SCORE: Array<[RegExp, number]> = [
  [/ic_launcher_round/i, 260_000],
  [/ic_launcher_foreground/i, 180_000],
  [/ic_launcher$/i, 260_000],
  [/ic_launcher/i, 150_000],
  [/app[_-]?icon/i, 100_000],
  [/application[_-]?icon/i, 100_000],
  [/ic_app/i, 90_000],
  [/adaptive[_-]?foreground/i, 180_000],
  [/foreground/i, 50_000],
  [/background/i, -30_000],
  [/splash/i, -50_000],
  [/notification/i, -20_000],
]

const DENSITY_SCORE: Array<[RegExp, number]> = [
  [/xxxhdpi/i, 100_000],
  [/xxhdpi/i, 80_000],
  [/xhdpi/i, 60_000],
  [/hdpi/i, 40_000],
  [/nodpi/i, 20_000],
  [/mdpi/i, 0],
  [/ldpi/i, -20_000],
  [/dpi-?v26/i, 10_000],
]

function mimeFromName(name: string): string {
  const lower = name.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  return 'application/octet-stream'
}

function scorePath(path: string, size: number): number {
  let score = size
  for (const [re, w] of KEYWORD_SCORE) if (re.test(path)) score += w
  for (const [re, w] of DENSITY_SCORE) if (re.test(path)) score += w
  const slashCount = (path.match(/\//g) || []).length
  score += slashCount * 1000
  return score
}

const ERROR_MAP: Record<string, { zh: string; code: string }> = {
  NOT_A_ZIP: { zh: '文件不是有效的 APK 压缩包', code: 'app.errorBadManifest' },
  MANIFEST_NOT_FOUND: { zh: 'APK 中找不到 AndroidManifest.xml', code: 'app.errorNoManifest' },
  INVALID_AXML: { zh: 'AndroidManifest.xml 格式损坏', code: 'app.errorBadManifest' },
  INCOMPLETE_MANIFEST: { zh: 'AndroidManifest.xml 缺少必需字段', code: 'app.errorBadManifest' },
}

// ---- Adaptive Icon 渲染 ----

/** 从 drawable 引用（@drawable/xxx）提取资源名 */
function extractResourceName(ref: string): string | null {
  const m = ref.match(/@(?:drawable|mipmap)\/(.+)/)
  return m ? m[1] : null
}

/** 在 ZIP 里按资源名查找文件（优先 XML，其次位图） */
function findByResourceName(zip: JSZip, name: string): string[] {
  const results: string[] = []
  const lower = name.toLowerCase()
  zip.forEach((path, entry) => {
    if (entry.dir) return
    const base = path.split('/').pop()?.toLowerCase() ?? ''
    if (base === `${lower}.xml` || base === `${lower}.png` || base === `${lower}.webp`) {
      results.push(path)
    }
  })
  // XML 优先（vector），然后按密度排序
  return results.sort((a, b) => {
    const aXml = a.endsWith('.xml') ? 0 : 1
    const bXml = b.endsWith('.xml') ? 0 : 1
    if (aXml !== bXml) return aXml - bXml
    return scorePath(b, 0) - scorePath(a, 0)
  })
}

/** 从 ZIP 里读 XML 文件并解析 AXML */
async function readAxmlFromZip(zip: JSZip, path: string) {
  const entry = zip.file(path)
  if (!entry) return null
  const bytes = new Uint8Array(await entry.async('arraybuffer'))
  // 检查是否是 AXML（magic: 0x0003）
  if (bytes.length >= 4 && bytes[0] === 0x03 && bytes[1] === 0x00) {
    return parseAxml(bytes)
  }
  // 纯文本 XML（不太可能出现在编译后的 APK 里，但兜底）
  return null
}

/** 渲染 vector XML 到 PNG bytes */
async function renderVectorFile(zip: JSZip, path: string, size = 512): Promise<Uint8Array | null> {
  const doc = await readAxmlFromZip(zip, path)
  if (!doc) return null
  const vector = parseVectorDrawable(doc)
  if (!vector) return null
  const canvas = document.createElement('canvas')
  renderVectorToCanvas(vector, canvas, size)
  return canvasToPngBytes(canvas)
}

/** 从 adaptive icon XML 渲染完整图标 */
async function renderAdaptiveIcon(zip: JSZip, xmlPath: string): Promise<Uint8Array | null> {
  const doc = await readAxmlFromZip(zip, xmlPath)
  if (!doc) return null

  const bgEl = findElements(doc, 'background')[0]
  const fgEl = findElements(doc, 'foreground')[0]

  const bgRef = bgEl ? getAttrString(bgEl, 'drawable') : undefined
  const fgRef = fgEl ? getAttrString(fgEl, 'drawable') : undefined

  const SIZE = 512
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // 画背景
  if (bgRef) {
    if (bgRef.startsWith('@color/') || bgRef.startsWith('#')) {
      // 颜色引用：尝试从 colors.xml 解析，失败用默认色
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, SIZE, SIZE)
    } else {
      const name = extractResourceName(bgRef)
      if (name) {
        const paths = findByResourceName(zip, name)
        for (const p of paths) {
          if (p.endsWith('.xml')) {
            const bgDoc = await readAxmlFromZip(zip, p)
            if (bgDoc) {
              const vec = parseVectorDrawable(bgDoc)
              if (vec) {
                const bgCanvas = document.createElement('canvas')
                renderVectorToCanvas(vec, bgCanvas, SIZE)
                ctx.drawImage(bgCanvas, 0, 0)
                break
              }
            }
          } else {
            // 位图背景
            const entry = zip.file(p)
            if (entry) {
              const bytes = new Uint8Array(await entry.async('arraybuffer'))
              const blob = new Blob([bytes], { type: mimeFromName(p) })
              const img = await createImageBitmap(blob)
              ctx.drawImage(img, 0, 0, SIZE, SIZE)
              break
            }
          }
        }
      }
    }
  } else {
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, SIZE, SIZE)
  }

  // 画前景
  if (fgRef) {
    const name = extractResourceName(fgRef)
    if (name) {
      const paths = findByResourceName(zip, name)
      for (const p of paths) {
        if (p.endsWith('.xml')) {
          const fgBytes = await renderVectorFile(zip, p, SIZE)
          if (fgBytes) {
            const blob = new Blob([fgBytes], { type: 'image/png' })
            const img = await createImageBitmap(blob)
            ctx.drawImage(img, 0, 0)
            break
          }
        } else {
          const entry = zip.file(p)
          if (entry) {
            const bytes = new Uint8Array(await entry.async('arraybuffer'))
            const blob = new Blob([bytes], { type: mimeFromName(p) })
            const img = await createImageBitmap(blob)
            ctx.drawImage(img, 0, 0, SIZE, SIZE)
            break
          }
        }
      }
    }
  }

  return canvasToPngBytes(canvas)
}

// ---- 主函数 ----

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

  // 1) 扫描所有位图文件
  const bitmapPaths: string[] = []
  zip.forEach((relativePath, zipEntry) => {
    if (zipEntry.dir) return
    if (!BITMAP_RE.test(relativePath)) return
    // 排除 res/ 以外的非资源图片（如 assets/ 里的截图等），除非 res/ 里没有
    bitmapPaths.push(relativePath)
  })

  // 优先 res/ 目录下的位图
  const resBitmaps = bitmapPaths.filter((p) => p.startsWith('res/'))
  const candidates = resBitmaps.length > 0 ? resBitmaps : bitmapPaths

  const withSize = await Promise.all(candidates.map(async (path) => {
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

  // 2) 如果没有位图图标，尝试 adaptive icon 渲染
  if (allIcons.length === 0) {
    const adaptiveXmlPaths: string[] = []
    zip.forEach((path, entry) => {
      if (entry.dir) return
      if (/res\/mipmap-anydpi[^/]*\/ic_launcher[^/]*\.xml$/i.test(path)) {
        adaptiveXmlPaths.push(path)
      }
    })

    // 优先 ic_launcher_round，然后 ic_launcher
    adaptiveXmlPaths.sort((a, b) => {
      const aRound = /round/i.test(a) ? 0 : 1
      const bRound = /round/i.test(b) ? 0 : 1
      return aRound - bRound
    })

    let rendered = false
    for (const xmlPath of adaptiveXmlPaths) {
      try {
        const pngBytes = await renderAdaptiveIcon(zip, xmlPath)
        if (pngBytes && pngBytes.length > 100) {
          allIcons.push({
            path: `${xmlPath} (rendered)`,
            bytes: pngBytes,
            mime: 'image/png',
            size: pngBytes.length,
          })
          rendered = true
          break
        }
      } catch {
        // 渲染失败尝试下一个
      }
    }

    if (!rendered) {
      // 最后尝试：直接找 vector XML 渲染（不经过 adaptive icon）
      const vectorPaths: string[] = []
      zip.forEach((path, entry) => {
        if (entry.dir) return
        if (/ic_launcher/i.test(path) && path.endsWith('.xml')) {
          vectorPaths.push(path)
        }
      })
      for (const vp of vectorPaths.slice(0, 3)) {
        try {
          const pngBytes = await renderVectorFile(zip, vp)
          if (pngBytes && pngBytes.length > 100) {
            allIcons.push({
              path: `${vp} (rendered)`,
              bytes: pngBytes,
              mime: 'image/png',
              size: pngBytes.length,
            })
            break
          }
        } catch {
          // 跳过
        }
      }
    }

    if (allIcons.length === 0) {
      warnings.push('APK 中没有可提取的图标（无位图且 vector 渲染失败）')
    }
  }

  return {
    fileName: file.name,
    platform: 'android',
    info,
    icon: allIcons[0],
    allIcons,
    warnings,
  }
}
