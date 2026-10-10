# Ashenveld — implementation brief (start here)

This folder is a work order for the repo `shiphrahx/Ashenveld`. It comes from a full audit: every scene was read, the source was read, and four complete playthroughs were run (one per class, one per Act 3 path).

Read this file first. Then work through the numbered files in order.

| File | Area | Items |
|---|---|---|
| `01-engine-and-bugs.md` | Things that are broken, plus the engine changes everything else needs | B1–B23 |
| `02-narrative.md` | Story, text, continuity | N1–N18 |
| `03-game-design.md` | Dice, stats, systems, branching | G1–G15 |
| `04-ui.md` | Layout, readability, panels, controls | U1–U20 |
| `05-style-effects.md` | Motion, sound, atmosphere | E1–E10 |
| `06-art.md` | Image wiring (code) and the brief for new images (human) | A1–A13 |

Item IDs (B1, N4, …) are stable. Use them in commit messages and PR titles.

---

## 1. The repo as it is today

- React 19 + TypeScript + Vite 8. CSS Modules. No runtime dependencies beyond React.
- Entry: `src/main.tsx` → `src/App.tsx`.
- Engine: `src/loader.ts` (fetches JSON), `src/gameState.ts` (state, save, time), `src/dice.ts`, `src/types.ts`.
- Screens and panels: `src/components/*` (`TitleScreen`, `CharacterCreation`, `SceneView`, `SceneArt`, `Sidebar`, `DiceOverlay`, `Journal`, `Items`, `People`, `Map`, `Menu`, `GameOver`, `StarField`).
- Content: `resources/master_scene_index.json`, `resources/act{1,2,3}/*_meta.json`, 20 chapter files, 108 scenes.
- Images: `resources/images/*.png` (22 files), mapped in `src/data/imageMap.ts`, chosen in `src/hooks/useLocationImage.ts`.
- Deploy: `.github/workflows/deploy.yml` builds, then runs `cp -r resources dist/resources`. Base path is `/Ashenveld/`.
- Save: one `localStorage` key, `ashenveld_save`, holding the whole `GameState`.

## 2. The single most important fact

`SceneView.resolveText()` returns `texts[class] ?? texts.default`. Every scene but one has a passage for every class, so **the `default` text is never shown**. Most class passages are short asides written to follow the default text. Fixing this (B1) changes how every other text issue looks, so do it first.

## 3. Order of work

Work in phases. One PR per phase. Do not start a phase until the one before it builds and passes the checks in section 6.

| Phase | Do | From file |
|---|---|---|
| 1 | Engine foundation and critical bugs: B1–B5, then B6–B13 | 01 |
| 2 | Content validator and smoke test: B21, plus B14–B20 | 01 |
| 3 | Responsive layout and reading settings: U1–U7 | 04 |
| 4 | Mechanics: G1–G6, then G7–G13 | 03 |
| 5 | Story pass: N1–N8, then N9–N18 | 02 |
| 6 | Remaining UI: U8–U20 | 04 |
| 7 | Effects: E1–E10 | 05 |
| 8 | Art wiring: section A of file 06. New images arrive separately | 06 |
| 9 | Polish: B22, B23, G14, G15 | 01, 03 |

Dependencies that cross files:

- N1, N6, N7, N8 need the condition system and rich text from **B1** and **G6** (both specified in file 01, section 0).
- G8 (curse clock) needs **B7**. G9 (health) needs **B6**.
- U5 (journal) needs the `objective` field defined in file 04.
- E4 (curse on screen) needs **G8**.
- File 06 section A needs **B10** (merged location table) and **B8** (time of day).

## 4. Ground rules

1. **Keep the author's prose.** Change wording only where a file tells you to. When you must write new prose, match the existing voice: second person, present tense, British spelling, short declarative sentences, restraint over melodrama.
2. **Content stays in JSON.** Do not move story text into TypeScript.
3. **Every schema change is backward compatible** until the data is migrated in the same PR. Never leave the game in a state where old JSON breaks the engine.
4. **No new runtime code dependencies.** Dev dependencies allowed: `@playwright/test`, `sharp`, `vitest`. Font packages from `@fontsource/*` are allowed because they are assets (file 04). Audio is synthesised with the Web Audio API (file 05), so no audio library.
5. **Do not break saves silently.** Bump `GameState.version` and migrate (B23).
6. **Accessibility is part of done.** Visible focus, keyboard reachability, `prefers-reduced-motion`, contrast ≥ 4.5:1 for text.
7. **When a file says "AUTHOR DECISION"**, a recommended default is given. Implement the default. List every default you used in the PR description so the author can overrule it.
8. **You cannot generate images.** File 06 section B is for the author. Wire everything so new files drop in without code changes.

## 5. Shared vocabulary

These names are used across all files. They are defined in file 01, section 0.

| Name | Meaning |
|---|---|
| `Condition` | One object shape for every "is this allowed/shown" test (flags, items, class, relationship, faction, stats, visited, curse) |
| `RichText` | A string, or a list of paragraph blocks, each optionally guarded by a `Condition` |
| Tokens | `[missing person]`, `[player]`, `[relationship]` inside any text |
| `when` | Per-scene time of day and optional day anchor |
| `route` | A scene that is never shown and only redirects |
| `visited` / `taken` | Per-save records of scenes entered and choices made |
| Resolve | The player-facing name for the `health` resource after G9 |
| The Dimming | The player-facing name for `world.curse_spread` after G8 |

## 6. Definition of done for every PR

- `npm run build` passes with no TypeScript errors.
- `npm run validate` (added in B21) reports zero errors.
- `npm run test:e2e` (added in B21) passes: four scripted playthroughs reach four different endings with no console errors.
- No text on screen shows a raw ID (`ruins_outskirts`), a placeholder (`[missing person]`), a stage direction ("if she came with you") or a literal asterisk.
- Works at 390×844, 1280×720 and 2560×1440.
- Keyboard-only play is possible from title to ending.

## 7. Canon decided for this work

These settle contradictions found in the script. File 02 lists the exact lines to change.

- **Arrival:** the barge docks at nightfall on Day 1, not before dawn.
- **Curse timeline:** the seal began to fail 20 years ago (Seriva). It failed fully 3 years ago and the eastern villages felt it then. Crestfall has felt it for 2 years.
- **Maret** came to Crestfall 3 years ago. **Pol** left the Covenant 15 years ago and has been at the camp for 3.
- **The Compact:** Cael's detachment arrived 8 months ago. Vorne arrives with 30 soldiers on Day 4, hours after the player leaves town.
- **The missing person** arrived 14 months ago, spent one week in town and two at the camp, then went east. They have not left the ruins since.
- **Day count on the main path:** Day 1 arrive. Day 2 town and camp. Day 3 letter, market, inn. Day 4 leave, reach Harrow. Day 5 forest edge, ruins, reunion. Day 6 chamber. Day 7 news, return to Crestfall. Day 8–9 Vorne, Issa, fragment, back to ruins. Day 10–11 preparation. Day 12 ritual. Day 13 walk back. Day 15 reckoning. Day 16 final choice. Day 17, 20, 30, 45 Act 3.
