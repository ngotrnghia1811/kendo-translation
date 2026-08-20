'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

export type ReaderMode = 'single' | 'bilingual' | 'aligned' | 'pdf'
export type DisplayLang = 'source' | 'target'
export type TargetLangChoice = 'en' | 'zh' | 'ko' | 'vi' | string

interface ReaderViewPrefs {
  mode: ReaderMode
  displayLang: DisplayLang
  targetLangChoice: TargetLangChoice
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'reader-view-prefs'

const DEFAULTS: ReaderViewPrefs = {
  mode: 'single',
  displayLang: 'target',
  targetLangChoice: 'en',
}

const MODES: readonly ReaderMode[] = ['single', 'bilingual', 'aligned', 'pdf']

function loadFromStorage(): ReaderViewPrefs {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw) as Partial<ReaderViewPrefs>
    return {
      mode: MODES.includes(parsed.mode as ReaderMode) ? (parsed.mode as ReaderMode) : DEFAULTS.mode,
      displayLang:
        parsed.displayLang === 'source' || parsed.displayLang === 'target'
          ? parsed.displayLang
          : DEFAULTS.displayLang,
      targetLangChoice:
        parsed.targetLangChoice && typeof parsed.targetLangChoice === 'string'
          ? parsed.targetLangChoice
          : DEFAULTS.targetLangChoice,
    }
  } catch {
    return DEFAULTS
  }
}

function saveToStorage(prefs: ReaderViewPrefs): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch { /* ignore */ }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Reader view/language preferences persisted to localStorage so that the
 * View dropdown (single/bilingual/aligned/pdf), the Language dropdown
 * (source/target), and the target-language choice (en/zh) survive page
 * navigation. PageReader remounts on every /books/[book]/[article]/[page]
 * navigation, so without persistence these reset to their defaults.
 */
export function useReaderViewPrefs() {
  const [prefs, setPrefsState] = useState<ReaderViewPrefs>(DEFAULTS)

  // Hydrate from localStorage after mount (SSR-safe)
  useEffect(() => {
    setPrefsState(loadFromStorage())
  }, [])

  const setMode = useCallback((mode: ReaderMode) => {
    setPrefsState((prev) => {
      const next = { ...prev, mode }
      saveToStorage(next)
      return next
    })
  }, [])

  const setDisplayLang = useCallback((displayLang: DisplayLang) => {
    setPrefsState((prev) => {
      const next = { ...prev, displayLang }
      saveToStorage(next)
      return next
    })
  }, [])

  const setTargetLangChoice = useCallback((targetLangChoice: TargetLangChoice) => {
    setPrefsState((prev) => {
      const next = { ...prev, targetLangChoice }
      saveToStorage(next)
      return next
    })
  }, [])

  return {
    mode: prefs.mode,
    setMode,
    displayLang: prefs.displayLang,
    setDisplayLang,
    targetLangChoice: prefs.targetLangChoice,
    setTargetLangChoice,
  }
}
