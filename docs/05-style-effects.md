# 05 — Style effects (E1–E10)

Read `00-START-HERE.md` first. This file needs the settings store (file 04, U4), the time and curse fixes (file 01, B7 and B8) and The Dimming (file 03, G8).

**Principle.** The story is about quiet, stillness and a note below hearing. Every effect should serve that. Slow, sparse, and able to stop completely. Nothing loops fast. Nothing flashes.

**Two switches gate everything here.**

```ts
// src/settings.ts
export const motionAllowed = (s: Settings) =>
  s.motion === 'full' || (s.motion === 'system' && !matchMedia('(prefers-reduced-motion: reduce)').matches)
```

- Motion: `<html data-motion="on|off">`, set from `motionAllowed`.
- Screen effects: add `screenEffects: boolean` (default true) to `Settings` for E4 and E9's colour changes.

---

## E1 — Respect reduced motion (High)

No animation checks the system setting today. Animations in the codebase: `npIn` (paragraph fade, `SceneView`), `dRoll` (dice), `titleFadeIn`, `fadeIn` (`GameOver`), `stepIn` (creation), `twinkle` (`StarField`), `pulse` (loading), the map's current-node pulse, the 400ms art cross-fade, and hover transitions.

In `src/index.css`:

```css
:root[data-motion="off"] *, :root[data-motion="off"] *::before, :root[data-motion="off"] *::after {
  animation-duration: 0.001ms !important; animation-iteration-count: 1 !important;
  transition-duration: 0.001ms !important; scroll-behavior: auto !important;
}
```

- Elements that start at `opacity: 0` and rely on an animation to appear must still end visible. Check `.np`, `.nd`, `.outcomeBlock`, `.titleContent`, `.stepHeader`.
- Canvas and audio-driven effects (E5, E8, E9) read `motionAllowed` directly and render one static frame when it is false.
- Add the Motion control to Settings: System, Reduced, Full.

**Check.** With the OS set to reduce motion, play from title to the first roll. Nothing moves except instant state changes.

---

## E2 — Rebuild the dice moment (High)

**Problem.** `DiceOverlay` is a 94% black layer over the story. The text shows through and collides with the number. The result appears at once. Labels are 9.5px in the dimmest colour.

**New component, same file `src/components/DiceOverlay.tsx`.**

Layout, top to bottom, on an opaque `--bg-panel` surface that covers the story column only (`role="dialog"`, `aria-modal="true"`, labelled "Charisma check"):

1. Stat name in Cinzel 14px: "Charisma".
2. Target line, 14px: "16 to succeed · 10 to scrape through".
3. The die: a 96px number.
4. The sum, 14px, one part per chip: `d20 14` `Charisma +5` `You read the text +2` `= 21`. Bonus chips use the `label` from the roll (file 03, G1).
5. Verdict in words: "Success", "Success, at a cost", "Failed". Colour reinforces. It never carries the meaning alone.
6. **Continue** button, focused when it appears.
7. Commander only, on a failed Charisma roll, once per act: a second button, **Command** (file 03, G5).

Timing:

| Phase | Length | What happens |
|---|---|---|
| Roll | 700ms | The number changes every 60ms through random faces, slowing over the last 200ms. One soft tick per change (E3). |
| Land | 150ms | The final face settles with a 4% scale overshoot. |
| Sum | 300ms | Chips appear left to right. |
| Verdict | then | Verdict and button appear. |

- Click, Space or Enter during the roll skips to the verdict.
- With motion off: no cycling. Show everything at once.
- Announce the result once through an `aria-live="assertive"` node: "Charisma check. Rolled 14, plus 7. 21 against 16. Success."
- The actual roll is computed before the animation starts. The animation is display only.

---

## E3 — Add sound (High)

There is no audio. Synthesise everything with the Web Audio API so no files are needed. New folder `src/audio/`.

### Engine

