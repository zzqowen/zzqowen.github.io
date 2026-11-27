import { useState } from 'react'
import type { ClipboardEvent, KeyboardEvent } from 'react'
import {
  ArrowLeft,
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
import JsonTreeView from '../../components/JsonTreeView'
import type { JsonDiffKind } from '../../components/JsonTreeView'
import { collectContainerPaths } from '../json/jsonPath'
import { formatPastedJson } from '../json/jsonUtils'
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
type ViewMode = 'edit' | 'diff'

interface JsonInput {
  id: string
  text: string
}

interface PaneError {
  message: string
  line?: number
  column?: number
}

interface ComparisonPane {
  id: string
  label: string
  isBase: boolean
  value?: unknown
  error?: PaneError
  entries: DiffEntry[]
  counts: Record<DiffType, number>
  truncated: boolean
  highlights: Map<string, JsonDiffKind>
}

interface Notice {
  tone: NoticeTone
  message: string
  line?: number
  column?: number
}

const HIGHLIGHT_PRIORITY: Record<JsonDiffKind, number> = {
  removed: 3,
  added: 2,
  changed: 1,
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

function emptyCounts(): Record<DiffType, number> {
  return { added: 0, removed: 0, changed: 0 }
}

function setHighlight(map: Map<string, JsonDiffKind>, path: string, kind: JsonDiffKind) {
  const previous = map.get(path)
  if (!previous || HIGHLIGHT_PRIORITY[kind] > HIGHLIGHT_PRIORITY[previous]) {
    map.set(path, kind)
  }
}

function buildReport(panes: ComparisonPane[]): string {
  const lines = ['JSON 对比报告', '基准：JSON 1']

  panes.filter((pane) => !pane.isBase).forEach((pane) => {
    lines.push('', `== ${pane.label} vs JSON 1 ==`)

    if (pane.error) {
      const location = pane.error.line !== undefined && pane.error.column !== undefined
        ? `（第 ${pane.error.line} 行，第 ${pane.error.column} 列）`
        : ''
      lines.push(`解析失败：${pane.error.message}${location}`)
      return
    }

    if (pane.entries.length === 0) {
      lines.push('内容一致')
      return
    }

    pane.entries.forEach((entry) => lines.push(formatDiffLine(entry)))
    if (pane.truncated) lines.push('（差异过多，仅显示前 500 条）')
  })

  return lines.join('\n')
}

export default function JsonDiffTool() {
  const [inputs, setInputs] = useState<JsonInput[]>(createEmptyInputs)
  const [panes, setPanes] = useState<ComparisonPane[]>([])
  const [view, setView] = useState<ViewMode>('edit')
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set())
  const [notice, setNotice] = useState<Notice>({
    tone: 'neutral',
    message: '以 JSON 1 为基准，粘贴其余 JSON 后点击“对比差异”。粘贴时会自动格式化。',
  })

  const hasAnyContent = inputs.some((input) => input.text.trim().length > 0)
  const hasResult = panes.length > 0

  function resetComparison() {
    setPanes([])
    setView('edit')
    setCollapsedPaths(new Set())
  }

  function toggleNode(path: string) {
    setCollapsedPaths((current) => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  function expandAll() {
    setCollapsedPaths(new Set())
  }

  function collapseAll() {
    if (!hasResult) return

    const paths = new Set<string>()
    panes.forEach((pane) => {
      if (!pane.error && pane.value !== undefined) {
        collectContainerPaths(pane.value).forEach((path) => paths.add(path))
      }
    })
    setCollapsedPaths(paths)
  }

  function handleInputChange(id: string, text: string) {
    setInputs((current) => current.map((input) => (input.id === id ? { ...input, text } : input)))
    if (hasResult) {
      resetComparison()
      setNotice({ tone: 'neutral', message: '内容已修改，请重新点击“对比差异”。' })
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>, input: JsonInput) {
    const formatted = formatPastedJson(event.clipboardData.getData('text'))
    if (formatted === null) return

    event.preventDefault()
    const textarea = event.currentTarget
    const start = textarea.selectionStart ?? textarea.value.length
    const end = textarea.selectionEnd ?? start
    const nextText = input.text.slice(0, start) + formatted + input.text.slice(end)
    handleInputChange(input.id, nextText)

    const caret = start + formatted.length
    window.requestAnimationFrame(() => {
      textarea.setSelectionRange(caret, caret)
    })
  }

  function addInput() {
    if (inputs.length >= MAX_INPUTS) return
    setInputs((current) => [...current, { id: nextInputId(), text: '' }])
    resetComparison()
    setNotice({ tone: 'neutral', message: '已添加一份 JSON，粘贴内容后即可对比。' })
  }

  function removeInput(id: string) {
    if (inputs.length <= 2) return
    setInputs((current) => current.filter((input) => input.id !== id))
    resetComparison()
    setNotice({ tone: 'neutral', message: '已移除一份 JSON，请重新对比。' })
  }

  function compareInputs(list: JsonInput[]) {
    const baseParsed = parseJsonText(list[0].text)
    if (!baseParsed.ok) {
      resetComparison()
      setNotice({
        tone: 'error',
        message: `基准 JSON 无法解析：${baseParsed.message}`,
        line: baseParsed.line,
        column: baseParsed.column,
      })
      return
    }

    const baseHighlights = new Map<string, JsonDiffKind>()
    const baseCounts = emptyCounts()

    const targetPanes: ComparisonPane[] = list.slice(1).map((input, index) => {
      const label = `JSON ${index + 2}`
      const parsed = parseJsonText(input.text)

      if (!parsed.ok) {
        return {
          id: input.id,
          label,
          isBase: false,
          error: parsed,
          entries: [],
          counts: emptyCounts(),
          truncated: false,
          highlights: new Map<string, JsonDiffKind>(),
        }
      }

      const { entries, truncated } = diffJsonValues(baseParsed.value, parsed.value)
      const highlights = new Map<string, JsonDiffKind>()

      entries.forEach((entry) => {
        if (entry.type === 'added') {
          setHighlight(highlights, entry.path, 'added')
        } else if (entry.type === 'changed') {
          setHighlight(highlights, entry.path, 'changed')
          setHighlight(baseHighlights, entry.path, 'changed')
          baseCounts.changed += 1
        } else {
          setHighlight(baseHighlights, entry.path, 'removed')
          baseCounts.removed += 1
        }
      })

      return {
        id: input.id,
        label,
        isBase: false,
        value: parsed.value,
        entries,
        counts: countDiffTypes(entries),
        truncated,
        highlights,
      }
    })

    const basePane: ComparisonPane = {
      id: list[0].id,
      label: 'JSON 1',
      isBase: true,
      value: baseParsed.value,
      entries: [],
      counts: baseCounts,
      truncated: false,
      highlights: baseHighlights,
    }

    const failedCount = targetPanes.filter((pane) => pane.error).length
    const diffCount = targetPanes.reduce((sum, pane) => sum + pane.entries.length, 0)

    setPanes([basePane, ...targetPanes])
    setView('diff')
    setCollapsedPaths(new Set())

    if (failedCount > 0) {
      setNotice({ tone: 'error', message: `${failedCount} 份 JSON 无法解析，请在原文中修正后重新对比。` })
    } else if (diffCount === 0) {
      setNotice({ tone: 'success', message: `对比完成：${list.length} 份 JSON 内容完全一致。` })
    } else {
      setNotice({ tone: 'success', message: `对比完成：共 ${diffCount} 处差异，已在原文中高亮。` })
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
    resetComparison()
    setNotice({ tone: 'neutral', message: '已清空，请粘贴需要对比的 JSON。' })
  }

  async function handleCopy() {
    if (!hasResult) return

    try {
      await navigator.clipboard.writeText(buildReport(panes))
      setNotice({ tone: 'success', message: '对比报告已复制到剪贴板。' })
    } catch {
      setNotice({ tone: 'error', message: '自动复制失败，请改用“下载报告”。' })
    }
  }

  function handleDownload() {
    if (!hasResult) return

    const blob = new Blob([buildReport(panes)], { type: 'text/plain;charset=utf-8' })
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

      {view === 'edit' ? (
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
                className="diff-editor"
                value={input.text}
                onChange={(event) => handleInputChange(input.id, event.target.value)}
                onPaste={(event) => handlePaste(event, input)}
                placeholder={index === 0 ? '粘贴作为基准的 JSON，会自动格式化…' : '粘贴需要对比的 JSON，会自动格式化…'}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                wrap="off"
              />
            </section>
          ))}
        </div>
      ) : (
        <section className="diff-compare" aria-labelledby="diff-compare-heading">
          <div className="diff-compare-bar">
            <div className="diff-compare-heading">
              <h2 id="diff-compare-heading">对比高亮</h2>
              <div className="diff-legend" aria-label="差异颜色说明">
                {(Object.keys(DIFF_LABELS) as DiffType[]).map((type) => (
                  <span key={type} data-kind={type}>{DIFF_LABELS[type]}</span>
                ))}
              </div>
            </div>
            <div className="diff-compare-actions">
              <button
                className="button button-ghost diff-compare-button"
                type="button"
                onClick={expandAll}
              >
                <Plus size={14} />展开全部
              </button>
              <button
                className="button button-ghost diff-compare-button"
                type="button"
                onClick={collapseAll}
              >
                <Eraser size={14} />收起全部
              </button>
              <button
                className="button button-secondary diff-compare-button"
                type="button"
                onClick={() => setView('edit')}
              >
                <ArrowLeft size={14} />返回编辑
              </button>
              <button
                className="button button-ghost diff-compare-button"
                type="button"
                onClick={() => { void handleCopy() }}
              >
                <Copy size={14} />复制报告
              </button>
              <button
                className="button button-ghost diff-compare-button"
                type="button"
                onClick={handleDownload}
              >
                <Download size={14} />下载
              </button>
            </div>
          </div>

          <div
            className="diff-panes"
            style={{ gridTemplateColumns: `repeat(${panes.length}, minmax(300px, 1fr))` }}
          >
            {panes.map((pane) => (
              <article className="diff-pane" key={pane.id}>
                <header className="diff-pane-head">
                  <span className="diff-pane-label" data-base={pane.isBase}>{pane.label}</span>
                  {pane.error ? (
                    <span className="diff-pane-badge" data-kind="error">解析失败</span>
                  ) : pane.isBase ? (
                    <span className="diff-pane-hint">基准</span>
                  ) : pane.entries.length === 0 ? (
                    <span className="diff-pane-badge" data-kind="same">
                      <CheckCircle2 size={12} />一致
                    </span>
                  ) : (
                    <div className="diff-pane-counts">
                      <span data-kind="added">+{pane.counts.added}</span>
                      <span data-kind="removed">−{pane.counts.removed}</span>
                      <span data-kind="changed">~{pane.counts.changed}</span>
                    </div>
                  )}
                </header>

                <div className="diff-pane-body">
                  {pane.error ? (
                    <p className="diff-pane-error" role="alert">
                      <CircleAlert size={15} />
                      {pane.error.message}
                      {pane.error.line !== undefined && pane.error.column !== undefined && (
                        <span>第 {pane.error.line} 行，第 {pane.error.column} 列</span>
                      )}
                    </p>
                  ) : (
                    <JsonTreeView
                      value={pane.value}
                      highlights={pane.highlights}
                      collapsedPaths={collapsedPaths}
                      onToggle={toggleNode}
                    />
                  )}
                </div>

                {pane.truncated && <p className="diff-pane-truncated">差异过多，仅高亮前 500 处</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      <p className="diff-privacy"><ShieldCheck size={14} />所有对比均在浏览器本地完成，JSON 不会上传。</p>
    </div>
  )
}
