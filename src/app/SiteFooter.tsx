import { Heart } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <Link className="brand brand-footer" to="/">
            <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
            <span className="brand-name">OWEN</span>
          </Link>
          <p>简单的小事，简单地做。</p>
        </div>
        <div className="footer-note">
          <span>用心构建</span>
          <Heart size={13} aria-label="热爱" />
          <span>© {new Date().getFullYear()} Owen Toolbox</span>
        </div>
      </div>
    </footer>
  )
}
