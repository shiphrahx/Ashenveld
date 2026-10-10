# 03 — Game design (G1–G15)

Read `00-START-HERE.md` first. This file needs `01-engine-and-bugs.md` section 0 and B6, B7, B8, B12.

Put every tunable number in one new file, `src/rules.ts`, so balance changes never touch components.

---

## What the audit measured

- 77 rolled choices. In 67 of them every result leads to the same next scene.
- Rolls by stat: Charisma 42, Intelligence 18, Perception 13, Stamina 4. Strength, Dexterity and Mana are never rolled.
- Average full-success rate per class: Commander 44%, Arcane 45%, Ranger 41%, Cipher 49%.
- 194 flags set, 19 read. Reputation, closeness and items gate almost nothing.
- 88 of 108 scenes have a single destination. 30 scenes offer one choice.

The plan: make earlier choices feed later rolls, make failure cost something visible, and give every stat and every system a job.

---

## G1 — Make dice results change the path (High)

### 1a. Roll bonuses from earlier choices

This is the main tool. It turns flags that are "set and never read" into odds the player can see.

```ts
export interface Roll {
  stat: string | string[]          // an array means: use the player's best of these
  dc: number
  bonus?: Array<{ when: Condition; value: number; label: string }>
}
```

In `dice.ts`:

```ts
export function resolveRoll(roll: Roll, s: GameState) {
  const stats = Array.isArray(roll.stat) ? roll.stat : [roll.stat]
  const stat = stats.reduce((a, b) => modifierFor(s, b) > modifierFor(s, a) ? b : a)
  const bonuses = (roll.bonus ?? []).filter(b => meets(b.when, s))
  const bonus = Math.max(-RULES.maxBonus, Math.min(RULES.maxBonus, bonuses.reduce((n, b) => n + b.value, 0)))
  return { stat, modifier: modifierFor(s, stat), bonuses, bonus }
}
```

`RULES.maxBonus = 6`. The dice panel lists each bonus by its `label` (file 05, E2). The choice tag shows the resulting odds (G4).

### 1b. The climax

Replace the rolls in the three ritual scenes.

`act2_ch6_ritual_approach:proceed_to_engagement` — `stat: ["intelligence", "mana"]`, DC 12.

| Bonus | Condition | Label |
|---|---|---|
| +2 | `ritual_understood` | You read the text yourself |
| +1 | `ritual_partially_understood` | You know the outline |
| +1 | `understands_carving_structure` | You know where the ritual text sits |
| +2 | `ritual_preparation_complete` | Two days of preparation |

`act2_ch6_ritual_engagement` — replace the single choice with three approaches, all leading to `act2_ch6_ritual_sealing`:

| Choice | Roll |
|---|---|
| "Hold steady. Stay on your feet." | Stamina, DC 14 |
| "Stop holding. Let it move through you." | Mana, DC 13 |
| "Keep your eyes on [missing person]." | Charisma, DC 13 |

Bonuses on all three: +2 `full_disclosure_made` ("Nothing left unsaid"); +1 `confronted_being_used` ("You named it in the ruins"); +1 `ritual_lesson_complete` ("The first lesson"); +1 `min_relationship: { the_missing_person: 80 }` ("You know each other"); −2 when neither `full_disclosure_made` nor `confronted_being_used` ("Something unsaid").

`act2_ch6_ritual_sealing:hold_through_sealing` — `stat: ["stamina", "mana"]`, DC 13.

| Bonus | Condition | Label |
|---|---|---|
| +2 | `ritual_phase2_clean` (set only on a full success in the engagement) | The reading went clean |
| +1 | `chamber_prepared` | You prepared at the threshold |
| +1 | `inventory: ["covenant_ward"]` | Edric's ward |
| +1 | `understands_fracture` | You know what was taken |
| +1 | `heard_the_note` | You have listened to it before |
| −2 | `health_below: 40` | You are worn thin |
| −2 | `min_curse: 90` | The Dimming is close |

Outcomes: success → full seal. Success at a cost → full seal, Resolve −20. Failure → partial seal (`ritual_partial`). File 02 (N4) writes the partial-seal branch.

### 1c. Bonuses that carry choices forward elsewhere

