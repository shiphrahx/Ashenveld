import { describe, it, expect } from 'vitest'
import { odds, resolveRoll } from '../../src/dice'
import { modifierForStat } from '../../src/rules'
import type { GameState } from '../../src/types'

function withStats(stats: Partial<GameState['player']['stats']>, flags: Record<string, boolean> = {}): GameState {
  return {
    player: { stats: { strength: 10, dexterity: 10, stamina: 10, intelligence: 10, mana: 10, charisma: 10, perception: 10, ...stats }, resources: { gold: 0, health: 100, max_health: 100 } },
    flags, inventory: [], relationships: {}, factions: {}, visited: {}, taken: {}, counters: {},
    world: { curse_spread: 0 },
  } as unknown as GameState
}

const round = (o: { success: number; cost: number; failure: number }) =>
  [o.success, o.cost, o.failure].map(x => Math.round(x * 100))

describe('the modifier table', () => {
  it('spreads stats from −2 to +6', () => {
    expect([6, 8, 10, 12, 14, 16, 17].map(modifierForStat)).toEqual([-2, -1, 0, 1, 3, 5, 6])
  })
})

describe('odds at DC 12', () => {
  it('a signature stat of 16: 50% success, 20% failure', () => {
    expect(round(odds({ stat: 'charisma', dc: 12 }, withStats({ charisma: 16 })))).toEqual([50, 30, 20])
  })
  it('a weak stat of 9: 25% success, 45% failure', () => {
    expect(round(odds({ stat: 'charisma', dc: 12 }, withStats({ charisma: 9 })))).toEqual([25, 30, 45])
  })
})

describe('resolveRoll', () => {
  it('uses the best of several stats', () => {
    expect(resolveRoll({ stat: ['strength', 'mana'], dc: 12 }, withStats({ strength: 7, mana: 16 })).stat).toBe('mana')
  })
  it('applies only the bonuses whose conditions hold, capped at 6', () => {
    const roll = { stat: 'mana', dc: 12, bonus: [
      { when: { flags: { a: true } }, value: 4, label: 'A' },
      { when: { flags: { b: true } }, value: 4, label: 'B' },
      { when: { flags: { c: true } }, value: -2, label: 'C' },
    ] }
    const r = resolveRoll(roll, withStats({}, { a: true, b: true }))
    expect(r.bonuses.map(b => b.label)).toEqual(['A', 'B'])
    expect(r.bonus).toBe(6)
  })
})

describe('worn thin (G9)', () => {
  it('takes 2 off Stamina and Mana rolls at 40 Resolve or less', () => {
    const s = withStats({ stamina: 14 })
    s.player.resources.health = 40
    const r = resolveRoll({ stat: 'stamina', dc: 12 }, s)
    expect(r.bonus).toBe(-2)
    expect(resolveRoll({ stat: 'charisma', dc: 12 }, s).bonus).toBe(0)
  })
})
