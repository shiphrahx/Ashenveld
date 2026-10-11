/**
 * saves.ts — save versions, export and import (B23)
 *
 * The save has carried `version: 2` since step 2. Anything without a version
 * is a version 1 save from before the overhaul and is migrated on load.
 */

import type { DayPart, GameState } from './types'

export const SAVE_VERSION = 2
const PARTS: DayPart[] = ['dawn', 'morning', 'midday', 'afternoon', 'evening', 'night']

type Loose = Record<string, unknown>

/** Version 1 → 2. Throws if the save isn't recognisably a game. */
export function migrateV1toV2(raw: Loose): GameState {
  const s = structuredClone(raw) as Loose
  const world = s.world as Loose | undefined
  const player = s.player as Loose | undefined
  if (!world || !player || typeof s.current_scene !== 'string') throw new Error('not an Ashenveld save')

  s.visited ??= {}
  s.taken ??= {}
  s.counters ??= {}
  s.flags ??= {}
  s.inventory ??= []
  s.journal ??= []
  s.relationships ??= {}

  // "05:35 — dawn" → "dawn"
  if (!PARTS.includes(world.time_of_day as DayPart)) {
    const word = String(world.time_of_day ?? '').split('—').pop()?.trim() as DayPart
    world.time_of_day = PARTS.includes(word) ? word : 'evening'
  }
  delete world._time_minutes

  // The missing person was stored under two ids for a while. Keep the closer one.
  const rel = s.relationships as Record<string, { closeness: number }>
  if (rel.missing_person) {
    const a = rel.missing_person.closeness ?? 0, b = rel.the_missing_person?.closeness
    rel.the_missing_person = { closeness: b === undefined ? a : Math.max(a, b) }
    delete rel.missing_person
  }
  // Debris: an entry for the player themself, from the early data.
  delete rel.player

  s.version = SAVE_VERSION
  return s as unknown as GameState
}

/** Bring any save up to date. */
export function migrate(raw: unknown): GameState {
  if (!raw || typeof raw !== 'object') throw new Error('not an Ashenveld save')
  const s = raw as Loose
  if (s.version === undefined) return migrateV1toV2(s)
  if (s.version !== SAVE_VERSION) throw new Error(`save version ${String(s.version)} is newer than this game`)
  const g = s as unknown as GameState
  g.counters ??= {}
  g.visited ??= {}
  g.taken ??= {}
  return g
}

/** Download the save as ashenveld-save.json. */
export function exportSave(state: GameState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'ashenveld-save.json'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Read a save file someone chose. Returns the game, or a sentence saying what
 * is wrong with the file.
 */
export function parseImport(text: string, knownScene: (id: string) => boolean): GameState | string {
  let raw: unknown
  try { raw = JSON.parse(text) } catch { return 'That file is not a saved game. Choose the ashenveld-save.json you exported.' }
  let state: GameState
  try { state = migrate(raw) } catch (e) { return `That file can't be loaded: ${(e as Error).message}.` }
  if (!knownScene(state.current_scene)) return 'That save points to a scene this version of the game does not have.'
  return state
}
