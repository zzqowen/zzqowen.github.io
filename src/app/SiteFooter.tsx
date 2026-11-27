import { Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/context'

export default function SiteFooter() {
  const { t } = useI18n()

  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <Link className="brand brand-footer" to="/">
            <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
            <span className="brand-name">OWEN</span>
          </Link>
          <p>{t('footer.tagline')}</p>
        </div>
        <div className="footer-note">
          <span>{t('footer.built')}</span>
          <Heart size={13} aria-label={t('footer.love')} />
          <span>{t('footer.copyright', { year: new Date().getFullYear() })}</span>
        </div>
      </div>
    </footer>
  )
}
