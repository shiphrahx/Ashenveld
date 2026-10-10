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

// ─── Dice ─────────────────────────────────────────────────────────────────────

export const RULES = {
  /** Bonuses from earlier choices are capped at this, either way. */
  maxBonus: 6,
  /** Full success at DC + 4 or more. */
  successMargin: 4,
  /** Success at a cost from DC − 2. */
  costMargin: -2,
}

/** Stat value to roll modifier. More spread than (stat − 5) / 2, so class matters. */
export function modifierForStat(v: number): number {
  if (v <= 6) return -2
  if (v <= 8) return -1
  if (v <= 10) return 0
  if (v <= 12) return 1
  if (v <= 14) return 3
  if (v <= 16) return 5
  return 6
}

/** The word on a choice tag, from the chance of not failing. */
export function oddsWord(notFailing: number): string {
  if (notFailing >= 0.85) return 'Sure'
  if (notFailing >= 0.65) return 'Favoured'
  if (notFailing >= 0.45) return 'Even'
  if (notFailing >= 0.25) return 'Risky'
  return 'Long shot'
}

export const STAT_NAMES: Record<string, string> = {
  strength: 'Strength', dexterity: 'Dexterity', stamina: 'Stamina', intelligence: 'Intelligence',
  mana: 'Mana', charisma: 'Charisma', perception: 'Perception',
}

// ─── The Dimming (world.curse_spread, 0..100) ─────────────────────────────────

export const DIMMING = {
  start: 15,
  perDayAct1: 1,       // added each time the day number rises in Act 1
  perSkippedDay: 3,    // added for each day skipped
  sealComplete: 45,    // a full seal brings it down to at most this
  sealPartial: 60,     // a partial seal brings it down to at most this...
  partialFloor: 30,    // ...and it never falls below this afterwards
  partialCreep: 1,     // added on every Act 3 scene after a partial seal
  greyMaxResolve: 80,  // maximum Resolve while the Dimming is Grey
}

export function dimmingBand(v: number): string {
  if (v >= 100) return 'Still'
  if (v >= 75) return 'Grey'
  if (v >= 50) return 'Dim'
  if (v >= 25) return 'Thin'
  return 'Clear'
}

/** Resolve's ceiling right now: lower while the Dimming is Grey. */
export function maxResolve(maxHealth: number, curse: number): number {
  return curse >= 75 && curse < 100 ? Math.min(maxHealth, DIMMING.greyMaxResolve) : curse >= 100 ? Math.min(maxHealth, DIMMING.greyMaxResolve) : maxHealth
}

// ─── Resting (G9) ─────────────────────────────────────────────────────────────

export const REST = {
  resolve: 30,          // Resolve back from a night's rest
  dimming: 2,           // the Dimming does not sleep (Acts 1 and 2)
  innCost: 3,           // a room at the Tallow
  innFreeAt: 30,        // free once Aldous is this close
  campAt: 15,           // Rootless reputation to rest at the camp
  shrineAt: 15,         // Covenant reputation to rest at the shrine
  provisions: 20,       // Resolve from eating and sitting a while
  collapseResolve: 40,  // where Resolve is set after a collapse
}

export type RestPlace = 'inn' | 'camp' | 'shrine' | 'ruins'

export interface RestOption {
  mode: 'rest' | 'eat' | null
  place?: RestPlace
  cost?: number
  /** Why you can't, in the player's terms. */
  reason?: string
}

const RUINS_CAMP = ['act2_ch3_crestfall_news', 'act2_ch5_return_to_ruins']

/** What the Rest button can do in this scene. */
export function restOption(scene: { id: string; location: string; rest?: boolean }, s: {
  inventory: string[]; player: { resources: { gold: number } }
  relationships: Record<string, { closeness: number }>; factions: Record<string, { reputation: number }>
}): RestOption {
  const eat: RestOption = s.inventory.includes('rootless_provisions') ? { mode: 'eat' } : { mode: null, reason: 'You cannot rest here.' }
  if (!scene.rest) return eat
  if (RUINS_CAMP.includes(scene.id)) return { mode: 'rest', place: 'ruins' }
  if (scene.location === 'crestfall_tallow_inn') {
    const cost = (s.relationships.innkeeper_aldous?.closeness ?? 0) >= REST.innFreeAt ? 0 : REST.innCost
    if (s.player.resources.gold < cost) return { ...eat, reason: eat.mode ? undefined : `A room costs ${REST.innCost} coin.` }
    return { mode: 'rest', place: 'inn', cost }
  }
  if (scene.location === 'rootless_camp') {
    if ((s.factions.rootless?.reputation ?? 0) < REST.campAt) return { ...eat, reason: eat.mode ? undefined : 'The camp does not know you well enough to give you a bed.' }
    return { mode: 'rest', place: 'camp' }
  }
  if (scene.location === 'crestfall_shrine') {
    if ((s.factions.ashen_covenant?.reputation ?? 0) < REST.shrineAt) return { ...eat, reason: eat.mode ? undefined : 'The Covenant does not take in strangers.' }
    return { mode: 'rest', place: 'shrine' }
  }
  return eat
}
