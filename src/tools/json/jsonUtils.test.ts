import { describe, expect, it } from 'vitest'
import { formatPastedJson, formatJson, minifyJson, parseJsonError, validateJson } from './jsonUtils'

describe('JSON 纯函数', () => {
  it('接受对象、数组及标量等有效 JSON', () => {
    const inputs = ['{"name":"Owen"}', '[1,2,3]', 'null', 'true', '42', '"文本"']

    for (const input of inputs) {
      expect(validateJson(input)).toEqual({ success: true })
    }
  })

  it('使用 2 个空格格式化 JSON', () => {
    expect(formatJson('{"name":"Owen","features":["格式化","校验"]}', 2)).toEqual({
      success: true,
      output: '{\n  "name": "Owen",\n  "features": [\n    "格式化",\n    "校验"\n  ]\n}',
    })
  })

  it('使用 4 个空格格式化 JSON', () => {
    expect(formatJson('{"user":{"active":true}}', 4)).toEqual({
      success: true,
      output: '{\n    "user": {\n        "active": true\n    }\n}',
    })
  })

  it('压缩 JSON 并保留字符串内部的空格', () => {
    expect(minifyJson('{\n  "message": "hello world",\n  "count": 2\n}')).toEqual({
      success: true,
      output: '{"message":"hello world","count":2}',
    })
  })

  it.each([
    ['格式化', () => formatJson(' \n\t ')],
    ['压缩', () => minifyJson(' \n\t ')],
    ['校验', () => validateJson(' \n\t ')],
  ])('%s时空白输入会返回明确提示', (_name, run) => {
    expect(run()).toEqual({
      success: false,
      error: { kind: 'empty', message: '请输入需要处理的 JSON 内容。' },
    })
  })

  it('从实际 V8 解析错误中提取 position 并计算行列', () => {
    const result = formatJson('{"a":1,}')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toMatchObject({
        kind: 'syntax',
        position: 7,
        line: 1,
        column: 8,
      })
      expect(result.error.message).not.toContain('Unexpected')
    }
  })

  it('按 CRLF 换行准确计算多行错误的行列', () => {
    const input = '{\r\n  "name": "Owen",\r\n  "active": true,\r\n}'
    const position = input.indexOf('}')
    const error = new SyntaxError(`Unexpected token } in JSON at position ${position}`)

    expect(parseJsonError(input, error)).toMatchObject({
      kind: 'syntax',
      position,
      line: 4,
      column: 1,
    })
  })

  it('将文件末尾的 position 换算为最后一行的列', () => {
    const input = '{\n  "a": 1,\n'
    const error = new SyntaxError(`Unexpected end of JSON input at position ${input.length}`)

    expect(parseJsonError(input, error)).toMatchObject({
      line: 3,
      column: 1,
      position: input.length,
    })
  })

  it('无法提取 position 时使用语法扫描定位行列', () => {
    const input = '{\n  "broken": ,\n  "ok": true\n}'
    const result = parseJsonError(input, new SyntaxError("Unexpected token ',', input is not valid JSON"))

    expect(result.kind).toBe('syntax')
    expect(result.message).toContain('请检查')
    expect(result.position).toBe(input.indexOf(','))
    expect(result.line).toBe(2)
    expect(result.column).toBe(13)
  })

  it('粘贴有效 JSON 时返回两空格格式化的内容', () => {
    expect(formatPastedJson('{"a":1,"b":[1,2]}')).toBe('{\n  "a": 1,\n  "b": [\n    1,\n    2\n  ]\n}')
    expect(formatPastedJson('  [1,2]  ')).toBe('[\n  1,\n  2\n]')
  })

  it('粘贴非 JSON 或无效 JSON 时不处理', () => {
    expect(formatPastedJson('hello')).toBeNull()
    expect(formatPastedJson('{broken')).toBeNull()
    expect(formatPastedJson('   ')).toBeNull()
  })
})