```ts
// src/audio/engine.ts
let ctx: AudioContext | null = null
let master: GainNode, bedBus: GainNode, uiBus: GainNode
let current: Bed | null = null

export function unlock() {                    // call from the first click on Begin / Continue
  if (ctx) return
  ctx = new AudioContext()
  master = ctx.createGain(); master.connect(ctx.destination)
  bedBus = ctx.createGain(); bedBus.connect(master)
  uiBus = ctx.createGain(); uiBus.gain.value = 0.5; uiBus.connect(master)
}
export function setVolume(v: number) { if (ctx) master.gain.setTargetAtTime(v, ctx.currentTime, 0.05) }
export function setBed(id: BedId, opts: { dimming: number }) {   // cross-fade over 1.5s
  if (!ctx || current?.id === id) { current?.update(opts); return }
  const next = BEDS[id](ctx, bedBus); next.gain.gain.value = 0
  next.gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.5)
  current?.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5)
  const old = current; setTimeout(() => old?.stop(), 1700)
  current = next; current.update(opts)
}
export interface Bed { id: BedId; gain: GainNode; update(o: { dimming: number }): void; stop(): void }
```

Shared helper: a 4-second looped noise buffer.

```ts
export function noise(ctx: AudioContext, kind: 'white' | 'pink' | 'brown') {
  const n = ctx.sampleRate * 4, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0)
  let last = 0, b0 = 0, b1 = 0, b2 = 0
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1
    if (kind === 'white') d[i] = w
    else if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5 }
    else { b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2 }
  }
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; return src
}
```

- Suspend the context on `visibilitychange` (hidden) and resume on return.
- Ambience toggle off → `bedBus` gain 0. Interface sounds still play.
- Default volume 0.6. Nothing plays before the first click.

### Beds

Add an `ambience` field to each location in the meta files. Six beds:

| Bed | Locations | Recipe |
|---|---|---|
| `river` | docks | Brown noise → low-pass 420 Hz. Gain wobble at 0.08 Hz, depth 25%. |
| `hearth` | Tallow Inn, Rootless camp | Pink noise → band-pass 1.8 kHz, very quiet. Crackle: white-noise bursts of 15–40ms with a fast decay, at random gaps of 90–700ms, random gain. |
| `town` | market, gate, shrine, Compact post, Mill Lane | Brown noise → band-pass sweeping 300–700 Hz at 0.05 Hz. Very quiet. Nothing else: the town has stopped making its sounds. |
| `road` | east road, Harrow, west road | Pink noise → band-pass 900 Hz with a slow gain swell (wind in a canopy). **No birds.** |
| `deep` | forest edge, ruins outskirts, gate stones, hidden passage, inner approach | Near silence. Only **the note** (below). |
| `chamber` | source chamber | The note, louder, plus a faint partial two octaves up. |

**The note.** Two sine oscillators at 55 Hz and 55.6 Hz (they beat slowly), and one at 82.4 Hz at a third of the level. Total level is very low: it should be felt on small speakers as a pressure more than heard.

- In `deep` and `chamber` it is always present.
- In every other bed, mix it in at `max(0, dimming − 40) / 60` of its deep level. The player starts to hear it in town as The Dimming rises.
- The Arcane hears it from the first scene at a low level.

**Birds return.** When the location is `east_road_return` or `west_road_leaving`, or any `road`/`town` bed after `ritual_complete`, add sparse birdsong: short sine chirps (2.5–4 kHz, 60–120ms, quick pitch slide) at random gaps of 3–9 seconds. This is the audible payoff of the seal. With `ritual_partial`, half as often.

### Story cues

Add an optional `cue` field to scenes and outcomes. Play it on entry.

| Cue | Where | Sound |
|---|---|---|
| `silence_falls` | `act1_ch7_forest_edge:step_into_forest_alone`, and entry to `act1_ch7_decision_enter` | The bed cuts to nothing in 80ms. Then the note fades in over 4 seconds. |
| `touch` | `act1_ch5_player_curse_touch` on entry | The note swells for 3.5 seconds, then drops back. Paired with E9. |
| `stopped` | `act1_ch5_curse_event` on entry | The bed ducks to 20% for 2 seconds. |
| `resolve` | `act2_ch6_ritual_sealing:hold_through_sealing:success` and `success_at_cost` | The 55.6 Hz oscillator glides to 55 Hz over 3 seconds (the beating stops). Add 69.3 Hz and 110 Hz for 4 seconds. Then everything fades to silence. |
| `resolve_partial` | the failure outcome | The glide stops at 55.2 Hz. The beating slows and does not stop. |
| `end` | entry to any ending | One soft 110 Hz + 165 Hz tone, 5-second fade. |

