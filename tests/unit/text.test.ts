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
