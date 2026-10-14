# Progress

One step per branch and pull request. Each tick lists what was done, what was skipped, the AUTHOR DECISION defaults used, and where the plan turned out to be wrong.

- [x] 1. docs/01 Section 0 (engine foundation), then B1, B2, B3, B4, B5
- [x] 2. docs/01 B6 to B13
- [x] 3. docs/01 B21 (validator and smoke test), then B14 to B20
- [x] 4. docs/04 Design tokens, then U1 to U7
- [x] 5. docs/03 G1 to G6
- [x] 6. docs/03 G7 to G13
- [x] 7. docs/02 Section 0 (author decisions), then N1 to N4
- [x] 8. docs/02 N5 to N8
- [x] 9. docs/02 N9 to N18
- [x] 10. docs/04 U8 to U20
- [x] 11. docs/05 E1 to E10
- [x] 12. docs/01 B22, B23. docs/03 G14, G15

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

## Step 4 — design tokens, U1 to U7

Branch `step-4-ui-foundation`, stacked on step 3.

**Done**

- Tokens: palette fixes so all text passes 4.5:1, `--text-faint`, type and layout variables, `:focus-visible`. Every font size under 12px raised. `100vh` is `100dvh`. Fonts self-hosted with `@fontsource` (Cinzel, Atkinson Hyperlegible, Lora on demand); the Google Fonts link is gone.
- U1: fluid three-column grid on wide screens, two columns with `StatusStrip` and `TabBar` from 1023px down, one column with an art banner under 720px (18dvh while an outcome shows). Story text caps at 66ch. A shared `Panel` gives every drawer the same width and a full-screen sheet on phones. Title size clamps. `#root` uses one rule and the class hack is gone. Scanlines are limited to the art area until E5.
- U2: the scene text collapses under an outcome with "Show the scene again", the story scrolls to the top, focus moves to the outcome, `aria-live="polite"`.
- U3: header trail, choice numbers and dice labels at 13px; loading text 14px; low-contrast creation pills, dice button and disabled Next fixed. New e2e test `tests/contrast.spec.ts` walks every text node on the title, creation, game, dice and outcome screens.
- U4: `src/settings.ts`, `SettingsProvider`, `Settings` panel (Reading, Motion, Play) from the title and the menu.
- U5: Journal tabs Now, What you know, Story so far. Objectives on every chapter file and per path in Act 3. `resources/notes.json` with 44 notes and 5 leads. Entries store ids only; the text is rebuilt from scene data. A dot shows when something is new.
- U6: `useHotkeys` (1–6, Enter, Space, J, I, M, P, R, Esc, ?), a Keys panel, panels as focus-trapped dialogs, focus to the scene title on a new scene, creation cards as radios, `aria-label` on icon buttons. An e2e test plays in by keyboard.
- U7: `diffState()` with chips under outcomes, toasts for entry changes (setting to turn off), a 600ms highlight on the bar that moved. Tier helpers live in a new `src/rules.ts`.

**Checks**: build, validate (0 errors), unit 7 passed, e2e 9 passed. Screenshots checked at 390×844, 800×1000, 1280×720 and 2560×1440.

**Skipped or deferred**

- Sound settings (volume, ambience) are in the `Settings` type but have no controls until E3, so nothing in the panel does nothing. Same for the odds setting until G4.
- The E1 reduced-motion CSS rule went in now, because the Movement setting would otherwise be a dead control.
- The status strip says "Health" until G9 renames it Resolve, and has no Dimming word until G8.
- Rest is still disabled (B17) until G9.
- The full creation rework (two-column cards, More toggle, real `<ol>` progress) is U13 in step 10. The cards are radios now so keyboard play works.

**Plan was wrong or unclear**

- U2 asks for the collapsed scene at 60% opacity. At 60% the class aside's `--text-main` drops to about 3.5:1, which breaks ground rule 6. It's 75%.
- U7's table only names reputation changes that cross a tier, so smaller reputation changes still have no chip. The bar highlight covers them.
- `npm run validate` counts flags read by the journal. That took the count from 24 to 69. It's honest, since the journal does read them, but it means the N6 target of 60 is already met on paper.
- The plan puts `notes.json` in `public/resources/`. Resources don't move to `public/` until B22, so it's in `resources/` for now.

## Step 5 — G1 to G6

Branch `step-5-mechanics`, stacked on step 4.

**Done**

