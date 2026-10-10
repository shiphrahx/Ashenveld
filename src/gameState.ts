/**
 * gameState.ts — Game state initialiser and persistence
 *
 * Creates a fresh GameState from the master index class stat blocks,
 * serialises/deserialises to localStorage, and applies StateChanges.
 */

import type { GameState, StateChanges, MetaStore, DayPart, SceneWhen } from './types'
import { getMasterIndex } from './loader'

const SAVE_KEY = 'ashenveld_save'
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
      curse_spread: 0,
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
    visited: {},
    taken: {},
  }
}

// ─── State change applicator ──────────────────────────────────────────────────

export function applyStateChanges(state: GameState, changes: StateChanges): GameState {
  // Deep-clone so React sees a new object
  const next: GameState = JSON.parse(JSON.stringify(state))

  if (changes.flags) {
    Object.assign(next.flags, changes.flags)
  }

  if (changes.resources) {
    for (const [k, delta] of Object.entries(changes.resources)) {
      const key = k as keyof GameState['player']['resources']
      ;(next.player.resources[key] as number) += delta
    }
    // Gold never goes below 0. Health has a floor of 1 until resting and collapse exist (G9).
    next.player.resources.gold = Math.max(0, next.player.resources.gold)
    next.player.resources.health = Math.max(
      1,
      Math.min(next.player.resources.health, next.player.resources.max_health)
    )
  }

  if (changes.relationships) {
    for (const [npcId, delta] of Object.entries(changes.relationships)) {
      if (!next.relationships[npcId]) {
        next.relationships[npcId] = { closeness: 0 }
      }
      next.relationships[npcId].closeness += delta.closeness
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

  if (changes.inventory_remove) {
    next.inventory = next.inventory.filter(
      item => !changes.inventory_remove!.includes(item)
    )
  }

  if (changes.world) {
    // curse_spread is a delta. Day parts go through applyWhen so time only moves forward.
    const { curse_spread, day, time_of_day, skip_days, ...rest } = changes.world
    Object.assign(next.world, rest)
    if (typeof curse_spread === 'number')
      next.world.curse_spread = Math.max(0, Math.min(100, next.world.curse_spread + curse_spread))
    if (time_of_day || day || skip_days)
      return applyWhen(next, { part: time_of_day ?? next.world.time_of_day, day, skip_days })
  }

  return next
}

// ─── Day parts ────────────────────────────────────────────────────────────────

export const PARTS: DayPart[] = ['dawn', 'morning', 'midday', 'afternoon', 'evening', 'night']

/** Move the clock to a day part. Time only moves forward. */
export function applyWhen(state: GameState, w: Partial<SceneWhen> & { part: DayPart }): GameState {
  const next: GameState = structuredClone(state)
  let day = next.world.day
  const now = PARTS.indexOf(next.world.time_of_day as DayPart)
  if (w.skip_days) day += w.skip_days
  else if (now !== -1 && PARTS.indexOf(w.part) < now) day += 1
  if (w.day) day = Math.max(day, w.day)
  next.world.day = day
  next.world.time_of_day = w.part
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
    const saved = JSON.parse(raw) as GameState
    // Saves from before version 2 lack these; B23 replaces this with a full migration.
    saved.visited ??= {}
    saved.taken ??= {}
    if (!PARTS.includes(saved.world.time_of_day)) {
      const word = String(saved.world.time_of_day).split(' — ').pop() as DayPart
      saved.world.time_of_day = PARTS.includes(word) ? word : 'evening'
    }
    return saved
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
