/**
 * settings.ts — reading and play settings, kept apart from the save
 */

import { createContext, useContext } from 'react'

export interface Settings {
  textSize: 'normal' | 'large' | 'larger'          // --story-scale 1, 1.15, 1.3
  lineSpacing: 'normal' | 'loose'                  // --story-leading 1.7, 1.95
  letterSpacing: 'normal' | 'wide'                 // --story-tracking 0.01em, 0.05em (and word-spacing 0.12em)
  font: 'sans' | 'serif' | 'system'                // Atkinson Hyperlegible, Lora, system-ui
  motion: 'system' | 'reduced' | 'full'
  textReveal: 'fade' | 'instant'
  odds: 'words' | 'percent'
  toasts: boolean
  volume: number                                   // 0..1
  ambience: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  textSize: 'normal',
  lineSpacing: 'normal',
  letterSpacing: 'normal',
  font: 'sans',
  motion: 'system',
  textReveal: 'fade',
  odds: 'words',
  toasts: true,
  volume: 0.6,
  ambience: true,
}

const KEY = 'ashenveld_settings'

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    return { ...DEFAULT_SETTINGS, ...(raw ? JSON.parse(raw) : {}) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(s: Settings): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* private mode: settings last this session */ }
}

export const motionAllowed = (s: Settings) =>
  s.motion === 'full' || (s.motion === 'system' && !matchMedia('(prefers-reduced-motion: reduce)').matches)

let loraLoaded = false

/** Push settings onto <html> as CSS variables and data attributes. */
export function applySettings(s: Settings): void {
  const root = document.documentElement
  root.style.setProperty('--story-scale', String({ normal: 1, large: 1.15, larger: 1.3 }[s.textSize]))
  root.style.setProperty('--story-leading', s.lineSpacing === 'loose' ? '1.95' : '1.7')
  root.style.setProperty('--story-tracking', s.letterSpacing === 'wide' ? '0.05em' : '0.01em')
  root.style.setProperty('--story-word-spacing', s.letterSpacing === 'wide' ? '0.12em' : 'normal')
  root.dataset.font = s.font
  root.dataset.motion = motionAllowed(s) ? 'on' : 'off'
  root.dataset.reveal = s.textReveal
  if (s.font === 'serif' && !loraLoaded) {
    loraLoaded = true
    // Lora is only fetched when somebody picks it.
    void import('@fontsource/lora/400.css')
    void import('@fontsource/lora/400-italic.css')
  }
}

export const SettingsContext = createContext<{ settings: Settings; update: (patch: Partial<Settings>) => void }>({
  settings: DEFAULT_SETTINGS,
  update: () => {},
})

export const useSettings = () => useContext(SettingsContext)
