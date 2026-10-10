import { describe, it, expect } from 'vitest'
import { applyWhen } from '../../src/gameState'
import type { DayPart, GameState } from '../../src/types'

function at(day: number, part: DayPart): GameState {
  return { world: { act: 1, chapter: 1, day, time_of_day: part, current_location: 'crestfall_docks', curse_spread: 0 } } as GameState
}

describe('applyWhen', () => {
  it('keeps the day for the same part', () => {
    const s = applyWhen(at(3, 'midday'), { part: 'midday' })
    expect([s.world.day, s.world.time_of_day]).toEqual([3, 'midday'])
  })

  it('keeps the day for a later part', () => {
    const s = applyWhen(at(3, 'morning'), { part: 'evening' })
    expect([s.world.day, s.world.time_of_day]).toEqual([3, 'evening'])
  })

  it('moves to the next day for an earlier part', () => {
    const s = applyWhen(at(3, 'night'), { part: 'morning' })
    expect([s.world.day, s.world.time_of_day]).toEqual([4, 'morning'])
  })

  it('skips whole days', () => {
    const s = applyWhen(at(9, 'evening'), { part: 'evening', skip_days: 2 })
    expect([s.world.day, s.world.time_of_day]).toEqual([11, 'evening'])
  })

  it('ignores a day anchor lower than the current day', () => {
    const s = applyWhen(at(18, 'morning'), { part: 'morning', day: 15 })
    expect(s.world.day).toBe(18)
  })

  it('jumps forward to a day anchor', () => {
    const s = applyWhen(at(13, 'evening'), { part: 'afternoon', day: 15 })
    expect(s.world.day).toBe(15)
  })

  it('does not change the state it was given', () => {
    const before = at(3, 'night')
    applyWhen(before, { part: 'dawn' })
    expect(before.world.day).toBe(3)
  })
})

describe('applyWhen with a list of parts', () => {
  it('keeps the current part when it is in the list', () => {
    const s = applyWhen(at(3, 'afternoon'), { part: ['morning', 'afternoon'] })
    expect([s.world.day, s.world.time_of_day]).toEqual([3, 'afternoon'])
  })
  it('moves to the first part when the current one is not listed', () => {
    const s = applyWhen(at(2, 'dawn'), { part: ['morning', 'afternoon'] })
    expect([s.world.day, s.world.time_of_day]).toEqual([2, 'morning'])
  })
})
