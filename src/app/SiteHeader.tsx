import { ArrowUpRight, Github, Languages } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { useI18n } from '../i18n/context'
import { localize } from '../i18n/localize'
import { moduleRegistry } from '../modules/registry'

export default function SiteHeader() {
  const { language, toggleLanguage, t } = useI18n()

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="brand" to="/" aria-label={t('nav.homeAria')}>
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="brand-name">OWEN</span>
          <span className="brand-divider" />
          <span className="brand-suffix">Toolbox</span>
        </Link>

        <nav className="header-nav" aria-label={t('nav.tools')}>
          <NavLink to="/" end className="nav-link">{t('nav.tools')}</NavLink>
          {moduleRegistry.map((module) => (
            <NavLink key={module.id} to={`/modules/${module.id}`} className="nav-link">
              {localize(module.name, language)}
            </NavLink>
          ))}
          <span className="local-badge"><span />{t('nav.local')}</span>
        </nav>

        <div className="header-actions">
          <button
            className="lang-toggle"
            type="button"
            onClick={toggleLanguage}
            aria-label={t('lang.toggle')}
            title={t('lang.toggle')}
          >
            <Languages size={15} />
            <span>{language === 'zh' ? 'EN' : '中文'}</span>
          </button>
          <a
            className="github-link"
            href="https://github.com/zzqowen/zzqowen.github.io"
            target="_blank"
            rel="noreferrer"
            aria-label={t('nav.github')}
          >
            <Github size={18} />
            <span>GitHub</span>
            <ArrowUpRight size={14} />
          </a>
        </div>
      </div>
    </header>
  )
}