| Roll | Bonus | Condition |
|---|---|---|
| `act1_ch3_maret_first_meeting:probe_maret_reaction` | +2 | `knows_maret_sent_missing_east` |
| `act1_ch4_maret_evening:answer_maret_partially` | +2 | `taken: ["act1_ch4_lira:just_sit_with_lira"]` |
| `act1_ch4_maret_letter_withheld:return_and_earn_trust` | +2 / +2 | `lira_met` / `branch_met` |
| `act2_ch1_ruins_outskirts:follow_the_paths` | +2 / +2 / +2 | `inventory: ["rootless_map"]` / `maret_joined` / `inventory: ["cellar_map_copy"]` |
| `act2_ch1_ruins_outskirts:examine_ruins_carefully` | +2 | `has_cellar_map` or `read_harrow_records` |
| `act2_ch3_compact_checkpoint:comply_straightforwardly` | +3 / −2 | `min_faction: { iron_compact: 15 }` / `compact_message_undelivered` |
| `act2_ch3_seriva_first_meeting:accuse_seriva_directly` | +2 / +2 / −2 | `understands_fracture` / `knows_seriva_came_early` / `seriva_has_initiative` |
| `act2_ch4_vorne_meeting:propose_alliance_with_vorne` | +3 / −3 | `compact_allied` / `compact_suspicious` |
| `act2_ch4_issa_crisis:help_maret_negotiate` | +2 / −2 | `issa_spoke` / `stayed_for_lesson` |
| `act2_ch4_issa_confrontation:negotiate_at_camp_edge` | +2 | `min_relationship: { branch: 25 }` |
| `act2_ch4_vorne_issa_negotiation:broker_the_agreement` | +2 / +2 | `vorne_knows_player_knows_issa` / `min_relationship: { maret: 60 }` |
| `act2_ch7_vorne_reacts:propose_compact_withdrawal` | +3 / −3 / −2 | `vorne_alliance` / `issa_standoff_continues` / `ritual_partial` |
| `act2_ch8_faction_reckoning:call_a_meeting` | +2 / +2 / −2 / −3 | `issa_agreement_reached` / `seriva_reconciled` / `seriva_version_established` / `seriva_left_hostile` |

Set the two new flags: `seriva_has_initiative` on the failure of `act2_ch3_crestfall_changed:find_seriva`; `seriva_left_hostile` on the failure of `act2_ch6_seriva_arrives:use_seriva_as_leverage`.

### 1d. Failure must cost something the player can see

For every rolled choice, the failure outcome must do at least one of: lead to a different scene, cost Resolve, raise The Dimming, lower closeness or reputation, or set a flag that a later roll reads as a penalty. Apply these:

| Choice | Add to the failure outcome |
|---|---|
| `act1_ch3_compact_offer:negotiate_compact` | Return to `act1_ch3_compact_offer` with the choice marked `once`. The player must then accept or refuse. |
| `act1_ch5_curse_event:try_to_reach_her` | Resolve −5. Flag `could_not_reach_her`. |
| `act1_ch6_cursed_creature:follow_the_deer` | Resolve −5, The Dimming +2, time moves to afternoon. |
| `act1_ch6_road_traveller:ask_what_he_saw` | He takes fright and drops nothing. No bone figure on any result but success (already true). |
| `act1_ch7_harrow_cellar:copy_carvings` | Resolve −5 (the air). |
| `act1_ch7_forest_edge:wait_sense_behind` | All three outcomes are the same. Remove the roll. Make success a class-free reward instead: a new unrolled choice "Step off the road and watch who is following" that shows Maret stopping to speak to the tree line (sets `saw_maret_at_line`, read in N3). |
| `act2_ch2_inner_approach:ask_about_carvings` | No `understands_carving_structure` (already true). |
| `act2_ch3_compact_checkpoint:comply_straightforwardly` | Time moves to evening. The checkpoint sends word ahead: `compact_suspicious`. |
| `act2_ch7_crestfall_reception:manage_the_information` | Already sets `seriva_version_established`. Now read by 1c. |

The validator warning "all three outcomes identical" (B21) must reach zero.

---

## G2 — Use all seven stats (High)

### 2a. A modifier table with more spread

Replace `floor((stat − 5) / 2)` in `dice.ts` with a table in `rules.ts`:

| Stat | 6 or less | 7–8 | 9–10 | 11–12 | 13–14 | 15–16 | 17+ |
|---|---|---|---|---|---|---|---|
| Modifier | −2 | −1 | 0 | +1 | +3 | +5 | +6 |

