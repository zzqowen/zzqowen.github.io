import { describe, expect, it } from 'vitest'
import { buildJsonPath, collectContainerPaths } from './jsonPath'

describe('JSON 路径工具', () => {
  it('为普通属性生成点号路径', () => {
    expect(buildJsonPath('$', 'name')).toBe('$.name')
    expect(buildJsonPath('$.user', 'role')).toBe('$.user.role')
  })

  it('为数组和非标识符属性生成方括号路径', () => {
    expect(buildJsonPath('$.list', 0)).toBe('$.list[0]')
    expect(buildJsonPath('$', 'a b')).toBe('$["a b"]')
  })

  it('收集所有可展开的容器路径', () => {
    const value = { user: { roles: ['admin'] }, empty: {} }
    expect(collectContainerPaths(value)).toEqual([
      '$',
      '$.user',
      '$.user.roles',
      '$.empty',
    ])
  })

  it('标量没有可展开路径', () => {
    expect(collectContainerPaths(1)).toEqual([])
    expect(collectContainerPaths(null)).toEqual([])
  })
})
