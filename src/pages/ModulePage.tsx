import { Suspense, useEffect } from 'react'
import { ArrowLeft, LoaderCircle, ShieldCheck } from 'lucide-react'
import { Link, NavLink, Navigate, useParams } from 'react-router-dom'
import { useI18n } from '../i18n/context'
import { localize } from '../i18n/localize'
import { getModuleById } from '../modules/registry'
import { getToolsByModule } from '../tools/registry'
import NotFoundPage from './NotFoundPage'

export default function ModulePage() {
  const { moduleId, toolId } = useParams()
  const { language, t } = useI18n()
  const module = getModuleById(moduleId)
  const tools = module ? getToolsByModule(module.id) : []
  const activeTool = tools.find((tool) => tool.id === toolId) ?? tools[0]

  useEffect(() => {
    if (module && activeTool) {
      document.title = `${localize(activeTool.name, language)}｜${localize(module.name, language)}`
    }
  }, [module, activeTool, language])

  if (!module || !activeTool) return <NotFoundPage />
  if (!toolId) return <Navigate to={`/modules/${module.id}/${activeTool.id}`} replace />

  const ModuleIcon = module.icon
  const ToolComponent = activeTool.component
  const moduleName = localize(module.name, language)

  return (
    <div className="tool-page">
      <div className="container tool-page-heading">
        <Link className="back-link" to="/"><ArrowLeft size={16} />{t('module.back')}</Link>
        <div className="tool-title-row">
          <span className="tool-title-icon" data-accent={module.accent}><ModuleIcon size={27} /></span>
          <div>
            <span className="tool-category">{moduleName}</span>
            <h1>{localize(activeTool.name, language)}</h1>
            <p>{localize(activeTool.description, language)}</p>
          </div>
          <span className="tool-local-note"><ShieldCheck size={16} />{t('module.localNote')}</span>
        </div>

        <nav className="module-tabs" aria-label={t('module.tabsAria', { name: moduleName })}>
          {tools.map((tool) => (
            <NavLink
              key={tool.id}
              to={`/modules/${module.id}/${tool.id}`}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {localize(tool.name, language)}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="container tool-workspace">
        <Suspense fallback={<div className="tool-loading"><LoaderCircle className="spin" size={24} />{t('module.loading')}</div>}>
          <ToolComponent />
        </Suspense>
      </div>
    </div>
  )
}
