import { useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import {
  Braces,
  CheckCircle2,
  CircleAlert,
  Copy,
  Download,
  Eraser,
  FileCode2,
  Minus,
  Minimize2,
  Plus,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from 'lucide-react'
import JsonTreeView from '../../components/JsonTreeView'
import { useI18n } from '../../i18n/context'
import type { TranslationKey } from '../../i18n/dictionary'
import { collectContainerPaths } from './jsonPath'
import './JsonTool.css'
import { formatJson, minifyJson, validateJson } from './jsonUtils'
import type { JsonError, JsonIndent } from './jsonUtils'

const EXAMPLE_JSON = `{
  "name": "Owen 工具箱",
  "version": "1.0.0",
  "local": true,
  "features": [
    "格式化",
    "压缩",
    "语法校验"
  ],
  "author": {
    "name": "Owen",
    "role": "developer"
  }
}`

type ProcessAction = 'format' | 'minify' | 'validate'
type NoticeTone = 'neutral' | 'success' | 'error'

interface Notice {
  tone: NoticeTone
  key: TranslationKey
  vars?: Record<string, string | number>
  detail?: string
  line?: number
  column?: number
}

function countLines(value: string) {
  return value.length === 0 ? 0 : value.split(/\r\n|\r|\n/).length
}

export default function JsonTool() {
  const { language, t } = useI18n()
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [indent, setIndent] = useState<JsonIndent>(2)
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set())
  const [notice, setNotice] = useState<Notice>({ tone: 'neutral', key: 'json.noticeInitial' })
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const hasInput = input.trim().length > 0
  const hasOutput = output.length > 0

  const outputValue = useMemo(() => {
    if (!output) return undefined

    try {
      return JSON.parse(output) as unknown
    } catch {
      return undefined
    }
  }, [output])

  const noticeText = (() => {
    if (notice.detail && language === 'zh') {
      return notice.key === 'json.errorSyntax'
        ? `${t('json.errorPrefix')}${notice.detail}`
        : notice.detail
    }

    const text = t(notice.key, notice.vars)
    return notice.key === 'json.errorSyntax'
      ? `${t('json.errorPrefix')}${text}`
      : text
  })()

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
    if (outputValue === undefined) return
    setCollapsedPaths(new Set(collectContainerPaths(outputValue)))
  }

  function handleInputChange(value: string) {
    setInput(value)
    setOutput('')
    setCollapsedPaths(new Set())
    setNotice((current) => current.tone === 'neutral'
      ? current
      : { tone: 'neutral', key: 'json.noticeModified' })
  }

  function showError(error: JsonError) {
    setOutput('')
    setCollapsedPaths(new Set())
    setNotice({
      tone: 'error',
      key: error.kind === 'syntax' ? 'json.errorSyntax' : 'json.errorEmpty',
      detail: error.message,
      line: error.line,
      column: error.column,
    })
  }

  function handleProcess(action: ProcessAction) {
    if (action === 'validate') {
      const result = validateJson(input)
      if (!result.success) {
        showError(result.error)
        return
      }

      setNotice({ tone: 'success', key: 'json.noticeValid' })
      return
    }

    const result = action === 'format' ? formatJson(input, indent) : minifyJson(input)
    if (!result.success) {
      showError(result.error)
      return
    }

    setOutput(result.output)
    setCollapsedPaths(new Set())
    setNotice(action === 'format'
      ? { tone: 'success', key: 'json.noticeFormatted', vars: { indent } }
      : { tone: 'success', key: 'json.noticeMinified' })
  }

  function handleSample() {
    setInput(EXAMPLE_JSON)
    setOutput('')
    setCollapsedPaths(new Set())
    setNotice({ tone: 'neutral', key: 'json.noticeSample' })
  }

  function handleClear() {
    setInput('')
    setOutput('')
    setCollapsedPaths(new Set())
    setNotice({ tone: 'neutral', key: 'json.noticeCleared' })
    inputRef.current?.focus()
  }

  async function handleCopy() {
    if (!output) return

    try {
      await navigator.clipboard.writeText(output)
      setNotice({ tone: 'success', key: 'json.noticeCopied' })
    } catch {
      setNotice({ tone: 'error', key: 'json.noticeCopyFailed' })
    }
  }

  function handleDownload() {
    if (!output) return

    const blob = new Blob([output], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'formatted.json'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setNotice({ tone: 'success', key: 'json.noticeDownloaded' })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault()
      handleProcess('format')
    }
  }

  return (
    <div className="json-tool" onKeyDown={handleKeyDown}>
      <div className="json-toolbar">
        <div className="json-actions" role="group" aria-label={t('json.inputTitle')}>
          <button
            className="button button-primary"
            type="button"
            disabled={!hasInput}
            onClick={() => handleProcess('format')}
          >
            <WandSparkles size={16} />{t('json.format')}
          </button>
          <button
            className="button button-secondary"
            type="button"
            disabled={!hasInput}
            onClick={() => handleProcess('minify')}
          >
            <Minimize2 size={16} />{t('json.minify')}
          </button>
          <button
            className="button button-secondary"
            type="button"
            disabled={!hasInput}
            onClick={() => handleProcess('validate')}
          >
            <CheckCircle2 size={16} />{t('json.validate')}
          </button>
          <button className="button button-ghost" type="button" onClick={handleSample}>
            <Sparkles size={16} />{t('json.sample')}
          </button>
          <button
            className="button button-ghost"
            type="button"
            disabled={!input && !output}
            onClick={handleClear}
          >
            <Eraser size={16} />{t('json.clear')}
          </button>
        </div>

        <div className="json-toolbar-settings">
          <label className="json-indent-control">
            <span>{t('json.indent')}</span>
            <select
              aria-label={t('json.indent')}
              value={indent}
              onChange={(event) => setIndent(event.target.value === '4' ? 4 : 2)}
            >
              <option value={2}>{t('json.indentSpaces', { count: 2 })}</option>
              <option value={4}>{t('json.indentSpaces', { count: 4 })}</option>
            </select>
          </label>
          <span className="json-shortcut" aria-label={t('json.shortcut')}>
            <kbd>Ctrl / ⌘</kbd><span>+</span><kbd>Enter</kbd>
          </span>
        </div>
      </div>

      <div
        className="json-notice"
        data-tone={notice.tone}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {notice.tone === 'success'
          ? <CheckCircle2 size={17} />
          : notice.tone === 'error'
            ? <CircleAlert size={17} />
            : <Braces size={17} />}
        <div className="json-notice-content">
          <span>{noticeText}</span>
          {notice.line !== undefined && notice.column !== undefined && (
            <span className="json-error-location">
              {t('json.location', { line: notice.line, column: notice.column })}
            </span>
          )}
        </div>
      </div>

      <div className="json-workspace">
        <section className="json-panel" aria-labelledby="json-input-title">
          <div className="json-panel-heading">
            <div className="json-panel-title">
              <span className="json-panel-icon"><FileCode2 size={17} /></span>
              <div>
                <h2 id="json-input-title">{t('json.inputTitle')}</h2>
                <p>{t('json.inputDesc')}</p>
              </div>
            </div>
            <span className="json-counter">{t('json.chars', { count: input.length.toLocaleString() })}</span>
          </div>
          <textarea
            ref={inputRef}
            className="json-editor"
            value={input}
            onChange={(event) => handleInputChange(event.target.value)}
            placeholder={'{"name":"Owen","local":true}'}
            aria-label={t('json.inputAria')}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            wrap="off"
          />
          <div className="json-panel-footer">
            <span>{t('json.lines', { count: countLines(input) })}</span>
            <span>{t('json.shortcut')}</span>
          </div>
        </section>

        <section className="json-panel" aria-labelledby="json-output-title">
          <div className="json-panel-heading">
            <div className="json-panel-title">
              <span className="json-panel-icon" data-kind="output"><FileCode2 size={17} /></span>
              <div>
                <h2 id="json-output-title">{t('json.outputTitle')}</h2>
                <p>{t('json.outputDesc')}</p>
              </div>
            </div>
            <div className="json-panel-actions">
              <button
                className="button button-ghost json-panel-button"
                type="button"
                disabled={!hasOutput}
                onClick={expandAll}
                aria-label={t('json.expandAll')}
                title={t('json.expandAll')}
              >
                <Plus size={14} /><span>{t('json.expand')}</span>
              </button>
              <button
                className="button button-ghost json-panel-button"
                type="button"
                disabled={!hasOutput}
                onClick={collapseAll}
                aria-label={t('json.collapseAll')}
                title={t('json.collapseAll')}
              >
                <Minus size={14} /><span>{t('json.collapse')}</span>
              </button>
              <button
                className="button button-ghost json-panel-button"
                type="button"
                disabled={!hasOutput}
                onClick={() => { void handleCopy() }}
                aria-label={t('json.copyAria')}
                title={t('json.copyAria')}
              >
                <Copy size={14} /><span>{t('json.copy')}</span>
              </button>
              <button
                className="button button-ghost json-panel-button"
                type="button"
                disabled={!hasOutput}
                onClick={handleDownload}
                aria-label={t('json.downloadAria')}
                title={t('json.downloadAria')}
              >
                <Download size={14} /><span>{t('json.download')}</span>
              </button>
            </div>
          </div>

          <div className="json-output-body">
            {hasOutput && outputValue !== undefined ? (
              <JsonTreeView
                value={outputValue}
                collapsedPaths={collapsedPaths}
                onToggle={toggleNode}
              />
            ) : (
              <p className="json-output-empty">{t('json.outputEmpty')}</p>
            )}
          </div>

          <div className="json-panel-footer">
            <span>{hasOutput ? t('json.lines', { count: countLines(output) }) : t('json.waiting')}</span>
            <span>{hasOutput ? t('json.chars', { count: output.length.toLocaleString() }) : ''}</span>
          </div>
        </section>
      </div>

      <p className="json-privacy"><ShieldCheck size={14} />{t('json.privacy')}</p>
    </div>
  )
}
