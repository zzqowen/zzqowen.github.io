import type { ComponentType, LazyExoticComponent } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { LocalizedText } from '../i18n/localize'

export type ToolAccent = 'lime' | 'blue' | 'amber'

export interface ToolDefinition {
  id: string
  moduleId: string
  name: LocalizedText
  description: LocalizedText
  keywords: string[]
  icon: LucideIcon
  component: LazyExoticComponent<ComponentType>
  accent: ToolAccent
  action: LocalizedText
}
