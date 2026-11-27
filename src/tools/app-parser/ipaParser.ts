import JSZip from 'jszip'
import { parsePlist, type PlistValue } from './plist'
import type { IosAppInfo, AppIcon, ParsedApp } from './types'

const IPA_APP_ICON = /(?:AppIcon|LauncherIcon|Icon)\d*/i
const IPA_ICON_EXT = /\.(png|jpg|jpeg|webp|heic)$/i

function mimeFromName(name: string): string {
  const lower = name.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.heic')) return 'image/heic'
  return 'application/octet-stream'
}

function findAppDirNames(zip: JSZip): string[] {
  const names = new Set<string>()
  zip.forEach((path, entry) => {
    if (entry.dir && /^Payload\/[^/]+\.app\/?$/i.test(path)) {
      const m = path.match(/^Payload\/([^/]+\.app)/i)
      if (m) names.add(m[1])
    }
  })
  return Array.from(names)
}

function pickString(dict: Record<string, PlistValue>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const v = dict[key]
    if (typeof v === 'string' && v.length > 0) return v
  }
  return undefined
}

function pickArray(dict: Record<string, PlistValue>, ...keys: string[]): string[] {
  for (const key of keys) {
    const v = dict[key]
    if (Array.isArray(v)) return v.filter((item): item is string => typeof item === 'string')
  }
  return []
}

export async function parseIpa(file: File): Promise<ParsedApp> {
  const arrayBuffer = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(arrayBuffer)
  const warnings: string[] = []

  const appDirs = findAppDirNames(zip)
  if (appDirs.length === 0) throw new Error('IPA 中找不到 Payload/*.app 目录')
  const appDir = appDirs[0]
  const appPrefix = `Payload/${appDir}/`

  const plistEntry = zip.file(`${appPrefix}Info.plist`)
  if (!plistEntry) throw new Error('IPA 中找不到 Info.plist')
  const plistBytes = new Uint8Array(await plistEntry.async('arraybuffer'))
  const plistRoot = parsePlist(plistBytes) as Record<string, PlistValue>

  const info: IosAppInfo = {
    platform: 'ios',
    displayName: pickString(plistRoot, 'CFBundleDisplayName', 'CFBundleName'),
    bundleName: pickString(plistRoot, 'CFBundleName'),
    bundleId: pickString(plistRoot, 'CFBundleIdentifier') ?? '',
    shortVersion: pickString(plistRoot, 'CFBundleShortVersionString'),
    buildVersion: pickString(plistRoot, 'CFBundleVersion'),
    minimumOsVersion: pickString(plistRoot, 'MinimumOSVersion'),
    platformName: pickString(plistRoot, 'DTPlatformName'),
    platformVersion: pickString(plistRoot, 'DTPlatformVersion'),
    developmentRegion: pickString(plistRoot, 'CFBundleDevelopmentRegion'),
    deviceFamily: pickArray(plistRoot, 'UIDeviceFamily').map((n) => String(n)),
  }

  // 收集候选图标
  const iconCandidates: Array<{ path: string; bytes: Uint8Array; score: number; size: number }> = []
  const appIconSetContentsEntry = zip.file(`${appPrefix}AppIcon.appiconset/Contents.json`)
  const appIconSetEntries = new Set<string>()
  if (appIconSetContentsEntry) {
    try {
      const contentsBytes = new Uint8Array(await appIconSetContentsEntry.async('arraybuffer'))
      const contents = new TextDecoder('utf-8').decode(contentsBytes)
      // 找文件名:images
      const regex = /"filename"\s*:\s*"([^"]+)"/g
      let match: RegExpExecArray | null
      while ((match = regex.exec(contents)) !== null) appIconSetEntries.add(match[1])
    } catch {
      // 忽略
    }
  }

  zip.forEach((relativePath, zipEntry) => {
    if (zipEntry.dir) return
    if (!relativePath.startsWith(appPrefix)) return
    if (!IPA_ICON_EXT.test(relativePath)) return
    const base = relativePath.slice(appPrefix.length)
    let score = relativePath.length // 用 path 长度做基础
    if (IPA_APP_ICON.test(base)) score += 100_000 // 名字里有 AppIcon
    if (appIconSetEntries.has(base)) score += 50_000 // 在 AppIcon.appiconset 里

    iconCandidates.push({
      path: relativePath,
      bytes: new Uint8Array(0),
      score,
      size: 0,
    })
  })

  // 读取 bytes 并按 size + score 排序
  const sortedEntries = await Promise.all(iconCandidates.map(async (item) => {
    const entry = zip.file(item.path)
    if (!entry) return null
    const bytes = new Uint8Array(await entry.async('arraybuffer'))
    return { ...item, bytes, size: bytes.length }
  }))

  const validCandidates = sortedEntries.filter((c): c is NonNullable<typeof c> => c !== null)
  validCandidates.sort((a, b) => {
    const scoreDiff = b.score - a.score
    if (scoreDiff !== 0) return scoreDiff
    return b.size - a.size
  })

  const allIcons: AppIcon[] = validCandidates.slice(0, 20).map((item) => ({
    path: item.path,
    bytes: item.bytes,
    mime: mimeFromName(item.path),
    size: item.bytes.length,
  }))

  let icon: AppIcon | undefined
  if (allIcons.length > 0) icon = allIcons[0]
  else warnings.push('IPA 中未找到可提取的 PNG/JPG/WebP 图标')

  return {
    fileName: file.name,
    platform: 'ios',
    info,
    icon,
    allIcons,
    warnings,
  }
}
