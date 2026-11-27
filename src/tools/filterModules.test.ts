import { describe, expect, it } from 'vitest'
import { filterModules } from './filterModules'
import { moduleRegistry } from '../modules/registry'
import { toolRegistry } from './registry'

describe('filterModules', () => {
  it('默认返回全部模块', () => {
    expect(filterModules(moduleRegistry, toolRegistry, '')).toHaveLength(moduleRegistry.length)
  })

  it('命中模块名称时返回对应模块', () => {
    expect(filterModules(moduleRegistry, toolRegistry, 'JSON').map((item) => item.id)).toEqual(['json'])
    expect(filterModules(moduleRegistry, toolRegistry, '图片').map((item) => item.id)).toEqual(['image'])
  })

  it('通过模块内工具名称和关键词搜索', () => {
    expect(filterModules(moduleRegistry, toolRegistry, '对比').map((item) => item.id)).toEqual(['json'])
    expect(filterModules(moduleRegistry, toolRegistry, 'webp').map((item) => item.id)).toEqual(['image'])
  })

  it('忽略大小写与首尾空格，无匹配时返回空数组', () => {
    expect(filterModules(moduleRegistry, toolRegistry, '  JSON ').map((item) => item.id)).toEqual(['json'])
    expect(filterModules(moduleRegistry, toolRegistry, '不存在')).toEqual([])
  })
})
