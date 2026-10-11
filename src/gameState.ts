/**
 * gameState.ts — Game state initialiser and persistence
 *
 * Creates a fresh GameState from the master index class stat blocks,
 * serialises/deserialises to localStorage, and applies StateChanges.
 */

import { migrate } from './saves'
import type { GameState, StateChanges, MetaStore, DayPart, SceneWhen } from './types'
import { getMasterIndex, getNpc, getLocation } from './loader'
import { closenessTier, factionTier, FACTION_NAMES, WORN_THIN, DIMMING, dimmingBand, maxResolve } from './rules'

const SAVE_KEY = 'ashenveld_save'
const BACKUP_KEY = 'ashenveld_save_backup'
const META_KEY = 'ashenveld_meta'

// ─── Fresh state factory ──────────────────────────────────────────────────────

export function createFreshState(
  playerName: string,
  gender: string,
  playerClass: string,
  missingPersonName: string,
  missingPersonRelationship: string,
  startingGold = 12
): GameState {
  const index = getMasterIndex()
  const statBlock = index.class_stat_blocks[playerClass.toLowerCase()]
  if (!statBlock) throw new Error(`Unknown class: ${playerClass}`)

  return {
    version: 2,
    player: {
      name: playerName,
      gender,
      class: playerClass.toLowerCase(),
      missing_person: { name: missingPersonName, relationship: missingPersonRelationship },
      stats: {
        strength:     statBlock.strength,
        dexterity:    statBlock.dexterity,
        stamina:      statBlock.stamina,
        intelligence: statBlock.intelligence,
        mana:         statBlock.mana,
        charisma:     statBlock.charisma,
        perception:   statBlock.perception,
      },
      resources: { gold: startingGold, health: 100, max_health: 100 },
    },
    world: {
      act: 1,
      chapter: 1,
      day: 1,
      time_of_day: 'evening',
      current_location: 'crestfall_docks',
      curse_spread: DIMMING.start,
    },
    factions: {
      iron_compact:    { reputation: 0 },
      ashen_covenant:  { reputation: 0 },
      rootless:        { reputation: 0 },
    },
    relationships: {},
    flags: {},
    inventory: [],
    current_scene: 'act1_ch1_barge_arrival',
    journal: [],
    counters: {},
    visited: {},
    taken: {},
  }
}

// ─── State change applicator ──────────────────────────────────────────────────

export function applyStateChanges(state: GameState, changes: StateChanges): GameState {
  // Deep-clone so React sees a new object
  let next: GameState = JSON.parse(JSON.stringify(state))

  if (changes.flags) {
    Object.assign(next.flags, changes.flags)
  }

  if (changes.resources) {
    for (const [k, raw] of Object.entries(changes.resources)) {
      const key = k as keyof GameState['player']['resources']
      let delta = raw
      // Edric's ward halves what the deep forest takes out of you (G5).
      if (key === 'health' && delta < 0 && next.inventory.includes('covenant_ward')
        && getLocation(next.world.current_location)?.region === 'deep_forest') delta = Math.ceil(delta / 2)
      ;(next.player.resources[key] as number) += delta
    }
    // Gold never goes below 0. Health has a floor of 1 until resting and collapse exist (G9).
    next.player.resources.gold = Math.max(0, next.player.resources.gold)
  }

  if (changes.relationships) {
    for (const [npcId, delta] of Object.entries(changes.relationships)) {
      if (!next.relationships[npcId]) {
        next.relationships[npcId] = { closeness: getNpc(npcId)?.initial_closeness ?? 0 }
      }
      next.relationships[npcId].closeness += delta.closeness
      next.relationships[npcId].seen = { day: next.world.day, location: next.world.current_location, at: next.journal.length }
    }
  }

  if (changes.factions) {
    for (const [faction, delta] of Object.entries(changes.factions)) {
      const key = faction as keyof GameState['factions']
      next.factions[key].reputation += delta.reputation
    }
  }

  if (changes.inventory) {
    for (const item of changes.inventory) {
      if (!next.inventory.includes(item)) {
        next.inventory.push(item)
      }
    }
  }

  if (changes.counters) {
    next.counters ??= {}
    for (const [k, d] of Object.entries(changes.counters)) next.counters[k] = (next.counters[k] ?? 0) + d
  }

  if (changes.inventory_remove) {
    next.inventory = next.inventory.filter(
      item => !changes.inventory_remove!.includes(item)
    )
  }

  // Items are used up once the flag they are consumed on is set.
  const defs = getMasterIndex().inventory_items
  next.inventory = next.inventory.filter(id => { const f = defs[id]?.consumed_on; return !(f && next.flags[f]) })

  if (changes.world) {
    // curse_spread is a delta. Day parts go through applyWhen so time only moves forward.
    const { curse_spread, day, time_of_day, skip_days, ...rest } = changes.world
    Object.assign(next.world, rest)
    if (typeof curse_spread === 'number') next.world.curse_spread += curse_spread
    if (time_of_day || day || skip_days)
      next = applyWhen(next, { part: time_of_day ?? next.world.time_of_day, day, skip_days })
  }

  // The seal (G8): a full seal pulls the Dimming down; a partial one less, and it never clears.
  if (changes.flags?.ritual_complete) next.world.curse_spread = Math.min(next.world.curse_spread, DIMMING.sealComplete)
  if (changes.flags?.ritual_partial) next.world.curse_spread = Math.min(next.world.curse_spread, DIMMING.sealPartial)
  next.world.curse_spread = clampCurse(next.world.curse_spread, next)

  // Resolve: no floor here any more. Reaching 0 is a collapse, handled on the way to the next scene (G9).
  const cap = maxResolve(next.player.resources.max_health, next.world.curse_spread)
  next.player.resources.health = Math.max(0, Math.min(next.player.resources.health, cap))

  return next
}