### Interface sounds (`src/audio/ui.ts`)

| Event | Sound |
|---|---|
| Choice picked, Continue | Tick: 18ms white noise → band-pass 2.2 kHz, quiet |
| Panel open or close | The same tick, half level, band-pass 1.4 kHz |
| Dice face change | Tick at a third of the level |
| Dice success | Two sines, 440 then 554 Hz, 120ms each |
| Dice at a cost | One sine, 440 Hz, 160ms |
| Dice failure | Sine falling 95 → 55 Hz over 220ms |
| Journal note added | One sine, 660 Hz, 60ms, very quiet |

### Controls

- Settings: volume slider, ambience on or off.
- A speaker button in the sidebar and status strip toggles mute. It is labelled and keyboard reachable.

**Check.** No sound before the first click. Muting is instant. Leaving the tab stops all sound.

---

## E4 — Let the curse affect the screen (Medium)

The text describes dimming and narrowing. The screen never changes.

Set two variables on the shell from state, with a 2-second CSS transition:

```ts
shell.style.setProperty('--dim', String(Math.min(1, curse / 100)))
shell.style.setProperty('--deep', isDeepForest(location) ? '1' : '0')
```

```css
.art img { filter: saturate(calc(1 - 0.75 * var(--dim) - 0.15 * var(--deep))) brightness(calc(1 - 0.12 * var(--dim))); transition: filter 2s; }
.art::after { content: ''; position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse at center, transparent calc(70% - 30% * var(--dim)), rgba(0,0,0,.85) 100%);
  opacity: calc(0.25 + 0.6 * var(--dim)); transition: opacity 2s; }
.story { --reveal: calc(0.5s + 0.5s * var(--dim)); }            /* paragraphs arrive more slowly */
.shell { --accent-sat: calc(1 - 0.5 * var(--dim)); }           /* use for the blue accents via color-mix */
```

- Story text contrast never changes. Only art, accents and pacing do.
- After the seal: in `act2_ch6_aftermath`, The Dimming drops (G8). Let the transition run for 4 seconds there instead of 2. This is the moment colour comes back.
- With a partial seal the art never returns to full saturation (floor at 30).
- `screenEffects: false` pins `--dim` to 0.

---

## E5 — Replace the scanlines and stars (Medium)

- Delete the scanline rule `.shell::after` in `App.module.css`. CRT lines suit a different genre.
- `StarField` stays on the title, creation and end screens only. Remove it from the game phase in `App.tsx`. Behind the game shell use a flat `--black` with one faint radial gradient.
- Delete the unused `.moonGlow`, `.fogLayer` and `.sceneArt svg` rules in `SceneArt.module.css`, or reuse `fogDrift` below.

New component `src/components/Atmosphere.tsx`: one `<canvas>` over the art panel, `pointer-events: none`, `aria-hidden`.

| Layer | Locations | Behaviour |
|---|---|---|
| `mist` | docks, east road, forest edge, west road | 4–6 large soft sprites drifting sideways at 4–8 px/s, opacity 4–8% |
| `embers` | Tallow Inn, Rootless camp | Up to 14 points rising from the lower third, 10–25 px/s, fading out, warm colour |
| `ash` | ruins outskirts, gate stones, Harrow | Up to 30 flecks falling at 6–14 px/s with slight sway, grey |
| `motes` | shrine, inner approach, source chamber | Up to 20 points moving very slowly at random, pale |
| none | market, gate, Compact post | — |

- Add `atmosphere` to each location in the meta files.
- Cap at 30 fps. Pause when the tab is hidden. With motion off, draw one frame and stop.
- Particle count scales with canvas area. Never more than 40.
- At The Dimming 75 or more, `embers` halve. The fires are lower.

---

## E6 — Act cards and transitions (Medium)

**Act card.** New component `ActCard.tsx`, shown when the next scene's `act` is higher than the current one, before the scene appears.

- Full shell, opaque. Eyebrow "Act II". Title from `act_summaries` in the master index ("The Deep"). A 240px rule.
- If a trait was earned (file 03, G14): "You have become: Listener", with its one-line effect.
- **Continue** button. Fade in over 1.2 seconds.
- Also show a card for Act I when a new game starts, after character creation: "Act I · The Return".
- This replaces the scene `act1_ch7_act1_end` and its "Continue — Act II" choice (file 02, N12).

