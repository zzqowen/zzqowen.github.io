import { lazy } from 'react'
import { AppWindow, Braces, GitCompare, Images } from 'lucide-react'
import type { ToolDefinition } from './types'

export const toolRegistry: ToolDefinition[] = [
  {
    id: 'json',
    moduleId: 'json',
    name: { zh: 'JSON 格式化', en: 'JSON Formatter' },
    description: {
      zh: '格式化、压缩并校验 JSON，结果支持按层级展开和收起。',
      en: 'Format, minify and validate JSON with a collapsible tree view.',
    },
    keywords: ['json', '格式化', 'format', '压缩', 'minify', '校验', 'validate', '树形', 'tree'],
    icon: Braces,
    component: lazy(() => import('./json/JsonTool')),
    accent: 'lime',
    action: { zh: '开始处理', en: 'Start' },
  },
  {
    id: 'json-diff',
    moduleId: 'json',
    name: { zh: 'JSON 对比', en: 'JSON Diff' },
    description: {
      zh: '粘贴多份 JSON，直接在原文上高亮新增、删除和修改的内容。',
      en: 'Compare multiple JSON documents with inline highlights for additions, removals and changes.',
    },
    keywords: ['json', 'diff', '对比', 'compare', '比较', '差异', 'difference', '高亮', 'highlight'],
    icon: GitCompare,
    component: lazy(() => import('./diff/JsonDiffTool')),
    accent: 'amber',
    action: { zh: '开始对比', en: 'Compare' },
  },
  {
    id: 'image',
    moduleId: 'image',
    name: { zh: '图片压缩与转换', en: 'Image Compressor' },
    description: {
      zh: '批量压缩图片，自由调整尺寸，并在 PNG、JPEG、WebP 间转换。',
      en: 'Batch compress, resize and convert images between PNG, JPEG and WebP.',
    },
    keywords: ['image', '图片', 'image', '压缩', 'compress', '转换', 'convert', '缩放', 'resize', 'png', 'jpeg', 'webp'],
    icon: Images,
    component: lazy(() => import('./image/ImageTool')),
    accent: 'blue',
    action: { zh: '处理图片', en: 'Process' },
  },
  {
    id: 'app-inspector',
    moduleId: 'app',
    name: { zh: 'APP 解析', en: 'APP Inspector' },
    description: {
      zh: '拖入 APK 或 IPA，本地解析应用图标、包名、版本、权限与最低运行版本。',
      en: 'Drop an APK or IPA to locally inspect its icon, package name, version, permissions and minimum OS.',
    },
    keywords: ['apk', 'ipa', 'android', 'ios', 'bundle', 'manifest', 'plist', 'app', '图标', 'icon'],
    icon: AppWindow,
    component: lazy(() => import('./app-parser/AppParserTool')),
    accent: 'amber',
    action: { zh: '选择文件', en: 'Choose file' },
  },
]

export function getToolById(id: string | undefined) {
  return toolRegistry.find((tool) => tool.id === id)
}

export function getToolsByModule(moduleId: string) {
  return toolRegistry.filter((tool) => tool.moduleId === moduleId)
}
