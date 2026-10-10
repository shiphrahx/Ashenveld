/**
 * conditions.ts — the one test behind every "is this allowed / shown" check
 */

import type { Condition, GameState } from './types'

export function meets(c: Condition | undefined | null, s: GameState): boolean {
  if (!c) return true
  if (c.flags) for (const [k, want] of Object.entries(c.flags)) {
    const have = s.flags[k]
    if (typeof want === 'boolean') { if (Boolean(have) !== want) return false }
    else if (have !== want) return false
  }
  if (c.inventory && !c.inventory.every(i => s.inventory.includes(i))) return false
  if (c.class) {
    const list = Array.isArray(c.class) ? c.class : [c.class]
    if (!list.includes(s.player.class)) return false
  }
  const rel = (id: string) => s.relationships[id]?.closeness ?? 0
  const rep = (id: string) => (s.factions as Record<string, { reputation: number }>)[id]?.reputation ?? 0
  const stat = (id: string) => (s.player.stats as Record<string, number>)[id] ?? 0
  for (const [k, v] of Object.entries(c.min_relationship ?? {})) if (rel(k) < v) return false
  for (const [k, v] of Object.entries(c.max_relationship ?? {})) if (rel(k) > v) return false
  for (const [k, v] of Object.entries(c.min_faction ?? {})) if (rep(k) < v) return false
  for (const [k, v] of Object.entries(c.max_faction ?? {})) if (rep(k) > v) return false
  for (const [k, v] of Object.entries(c.min_stat ?? {})) if (stat(k) < v) return false
  if (c.relationship_type && !c.relationship_type.includes(s.player.missing_person.relationship)) return false
  if (c.visited && !c.visited.every(id => (s.visited?.[id] ?? 0) > 0)) return false
  if (c.not_visited && c.not_visited.some(id => (s.visited?.[id] ?? 0) > 0)) return false
  if (c.taken && !c.taken.every(k => s.taken?.[k])) return false
  if (c.min_curse !== undefined && s.world.curse_spread < c.min_curse) return false
  if (c.max_curse !== undefined && s.world.curse_spread > c.max_curse) return false
  if (c.min_gold !== undefined && s.player.resources.gold < c.min_gold) return false
  const counter = (id: string) => s.counters?.[id] ?? 0
  for (const [k, v] of Object.entries(c.min_counter ?? {})) if (counter(k) < v) return false
  for (const [k, v] of Object.entries(c.max_counter ?? {})) if (counter(k) > v) return false
  if (c.health_below !== undefined && s.player.resources.health >= c.health_below) return false
  if (c.any && !c.any.some(x => meets(x, s))) return false
  if (c.not && meets(c.not, s)) return false
  return true
}
