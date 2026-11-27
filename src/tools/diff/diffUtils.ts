import { parseJsonError } from '../json/jsonUtils'
import { buildJsonPath } from '../json/jsonPath'

export type DiffType = 'added' | 'removed' | 'changed'

export interface DiffEntry {
  path: string
  type: DiffType
  baseValue?: string
  targetValue?: string
}

export interface DiffResult {
  entries: DiffEntry[]
  truncated: boolean
}

export type JsonParseResult =
  | { ok: true; value: unknown }
  | { ok: false; message: string; line?: number; column?: number }

export const DEFAULT_MAX_ENTRIES = 500

const MAX_VALUE_LENGTH = 120

export function parseJsonText(text: string): JsonParseResult {
  if (text.trim().length === 0) {
    return { ok: false, message: '内容为空，请粘贴 JSON。' }
  }

  try {
    return { ok: true, value: JSON.parse(text) as unknown }
  } catch (error) {
    const detail = parseJsonError(text, error)
    return { ok: false, message: detail.message, line: detail.line, column: detail.column }
  }
}

export function formatDiffValue(value: unknown): string {
  if (value === undefined) return 'undefined'

  const text = JSON.stringify(value)
  if (text === undefined) return String(value)

  return text.length > MAX_VALUE_LENGTH ? `${text.slice(0, MAX_VALUE_LENGTH)}…` : text
}

export function countDiffTypes(entries: DiffEntry[]): Record<DiffType, number> {
  return entries.reduce<Record<DiffType, number>>(
    (counts, entry) => {
      counts[entry.type] += 1
      return counts
    },
    { added: 0, removed: 0, changed: 0 },
  )
}

export function formatDiffLine(entry: DiffEntry): string {
  if (entry.type === 'added') return `+ ${entry.path} = ${entry.targetValue ?? ''}`
  if (entry.type === 'removed') return `- ${entry.path} = ${entry.baseValue ?? ''}`
  return `~ ${entry.path}: ${entry.baseValue ?? ''} → ${entry.targetValue ?? ''}`
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function valueKind(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

export function diffJsonValues(base: unknown, target: unknown, maxEntries = DEFAULT_MAX_ENTRIES): DiffResult {
  const entries: DiffEntry[] = []
  let truncated = false

  const push = (entry: DiffEntry) => {
    if (entries.length >= maxEntries) {
      truncated = true
      return
    }
    entries.push(entry)
  }

  const walk = (left: unknown, right: unknown, path: string) => {
    if (entries.length >= maxEntries) {
      truncated = true
      return
    }

    if (isPlainObject(left) && isPlainObject(right)) {
      const keys = new Set([...Object.keys(left), ...Object.keys(right)])
      keys.forEach((key) => {
        const nextPath = buildJsonPath(path, key)
        const inLeft = Object.prototype.hasOwnProperty.call(left, key)
        const inRight = Object.prototype.hasOwnProperty.call(right, key)

        if (!inRight) {
          push({ path: nextPath, type: 'removed', baseValue: formatDiffValue(left[key]) })
        } else if (!inLeft) {
          push({ path: nextPath, type: 'added', targetValue: formatDiffValue(right[key]) })
        } else {
          walk(left[key], right[key], nextPath)
        }
      })
      return
    }

    if (Array.isArray(left) && Array.isArray(right)) {
      const length = Math.max(left.length, right.length)
      for (let index = 0; index < length; index += 1) {
        const nextPath = `${path}[${index}]`

        if (index >= right.length) {
          push({ path: nextPath, type: 'removed', baseValue: formatDiffValue(left[index]) })
        } else if (index >= left.length) {
          push({ path: nextPath, type: 'added', targetValue: formatDiffValue(right[index]) })
        } else {
          walk(left[index], right[index], nextPath)
        }
      }
      return
    }

    const changed = valueKind(left) !== valueKind(right)
      || JSON.stringify(left) !== JSON.stringify(right)

    if (changed) {
      push({
        path,
        type: 'changed',
        baseValue: formatDiffValue(left),
        targetValue: formatDiffValue(right),
      })
    }
  }

  walk(base, target, '$')
  return { entries, truncated }
}
