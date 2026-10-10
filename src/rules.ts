/**
 * rules.ts — every tunable number and threshold in one place
 */

import { getMasterIndex } from './loader'

// ─── Closeness ────────────────────────────────────────────────────────────────

export function closenessTier(c: number): string {
  if (c < 0) return 'Wary'
  if (c >= 80) return 'Trusted'
  if (c >= 50) return 'Close'
  if (c >= 25) return 'Familiar'
  if (c >= 10) return 'Acquainted'
  return 'Stranger'
}

// ─── Faction reputation ───────────────────────────────────────────────────────

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * The reputation tier, from faction_reputation_thresholds in the master index.
 * The tier is the highest threshold reached. Below neutral, the lowest threshold
 * the reputation has fallen to.
 */
export function factionTier(faction: string, rep: number): string {
  const t = getMasterIndex().faction_reputation_thresholds[faction] ?? {}
  const tiers = Object.entries(t).sort((a, b) => a[1] - b[1])
  if (rep < 0) {
    const below = tiers.filter(([, v]) => v < 0 && rep <= v)
    return below.length ? cap(below[0][0]) : 'Neutral'
  }
  const reached = tiers.filter(([, v]) => v >= 0 && rep >= v)
  return reached.length ? cap(reached[reached.length - 1][0]) : 'Neutral'
}

export const FACTION_NAMES: Record<string, string> = {
  iron_compact: 'The Iron Compact',
  ashen_covenant: 'The Ashen Covenant',
  rootless: 'The Rootless',
}

// ─── Resolve ──────────────────────────────────────────────────────────────────

export const WORN_THIN = 40