function clampCurse(v: number, s: GameState): number {
  const floor = s.flags.ritual_partial ? DIMMING.partialFloor : 0
  return Math.max(floor, Math.min(100, Math.round(v)))
}

// ─── Day parts ────────────────────────────────────────────────────────────────

export const PARTS: DayPart[] = ['dawn', 'morning', 'midday', 'afternoon', 'evening', 'night']

/** Move the clock to a day part. Time only moves forward. */
export function applyWhen(state: GameState, w: Partial<SceneWhen> & { part: DayPart | DayPart[] }): GameState {
  const next: GameState = structuredClone(state)
  let day = next.world.day
  const now = PARTS.indexOf(next.world.time_of_day as DayPart)
  const allowed = Array.isArray(w.part) ? w.part : [w.part]
  const part = allowed.includes(next.world.time_of_day) && !w.skip_days ? next.world.time_of_day : allowed[0]
  if (w.skip_days) day += w.skip_days
  else if (now !== -1 && PARTS.indexOf(part) < now) day += 1
  if (w.day) day = Math.max(day, w.day)
  // The Dimming does not sleep (G8).
  const risen = day - next.world.day
  if (w.skip_days) next.world.curse_spread += DIMMING.perSkippedDay * w.skip_days
  else if (risen > 0 && next.world.act === 1) next.world.curse_spread += DIMMING.perDayAct1 * risen
  next.world.curse_spread = clampCurse(next.world.curse_spread, next)
  next.world.day = day
  next.world.time_of_day = part
  return next
}

// ─── Curse affliction check ───────────────────────────────────────────────────

export function checkCurse(state: GameState): GameState {
  if (state.world.curse_spread >= 100 && !state.flags['crestfall_afflicted']) {
    const next: GameState = JSON.parse(JSON.stringify(state))
    next.flags['crestfall_afflicted'] = true
    return next
  }
  return state
}

// ─── Save / load ──────────────────────────────────────────────────────────────

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state))
  } catch {
    console.warn('Failed to save game state')
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    try {
      return migrate(JSON.parse(raw))
    } catch {
      // B23: a save we can't read is kept aside, never thrown away, and the game starts clean.
      localStorage.setItem(BACKUP_KEY, raw)
      localStorage.removeItem(SAVE_KEY)
      return null
    }
  } catch {
    return null
  }
}

export function deleteSave(): void {
  localStorage.removeItem(SAVE_KEY)
}

export function hasSave(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null
}

// ─── Meta store: survives new games ───────────────────────────────────────────

export function loadMeta(): MetaStore {
  try {
    const raw = localStorage.getItem(META_KEY)
    const m = raw ? JSON.parse(raw) as Partial<MetaStore> : {}
    return { endings: m.endings ?? [], seenScenes: m.seenScenes ?? [] }
  } catch {
    return { endings: [], seenScenes: [] }
  }
}

export function saveMeta(meta: MetaStore): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta))
  } catch {
    console.warn('Failed to save meta store')
  }
}

export function recordEnding(state: GameState): void {
  if (!state.ended) return
  const meta = loadMeta()
  if (!meta.endings.includes(state.ended.id)) meta.endings.push(state.ended.id)
  saveMeta(meta)
}

