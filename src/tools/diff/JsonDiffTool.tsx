import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import {
  CheckCircle2,
  CircleAlert,
  Copy,
  Download,
  Eraser,
  GitCompare,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react'
import type { DiffEntry, DiffType } from './diffUtils'
import {
  countDiffTypes,
  diffJsonValues,
  formatDiffLine,
  parseJsonText,
} from './diffUtils'
import './JsonDiff.css'

const MAX_INPUTS = 6

const SAMPLE_BASE = `{
  "name": "Owen 工具箱",
  "version": "1.0.0",
  "local": true,
  "tools": ["json", "image"],
  "author": {
    "name": "Owen",
    "role": "developer"
  }
}`

const SAMPLE_TARGET_A = `{
  "name": "Owen 工具箱",
  "version": "1.1.0",
  "local": true,
  "tools": ["json", "image", "diff"],
  "author": {
    "name": "Owen",
    "role": "developer"
  }
}`

const SAMPLE_TARGET_B = `{
  "name": "Owen Toolbox",
  "version": "1.0.0",
  "local": false,
  "tools": ["json", "image"],
  "author": {
    "name": "Owen"
  }
}`

type NoticeTone = 'neutral' | 'success' | 'error'
type DiffFilter = DiffType | 'all'

interface JsonInput {
  id: string
  text: string
}

interface ComparisonItem {
  id: string
  label: string
  entries: DiffEntry[]
  counts: Record<DiffType, number>
  truncated: boolean
  error?: { message: string; line?: number; column?: number }
}

interface Notice {
  tone: NoticeTone
  message: string
  line?: number
  column?: number
}

const FILTERS: Array<{ value: DiffFilter; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'added', label: '新增' },
  { value: 'removed', label: '删除' },
  { value: 'changed', label: '修改' },
]

const DIFF_BADGES: Record<DiffType, string> = {
  added: '+',
  removed: '−',
  changed: '~',
}

const DIFF_LABELS: Record<DiffType, string> = {
  added: '新增',
  removed: '删除',
  changed: '修改',
}

let inputSequence = 0

function nextInputId() {
  inputSequence += 1
  return `json-input-${Date.now()}-${inputSequence}`
}

function createEmptyInputs(): JsonInput[] {
  return [
    { id: nextInputId(), text: '' },
    { id: nextInputId(), text: '' },
  ]
}

function buildReport(items: ComparisonItem[]): string {
  const lines = ['JSON 对比报告', '基准：JSON 1']

  items.forEach((item) => {
    lines.push('', `== ${item.label} vs JSON 1 ==`)

    if (item.error) {
      const location = item.error.line !== undefined && item.error.column !== undefined
        ? `（第 ${item.error.line} 行，第 ${item.error.column} 列）`
        : ''
      lines.push(`解析失败：${item.error.message}${location}`)
      return
    }

    if (item.entries.length === 0) {
      lines.push('内容一致')
      return
    }

    item.entries.forEach((entry) => lines.push(formatDiffLine(entry)))
    if (item.truncated) lines.push('（差异过多，仅显示前 500 条）')
  })

  return lines.join('\n')
}

