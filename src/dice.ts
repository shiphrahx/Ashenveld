/**
 * dice.ts — d20 resolution
 *
 * The modifier comes from the table in rules.ts. Bonuses from earlier choices
 * add to it, capped at ±RULES.maxBonus. Outcomes:
 *   success:         total >= dc + 4
 *   success_at_cost: total >= dc - 2
 *   failure:         below that
 */

import type { GameState, Roll, RollResult, DiceOutcome, RollBonus } from './types'
import { meets } from './conditions'
import { RULES, modifierForStat, WORN_THIN, traitBonuses } from './rules'

export function modifierFor(s: GameState, stat: string): number {
  return modifierForStat((s.player.stats as Record<string, number>)[stat] ?? 10)
}

/** The stat used (best of a list), its modifier and the bonuses that apply. */
export function resolveRoll(roll: Roll, s: GameState): { stat: string; modifier: number; bonuses: RollBonus[]; bonus: number } {
  const stats = Array.isArray(roll.stat) ? roll.stat : [roll.stat]
  const stat = stats.reduce((a, b) => modifierFor(s, b) > modifierFor(s, a) ? b : a)
  const bonuses = (roll.bonus ?? []).filter(b => meets(b.when, s))
  // Traits earned at the act breaks (G14).
  for (const t of traitBonuses(s.flags ?? {}, s.current_scene, stat)) bonuses.push({ when: {}, ...t })
  // Worn thin: low Resolve makes enduring and sensing harder (G9).
  if (s.player.resources.health <= WORN_THIN && (stat === 'stamina' || stat === 'mana'))
    bonuses.push({ when: {}, value: -2, label: 'You are worn thin' })
  const bonus = Math.max(-RULES.maxBonus, Math.min(RULES.maxBonus, bonuses.reduce((n, b) => n + b.value, 0)))
  return { stat, modifier: modifierFor(s, stat), bonuses, bonus }
}

export function outcomeFor(total: number, dc: number): DiceOutcome {
  if (total >= dc + RULES.successMargin) return 'success'
  if (total >= dc + RULES.costMargin) return 'success_at_cost'
  return 'failure'
}

export function rollDice(roll: Roll, state: GameState): RollResult {
  const { stat, modifier, bonuses, bonus } = resolveRoll(roll, state)
  const d20 = Math.floor(Math.random() * 20) + 1
  const total = d20 + modifier + bonus
  return { d20, modifier, bonus, bonuses, total, dc: roll.dc, outcome: outcomeFor(total, roll.dc), statName: stat }
}

/** The die faces needed: [to succeed, to scrape through]. */
export function targets(roll: Roll, s: GameState): { success: number; cost: number } {
  return { success: roll.dc + RULES.successMargin, cost: roll.dc + RULES.costMargin }
}

/** The three chances, as fractions of 1. */
export function odds(roll: Roll, s: GameState) {
  const { modifier, bonus } = resolveRoll(roll, s)
  const faces = (target: number) => Math.max(0, Math.min(20, 21 - (target - modifier - bonus)))  // d20 faces that reach target
  const success = faces(roll.dc + RULES.successMargin) / 20
  const atLeastCost = faces(roll.dc + RULES.costMargin) / 20
  return { success, cost: atLeastCost - success, failure: 1 - atLeastCost }
}
