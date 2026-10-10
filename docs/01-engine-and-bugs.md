# 01 — Engine and bugs (B1–B23)

Read `00-START-HERE.md` first. This file fixes what is broken and builds the engine pieces the other files rely on.

Order inside this file: section 0, then B1 → B13 (one PR), then B21 with B14 → B20 (second PR), then B22 and B23 late.

---

## 0. Engine foundation (build this before B1)

Everything below goes in `src/types.ts` unless a file is named.

### 0.1 `Condition`

One shape for every test. It replaces `ChoiceRequires`. Keep `ChoiceRequires` as an alias so existing imports compile.

```ts
export interface Condition {
  flags?: Record<string, boolean | string | number>
  inventory?: string[]                       // all must be held
  class?: string | string[]
  min_relationship?: Record<string, number>  // npc id → closeness
  max_relationship?: Record<string, number>
  min_faction?: Record<string, number>       // faction id → reputation
  max_faction?: Record<string, number>
  min_stat?: Record<string, number>
  relationship_type?: string[]               // player.missing_person.relationship, lower case
  visited?: string[]                         // scene ids already entered
  not_visited?: string[]
  taken?: string[]                           // "sceneId:choiceId"
  min_curse?: number
  max_curse?: number
  health_below?: number
  any?: Condition[]                          // at least one matches
  not?: Condition
}
export type ChoiceRequires = Condition
```

New file `src/conditions.ts`:

```ts
import type { Condition, GameState } from './types'

export function meets(c: Condition | undefined | null, s: GameState): boolean {
  if (!c) return true
  if (c.flags) for (const [k, want] of Object.entries(c.flags)) {
    const have = s.flags[k]
    if (typeof want === 'boolean') { if (Boolean(have) !== want) return false }
    else if (have !== want) return false
  }
  if (c.inventory && !c.inventory.every(i => s.inventory.includes(i))) return false
  if (c.class) {
    const list = Array.isArray(c.class) ? c.class : [c.class]
    if (!list.includes(s.player.class)) return false
  }
  const rel = (id: string) => s.relationships[id]?.closeness ?? 0
  const rep = (id: string) => (s.factions as Record<string, { reputation: number }>)[id]?.reputation ?? 0
  const stat = (id: string) => (s.player.stats as Record<string, number>)[id] ?? 0
  for (const [k, v] of Object.entries(c.min_relationship ?? {})) if (rel(k) < v) return false
  for (const [k, v] of Object.entries(c.max_relationship ?? {})) if (rel(k) > v) return false
  for (const [k, v] of Object.entries(c.min_faction ?? {})) if (rep(k) < v) return false
  for (const [k, v] of Object.entries(c.max_faction ?? {})) if (rep(k) > v) return false
  for (const [k, v] of Object.entries(c.min_stat ?? {})) if (stat(k) < v) return false
  if (c.relationship_type && !c.relationship_type.includes(s.player.missing_person.relationship)) return false
  if (c.visited && !c.visited.every(id => (s.visited?.[id] ?? 0) > 0)) return false
  if (c.not_visited && c.not_visited.some(id => (s.visited?.[id] ?? 0) > 0)) return false
  if (c.taken && !c.taken.every(k => s.taken?.[k])) return false
  if (c.min_curse !== undefined && s.world.curse_spread < c.min_curse) return false
  if (c.max_curse !== undefined && s.world.curse_spread > c.max_curse) return false
  if (c.health_below !== undefined && s.player.resources.health >= c.health_below) return false
  if (c.any && !c.any.some(x => meets(x, s))) return false
  if (c.not && meets(c.not, s)) return false
  return true
}
```

Replace `isChoiceVisible` in `SceneView.tsx` with `meets(choice.requires, state)`.

### 0.2 `RichText` and tokens

```ts
export type TextPart = string | { when: Condition; text: string; else?: string }
export type RichText = string | TextPart[]
```

- `Scene.text.default`, each class passage, `Choice.text` and `Outcome.text` all become `RichText`. A plain string still works.
- In the array form each part is one or more paragraphs. Parts are joined with a blank line. A guarded part with no `else` produces nothing when the condition fails.

New file `src/text.ts`:

```ts
import type { RichText, GameState } from './types'
import { meets } from './conditions'

const REL_LABEL: Record<string, string> = {
  'childhood friend': 'childhood friend', 'former lover': 'former lover', 'sibling': 'sibling',
  'mentor': 'mentor', 'parent': 'parent', 'the one who got away': 'the one who got away',
}

export function resolveRich(rt: RichText | undefined, s: GameState): string {
  if (!rt) return ''
  const raw = typeof rt === 'string' ? rt
    : rt.map(p => typeof p === 'string' ? p : (meets(p.when, s) ? p.text : (p.else ?? ''))).filter(Boolean).join('\n\n')
  return applyTokens(raw, s)
}

export function applyTokens(t: string, s: GameState): string {
  const mp = s.player.missing_person
  return t
    .replace(/\[missing person\]/g, mp.name || 'them')
    .replace(/\[player\]/g, s.player.name || 'you')
    .replace(/\[relationship\]/g, REL_LABEL[mp.relationship] ?? 'someone you loved')
}

export const paragraphs = (t: string) => t.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
```

**Stop using `dangerouslySetInnerHTML`.** The player's typed names now flow into story text. Render paragraphs as React nodes. Support exactly one inline mark, `*emphasis*`:

```tsx
export function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*[^*\n]+\*)/g)
  return <>{parts.map((p, i) => p.startsWith('*') && p.endsWith('*') && p.length > 2
    ? <em key={i}>{p.slice(1, -1)}</em> : <React.Fragment key={i}>{p}</React.Fragment>)}</>
}
```

Use `Inline` for scene text, outcome text, choice labels and the journal. This also fixes the literal asterisks around `*bonded*` and `*unified wanting*` (B20).

