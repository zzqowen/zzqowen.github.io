import { Suspense, useEffect } from 'react'
import { ArrowLeft, LoaderCircle, ShieldCheck } from 'lucide-react'
import { Link, NavLink, Navigate, useParams } from 'react-router-dom'
import { getModuleById } from '../modules/registry'
import { getToolsByModule } from '../tools/registry'
import NotFoundPage from './NotFoundPage'

export default function ModulePage() {
  const { moduleId, toolId } = useParams()
  const module = getModuleById(moduleId)
  const tools = module ? getToolsByModule(module.id) : []
  const activeTool = tools.find((tool) => tool.id === toolId) ?? tools[0]

  useEffect(() => {
    if (module && activeTool) document.title = `${activeTool.name}｜${module.name}`
  }, [module, activeTool])

  if (!module || !activeTool) return <NotFoundPage />
  if (!toolId) return <Navigate to={`/modules/${module.id}/${activeTool.id}`} replace />

  const ModuleIcon = module.icon
  const ToolComponent = activeTool.component

  return (
    <div className="tool-page">
      <div className="container tool-page-heading">
        <Link className="back-link" to="/"><ArrowLeft size={16} />返回工具库</Link>
        <div className="tool-title-row">
          <span className="tool-title-icon" data-accent={module.accent}><ModuleIcon size={27} /></span>
          <div>
            <span className="tool-category">{module.name}</span>
            <h1>{activeTool.name}</h1>
            <p>{activeTool.description}</p>
          </div>
          <span className="tool-local-note"><ShieldCheck size={16} />仅在本地处理</span>
        </div>

        <nav className="module-tabs" aria-label={`${module.name}工具切换`}>
          {tools.map((tool) => (
            <NavLink
              key={tool.id}
              to={`/modules/${module.id}/${tool.id}`}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {tool.name}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="container tool-workspace">
        <Suspense fallback={<div className="tool-loading"><LoaderCircle className="spin" size={24} />正在加载工具…</div>}>
          <ToolComponent />
        </Suspense>
      </div>
    </div>
  )
}
