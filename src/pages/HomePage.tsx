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
import { useI18n } from '../i18n/context'
import { localize } from '../i18n/localize'
import { moduleRegistry } from '../modules/registry'
import { filterModules } from '../tools/filterModules'
import { getToolsByModule, toolRegistry } from '../tools/registry'

export default function HomePage() {
  const { language, t } = useI18n()
  const [query, setQuery] = useState('')
  const filteredModules = useMemo(
    () => filterModules(moduleRegistry, toolRegistry, query),
    [query],
  )

  useEffect(() => {
    document.title = t('home.pageTitle')
  }, [t])

  const scrollToTools = () => {
    document.getElementById('tools')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={14} /> {t('home.eyebrow')}</div>
            <h1>{t('home.titleLine1')}<br /><span>{t('home.titleLine2')}</span></h1>
            <p className="hero-description">
              {t('home.description1')}<br className="desktop-break" />
              {t('home.description2')}
            </p>
            <div className="hero-actions">
              <button className="button button-primary button-large" type="button" onClick={scrollToTools}>
                {t('home.explore')}<ArrowDown size={18} />
              </button>
              <span className="hero-assurance"><ShieldCheck size={17} />{t('home.assurance')}</span>
            </div>
            <dl className="hero-stats">
              <div><dt>{String(toolRegistry.length).padStart(2, '0')}</dt><dd>{t('home.statTools')}</dd></div>
              <div><dt>0</dt><dd>{t('home.statUploads')}</dd></div>
              <div><dt>100<span>%</span></dt><dd>{t('home.statFree')}</dd></div>
            </dl>
          </div>

          <div className="hero-visual" aria-label={t('home.heroAria')}>
            <div className="visual-orbit visual-orbit-one" />
            <div className="visual-orbit visual-orbit-two" />
            <div className="code-window">
              <div className="window-bar">
                <div className="window-dots"><i /><i /><i /></div>
                <span>example.json</span>
                <span className="window-status"><Check size={12} />{t('home.valid')}</span>
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
              <div className="code-footer"><Braces size={15} /><span>{t('home.formatted')}</span><span className="code-footer-meta">2 spaces</span></div>
            </div>
            <div className="floating-card floating-image">
              <span className="floating-icon"><ImageIcon size={21} /></span>
              <span><strong>{t('home.imageOptimized')}</strong><small>WebP · −68%</small></span>
              <span className="floating-check"><Check size={14} /></span>
            </div>
            <div className="floating-card floating-privacy">
              <ShieldCheck size={18} /><span>{t('home.localOnly')}</span>
            </div>
            <div className="visual-sticker" aria-hidden="true">LESS<br />FRICTION<span>✳</span></div>
          </div>
        </div>
      </section>

      <section className="tools-section container" id="tools" aria-labelledby="tools-heading">
        <div className="section-heading">
          <div>
            <span className="section-kicker">{t('home.modulesKicker')}</span>
            <h2 id="tools-heading">{t('home.modulesTitle')}</h2>
          </div>
          <p>{t('home.modulesHint')}</p>
        </div>

        <div className="tool-filters">
          <label className="search-box">
            <Search size={19} aria-hidden="true" />
            <span className="sr-only">{t('home.searchAria')}</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('home.search')}
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label={t('home.clearSearch')}>
                <X size={16} />
              </button>
            )}
          </label>
        </div>

        <div className="results-meta" aria-live="polite">
          <span>{t('home.moduleCount', { count: filteredModules.length })}</span>
          <span>{t('home.toolTotal', { count: toolRegistry.length })}</span>
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
                    <span className="tool-category">{t('home.toolCount', { count: tools.length })}</span>
                    <h3>{localize(module.name, language)}</h3>
                    <p>{localize(module.description, language)}</p>
                    <div className="module-tags">
                      {tools.map((tool) => <span key={tool.id}>{localize(tool.name, language)}</span>)}
                    </div>
                  </div>
                  <div className="tool-card-footer">
                    <span>{t('home.enterModule')}</span>
                    <span className="tool-card-tag"><Zap size={13} />{t('home.ready')}</span>
                  </div>
                </Link>
              )
            })}
            <div className="tool-card tool-card-coming" aria-label={t('home.modulesAria')}>
              <div className="coming-pattern" aria-hidden="true"><FileJson2 size={38} /><ImageIcon size={30} /></div>
              <div className="tool-card-body">
                <span className="tool-category">{t('home.comingKicker')}</span>
                <h3>{t('home.comingTitle')}</h3>
                <p>{t('home.comingDesc')}</p>
              </div>
              <span className="coming-label"><span />{t('home.comingLabel')}</span>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <SearchX size={34} />
            <h3>{t('home.emptyTitle')}</h3>
            <p>{t('home.emptyDesc')}</p>
            <button className="button button-secondary" type="button" onClick={() => setQuery('')}>
              {t('home.emptyAction')}
            </button>
          </div>
        )}
      </section>

      <section className="privacy-section container" aria-labelledby="privacy-heading">
        <div className="privacy-icon"><ShieldCheck size={31} /></div>
        <div className="privacy-copy">
          <span className="section-kicker">{t('home.privacyKicker')}</span>
          <h2 id="privacy-heading">{t('home.privacyTitle')}</h2>
          <p>{t('home.privacyDesc')}</p>
        </div>
        <div className="privacy-points">
          <span><Check size={15} />{t('home.privacyNoSignup')}</span>
          <span><Check size={15} />{t('home.privacyNoUpload')}</span>
          <span><Check size={15} />{t('home.privacyFree')}</span>
        </div>
      </section>
    </>
  )
}