### 0.3 Scene and choice additions

```ts
export type DayPart = 'dawn' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'night'
export interface SceneWhen { part: DayPart; day?: number; skip_days?: number; hide_clock?: boolean }

export interface Scene {
  // existing fields stay
  when?: SceneWhen
  text_mode?: Partial<Record<'commander' | 'arcane' | 'ranger' | 'cipher', 'append' | 'replace'>>
  route?: Array<{ when?: Condition; next: string }>   // B2: never rendered
  ending?: { id: string; title: string }             // B5
  rest?: boolean                                     // G9: resting allowed here
  objective?: string                                 // U5: journal goal line
}
export interface Choice {
  // existing fields stay
  once?: boolean          // hidden after it has been taken in this save
  locked_hint?: string    // G12: shown when requires fails, e.g. "Needs the Covenant marker stone"
}
```

### 0.4 State additions

```ts
export interface GameState {
  version: 2
  // existing fields stay
  visited: Record<string, number>        // scene id → times entered
  taken: Record<string, true>            // "sceneId:choiceId"
  ended?: { id: string; title: string }  // set when an ending is reached
  world: { act: number; chapter: number; day: number; time_of_day: DayPart; current_location: string; curse_spread: number }
}
```

`createFreshState` sets `version: 2`, `visited: {}`, `taken: {}`, `time_of_day: 'evening'`.

### 0.5 One function to enter a scene, one to resume

Rewrite `navigateTo` in `App.tsx` around two paths.

```ts
// Enter: used after a choice and for a new game. Applies entry effects exactly once.
async function enterScene(sceneId: string, state: GameState) {
  let scene = await resolveScene(sceneId)
  for (let hops = 0; scene.route && hops < 5; hops++) {          // B2
    const hit = scene.route.find(r => meets(r.when, state)) ?? scene.route[scene.route.length - 1]
    scene = await resolveScene(hit.next)
  }
  let next: GameState = structuredClone(state)
  next.current_scene = scene.id
  next.visited[scene.id] = (next.visited[scene.id] ?? 0) + 1
  next.world.act = scene.act                                      // B8
  next.world.chapter = scene.chapter
  next.world.current_location = scene.location
  if (scene.when) next = applyWhen(next, scene.when)              // B8
  next = applyStateChanges(next, scene.on_enter?.state_changes ?? {})
  next = checkCurse(next)
  setGameState(next); setCurrentScene(scene); saveGame(next)
}

// Resume: used by Continue and refresh. Applies nothing.          // B9
async function resumeScene(saved: GameState) {
  const scene = await resolveScene(saved.current_scene)
  setGameState(saved); setCurrentScene(scene)
}
```

`handleContinue` calls `resumeScene`. `handleCreationComplete` and `handleChoice` call `enterScene`.

---

## B1 — Show the main scene text and add class text as an aside (Critical)

**Problem.** `resolveText()` in `src/components/SceneView.tsx` returns the class passage instead of the default. 428 class passages exist. Only 38 retell the scene. The rest are short asides that assume the default text was read.

**Change.**

1. Delete `resolveText`. Add to `src/text.ts`:

```ts
export function sceneText(scene: Scene, s: GameState): { main: string[]; aside: string[] } {
  const cls = s.player.class as keyof Scene['text']
  const variant = scene.text[cls]
  const mode = scene.text_mode?.[cls as 'commander'] ?? 'append'
  if (variant && mode === 'replace') return { main: paragraphs(resolveRich(variant, s)), aside: [] }
  return { main: paragraphs(resolveRich(scene.text.default, s)), aside: variant ? paragraphs(resolveRich(variant, s)) : [] }
}
```

2. In `SceneView`, render `main` paragraphs, then the aside in its own block:

```tsx
{aside.length > 0 && (
  <aside className={styles.lens} aria-label={`${CLASS_LABELS[state.player.class]} — your read`}>
    <div className={styles.lensLabel}>{CLASS_LABELS[state.player.class]}</div>
    {aside.map((p, i) => <p key={i}><Inline text={p} /></p>)}
  </aside>
)}
```

Style: no box. A 1px left rule in `--blue-mid`, 20px left padding, text in `--text-main` (one step dimmer than the main text), label in Cinzel 12px `--blue-ice`. It must read as a second voice, not as a different feature.

3. Ignore non-class keys inside `text` (`maret_note`, `note`). They are developer notes. The validator (B21) should warn about them. File 02 (N8) turns them into real scenes.

4. Set `text_mode` to `"replace"` for the passages that retell the scene. These 38 pairs were detected by shared phrases or repeated dialogue:

| Scene | Classes to mark `replace` |
|---|---|
| `act1_ch1_barge_arrival` | commander, arcane, ranger, cipher |
| `act1_ch1_docks_encounter` | commander, arcane, ranger, cipher |
| `act1_ch1_tallow_arrival` | commander, arcane, ranger, cipher |
| `act1_ch1_tallow_room` | arcane, cipher |
| `act1_ch3_compact_introduction` | commander, arcane, cipher |
| `act1_ch3_maret_first_meeting` | commander, ranger, cipher |
| `act1_ch4_maret_letter_success` | arcane, ranger |
| `act1_ch6_road_traveller` | commander |
| `act1_ch6_missing_person_campsite` | arcane |
| `act1_ch7_harrow_investigation` | ranger |
| `act1_ch7_forest_edge` | cipher |
| `act1_ch7_maret_confession` | cipher |
| `act1_ch7_act1_end` | arcane |
| `act2_ch1_reunion` | arcane |
| `act2_ch3_compact_checkpoint` | arcane |
| `act2_ch3_crestfall_changed` | ranger |
| `act2_ch3_rootless_situation` | ranger |
| `act2_ch6_ritual_approach` | ranger |
| `act2_ch6_seriva_arrives` | arcane |
| `act2_ch7_aftermath_crestfall` | cipher |
| `act2_ch7_maret_and_missing` | ranger |
| `act3_ch1_leaving` | cipher |
| `act3_ch4_resolution_road` | ranger |

