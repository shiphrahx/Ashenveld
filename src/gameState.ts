/**
 * gameState.ts — Game state initialiser and persistence
 *
 * Creates a fresh GameState from the master index class stat blocks,
 * serialises/deserialises to localStorage, and applies StateChanges.
 */

import type { GameState, StateChanges } from './types'
import { getMasterIndex } from './loader'

const SAVE_KEY = 'ashenveld_save'

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
      time_of_day: 'dawn',
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
    // Clamp health
    next.player.resources.health = Math.max(
      0,
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
    Object.assign(next.world, changes.world)
  }

  return next
}

// ─── Time advance ─────────────────────────────────────────────────────────────

const TIME_LABELS: Array<[number, string]> = [
  [0,    'midnight'],
  [60,   'pre-dawn'],
  [300,  'dawn'],
  [480,  'morning'],
  [720,  'midday'],
  [900,  'afternoon'],
  [1080, 'evening'],
  [1200, 'night'],
  [1380, 'late night'],
]

function minutesToLabel(minutes: number): string {
  for (let i = TIME_LABELS.length - 1; i >= 0; i--) {
    if (minutes >= TIME_LABELS[i][0]) return TIME_LABELS[i][1]
  }
  return 'midnight'
}

/** Convert a 24-hour minute count to a readable time string like "14:30". */
function minutesToClock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function advanceTime(state: GameState, minutesDelta: number): GameState {
  if (minutesDelta === 0) return state
  const next: GameState = JSON.parse(JSON.stringify(state))

  // We store absolute minutes in `world.time_minutes` for calculation,
  // but keep time_of_day as a label for display.
  const rawMinutes = getAbsoluteMinutes(state) + minutesDelta
  const wrapped = rawMinutes % 1440
  const dayOffset = Math.floor(rawMinutes / 1440)

  next.world.day += dayOffset
  next.world.time_of_day = `${minutesToClock(wrapped)} — ${minutesToLabel(wrapped)}`

  // Stash raw minutes for next advance
  ;(next.world as Record<string, unknown>)['_time_minutes'] = wrapped

  return next
}

function getAbsoluteMinutes(state: GameState): number {
  const stored = (state.world as Record<string, unknown>)['_time_minutes']
  if (typeof stored === 'number') return stored
  // Parse from label as a rough start time if not yet stored
  const label = state.world.time_of_day
  if (label === 'dawn') return 300
  if (label === 'morning') return 480
  return 300
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
    return JSON.parse(raw) as GameState
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
