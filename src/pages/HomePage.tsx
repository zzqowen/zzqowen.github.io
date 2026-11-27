import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowRight,
  Braces,
  Check,
  FileJson2,
  Image as ImageIcon,
  Search,
  SearchX,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { moduleRegistry } from '../modules/registry'
import { filterModules } from '../tools/filterModules'
import { getToolsByModule, toolRegistry } from '../tools/registry'

export default function HomePage() {
  const [query, setQuery] = useState('')
  const filteredModules = useMemo(
    () => filterModules(moduleRegistry, toolRegistry, query),
    [query],
  )

  useEffect(() => {
    document.title = 'Owen 工具箱｜简单好用的在线工具'
  }, [])

  const scrollToTools = () => {
    document.getElementById('tools')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={14} /> YOUR EVERYDAY TOOLBOX</div>
            <h1>把繁琐，<br /><span>留在工具里。</span></h1>
            <p className="hero-description">
              简单、可靠、无需上传的在线工具。<br className="desktop-break" />
              把时间留给创造，把重复交给这里。
            </p>
            <div className="hero-actions">
              <button className="button button-primary button-large" type="button" onClick={scrollToTools}>
                探索全部工具<ArrowDown size={18} />
              </button>
              <span className="hero-assurance"><ShieldCheck size={17} />数据不离开浏览器</span>
            </div>
            <dl className="hero-stats">
              <div><dt>{String(toolRegistry.length).padStart(2, '0')}</dt><dd>在线工具</dd></div>
              <div><dt>0</dt><dd>数据上传</dd></div>
              <div><dt>100<span>%</span></dt><dd>免费使用</dd></div>
            </dl>
          </div>

          <div className="hero-visual" aria-label="JSON 与图片工具示意图">
            <div className="visual-orbit visual-orbit-one" />
            <div className="visual-orbit visual-orbit-two" />
            <div className="code-window">
              <div className="window-bar">
                <div className="window-dots"><i /><i /><i /></div>
                <span>example.json</span>
                <span className="window-status"><Check size={12} />有效</span>
              </div>
              <div className="code-content" aria-hidden="true">
                <div><span className="code-line">1</span><span>{'{'}</span></div>
                <div><span className="code-line">2</span><span className="code-key">"idea"</span><span>: </span><span className="code-string">"make it simple"</span><span>,</span></div>
                <div><span className="code-line">3</span><span className="code-key">"local"</span><span>: </span><span className="code-boolean">true</span><span>,</span></div>
                <div><span className="code-line">4</span><span className="code-key">"tools"</span><span>: [</span></div>
                <div><span className="code-line">5</span><span className="code-string">"json"</span><span>, </span><span className="code-string">"image"</span></div>
                <div><span className="code-line">6</span><span>]</span></div>
                <div><span className="code-line">7</span><span>{'}'}</span></div>
              </div>
              <div className="code-footer"><Braces size={15} /><span>JSON 已格式化</span><span className="code-footer-meta">2 spaces</span></div>
            </div>
            <div className="floating-card floating-image">
              <span className="floating-icon"><ImageIcon size={21} /></span>
              <span><strong>图片已优化</strong><small>WebP · −68%</small></span>
              <span className="floating-check"><Check size={14} /></span>
            </div>
            <div className="floating-card floating-privacy">
              <ShieldCheck size={18} /><span>100% 本地处理</span>
            </div>
            <div className="visual-sticker" aria-hidden="true">LESS<br />FRICTION<span>✳</span></div>
          </div>
        </div>
      </section>

      <section className="tools-section container" id="tools" aria-labelledby="tools-heading">
        <div className="section-heading">
          <div>
            <span className="section-kicker">MODULES / 工具模块</span>
            <h2 id="tools-heading">今天想做点什么？</h2>
          </div>
          <p>每个模块内包含相关工具，打开就能用。</p>
        </div>

        <div className="tool-filters">
          <label className="search-box">
            <Search size={19} aria-hidden="true" />
            <span className="sr-only">搜索模块或工具</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索模块或工具，例如 JSON、对比、图片…"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="清空搜索">
                <X size={16} />
              </button>
            )}
          </label>
        </div>

        <div className="results-meta" aria-live="polite">
          <span>{filteredModules.length} 个模块</span>
          <span>共 {toolRegistry.length} 个工具</span>
        </div>

        {filteredModules.length > 0 ? (
          <div className="tool-grid">
            {filteredModules.map((module, index) => {
              const Icon = module.icon
              const tools = getToolsByModule(module.id)

              return (
                <Link
                  className="tool-card module-card"
                  data-accent={module.accent}
                  to={`/modules/${module.id}`}
                  key={module.id}
                >
                  <div className="tool-card-top">
                    <span className="tool-card-index">0{index + 1}</span>
                    <span className="tool-card-icon"><Icon size={28} strokeWidth={1.7} /></span>
                    <span className="tool-card-arrow"><ArrowRight size={20} /></span>
                  </div>
                  <div className="tool-card-body">
                    <span className="tool-category">{tools.length} 个工具</span>
                    <h3>{module.name}</h3>
                    <p>{module.description}</p>
                    <div className="module-tags">
                      {tools.map((tool) => <span key={tool.id}>{tool.name}</span>)}
                    </div>
                  </div>
                  <div className="tool-card-footer">
                    <span>进入模块</span>
                    <span className="tool-card-tag"><Zap size={13} />即开即用</span>
                  </div>
                </Link>
              )
            })}
            <div className="tool-card tool-card-coming" aria-label="更多模块持续开发中">
              <div className="coming-pattern" aria-hidden="true"><FileJson2 size={38} /><ImageIcon size={30} /></div>
              <div className="tool-card-body">
                <span className="tool-category">持续进化</span>
                <h3>下一个模块，敬请期待</h3>
                <p>新的工具模块正在路上，让这里成为你的工作台。</p>
              </div>
              <span className="coming-label"><span />IN THE MAKING</span>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <SearchX size={34} />
            <h3>没有找到相关模块</h3>
            <p>试试其他关键词，例如“JSON”“压缩”。</p>
            <button className="button button-secondary" type="button" onClick={() => setQuery('')}>
              查看全部模块
            </button>
          </div>
        )}
      </section>

      <section className="privacy-section container" aria-labelledby="privacy-heading">
        <div className="privacy-icon"><ShieldCheck size={31} /></div>
        <div className="privacy-copy">
          <span className="section-kicker">PRIVACY FIRST</span>
          <h2 id="privacy-heading">你的数据，只属于你。</h2>
          <p>所有解析与图片处理都在你的浏览器中完成。没有上传，没有追踪，也没有隐藏在后台的数据传输。</p>
        </div>
        <div className="privacy-points">
          <span><Check size={15} />无需注册</span>
          <span><Check size={15} />无需上传</span>
          <span><Check size={15} />完全免费</span>
        </div>
      </section>
    </>
  )
}