`replace` is the safe first step. File 02 (N1, step 5) then rewrites these 38 into true asides so every class sees the main text everywhere. Remove each `text_mode` entry as its passage is converted.

5. After this change, read every scene once in `append` mode for each class and list any place where the aside repeats or contradicts the default. Put the list in the PR description.

**Checks.**
- New game as Cipher: the first scene shows the Cipher rewrite only. `act2_ch3_crestfall_news` shows the default text (Vorne's arrival, 30 soldiers) and then "The notice is strategic…".
- The ending shows the full "A specific morning, some years later…" text and then the class epilogue.
- No scene renders two copies of the same line of dialogue.

---

## B2 — Route to the right ending (Critical)

**Problem.** `act3_ch5_endings` (file `resources/act3/act3_ch5_endings.json`) is a placeholder titled "The Router". Its single choice always leads to `ending_stays_together`. Four written endings are unreachable.

**Change.**

1. Engine: `route` handling is in section 0.5.
2. Data: replace the router scene's `text` and `choices` with a `route`. Keep `text.default` as an empty string so the type holds.

```json
{
  "id": "act3_ch5_endings", "act": 3, "chapter": 5, "location": "crestfall_market", "title": "",
  "on_enter": { "state_changes": {}, "time_advance": 0 }, "requires": {}, "text": { "default": "" }, "choices": [],
  "route": [
    { "when": { "flags": { "player_stays_alone": true } }, "next": "ending_alone_legend" },
    { "when": { "any": [
        { "flags": { "player_leaves_ashenveld": true } },
        { "flags": { "missing_person_sent_ahead": true, "player_stays_permanently": false } }
      ] }, "next": "ending_escape_together" },
    { "when": { "flags": { "seriva_admitted_guilt": true, "knows_covenant_kills_afflicted": true, "documentation_complete": true },
                "min_relationship": { "the_missing_person": 80 } }, "next": "ending_the_account" },
    { "when": { "flags": { "rootless_aligned": true } }, "next": "ending_warden_of_ashenveld" },
    { "next": "ending_stays_together" }
  ]
}
```

3. Add `"ending": { "id": "...", "title": "..." }` to each of the five ending scenes. Use the scene's own title. Rename the duplicate-sounding titles so each is distinct: "The Warden Stays", "The Road West" (`ending_escape_together`), "The Warden Alone" (`ending_alone_legend`), "The Camp Endures" (`ending_warden_of_ashenveld`), "The Account".
4. The sent-ahead path can join the "stayed" scenes through `realise_you_are_staying`. Those scenes assume the missing person is present. File 02 (N16) adds the bridging line.

**Checks.** The e2e test (B21) must reach four different ending IDs from the four choices in `act2_ch8_point_of_no_return`. "The Router" never appears on screen.

---

## B3 — Stop Return to Title from deleting the save (Critical)

**Problem.** `Menu` → `onReturnToTitle` → `handleRestart()` → `deleteSave()`. `handleNewGame()` also deletes at once.

**Change in `App.tsx`.**

```ts
const handleReturnToTitle = useCallback(() => {
  if (gameState) saveGame(gameState)
  setGameState(null); setCurrentScene(null)
  setSaveExists(hasSave()); setPhase('title')
}, [gameState])

const handleNewGame = useCallback(() => { setPhase('creation') }, [])   // no delete here

const handleCreationComplete = useCallback(async (r: CreationResult) => {
  deleteSave()                                                          // the only place a run is replaced
  const state = createFreshState(/* … */)
  setPhase('game'); await enterScene('act1_ch1_barge_arrival', state)
}, [])
```

- `TitleScreen`: when a save exists and the player presses New Game, show an inline confirm first: "Starting again replaces your saved game." with **Start again** and **Keep my save**. No browser `confirm()`.
- `CharacterCreation` step 1: enable the Back button and return to the title.
- `GameOver` (if kept after G9) calls `handleReturnToTitle`, not a delete.

**Checks.** Save → Return to Title → Continue is offered and resumes the same scene. New Game → Back out of creation → Continue is still offered.

---

## B4 and B5 — End state and end screen (Critical)

**Problem.** `handleChoice` sets `gameEnded` and returns. The outcome text disappears, no buttons remain, the final state is never saved, and `gameEnded` is never reset, so the next new game has no choices.

**Change.**

1. Delete the `gameEnded` state. Add `'ended'` to `AppPhase`.
2. In `handleChoice`, when `outcome.next_scene` is `null`:

```ts
let next = applyStateChanges(gameState, outcome.state_changes)
next = { ...next, journal: [...next.journal, entry], ended: currentScene.ending ?? { id: currentScene.id, title: currentScene.title } }
saveGame(next); recordEnding(next)        // recordEnding writes to the meta store, see below
setGameState(next); setPhase('ended')
```

3. New component `src/components/EndScreen.tsx`. Content, top to bottom:
   - Eyebrow: "An ending".
   - Ending title in Cinzel.
   - The ending's closing outcome text (keep it on screen, including "— End —").
   - "Your road here": four to six lines built from flags. Use this table.

| Line shown | Condition |
|---|---|
| "You came back as {class label}." | always |
| "Maret walked into the forest with you." / "You sent Maret back to her people." | `maret_joined` / `maret_sent_back` |
| "The seal held." / "The seal held in part." | `ritual_complete` / `ritual_partial` |
| "Issa stayed at the camp." / "The Compact took Issa." | `issa_agreement_reached` or `issa_remains_at_camp` / `issa_taken_by_compact` |
| "Seriva admitted what she did." | `seriva_admitted_guilt` |
| "You stood with the Rootless." / "You stood with the Compact." / "You brokered a settlement." | `rootless_aligned` / `compact_aligned` / `ashenveld_settlement_reached` |

   - "Endings found: n of 5" from the meta store.
   - Buttons: **Play again** (goes to creation) and **Title**.
4. Meta store: new key `ashenveld_meta` = `{ endings: string[], seenScenes: string[] }`. It survives new games. Add `loadMeta()`, `saveMeta()`, `recordEnding()` to `gameState.ts`.
5. `handleContinue`: if `saved.ended`, go straight to the end screen.
6. Title screen: if the save is ended, label the button "View ending".

**Checks.** Finish a run. The end screen shows. Title → New Game → the first scene has its two choices.

---

## B6 — Make health changes apply (High)

**Problem.** 11 outcomes write health under `state_changes.player.resources.health`. `applyStateChanges` only reads `state_changes.resources`.

**Change.**

1. Fix the data. Move each of these to `"resources": { "health": n }` and delete the `player` key:

| Scene | Choice | Outcome | Value |
|---|---|---|---|
| `act2_ch1_ruins_outskirts` | `follow_the_paths` | success_at_cost | −5 |
| `act2_ch1_ruins_outskirts` | `follow_the_paths` | failure | −10 |
| `act2_ch1_first_cairn` | `examine_carved_walls` | success_at_cost | −8 |
| `act2_ch2_chamber_entrance` | `prepare_first` | default | +10 |
| `act2_ch5_ritual_preparation` | `preparation_complete` | success | +15 |
| `act2_ch6_ritual_approach` | `proceed_to_engagement` | success_at_cost | −5 |
| `act2_ch6_ritual_approach` | `proceed_to_engagement` | failure | −10 |
| `act2_ch6_ritual_engagement` | `hold_through_reading` | success_at_cost | −15 |
| `act2_ch6_ritual_engagement` | `hold_through_reading` | failure | −20 |
| `act2_ch6_ritual_sealing` | `hold_through_sealing` | success_at_cost | −20 |
| `act3_ch1_alone_in_ashenveld` | `commit_to_the_choice` | success_at_cost | −10 |

2. Make `applyStateChanges` strict: remove the index signature from `StateChanges` so unknown keys are type errors, and have the validator (B21) reject unknown keys in JSON.
3. Gold must never go below 0. Clamp it. A choice that costs gold needs `"requires": { "min_gold": n }`; add `min_gold` to `Condition` and `meets`.
4. Health at 0 no longer deletes the save. See G9 in file 03 for what happens instead. Until G9 lands, clamp health at a floor of 1.

---

## B7 — Add to curse spread instead of overwriting it (High)

**Problem.** `applyStateChanges` does `Object.assign(next.world, changes.world)`. Every `curse_spread` value in the data is a change (+2, +3, −15), so the total never passes 6.

**Change.**

```ts
if (changes.world) {
  const { curse_spread, day, time_of_day, skip_days, ...rest } = changes.world as any
  Object.assign(next.world, rest)
  if (typeof curse_spread === 'number')
    next.world.curse_spread = Math.max(0, Math.min(100, next.world.curse_spread + curse_spread))
  if (time_of_day || day || skip_days) next = applyWhen(next, { part: time_of_day ?? next.world.time_of_day, day, skip_days })
}
```

Document in `types.ts`: `world.curse_spread` in `StateChanges` is a delta. Tuning of the values is G8 in file 03.

---

## B8 — Fix the clock and the chapter number (High)

**Problem.** Time is advanced in minutes from 05:00 and labelled by clock time, while outcomes also set labels directly without updating the minute counter. The result is "Night in Crestfall" at midday. `world.chapter` only changes at act breaks, so the header reads "Ch I" all game.

**Change.**

1. Delete `advanceTime`, `TIME_LABELS`, `minutesToLabel`, `minutesToClock`, `getAbsoluteMinutes` and the `_time_minutes` field from `gameState.ts`.
2. Add:

```ts
const PARTS: DayPart[] = ['dawn', 'morning', 'midday', 'afternoon', 'evening', 'night']

export function applyWhen(state: GameState, w: Partial<SceneWhen> & { part: DayPart }): GameState {
  const next = structuredClone(state)
  let day = next.world.day
  if (w.skip_days) day += w.skip_days
  else if (PARTS.indexOf(w.part) < PARTS.indexOf(next.world.time_of_day)) day += 1   // time only moves forward
  if (w.day) day = Math.max(day, w.day)
  next.world.day = day
  next.world.time_of_day = w.part
  return next
}
```

3. Chapter and act come from the scene (section 0.5). Remove `world.act` and `world.chapter` from `on_enter` of `act1_ch7_act1_end` and from the four outcomes of `act2_ch8_point_of_no_return`.
4. Header text becomes `Act II · Chapter 3` on the left group and `Day 7 · Evening` on the right. No clock time. When `scene.when.hide_clock` is true (the endings, set years later), hide the day and time everywhere.
5. Add `when` to every scene from the table below. Remove `time_advance` from all scenes and from the `OnEnter` type.
6. Remove these `world.day` values from the data (the flow now produces them): `act1_ch1_tallow_room:wake_and_explore` (2), `act1_ch5_class_specific:sleep_and_leave_tomorrow` (4), both outcomes of `act2_ch2_decision_to_return` (6), and the `on_enter` values of `act2_ch3_crestfall_news` (7), `act2_ch5_ritual_preparation` (9), `act2_ch6_day_of_ritual` (11), `act2_ch7_aftermath_crestfall` (12). Move every `on_enter` day of 15 or more into `when.day` as listed in the table.
7. Change `act2_ch5_ritual_preparation:preparation_complete:failure` from `"day": 10` to `"world": { "skip_days": 1, "curse_spread": 3 }`. Change `act3_ch2_finishing_work:commit_to_leaving_date:failure` from `"day": 27` to `"world": { "skip_days": 7 }`.
8. Keep the outcome-level `time_of_day` values. They now pass through `applyWhen` (see B7).
9. Fix the double sleep. `act1_ch1_innkeeper_cost:sleep` and `act1_ch1_innkeeper_failure:sleep_it_off` narrate a night's sleep and then lead to `act1_ch1_tallow_room`, which narrates going to bed again. Point both at `act1_ch2_morning_crestfall`.

**Time table.** `location` in the Extra column is used by file 06.

| Scene | `when.part` | Extra |
|---|---|---|
| `act1_ch1_barge_arrival` | evening |  |
| `act1_ch1_docks_encounter` | evening |  |
| `act1_ch1_tallow_arrival` | night |  |
| `act1_ch1_innkeeper_success` | night |  |
| `act1_ch1_innkeeper_cost` | night |  |
| `act1_ch1_innkeeper_failure` | night |  |
| `act1_ch1_still_man` | night |  |
| `act1_ch1_tallow_room` | night |  |
| `act1_ch2_morning_crestfall` | morning |  |
| `act1_ch2_market_square` | morning |  |
| `act1_ch2_market_rumour_missing` | morning |  |
| `act1_ch2_childhood_home` | morning | `location: "childhood_home_area"` (was `crestfall_market`) |
| `act1_ch2_old_friend` | morning |  |
| `act1_ch3_compact_introduction` | morning |  |
| `act1_ch3_compact_offer` | morning |  |
| `act1_ch3_covenant_introduction` | morning |  |
| `act1_ch3_covenant_warning` | morning |  |
| `act1_ch3_covenant_task` | morning |  |
| `act1_ch3_rootless_rumour` | midday |  |
| `act1_ch3_rootless_camp_approach` | afternoon |  |
| `act1_ch3_maret_first_meeting` | afternoon |  |
| `act1_ch4_maret_opens` | afternoon |  |
| `act1_ch4_maret_guarded` | afternoon |  |
| `act1_ch4_rootless_camp_stay` | afternoon |  |
| `act1_ch4_lira` | afternoon |  |
| `act1_ch4_branch` | afternoon |  |
| `act1_ch4_maret_evening` | evening |  |
| `act1_ch4_maret_letter_success` | morning |  |
| `act1_ch4_maret_letter_withheld` | evening |  |
| `act1_ch5_curse_event` | midday |  |
| `act1_ch5_faction_responses` | afternoon |  |
| `act1_ch5_player_curse_touch` | evening |  |
| `act1_ch5_class_specific` | night |  |
| `act1_ch6_departure_decision` | dawn |  |
| `act1_ch6_visit_maret_departure` | morning |  |
| `act1_ch6_east_road_start` | morning |  |
| `act1_ch6_place_covenant_marker` | morning |  |
| `act1_ch6_cursed_creature` | midday |  |
| `act1_ch6_road_traveller` | midday |  |
| `act1_ch6_missing_person_campsite` | afternoon |  |
| `act1_ch6_harrow_arrival` | afternoon |  |
| `act1_ch7_harrow_investigation` | evening |  |
| `act1_ch7_harrow_cellar` | night |  |
| `act1_ch7_forest_edge` | morning |  |
| `act1_ch7_maret_follows` | morning |  |
| `act1_ch7_maret_confession` | morning |  |
| `act1_ch7_decision_enter` | morning |  |
| `act1_ch7_act1_end` | morning |  |
| `act2_ch1_ruins_outskirts` | midday |  |
| `act2_ch1_first_cairn` | midday |  |
| `act2_ch1_the_watcher_seen` | afternoon | `location: "ruins_gate"` (was `ruins_outskirts`) |
| `act2_ch1_missing_person_approach` | afternoon | `location: "ruins_gate"` (was `ruins_outskirts`) |
| `act2_ch1_reunion` | afternoon | `location: "ruins_gate"` (was `ruins_outskirts`) |
| `act2_ch1_what_they_found` | evening | `location: "ruins_gate"` (was `ruins_outskirts`) |
| `act2_ch2_inner_approach` | morning |  |
| `act2_ch2_chamber_entrance` | morning |  |
| `act2_ch2_source_chamber` | midday |  |
| `act2_ch2_decision_to_return` | afternoon |  |
| `act2_ch3_crestfall_news` | morning |  |
| `act2_ch3_missing_person_teaching` | midday |  |
| `act2_ch3_compact_checkpoint` | afternoon |  |
| `act2_ch3_crestfall_changed` | evening |  |
| `act2_ch3_aldous_update` | evening |  |
| `act2_ch3_rootless_situation` | evening |  |
| `act2_ch3_pol_revelation` | night |  |
| `act2_ch3_seriva_first_meeting` | morning |  |
| `act2_ch4_vorne_meeting` | morning |  |
| `act2_ch4_issa_crisis` | midday |  |
| `act2_ch4_vorne_issa_negotiation` | morning |  |
| `act2_ch4_issa_confrontation` | afternoon |  |
| `act2_ch4_pol_fragment` | midday |  |
| `act2_ch5_return_to_ruins` | evening |  |
| `act2_ch5_ritual_preparation` | evening | `skip_days: 2` |
| `act2_ch5_maret_conversation` | evening |  |
| `act2_ch5_missing_person_private` | night |  |
| `act2_ch6_day_of_ritual` | morning |  |
| `act2_ch6_ritual_approach` | morning |  |
| `act2_ch6_ritual_engagement` | midday |  |
| `act2_ch6_ritual_sealing` | midday |  |
| `act2_ch6_aftermath` | midday |  |
| `act2_ch6_seriva_arrives` | afternoon |  |
| `act2_ch7_aftermath_crestfall` | morning | `location: "east_road_return"` (was `east_road`) |
| `act2_ch7_crestfall_reception` | evening |  |
| `act2_ch7_vorne_reacts` | evening |  |
| `act2_ch7_maret_and_missing` | morning |  |
| `act2_ch8_faction_reckoning` | afternoon | `day: 15` |
| `act2_ch8_relationship_test` | evening |  |
| `act2_ch8_point_of_no_return` | morning | `day: 16` |
| `act3_ch1_new_ashenveld` | morning | `day: 17` |
| `act3_ch1_leaving` | morning | `day: 17`, `location: "west_road_leaving"` (was `east_road`) |
| `act3_ch1_staying_briefly` | morning | `day: 17` |
| `act3_ch1_alone_in_ashenveld` | morning | `day: 17` |
| `act3_ch2_rebuilding` | morning | `day: 20` |
| `act3_ch2_on_the_road` | midday | `day: 20`, `location: "west_road_leaving"` (was `east_road`) |
| `act3_ch2_finishing_work` | morning | `day: 20` |
| `act3_ch2_alone_work` | morning | `day: 20` |
| `act3_ch3_the_long_work` | morning | `day: 30` |
| `act3_ch3_road_further` | morning | `day: 30`, `location: "west_road_leaving"` (was `east_road`) |
| `act3_ch3_alone_continues` | morning | `day: 30` |
| `act3_ch4_resolution` | morning | `day: 45` |
| `act3_ch4_resolution_road` | morning | `day: 45`, `location: "west_road_leaving"` (was `east_road`) |
| `act3_ch4_resolution_alone` | morning | `day: 45` |
| `act3_ch5_endings` | morning |  |
| `ending_stays_together` | morning | `hide_clock: true` |
| `ending_escape_together` | morning | `hide_clock: true`, `location: "west_road_leaving"` (was `east_road`) |
| `ending_alone_legend` | morning | `hide_clock: true` |
| `ending_warden_of_ashenveld` | morning | `hide_clock: true` |
| `ending_the_account` | morning | `hide_clock: true` |

**Checks.** On the main path the day counter never goes down, the ritual falls on Day 12, and the final choice on Day 16. Add a unit test for `applyWhen` covering: same part, later part, earlier part, `skip_days`, and a `day` anchor lower than the current day.

---

## B9 — Do not re-run entry effects on reload (High)

Covered by `resumeScene` in section 0.5. Also remove the `try/catch` seeding block's dependence on reload order.

**Check.** Reload five times on any scene. Day, time, gold, health and inventory do not change.

---

## B10 — Show place names in Acts 2 and 3 (High)

**Problem.** `App.locationName()` calls `getActMeta(scene.act).locations[...]`. Act 2 uses `new_locations`, Act 3 uses `new_locations_act3`, so the lookup throws and the raw ID is shown. `People.getAllNpcs()` has a similar workaround for `new_npcs`.

**Change in `src/loader.ts`.**

```ts
let locations: Record<string, LocationDef> = {}
let npcs: Record<string, NpcDef> = {}

// inside initLoader, after the three metas load:
for (const act of [1, 2, 3]) {
  const m = metaCache[act] as any
  Object.assign(locations, m.locations ?? {}, m.new_locations ?? {}, m.new_locations_act3 ?? {})
  Object.assign(npcs, m.npcs ?? {}, m.new_npcs ?? {})
}
export const getLocation = (id: string) => locations[id]
export const getNpc = (id: string) => npcs[id]
export const getAllNpcs = () => npcs
```

- Extend `LocationDef` and `NpcDef` with the fields the JSON already has: `region`, `ambient_day`, `ambient_night`; `location`, `personality`, `faction_alignment`.
- Replace `App.locationName()` and `People.getAllNpcs()` with these.
- If a location has no entry, show a title-cased version of the ID and log a console warning. Never show an underscore to the player.
- Add entries for the location IDs introduced by the time table:

```json
"childhood_home_area": { "id": "childhood_home_area", "name": "The Mill Lane", "region": "crestfall",
  "description": "Down the hill from the baker's, past the crumbling mill wall. The house you grew up in, with someone else's shutters." },
"ruins_gate": { "id": "ruins_gate", "name": "The Gate Stones", "region": "deep_forest",
  "description": "Two standing stones and a lintel. The Watcher sits against the right-hand stone." },
"east_road_return": { "id": "east_road_return", "name": "The East Road", "region": "east_road",
  "description": "The same road, walked west. There are birds in the trees again." },
"west_road_leaving": { "id": "west_road_leaving", "name": "The West Road", "region": "west",
  "description": "The road that goes away from Ashenveld. Ordinary trees. Ordinary weather." }
```

---

## B11 — Add the missing dice outcome (High)

1. Data: `act2_ch3_missing_person_teaching` → choice `ask_about_the_cost_to_them` has `success` and `failure` only. Add `success_at_cost` (closeness +20, same flags and destination as the other two). File 02 supplies the text; until then, reuse the first two paragraphs of the success text.
2. Engine: in `handleDiceContinue`, never return without an outcome. Fallback order:

```ts
const order: Record<DiceOutcome, DiceOutcome[]> = {
  success: ['success', 'success_at_cost', 'failure'],
  success_at_cost: ['success_at_cost', 'success', 'failure'],
  failure: ['failure', 'success_at_cost', 'success'],
}
const outcome = order[key].map(k => choice.outcomes[k]).find(Boolean) ?? choice.outcomes.default
```

3. The validator must fail on any rolled choice that lacks one of the three outcomes.

---

## B12 — Close the three loops (High)

**Engine.** In `handleChoice`, before entering the next scene: `next.taken[`${scene.id}:${choice.id}`] = true`. In `SceneView`, hide a choice when `choice.once && state.taken[key]`.

**Loop 1 — Branch failure replays Day 2.** `act1_ch3_rootless_camp_approach`: the `failure` outcomes of `be_direct_with_branch` and `offer_help_to_branch` lead to `act1_ch1_tallow_room`. Add a new scene to `act1_ch3_scenes.json` and point both failures at it:

```json
{
  "id": "act1_ch3_camp_second_try", "act": 1, "chapter": 3, "location": "rootless_camp", "title": "The Next Morning",
  "when": { "part": "morning" }, "on_enter": { "state_changes": { "flags": { "branch_turned_you_away": true } } }, "requires": {},
  "text": { "default": "You sleep at the Tallow and walk back out at first light.\n\nBranch is in the same place between the same two tents, as if he has not moved. He watches you come up the path that is not quite a path. He does not look surprised. He looks like a man revising an estimate.\n\n\"You came back,\" he says. \"Most do not.\"" },
  "choices": [
    { "id": "wait_him_out", "text": "Say nothing. Sit down on the stump by the path and wait.", "requires": {}, "roll": null,
      "outcomes": { "default": { "text": "You sit. He goes back to watching the tree line. The camp wakes behind him. After most of an hour a woman comes out between the tents, looks at you, looks at Branch, and says: \"How long has that one been sitting there?\"\n\n\"Long enough,\" Branch says.", "next_scene": "act1_ch3_maret_first_meeting", "state_changes": { "relationships": { "branch": { "closeness": 5 } } } } } },
    { "id": "ask_again_plainly", "text": "\"I am not selling anything. I am looking for [missing person].\"", "requires": {}, "roll": null,
      "outcomes": { "default": { "text": "The name does something to his face that yesterday's words did not. He looks at you for a long moment.\n\n\"Wait here,\" he says.", "next_scene": "act1_ch3_maret_first_meeting", "state_changes": {} } } }
  ]
}
```

Register the scene in `master_scene_index.json`.

**Loop 2 — the camp hub.** In `act1_ch4_rootless_camp_stay`, set `"once": true` on `talk_to_lira` and `talk_to_branch`. Change the opening sentence of the default text from "a full day" to "the rest of the day". G11 in file 03 adds the "two of three" limit.

**Loop 3 — staying in the ruins.** All outcomes of both choices in `act2_ch3_missing_person_teaching` lead back to `act2_ch3_crestfall_news`. Point them at `act2_ch3_compact_checkpoint` and add `"returned_to_crestfall": true, "stayed_for_lesson": true` to their flags. File 02 (N7) adds one conditional paragraph to the checkpoint so the extra day is acknowledged.

---

## B13 — One ID for the missing person (High)

In `resources/act2/act2_ch3_scenes.json`, scene `act2_ch3_missing_person_teaching`, rename the three `relationships.missing_person` keys to `the_missing_person`. Add a validator rule: every relationship key must exist in the merged NPC table.

---

## B14 — Link the two orphaned scenes (Medium)

- **Goran.** In `act1_ch2_childhood_home`, change `dont_knock:default` and `knock_on_door:failure` to lead to `act1_ch2_old_friend`. Its three choices already lead on to `act1_ch2_market_rumour_missing`. Set the scene's `when.part` to `morning`.
- **The fire.** In `act2_ch5_maret_conversation`, change all four outcomes (`proceed_tomorrow:default`, `send_message_back:*`) to lead to `act2_ch5_missing_person_private`. That scene's two choices already lead to `act2_ch6_day_of_ritual`.
- Update `cross_file_routes` in the master index to match.

---

## B15 — Fix the Compact gate choice (Medium)

`act1_ch6_departure_decision:visit_compact_before_leaving` leads to `act1_ch6_visit_maret_departure`, so choosing the Compact shows a scene about Maret. Turn the scene into a small hub so the player can make both visits and then leave:

- `visit_compact_before_leaving` → next `act1_ch6_departure_decision`, `once: true`.
- `visit_maret_before_leaving` → next `act1_ch6_departure_decision`, `once: true`.
- `leave_directly` → next `act1_ch6_east_road_start`. Relabel it "Take the east road."
- Delete the scene `act1_ch6_visit_maret_departure` (its text repeats the outcome of `visit_maret_before_leaving`) and remove it from the index.
- The scene text must not repeat on the second and third visit. Make the three opening paragraphs conditional and add a short fallback:

```json
"default": [
  { "when": { "not": { "any": [
      { "taken": ["act1_ch6_departure_decision:visit_compact_before_leaving"] },
      { "taken": ["act1_ch6_departure_decision:visit_maret_before_leaving"] } ] } },
    "text": "<the existing three paragraphs>",
    "else": "The light is coming up. The east road is waiting." }
]
```

---

## B16 — Fix the character summary card (Medium)

`src/components/CharacterCreation.tsx`:

- `gender === 'woman'` compares lower case against the stored `'Woman'`. Use the stored value directly.
- `finish()` calls `onComplete` after 800 ms. Remove the timer. The **Enter Ashenveld** button on the summary calls `onComplete`. Add a **Back** link that returns to step 4.
- The summary says "docks at Crestfall before dawn". Change to "at nightfall" (canon, file 00).

---

## B17 — Rest button (Medium)

Until G9 lands: disable the button with `aria-disabled="true"` and the tooltip "You cannot rest here." G9 gives it real behaviour.

---

## B18 — Remove used items (Medium)

In `applyStateChanges`, after flags and inventory are applied:

```ts
const defs = getMasterIndex().inventory_items
next.inventory = next.inventory.filter(id => { const f = defs[id]?.consumed_on; return !(f && next.flags[f]) })
```

Set `mechanism_fragment.consumed_on` handling to also trigger on `ritual_partial` (add a second field `consumed_on_any: ["ritual_complete", "ritual_partial"]` or set a shared flag `ritual_done` on both outcomes; prefer the shared flag). Add a `name` field to every item in `master_scene_index.json` and use it in `Items.tsx` in place of the ID-derived name.

---

## B19 — Hide people until met (Medium)

- Remove the seeding loop in `handleCreationComplete`. In `applyStateChanges`, when a relationship entry is created, start from `getNpc(id)?.initial_closeness ?? 0`.
- `People.tsx` lists only NPCs with a relationship entry. With the seeding gone, Corvin no longer appears early.
- The `role` strings were written for developers. File 02 (N18) supplies player-facing replacements.

---

## B20 — Text slips (Medium)

| Where | Now | Change to |
|---|---|---|
| `act2_ch7_crestfall_reception:text.default` | "Aldo is the first person" | "Aldous is the first person" |
| `act2_ch7_aftermath_crestfall:text.default` | "Four of you: you, your missing person, Pol." | "Three of you: you, [missing person], Pol." |
| `act2_ch7_vorne_reacts:propose_compact_withdrawal:success_at_cost` | "Ten soldiers become twenty." | "Thirty soldiers become twenty." |
| `act2_ch1_reunion`, `act2_ch2_source_chamber` outcomes | literal `*bonded*`, `*unified wanting*` | handled by `Inline` (section 0.2) |
| `act2_ch1_first_cairn:text.default` | message wrapped in asterisks | handled by `Inline`; file 04 (U14) styles it as an inscription |
| `act2_ch1_the_watcher_seen:try_to_reach_watcher:success` | "…and your missing person did not leave a message on a cairn stone telling you to wait here. Someone who has been in here…" | "…and nobody told the Watcher that name today. Someone who has been in here…" |

---

## B21 — Content validator and smoke test (Medium, do early in PR 2)

### Validator

New file `tools/validate-content.mjs`, run with Node, no dependencies. Add `"validate": "node tools/validate-content.mjs"` to `package.json` and a step in `deploy.yml` before the build. Exit code 1 on any error.

Errors:

1. A scene ID in a chapter file is missing from `scene_index`, or the reverse, or the `file` does not match.
2. A `next_scene` or `route.next` points at an unknown scene.
3. A scene cannot be reached from `starting_scene` (treat `route` targets and every outcome as edges).
4. A rolled choice lacks `success`, `success_at_cost` or `failure`. An unrolled choice lacks `default`.
5. Unknown keys in a scene, choice, outcome, `state_changes`, `requires`/`when` or `roll`.
6. A relationship key, faction key, item ID, stat name or location ID that is not defined.
7. A flag is required somewhere and set nowhere.
8. Two image files are byte-identical (hash them).
9. A scene has no `when`.
10. Any text contains a bracket token other than `[missing person]`, `[player]`, `[relationship]`.
11. A scene with `choices: []` has no `route`.

Warnings (print, do not fail):

- Flags that are set and never read. Print the count and write the list to `tools/out/unread-flags.txt`.
- Items that are granted and never required.
- Rolled choices whose three outcomes all have the same `next_scene` and identical `state_changes`.
- Non-class keys inside `text`.
- Any text containing: "if you have", "if you carry", "if she came", "whichever", "the reader", "your missing person".

### Smoke test

Add `@playwright/test`. New file `tests/playthrough.spec.ts`:

- Helper `pickChoice(page, index)` clicks the nth choice, continues through the dice panel and the outcome.
- Stub randomness per test with `page.addInitScript(() => { Math.random = () => 0.95 })` (always succeed) and a second variant at `0.02` (always fail).
- Four tests. Each creates a character of a different class, always takes the first available choice except at `act2_ch8_point_of_no_return` where it takes choice 0, 1, 2 or 3. Use `data-scene-id` on the scene container and `data-choice-id` on buttons so tests do not depend on wording.
- Assertions: no console errors; no scene ID visited more than three times; the end screen shows; the four ending IDs are all different; the location label never matches `/_/`; the visible text never matches `/\[missing person\]|if she came with you/`.
- One test for saves: play five choices, reload, Continue, assert day/time/gold/health are unchanged; open the menu, Return to Title, assert Continue is offered.
- One test at 390×844: the first paragraph of story text and all choices are within the viewport width.

Add `"test:e2e": "playwright test"` and run it in CI against `vite preview`.

---

## B22 — Image weight and folder layout (Medium, late)

- Move `resources/` to `public/resources/`. Vite then copies it during build. Delete the `cp -r resources dist/resources` line from `deploy.yml`. Fetch paths (`${BASE_URL}resources/...`) do not change.
- Move `resources/mockups/` to `docs/mockups/` so it is not published.
- New script `tools/optimize-images.mjs` using `sharp`: for each source image in `art/source/` write `public/resources/images/{name}@1x.webp` (width 640) and `{name}@2x.webp` (width 1280), quality 78. Keep sources out of `public/`.
- `SceneArt` uses `<img srcSet="…@1x.webp 640w, …@2x.webp 1280w" sizes="(max-width: 720px) 100vw, 34vw">`.
- Preload: after a scene renders, collect the `next_scene` IDs of its visible choices, resolve their locations, and create `new Image()` for each distinct image. Also call `resolveScene` on them so the next chapter file is cached.

Target: under 150 KB per image, under 3 MB for the whole set.

---

## B23 — Save versioning, export, import (Polish)

- `loadGame()`: if `version` is missing, run `migrateV1toV2`: add `visited: {}`, `taken: {}`; map old `time_of_day` strings ("05:35 — dawn") to a `DayPart` by taking the word after the dash; drop `_time_minutes`; merge `relationships.missing_person` into `the_missing_person`; delete the `player` debris if present. If migration throws, keep the raw save under `ashenveld_save_backup` and start clean.
- Menu → **Export save** downloads `ashenveld-save.json` (Blob URL and a temporary `<a download>`). **Import save** takes a file input, validates `version` and `current_scene` against the scene index, then loads it.
- Three save slots are optional. If added: keys `ashenveld_save_1..3`, and the title screen lists them with name, act and day.
