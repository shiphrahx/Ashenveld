/**
 * beds.ts — the six ambient beds (E3). Each is a few seconds of looped noise
 * through a filter. Levels are low on purpose: the town has stopped making
 * its sounds, and the deep forest makes none.
 */

import type { BedId } from '../types'

export interface Bed {
  id: BedId
  gain: GainNode
  update(o: { dimming: number }): void
  stop(): void
}

type Kind = 'white' | 'pink' | 'brown'
const buffers = new WeakMap<AudioContext, Partial<Record<Kind, AudioBuffer>>>()

/** A 4-second looped noise source. Buffers are made once per kind. */
export function noise(ctx: AudioContext, kind: Kind): AudioBufferSourceNode {
  const cache = buffers.get(ctx) ?? {}
  buffers.set(ctx, cache)
  let buf = cache[kind]
  if (!buf) {
    const n = ctx.sampleRate * 4
    buf = ctx.createBuffer(1, n, ctx.sampleRate)
    const d = buf.getChannelData(0)
    let last = 0, b0 = 0, b1 = 0, b2 = 0
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1
      if (kind === 'white') d[i] = w
      else if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5 }
      else { b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2 }
    }
    cache[kind] = buf
  }
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.loop = true
  return src
}

/** A slow sine that moves a parameter around its current value. */
function lfo(ctx: AudioContext, hz: number, depth: number, target: AudioParam): OscillatorNode {
  const o = ctx.createOscillator(); o.frequency.value = hz
  const g = ctx.createGain(); g.gain.value = depth
  o.connect(g); g.connect(target); o.start()
  return o
}

function filtered(ctx: AudioContext, out: AudioNode, kind: Kind, type: BiquadFilterType, freq: number, level: number, q = 0.8) {
  const src = noise(ctx, kind)
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q
  const g = ctx.createGain(); g.gain.value = level
  src.connect(f); f.connect(g); g.connect(out)
  src.start(0, Math.random() * 4)
  return { src, f, g }
}

function bed(id: BedId, ctx: AudioContext, out: AudioNode, build: (into: GainNode) => { stop?: () => void; update?: Bed['update'] }): Bed {
  const gain = ctx.createGain()
  gain.connect(out)
  const nodes = build(gain)
  return {
    id, gain,
    update: nodes.update ?? (() => {}),
    stop() { nodes.stop?.(); gain.disconnect() },
  }
}

export const BEDS: Record<BedId, (ctx: AudioContext, out: AudioNode) => Bed> = {
  // Brown noise, low-passed, with a slow wobble: water against the pilings.
  river: (ctx, out) => bed('river', ctx, out, into => {
    const { src, g } = filtered(ctx, into, 'brown', 'lowpass', 420, 0.22)
    const w = lfo(ctx, 0.08, 0.22 * 0.25, g.gain)
    return { stop: () => { src.stop(); w.stop() } }
  }),

  // A low fire: a little pink noise and an irregular crackle.
  hearth: (ctx, out) => bed('hearth', ctx, out, into => {
    const { src } = filtered(ctx, into, 'pink', 'bandpass', 1800, 0.035)
    let timer: ReturnType<typeof setTimeout> | undefined
    let rate = 1
    const crackle = () => {
      const t = ctx.currentTime
      const len = 0.015 + Math.random() * 0.025
      const s = noise(ctx, 'white')
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1200
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.02 + Math.random() * 0.08, t)
      g.gain.exponentialRampToValueAtTime(0.0001, t + len)
      s.connect(f); f.connect(g); g.connect(into)
      s.start(t, Math.random() * 3); s.stop(t + len + 0.01)
      timer = setTimeout(crackle, (90 + Math.random() * 610) / rate)
    }
    crackle()
    return {
      stop: () => { clearTimeout(timer); src.stop() },
      // The fires are lower when The Dimming is high.
      update: ({ dimming }) => { rate = dimming >= 75 ? 0.5 : 1 },
    }
  }),

  // The town: a faint band of brown noise drifting between 300 and 700 Hz. Nothing else.
  town: (ctx, out) => bed('town', ctx, out, into => {
    const { src, f } = filtered(ctx, into, 'brown', 'bandpass', 500, 0.1, 0.6)
    const w = lfo(ctx, 0.05, 200, f.frequency)
    return { stop: () => { src.stop(); w.stop() } }
  }),

  // Wind in a canopy. No birds.
  road: (ctx, out) => bed('road', ctx, out, into => {
    const { src, g } = filtered(ctx, into, 'pink', 'bandpass', 900, 0.06, 0.7)
    const w = lfo(ctx, 0.04, 0.03, g.gain)
    return { stop: () => { src.stop(); w.stop() } }
  }),

  // Near silence. The note does the work.
  deep: (ctx, out) => bed('deep', ctx, out, () => ({})),
  chamber: (ctx, out) => bed('chamber', ctx, out, () => ({})),
}
