import type { ComponentType, LazyExoticComponent } from 'react'
import type { LucideIcon } from 'lucide-react'

export type ToolCategory = '开发工具' | '图片工具'

export interface ToolDefinition {
  id: string
  name: string
  description: string
  category: ToolCategory
  keywords: string[]
  icon: LucideIcon
  component: LazyExoticComponent<ComponentType>
  accent: 'lime' | 'blue'
  action: string
}
