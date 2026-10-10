/**
 * cues.ts — the story's sound cues (E3). A scene or an outcome names one in
 * its `cue` field.
 */

import type { CueId } from '../types'
import { cueParts, duck } from './engine'

export function playCue(cue: CueId | undefined): void {
  const p = cueParts()
  if (!cue || !p) return
  const { ctx, bedsBus, noteBus, noteOscs, noteTarget, setNote, out } = p
  const t = ctx.currentTime

  const sines = (freqs: number[], level: number, hold: number, fade: number) => {
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(level, t + 0.8)
    g.gain.setValueAtTime(level, t + hold)
    g.gain.linearRampToValueAtTime(0, t + hold + fade)
    g.connect(out)
    for (const f of freqs) {
      const o = ctx.createOscillator(); o.frequency.value = f
      o.connect(g); o.start(t); o.stop(t + hold + fade + 0.1)
    }
  }

  switch (cue) {
    // The bed cuts to nothing in 80ms. Then the note fades in over 4 seconds.
    case 'silence_falls':
      bedsBus.gain.cancelScheduledValues(t)
      bedsBus.gain.setValueAtTime(bedsBus.gain.value, t)
      bedsBus.gain.linearRampToValueAtTime(0, t + 0.08)
      noteBus.gain.cancelScheduledValues(t)
      noteBus.gain.setValueAtTime(0, t + 0.08)
      noteBus.gain.linearRampToValueAtTime(Math.max(noteTarget, 0.05), t + 4)
      break

    // The note swells for 3.5 seconds, then drops back.
    case 'touch': {
      const peak = Math.max(noteTarget, 0.02) * 4
      noteBus.gain.cancelScheduledValues(t)
      noteBus.gain.setValueAtTime(noteBus.gain.value, t)
      noteBus.gain.linearRampToValueAtTime(peak, t + 0.8)
      noteBus.gain.setValueAtTime(peak, t + 2.5)
      noteBus.gain.linearRampToValueAtTime(noteTarget, t + 3.5)
      break
    }

    // The bed ducks to 20% for 2 seconds.
    case 'stopped':
      duck(0.2, 2000)
      break

    // The beating stops: 55.6 glides to 55. Two more notes join for 4 seconds, then silence.
    case 'resolve':
      noteOscs[1].frequency.cancelScheduledValues(t)
      noteOscs[1].frequency.setValueAtTime(noteOscs[1].frequency.value, t)
      noteOscs[1].frequency.linearRampToValueAtTime(55, t + 3)
      noteBus.gain.setValueAtTime(noteBus.gain.value, t)
      noteBus.gain.linearRampToValueAtTime(Math.max(noteTarget, 0.05), t + 1)
      sines([69.3, 110], 0.035, 3 + 4, 3)
      setTimeout(() => { setNote(0, 3); bedsBus.gain.setTargetAtTime(0, ctx.currentTime, 1) }, 7000)
      break

    // The glide stops short. The beating slows and does not stop.
    case 'resolve_partial':
      noteOscs[1].frequency.cancelScheduledValues(t)
      noteOscs[1].frequency.setValueAtTime(noteOscs[1].frequency.value, t)
      noteOscs[1].frequency.linearRampToValueAtTime(55.2, t + 3)
      break

    // One soft tone with a 5-second fade.
    case 'end':
      sines([110, 165], 0.04, 0.8, 5)
      break
  }
}
