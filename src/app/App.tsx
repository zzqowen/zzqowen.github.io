import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import HomePage from '../pages/HomePage'
import ModulePage from '../pages/ModulePage'
import NotFoundPage from '../pages/NotFoundPage'
import { getToolById } from '../tools/registry'
import SiteHeader from './SiteHeader'
import SiteFooter from './SiteFooter'

function ScrollManager() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  return null
}

function LegacyToolRedirect() {
  const { toolId } = useParams()
  const tool = getToolById(toolId)

  return <Navigate to={tool ? `/modules/${tool.moduleId}/${tool.id}` : '/'} replace />
}

export default function App() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  return (
    <div className="app-shell">
      <ScrollManager />
      <SiteHeader />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/modules/:moduleId" element={<ModulePage />} />
          <Route path="/modules/:moduleId/:toolId" element={<ModulePage />} />
          <Route path="/tools/:toolId" element={<LegacyToolRedirect />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      {isHome && <SiteFooter />}
    </div>
  )
}
