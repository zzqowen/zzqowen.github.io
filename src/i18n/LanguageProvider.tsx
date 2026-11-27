import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { dictionary } from './dictionary'
import type { TranslationKey } from './dictionary'
import { I18nContext } from './context'
import type { Language } from './localize'

const STORAGE_KEY = 'owen-toolbox-language'

function readInitialLanguage(): Language {
  const saved = window.localStorage.getItem(STORAGE_KEY)
  return saved === 'en' ? 'en' : 'zh'
}

export default function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(readInitialLanguage)

  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en'
    window.localStorage.setItem(STORAGE_KEY, language)
  }, [language])

  const t = useCallback((key: TranslationKey, vars?: Record<string, string | number>) => {
    const template = dictionary[language][key] ?? dictionary.zh[key] ?? key
    if (!vars) return template

    return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ''))
  }, [language])

  const value = useMemo(() => ({
    language,
    setLanguage,
    toggleLanguage: () => setLanguage((current) => (current === 'zh' ? 'en' : 'zh')),
    t,
  }), [language, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
