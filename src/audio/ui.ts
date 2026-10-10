/**
 * ui.ts — interface sounds (E3). Short and quiet. They play even with the
 * ambience off, and never before the first click.
 */

import { audioContext, uiOut } from './engine'
import { noise } from './beds'

function out() {
  const ctx = audioContext()
  return ctx && ctx.state === 'running' ? { ctx, bus: uiOut() } : null
}

/** 18ms of white noise through a band-pass. */
export function tick(level = 1, freq = 2200): void {
  const o = out(); if (!o) return
  const { ctx, bus } = o, t = ctx.currentTime
  const s = noise(ctx, 'white')
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.25 * level, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.018)
  s.connect(f); f.connect(g); g.connect(bus)
  s.start(t, Math.random() * 3); s.stop(t + 0.03)
}

function tone(freq: number, start: number, len: number, level: number, to?: number) {
  const o = out(); if (!o) return
  const { ctx, bus } = o, t = ctx.currentTime + start
  const osc = ctx.createOscillator(), g = ctx.createGain()
  osc.frequency.setValueAtTime(freq, t)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + len)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(level, t + 0.01)
  g.gain.setValueAtTime(level, t + len * 0.6)
  g.gain.exponentialRampToValueAtTime(0.0001, t + len)
  osc.connect(g); g.connect(bus)
  osc.start(t); osc.stop(t + len + 0.02)
}

export const choiceTick = () => tick(1, 2200)
export const panelTick = () => tick(0.5, 1400)
export const diceFace = () => tick(1 / 3, 2200)
export const diceSuccess = () => { tone(440, 0, 0.12, 0.12); tone(554, 0.12, 0.12, 0.12) }
export const diceCost = () => tone(440, 0, 0.16, 0.12)
export const diceFailure = () => tone(95, 0, 0.22, 0.18, 55)
export const journalNote = () => tone(660, 0, 0.06, 0.05)
