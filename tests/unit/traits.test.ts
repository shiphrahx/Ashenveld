import { describe, it, expect } from 'vitest'
import { traitEarned, traitBonuses } from '../../src/rules'

const at = (counters: Record<string, number>, health = 80, flags: Record<string, unknown> = {}) =>
  ({ counters, flags, player: { resources: { health } } })

describe('traits (G14)', () => {
  it('awards the behaviour shown most, at three or more', () => {
    expect(traitEarned(at({ listened: 3, careful: 4 }))?.id).toBe('careful')
    expect(traitEarned(at({ listened: 3, careful: 2 }))?.id).toBe('listener')
  })

  it('never awards the same trait twice', () => {
    expect(traitEarned(at({ careful: 5, listened: 3 }, 80, { trait_careful: true }))?.id).toBe('listener')
  })

  it('falls back to coin, then wear, then kept faith', () => {
    expect(traitEarned(at({ compact_coin: 35 }))?.id).toBe('company_coin')
    expect(traitEarned(at({}, 39))?.id).toBe('worn')
    expect(traitEarned(at({}))?.id).toBe('kept_faith')
    expect(traitEarned(at({ lied: 1 }))).toBeNull()
  })

  it('adds its bonus only where it applies', () => {
    expect(traitBonuses({ trait_careful: true }, 'anywhere', 'perception')).toEqual([{ value: 1, label: 'Careful' }])
    expect(traitBonuses({ trait_careful: true }, 'anywhere', 'charisma')).toEqual([])
    expect(traitBonuses({ trait_listener: true }, 'act1_ch4_lira', 'charisma')).toEqual([{ value: 1, label: 'Listener' }])
    expect(traitBonuses({ trait_blunt: true }, 'act1_ch4_maret_opens', 'charisma')).toEqual([{ value: -1, label: 'Blunt' }])
  })
})
