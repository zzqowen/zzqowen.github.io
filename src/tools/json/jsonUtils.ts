import { parse as parseJsonWithErrors } from 'jsonc-parser'
import type { ParseError } from 'jsonc-parser'

export type JsonIndent = 2 | 4

export interface JsonError {
  kind: 'empty' | 'syntax'
  message: string
  position?: number
  line?: number
  column?: number
}

export type JsonProcessResult =
  | { success: true; output: string }
  | { success: false; error: JsonError }

export type JsonValidationResult =
  | { success: true }
  | { success: false; error: JsonError }

type JsonParseResult =
  | { success: true; value: unknown }
  | { success: false; error: JsonError }

function getFriendlyMessage(rawMessage: string) {
  if (/unterminated string/i.test(rawMessage)) {
    return '字符串未闭合，请检查双引号或字符串中的转义字符。'
  }

  if (/unexpected end of JSON input|unexpected end of data/i.test(rawMessage)) {
    return 'JSON 内容不完整，请检查是否存在未闭合的字符串、数组或对象。'
  }

  if (/property name|double-quoted property/i.test(rawMessage)) {
    return '对象属性名必须使用双引号，请检查属性名及末尾逗号。'
  }

  if (/expected\s+['"]?:/i.test(rawMessage)) {
    return '对象属性名后缺少冒号（:）。'
  }

  if (/unexpected non-whitespace character/i.test(rawMessage)) {
    return 'JSON 根节点后存在多余内容，请移除额外字符。'
  }

  if (/unexpected token|unexpected number|unexpected string/i.test(rawMessage)) {
    return '存在意外的字符或内容，请检查逗号、引号及括号是否正确。'
  }

  return 'JSON 语法有误，请检查引号、逗号、括号及数据格式。'
}

export function parseJsonError(input: string, error: unknown): JsonError {
  const rawMessage = error instanceof Error ? error.message : String(error)
  const message = getFriendlyMessage(rawMessage)
  const positionMatch = rawMessage.match(/\bposition\s+(\d+)\b/i)
  let position: number | undefined

  if (positionMatch) {
    position = Number(positionMatch[1])
  } else {
    // Chromium 的部分错误消息不包含 offset，使用语法扫描补齐行列定位。
    const errors: ParseError[] = []
    parseJsonWithErrors(input, errors, {
      allowEmptyContent: false,
      allowTrailingComma: false,
      disallowComments: true,
    })
    position = errors[0]?.offset
  }

  if (position === undefined || !Number.isSafeInteger(position) || position < 0 || position > input.length) {
    return { kind: 'syntax', message }
  }

  const lines = input.slice(0, position).split(/\r\n|\r|\n/)
  const line = lines.length
  const column = lines[lines.length - 1].length + 1

  return { kind: 'syntax', message, position, line, column }
}

function parseJson(input: string): JsonParseResult {
  if (input.trim().length === 0) {
    return {
      success: false,
      error: { kind: 'empty', message: '请输入需要处理的 JSON 内容。' },
    }
  }

  try {
    return { success: true, value: JSON.parse(input) as unknown }
  } catch (error) {
    return { success: false, error: parseJsonError(input, error) }
  }
}

function stringifyJson(input: string, indent: number): JsonProcessResult {
  const parsed = parseJson(input)
  if (!parsed.success) return parsed

  return {
    success: true,
    output: JSON.stringify(parsed.value, null, indent)!,
  }
}

export function formatJson(input: string, indent: JsonIndent = 2): JsonProcessResult {
  return stringifyJson(input, indent)
}

export function minifyJson(input: string): JsonProcessResult {
  return stringifyJson(input, 0)
}

export function validateJson(input: string): JsonValidationResult {
  const result = parseJson(input)
  return result.success ? { success: true } : result
}
