/**
 * text.ts — resolving story text: guarded parts, tokens, paragraphs
 */

import type { RichText, GameState, Scene, PlayerClass } from './types'
import { meets } from './conditions'

const REL_LABEL: Record<string, string> = {
  'childhood friend': 'childhood friend', 'former lover': 'former lover', 'sibling': 'sibling',
  'mentor': 'mentor', 'parent': 'parent', 'the one who got away': 'the one who got away',
}

export function resolveRich(rt: RichText | undefined, s: GameState): string {
  if (!rt) return ''
  const raw = typeof rt === 'string' ? rt
    : rt.map(p => typeof p === 'string' ? p : (meets(p.when, s) ? p.text : (p.else ?? ''))).filter(Boolean).join('\n\n')
  return applyTokens(raw, s)
}

export function applyTokens(t: string, s: GameState): string {
  const mp = s.player.missing_person
  return t
    .replace(/\[missing person\]/g, mp.name || 'them')
    .replace(/\[player\]/g, s.player.name || 'you')
    .replace(/\[relationship\]/g, REL_LABEL[mp.relationship] ?? 'someone you loved')
    .replace(/\[sir\/ma'am\]/g, s.player.gender === 'Woman' ? "ma'am" : s.player.gender === 'Man' ? 'sir' : 'traveller')
}

export const paragraphs = (t: string) => t.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)

const CLASSES: PlayerClass[] = ['commander', 'arcane', 'ranger', 'cipher']

/** The scene's main text, plus the player's class passage as an aside. */
export function sceneText(scene: Scene, s: GameState): { main: string[]; aside: string[] } {
  const cls = CLASSES.includes(s.player.class as PlayerClass) ? s.player.class as PlayerClass : null
  const variant = cls ? scene.text[cls] : undefined
  const mode = (cls && scene.text_mode?.[cls]) ?? 'append'
  if (variant && mode === 'replace') return { main: paragraphs(resolveRich(variant, s)), aside: [] }
  return { main: paragraphs(resolveRich(scene.text.default, s)), aside: variant ? paragraphs(resolveRich(variant, s)) : [] }
}

export const CLASS_LABELS: Record<string, string> = {
  commander: 'The Commander',
  arcane:    'The Arcane',
  ranger:    'The Ranger',
  cipher:    'The Cipher',
}

// ─── Paragraph kinds (U14) ────────────────────────────────────────────────────

export type ParaKind = 'letter' | 'inscription' | 'p'

/** A letter has "> " on every line; an inscription is wholly wrapped in *…*. */
export function classify(p: string): { kind: ParaKind; text: string } {
  const lines = p.split('\n')
  if (lines.every(l => l.startsWith('> ') || l === '>')) return { kind: 'letter', text: lines.map(l => l.replace(/^> ?/, '')).join('\n') }
  if (/^\*[^*]+\*$/.test(p.trim())) return { kind: 'inscription', text: p.trim().slice(1, -1) }
  return { kind: 'p', text: p }
}
