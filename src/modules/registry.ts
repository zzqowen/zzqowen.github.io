export interface SiteModule {
  id: string
  name: string
  path: string
}

export const siteModules: SiteModule[] = [
  {
    id: 'tools',
    name: '工具库',
    path: '/',
  },
]
