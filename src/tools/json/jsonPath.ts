const IDENTIFIER_PATTERN = /^[A-Za-z_$][\w$]*$/

export function buildJsonPath(parent: string, key: string | number): string {
  if (typeof key === 'number') return `${parent}[${key}]`
  return IDENTIFIER_PATTERN.test(key) ? `${parent}.${key}` : `${parent}[${JSON.stringify(key)}]`
}

export function collectContainerPaths(value: unknown, path = '$', result: string[] = []): string[] {
  if (Array.isArray(value)) {
    result.push(path)
    value.forEach((item, index) => { collectContainerPaths(item, buildJsonPath(path, index), result) })
    return result
  }

  if (typeof value === 'object' && value !== null) {
    result.push(path)
    Object.entries(value).forEach(([key, item]) => { collectContainerPaths(item, buildJsonPath(path, key), result) })
  }

  return result
}
