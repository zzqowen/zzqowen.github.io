import { lazy } from 'react'
import { Braces, GitCompare, Images } from 'lucide-react'
import type { ToolDefinition } from './types'

export const toolRegistry: ToolDefinition[] = [
  {
    id: 'json',
    name: 'JSON 格式化',
    description: '格式化、压缩并校验 JSON，快速定位语法错误所在的行与列。',
    category: '开发工具',
    keywords: ['json', '格式化', '压缩', '校验', '解析', '开发'],
    icon: Braces,
    component: lazy(() => import('./json/JsonTool')),
    accent: 'lime',
    action: '开始处理',
  },
  {
    id: 'json-diff',
    name: 'JSON 对比',
    description: '同时对比多份 JSON，按路径列出新增、删除和修改的内容。',
    category: '对比工具',
    keywords: ['json', 'diff', '对比', '比较', '差异', '新增', '删除', '修改'],
    icon: GitCompare,
    component: lazy(() => import('./diff/JsonDiffTool')),
    accent: 'amber',
    action: '开始对比',
  },
  {
    id: 'image',
    name: '图片压缩与转换',
    description: '批量压缩图片，自由调整尺寸，并在 PNG、JPEG、WebP 间转换。',
    category: '图片工具',
    keywords: ['image', '图片', '压缩', '转换', '缩放', 'png', 'jpeg', 'webp'],
    icon: Images,
    component: lazy(() => import('./image/ImageTool')),
    accent: 'blue',
    action: '处理图片',
  },
]

export function getToolById(id: string | undefined) {
  return toolRegistry.find((tool) => tool.id === id)
}
