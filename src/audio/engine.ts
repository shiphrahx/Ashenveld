/**
 * engine.ts — all of Ashenveld's sound, made in the browser (E3)
 *
 * Nothing plays before unlock(), which the first click on Begin or Continue
 * calls. Routing:
 *
 *   beds ─► bedsBus ─┐
 *   the note ─► noteBus ─┼─► bedBus (ambience on/off) ─► duck ─► master ─► out
 *   birds ─► birdBus ─┘
 *   interface sounds ─► uiBus ─────────────────────────────────► master
 */

import type { BedId } from '../types'
import { BEDS, type Bed } from './beds'

let ctx: AudioContext | null = null
let master: GainNode, bedBus: GainNode, duckGain: GainNode, uiBus: GainNode
let bedsBus: GainNode, noteBus: GainNode, birdBus: GainNode
let current: Bed | null = null

let volume = 0.6
let muted = false
let ambience = true

export const audioContext = () => ctx
export const uiOut = () => uiBus

export function unlock(): void {
  if (ctx || typeof AudioContext === 'undefined') return
  try { ctx = new AudioContext() } catch { return }
  master = ctx.createGain(); master.connect(ctx.destination)
  duckGain = ctx.createGain(); duckGain.connect(master)
  bedBus = ctx.createGain(); bedBus.connect(duckGain)
  bedsBus = ctx.createGain(); bedsBus.connect(bedBus)
  noteBus = ctx.createGain(); noteBus.gain.value = 0; noteBus.connect(bedBus)
  birdBus = ctx.createGain(); birdBus.gain.value = 0.5; birdBus.connect(bedBus)
  uiBus = ctx.createGain(); uiBus.gain.value = 0.5; uiBus.connect(master)
  startNote()
  applyLevels(0)
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return
    if (document.hidden) void ctx.suspend()
    else void ctx.resume()
  })
}

function applyLevels(t = 0.05) {
  if (!ctx) return
  master.gain.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, t)
  bedBus.gain.setTargetAtTime(ambience ? 1 : 0, ctx.currentTime, t)
}

export function setVolume(v: number) { volume = Math.max(0, Math.min(1, v)); applyLevels() }
/** Muting is instant. */
export function setMuted(m: boolean) { muted = m; applyLevels(0.005) }
/** Ambience off silences the beds, the note and the birds. Interface sounds still play. */
export function setAmbience(on: boolean) { ambience = on; applyLevels() }

// ─── The note ─────────────────────────────────────────────────────────────────
// Two sines at 55 and 55.6 Hz that beat slowly, and 82.4 Hz at a third of the
// level. Felt more than heard. Its level follows the place and The Dimming.

const NOTE_DEEP = 0.05
let noteOscs: OscillatorNode[] = []
let partial: GainNode
let noteTarget = 0

function startNote() {
  if (!ctx) return
  const sine = (f: number, level: number, to: AudioNode) => {
    const o = ctx!.createOscillator(); o.frequency.value = f
    const g = ctx!.createGain(); g.gain.value = level
    o.connect(g); g.connect(to); o.start()
    return o
  }
  noteOscs = [sine(55, 1, noteBus), sine(55.6, 1, noteBus), sine(82.4, 1 / 3, noteBus)]
  partial = ctx.createGain(); partial.gain.value = 0; partial.connect(noteBus)
  sine(220, 0.3, partial)                          // two octaves up, for the chamber
}

function setNote(level: number, seconds = 1.5) {
  if (!ctx) return
  noteTarget = level
  noteBus.gain.cancelScheduledValues(ctx.currentTime)
  noteBus.gain.setValueAtTime(noteBus.gain.value, ctx.currentTime)
  noteBus.gain.linearRampToValueAtTime(level, ctx.currentTime + seconds)
}

// ─── Beds ─────────────────────────────────────────────────────────────────────

export interface SceneSound {
  bed: BedId
  /** The Dimming, 0–100. */
  dimming: number
  /** The Arcane hears the note from the first scene. */
  arcane: boolean
  /** How the seal went: the note was the curse, so it goes when the seal holds. */
  seal: 'full' | 'partial' | null
  /** Birdsong: 1 normal, 0.5 half as often, 0 none. */
  birds: number
}

let sound: SceneSound | null = null

