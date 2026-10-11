import { describe, it, expect, vi } from 'vitest'

vi.mock('../../src/loader', async orig => ({
  ...(await orig<typeof import('../../src/loader')>()),
  getMasterIndex: () => ({ faction_reputation_thresholds: {}, class_stat_blocks: {} }),
}))
import { applyStateChanges } from '../../src/gameState'
import type { GameState } from '../../src/types'

const base = () => ({
  player: { resources: { gold: 0, health: 100, max_health: 100 } },
  world: { act: 1, chapter: 1, day: 7, time_of_day: 'evening', current_location: 'crestfall_tallow_inn', curse_spread: 15 },
  factions: { iron_compact: { reputation: 0 }, ashen_covenant: { reputation: 0 }, rootless: { reputation: 0 } },
  relationships: { innkeeper_aldous: { closeness: 0 } },
  flags: {}, inventory: [], journal: [], counters: {}, visited: {}, taken: {},
}) as unknown as GameState

describe('relationship last seen (U11)', () => {
  it('records the day and place when closeness changes', () => {
    const next = applyStateChanges(base(), { relationships: { innkeeper_aldous: { closeness: 5 } } })
    expect(next.relationships.innkeeper_aldous).toMatchObject({ closeness: 5, seen: { day: 7, location: 'crestfall_tallow_inn' } })
  })
})
