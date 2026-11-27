import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <section className="container not-found">
      <span className="eyebrow">404 / NOT FOUND</span>
      <h1>这里还没有工具。</h1>
      <p>你访问的页面不存在，回到工具库继续探索吧。</p>
      <Link className="button button-primary" to="/">
        <ArrowLeft size={17} />返回工具库
      </Link>
    </section>
  )
}
