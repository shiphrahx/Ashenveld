import { useEffect } from 'react'
import type { PanelId } from '../components/TabBar'

interface Options {
  enabled: boolean
  panelOpen: boolean
  openPanel: (id: PanelId) => void
}

const PANEL_KEYS: Record<string, PanelId> = { j: 'journal', i: 'items', m: 'map', p: 'people' }

/** Clicks the first element that matches and is enabled. */
function press(selector: string): boolean {
  const el = document.querySelector<HTMLElement>(selector)
  if (!el || el.matches(':disabled, [aria-disabled="true"]')) return false
  el.click()
  return true
}

/**
 * The game's keyboard shortcuts. Ignored while typing or with a modifier held.
 * Panels handle their own Esc and Tab.
 */
export function useHotkeys({ enabled, panelOpen, openPanel }: Options) {
  useEffect(() => {
    if (!enabled) return
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      if (panelOpen) return

      const key = e.key.toLowerCase()
      if (/^[1-6]$/.test(key)) {
        const choices = [...document.querySelectorAll<HTMLElement>('[data-scene-id] [data-choice-id]:not([data-choice-id="continue"])')]
          .filter(el => !el.matches(':disabled, [aria-disabled="true"]') && !el.closest('[data-waiting]'))
        if (document.querySelector('[data-dice-continue]')) return
        const el = choices[Number(key) - 1]
        if (el) { e.preventDefault(); el.click() }
        return
      }
      if (key === 'enter' || key === ' ') {
        // A focused button already answers Enter and Space on its own.
        if (target?.closest('button, a, [role="button"], [role="radio"], [role="tab"]')) return
        if (press('[data-dice-continue]') || press('[data-interstitial] button') || press('[data-choice-id="continue"]')) e.preventDefault()
        return
      }
      if (PANEL_KEYS[key]) { e.preventDefault(); openPanel(PANEL_KEYS[key]); return }
      if (key === 'r') { press('[data-rest]'); return }
      if (key === 'escape') { e.preventDefault(); openPanel('menu'); return }
      if (e.key === '?') { e.preventDefault(); openPanel('keys') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled, panelOpen, openPanel])
}
