export type Language = 'zh' | 'en'

export interface LocalizedText {
  zh: string
  en: string
}

export function localize(text: LocalizedText, language: Language): string {
  return text[language]
}
