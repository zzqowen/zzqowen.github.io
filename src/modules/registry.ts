import { Braces, Images } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { LocalizedText } from '../i18n/localize'

export interface SiteModule {
  id: string
  name: LocalizedText
  description: LocalizedText
  icon: LucideIcon
  accent: 'lime' | 'blue' | 'amber'
  keywords: string[]
}

export const moduleRegistry: SiteModule[] = [
  {
    id: 'json',
    name: { zh: 'JSON 工具', en: 'JSON Tools' },
    description: {
      zh: '格式化、校验与多份对比 JSON，支持树形展开和差异高亮。',
      en: 'Format, validate and compare JSON with tree views and inline highlights.',
    },
    icon: Braces,
    accent: 'lime',
    keywords: ['json', '格式化', 'format', '校验', 'validate', '压缩', 'minify', '对比', 'diff', '开发', 'developer'],
  },
  {
    id: 'image',
    name: { zh: '图片工具', en: 'Image Tools' },
    description: {
      zh: '批量压缩图片，自由调整尺寸，并在 PNG、JPEG、WebP 间转换。',
      en: 'Compress, resize and convert images between PNG, JPEG and WebP.',
    },
    icon: Images,
    accent: 'blue',
    keywords: ['image', '图片', '压缩', 'compress', '转换', 'convert', '缩放', 'resize', 'png', 'jpeg', 'webp'],
  },
]

export function getModuleById(id: string | undefined) {
  return moduleRegistry.find((module) => module.id === id)
}
