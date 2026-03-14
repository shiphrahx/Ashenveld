/**
 * dice.ts — D20 dice resolution
 *
 * Modifier formula: floor((stat - 5) / 2)
 * Outcomes (from meta dice_rules):
 *   success:         roll >= dc + 4
 *   success_at_cost: roll >= dc - 2 AND roll < dc + 4
 *   failure:         roll < dc - 2
 */

import type { GameState, Roll, RollResult, DiceOutcome } from './types'

export function rollDice(roll: Roll, state: GameState): RollResult {
  const statKey = roll.stat as keyof GameState['player']['stats']
  const statValue = state.player.stats[statKey] ?? 10

  const modifier = Math.floor((statValue - 5) / 2)
  const d20 = Math.floor(Math.random() * 20) + 1
  const total = d20 + modifier

  let outcome: DiceOutcome
  if (total >= roll.dc + 4) {
    outcome = 'success'
  } else if (total >= roll.dc - 2) {
    outcome = 'success_at_cost'
  } else {
    outcome = 'failure'
  }

  return {
    d20,
    modifier,
    total,
    dc: roll.dc,
    outcome,
    statName: roll.stat,
  }
}

export function difficultyLabel(dc: number): { label: string; css: string } {
  if (dc <= 9)  return { label: 'Easy',   css: 'easy' }
  if (dc <= 13) return { label: 'Medium', css: 'medium' }
  if (dc <= 17) return { label: 'Hard',   css: 'hard' }
  return             { label: 'Very Hard', css: 'hard' }
}
