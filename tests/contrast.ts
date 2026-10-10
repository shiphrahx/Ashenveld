import type { Page } from '@playwright/test'

/**
 * Walks every element with its own visible text inside `root` and returns the
 * ones whose text is below `min` contrast against the page background.
 * Opacity on the element and its ancestors is folded into the text colour.
 */
export async function lowContrast(page: Page, root = 'body', min = 4.5): Promise<string[]> {
  return page.evaluate(([sel, minRatio]) => {
    const BG = [5, 6, 8]
    const lum = (c: number[]) => {
      const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
      return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2])
    }
    const ratio = (a: number[], b: number[]) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05) }
    const parse = (s: string) => (s.match(/[\d.]+/g) ?? []).map(Number)
    const out: string[] = []
    const rootEl = document.querySelector(sel as string)
    if (!rootEl) return [`no element ${sel}`]
    const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT)
    const seen = new Set<Element>()
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement
      if (!el || seen.has(el) || !n.textContent?.trim()) continue
      seen.add(el)
      if (el.closest('[aria-hidden="true"]')) continue
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none') continue
      const [cr, cg, cb, ca = 1] = parse(cs.color)
      let alpha = ca
      for (let a: Element | null = el; a; a = a.parentElement) alpha *= Number(getComputedStyle(a).opacity)
      if (alpha === 0) continue
      const mixed = [cr, cg, cb].map((v, i) => v * alpha + BG[i] * (1 - alpha))
      const c = ratio(mixed, BG)
      if (c < (minRatio as number)) out.push(`${c.toFixed(2)}  ${el.tagName.toLowerCase()}.${el.className}  "${n.textContent!.trim().slice(0, 40)}"`)
    }
    return out
  }, [root, min] as const)
}
