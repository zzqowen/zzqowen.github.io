import type { ComponentType, LazyExoticComponent } from 'react'
import type { LucideIcon } from 'lucide-react'

export type ToolAccent = 'lime' | 'blue' | 'amber'

export interface ToolDefinition {
  id: string
  moduleId: string
  name: string
  description: string
  keywords: string[]
  icon: LucideIcon
  component: LazyExoticComponent<ComponentType>
  accent: ToolAccent
  action: string
}
