import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/context'

export default function NotFoundPage() {
  const { t } = useI18n()

  return (
    <section className="container not-found">
      <span className="eyebrow">{t('notfound.kicker')}</span>
      <h1>{t('notfound.title')}</h1>
      <p>{t('notfound.desc')}</p>
      <Link className="button button-primary" to="/">
        <ArrowLeft size={17} />{t('notfound.action')}
      </Link>
    </section>
  )
}
