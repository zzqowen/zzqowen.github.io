import { Braces, Images } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface SiteModule {
  id: string
  name: string
  description: string
  icon: LucideIcon
  accent: 'lime' | 'blue' | 'amber'
  keywords: string[]
}

export const moduleRegistry: SiteModule[] = [
  {
    id: 'json',
    name: 'JSON 工具',
    description: '格式化、校验与多份对比 JSON，支持树形展开和差异高亮。',
    icon: Braces,
    accent: 'lime',
    keywords: ['json', '格式化', '校验', '压缩', '对比', 'diff', '开发'],
  },
  {
    id: 'image',
    name: '图片工具',
    description: '批量压缩图片，自由调整尺寸，并在 PNG、JPEG、WebP 间转换。',
    icon: Images,
    accent: 'blue',
    keywords: ['image', '图片', '压缩', '转换', '缩放', 'png', 'jpeg', 'webp'],
  },
]

export function getModuleById(id: string | undefined) {
  return moduleRegistry.find((module) => module.id === id)
}