Keep the bands: success at `DC + 4`, success at a cost from `DC − 2`, failure below. Result at DC 12: a signature stat (16) gives 50% success and 20% failure; a weak stat (9) gives 25% and 45%. Class now changes the odds enough to matter. Update `dice_rules.modifier_formula` in `act1_00_meta.json` to describe the table.

### 2b. New checks for Strength, Dexterity and Mana

Add these as new choices. Each needs three outcomes.

| Scene | New choice | Roll | Success | Failure |
|---|---|---|---|---|
| `act1_ch5_curse_event` | "Catch her before the basket pulls her over. Sit her on the fountain rim." | Strength 9 | Rootless +5. The old man tells you her name. Leads on with `helped_cursed_woman_market`. | She falls. Resolve −5. |
| `act1_ch7_harrow_cellar` | "Shift the stacked boxes without bringing them down." | Strength 10 | You find the occupant's bundle: grants `carved_bone_figure` if not held. | The stack falls. Resolve −8. |
| `act2_ch4_issa_confrontation` | "Stand in the gap between the tents. Do not move." | Strength 13 | The sergeant backs down. Leads to the negotiation. Branch +15. | They go round you. Same as the existing failure. |
| `act1_ch6_cursed_creature` | "Get close enough to touch it." | Dexterity 12 | You see its eyes track the east. Same flag as following it, no exposure. | It bolts through you. Resolve −5. |
| `act1_ch6_waystation` (new, N5) | "Lift the seal and read the packet." | Dexterity 12 | See N5. | See N5. |
| `act2_ch3_compact_checkpoint` | "Leave the road and go round through the trees." | Dexterity 13 | `slipped_checkpoint`. Vorne does not know you were east. | Caught. Compact −10, `compact_suspicious`. |
| `act2_ch1_first_cairn` | "Go through the south passage fast, before the walls can get into your head." | Dexterity 11 | No exposure. | You brush the carving. Resolve −8, The Dimming +2. |
| `act1_ch5_player_curse_touch` | "Put your hand back on the wall. Listen." | Mana 12 | `heard_the_note`. The Dimming +1. | Resolve −10. |
| `act1_ch6_place_covenant_marker` | "Feel what the stone does when it touches the ground." (after placing) | Mana 11 | `knows_ward_is_survey`. | Nothing. |
| `act2_ch1_the_watcher_seen` | "Reach for them the way the curse does." | Mana 13 | Same as the Charisma success. | Resolve −10. |
| `act2_ch2_source_chamber` | "Go closer than three metres. Listen to the thread." | Mana 14 | `understands_fracture`, `heard_the_note`. Resolve −5. | Resolve −15, The Dimming +3. |

After this pass, re-run the stat count. Target: no stat above 35% of rolls, none below 8%.

### 2c. Give the player a choice of stat

Wherever a scene's rolled choices all use one stat, change one of them to a different stat or use `stat: [a, b]`. First to fix: `act1_ch1_docks_encounter` (both Charisma → make "What happened to this place?" `["charisma", "perception"]`), `act1_ch4_branch` (both Charisma → make "How long have you known Maret?" `["charisma", "intelligence"]`), `act2_ch4_vorne_meeting` (two Charisma → make the partial-truth choice `["charisma", "intelligence"]`).

---

## G3 — Reward risk more than safety (High)

In 11 scenes the unrolled option gives the same or more closeness than a perfect roll. Change these values:

| Scene | Unrolled option: now → new | Rolled success: now → new |
|---|---|---|
| `act1_ch3_maret_first_meeting` | `ask_about_camp_first` +18 → +8 | `probe_maret_reaction` +15 → +20 |
| `act1_ch4_maret_opens` | `stay_and_help` +15 → +8 | `ask_maret_what_she_knows` +10 → +18 |
| `act1_ch4_lira` | `just_sit_with_lira` +30 → +20 | `ask_lira_about_curse` +25 stays. It also grants the information flags. |
| `act1_ch4_maret_evening` | `answer_maret_honestly` +30 stays, and add Resolve −5 ("It costs you to say it.") | `answer_maret_partially` +20 stays |
| `act2_ch3_pol_revelation` | `ask_pol_what_she_needs` +25 → +10 | `ask_pol_about_seriva` +15 → +20 |
| `act2_ch4_issa_crisis` | `take_issa_to_vorne`: keep Vorne +20, change Issa +15 → −10, add Maret −10 and Rootless −10 | unchanged |