export default function JsonDiffTool() {
  const [inputs, setInputs] = useState<JsonInput[]>(createEmptyInputs)
  const [results, setResults] = useState<ComparisonItem[]>([])
  const [filter, setFilter] = useState<DiffFilter>('all')
  const [notice, setNotice] = useState<Notice>({
    tone: 'neutral',
    message: '以 JSON 1 为基准，粘贴其余 JSON 后点击“对比差异”。',
  })
  const firstInputRef = useRef<HTMLTextAreaElement>(null)

  const hasAnyContent = inputs.some((input) => input.text.trim().length > 0)
  const totalDiff = results.reduce((sum, item) => sum + item.entries.length, 0)

  function resetResults() {
    setResults([])
    setFilter('all')
  }

  function handleInputChange(id: string, text: string) {
    setInputs((current) => current.map((input) => (input.id === id ? { ...input, text } : input)))
    if (results.length > 0) {
      resetResults()
      setNotice({ tone: 'neutral', message: '内容已修改，请重新点击“对比差异”。' })
    }
  }

  function addInput() {
    if (inputs.length >= MAX_INPUTS) return
    setInputs((current) => [...current, { id: nextInputId(), text: '' }])
    resetResults()
    setNotice({ tone: 'neutral', message: '已添加一份 JSON，粘贴内容后即可对比。' })
  }

  function removeInput(id: string) {
    if (inputs.length <= 2) return
    setInputs((current) => current.filter((input) => input.id !== id))
    resetResults()
    setNotice({ tone: 'neutral', message: '已移除一份 JSON，请重新对比。' })
  }

  function compareInputs(list: JsonInput[]) {
    const baseParsed = parseJsonText(list[0].text)
    if (!baseParsed.ok) {
      setResults([])
      setFilter('all')
      setNotice({
        tone: 'error',
        message: `基准 JSON 无法解析：${baseParsed.message}`,
        line: baseParsed.line,
        column: baseParsed.column,
      })
      return
    }

    const items: ComparisonItem[] = list.slice(1).map((input, index) => {
      const label = `JSON ${index + 2}`
      const parsed = parseJsonText(input.text)

      if (!parsed.ok) {
        return {
          id: input.id,
          label,
          entries: [],
          counts: { added: 0, removed: 0, changed: 0 },
          truncated: false,
          error: { message: parsed.message, line: parsed.line, column: parsed.column },
        }
      }

      const { entries, truncated } = diffJsonValues(baseParsed.value, parsed.value)
      return {
        id: input.id,
        label,
        entries,
        counts: countDiffTypes(entries),
        truncated,
      }
    })

    const failedCount = items.filter((item) => item.error).length
    const diffCount = items.reduce((sum, item) => sum + item.entries.length, 0)

    setResults(items)
    setFilter('all')

    if (failedCount > 0) {
      setNotice({ tone: 'error', message: `${failedCount} 份 JSON 无法解析，请修正后重新对比。` })
    } else if (diffCount === 0) {
      setNotice({ tone: 'success', message: `对比完成：${list.length} 份 JSON 内容完全一致。` })
    } else {
      setNotice({ tone: 'success', message: `对比完成：共发现 ${diffCount} 处差异。` })
    }
  }

  function handleCompare() {
    compareInputs(inputs)
  }

  function handleSample() {
    const sampleInputs: JsonInput[] = [
      { id: nextInputId(), text: SAMPLE_BASE },
      { id: nextInputId(), text: SAMPLE_TARGET_A },
      { id: nextInputId(), text: SAMPLE_TARGET_B },
    ]
    setInputs(sampleInputs)
    compareInputs(sampleInputs)
  }

  function handleClear() {
    setInputs(createEmptyInputs())
    resetResults()
    setNotice({ tone: 'neutral', message: '已清空，请粘贴需要对比的 JSON。' })
    firstInputRef.current?.focus()
  }

  async function handleCopy() {
    if (results.length === 0) return

    try {
      await navigator.clipboard.writeText(buildReport(results))
      setNotice({ tone: 'success', message: '对比报告已复制到剪贴板。' })
    } catch {
      setNotice({ tone: 'error', message: '自动复制失败，请改用“下载报告”。' })
    }
  }

  function handleDownload() {
    if (results.length === 0) return

    const blob = new Blob([buildReport(results)], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'json-diff.txt'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setNotice({ tone: 'success', message: '已生成 json-diff.txt，开始下载。' })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault()
      handleCompare()
    }
  }

  return (
    <div className="diff-tool" onKeyDown={handleKeyDown}>
      <div className="diff-toolbar">
        <div className="diff-toolbar-info">
          <span className="diff-toolbar-count"><GitCompare size={16} />{inputs.length} 份 JSON</span>
          <span className="diff-toolbar-hint">以 JSON 1 为基准</span>
        </div>
        <div className="diff-toolbar-actions">
          <button className="button button-primary" type="button" onClick={handleCompare}>
            <GitCompare size={15} />对比差异
          </button>
          <button
            className="button button-secondary"
            type="button"
            onClick={addInput}
            disabled={inputs.length >= MAX_INPUTS}
          >
            <Plus size={15} />添加 JSON
          </button>
          <button className="button button-ghost" type="button" onClick={handleSample}>
            <Sparkles size={15} />示例
          </button>
          <button
            className="button button-ghost"
            type="button"
            onClick={handleClear}
            disabled={!hasAnyContent}
          >
            <Eraser size={15} />清空
          </button>
        </div>
      </div>

      <div className="diff-notice" data-tone={notice.tone} role="status" aria-live="polite" aria-atomic="true">
        {notice.tone === 'success'
          ? <CheckCircle2 size={16} />
          : notice.tone === 'error'
            ? <CircleAlert size={16} />
            : <GitCompare size={16} />}
        <span>{notice.message}</span>
        {notice.line !== undefined && notice.column !== undefined && (
          <span className="diff-error-location">第 {notice.line} 行，第 {notice.column} 列</span>
        )}
        <span className="diff-shortcut"><kbd>Ctrl / ⌘</kbd> + <kbd>Enter</kbd></span>
      </div>

      <div className="diff-inputs">
        {inputs.map((input, index) => (
          <section className="diff-input" key={input.id} aria-labelledby={`diff-title-${input.id}`}>
            <div className="diff-input-head">
              <div className="diff-input-title">
                <span className="diff-input-badge" data-base={index === 0}>
                  {index === 0 ? '基准' : `JSON ${index + 1}`}
                </span>
                <h2 id={`diff-title-${input.id}`}>{index === 0 ? '基准 JSON' : `对比 JSON ${index + 1}`}</h2>
              </div>
              <div className="diff-input-meta">
                <span>{input.text.length.toLocaleString('zh-CN')} 字符</span>
                {index > 0 && (
                  <button
                    className="diff-remove"
                    type="button"
                    onClick={() => removeInput(input.id)}
                    disabled={inputs.length <= 2}
                    aria-label={`移除对比 JSON ${index + 1}`}
                    title="移除这份 JSON"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
            <label className="sr-only" htmlFor={`diff-editor-${input.id}`}>
              {index === 0 ? '基准 JSON 内容' : `对比 JSON ${index + 1} 内容`}
            </label>
            <textarea
              id={`diff-editor-${input.id}`}
              ref={index === 0 ? firstInputRef : undefined}
              className="diff-editor"
              value={input.text}
              onChange={(event) => handleInputChange(input.id, event.target.value)}
              placeholder={index === 0 ? '粘贴作为基准的 JSON…' : '粘贴需要对比的 JSON…'}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              wrap="off"
            />
          </section>
        ))}
      </div>

      {results.length > 0 && (
        <section className="diff-results" aria-labelledby="diff-results-heading">
          <div className="diff-results-head">
            <div className="diff-results-title">
              <span className="section-kicker">DIFF / 差异结果</span>
              <h2 id="diff-results-heading">
                对比结果
                <span className="diff-total">{totalDiff} 处差异</span>
              </h2>
            </div>
            <div className="diff-results-tools">
              <div className="diff-filter" role="group" aria-label="筛选差异类型">
                {FILTERS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={filter === item.value ? 'active' : ''}
                    aria-pressed={filter === item.value}
                    onClick={() => setFilter(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <button
                className="button button-ghost diff-result-button"
                type="button"
                onClick={() => { void handleCopy() }}
              >
                <Copy size={14} />复制报告
              </button>
              <button
                className="button button-ghost diff-result-button"
                type="button"
                onClick={handleDownload}
              >
                <Download size={14} />下载
              </button>
            </div>
          </div>

          <div className="diff-result-list">
            {results.map((item) => {
              const visibleEntries = filter === 'all'
                ? item.entries
                : item.entries.filter((entry) => entry.type === filter)

              return (
                <article className="diff-result" key={item.id} data-empty={!item.error && item.entries.length === 0}>
                  <header className="diff-result-head">
                    <div className="diff-result-name">
                      <span className="diff-result-label">{item.label}</span>
                      <span className="diff-result-vs">对比 JSON 1</span>
                    </div>
                    {item.error ? (
                      <span className="diff-result-badge" data-kind="error">解析失败</span>
                    ) : item.entries.length === 0 ? (
                      <span className="diff-result-badge" data-kind="same">
                        <CheckCircle2 size={13} />内容一致
                      </span>
                    ) : (
                      <div className="diff-result-counts">
                        <span data-kind="added">新增 {item.counts.added}</span>
                        <span data-kind="removed">删除 {item.counts.removed}</span>
                        <span data-kind="changed">修改 {item.counts.changed}</span>
                      </div>
                    )}
                  </header>

                  {item.error ? (
                    <p className="diff-result-error" role="alert">
                      <CircleAlert size={15} />
                      {item.error.message}
                      {item.error.line !== undefined && item.error.column !== undefined && (
                        <span>第 {item.error.line} 行，第 {item.error.column} 列</span>
                      )}
                    </p>
                  ) : item.entries.length === 0 ? (
                    <p className="diff-result-same">与基准 JSON 完全一致，没有差异。</p>
                  ) : visibleEntries.length === 0 ? (
                    <p className="diff-result-same">当前筛选下没有差异项。</p>
                  ) : (
                    <ul className="diff-rows">
                      {visibleEntries.map((entry, index) => (
                        <li className="diff-row" data-type={entry.type} key={`${entry.path}-${index}`}>
                          <span className="diff-badge" aria-label={DIFF_LABELS[entry.type]}>
                            {DIFF_BADGES[entry.type]}
                          </span>
                          <div className="diff-row-body">
                            <code className="diff-path">{entry.path}</code>
                            <div className="diff-values">
                              {entry.type !== 'added' && (
                                <code className="diff-value" data-side="base">{entry.baseValue}</code>
                              )}
                              {entry.type === 'changed' && <span className="diff-arrow">→</span>}
                              {entry.type !== 'removed' && (
                                <code className="diff-value" data-side="target">{entry.targetValue}</code>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {item.truncated && (
                    <p className="diff-truncated">差异过多，仅显示前 500 条，请缩小对比范围。</p>
                  )}
                </article>
              )
            })}
          </div>
        </section>
      )}

      <p className="diff-privacy"><ShieldCheck size={14} />所有对比均在浏览器本地完成，JSON 不会上传。</p>
    </div>
  )
}
