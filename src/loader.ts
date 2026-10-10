/**
 * loader.ts — File loader and scene index resolver
 *
 * On startup:
 *  1. Fetch master_scene_index.json
 *  2. Fetch all three act meta files (act1_00_meta.json, etc.)
 *  3. Lazy-load chapter files only when a scene inside them is needed
 */

import type { MasterIndex, ActMeta, ChapterFile, Scene, LocationDef, NpcDef, NotesFile } from './types'

// ─── Module-level caches ──────────────────────────────────────────────────────

let masterIndex: MasterIndex | null = null
const metaCache: Record<number, ActMeta> = {}
const chapterCache: Record<string, ChapterFile> = {}
// Each act meta names its tables differently (locations, new_locations, new_locations_act3).
const locations: Record<string, LocationDef> = {}
const npcs: Record<string, NpcDef> = {}
let notes: NotesFile = { leads: [], notes: [] }

// ─── Path helpers ─────────────────────────────────────────────────────────────

function actPath(act: number): string {
  return `${import.meta.env.BASE_URL}resources/act${act}/`
}

function metaFilename(act: number): string {
  return `act${act}_00_meta.json`
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Fetch master index and all act meta files. Call once at startup. */
export async function initLoader(): Promise<MasterIndex> {
  if (masterIndex) return masterIndex

  const res = await fetch(`${import.meta.env.BASE_URL}resources/master_scene_index.json`)
  if (!res.ok) throw new Error('Failed to load master_scene_index.json')
  masterIndex = (await res.json()) as MasterIndex

  // Load all three act metas in parallel
  await Promise.all([loadMeta(1), loadMeta(2), loadMeta(3), loadNotes()])
  for (const act of [1, 2, 3]) {
    const m = metaCache[act] as unknown as Record<string, Record<string, never> | undefined>
    Object.assign(locations, m.locations ?? {}, m.new_locations ?? {}, m.new_locations_act3 ?? {})
    Object.assign(npcs, m.npcs ?? {}, m.new_npcs ?? {})
  }

  return masterIndex
}

/** Get the cached master index (must call initLoader first). */
export function getMasterIndex(): MasterIndex {
  if (!masterIndex) throw new Error('Loader not initialised — call initLoader() first')
  return masterIndex
}

/** Get act-level meta (dice rules, NPCs, locations, state schema). */
export function getActMeta(act: number): ActMeta {
  const meta = metaCache[act]
  if (!meta) throw new Error(`Act ${act} meta not loaded`)
  return meta
}

export const getNotes = (): NotesFile => notes

/** The chapter file a scene belongs to, if it has been loaded. */
export function getChapterOf(sceneId: string): ChapterFile | undefined {
  const ref = masterIndex?.scene_index[sceneId]
  return ref ? chapterCache[ref.file] : undefined
}

/** A scene that is already loaded, without waiting. */
export function peekScene(sceneId: string): Scene | undefined {
  return getChapterOf(sceneId)?.scenes.find(s => s.id === sceneId)
}

export const getLocation = (id: string): LocationDef | undefined => locations[id]
export const getNpc = (id: string): NpcDef | undefined => npcs[id]
export const getAllNpcs = (): Record<string, NpcDef> => npcs

const warned = new Set<string>()
/** The player-facing name of a place. Never shows an underscore. */
export function locationName(id: string): string {
  const loc = locations[id]
  if (loc) return loc.name
  if (!warned.has(id)) { console.warn(`No location entry for "${id}"`); warned.add(id) }
  return id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

/** Resolve a scene ID to its Scene object, lazy-loading its chapter file. */
export async function resolveScene(sceneId: string): Promise<Scene> {
  const index = getMasterIndex()
  const ref = index.scene_index[sceneId]
  if (!ref) throw new Error(`Unknown scene ID: "${sceneId}"`)

  const file = ref.file
  if (!chapterCache[file]) {
    await loadChapterFile(ref.act, file)
  }

  const chapter = chapterCache[file]
  const scene = chapter.scenes.find(s => s.id === sceneId)
  if (!scene) throw new Error(`Scene "${sceneId}" not found in file "${file}"`)
  return scene
}

/** Check whether a chapter file is already cached (for prefetch decisions). */
export function isFileCached(filename: string): boolean {
  return filename in chapterCache
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function loadMeta(act: number): Promise<void> {
  if (metaCache[act]) return
  const url = `${actPath(act)}${metaFilename(act)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load meta for act ${act}: ${url}`)
  metaCache[act] = (await res.json()) as ActMeta
}

async function loadNotes(): Promise<void> {
  const res = await fetch(`${import.meta.env.BASE_URL}resources/notes.json`)
  if (!res.ok) throw new Error('Failed to load notes.json')
  notes = (await res.json()) as NotesFile
}

async function loadChapterFile(act: number, filename: string): Promise<void> {
  if (chapterCache[filename]) return
  const url = `${actPath(act)}${filename}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load chapter file: ${url}`)
  chapterCache[filename] = (await res.json()) as ChapterFile
}