// ─── What changed ─────────────────────────────────────────────────────────────

export interface Change { text: string; key: string }

/**
 * The player-facing list of what moved between two states: items, coin,
 * health, closeness, reputation tiers and new journal entries.
 */
export function diffState(prev: GameState, next: GameState, journalKeys?: (s: GameState) => string[]): Change[] {
  const out: Change[] = []
  const items = getMasterIndex().inventory_items
  const itemName = (id: string) => items[id]?.name ?? id.replace(/_/g, ' ')

  for (const id of next.inventory) if (!prev.inventory.includes(id)) out.push({ text: `${itemName(id)} added`, key: 'items' })
  for (const id of prev.inventory) if (!next.inventory.includes(id)) out.push({ text: `${itemName(id)} used`, key: 'items' })

  const dg = next.player.resources.gold - prev.player.resources.gold
  if (dg) out.push({ text: `${dg > 0 ? '+' : '−'}${Math.abs(dg)} coin`, key: 'gold' })

  const ph = prev.player.resources.health, nh = next.player.resources.health
  if (nh !== ph) {
    out.push({ text: `Resolve ${nh > ph ? '+' : '−'}${Math.abs(nh - ph)}`, key: 'health' })
    if (ph >= WORN_THIN && nh < WORN_THIN) out.push({ text: 'You are worn thin', key: 'health' })
  }

  for (const [id, rel] of Object.entries(next.relationships)) {
    const before = prev.relationships[id]?.closeness ?? getNpc(id)?.initial_closeness ?? 0
    const d = rel.closeness - before
    if (!d) continue
    const name = id === 'the_missing_person' ? (next.player.missing_person.name || 'They') : (getNpc(id)?.name ?? id)
    const line = d < 0 ? `${name} trusts you less.` : d >= 20 ? `${name} trusts you a great deal more.` : d >= 10 ? `${name} trusts you more.` : `${name} notes it.`
    out.push({ text: line, key: `rel:${id}` })
    const t0 = closenessTier(before), t1 = closenessTier(rel.closeness)
    if (t0 !== t1) out.push({ text: `${name}: ${t1}`, key: `rel:${id}` })
  }

  for (const f of Object.keys(next.factions) as Array<keyof GameState['factions']>) {
    const a = prev.factions[f].reputation, b = next.factions[f].reputation
    if (a === b) continue
    const t0 = factionTier(f, a), t1 = factionTier(f, b)
    if (t0 !== t1) out.push({ text: `${FACTION_NAMES[f]}: ${t1}`, key: f })
  }

  const b0 = dimmingBand(prev.world.curse_spread), b1 = dimmingBand(next.world.curse_spread)
  if (b0 !== b1) out.push({ text: `The Dimming: ${b1}`, key: 'dimming' })

  if (journalKeys) {
    const before = new Set(journalKeys(prev))
    if (journalKeys(next).some(k => !before.has(k))) out.push({ text: 'Noted in your journal', key: 'journal' })
  }
  return out
}

// ─── Chapter checkpoints (G13) ────────────────────────────────────────────────

const CHECKPOINT_KEY = 'ashenveld_checkpoints'
const chapterKey = (s: GameState) => s.world.act * 100 + s.world.chapter

export function loadCheckpoints(): GameState[] {
  try { return JSON.parse(localStorage.getItem(CHECKPOINT_KEY) ?? '[]') as GameState[] } catch { return [] }
}

/** Keep a copy of the state at the start of each new chapter. The last three are kept. */
export function recordCheckpoint(prev: GameState, next: GameState): void {
  if (chapterKey(next) <= chapterKey(prev)) return
  try {
    const list = [...loadCheckpoints().filter(c => c.player.name === next.player.name), next].slice(-3)
    localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(list))
  } catch { console.warn('Failed to save checkpoint') }
}

/** The checkpoint for the chapter the player is in now, if there is one. */
export function chapterCheckpoint(s: GameState): GameState | undefined {
  return [...loadCheckpoints()].reverse().find(c => chapterKey(c) === chapterKey(s) && c.player.name === s.player.name)
}

export function clearCheckpoints(): void {
  localStorage.removeItem(CHECKPOINT_KEY)
}

export function markSeen(sceneId: string): void {
  const meta = loadMeta()
  if (meta.seenScenes.includes(sceneId)) return
  meta.seenScenes.push(sceneId)
  saveMeta(meta)
}