**Chapter change.** When `chapter` changes, show the chapter's `title` from its file under the scene title for 3 seconds, then fade it.

**Day change.** When `world.day` rises, stamp "Day 4 · Dawn" across the top of the art for 2.5 seconds.

**Location change.** Lengthen the art cross-fade to 700ms. Fade the story column out for 200ms and in for 300ms around the swap. No movement, only opacity.

---

## E7 — Let players skip the text fade (Medium)

Today each paragraph fades in 0.14 seconds after the last, every visit, with no way to finish it. Speech paragraphs use a fixed delay and appear out of order.

- Total reveal time is capped: delay per paragraph = `min(0.14s, 1.0s / paragraphCount)`. All paragraphs, of every kind, use the same sequence.
- A click, tap or key press anywhere in the story column completes the reveal at once.
- Choices appear when the reveal completes, and never later than 1.2 seconds after entry. This stops accidental clicks on choices that shift.
- `settings.textReveal === 'instant'`: no fade.
- Scenes in `meta.seenScenes`: no fade.
- Duration reads `--reveal` from E4.

---

## E8 — Add life to the art (Medium)

All optional, all off when motion is off.

1. **Slow drift.** The image scales from 1.00 to 1.05 and shifts up to 1.5% toward its focal point over 45 seconds, then back. `transform` only.
2. **Light flicker.** The art manifest (file 06) may list lights: `{ x, y, r, color }` in percentages. Render each as a radial gradient layer with `mix-blend-mode: screen` and an irregular opacity animation (keyframes at uneven stops between 0.55 and 1, 2.7s and 4.1s loops layered so the pattern does not visibly repeat). Use for fires and lanterns.
3. **Pointer parallax.** Wide screens only: the image moves up to 6px against the pointer. Throttle to animation frames.
4. **Time of day.** Apply a grade per `DayPart` on top of E4 (file 06, A7 has the values).

---

## E9 — Stage the big moments (Medium)

Add `stage` to `Scene`: `'quiet' | 'reunion' | 'ritual' | 'touch' | 'stopped' | 'ending'`. `SceneView` adds it as a class on the shell.

| Stage | Scenes | Treatment |
|---|---|---|
| `quiet` | `act1_ch1_still_man`, `act1_ch4_lira`, `act1_ch7_harrow_investigation`, `act2_ch5_missing_person_private`, `act2_ch8_relationship_test` | Sidebar and tab bar fade to 35% until a choice is made. Bed ducks to 50%. |
| `stopped` | `act1_ch5_curse_event` | On entry, everything that moves (atmosphere, drift, flicker) freezes for 2 seconds. Cue `stopped`. |
| `touch` | `act1_ch5_player_curse_touch` | On entry, the whole shell desaturates to 15% over 600ms, holds for 3 seconds, and returns over 1 second. Cue `touch`. Choices appear only after it returns. This is the player's first direct contact with the curse. Make it land. |
| `reunion` | `act2_ch1_missing_person_approach`, `act2_ch1_reunion` | On entry to the first, all sound drops to silence for 3 seconds. Sidebar at 35%. |
| `ritual` | `act2_ch6_ritual_approach`, `_engagement`, `_sealing`, `act2_ch6_aftermath` | Sidebar hidden on wide screens (the story column widens). A slow warm glow at the art's focal point, 6-second pulse, brighter in each scene. On a successful seal: cue `resolve`, glow fades, colour returns (E4), and Continue appears after a 2-second hold. |
| `ending` | the five endings | Clock hidden. Bed fades out over 5 seconds. After the last choice, fade to the end screen over 2 seconds with cue `end`. |

With motion off or `screenEffects` off: keep the sound cues and the sidebar dimming. Skip the colour and glow changes.

---

## E10 — Small feedback on controls (Polish)

- Choices and buttons: a pressed state (background one step lighter, 80ms).
- Hovering or focusing a rolled choice highlights that stat's row in the sidebar, and shows the modifier.
- When a bar changes (Resolve, The Dimming, a faction), it flashes one step brighter for 600ms and the number counts to the new value.
- The Journal button shows a dot when there is a new note.
- No bounce, no shake, no confetti.