export function setScene(next: SceneSound): void {
  if (!ctx) { sound = next; return }
  const bedChanged = current?.id !== next.bed
  sound = next
  if (bedChanged) {
    const bed = BEDS[next.bed](ctx, bedsBus)
    bed.gain.gain.value = 0
    bed.gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.5)
    const old = current
    if (old) {
      old.gain.gain.cancelScheduledValues(ctx.currentTime)
      old.gain.gain.setValueAtTime(old.gain.gain.value, ctx.currentTime)
      old.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5)
      setTimeout(() => old.stop(), 1700)
    }
    current = bed
    // A cue may have cut the beds; a new place brings them back.
    bedsBus.gain.setTargetAtTime(1, ctx.currentTime, 0.4)
  }
  current?.update({ dimming: next.dimming })

  const base = next.bed === 'deep' ? 1 : next.bed === 'chamber' ? 1.6 : Math.max(0, next.dimming - 40) / 60
  const sealed = next.seal === 'full' ? 0 : next.seal === 'partial' ? 0.4 : 1
  setNote(NOTE_DEEP * sealed * Math.max(base, next.arcane ? 0.2 : 0))
  partial.gain.setTargetAtTime(next.bed === 'chamber' && next.seal !== 'full' ? 1 : 0, ctx.currentTime, 0.5)
  if (next.seal === 'partial') noteOscs[1].frequency.setTargetAtTime(55.2, ctx.currentTime, 0.5)
  setBirds(next.birds)
}

/** Resume whatever was asked for before the first click. */
export function replay() { if (sound) { current = null; setScene(sound) } }

// ─── Birds ────────────────────────────────────────────────────────────────────

let birdTimer: ReturnType<typeof setTimeout> | undefined
let birdRate = 0

function setBirds(rate: number) {
  if (rate === birdRate) return
  birdRate = rate
  clearTimeout(birdTimer)
  if (rate > 0) scheduleBird()
}

function scheduleBird() {
  const gap = (3000 + Math.random() * 6000) / birdRate
  birdTimer = setTimeout(() => { chirp(); if (birdRate > 0) scheduleBird() }, gap)
}

function chirp() {
  if (!ctx || document.hidden) return
  const n = 1 + Math.floor(Math.random() * 3)
  for (let i = 0; i < n; i++) {
    const t = ctx.currentTime + i * 0.14
    const len = 0.06 + Math.random() * 0.06
    const f = 2500 + Math.random() * 1500
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.frequency.setValueAtTime(f, t)
    o.frequency.exponentialRampToValueAtTime(f * (Math.random() < 0.5 ? 1.25 : 0.8), t + len)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.04, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + len)
    o.connect(g); g.connect(birdBus)
    o.start(t); o.stop(t + len + 0.02)
  }
}

// ─── Ducking and cues ─────────────────────────────────────────────────────────

/** Bring everything but the interface down to `level` for `ms`, then back. */
export function duck(level: number, ms: number, back = 0.6): void {
  if (!ctx) return
  const g = duckGain.gain, t = ctx.currentTime
  g.cancelScheduledValues(t)
  g.setValueAtTime(g.value, t)
  g.linearRampToValueAtTime(level, t + 0.15)
  g.setValueAtTime(level, t + ms / 1000)
  g.linearRampToValueAtTime(1, t + ms / 1000 + back)
}

/** Hold the duck until release(), for staged scenes. */
export function hold(level: number): void {
  if (!ctx) return
  duckGain.gain.cancelScheduledValues(ctx.currentTime)
  duckGain.gain.setTargetAtTime(level, ctx.currentTime, 0.3)
}
export function release(): void {
  if (!ctx) return
  duckGain.gain.cancelScheduledValues(ctx.currentTime)
  duckGain.gain.setTargetAtTime(1, ctx.currentTime, 0.4)
}

/** Fade the beds and the note out, for the endings. */
export function fadeOut(seconds: number): void {
  if (!ctx) return
  bedsBus.gain.setTargetAtTime(0, ctx.currentTime, seconds / 3)
  setNote(0, seconds)
  setBirds(0)
}

export const cueParts = () => ctx ? { ctx, bedsBus, noteBus, noteOscs, noteTarget, setNote, out: duckGain } : null

/** Undo any fade, duck or cut left over from the last game. */
export function resetMix(): void {
  if (!ctx) return
  bedsBus.gain.setTargetAtTime(1, ctx.currentTime, 0.3)
  release()
}
