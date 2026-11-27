import type { ToolCategory, ToolDefinition } from './types'

export type SearchableTool = Pick<ToolDefinition, 'name' | 'description' | 'category' | 'keywords'>

export function filterTools<T extends SearchableTool>(
  tools: T[],
  query: string,
  category: ToolCategory | '全部',
): T[] {
  const keyword = query.trim().toLocaleLowerCase()

  return tools.filter((tool) => {
    const inCategory = category === '全部' || tool.category === category
    if (!inCategory) return false
    if (!keyword) return true

    return [tool.name, tool.description, tool.category, ...tool.keywords]
      .join(' ')
      .toLocaleLowerCase()
      .includes(keyword)
  })
}