The other five scenes trade closeness against information or reputation, which is fine once G1 makes the information count. Leave them.

Rule for all new content: an unrolled choice may be the kind choice or the cautious choice, but it never gives the largest reward in the scene unless it carries its own cost.

---

## G4 — Explain the dice (High)

Today the tag shows `CHA · 11`, but full success needs 15 and anything from 9 is a partial. Difficulty is shown by colour alone.

1. Compute the three chances in `dice.ts`:

```ts
export function odds(roll: Roll, s: GameState) {
  const { modifier, bonus } = resolveRoll(roll, s)
  const need = (target: number) => Math.max(0, Math.min(20, 21 - (target - modifier - bonus)))  // faces that reach target
  const success = need(roll.dc + 4) / 20
  const atLeastCost = need(roll.dc - 2) / 20
  return { success, cost: atLeastCost - success, failure: 1 - atLeastCost }
}
```

2. Choice tag: stat name in full plus a word, never a bare DC.

| Chance of not failing | Word |
|---|---|
| 85% or more | Sure |
| 65–84% | Favoured |
| 45–64% | Even |
| 25–44% | Risky |
| under 25% | Long shot |

Example: `Charisma · Favoured`. Colour may reinforce the word. It must not replace it.

3. On hover, focus or long-press, show: "Success 50% · At a cost 30% · Fail 20%", then the bonus labels that apply.
4. Dice panel: show "Needs 16 to succeed, 10 to scrape through", the die, the modifier and each bonus (file 05, E2).
5. Remove the "No roll" tag (G12).
6. Arcane and Cipher asides sometimes tell the player what will work. Leave those. They are the class reading the odds in fiction.

---

## G5 — Use the systems you track, or remove them (High)

### Reputation tiers

`master_scene_index.json` already defines thresholds (`hostile`, `wary`, `neutral`, `cooperative`, `allied`, and `trusted` for the Rootless). Add `tier(faction, reputation)` to `rules.ts`. Use it in the sidebar (file 04, U8) and in conditions via `min_faction` / `max_faction`.

| Faction | Tier | Effect |
|---|---|---|
| Iron Compact | cooperative (15+) | The checkpoint waves you through: add an unrolled choice to `act2_ch3_compact_checkpoint`. Cael pays the forty (N5). +2 on rolls with Vorne. |
| Iron Compact | wary (−10 or less) | −2 on rolls with Vorne and soldiers. `propose_alliance_with_vorne` is hidden. |
| Ashen Covenant | cooperative (15+) | The shrine is a rest place (G9). Edric answers one extra question in `act1_ch3_covenant_warning`. Unlocks N14's fourth option. |
| Ashen Covenant | wary (−10 or less) | Seriva will not discuss the cost: hide `ask_about_purification_cost`. |
| Rootless | cooperative (15+) | The camp is a rest place. |
| Rootless | allied (25+) | Branch walks the first mile of the east road with you: skip the exposure on the deer roll. +2 at `act2_ch4_issa_confrontation`. |
| Rootless | trusted (40+) | Maret shows you the list (N3) even on the letter-withheld path. |

### Closeness thresholds

| Person | At | Effect |
|---|---|---|
| Aldous | 30 | The room is free. He tells you Wren's name unasked. |
| Lira | 40 | She adds marks to the map: the `rootless_map` bonus rises from +2 to +3. |
| Branch | 25 | He backs you at the camp edge (1c). |
| Maret | 30 | She offers to come with you at the forest edge. Below 30, hide `accept_maret_companion`: she brings the notes and goes back. |
| Maret | 60 | +2 in the Issa negotiation (1c). |
| [missing person] | 80 | +1 in the ritual. Required for The Account. |
| Sen | 15 | Unlocks the river scene (N5). |

### Items

