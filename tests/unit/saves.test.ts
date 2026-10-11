import { describe, it, expect } from 'vitest'
import { migrate, parseImport } from '../../src/saves'

const v1 = () => ({
  player: { name: 'Tam', class: 'cipher', missing_person: { name: 'Ines', relationship: 'Sibling' } },
  world: { act: 1, chapter: 2, day: 3, time_of_day: '05:35 — dawn', current_location: 'crestfall_market', curse_spread: 20, _time_minutes: 335 },
  relationships: { missing_person: { closeness: 30 }, the_missing_person: { closeness: 10 }, player: { closeness: 0 } },
  factions: { iron_compact: { reputation: 0 }, ashen_covenant: { reputation: 0 }, rootless: { reputation: 0 } },
  flags: {}, inventory: [], journal: [],
  current_scene: 'act1_ch2_market_square',
})

describe('save migration (B23)', () => {
  it('brings a version 1 save up to version 2', () => {
    const s = migrate(v1())
    expect(s.version).toBe(2)
    expect(s.visited).toEqual({})
    expect(s.taken).toEqual({})
    expect(s.world.time_of_day).toBe('dawn')
    expect('_time_minutes' in s.world).toBe(false)
    expect(s.relationships).toEqual({ the_missing_person: { closeness: 30 } })
  })

  it('leaves a current save alone', () => {
    const s = migrate({ ...v1(), version: 2, world: { ...v1().world, time_of_day: 'evening' }, visited: { a: 1 }, taken: {}, counters: {} })
    expect(s.visited).toEqual({ a: 1 })
    expect(s.world.time_of_day).toBe('evening')
  })

  it('refuses things that are not saves, and saves from a newer game', () => {
    expect(() => migrate({ hello: 1 })).toThrow()
    expect(() => migrate({ ...v1(), version: 3 })).toThrow(/newer/)
  })

  it('checks an imported file before loading it', () => {
    expect(parseImport('not json', () => true)).toMatch(/not a saved game/)
    expect(parseImport(JSON.stringify(v1()), () => false)).toMatch(/scene this version/)
    expect(parseImport(JSON.stringify(v1()), () => true)).toMatchObject({ current_scene: 'act1_ch2_market_square' })
  })
})
