import { describe, it, expect } from 'vitest'
import { classify, paragraphs } from '../../src/text'

describe('paragraph kinds (U14)', () => {
  it('reads "> " lines as a letter and strips the markers', () => {
    expect(classify('> Dear you,\n> Go home.')).toEqual({ kind: 'letter', text: 'Dear you,\nGo home.' })
  })
  it('reads a paragraph wholly in *…* as an inscription', () => {
    expect(classify('*I am below. Wait at the gate.*')).toEqual({ kind: 'inscription', text: 'I am below. Wait at the gate.' })
  })
  it('leaves everything else as body text', () => {
    expect(classify('"You came," they say. *bonded*').kind).toBe('p')
  })
  it('splits paragraphs on blank lines', () => {
    expect(paragraphs('one\n\n\ntwo\n\n')).toEqual(['one', 'two'])
  })
})

import { applyTokens } from '../../src/text'
import type { GameState } from '../../src/types'
const who = (gender: string) => ({ player: { name: 'Tam', gender, missing_person: { name: 'Ines', relationship: 'sibling' } } }) as unknown as GameState

describe('tokens', () => {
  it('fills in the names and the relationship', () => {
    expect(applyTokens('[player], [missing person], your [relationship].', who('Woman'))).toBe('Tam, Ines, your sibling.')
  })
  it("addresses the player by the gender chosen (N17)", () => {
    expect(applyTokens('Yes, [sir/ma\'am].', who('Woman'))).toBe("Yes, ma'am.")
    expect(applyTokens('Yes, [sir/ma\'am].', who('Man'))).toBe('Yes, sir.')
    expect(applyTokens('Yes, [sir/ma\'am].', who('Neither'))).toBe('Yes, traveller.')
  })
})