| Item | Job |
|---|---|
| `rootless_map`, `maret_outskirts_notes`, `cellar_map_copy` | Roll bonuses in the ruins (1c). `cellar_map_copy` also unlocks the passage route (G7). |
| `rootless_provisions` | Used when you rest away from a rest place: Resolve +20, then removed. |
| `covenant_ward` | Halves Resolve lost to exposure (any loss in a scene whose location region is `deep_forest`). |
| `covenant_marker_stone` | As now. |
| `carved_bone_figure`, `harrow_papers` | The Watcher thread (N5). |
| `missing_person_note` | Unlocks a choice in `act2_ch1_reunion`: "Show them the cloth." Closeness +10. |
| `mechanism_fragment` | Required to begin the ritual: `requires: { inventory: ["mechanism_fragment"] }` on `act2_ch6_day_of_ritual:enter_the_passage`. Make `act2_ch4_pol_fragment:consult_missing_person_first` have Pol bring it (it already does in `act2_ch5_maret_conversation`; grant the item there). |

### Gold

Today at most 4 coins are spent in a run. Give money a use and make the Compact's coin tempting.

| Spend | Where | Cost |
|---|---|---|
| A room at the Tallow (rest) | G9 | 3, free at Aldous 30 |
| Grain for the camp | `act1_ch2_market_square`, new choice | 5 → Rootless +5, Hanna remembers |
| Dried fish from Corvin | same scene | 4 → grants `rootless_provisions` (rename the item "Provisions") |
| Pay the checkpoint sergeant | `act2_ch3_compact_checkpoint` | 10 → pass without a roll, Compact −5 |
| Pay a runner | `act2_ch5_maret_conversation:send_message_back` | 8 → counts as success |

Income: Compact advance 15 to 30 (exists), waystation delivery 20 (N5), final 40 (N5). Add `min_gold` to `Condition`.

### Class mechanics

`class_stat_blocks.*.unique_mechanic` describes four abilities that do not exist. Build small versions.

| Class | Ability | Implementation |
|---|---|---|
| Commander | **Command.** Once per act, turn a failed Charisma roll into a success at a cost. | A button on the dice result. Track `counters.command_used_act{n}`. |
| Arcane | **Residue.** You sense the curse. | The Dimming meter shows an exact number and its last change. Other classes see only the word (G8). |
| Ranger | **Read the ground.** You see what a choice will cost before you make it. | Choices that change Resolve or The Dimming show a small mark: "exposure" or "tiring". |
| Cipher | **The Read.** A private assessment when you first meet someone. | Add `read` (one sentence) to each NPC in the meta files. Show it once, as an extra aside line, in the first scene where that NPC's relationship changes. |

---

## G6 — Extend the condition system (High)

The base is in file 01, section 0.1. Add counters here:

```ts
// GameState
counters: Record<string, number>
// StateChanges
counters?: Record<string, number>        // deltas
// Condition
min_counter?: Record<string, number>
max_counter?: Record<string, number>
min_gold?: number
```

Enforce `scene.requires`. Today it is written on 26 scenes and never checked. In `enterScene`, if `!meets(scene.requires, state)`, log a console error with the scene ID and the failing state, and continue. It must not block the player. The e2e test fails on that console error, so routing mistakes surface in CI.

---

## G7 — Add forks that last (Medium)

Each of these splits the path for at least two scenes and rejoins.

1. **Act 1, chapter 3: one faction before the camp.** Today the Compact scene always leads into the Covenant scene. Change `act1_ch3_compact_offer` outcomes and `act1_ch3_covenant_task` outcomes so that after either faction the player goes to `act1_ch3_rootless_rumour`. In `act1_ch2_market_rumour_missing` offer "the gate" or "the shrine" (already there as `visit_compact_first`; add the shrine). The faction you skipped finds you on Day 3: in `act1_ch5_faction_responses`, add a guarded choice for `compact_met: false` ("The older soldier asks you to see the lieutenant" → `act1_ch3_compact_introduction`, which then returns to `act1_ch5_player_curse_touch`) and the same for `covenant_met: false`. Make `rootless_rumour` text conditional: it currently summarises all three factions.
2. **Act 1, chapter 6–7: Harrow.** Exploring Harrow costs the evening and can grant `cellar_map_copy`. Passing through skips it. Pay it off in fork 4.
3. **Act 1, chapter 7 to Act 2, chapter 2: with or without Maret.** N8 writes her into the scenes. Mechanically: with her, +2 on the outskirts rolls; without her, you hold `maret_outskirts_notes` (+2 on one roll only).
4. **Act 2, chapter 2: the passage.** With `has_cellar_map` or `has_partial_cellar_map`, add a choice to `act2_ch1_what_they_found`: "Show them the cellar carvings." They recognise a second way down. New scene `act2_ch2_hidden_passage` (location `ruins_hidden_passage`, which already exists in the map and the meta) replaces `act2_ch2_inner_approach`: no exposure, a carving of the bone figures, and Joren's marks. It rejoins at `act2_ch2_chamber_entrance`.
5. **Act 2, chapter 3: go back at once or stay a day.** Staying grants `ritual_lesson_complete` (ritual bonus) and sets `stayed_for_lesson` (the Issa crisis is harder, 1c). Already wired by B12.
6. **Act 2, chapters 4–7: Issa.** Three states already exist (agreement, standoff, taken). N6 and 1c now read them.
7. **Act 2, chapter 8 into Act 3: alignment.** `rootless_aligned`, `compact_aligned`, `covenant_aligned` and `ashenveld_settlement_reached` are read by the Act 3 conflicts (N11) and the endings (N16).

