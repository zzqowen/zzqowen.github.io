import { parse_ipa, IPAError } from 'parse-ipa/browser'
import type { IPA as ParsedIpaMeta } from 'parse-ipa/browser'
import type { AppIcon, IosAppInfo, ParsedApp } from './types'

const ERROR_MAP: Record<string, { zh: string; en: string; code: string }> = {
  'IPA does not contain a Payload directory': { zh: 'IPA 中找不到 Payload 目录', en: 'Payload directory not found', code: 'app.errorNoAppDir' },
  'IPA does not contain a .app bundle': { zh: 'IPA 中找不到 .app 应用包', en: '.app bundle not found', code: 'app.errorNoAppDir' },
  'IPA contains multiple .app bundles': { zh: 'IPA 中包含多个 .app 包', en: 'Multiple .app bundles', code: 'app.errorBadPlist' },
  'IPA is missing Info.plist': { zh: 'IPA 中找不到 Info.plist', en: 'Info.plist not found', code: 'app.errorNoPlist' },
  'IPA Info.plist is missing required keys': { zh: 'Info.plist 缺少必需字段', en: 'Info.plist missing required keys', code: 'app.errorBadPlist' },
  'IPA Info.plist could not be parsed': { zh: 'Info.plist 格式不正确', en: 'Info.plist is malformed', code: 'app.errorBadPlist' },
  'IPA icon could not be read': { zh: 'IPA 图标无法读取', en: 'IPA icon could not be read', code: 'app.errorGeneric' },
}

function base64ToBytes(base64: string): Uint8Array {
  const bin = atob(base64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i)
  return out
}

export async function parseIpa(file: File): Promise<ParsedApp> {
  let meta: ParsedIpaMeta
  try {
    meta = await parse_ipa(file)
  } catch (error) {
    if (error instanceof IPAError) {
      const detail = ERROR_MAP[error.message]
      if (detail) {
        const e = new Error(detail.zh)
        e.name = 'LocalizedError'
        throw e
      }
    }
    throw error
  }

  const info: IosAppInfo = {
    platform: 'ios',
    displayName: meta.name,
    bundleId: meta.bundle_id,
    shortVersion: meta.version,
    buildVersion: meta.build,
  }

  const warnings: string[] = []
  meta.parser_info.errors.forEach((err) => warnings.push(err))

  let icon: AppIcon | undefined
  if (meta.icon) {
    const bytes = base64ToBytes(meta.icon)
    icon = {
      path: 'AppIcon',
      bytes,
      mime: 'image/png',
      size: bytes.length,
    }
  } else if (!meta.provision) {
    warnings.push('未提取到图标（IPA 中没有独立 PNG 图标，或使用了 Assets.car）')
  }

  // provision profile：额外信息（团队名、UUID、证书等）暂在 raw JSON 里展示，
  // 不展开到卡片字段，保持 UI 简洁

  return {
    fileName: file.name,
    platform: 'ios',
    info,
    icon,
    allIcons: icon ? [icon] : [],
    warnings,
  }
}
