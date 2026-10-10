# Progress

One step per branch and pull request. Each tick lists what was done, what was skipped, the AUTHOR DECISION defaults used, and where the plan turned out to be wrong.

- [x] 1. docs/01 Section 0 (engine foundation), then B1, B2, B3, B4, B5
- [x] 2. docs/01 B6 to B13
- [x] 3. docs/01 B21 (validator and smoke test), then B14 to B20
- [ ] 4. docs/04 Design tokens, then U1 to U7
- [ ] 5. docs/03 G1 to G6
- [ ] 6. docs/03 G7 to G13
- [ ] 7. docs/02 Section 0 (author decisions), then N1 to N4
- [ ] 8. docs/02 N5 to N8
- [ ] 9. docs/02 N9 to N18
- [ ] 10. docs/04 U8 to U20
- [ ] 11. docs/05 E1 to E10
- [ ] 12. docs/01 B22, B23. docs/03 G14, G15

---

## Step 1 — engine foundation, B1–B5

Branch `step-1-engine-foundation`.

**Done**

- Normalised every story JSON file to two-space indent in its own commit, so later content diffs are readable. No content change.
- Added `.gitattributes` to keep LF endings.
- Section 0: `Condition` (`ChoiceRequires` kept as an alias), `src/conditions.ts` with `meets()`, `RichText` and tokens in `src/text.ts`, `Inline` for `*emphasis*` in `src/components/Inline.tsx`. `dangerouslySetInnerHTML` is gone.
- Scene and choice additions in `types.ts` (`when`, `text_mode`, `route`, `ending`, `rest`, `objective`, `once`, `locked_hint`). State is `version: 2` with `visited`, `taken` and `ended`.
- `enterScene` and `resumeScene` in `App.tsx`. Continue no longer re-runs entry effects.
- `applyWhen` added to `gameState.ts` (section 0.5 calls it). No scene has `when` yet, so it does nothing until step 2.
- B1: `sceneText()` shows the main text with the class passage as an aside block. 38 class passages marked `text_mode: replace`.
- B2: the router is a `route` scene. All five endings have an `ending` field and distinct titles.
- B3: Return to Title saves and keeps the save. New Game confirms inline before replacing a save. Back on creation step 1 returns to the title.
- B4/B5: `ended` phase and `EndScreen` (eyebrow, title, closing text, "Your road here", endings found, Play again, Title). Meta store `ashenveld_meta`. Continue on an ended save opens the end screen; the title says "View ending".
- `data-scene-id`, `data-choice-id` and `data-dice-continue` hooks for the e2e test in step 3.

**Checked**

- `npm run build` passes. `validate` and `test:e2e` don't exist yet (step 3).
- Scripted playthroughs (local Playwright driver, not committed) reach an ending with no console errors. Final choice 0 → `ending_stays_together`, 1 → `ending_escape_together`, 3 → `ending_alone_legend`.

**Skipped or deferred**

- `once` hiding is wired in `SceneView` now because it's one line on top of `taken`. B12 adds the data that uses it.
- Old minute-based time (`advanceTime`, `time_advance`) still runs. B8 in step 2 removes it.
- Seeding NPC closeness at creation is still there. B19 (step 3) removes it.
- Code commits are coarser than ideal: the engine, B1 rendering and the B3–B5 flow all touch `App.tsx`, so they went in as one compiling commit.

**B1 step 5: asides that repeat or contradict the main text**

Checked by script for shared runs of words between each `append`-mode aside and its main text. No aside shares a five-word run with its main text. Every five-word overlap found was in one of the 38 passages already marked `replace`, which matches the plan's list. Four-word overlaps are incidental phrases ("she looks at you", "on the other side").

Small repeats and contradictions spotted while checking, all covered later in the plan:
- `act1_ch6_missing_person_campsite`: the ranger aside says "Three to five days old", which matches the default but not the 14-month canon. N9 changes all three.
- `act1_ch7_decision_enter`: the cipher aside repeats the default's "what you have built in three days". Minor; left for the N1 aside pass.
- `act3_ch1_new_ashenveld` (ranger) and others say "your missing person". N1 token pass.

**Plan was wrong or unclear**

- Final choice 2 (sent ahead) also reaches `ending_escape_together`, because nothing on the always-first-choice path sets `player_stays_permanently`. The B21 e2e test asks for four different endings from the four final choices. Step 3 needs a choice on the sent-ahead path that sets it, or a different ending for one of the four tests.
- `master_scene_index.json` says `total_scenes: 116`. There are 108.

## Step 2 — B6 to B13

Branch `step-2-engine-bugs`, stacked on step 1.

**Done**