Also reduce single-choice scenes. For each of the 30, either merge it into the previous outcome or add a second real option. Keep single-choice scenes only where the moment is a held breath: `act1_ch7_decision_enter`, `act2_ch6_aftermath`, the endings.

---

## G8 — Turn the curse into a visible clock (Medium)

Player-facing name: **The Dimming**. Internal: `world.curse_spread`, 0 to 100.

1. **Start and pace.** Start at 15. In Act 1, add 1 each time the day number rises (do this in `applyWhen`). In Act 2, multiply every positive `curse_spread` value in the data by 0.75 and round, minimum 1. On the main path this reaches about 80 at the sealing. Each skipped day (`skip_days`) adds 3.
2. **The seal.** On `ritual_complete`: set the value to `min(current, 45)`. The negative values already in the data then bring it to about 0 by Day 45. On `ritual_partial`: set it to `min(current, 60)`, never let it fall below 30, and add 1 on each Act 3 scene.
3. **Bands.**

| Value | Word | In the world |
|---|---|---|
| 0–24 | Clear | Nothing. |
| 25–49 | Thin | Guarded lines in Crestfall scenes: a second still figure in the square. |
| 50–74 | Dim | The market has two stalls. −1 on Charisma rolls with townspeople (`bonus` with `min_curse: 50`). |
| 75–99 | Grey | Maximum Resolve is 80. Aldous forgets your order. |
| 100 | Still | `crestfall_afflicted`. |

4. **Reaching 100 before the seal.** Aldous is in Wren's chair when you return. Add guarded text to `act2_ch7_crestfall_reception` (someone else says "They are back") and one paragraph to every ending. Do not end the game.
5. **Meter.** In the sidebar under Condition: a labelled bar, the band word, and for the Arcane the number. A change of band triggers a toast (file 04, U7).
6. **Choices move it.** Add The Dimming +2 to slow options: `act1_ch2_market_rumour_missing:explore_more_first`, `act1_ch3_rootless_camp_approach` failures, `act1_ch4_maret_guarded:return_to_town`, `act1_ch6_harrow_arrival:explore_harrow`. The Ranger sees these marked (G5).

---

## G9 — Decide what health is for (Medium)

Rename the bar **Resolve** (keep `resources.health` internally). It measures how much of you the place has worn away.

1. **Losing it.** Exposure outcomes (B6 table and the new ones in G2). Resolve at or below 40 gives −2 on Stamina and Mana rolls.
2. **Resting.** Scenes with `"rest": true` enable the Rest button: `crestfall_tallow_inn` scenes (cost 3 gold, free at Aldous 30), `rootless_camp` scenes at Rootless 15+, `crestfall_shrine` at Covenant 15+, and the ruins camp scenes with [missing person] (`act2_ch3_crestfall_news`, `act2_ch5_return_to_ruins`). Resting: Resolve +30 (cap at max), time moves to the next morning through `applyWhen`, The Dimming +2 in Acts 1 and 2. A short modal confirms: "Rest until morning? The Dimming does not sleep." Away from a rest place, the button offers "Eat and sit a while" if `rootless_provisions` is held: Resolve +20, the item is used.
3. **At zero.** No Game Over and no deleted save. Go to a new scene, `collapse` (one per act, same text frame): you wake at the last rest place, a day has passed, The Dimming +5, Resolve 40, and the person there says one line (Aldous, Maret or [missing person]). Then return to the scene you were in. Store `state.last_rest_scene`.
4. Remove `GameOver.tsx` or keep it unused. Remove `deleteSave()` from the death path.