- G1 engine: `Roll.stat` can be a list (best of), `Roll.bonus` with labels, capped at ±6 (`RULES.maxBonus`). `resolveRoll`, `odds`, `targets` in `dice.ts`.
- G1b: the three ritual scenes reworked as specified. The engagement is three approaches (Stamina, Mana, Charisma) with shared bonuses; a full success sets `ritual_phase2_clean`.
- G1c: bonuses on 15 rolls. Every roll with Vorne also reads the Compact tier (G5). `seriva_has_initiative` and `seriva_left_hostile` are set.
- G1d: failure costs on the compact offer (back to the offer, once), the market woman, the deer, the cellar copy, the checkpoint. The forest-edge roll is gone, with a new "watch who is following" choice setting `saw_maret_at_line`.
- G2: modifier table in `rules.ts`; ten new Strength, Dexterity and Mana checks with three outcomes each; three G2c stat choices plus twelve more two-stat rolls.
- G3: the six reward changes.
- G4: tags read "Charisma · Favoured" (or a percentage, by setting). Hover, focus or long-press shows the three chances and the bonuses. The dice panel shows the targets, the die, the modifier and each bonus. "No roll" is gone.
- G5: tier helpers; the checkpoint wave-through and the paid sergeant; Vorne's alliance hidden when the Compact is wary; Seriva's cost question hidden when the Covenant is wary; Edric's extra question at Covenant 15+; Maret joins only at closeness 30+; Lira 40 raises the map bonus to +3; Branch 25 and Maret 60 bonuses; the fragment required for the ritual and granted the night before; the cloth at the reunion; grain, fish and a runner to spend coin on. Class abilities: Command (Commander), ground marks (Ranger), the Read (Cipher, one line per NPC in the metas). Edric's ward halves Resolve lost in the deep forest.
- G6: `counters`, `min_counter`, `max_counter`, `min_gold`. `scene.requires` is checked on entry and logs a console error. It caught a real bug straight away: staying after sending them ahead didn't set `player_stays_ashenveld`.
- Unit tests for the modifier table and the odds the plan quotes (`npm test`, 12 passing).

**AUTHOR DECISION defaults used**: none in this file. New prose was written for the ten G2b checks, the watch-who-follows choice, Edric's extra answer, the checkpoint options, the cloth, the market purchases, and the sixteen Cipher reads. All of it is in the JSON and open to rewrite.

**Skipped or deferred**

- Bonuses that need flags from later steps: `knows_seriva_came_early` and `compact_message_undelivered` (N5, step 8), and `confronted_being_used` (N2, step 7). They go in with the content that sets those flags. The validator would otherwise fail on a bonus reading a flag nothing sets.
- The waystation Dexterity check (G2b) waits for the waystation scene (N5).
- Arcane's Residue is the exact Dimming number, which needs G8 (step 6).
- Aldous at 30 (free room), the rest places and provisions are G9 (step 6). Sen at 15 and Cael's forty are N5. Maret's list at Rootless 40 is N3.
- Rootless allied "skip the exposure on the deer roll" is a +3 bonus labelled "Branch walked the first mile with you" rather than a skipped cost.
- Locked choices are still hidden. `locked_hint` is in the data now and G12 (step 6) shows them.

**Plan was wrong or unclear**

- G2b's target (no stat over 35% of rolls, none under 8%) isn't met. Weighted by stat: Charisma 42%, Intelligence 20.5%, Perception 13%, Mana 8.5%, Stamina 6.3%, Dexterity 5.1%, Strength 4.5%. It was 47% Charisma before. Getting further needs new scenes, not more stretching of existing Charisma moments.
- G2b's Mana check at the marker stone and N13's Arcane-only choice use the same wording. The Mana check is in; N13 will need a different line for the Arcane.
- G1c lists no labels for its bonuses. I wrote short ones in the player's terms ("Corvin told you she sent them east").
- G1d says the road traveller already gives nothing on a failure. True, so nothing changed there.
- The three engagement approaches reuse the old outcome text, which is written for holding steady. The story pass should give the Mana and Charisma approaches their own lines.

## Step 6 — G7 to G13

Branch `step-6-systems`, stacked on step 5.

**Done**

