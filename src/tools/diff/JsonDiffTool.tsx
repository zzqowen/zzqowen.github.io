import { useRef, useState } from 'react'
import type { ClipboardEvent, KeyboardEvent, UIEvent } from 'react'
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
import { useI18n } from '../../i18n/context'
import type { TranslationKey } from '../../i18n/dictionary'
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
  kind: 'empty' | 'syntax'
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
  key: TranslationKey
  vars?: Record<string, string | number>
  error?: PaneError
  line?: number
  column?: number
}

const HIGHLIGHT_PRIORITY: Record<JsonDiffKind, number> = {
  removed: 3,
  added: 2,
  changed: 1,
}

const DIFF_KEYS: Record<DiffType, TranslationKey> = {
  added: 'diff.added',
  removed: 'diff.removed',
  changed: 'diff.changed',
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

export default function JsonDiffTool() {
  const { language, t } = useI18n()
  const [inputs, setInputs] = useState<JsonInput[]>(createEmptyInputs)
  const [panes, setPanes] = useState<ComparisonPane[]>([])
  const [view, setView] = useState<ViewMode>('edit')
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set())
  const [notice, setNotice] = useState<Notice>({ tone: 'neutral', key: 'diff.noticeInitial' })
  const paneBodies = useRef<Array<HTMLDivElement | null>>([])
  const isSyncingScroll = useRef(false)

  const hasAnyContent = inputs.some((input) => input.text.trim().length > 0)
  const hasResult = panes.length > 0

  function paneErrorText(error: PaneError) {
    if (language === 'zh') return error.message
    return t(error.kind === 'syntax' ? 'json.errorSyntax' : 'json.errorEmpty')
  }

  const noticeText = notice.error
    ? t(notice.key, { ...notice.vars, message: paneErrorText(notice.error) })
    : t(notice.key, notice.vars)

  function resetComparison() {
    setPanes([])
    setView('edit')
    setCollapsedPaths(new Set())
    paneBodies.current = []
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

  function syncScroll(event: UIEvent<HTMLDivElement>) {
    if (isSyncingScroll.current) return

    const source = event.currentTarget
    isSyncingScroll.current = true
    paneBodies.current.forEach((body) => {
      if (body && body !== source) {
        body.scrollTop = source.scrollTop
        body.scrollLeft = source.scrollLeft
      }
    })
    window.requestAnimationFrame(() => {
      isSyncingScroll.current = false
    })
  }

  function handleInputChange(id: string, text: string) {
    setInputs((current) => current.map((input) => (input.id === id ? { ...input, text } : input)))
    if (hasResult) {
      resetComparison()
      setNotice({ tone: 'neutral', key: 'diff.noticeModified' })
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
    setNotice({ tone: 'neutral', key: 'diff.noticeAdded' })
  }

  function removeInput(id: string) {
    if (inputs.length <= 2) return
    setInputs((current) => current.filter((input) => input.id !== id))
    resetComparison()
    setNotice({ tone: 'neutral', key: 'diff.noticeRemoved' })
  }

  function compareInputs(list: JsonInput[]) {
    const baseParsed = parseJsonText(list[0].text)
    if (!baseParsed.ok) {
      resetComparison()
      setNotice({
        tone: 'error',
        key: 'diff.noticeBaseFailed',
        error: {
          kind: baseParsed.kind,
          message: baseParsed.message,
          line: baseParsed.line,
          column: baseParsed.column,
        },
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
          error: {
            kind: parsed.kind,
            message: parsed.message,
            line: parsed.line,
            column: parsed.column,
          },
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
    paneBodies.current = []

    if (failedCount > 0) {
      setNotice({ tone: 'error', key: 'diff.noticeTargetsFailed', vars: { count: failedCount } })
    } else if (diffCount === 0) {
      setNotice({ tone: 'success', key: 'diff.noticeIdentical', vars: { count: list.length } })
    } else {
      setNotice({ tone: 'success', key: 'diff.noticeCompared', vars: { count: diffCount } })
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
    setNotice({ tone: 'neutral', key: 'diff.noticeCleared' })
  }

  function buildReport() {
    const lines = [t('diff.reportTitle'), t('diff.reportBaseline')]

    panes.filter((pane) => !pane.isBase).forEach((pane) => {
      lines.push('', t('diff.reportHeader', { label: pane.label }))

      if (pane.error) {
        const location = pane.error.line !== undefined && pane.error.column !== undefined
          ? `(${t('json.location', { line: pane.error.line, column: pane.error.column })})`
          : ''
        lines.push(`${t('diff.reportParseFailed')}${paneErrorText(pane.error)}${location}`)
        return
      }

      if (pane.entries.length === 0) {
        lines.push(t('diff.reportIdentical'))
        return
      }

      pane.entries.forEach((entry) => lines.push(formatDiffLine(entry)))
      if (pane.truncated) lines.push(t('diff.reportTruncated'))
    })

    return lines.join('\n')
  }

  async function handleCopy() {
    if (!hasResult) return

    try {
      await navigator.clipboard.writeText(buildReport())
      setNotice({ tone: 'success', key: 'diff.noticeCopied' })
    } catch {
      setNotice({ tone: 'error', key: 'diff.noticeCopyFailed' })
    }
  }

  function handleDownload() {
    if (!hasResult) return

    const blob = new Blob([buildReport()], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'json-diff.txt'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setNotice({ tone: 'success', key: 'diff.noticeDownloaded' })
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
          <span className="diff-toolbar-count">
            <GitCompare size={16} />{t('diff.count', { count: inputs.length })}
          </span>
          <span className="diff-toolbar-hint">{t('diff.baseHint')}</span>
        </div>
        <div className="diff-toolbar-actions">
          <button className="button button-primary" type="button" onClick={handleCompare}>
            <GitCompare size={15} />{t('diff.compare')}
          </button>
          <button
            className="button button-secondary"
            type="button"
            onClick={addInput}
            disabled={inputs.length >= MAX_INPUTS}
          >
            <Plus size={15} />{t('diff.add')}
          </button>
          <button className="button button-ghost" type="button" onClick={handleSample}>
            <Sparkles size={15} />{t('diff.sample')}
          </button>
          <button
            className="button button-ghost"
            type="button"
            onClick={handleClear}
            disabled={!hasAnyContent}
          >
            <Eraser size={15} />{t('diff.clear')}
          </button>
        </div>
      </div>

      <div className="diff-notice" data-tone={notice.tone} role="status" aria-live="polite" aria-atomic="true">
        {notice.tone === 'success'
          ? <CheckCircle2 size={16} />
          : notice.tone === 'error'
            ? <CircleAlert size={16} />
            : <GitCompare size={16} />}
        <span>{noticeText}</span>
        {notice.line !== undefined && notice.column !== undefined && (
          <span className="diff-error-location">
            {t('json.location', { line: notice.line, column: notice.column })}
          </span>
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
                    {index === 0 ? t('diff.baseBadge') : `JSON ${index + 1}`}
                  </span>
                  <h2 id={`diff-title-${input.id}`}>
                    {index === 0
                      ? t('diff.baselineTitle')
                      : t('diff.comparisonTitle', { index: index + 1 })}
                  </h2>
                </div>
                <div className="diff-input-meta">
                  <span>{t('json.chars', { count: input.text.length.toLocaleString() })}</span>
                  {index > 0 && (
                    <button
                      className="diff-remove"
                      type="button"
                      onClick={() => removeInput(input.id)}
                      disabled={inputs.length <= 2}
                      aria-label={t('diff.removeAria', { index: index + 1 })}
                      title={t('diff.remove')}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              <label className="sr-only" htmlFor={`diff-editor-${input.id}`}>
                {index === 0
                  ? t('diff.baselineAria')
                  : t('diff.comparisonAria', { index: index + 1 })}
              </label>
              <textarea
                id={`diff-editor-${input.id}`}
                className="diff-editor"
                value={input.text}
                onChange={(event) => handleInputChange(input.id, event.target.value)}
                onPaste={(event) => handlePaste(event, input)}
                placeholder={index === 0 ? t('diff.pasteBase') : t('diff.pasteTarget')}
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
              <h2 id="diff-compare-heading">{t('diff.highlightTitle')}</h2>
              <div className="diff-legend" aria-label={t('diff.legendAria')}>
                {(Object.keys(DIFF_KEYS) as DiffType[]).map((type) => (
                  <span key={type} data-kind={type}>{t(DIFF_KEYS[type])}</span>
                ))}
              </div>
            </div>
            <div className="diff-compare-actions">
              <button
                className="button button-ghost diff-compare-button"
                type="button"
                onClick={expandAll}
              >
                <Plus size={14} />{t('diff.expandAll')}
              </button>
              <button
                className="button button-ghost diff-compare-button"
                type="button"
                onClick={collapseAll}
              >
                <Eraser size={14} />{t('diff.collapseAll')}
              </button>
              <button
                className="button button-secondary diff-compare-button"
                type="button"
                onClick={() => setView('edit')}
              >
                <ArrowLeft size={14} />{t('diff.backToEdit')}
              </button>
              <button
                className="button button-ghost diff-compare-button"
                type="button"
                onClick={() => { void handleCopy() }}
              >
                <Copy size={14} />{t('diff.copyReport')}
              </button>
              <button
                className="button button-ghost diff-compare-button"
                type="button"
                onClick={handleDownload}
              >
                <Download size={14} />{t('diff.download')}
              </button>
            </div>
          </div>

          <div
            className="diff-panes"
            style={{ gridTemplateColumns: `repeat(${panes.length}, minmax(300px, 1fr))` }}
          >
            {panes.map((pane, index) => (
              <article className="diff-pane" key={pane.id}>
                <header className="diff-pane-head">
                  <span className="diff-pane-label" data-base={pane.isBase}>{pane.label}</span>
                  {pane.error ? (
                    <span className="diff-pane-badge" data-kind="error">{t('diff.parseFailed')}</span>
                  ) : pane.isBase ? (
                    <span className="diff-pane-hint">{t('diff.baseTag')}</span>
                  ) : pane.entries.length === 0 ? (
                    <span className="diff-pane-badge" data-kind="same">
                      <CheckCircle2 size={12} />{t('diff.identical')}
                    </span>
                  ) : (
                    <div className="diff-pane-counts">
                      <span data-kind="added">+{pane.counts.added}</span>
                      <span data-kind="removed">−{pane.counts.removed}</span>
                      <span data-kind="changed">~{pane.counts.changed}</span>
                    </div>
                  )}
                </header>

                <div
                  className="diff-pane-body"
                  ref={(node) => { paneBodies.current[index] = node }}
                  onScroll={pane.error ? undefined : syncScroll}
                >
                  {pane.error ? (
                    <p className="diff-pane-error" role="alert">
                      <CircleAlert size={15} />
                      {paneErrorText(pane.error)}
                      {pane.error.line !== undefined && pane.error.column !== undefined && (
                        <span>{t('json.location', { line: pane.error.line, column: pane.error.column })}</span>
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

                {pane.truncated && <p className="diff-pane-truncated">{t('diff.truncated')}</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      <p className="diff-privacy"><ShieldCheck size={14} />{t('diff.privacy')}</p>
    </div>
  )
}
