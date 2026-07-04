'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

export type TitleLanguage = 'en' | 'ja'

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'title-language'

function loadFromStorage(): TitleLanguage {
  if (typeof window === 'undefined') return 'en'
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'ja' || raw === 'en') return raw
  } catch { /* ignore */ }
  return 'en'
}

function saveToStorage(lang: TitleLanguage): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch { /* ignore */ }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useTitleLanguage() {
  const [lang, setLangState] = useState<TitleLanguage>('en')

  // Hydrate from localStorage after mount (SSR-safe)
  useEffect(() => {
    setLangState(loadFromStorage())
  }, [])

  const setLang = useCallback((next: TitleLanguage) => {
    setLangState(next)
    saveToStorage(next)
  }, [])

  const toggle = useCallback(() => {
    setLangState((prev) => {
      const next = prev === 'en' ? 'ja' : 'en'
      saveToStorage(next)
      return next
    })
  }, [])

  return { titleLanguage: lang, setTitleLanguage: setLang, toggleTitleLanguage: toggle }
}