- G7.1: Day 2 offers the gate or the shrine; either leads to the camp through a route scene `act1_ch3_after_faction`. Whichever faction you skipped asks for you on Day 3 in `act1_ch5_faction_responses` and hands you back to the evening. The camp-rumour text only describes factions you've met.
- G7.4: `show_cellar_carvings` in `act2_ch1_what_they_found` leads to a new `act2_ch2_hidden_passage` (bone-figure marks, Joren's name for anyone who counts them), rejoining at the chamber entrance.
- G7 single-choice scenes: eight Act 1 and 2 scenes have a real second option (see the commit). G7.2, 7.3, 7.5–7.7 were already wired by earlier steps.
- G8: The Dimming. Starts at 15, +1 per new day in Act 1, +3 per skipped day, Act 2 positive values ×0.75 (43 values), five slow choices +2. A full seal caps it at 45; a partial one at 60, with a floor of 30 and +1 per Act 3 scene. Bands Clear/Thin/Dim/Grey/Still in the sidebar and status strip, the number and last change for the Arcane, a band-change chip. Grey caps Resolve at 80. Thin, Dim and Grey each change a Crestfall scene; Dim costs −1 on three town Charisma rolls. Reaching 100 before the seal changes the reception scene and adds a paragraph to every ending.
- G9: Resolve. Rest at the Tallow (3 coin, free at Aldous 30), the camp (Rootless 15+), the shrine (Covenant 15+) and the two ruins-camp scenes: +30 Resolve, next morning, Dimming +2 in Acts 1–2, with a confirm. "Eat" with provisions anywhere: +20, item used. Resolve ≤40 gives −2 on Stamina and Mana rolls, applied by the engine. Resolve 0 enters `act{n}_collapse`: wake where you last rested a day later, Dimming +5, Resolve 40, one line from whoever is there, then on to the scene you were heading for. `GameOver` is deleted.
- G10: the three Act 3 rebuilding rolls read the settlement and alignments; a fragile settlement breaks in `act3_ch3_the_long_work`, party chosen by lowest reputation (new `lowest_faction` condition).
- G11: the camp hub has three activities, two per visit, then only "The light is going. Find Maret."
- G12: locked choices with a hint show as disabled rows (two at most, class first). Hints added to item, coin and trust gates.
- G13: chapter checkpoints (last three) and a menu option to go back to the start of the chapter; an Endings gallery on the title; seen scenes skip the fade, say "seen before", and a menu switch opens them folded at the choices.
- Engine: `when.part` can be a list of day parts.
- Tests: unit 18 passed; e2e 11 passed, with new rest and collapse tests.

**AUTHOR DECISION defaults used**: none from the plan. New prose: the Day 3 faction prompts, the hidden passage scene, eight second options, the midwife, the Dimming lines, the three collapse scenes, the settlement breaks. All in the JSON.

**Skipped or deferred**

- Act 3's single-choice scenes keep one choice until N11 gives each path its conflict, so they aren't written twice.
- The ritual approach and sealing stay single-choice along with the line, the aftermath and the endings. They're the held-breath moments.
- E4 (the curse on screen) is step 11.

**Plan was wrong or unclear**

- G8 says the Dimming reaches about 80 at the sealing. Measured on the main path it's 92, so the "Dimming is close" penalty (−2 at 90+) applies on every run. The knobs are in `src/rules.ts` (`DIMMING.perSkippedDay` and the Act 2 scaling); I left the plan's numbers in so you can decide.
- G7.1's Day 3 detour would have pushed the clock to the next morning, because the faction scenes are set in the morning. `when.part` now accepts a list, and those scenes allow morning or afternoon.
- G9 says "return to the scene you were in" after a collapse. That scene's choices may already be used up, so the collapse carries on to the scene the failed choice was leading to.
- G9's ritual-sealing "worn thin" bonus would have doubled the engine's general −2, so the data one is gone.
- G13's "Skip to the next choice I have not made" is read as: seen scenes open folded at the choices. It doesn't auto-play choices.

## Step 7 — author decisions, N1 to N4

Branch `step-7-story-names-stakes`, stacked on step 6.

**AUTHOR DECISION defaults used** (docs/02 section 0, all as written in the plan)

- D1, why you left: Crestfall was making you quiet and there was no event to point at. Stated to Maret in `act1_ch4_maret_evening`, echoed after Lira's speech.
- D2, Maret's arrangement: one memory to the tree line each new moon; a list of thirty-eight, "my daughter's voice" first. Shown in `act1_ch4_maret_letter_success`, paid off at the forest edge, the camp garden and after the seal.
- D3, what they wanted: they told you to go home, and they needed you. The cloth, the cairn, "I told you not to", and the new reunion choice.
- D4, what the mechanism shows: one fact per relationship from the N1 table, in the chamber and in what you tell them after.
- D5, the Watcher is Joren of Harrow: named in `act3_ch4_resolution_alone` and in the hidden passage (step 6). The rest of the Joren thread is N5.
- D6, what Sen saw: not used yet. It's N5 (step 8).

**Done**

- `tools/prose-stats.mjs` (`npm run prose`), brought forward from N10 so story PRs can report numbers.
- N1 step 1: 164 texts now use `[missing person]`. No paragraph uses the name more than twice. The validator's "your missing person" warning is at zero.
- N1 step 2: `[player]` in the five places the name is spoken or written (the letter, the Watcher, the reunion, the chamber, Goran). The Watcher only repeats it on the return if `watcher_spoke`.
- N1 step 3: the campsite fire ring is "a habit the two of you shared" except for a childhood friend or mentor. Creation preview reads "raised you" for a parent and "taught you everything you were good at" for a mentor. People shows "Your sibling" and so on. Role is "The one you came back for".
- N1 step 4: six relationship variants in ten of the eleven places (the letter in `maret_letter_success` is N15, step 9).
- N1 step 5: all 38 `replace` passages rewritten as asides; `text_mode` is gone from the data. The engine still supports it.
- N2: the cloth, the cairn, "I told you not to", the third reunion choice `name_what_they_did` (written without the Cipher aside's "Both" wording), the consequence paragraph and bonus in the ritual, the missing success-at-cost, and "You never did say whether you forgave me."
- N3: everything in the table. `seen_marets_list` is set when she shows you the list; the new Act 2 choice needs it (or Rootless 40+, the G5 trusted tier).
- N4: guarded partial-seal text in the ten listed places and a "who watches the seal" paragraph in all five endings.

**Prose stats** (`npm run prose`, before → after this step)

| Pattern | Before | After |
|---|---|---|
| specific / specifically | 253 | 239 |
| the specific quality of | 37 | 37 |
| of someone who | 88 | 78 |
| Not a question / accusing / unkind | 17 | 15 |
| You note / You file (outside Cipher) | 30 | 29 |
| em dashes | 894 | 851 |
| "You read" paragraphs, Ranger / Cipher | 20 / 10 | 21 / 10 |
| contractions | 43 | 28 |
| for a long moment / time | 45 | 43 |
| "your missing person" | 177 | 0 |

The big habit counts are N10 (step 9). Contractions fell because the retold dialogue ("Didn't think you'd come back") was cut from the asides; N10 adds them back by voice.

**Skipped or deferred**

- The letter itself (N15) and the story bible (N9) are step 9.
- The e2e check for "if she came with you" is still parked; that line goes in N7 (step 8).

**Plan was wrong or unclear**

- N2.2 says to add the "fresh scratches" line before the inscription. The paragraph before the inscription is the one that introduces the scratches, so the line sits just after it instead.
- Three lines that break the fiction aren't in N12's table: "The point of no return is coming." (`act2_ch8_faction_reckoning`), "This is the Rootless ending." (`ending_warden_of_ashenveld`) and "The ending is the loneliest one." (`ending_the_account`). I'll take them out with N12 in step 9.
- With the asides showing everywhere, one aside label failed contrast in the folded scene; fixed with a brighter colour while folded.

## Step 8 — N5 to N8

Branch `step-8-threads-companion`, stacked on step 7.

**AUTHOR DECISION defaults used**: D5 (the Watcher is Joren) and D6 (Sen saw Seriva put ashore three weeks early), as written in docs/02 section 0.

**Done**

- N5, the packet: route scene `act1_ch6_waystation_route` after the marker, and `act1_ch6_waystation` with Sera. Hand over (+20 coin, Compact +5, the lost patrol), open first on Dexterity 12 (`knows_vorne_is_coming`, `compact_message_read`; a failure tears the seal, Compact −10, no pay), or keep walking (`compact_message_undelivered`). The checkpoint's invoke choice needs the packet delivered; an undelivered packet is −2 at the checkpoint; a soldier mentions Cael asking. The journal lead for it is in.
- N5, the ward: Seriva recognises it.
- N5, the bone figure and Joren: the cellar wall figures, a new Watcher choice (`watcher_holds_figure`), the return scene, and the Joren lines on all four Act 3 paths.
- N5, Sen and the river: `act2_ch3_sen_river` from week two at Sen 15+, `knows_seriva_came_early`, a new Seriva question that opens the accusation, and the deferred +2 bonus. Cael pays the forty if you report to him.
- N5, cuts: five NPC secrets marked `secret_unused: true` in the act 1 meta (Aldous, Corvin, Hanna, Wren, Lira).
- N6: all sixteen lines. Maret hands the letter over at the forest edge if she kept it, and both forest-edge outcomes set `maret_letter_obtained`.
- N7: all eleven. `STAGE_DIRECTIONS_FIXED` is on in the e2e test again.
- N8: all nine places. The three `maret_note` keys are gone.

**Validator now**: 0 errors, 5 warnings. 116 scenes, 224 flags set, 123 read (N6 asks for 60). Without the journal's notes the count is 79.

**Prose stats** after this step: specific 236, the specific quality of 37, of someone who 78, em dashes 842, contractions 42, for a long moment / time 40.

**Skipped or deferred**

- Branch and the record is N13 (step 9).
- The two remaining validator phrase warnings: one is dialogue ("Go back to Crestfall if you have sense"), the other two are N12's "the reader" lines.

**Plan was wrong or unclear**

- N5 says the waystation's "open it first" success lets you "then deliver or keep it". It returns to the waystation with the open choice used, so both are still there.
- N5's Act 3 line for the Watcher's name says you "say it to him". On the paths where you leave Ashenveld you aren't near the gate in Act 3, so the line is a memory of the last day in the ruins, on all four paths.
- N6 asks Maret to grant `maret_letter_obtained` from text, which text can't do. Both outcomes of the forest-edge scene set it instead.
- N7's three-sentence kit (herbs, ward, nothing) has to be three paragraphs, because guarded parts are joined as paragraphs.
- I cut six "for a long time"s that had crept into my own new lines.

## Step 9 — N9 to N18

Branch `step-9-voice-endings`, stacked on step 8.

**AUTHOR DECISION defaults used**
- N17: kept the gender step, added Neither, and used the answer through a `[sir/ma'am]` token (ma'am, sir, traveller) in five lines from Cael, Sera and the soldiers. The script-wide pronoun conversion for [missing person] is **not** done: the plan says only if you confirm, so "they" stays throughout.

**Done**

- N9: the timeline table, plus `docs/story-bible.md` (canon timeline, the six relationships, D1–D6, a paragraph per person, voices in brief) and the README's dates. The "just be in this room with you" line moves into `keep_some_things`; the road-west callback is guarded on having taken it.
- N10: `tools/prose-stats.mjs` (from step 7). A scripted pass for filler "specific" and spaced em dashes in narration (speech left alone, no sentence left ending on "was" or "the"), then hand edits for "of someone who", "You note / You file", the "Not unkind." tags, the "You read" openers, and contractions for attributed lines from Aldous, Lira, the soldiers and others.
- N11: a live problem on each Act 3 path, with flags the endings read. Stayed: the returned at the gate (Wren on Day 30). Left: the pull east and the choice to turn back. Sent ahead: the letters stop. Alone: Joren wakes and asks about Harrow; Maret offers her list. The rebuilding choices move to `act3_ch2_rebuilding_work` so the returned can frame them.
- N12: fiction breaks gone, including three the table missed; `act1_ch7_act1_end` removed and its text moved into stepping over the line; six titles renamed.
- N13: four class choices replace the stub, each read once later; twelve class-only choices; one class option per class on each Act 3 path.
- N14: Edric at Seriva's meeting, the number for Crestfall (a fifth), the map room, keeping the seal, and a line in every ending.
- N15: both letters shown as letter blocks. U14's paragraph kinds (letter, inscription, speech) brought forward from step 10 to render them.
- N16: `act3_branches` lists the five real endings; unwritten ones are marked `folded_into`; the guarded closing paragraphs; Goran's recommendation guarded.
- N17: see above.
- N18: player-facing roles for all sixteen people, one plain line for each item, README classes and endings.

**Prose stats** (`npm run prose`), plan target in brackets

| Pattern | Start of step 7 | Now |
|---|---|---|
| specific / specifically (≤25) | 253 | 24 |
| the specific quality of (≤3) | 37 | 0 |
| of someone who (≤15) | 88 | 14 |
| Not a question / accusing / unkind (≤6) | 17 | 0 |
| You note / You file outside Cipher (≤6) | 30 | 1 |
| em dashes (halve) | 894 | 112 |
| "You read" paragraphs, Ranger / Cipher (≤5 each) | 20 / 10 | 5 / 5 |
| contractions | 43 | 63 |
| for a long moment / time | 45 | 37 |

**Checks**: validate 0 errors (4 warnings), unit 24 passed, e2e 11 passed.

**Skipped or deferred**

- The contractions pass only touched speech it could attribute with confidence, so it reached 16 lines. Issa's lines have little to contract. A read-through by voice would find more.
- Act 3's chapter 1 scenes keep a single choice.
- The words-per-scene list in prose-stats counts every guarded variant, so relationship-heavy scenes look longer than any one player reads. G15 (step 12) handles pacing.

**Plan was wrong or unclear**

- N14 has "Say the number aloud" gated on knowing that cleansing kills, but the player doesn't know a number yet at that point. The choice asks Seriva for it in front of Edric instead.
- N13's Arcane "Feel what the stone does" duplicated G2b's Mana check, and "Listen to the thread" duplicated another. The Arcane versions are worded differently ("Kneel, and listen for where the stone wants to go", "Listen to the thread from where you stand").
- The sent-ahead player who leaves never got `player_leaves_ashenveld`, which the road scenes require. Now set on leaving.
- A step 7 edit produced "a habit, a habit the two of you shared" at the campsite. Fixed.
- The "of someone who" edits left two sentences spliced without a full stop (ritual preparation, return to the ruins). Found on a read-through and fixed.

## Step 10 — U8 to U20

Branch `step-10-ui-polish`, stacked on step 9. U14 was done in step 9 for the letters.

**AUTHOR DECISION defaults used**: none came up in this step.

**Done**

- U8: each faction shows its tier word and a five-step track; hover or focus says what the tier means now, from the G5 table. `repPercent` and its ±40 scale are gone.
- U9: "Day 7" over "Evening", with six day-part glyphs.
- U10: visited comes from `state.visited` (scene → location, loaded when the panel opens), `east_road_return` draws as East Road, Marker Line removed, Mill Lane, Gate Stones and West Road added, Inner Approach and Source Chamber moved apart, labels alternate. Visited places show in full, neighbours as unnamed rings, the rest hidden; region labels appear with their first place. A card shows description, the ambient line for the time of day, and people met there. The route is drawn through visited places in journal order. On a phone the map pans and opens centred on you.
- U11: monogram tile, faction mark, role, closeness tier on a five-step track, "Last seen: The Tallow Inn, Day 7", the Cipher's read. [missing person] first, then by most recent change. To make "last seen" and the sort possible, a closeness change now stamps `{ day, location, at }` on the relationship (unit test added). The panel's own tier list ("Distant", "Unknown") is replaced by `closenessTier`.
- U12: the tooltip text from the table, full name and modifier ("Mana · 16 · +5"), opening towards the story. The sidebar no longer clips them on normal heights; under 700px tall it scrolls again.
- U13: tighter header, one column under 720px, descriptions behind "More about each class" under 800px tall, arrow keys move and choose, the chosen class shows all seven stats with modifiers and the good-at line, no silhouette, names 2–24 with `[ ] < > *` blocked, progress is an `<ol>` with `aria-current`.
- U15: outcome text in the body colour, a tag ("Charisma · Failed") with a coloured dot, the left rule in the result colour. Unrolled outcomes have no tag.
- U16: menu order as listed, with a saved line and Save now, endings found n of 5, and Credits.
- U17: loading screen, two retries per fetch, the error screen, and an error boundary.
- U18: the `index.html` tags, `favicon.svg`, `npm run og` (Playwright screenshot of the title screen to `public/og.jpg`), alt text on the scene art, and a `nav` round the sidebar's panel buttons.
- U19: save summary under Continue, Credits, the time line, the content note.
- U20: 1–6 keycaps, pressed state, 8px gap, tags wrap under the label on a phone.
- A.7 (no images needed): the three faction marks, used in the sidebar and People.
- Also fixed: the sidebar's People and Items buttons had accessible names ("Relationships", "Inventory") that didn't match their labels.
- e2e test for the map and People.

**Checks**: validate 0 errors (4 warnings), unit 25 passed, e2e 12 passed.

**Skipped or deferred**

- U16: Export and Import save come with B23 in step 12.
- U18: alt text comes from each place's description until the art manifest (A13) exists.
- U13: the cards stay `div role="radio"` with arrow keys rather than becoming `<button>`s; a button can't hold the block content they have.
- A.7's illustrated map (river, tree line, hand-drawn strokes, Lira's marks) isn't done. U10 didn't need it and it's art direction more than layout.
- U20: "speech keeps its quotation marks, actions get none" is a content rule; the choice labels weren't audited for it.

**Plan was wrong or unclear**

- U10 puts West Road at x 20, which the old viewBox cut off. The viewBox starts at −30.
- U12 says the stat tooltip overflowed the shell. The real cause was the sidebar's `overflow-y: auto`, which also clipped anything opening sideways.
- The contrast test couldn't read `color-mix()` (browsers report it as `color(srgb …)`), so the step 9 narration colour is a plain rgba now.

## Step 11 — E1 to E10

Branch `step-11-effects`, stacked on step 10.

**AUTHOR DECISION defaults used**: none came up in this step.

**Done**

- E1: was already in from step 4 (the `data-motion` rule, the Motion setting). Checked every new effect against it. The chapter title and day stamp were vanishing instantly with motion off; they now show still and a timer removes them.
- E2: opaque dice surface; 700ms roll that slows at the end, 150ms land with a 4% overshoot, 300ms of chips, then verdict and Continue (focused). Click, Space or Enter skips. One `aria-live` sentence. Face ticks and verdict sounds.
- E3: `src/audio/` (engine, beds, interface sounds, cues), all Web Audio, no files. Six beds, the note, birds after the seal, six cues, seven interface sounds. `ambience` on every location. Volume, ambience and mute in Settings, and a mute button in the sidebar and status strip. Nothing plays before Begin or Continue; the context suspends when the tab is hidden. Checked in a browser: no context before the click, running after, mute instant.
- E4: `--dim` and `--deep` on the shell; the art desaturates, darkens and vignettes; 4s back after the seal; partial seal floors at 0.3; screen effects off pins it to 0.
- E5: scanlines and the in-game star field gone, unused moon and fog CSS deleted, `Atmosphere.tsx` canvas with mist, embers, ash and motes from `atmosphere` on each location. 30fps cap, ≤40 particles, paused when hidden, one frame with motion off, embers halve at Dimming 75.
- E6: `ActCard` for each act and for Act I after creation; chapter title for three seconds; day stamp on the art; 700ms art cross-fade; story fades out 200ms and in 300ms on a change of place.
- E7: reveal capped at a second, one sequence for every paragraph kind, click or key finishes it, choices wait for it (never past 1.2s), instant for seen scenes, 'At once' and motion off, and it reads `--reveal` from The Dimming. e2e test added.
- E8: 45s push-in drift and 6px pointer parallax on wide screens.
- E9: `stage` on 18 scenes, with all six treatments, the sound cues and the sidebar dimming kept when effects are off.
- E10: stat row lights with its modifier when a rolled choice is hovered or focused; Resolve and the Arcane's Dimming number count to their new value; pressed state on every button. The bar flash and the journal dot were already there.
- Validator: knows the beds, atmospheres, cues and stages.

**Checks**: validate 0 errors (4 warnings), unit 25 passed, e2e 13 passed. No prose changed, so the prose stats are as in step 9.

**Skipped or deferred**

- E8 light flicker, as you asked: it needs the art manifest.
- E8 time-of-day grading: file 06 says to tune it against the new images and skip images with the light baked in, and you asked for the current images not to be restyled. Waits for the new art.
- E8 drift towards the focal point: no manifest yet, so it scales from the centre.
- E4's `--accent-sat` for the blue accents isn't used. It needs `color-mix()`, which the contrast test can't read (see step 9).
- E6 trait line on the act card: the card takes a `trait`, but G14 is step 12.

**Plan was wrong or unclear**

- E6's 200ms fade-out and E9's 2s fade to the end screen both left the old scene clickable while it faded, so a quick second click could pick a choice from a scene you'd already left. Both are `inert` while fading.
- E9 'touch' holds the choices for the length of the effect. The first version never let them back, because the hold's own cleanup cancelled its timer when the effect ended. Caught by the e2e run.
- E3 says play `end` on entry to any ending, and E9 says play it after the last choice. It plays after the last choice, with the 2s fade, and the ending's entry starts the 5s fade-out of the bed.
- The plan doesn't say what undoes a cue's cut or the ending's fade, so the next game could start silent. Begin and Continue reset the mix.

## Step 12 — B22, B23, G14, G15

Branch `step-12-assets-saves-traits`, stacked on step 11.

**AUTHOR DECISION defaults used**
- G14 picks one trait per act break in this order: the behaviour shown most (3 or more), then Compact coin, then Worn, then Kept faith. The plan lists the traits but not what wins when several qualify.
- G14's "with the afflicted", "against soldiers", "with Maret", "with the Compact/Rootless" are lists of scenes in `src/rules.ts` (`TRAIT_SCENES`). The plan doesn't say which scenes count.
- B23's "delete the player debris" is read as a relationship entry for the player themself. Nothing else in the old saves looked like debris.

**Done**

- B22: `resources/` moved to `public/resources/` (Vite copies it; the `cp` in `deploy.yml` is gone), mockups to `docs/mockups/`. `npm run images` (`tools/optimize-images.mjs`, `sharp`) writes `@1x` (640) and `@2x` (1280) webp at quality 78: 16 MB of PNG became 2.7 MB for both sizes, none over 150 KB. The art uses `srcset`/`sizes`. The next scenes' images and chapter files are fetched when a scene opens. The validator compares images per name and fails if a mapped image is missing.
- B23: `src/saves.ts` with `migrateV1toV2`; an unreadable save goes to `ashenveld_save_backup`; a newer version is refused. Menu: Export save (downloads `ashenveld-save.json`) and Import save (checked for being a save, its version, and a known `current_scene`, then confirmed). Unit and e2e tests.
- G14: six traits with their effects in `resolveRoll`, 66 outcomes counting the behaviour (`listened`, `blunt`, `careful`, `lied`, `compact_coin`), the award at the end of Acts 1 and 2, shown on the act card and under the class in the sidebar. Worn caps Resolve at 90. Unit tests, and the e2e runs check traits are earned.
- G15: prose-stats counts one reader's words and lists scenes over 260. The playthroughs count what each reader actually saw. 20 scenes split at a natural break with a "Go on." step (a textless outcome now goes straight on, with no journal line). No words changed.

**Words per path** (scene text only, from the e2e runs; outcomes add more)

| Path | Scenes | Words |
|---|---|---|
| Commander, stays together | 89 | 15,471 |
| Arcane, the road west | 85 | 15,553 |
| Ranger, the camp endures | 86 | 15,343 |
| Cipher, the warden alone | 86 | 15,039 |

At about 200 words a minute that's 75 to 80 minutes of scene text, so with outcomes a run sits inside the plan's 75 to 100. No scene on these four paths is over 260 words now.

**Prose stats**: unchanged from step 9 (no words changed).

**Checks**: validate 0 errors (4 warnings), unit 33 passed, e2e 14 passed.

**Skipped or deferred**

- B23 save slots: optional, not added.
- G15: the static count still lists 9 scenes over 260, because it counts every guarded paragraph. Most of these measured under 260 where a test path reached them (The Camp Endures is 340 by the static count). The rest are off the test paths and may need a look with a real run.
- The `@2x` images are 1024 wide, the size of the current sources, rather than upscaled to 1280.

**Plan was wrong or unclear**

- B22 says sources go in `art/source/`, which is also where you'll put the new art. The current PNGs went to `art/legacy/` so that folder still means "new images are in". The script reads both and `art/source` wins.
- The validator checked the title screen's ending list by scene id. Once an ending opens with a "Go on." step that's the wrong scene, so it matches by ending id.
- Moving `resources/` failed while the dev server was watching it; the files were moved one by one instead. Worth knowing if it happens again.
- The contrast test was flaky under load because it measured the title mid-fade. It now waits for animations to finish.

All twelve steps are done. Art Part 2 is still on hold until the new images are in `art/source/`.

## After step 12: the voice pass

Asked for after the twelve steps: cut the interface lines that only reassure (where the game saves, that sound is made in the browser, how long it takes), stop the creation screens asking deep questions, and rewrite the story in the tone of Christie's *The Mysterious Affair at Styles*, with no dashes.

- Every scene, choice and outcome in all 20 chapter files was rewritten, plus the place descriptions, people's reads, journal notes and the endings. Plot, flags, ids, numbers and hints are unchanged. Still second person, present tense.
- The touchstone lines are kept word for word.
- No em or en dashes are left in the story, the meta files or the interface. "— End —" is now "The end."
- The gender step now says what it does (people call you ma'am, sir or traveller). The class cards lost their slogans.
- Fixed on the way: Pol was sixty in one line, the paid runner option sent Pol anyway, three ritual choices shared one pasted outcome, and Joren turned up in the camp on two different days.
- Not fixed: the new prose runs about 5% longer. On the four test paths, nine scenes are now over 260 words (the most is 278). Trim them if the length rule still matters.

Prose stats after: specific 0, of someone who 0, em dashes 0, contractions 740, "for a long moment/time" 11.
