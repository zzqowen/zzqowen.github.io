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
  message: string
  line?: number
  column?: number
}

function countLines(value: string) {
  return value.length === 0 ? 0 : value.split(/\r\n|\r|\n/).length
}

export default function JsonTool() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [indent, setIndent] = useState<JsonIndent>(2)
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set())
  const [notice, setNotice] = useState<Notice>({
    tone: 'neutral',
    message: '输入 JSON 或载入示例，然后选择需要的操作。',
  })
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
      : { tone: 'neutral', message: '内容已修改，请选择格式化、压缩或校验。' })
  }

  function showError(error: JsonError) {
    setOutput('')
    setCollapsedPaths(new Set())
    setNotice({
      tone: 'error',
      message: error.kind === 'syntax' ? `解析失败：${error.message}` : error.message,
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

      setNotice({ tone: 'success', message: '校验通过，这是一份有效的 JSON。' })
      return
    }

    const result = action === 'format' ? formatJson(input, indent) : minifyJson(input)
    if (!result.success) {
      showError(result.error)
      return
    }

    setOutput(result.output)
    setCollapsedPaths(new Set())
    setNotice({
      tone: 'success',
      message: action === 'format'
        ? `格式化完成，已使用 ${indent} 个空格缩进，可点击左侧箭头展开或收起。`
        : '压缩完成，已移除不必要的空白字符。',
    })
  }

  function handleSample() {
    setInput(EXAMPLE_JSON)
    setOutput('')
    setCollapsedPaths(new Set())
    setNotice({ tone: 'neutral', message: '示例已载入，点击“格式化”查看结果。' })
  }

  function handleClear() {
    setInput('')
    setOutput('')
    setCollapsedPaths(new Set())
    setNotice({ tone: 'neutral', message: '已清空，请输入新的 JSON 内容。' })
    inputRef.current?.focus()
  }

  async function handleCopy() {
    if (!output) return

    try {
      await navigator.clipboard.writeText(output)
      setNotice({ tone: 'success', message: '输出内容已复制到剪贴板。' })
    } catch {
      setNotice({ tone: 'error', message: '自动复制失败，请改用“下载”保存结果。' })
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
    setNotice({ tone: 'success', message: '已生成 formatted.json，开始下载。' })
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
        <div className="json-actions" role="group" aria-label="JSON 处理操作">
          <button
            className="button button-primary"
            type="button"
            disabled={!hasInput}
            onClick={() => handleProcess('format')}
          >
            <WandSparkles size={16} />格式化
          </button>
          <button
            className="button button-secondary"
            type="button"
            disabled={!hasInput}
            onClick={() => handleProcess('minify')}
          >
            <Minimize2 size={16} />压缩
          </button>
          <button
            className="button button-secondary"
            type="button"
            disabled={!hasInput}
            onClick={() => handleProcess('validate')}
          >
            <CheckCircle2 size={16} />校验
          </button>
          <button className="button button-ghost" type="button" onClick={handleSample}>
            <Sparkles size={16} />示例
          </button>
          <button
            className="button button-ghost"
            type="button"
            disabled={!input && !output}
            onClick={handleClear}
          >
            <Eraser size={16} />清空
          </button>
        </div>

        <div className="json-toolbar-settings">
          <label className="json-indent-control">
            <span>缩进</span>
            <select
              aria-label="格式化缩进空格数"
              value={indent}
              onChange={(event) => setIndent(event.target.value === '4' ? 4 : 2)}
            >
              <option value={2}>2 个空格</option>
              <option value={4}>4 个空格</option>
            </select>
          </label>
          <span className="json-shortcut" aria-label="按 Control 或 Command 加 Enter 格式化">
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
          <span>{notice.message}</span>
          {notice.line !== undefined && notice.column !== undefined && (
            <span className="json-error-location">
              第 {notice.line} 行，第 {notice.column} 列
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
                <h2 id="json-input-title">输入 JSON</h2>
                <p>粘贴或输入需要处理的内容</p>
              </div>
            </div>
            <span className="json-counter">{input.length.toLocaleString('zh-CN')} 字符</span>
          </div>
          <textarea
            ref={inputRef}
            className="json-editor"
            value={input}
            onChange={(event) => handleInputChange(event.target.value)}
            placeholder={'例如：{"name":"Owen","local":true}'}
            aria-label="JSON 输入内容"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            wrap="off"
          />
          <div className="json-panel-footer">
            <span>{countLines(input)} 行</span>
            <span>Ctrl/Cmd + Enter 格式化</span>
          </div>
        </section>

        <section className="json-panel" aria-labelledby="json-output-title">
          <div className="json-panel-heading">
            <div className="json-panel-title">
              <span className="json-panel-icon" data-kind="output"><FileCode2 size={17} /></span>
              <div>
                <h2 id="json-output-title">输出结果</h2>
                <p>树形展示，可展开或收起任意层级</p>
              </div>
            </div>
            <div className="json-panel-actions">
              <button
                className="button button-ghost json-panel-button"
                type="button"
                disabled={!hasOutput}
                onClick={expandAll}
                aria-label="展开全部 JSON 节点"
                title="展开全部"
              >
                <Plus size={14} /><span>展开</span>
              </button>
              <button
                className="button button-ghost json-panel-button"
                type="button"
                disabled={!hasOutput}
                onClick={collapseAll}
                aria-label="收起全部 JSON 节点"
                title="收起全部"
              >
                <Minus size={14} /><span>收起</span>
              </button>
              <button
                className="button button-ghost json-panel-button"
                type="button"
                disabled={!hasOutput}
                onClick={() => { void handleCopy() }}
                aria-label="复制输出"
                title="复制输出"
              >
                <Copy size={14} /><span>复制</span>
              </button>
              <button
                className="button button-ghost json-panel-button"
                type="button"
                disabled={!hasOutput}
                onClick={handleDownload}
                aria-label="下载 JSON 文件"
                title="下载 JSON 文件"
              >
                <Download size={14} /><span>下载</span>
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
              <p className="json-output-empty">处理结果将在这里显示…</p>
            )}
          </div>

          <div className="json-panel-footer">
            <span>{hasOutput ? `${countLines(output)} 行` : '等待处理'}</span>
            <span>{hasOutput ? `${output.length.toLocaleString('zh-CN')} 字符` : ''}</span>
          </div>
        </section>
      </div>

      <p className="json-privacy"><ShieldCheck size={14} />所有处理均在浏览器本地完成，不会上传数据。</p>
    </div>
  )
}
