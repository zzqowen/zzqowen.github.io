import { Suspense, useEffect } from 'react'
import { ArrowLeft, LoaderCircle, ShieldCheck } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { getToolById } from '../tools/registry'
import NotFoundPage from './NotFoundPage'

export default function ToolPage() {
  const { toolId } = useParams()
  const tool = getToolById(toolId)

  useEffect(() => {
    if (tool) document.title = `${tool.name}｜Owen 工具箱`
  }, [tool])

  if (!tool) return <NotFoundPage />

  const Icon = tool.icon
  const ToolComponent = tool.component

  return (
    <div className="tool-page">
      <div className="container tool-page-heading">
        <Link className="back-link" to="/"><ArrowLeft size={16} />返回工具库</Link>
        <div className="tool-title-row">
          <span className="tool-title-icon" data-accent={tool.accent}><Icon size={27} /></span>
          <div>
            <span className="tool-category">{tool.category}</span>
            <h1>{tool.name}</h1>
            <p>{tool.description}</p>
          </div>
          <span className="tool-local-note"><ShieldCheck size={16} />仅在本地处理</span>
        </div>
      </div>
      <div className="container tool-workspace">
        <Suspense fallback={<div className="tool-loading"><LoaderCircle className="spin" size={24} />正在加载工具…</div>}>
          <ToolComponent />
        </Suspense>
      </div>
    </div>
  )
}
