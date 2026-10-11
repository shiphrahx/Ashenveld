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

// ─── What a reputation tier means right now (U8, from the G5 table) ───────────

export const TIER_ORDER = ['Hostile', 'Wary', 'Neutral', 'Cooperative', 'Allied']

export const TIER_EFFECT: Record<string, Record<string, string>> = {
  iron_compact: {
    Hostile: 'The Compact sees you as a problem.',
    Wary: 'Vorne and his soldiers are harder to talk to, and he will not hear an alliance.',
    Neutral: 'Nothing either way yet.',
    Cooperative: 'The checkpoint waves you through, and Vorne listens more readily.',
    Allied: 'The Compact treats you as one of its own.',
  },
  ashen_covenant: {
    Hostile: 'The Covenant sees you as a problem.',
    Wary: 'Seriva will not discuss what the purification costs.',
    Neutral: 'Nothing either way yet.',
    Cooperative: 'The shrine will give you a bed, and Edric answers one more question.',
    Allied: 'The Covenant would follow your lead on the seal.',
  },
  rootless: {
    Hostile: 'The camp will not have you.',
    Wary: 'The camp keeps you at the edge.',
    Neutral: 'Nothing either way yet.',
    Cooperative: 'The camp will give you a bed.',
    Allied: 'Branch walks the first mile with you, and the camp stands with you.',
    Trusted: 'Maret will show you what she pays the forest.',
  },
}

export const STAT_TIPS: Record<string, string> = {
  strength: 'Lifting, holding, standing your ground.',
  dexterity: 'Moving quietly and quickly. Steady hands.',
  stamina: 'Enduring long days and the pull of the ruins.',
  intelligence: 'Reading texts, patterns and plans.',
  mana: 'Sensing the curse and what lies under it. Useful near the ruins, and dangerous.',
  charisma: 'Getting people to talk, to trust you, or to back down.',
  perception: 'Noticing what is out of place.',
}

// ─── Traits (G14) ─────────────────────────────────────────────────────────────
// Stats never change. One trait is awarded at the end of Acts 1 and 2, from how
// you behaved. Outcomes count the behaviour in counters; the award sets
// flags.trait_<id>.

export interface Trait { id: string; name: string; effect: string }

export const TRAITS: Record<string, Trait> = {
  listener:     { id: 'listener',     name: 'Listener',     effect: '+1 on Charisma with the afflicted.' },
  blunt:        { id: 'blunt',        name: 'Blunt',        effect: '+1 on rolls with soldiers, −1 with Maret.' },
  careful:      { id: 'careful',      name: 'Careful',      effect: '+1 on Perception.' },
  company_coin: { id: 'company_coin', name: 'Company coin', effect: '+1 with the Compact, −1 with the Rootless.' },
  worn:         { id: 'worn',         name: 'Worn',         effect: '+1 on Mana. Your Resolve tops out at 90.' },
  kept_faith:   { id: 'kept_faith',   name: 'Kept faith',   effect: '+1 in the ritual.' },
}

/** Scenes a trait's effect applies in. */
export const TRAIT_SCENES = {
  afflicted: ['act1_ch1_still_man', 'act1_ch4_lira', 'act1_ch5_curse_event', 'act2_ch1_the_watcher_seen',
    'act2_ch7_maret_and_missing', 'act3_ch2_rebuilding_work', 'act3_ch2_alone_work'],
  compact: ['act1_ch3_compact_introduction', 'act1_ch3_compact_offer', 'act1_ch5_faction_responses',
    'act2_ch3_compact_checkpoint', 'act2_ch4_vorne_meeting', 'act2_ch4_issa_confrontation', 'act2_ch7_vorne_reacts'],
  maret: ['act1_ch3_maret_first_meeting', 'act1_ch4_maret_opens', 'act1_ch4_maret_evening',
    'act1_ch4_maret_letter_withheld', 'act2_ch4_issa_crisis', 'act2_ch5_maret_conversation'],
  rootless: ['act1_ch3_rootless_camp_approach', 'act1_ch4_branch', 'act2_ch3_rootless_situation', 'act2_ch3_pol_revelation'],
  ritual: ['act2_ch6_ritual_engagement'],
}

export const hasTrait = (flags: Record<string, unknown>, id: string) => Boolean(flags[`trait_${id}`])
export const traitsOf = (flags: Record<string, unknown>) => Object.values(TRAITS).filter(t => hasTrait(flags, t.id))

/** What each trait adds to a roll in this scene with this stat. */
export function traitBonuses(flags: Record<string, unknown>, scene: string, stat: string): Array<{ value: number; label: string }> {
  const out: Array<{ value: number; label: string }> = []
  const S = TRAIT_SCENES
  const base = (scene ?? '').replace(/_on$/, '')                 // the second half of a split scene (G15)
  const inScene = (list: string[]) => list.includes(base)
  if (hasTrait(flags, 'listener') && stat === 'charisma' && inScene(S.afflicted)) out.push({ value: 1, label: 'Listener' })
  if (hasTrait(flags, 'blunt') && inScene(S.compact)) out.push({ value: 1, label: 'Blunt' })
  if (hasTrait(flags, 'blunt') && inScene(S.maret)) out.push({ value: -1, label: 'Blunt' })
  if (hasTrait(flags, 'careful') && stat === 'perception') out.push({ value: 1, label: 'Careful' })
  if (hasTrait(flags, 'company_coin') && inScene(S.compact)) out.push({ value: 1, label: 'Company coin' })
  if (hasTrait(flags, 'company_coin') && (inScene(S.rootless) || inScene(S.maret))) out.push({ value: -1, label: 'Company coin' })
  if (hasTrait(flags, 'worn') && stat === 'mana') out.push({ value: 1, label: 'Worn' })
  if (hasTrait(flags, 'kept_faith') && inScene(S.ritual)) out.push({ value: 1, label: 'Kept faith' })
  return out
}

export const TRAIT_RULES = { behaviour: 3, compactCoin: 35, wornBelow: 40, wornMaxResolve: 90 }

/**
 * The trait earned at an act break, or null. The behaviour you showed most
 * wins; then Compact money; then being worn down; then never having lied.
 * A trait you already have can't be earned twice.
 */
export function traitEarned(s: { counters?: Record<string, number>; flags: Record<string, unknown>; player: { resources: { health: number } } }): Trait | null {
  const c = s.counters ?? {}
  const fresh = (id: string) => !hasTrait(s.flags, id)
  const behaviour = (['listener', 'blunt', 'careful'] as const)
    .map(id => ({ id, n: c[{ listener: 'listened', blunt: 'blunt', careful: 'careful' }[id]] ?? 0 }))
    .filter(b => b.n >= TRAIT_RULES.behaviour && fresh(b.id))
    .sort((a, b) => b.n - a.n)
  if (behaviour.length) return TRAITS[behaviour[0].id]
  if ((c.compact_coin ?? 0) >= TRAIT_RULES.compactCoin && fresh('company_coin')) return TRAITS.company_coin
  if (s.player.resources.health < TRAIT_RULES.wornBelow && fresh('worn')) return TRAITS.worn
  if (!(c.lied ?? 0) && fresh('kept_faith')) return TRAITS.kept_faith
  return null
}
