/**
 * loader.ts — File loader and scene index resolver
 *
 * On startup:
 *  1. Fetch master_scene_index.json
 *  2. Fetch all three act meta files (act1_00_meta.json, etc.)
 *  3. Lazy-load chapter files only when a scene inside them is needed
 */

import type { MasterIndex, ActMeta, ChapterFile, Scene } from './types'

// ─── Module-level caches ──────────────────────────────────────────────────────

let masterIndex: MasterIndex | null = null
const metaCache: Record<number, ActMeta> = {}
const chapterCache: Record<string, ChapterFile> = {}

// ─── Path helpers ─────────────────────────────────────────────────────────────

function actPath(act: number): string {
  return `/resources/act${act}/`
}

function metaFilename(act: number): string {
  return `act${act}_00_meta.json`
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Fetch master index and all act meta files. Call once at startup. */
export async function initLoader(): Promise<MasterIndex> {
  if (masterIndex) return masterIndex

  const res = await fetch('/resources/master_scene_index.json')
  if (!res.ok) throw new Error('Failed to load master_scene_index.json')
  masterIndex = (await res.json()) as MasterIndex

  // Load all three act metas in parallel
  await Promise.all([loadMeta(1), loadMeta(2), loadMeta(3)])

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

async function loadChapterFile(act: number, filename: string): Promise<void> {
  if (chapterCache[filename]) return
  const url = `${actPath(act)}${filename}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load chapter file: ${url}`)
  chapterCache[filename] = (await res.json()) as ChapterFile
}
