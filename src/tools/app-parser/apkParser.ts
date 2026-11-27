import JSZip from 'jszip'
import { buildAndroidAppInfo, parseAndroidManifestXml } from './axml'
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

function sizeScore(path: string, size: number): number {
  // 路径含 launcher / app_icon 等关键词的图标加权
  const hasKeyword = APK_ICON_KEYWORDS.test(path)
  const score = size
  return hasKeyword ? score * 1.2 + 10 : score
}

export async function parseApk(file: File): Promise<ParsedApp> {
  const arrayBuffer = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(arrayBuffer)
  const warnings: string[] = []

  const manifestFile = zip.file('AndroidManifest.xml')
  if (!manifestFile) throw new Error('APK 中找不到 AndroidManifest.xml')
  const manifestBytes = new Uint8Array(await manifestFile.async('arraybuffer'))
  const manifest = parseAndroidManifestXml(manifestBytes)
  const info: AndroidAppInfo = buildAndroidAppInfo(manifest)

  // 收集候选图标
  const candidateIcons: Array<{ path: string; bytes: Uint8Array; score: number }> = []
  zip.forEach((relativePath, zipEntry) => {
    if (zipEntry.dir) return
    if (!APK_ICON_DIRS.test(relativePath)) return
    // 跳过 .xml adaptive icon 描述文件
    if (relativePath.toLowerCase().endsWith('.xml')) return
    candidateIcons.push({ path: relativePath, bytes: new Uint8Array(0), score: 0 })
  })

  // 先把它们的 bytes 读出来（JSZip async）
  const iconData: Array<{ path: string; bytes: Uint8Array; size: number; score: number }> = []
  for (const candidate of candidateIcons) {
    const entry = zip.file(candidate.path)
    if (!entry) continue
    const bytes = new Uint8Array(await entry.async('arraybuffer'))
    iconData.push({
      path: candidate.path,
      bytes,
      size: bytes.length,
      score: sizeScore(candidate.path, bytes.length),
    })
  }

  iconData.sort((a, b) => b.score - a.score)

  const allIcons: AppIcon[] = []
  for (const item of iconData.slice(0, 20)) {
    allIcons.push({
      path: item.path,
      bytes: item.bytes,
      mime: mimeFromName(item.path),
      size: item.bytes.length,
    })
  }

  let icon: AppIcon | undefined
  if (allIcons.length > 0) icon = allIcons[0]
  else warnings.push('APK 中未找到可提取的 PNG/WebP/JPG 图标')

  return {
    fileName: file.name,
    platform: 'android',
    info,
    icon,
    allIcons,
    warnings,
  }
}
