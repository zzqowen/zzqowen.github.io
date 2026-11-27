import { describe, expect, it } from 'vitest'
import {
  countDiffTypes,
  diffJsonValues,
  formatDiffLine,
  formatDiffValue,
  parseJsonText,
} from './diffUtils'

describe('JSON 对比纯函数', () => {
  it('相同内容不产生差异', () => {
    expect(diffJsonValues({ a: 1, b: [1, 2] }, { a: 1, b: [1, 2] })).toEqual({
      entries: [],
      truncated: false,
    })
  })

  it('识别新增、删除和修改的属性', () => {
    const result = diffJsonValues(
      { name: 'Owen', age: 20, tags: ['a'] },
      { name: 'Owen', age: 21, tags: ['a'], city: '上海' },
    )

    expect(result.entries).toEqual([
      { path: '$.age', type: 'changed', baseValue: '20', targetValue: '21' },
      { path: '$.city', type: 'added', targetValue: '"上海"' },
    ])

    expect(diffJsonValues({ a: 1, b: 2 }, { a: 1 }).entries).toEqual([
      { path: '$.b', type: 'removed', baseValue: '2' },
    ])
  })

  it('递归比较嵌套对象和数组索引', () => {
    const result = diffJsonValues(
      { user: { roles: ['admin', 'editor'] } },
      { user: { roles: ['admin', 'viewer', 'guest'] } },
    )

    expect(result.entries).toEqual([
      { path: '$.user.roles[1]', type: 'changed', baseValue: '"editor"', targetValue: '"viewer"' },
      { path: '$.user.roles[2]', type: 'added', targetValue: '"guest"' },
    ])
  })

  it('数组缩短时标记为删除', () => {
    expect(diffJsonValues([1, 2, 3], [1]).entries).toEqual([
      { path: '$[1]', type: 'removed', baseValue: '2' },
      { path: '$[2]', type: 'removed', baseValue: '3' },
    ])
  })

  it('类型不同时视为修改，根节点也可以比较', () => {
    expect(diffJsonValues({ a: 1 }, [1]).entries).toEqual([
      { path: '$', type: 'changed', baseValue: '{"a":1}', targetValue: '[1]' },
    ])
    expect(diffJsonValues(1, '1').entries).toEqual([
      { path: '$', type: 'changed', baseValue: '1', targetValue: '"1"' },
    ])
  })

  it('非标识符属性使用方括号路径', () => {
    expect(diffJsonValues({ 'a b': 1 }, { 'a b': 2 }).entries[0]?.path).toBe('$["a b"]')
  })

  it('按上限截断并标记 truncated', () => {
    const result = diffJsonValues({ a: 1, b: 2, c: 3 }, {}, 2)

    expect(result.entries).toHaveLength(2)
    expect(result.truncated).toBe(true)
  })

  it('统计差异数量并格式化输出行', () => {
    const { entries } = diffJsonValues({ a: 1, b: 2 }, { a: 1, b: 3, c: 4 })

    expect(countDiffTypes(entries)).toEqual({ added: 1, removed: 0, changed: 1 })
    expect(entries.map(formatDiffLine)).toEqual(['~ $.b: 2 → 3', '+ $.c = 4'])
  })

  it('格式化超长值时会截断', () => {
    const formatted = formatDiffValue({ text: 'x'.repeat(200) })

    expect(formatted.length).toBeLessThanOrEqual(121)
    expect(formatted.endsWith('…')).toBe(true)
  })

  it('解析 JSON 时返回原文错误位置', () => {
    const empty = parseJsonText('   ')
    expect(empty).toEqual({ ok: false, message: '内容为空，请粘贴 JSON。' })

    const broken = parseJsonText('{\n  "broken": ,\n  "ok": true\n}')
    expect(broken.ok).toBe(false)
    if (!broken.ok) {
      expect(broken.line).toBe(2)
      expect(broken.column).toBe(13)
    }

    expect(parseJsonText('{"a":1}')).toEqual({ ok: true, value: { a: 1 } })
  })
})