- B6: the 11 health changes moved from `state_changes.player.resources` to `state_changes.resources`. Gold clamps at 0, health floors at 1 until G9. `min_gold` added to `Condition`.
- B7: `world.curse_spread` in `state_changes` is a delta, clamped 0..100. Documented in `types.ts`.
- B8: minute clock deleted (`advanceTime`, `TIME_LABELS`, `_time_minutes`, `time_advance`). Every scene has `when` from the time table, with the location changes. The listed `world.day` values, `act` and `chapter` values are gone. Day anchors of 15 and up live in `when.day`. The two skip-day outcomes and the double sleep are fixed. Header reads "Act II · Chapter 3" and "Day 7 · Evening"; `hide_clock` hides the clock in the header and sidebar. `applyWhen` has vitest cases (`npm test`).
- B9: covered by `resumeScene` from step 1.
- B10: merged location and NPC tables in `loader.ts` (`getLocation`, `getNpc`, `getAllNpcs`, `locationName`). The four new places are in the metas.
- B11: `success_at_cost` added to `ask_about_the_cost_to_them` (reusing the success's first two paragraphs). Dice Continue falls back to the nearest outcome.
- B12: `act1_ch3_camp_second_try` added and registered. Camp hub choices are `once`. The lesson in the ruins leads to the checkpoint with `returned_to_crestfall` and `stayed_for_lesson`.
- B13: `relationships.missing_person` renamed to `the_missing_person`.

**Checked**

- `npm run build` and `npm test` pass.
- Scripted run as Commander: the day never goes down, the ritual is on Day 12, the final choice on Day 16, Act 3 on Days 17, 20, 30, 45.

**Skipped or deferred**

- The validator rules from B6, B11 and B13 arrive with the validator in step 3.
- `time_of_day` values on outcomes stay and now pass through `applyWhen`, as the plan says.

**Plan was wrong or unclear**

- Old saves stored `time_of_day` as "05:35 — dawn". `loadGame` maps those to a day part now so a pre-step-2 save doesn't show a broken clock. The full migration is still B23.
- Python on Windows wrote CRLF into a few source files mid-step. Stripped before committing; `.gitattributes` keeps the repo LF either way.

## Step 3 — B21, then B14 to B20

Branch `step-3-validator`, stacked on step 2.

**Done**

- B21 validator: `tools/validate-content.mjs`, `npm run validate`. All 11 error rules and the warnings. Long warning lists go to `tools/out/` (ignored by git). It also prints how many flags are read. Runs in `deploy.yml` before the build, with `npm test`.
- B21 smoke test: `tests/playthrough.spec.ts` with `@playwright/test`, `npm run test:e2e`. Four playthroughs (one per class, dice stubbed at 0.95 or 0.02) reach four different endings; the save test reloads three times and checks scene, day, time, gold, health and inventory, then Return to Title. A new `Checks` workflow runs validate, unit, build and e2e on pull requests.
- B14: Goran and the fire are linked in. `cross_file_routes` is rebuilt from the data.
- B15: departure hub with two `once` visits and "Take the east road." Opening text is guarded with a fallback. `act1_ch6_visit_maret_departure` deleted.
- B16: the summary waits for **Enter Ashenveld**, has a Back link, shows the stored gender, and says nightfall.
- B17: Rest is `aria-disabled` with "You cannot rest here."
- B18: `consumed_on` is applied after every state change. All ten items have a `name`, shown in Items. The fragment is consumed on a shared `ritual_done` flag, set on all three sealing outcomes.
- B19: no seeding at creation. A relationship starts from the NPC's `initial_closeness` when a scene first changes it.
- B20: the four text slips. The two asterisk items are handled by `Inline` since step 1.

**Validator now**: 0 errors, 23 warnings. 198 flags set, 24 read.

**Skipped or deferred**

- The 390×844 test is written but marked `fixme`. The shell is a fixed 1100×660 box until U1 (step 4), so it can't pass yet.
- The e2e check for "if she came with you" is behind `STAGE_DIRECTIONS_FIXED = false`. That line is still in `act2_ch3_crestfall_news` until N7 (step 7). Raw `[missing person]` and `[player]` are checked now.
- The e2e test runs against the Vite dev server, not `vite preview`. The built `dist/` has no `resources/` folder until B22 (step 12) moves it into `public/`. Switch it to `vite preview` then.

**Plan was wrong or unclear**

- Byte-identical images (rule 8): files 010 and 019 are copies of 009 and 018, and the art is on hold, so the rule would fail today. Those two pairs are listed in the validator as known and only warn. Any other duplicate fails.
- B21 asks for four different endings from the four final choices with "always the first choice". The sent-ahead path then reaches `ending_escape_together`, the same as leaving together. The Ranger test names two choices (`choose_rootless_side` at the reckoning, `realise_you_are_staying` later) and reaches `ending_warden_of_ashenveld`.
