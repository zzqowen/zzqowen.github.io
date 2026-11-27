import { describe, expect, it } from 'vitest'
import { filterTools } from './filterTools'
import type { SearchableTool } from './filterTools'

const tools: SearchableTool[] = [
  {
    name: 'JSON 格式化',
    description: '格式化和校验 JSON',
    category: '开发工具',
    keywords: ['json', '压缩'],
  },
  {
    name: '图片压缩与转换',
    description: '调整图片大小和格式',
    category: '图片工具',
    keywords: ['webp', '缩放'],
  },
]

describe('filterTools', () => {
  it('默认返回全部工具', () => {
    expect(filterTools(tools, '', '全部')).toHaveLength(2)
  })

  it('按分类筛选', () => {
    expect(filterTools(tools, '', '图片工具').map((tool) => tool.name)).toEqual(['图片压缩与转换'])
  })

  it('搜索名称、描述和关键词时忽略大小写及首尾空格', () => {
    expect(filterTools(tools, '  JSON ', '全部')).toHaveLength(1)
    expect(filterTools(tools, 'WEBP', '全部')[0]?.name).toBe('图片压缩与转换')
    expect(filterTools(tools, '校验', '全部')[0]?.name).toBe('JSON 格式化')
  })

  it('同时应用分类和关键词并支持无结果', () => {
    expect(filterTools(tools, 'json', '图片工具')).toEqual([])
    expect(filterTools(tools, '不存在', '全部')).toEqual([])
  })
})
