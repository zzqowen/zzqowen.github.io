import { ArrowUpRight, Github } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { moduleRegistry } from '../modules/registry'

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="brand" to="/" aria-label="Owen 工具箱首页">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="brand-name">OWEN</span>
          <span className="brand-divider" />
          <span className="brand-suffix">工具箱</span>
        </Link>

        <nav className="header-nav" aria-label="主导航">
          <NavLink to="/" end className="nav-link">工具库</NavLink>
          {moduleRegistry.map((module) => (
            <NavLink key={module.id} to={`/modules/${module.id}`} className="nav-link">
              {module.name}
            </NavLink>
          ))}
          <span className="local-badge"><span />本地运行</span>
        </nav>

        <a
          className="github-link"
          href="https://github.com/zzqowen/zzqowen.github.io"
          target="_blank"
          rel="noreferrer"
          aria-label="在 GitHub 查看本站源码"
        >
          <Github size={18} />
          <span>GitHub</span>
          <ArrowUpRight size={14} />
        </a>
      </div>
    </header>
  )
}
