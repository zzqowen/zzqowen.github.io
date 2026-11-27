import type { SiteModule } from '../modules/registry'
import type { ToolDefinition } from './types'

export function filterModules(
  modules: SiteModule[],
  tools: ToolDefinition[],
  query: string,
): SiteModule[] {
  const keyword = query.trim().toLocaleLowerCase()
  if (!keyword) return modules

  return modules.filter((module) => {
    const moduleTools = tools.filter((tool) => tool.moduleId === module.id)
    const searchable = [
      module.name.zh,
      module.name.en,
      module.description.zh,
      module.description.en,
      ...module.keywords,
      ...moduleTools.flatMap((tool) => [
        tool.name.zh,
        tool.name.en,
        tool.description.zh,
        tool.description.en,
        ...tool.keywords,
      ]),
    ]

    return searchable.join(' ').toLocaleLowerCase().includes(keyword)
  })
}

export function countModuleTools(moduleId: string, tools: ToolDefinition[]): number {
  return tools.filter((tool) => tool.moduleId === moduleId).length
}