---

## G10 — Make the Act 2 faction choice count (Medium)

`act2_ch8_faction_reckoning` sets `rootless_aligned`, `compact_aligned`, `ashenveld_settlement_reached`, `fragile_settlement` or `no_settlement`. Nothing reads them. Now:

- Ending route: `rootless_aligned` → `ending_warden_of_ashenveld` (B2).
- Act 3 conflicts and ending paragraphs: N11, N16.
- Act 3 rolls: `act3_ch2_rebuilding:focus_on_faction_settlement` gets +3 with `ashenveld_settlement_reached`, −2 with `no_settlement`. `focus_on_afflicted_recovery` gets +2 with `rootless_aligned`. `focus_on_documentation` gets +2 with `documentation_deal`.
- `fragile_settlement`: in `act3_ch3_the_long_work` one party breaks it. Which one depends on the lowest reputation.

---

## G11 — Limit the hub scenes (Medium)

`act1_ch4_rootless_camp_stay`: you get two activities, then evening.

- Add a third activity so there is a real choice: "Carry water with the midwife" (Stamina 10; success Rootless +8 and a line about the well; failure Resolve −5).
- Each activity outcome adds `counters: { camp_day: 1 }`.
- `talk_to_lira`, `talk_to_branch` and the new one: `once: true`, `requires: { max_counter: { camp_day: 1 } }`.
- `wait_for_maret_evening`: always available. When `camp_day` is 2 it is the only choice, relabelled "The light is going. Find Maret."

Use the same pattern for `act1_ch6_departure_decision` (B15).

---

## G12 — Show locked options (Medium)

- When a choice has `locked_hint` and its `requires` fails, render it disabled with the hint: "Needs the Covenant marker stone", "Commander only", "Needs Aldous's trust". Choices without a hint stay hidden.
- Add `locked_hint` to every class-only choice (N13), every item-gated choice, and the reputation and closeness gates in G5.
- Never show more than two locked rows in a scene. Prefer class locks.
- Remove the "No roll" tag from unrolled choices. Absence of a tag already says it.

---

## G13 — Support replays (Medium)

1. **Chapter checkpoints.** When `enterScene` sees a higher `act*100 + chapter` than before, store a copy of the state in `ashenveld_checkpoints` (keep the last three). Menu: "Return to the start of this chapter", with a confirm.
2. **Ending gallery.** Title screen, once one ending is found: five slots, found ones titled, others "Not yet found".
3. **Seen text.** `meta.seenScenes` records scene IDs. On a seen scene, skip the fade (file 05, E7) and show a small "seen before" mark by the title. Menu toggle: "Skip to the next choice I have not made".
4. **Recap.** On the end screen (B5).

---

## G14 — Light progression (Polish)

Stats never change. Award one trait at the end of Acts 1 and 2 from how the player behaved. Track with counters on outcomes.

| Trait | Earned by | Effect |
|---|---|---|
| Listener | 3 or more "sit / say nothing / do not ask" choices | +1 on Charisma with the afflicted |
| Blunt | 3 or more direct accusations or refusals | +1 on rolls against soldiers, −1 with Maret |
| Careful | 3 or more "examine / watch / wait" choices | +1 Perception |
| Company coin | Compact gold of 35 or more | +1 with the Compact, −1 with the Rootless |
| Worn | Resolve below 40 at an act break | +1 Mana, maximum Resolve 90 |
| Kept faith | Never lied to Maret or [missing person] | +1 in the ritual engagement |

Show the trait on the act card (file 05, E6) and under the class name in the sidebar. Add the counter increments to the relevant outcomes: tag about 25 outcomes with `counters: { listened: 1 }` and so on.

---

## G15 — Recheck pacing after the text fix (Polish)

Before B1 a run shows about 5,800 words of scene text. After B1 it shows roughly 15,000 to 18,000 plus outcomes.

- Add to `tools/prose-stats.mjs`: words per scene (main + aside), flagged above 220.
- Split any scene above 260 words at a natural beat with a "Continue" step (a `route`-free scene with one unrolled choice is acceptable here).
- Aim for a full run of 75 to 100 minutes. Report the measured word count per path in the PR.
