# 02 — Narrative (N1–N18)

Read `00-START-HERE.md` first. This file needs the engine pieces from `01-engine-and-bugs.md` section 0 (`Condition`, `RichText`, tokens) and B1.

**How to write here.** Second person, present tense, British spelling. Short sentences. People say less than they mean. Nobody explains their feelings. Keep the author's existing lines unless this file says to change them. When you add prose, write the minimum that carries the beat.

**Reference format.** `scene_id:text.default` is the scene's main text. `scene_id:choice_id:outcome` is an outcome's text.

---

## 0. Author decisions (defaults to implement)

The script points at several facts and never states them. Each needs an answer before the scenes can be written. These are recommended defaults. List the ones you used in the PR so the author can change them.

**D1 — Why you left.** You left eleven years ago because Crestfall was making you quiet. Nothing happened. You could feel yourself wanting less each year, and one spring you got on a barge before it finished. You told nobody the reason, because there was no event to point at. This matters because it is what the curse now does to everyone. You recognise it. Class passages may add a second reason (the Commander already says "there was a war to fight"). They must not contradict this one.

**D2 — Maret's arrangement.** Each new moon Maret walks to the tree line alone and gives the forest one memory that matters to her. It takes it. She cannot recall it afterwards. In return the dimming stays shallow inside the camp and the garden grows. She keeps a written list of what she has given so she knows what she no longer has. The first entry is "my daughter's voice". There are thirty-eight entries.

**D3 — What the missing person wanted.** They did not want you to come. The letter left with Maret says so. The cloth at the campsite says "Go home." They also could not finish the ritual alone, and in the end they told the Watcher your name. Both are true. The story is about that.

**D4 — What the mechanism shows.** One fact per relationship. See the table in N1.

**D5 — The Watcher** is Joren of Harrow, the man in the diary entry "Joren went east and did not come back". He carved the cellar walls and the bone figure.

**D6 — What Sen saw in the river.** A covered boat, three weeks before the game starts, putting one passenger ashore above the docks at night: Seriva. She has been in Ashenveld longer than she says.

---

## N1 — Use the name and relationship the player chose (High, large)

### Step 1 — Tokens everywhere

Run these replacements across every text field in `resources/act*/**/*.json` (scene text for all classes, choice text, outcome text) and in item descriptions in `master_scene_index.json`:

| Find | Replace with |
|---|---|
| `your missing person's` | `[missing person]'s` |
| `Your missing person's` | `[missing person]'s` |
| `your missing person` | `[missing person]` |
| `Your missing person` | `[missing person]` |
| `the missing person` / `The missing person` (in story text only, not in IDs or notes) | `[missing person]` |
| `your person` / `Your person` (Maret, Goran and Branch use this in speech) | keep as written. It is how the Rootless talk |

Then read each changed sentence. Fix any that now start with a lower-case name or read oddly (for example "the person you came back for" should stay where it avoids three uses of the name in one paragraph). Target: the name appears at most twice per paragraph. Use "they" after the first use.

The validator warning for "your missing person" (B21) must reach zero.

### Step 2 — The player's name

Use `[player]` where the text says a name is spoken or written:

| Where | Now | Change |
|---|---|---|
| `act1_ch4_maret_letter_success:text.default` | "The letter ends with your name. Just your name." | "The letter ends with one word. [player]." |
| `act1_ch6_missing_person_campsite:examine_campsite:success` | "four words. The first word is your name… Your name. Keep going." | See N2. "[player]. Go home." |
| `act2_ch1_the_watcher_seen:try_to_reach_watcher:success` | "They say one word. It is your name." | "They say one word. \"[player].\"" |
| `act2_ch1_missing_person_approach:cross_distance` | "You say their name. They say yours." | "\"[missing person],\" you say. \"[player],\" they say." |
| `act2_ch6_ritual_engagement:hold_through_reading:failure` | "Your missing person says your name." | "[missing person] says, \"[player].\"" |
| `act2_ch5_return_to_ruins:text.default` | "the Watcher… who says your name again" | Make it conditional on `watcher_spoke`. Else: "who does not turn". |
| `act1_ch2_old_friend:text.default` | "Someone calls your name" | "Someone calls \"[player]\" across the street" |

### Step 3 — Relationship bible

Six relationships can be chosen in `CharacterCreation.tsx`: childhood friend, former lover, sibling, mentor, parent, the one who got away. Store the lower-case label as today. Use `relationship_type` conditions.

| Relationship | What you were to each other | What leaving did | What the mechanism shows you (D4) |
|---|---|---|---|
| childhood friend | You ran the east field fence together every summer. They taught you the three-flat-one-angled fire ring. | You said you would write. You wrote twice. | They went to the docks every market day for a year in case you were on a barge. |
| former lover | The last two years before you left. | You left without saying it was ending, so it never did. | They were at the docks the morning you went. They stood in the warehouse door and did not call out. |
| sibling | Two years younger. You shared the house on the mill lane. | You left them with the house and your mother's last illness. | Your mother asked for you at the end. They told her you were on your way. |
| mentor | They taught you your trade, and the fire ring. | They told you to go. You thought they were tired of you. | They sent you away because they already knew what was under the forest. |
| parent | They raised you in the house on the mill lane. | You left after an argument neither of you finished. | They watched the barge until it was out of sight. They were proud. They have been furious for eleven years. |
| the one who got away | Nothing was ever said. | You left before you had to say it. | They knew. They were waiting for you to say it. |

`CharacterCreation.tsx` step 3 previews "You grew up with [name] in Ashenveld". For parent and mentor change the preview to "[name] raised you in Ashenveld" and "[name] taught you everything you were good at".

The existing text already supports the fire ring ("you watched the person who taught it to you"). For sibling, former lover, parent and "the one who got away", change that line in `act1_ch6_missing_person_campsite:text.default` to "a habit the two of you shared".

### Step 4 — Relationship-specific blocks

Add one guarded paragraph per relationship (six variants, `relationship_type`) in each scene below. Two to four sentences each. No variant may be longer than 60 words.

| Scene | Where it goes | What the paragraph does |
|---|---|---|
| `act1_ch1_tallow_room:text.default` | After "let the day settle" | One concrete memory of them in Crestfall. |
| `act1_ch2_childhood_home:text.default` | After "longer than you intend to" | Sibling and parent: this was their house too. Others: the place you used to meet. |
| `act1_ch4_maret_evening:answer_maret_honestly:default` | Replace "Why you left. What the person you are looking for meant to you" | State D1 plainly, then the "what leaving did" cell. |
| `act1_ch4_maret_letter_success:text.default` | Inside the letter | See N15. |
| `act2_ch1_missing_person_approach:text.default` | After "They are changed." | What you recognise first: a gesture, a way of standing. |
| `act2_ch1_reunion:ask_about_them_first:default` | Before "I am glad you came" | Their first unguarded line to you, in the register of the relationship. |
| `act2_ch5_missing_person_private:be_completely_honest:default` | Replace "you say the things you have been carrying" | You say the "what leaving did" fact aloud. |
| `act2_ch6_ritual_engagement:text.default` | After "equally real" | The mechanism shows you the D4 fact. State it. |
| `act2_ch8_relationship_test:be_honest_about_what_you_saw:default` | Replace "The one that changed how you understand the last eleven years." | You tell them the D4 fact. Their reply stays as written. |
| `act2_ch8_point_of_no_return` (all four outcomes) | One line each | The parting or staying line in the register of the relationship. |
| All five endings, `text.default` | One sentence | How the two of you are now. |

Also change `the_missing_person.role` in `act2_00_meta.json` from "The person the player came to Ashenveld for" to "The one you came back for". In `People.tsx`, show `Your [relationship]` under their name.

### Step 5 — Turn the 38 "replace" passages into asides

B1 marked 38 class passages as `text_mode: replace`. For each one: delete the sentences that repeat the default text (arrival, the quoted line of dialogue, the description of the room), keep the two or three sentences that are the class's own observation, and remove the `text_mode` entry. Example for `act1_ch1_docks_encounter`, Cipher:

- Before: "A man near the warehouse has been watching you… Sen. Tense in the shoulders. Afraid of something general that your arrival has added to. \"Didn't think you'd come back,\" he says. The words are simple. The weight behind them is not."
- After: "You had sixty seconds to study him while pretending you had not noticed. Tense in the shoulders. Afraid of something general that your arrival has added to. The words are simple. The weight behind them is not."

When all 38 are done, `text_mode` should not appear in any file.

---

## N2 — Deliver the premise (High)

The pitch is "someone who may not want to be found". Make D3 true on the page.

1. **The cloth at the campsite.** `act1_ch6_missing_person_campsite:examine_campsite:success`: the cloth reads "[player]. Go home." Rewrite the last paragraph: they knew you would come, and they did not want you to. Update the item description of `missing_person_note` to "Cloth with three words in ink. Your name. Go home."
2. **The cairn.** `act2_ch1_first_cairn:text.default`: keep the inscription. Add before it: "The scratches are fresh. Whoever wrote this knew you were already past the line."
3. **The reunion.** `act2_ch1_missing_person_approach:wait_for_them_to_move:default`: after "\"You came,\" they say." add: "It is not all gladness. \"I told you not to.\""
4. **A third choice in `act2_ch1_reunion`:**

```json
{ "id": "name_what_they_did", "text": "\"You told me to go home. Then you gave the Watcher my name.\"", "requires": {}, "roll": null,
  "outcomes": { "default": { "next_scene": "act2_ch1_what_they_found",
    "state_changes": { "flags": { "confronted_being_used": true, "ritual_explained": true }, "relationships": { "the_missing_person": { "closeness": 5 } } },
    "text": "<write: they do not deny it. They wrote 'go home' and meant it. Then the chamber text taught them the ritual needs two, and there was only ever one name. \"Both,\" they say. \"I wanted you safe and I needed you here. I have not found a way to make those the same thing.\" Then they explain the ritual, as in ask_what_ritual_requires.>" } } }
```

5. **The Cipher and Commander asides in `act2_ch1_reunion`** already raise this ("You needed me to come here… Because you needed a second person"). Keep them. Make sure they do not repeat the new choice's wording.
6. **Consequence.** `confronted_being_used` and `full_disclosure_made` feed the ritual roll (file 03, G1 bonuses). If the player has neither, add this guarded paragraph to `act2_ch6_ritual_engagement:text.default`: "There is something you have not said to them. The mechanism finds it first."
7. **The missing roll outcome (B11).** Write `success_at_cost` for `act2_ch3_missing_person_teaching:ask_about_the_cost_to_them`: they begin to answer ("Fourteen months of"), stop, and say "Ask me again when it is done." Then the lesson goes on. Closeness +20, same flags and destination as the other outcomes.
8. **The stay-or-leave choice.** In `act2_ch8_point_of_no_return:choose_to_leave_with_missing`, the line "Something in their face moves" stays. Add, guarded by `confronted_being_used: false` and `full_disclosure_made: false`: "\"You never did say whether you forgave me,\" they say."

---

## N3 — Put the withheld truths on the page (High)

| Truth | Where to state it | How |
|---|---|---|
| D1, why you left | `act1_ch4_maret_evening:answer_maret_honestly:default` | You say it in three sentences. Maret's reaction: "That is what it does to people here now. You felt it early." |
| D1 again | `act1_ch4_lira:ask_lira_about_curse:success` | After her "volume turned down" speech add: "You know the feeling she means. You left a town over it." |
| D2, Maret's arrangement | `act1_ch4_maret_letter_success` (both outcomes), replacing "She told them what her arrangement with the forest cost her and how it worked." | She shows you the list. You read three entries. Use: "My daughter's voice." "The name of the village." "What I was going to say to Branch." |
| D2 payoff | `act1_ch7_maret_follows:text.default` | Add: "It is new moon tomorrow. She should be at the tree line by the camp." Following you means the camp goes unprotected. |
| D2 payoff | `act2_ch3_rootless_situation:text.default` | The garden has started to yellow at one edge. Branch has noticed. |
| D2 close | `act2_ch7_maret_and_missing` (new third choice, "Ask Maret about the list") | After the seal she has stopped paying. Nothing has come back. She reads you the first line anyway. |
| D4 | `act2_ch6_ritual_engagement` and `act2_ch8_relationship_test` | Per N1 step 4. |
| D5, the Watcher | `act3_ch4_resolution_alone:text.default` already names the source. State the name: Joren. Also see N5. | |

---

## N4 — Give the ritual real stakes (High)

Today `act2_ch6_ritual_sealing:hold_through_sealing:failure` sets `ritual_partial` and `curse_slowed`, and then every later scene says the seal worked.

1. Set a shared flag on all three outcomes: success and success_at_cost set `ritual_complete` and `ritual_done`; failure sets `ritual_partial` and `ritual_done`.
2. Add guarded text (`flags: { ritual_partial: true }`) in each scene below. Each is a replacement for the named sentence, with the current sentence as the `else`.

| Scene | Change for a partial seal |
|---|---|
| `act2_ch6_aftermath:text.default` | The thread from the fracture is thinner. It is still there. |
| `act2_ch6_aftermath:leave_chamber:default` | Pol: "It held." A pause. "Mostly." She does not sit down. |
| `act2_ch6_seriva_arrives:text.default` | Seriva reads the chamber and says: "It is not finished." She is not wrong. |
| `act2_ch6_seriva_arrives:tell_seriva_what_happened` | "The curse will not spread further." → "It will spread slowly. Years, not weeks." Her confession stays. She adds: "Then my ritual may still be needed." |
| `act2_ch7_aftermath_crestfall:text.default` | The note in your bones is quieter. You can still find it if you listen. |
| `act2_ch7_vorne_reacts:text.default` | Vorne: "Slowed." "Yes." He is less willing to withdraw. Raise the DC of `propose_compact_withdrawal` by 2 with a roll penalty (file 03). |
| `act2_ch7_maret_and_missing:speak_to_lira:success` | She remembers her mother's face and loses it again by evening. |
| `act2_ch8_faction_reckoning:text.default` | Episodes are rarer. They have not stopped. Issa's grey has not moved. |
| `act3_ch2_rebuilding`, `act3_ch3_the_long_work`, `act3_ch4_resolution` | One sentence each: someone walks east each month to check the seal. In `resolution`, the fountain runs "some days". |
| All five endings | One closing paragraph: the seal is watched. Name who watches it in this ending. |

3. Mechanics for the partial seal (The Dimming stays at 30 and creeps) are in file 03, G8.
4. A full failure of the ritual is not offered. The worst case is the partial seal.

---

## N5 — Pay off the planted threads or cut them (High, large)

### Keep and pay off

**The Compact packet.** Accepted in `act1_ch3_compact_offer`, never delivered. Add a scene to `act1_ch6_scenes.json` between `act1_ch6_place_covenant_marker` and `act1_ch6_cursed_creature`. Both outcomes of the marker scene lead to a router scene that sends players with `carrying_compact_message` to the new scene and everyone else on.

- `act1_ch6_waystation` — "The Waystation". A lean-to and a mule. Sera is a quartermaster, not a spy, and she is frightened. Choices:
  - Hand over the packet → gold +20, `compact_message_delivered`, Compact reputation +5. She tells you a patrol went east nine days ago and did not come back.
  - Open it first (roll Dexterity DC 12): success → it is an order to prepare billets for thirty. Vorne is coming with a garrison, and Cael knew. Flag `knows_vorne_is_coming`. Then you can deliver or keep it. Failure → the seal tears, Sera sees, Compact reputation −10, no pay.
  - Keep walking → nothing. `compact_message_undelivered`.
- Callback: `act2_ch3_compact_checkpoint:invoke_compact_relationship` requires `compact_message_delivered`. Otherwise the soldier says, "Cael is asking about a packet."
- Callback: `knows_vorne_is_coming` adds a line to `act2_ch3_crestfall_news`: "You knew. You read the order on the road."

**The Covenant ward.** Give it a mechanical effect (file 03, G5) and one callback: in `act2_ch3_seriva_first_meeting:text.default`, guarded by `inventory: ["covenant_ward"]`: "Her eyes go to the cord at your neck. \"Edric gave you one of mine,\" she says. \"I made those. Twenty years ago.\""

**The bone figure, the Harrow papers and the Watcher (D5).**
- `act1_ch7_harrow_cellar:text.default`: add that the same small figures are carved into the wall, dozens of them.
- `act2_ch1_the_watcher_seen`: new choice, requires `inventory: ["carved_bone_figure"]`: "Set the bone figure on the ground in front of them." Outcome: their hand moves to it. They hold it. Flag `watcher_holds_figure`, `ruins_watcher` closeness +15, remove the item.
- `act2_ch5_return_to_ruins:text.default`: if `watcher_holds_figure`, the Watcher is turning the figure over and over.
- Act 3, all paths, one line: with `harrow_papers` or `read_harrow_records`, you find the name Joren in the old man's entries and say it to him. With `watcher_holds_figure` he answers.

**Sen and the river (D6).** New optional scene from `act2_ch3_crestfall_changed`: a fourth choice "Find Sen at the docks", requires `min_relationship: { dockworker_sen: 15 }`. Scene `act2_ch3_sen_river` at `crestfall_docks`, evening. He tells you about the boat and the woman. Flag `knows_seriva_came_early`. It leads to `act2_ch3_aldous_update`. Callback: in `act2_ch3_seriva_first_meeting`, a new choice requiring that flag: "You have been here three weeks longer than Vorne. Why?" It counts as the `seriva_responsible_confirmed` gate for `accuse_seriva_directly`.

**Branch and the record.** Commander only. See N13.

### Cut

Remove from the NPC `secret` fields in `act1_00_meta.json` (or mark `"unused": true`) so future passes do not chase them: Hanna's grain, Wren touching something at the forest edge, Aldous and Corvin seeing who the missing person left with, Lira's unspoken time in the ruins (the map she draws already covers it).

The "forty on completion" from Cael: pay it. In `act2_ch3_crestfall_changed` add a choice requiring `compact_allied`: "Report to Cael." Gold +40, Compact reputation +10, and Vorne starts `act2_ch4_vorne_meeting` knowing you were in the ruins (`vorne_knows_player_was_in_ruins`).

---

## N6 — Let people remember what you did (High)

Add one guarded paragraph or line per row. Keep each under 40 words.

| Scene | Condition | What is said |
|---|---|---|
| `act1_ch2_morning_crestfall:text.default` | `aldous_closed_off` | Aldous did not look up when you left this morning. |
| `act1_ch3_maret_first_meeting:text.default` | `knows_maret_name` | You have had her name from three mouths. None of them said it lightly. |
| `act1_ch4_maret_evening:text.default` | `lira_met` and `taken: ["act1_ch4_lira:just_sit_with_lira"]` | "Lira says you sat with her and asked nothing. That is rare." |
| `act1_ch5_faction_responses:text.default` | `helped_cursed_woman_market` | The Rootless man nods to you. He saw what you did. |
| `act1_ch6_departure_decision` (Cael's lines) | `compact_message_read` | "You read our mail and still took the job. I respect that." |
| `act1_ch7_maret_follows:text.default` | `maret_letter_withheld` | She is holding the letter. "This is yours. I was wrong to keep it." Grant `maret_letter_obtained`. |
| `act2_ch3_aldous_update:text.default` | `knows_still_man_is_wren` | The Wren paragraph stays. Else: "The still man by the fire is gone. You never learned his name. Aldous tells it to you now." |
| `act2_ch3_rootless_situation:text.default` | `maret_sent_back` | Maret, without looking up: "You were right to send me back. I have not forgiven you for it." |
| `act2_ch4_vorne_meeting:text.default` | `compact_suspicious` | "My checkpoint sergeant thinks you lied to him." |
| `act2_ch4_vorne_meeting:text.default` | `vorne_knows_player_was_in_ruins` | He starts with the ruins. He already knows. |
| `act2_ch7_vorne_reacts:text.default` | `issa_taken_by_compact` | Issa is in the next room. Worse than she was at the camp. He knows it. |
| `act2_ch7_vorne_reacts:text.default` | `issa_agreement_reached` | "My daughter asked after you." |
| `act2_ch8_faction_reckoning:text.default` | `seriva_agreement` | Seriva's leverage deal is already working: the grey flag is down. |
| `act2_ch8_faction_reckoning:call_a_meeting` | `seriva_admitted_guilt` | She admits it in the room. The settlement no longer absolves the Covenant. Change the success text accordingly. |
| `act3_ch2_rebuilding:text.default` | `lira_recovering` | Lira is running the herb stall on market days. |
| `act3_ch3_the_long_work:text.default` | `compact_aligned` / `rootless_aligned` | Whose notice is nailed to the fountain: the Compact's schedule or the camp's rota. |

Target after this pass: at least 60 flags read (`npm run validate` prints the count).

---

## N7 — Remove stage directions from the prose (High)

Replace each with guarded parts. Text in quotes is the wording to use.

| Where | Now | Replace with |
|---|---|---|
| `act2_ch3_crestfall_news:text.default` | "Maret — if she came with you — has news… If Maret is not with you:… Either way, the news is the same:" | `maret_joined`: "Maret is crouched at the edge of the clearing with a boy from the camp. He ran most of the night. She listens, sends him to the fire, and comes to you." Else: "A boy from the Rootless camp is sitting by the fire with a blanket round his shoulders. Maret sent him. He ran most of the night." Then: "The news: Commander Vorne has arrived in Crestfall." |
| `act1_ch7_decision_enter:text.default` | "The letter, if you have it." | `maret_letter_obtained`: "The letter, folded inside your coat." Else: "The letter Maret would not give you." |
| `act2_ch2_chamber_entrance:enter_chamber` | "the herbs, the ward if you carry it" | Three guarded sentences. `inventory: ["rootless_provisions"]`: "Maret's herbs, bitter under your tongue." `inventory: ["covenant_ward"]`: "Edric's ward, cold against your skin." Neither: "You have nothing but what [missing person] has told you." |
| `act2_ch2_chamber_entrance:prepare_first` | "The herbs, if you have them. The ward, if you carry it." | Same three sentences. |
| `act2_ch6_day_of_ritual:text.default` | "The herbs, the ward if you have it" | Same pattern. |
| `act1_ch7_maret_follows:text.default` | "on whichever side of the line you are" | `crossed_into_forest_first`: "She stops on the ordinary side of the line and looks at you standing in the silence." Else: "She stops beside you, an arm's length short of the line." |
| `act1_ch6_place_covenant_marker:text.default` | "You pause here regardless of whether you carry the marker stone." | With the stone: "Edric's stone is heavy in your pocket." Without: "You are not carrying Edric's stone. You stop anyway." |
| `act1_ch6_place_covenant_marker:do_not_place_marker` | "You note it in whatever way you note things" | "You fix the place in your memory" |
| `act1_ch6_departure_decision:text.default` | "navigated between them with whatever you have navigated with" | `compact_allied`: "You took the Compact's coin." `covenant_task_accepted`: "You carry the Covenant's stone." Neither: "You owe none of them anything, which is its own kind of position." (Both can show.) |
| `act2_ch3_crestfall_changed:find_rootless_camp` | "Maret, if she came back with you, is already there." | "Maret is already there." |
| `act1_ch5_curse_event:try_to_reach_her` (choice label) | "Use her name if someone gives it to you." | "Ask the old man her name. Try to reach her." |
| `act2_ch3_compact_checkpoint:text.default` | (new) | Guarded by `stayed_for_lesson`: "You stayed a day longer in the ruins than was wise. The barricade is taller than the runner described." |

---

## N8 — Write Maret as a companion (High)

If `maret_joined` is true she walks into the ruins with you and is then never mentioned. Three developer notes (`text.maret_note`) describe her scenes. Write them, then delete the notes.

| Scene | Add, guarded by `maret_joined` |
|---|---|
| `act2_ch1_ruins_outskirts:text.default` | She names the three paths. She found two of them. |
| `act2_ch1_first_cairn:text.default` | "That is their hand," Maret says. She does not touch the stone. |
| `act2_ch1_missing_person_approach:text.default` | Maret takes two steps back before they come through the gate. |
| `act2_ch1_reunion:text.default` | After you sit: they look past you. "Maret." "I should have come sooner." Nothing else yet. |
| `act2_ch2_decision_to_return:text.default` | Write the note: she waited in the outskirts. She would not go down. |
| `act2_ch3_crestfall_news` | Covered in N7. `send_maret_back` stays as the way she returns. If the player chooses `return_to_crestfall_immediately`, she walks back with you: add one line to that outcome. |
| `act2_ch5_return_to_ruins` | Maret is in Crestfall by now on every path. Delete the note. |
| `act2_ch7_maret_and_missing:text.default` | Guard the "first time" framing. With `maret_joined`: "They saw each other in the ruins and said almost nothing. This is the conversation." |
| `act3_ch2_alone_work` | Write the note as a normal paragraph. No guard needed. |

---

## N9 — One timeline (Medium)

Canon is in `00-START-HERE.md` section 7. Apply these edits.

| Where | Now | Change to |
|---|---|---|
| `act1_ch1_barge_arrival` (default and all four class passages) | "The barge docks before dawn" | "The barge docks at nightfall" |
| `CharacterCreation.tsx` summary | "docks at Crestfall before dawn" | "at nightfall" |
| `act1_ch2_market_square:talk_grain_seller:success` | "started two years ago in the eastern villages" | "started three years ago in the eastern villages" |
| `act1_ch3_covenant_warning:text.default` | "Three years ago it began to fail." | "Three years ago it failed." |
| `act1_ch4_branch:ask_branch_about_maret:success` | "Four years." | "Three years." |
| `act1_ch2_morning_crestfall:go_to_market` and `act1_ch2_market_square:text.default` | "Used to have twelve" / "built for fifteen" | Both say twelve. |
| `act1_ch6_missing_person_campsite` (default, arcane, ranger) | "recent, a few days old" / "Three to five days ago" | "Old. More than a year of leaf-fall has settled in the fire ring, and still nobody has kicked the stones apart." / "Fourteen months ago. Moving east." |
| `act1_ch6_missing_person_campsite:follow_the_trail` | "measured in days, not months" | "The trail is fourteen months cold and it is still a trail." |
| `act1_ch7_decision_enter:text.default` | "Crestfall, three days' walk" | "Crestfall, a day's walk" |
| `act1_ch4_maret_evening:text.default` | "You left when you were — what, seventeen? Eighteen? Why?" | "You were born here. You left. Why?" The class passages give the player different ages and careers (the Commander was once posted here), so no line may state an age. |
| `act1_ch3_covenant_task:text.default` | (new line, seeds Seriva) | Edric: "A senior scholar is coming from the capital. Seriva. She will want to know the stone was placed." |
| `act2_ch1_what_they_found:text.default` | "You think of Seriva — the Covenant scholar who was here twenty years ago." | "Twenty years. Edric said a scholar was coming from the capital. You wonder how old she is." |
| `act2_ch1_what_they_found:tell_about_crestfall` | "the new arrivals you heard about before you left Crestfall" | "the names you heard before you left: a Commander Vorne, expected. A scholar called Seriva, expected." |
| `act2_ch1_the_watcher_seen:text.default` | "You have heard this term from Maret without fully understanding it." | "The camp has a word for this. You heard it at the fire and did not ask." |
| `act1_ch6_departure_decision:visit_maret_before_leaving` | "a specific herb Pol prepared" | "a bitter herb prepared by Pol, the camp's healer" |
| `act2_ch3_pol_revelation:text.default` | "Pol is in the herb garden when you find her." | "Pol, the camp's healer, is in the herb garden. She is seventy and has said perhaps ten words to you." |
| `act2_ch3_aldous_update:text.default` | "seen in four days" / "walked east four days ago, the morning after the Compact arrived" | "seen in three days" / "walked east two days ago, the morning after Vorne arrived" |
| `act2_ch3_aldous_update:ask_about_issa` | "She arrived four days ago, just before the Compact did." | "She came to the camp three days ago, the night before Vorne rode in." |
| `act2_ch3_aldous_update:ask_about_seriva_behavior:success_at_cost` | "She burned the Covenant's files" | Delete the clause. Nothing supports it. |
| `act2_ch3_crestfall_changed` title | "Crestfall in Week Two" | "Crestfall, Occupied" |
| `act3_ch2_on_the_road:give_them_space` | quotes a line ("I want to just be in this room with you") that only the Cipher passage contains | Move that line into `act2_ch8_relationship_test:keep_some_things:default` as something they say, so the callback holds for every class. |
| `README.md` | Compact "three years ago"; Wren "six months ago" | Eight months; "two months ago he stopped talking". |

Also create `docs/story-bible.md` with the canon timeline, the six relationship rows, D1–D6, and one paragraph per named character. Future writing passes read it first.

---

## N10 — Vary the voice (Medium)

Counts in the current script: "specific" 140, "the specific quality of" 30, "of someone who" 57, "Not a question." 8, em dashes 525, contractions 7.

### Targets after the pass

| Pattern | Target |
|---|---|
| "specific" / "specifically" | 25 or fewer in the whole script |
| "the specific quality of" | 3 or fewer |
| "of someone who" / "with the X of someone who" | 15 or fewer |
| "Not a question." / "Not accusing." / "Not unkind." tags | 6 or fewer in total |
| "You note" / "You file" (outside Cipher asides) | 6 or fewer |
| Em dashes | Halve them. Prefer a full stop. |
| Paragraphs opening "You read" in Ranger and Cipher asides | 5 or fewer each |

Method: for each hit, first try deleting the phrase ("the specific stillness of someone who has decided" → "the stillness of a man who has decided"). If the sentence dies without it, replace the comparison with a concrete detail.

### Voice sheets

| Character | How they talk |
|---|---|
| Aldous | Contractions. Understatement. Talks about weather, prices and wood when he means people. Never asks a direct question. |
| Sen | Contractions. Unfinished sentences. Looks at the water. |
| Maret | Few contractions. Short declaratives. Answers the question behind the question. Says "your person". |
| Branch | No contractions. No softening. States time and number exactly. |
| Lira | Halting. Starts again mid-sentence. Concrete images. Says thank you. |
| Edric | Formal, complete sentences. Precise about probability. Never raises his voice. |
| Cael | Smooth, rehearsed, "we" not "I". |
| Vorne | Orders phrased as preferences. One-word questions. |
| Seriva | No contractions. Abstract nouns. Talks in costs and thresholds until she breaks. |
| Pol | Dry. Counts things. Plant comparisons. |
| Issa | Seventeen. Contractions. Clear about her father. |
| The missing person | Mixed. Careful first, plainer as Act 2 goes on. Uses "we" for the ritual. |

Add a script `tools/prose-stats.mjs` that prints the counts above. Put the before and after numbers in the PR.

---

## N11 — Give Act 3 a problem (Medium)

Each path gets one live conflict that starts in chapter 2, turns in chapter 3 and is settled in chapter 4. Each needs at least one choice with different destinations or a flag an ending reads.

**Stayed together (`player_stays_ashenveld`).** The returned. On Day 20 three people who walked east come back to the gate, thin and confused. The Compact wants them held at the post. Maret wants them at the camp. Choice in `act3_ch2_rebuilding` (replaces the three "focus" choices as the frame; keep those as the method). On Day 30 one of them is Wren. On Day 45 the fountain scene includes whichever decision you made. Flag: `returned_went_to_camp` or `returned_held_by_compact`.

**Left together (`player_leaves_ashenveld`).** The pull. On Day 20, [missing person] wakes sitting upright in the road, facing east, with no memory of moving (the traveller in Act 1 described the same thing). Choices: tell them, or watch for it to happen again. On Day 30 a letter from Maret arrives. With a partial seal it asks for help. On Day 45 decide: keep going or turn back. Flag: `turned_back_east`. If set, the escape ending gains a final paragraph on the east road.

**Sent ahead (`missing_person_sent_ahead`).** The letters stop for nine days. `act3_ch2_finishing_work` already has the letters. Add the gap, and a choice: leave now with the work unfinished, or finish. If you leave at once, they were ill at an inn and you arrive in time. If you finish, they have moved on and left a forwarding note. Both reach `act3_ch3_road_further`. With `player_stays_permanently`, add one bridging paragraph in `act3_ch3_the_long_work`, guarded by that flag: they read your honest letter and walked back. They arrive on Day 29.

**Stayed alone (`player_stays_alone`).** Joren wakes. On Day 20 the Watcher is brought to the camp. On Day 30 he says a full sentence, and it is a question about Harrow that someone has to answer. On Day 45 Maret offers you her list (D2) to keep, because she is afraid she will lose the memory that it matters. Choice: take it or refuse. Flag: `holds_marets_list`.

---

## N12 — Cut lines that break the fiction (Medium)

| Where | Now | Change |
|---|---|---|
| `act1_ch7_maret_confession:keep_moving_with_maret` | "Act I is ending. Whatever comes next is already beginning." | Delete both sentences. |
| `act1_ch7_act1_end` | Choice "Continue — Act II: The Deep" and "— End of Act I —" | Remove the choice and the scene's player-facing role. Make `act1_ch7_decision_enter:go_forward_into_ruins` lead to `act2_ch1_ruins_outskirts`, and move the four paragraphs of `act1_end` to the end of that outcome. File 05 (E6) shows the act card. |
| `act2_ch8_point_of_no_return:text.default` | "This is the point of no return. What you choose here shapes which ending is possible." | Delete. |
| `act3_ch1_leaving:talk_about_what_comes_next` | "You do not tell the reader which one — that is the last piece of Ashenveld that belongs to you and it stays yours." | "You pick one. You do not say why." |
| `act3_ch4_resolution_road:decide_what_next` | "it is not the reader's to know" | Delete the sentence. |
| `act3_ch4_resolution_alone` (Commander passage) | "it is the last thing in this story that belongs entirely to you" | "it is yours" |

Scene titles are shown to the player. Rename:

| Scene | Now | New title |
|---|---|---|
| `act1_ch5_faction_responses` | How Each Faction Responds | Three Answers |
| `act1_ch5_class_specific` | What You Notice | The List |
| `act1_ch7_decision_enter` | The Point of No Return | The Line |
| `act2_ch6_ritual_approach` | The Approach Phase | Acknowledgement |
| `act2_ch8_point_of_no_return` | The Choice That Determines Everything | The Sixteenth Morning |
| `act2_ch8_relationship_test` | What the Mechanism Showed You | The Good Wood |

---

## N13 — Write real class moments (Medium)

### The stub

`act1_ch5_class_specific:class_specific_skill` says "Use your specific abilities" and rolls Intelligence for everyone. Replace it with four class-gated choices. Each sets `found_pre_departure_insight` plus its own flag, and each flag is read once later.

| Class | Choice label | Roll | What you learn | Read later in |
|---|---|---|---|---|
| Commander | "Walk the Compact's perimeter after curfew. Count what they are guarding." | Perception 11 | Billets are being readied for thirty. `knows_vorne_is_coming` | `act2_ch3_crestfall_news` |
| Arcane | "Put your palm flat on the inn wall and listen properly." | Mana 12 | The note has a direction and a pulse, like breathing. `heard_the_note` | `act2_ch2_source_chamber` (+2 to study or examine) |
| Ranger | "Go to the east gate at midnight and read the road." | Perception 11 | Many feet going east, bare. One set coming back, booted. `read_the_east_road` | `act1_ch6_east_road_start` (skip the failure of the deer roll) |
| Cipher | "Sit with what Maret did not say." | Intelligence 11 | She speaks of the missing person in the present tense. She believes they are alive. `maret_believes_alive` | `act1_ch7_maret_follows` (a line) |

### Class-only choices

Add at least two per class per act. Use `requires: { class: "…" }`, no roll (the class is the cost), and a `locked_hint` so other classes see what they are missing (file 03, G12). Minimum set:

| Scene | Class | Choice | Result |
|---|---|---|---|
| `act1_ch3_compact_introduction` | Commander | "Ask his commission date and who signed it." | Cael stops performing. `cael_respects_rank`, Compact +5. |
| `act1_ch4_branch` | Commander | "You served. Which company?" | Branch knows your name from a casualty list he should not have seen. Closeness +20. |
| `act1_ch3_covenant_warning` | Arcane | "Trace the ward's pattern with a finger, without touching." | You see it is a survey grid, not a shield. `knows_ward_is_survey`. |
| `act1_ch6_place_covenant_marker` | Arcane | "Feel what the stone does when it touches the ground." | It draws the note toward it. The Covenant is mapping, not slowing. |
| `act1_ch6_cursed_creature` | Ranger | "Read its trail backwards instead." | You find where it comes from each day. Same flag as the success outcome. |
| `act1_ch7_forest_edge` | Ranger | "Walk the line for a hundred paces before crossing." | You find Maret's old cairns. `knows_marker_cairns`. |
| `act1_ch1_tallow_arrival` | Cipher | "Order a drink and ask about the price of lamp oil." | Aldous relaxes. Leads to `act1_ch1_innkeeper_success` without the roll. |
| `act1_ch3_maret_first_meeting` | Cipher | "Say the name and watch her hands, not her face." | Leads to `act1_ch4_maret_opens`. |
| `act2_ch4_issa_confrontation` | Commander | "Give the sergeant an order." | He obeys before he thinks. Leads to the negotiation. |
| `act2_ch2_source_chamber` | Arcane | "Listen to the thread." | You hear what was removed from the mechanism. `understands_fracture`. |
| `act2_ch3_compact_checkpoint` | Ranger | "Leave the road a mile early and come in through the alder brake." | You are not logged. `slipped_checkpoint`. |
| `act2_ch3_seriva_first_meeting` | Cipher | "Tell her what she is afraid you found." | Counts as `seriva_responsible_confirmed`. |
| Act 3, each path's chapter 2 scene | all four | One option each that uses the class to address that path's conflict (N11). | Sets the path's flag without a roll. |

---

## N14 — Give the Covenant a real path (Medium)

1. `act2_ch3_seriva_first_meeting:text.default`: Edric is in the room. He stands when Seriva sits.
2. New choice there, requires `knows_covenant_kills_afflicted`: "Say the number aloud, to Edric." Outcome: Edric has known the doctrine for thirty years and has never heard the count for Crestfall. Flag `edric_heard_the_count`, Covenant −5.
3. `act2_ch5_maret_conversation:send_message_back`: with `edric_heard_the_count`, the message goes to Edric as well, and the roll gains +3. On success add: "Edric locks the shrine's map room. Seriva loses a day finding another copy."
4. `act2_ch8_faction_reckoning`: add a fourth choice, requires `min_faction: { ashen_covenant: 10 }` or `edric_heard_the_count`: "Ask Edric to keep the seal." The Covenant, under Edric, becomes the seal's keeper and gives up the purification texts to Pol. Flags `covenant_aligned`. Reputation: Covenant +30, Compact −10, Rootless −5.
5. Endings read `covenant_aligned` for one paragraph: a grey-robed keeper walks east each month, and Edric has stopped saying "cleansed".

---

## N15 — Show the letter that starts the story (Medium)

The letter that brought you back is mentioned everywhere and never shown. There are two letters. Keep them distinct.

**Letter one** (sent fourteen months ago, the reason you returned). Show it in `act1_ch1_tallow_room:text.default`, before "You put out the lamp". Present it as a letter block (file 04, U14). Six variants by relationship, same skeleton:

> [player],
> I am in Crestfall. *(one line that only this relationship would write)*
> There is something under the forest and I think I can find it.
> I am not asking you to come.
> [missing person]

**Letter two** (left with Maret). `act1_ch4_maret_letter_success:text.default` currently summarises it as "three things". Show it instead:

> I found it. It is real and it is below the ruins.
> I am going in. I may not come out. I know that.
> Do not follow me. Not until you know more than I did.
> [player].

Remove the paragraph that restates the three points.

---

## N16 — Match the endings to the plan (Medium)

`act3_00_meta.json` lists 13 endings under `act3_branches`. Five scenes exist. Do not write eight more scenes. Reduce the plan to the five that exist and express the rest as guarded paragraphs.

1. Update `act3_branches.*.available_endings` to the five real IDs. Delete the unwritten entries from `endings`, or mark them `"folded_into": "<ending id>"`.
2. Add guarded closing paragraphs:

| Ending | Guard | Paragraph |
|---|---|---|
| `ending_stays_together` | `compact_aligned` | Order came back first. The camp is smaller and it files reports. |
| `ending_stays_together` | `rootless_aligned` | Use the existing `ending_warden_of_ashenveld` route instead. |
| `ending_escape_together` | `turned_back_east` | The last image is the east road, walked together. |
| `ending_escape_together` | neither `confronted_being_used` nor `full_disclosure_made` | "There is one thing you have still not said to them. There is time." |
| `ending_alone_legend` | `holds_marets_list` | You read Maret the first line every new moon. |
| `ending_alone_legend` | `health_below: 20` | Shorter days. Lira carries the ledger now. (This replaces the planned "Warden dies" ending.) |
| all | `ritual_partial` | See N4. |
| all | `covenant_aligned` | See N14. |

3. `ending_stays_together:text.default` mentions "Goran's old recommendation". Guard it with `visited: ["act1_ch2_old_friend"]`. Else: "the house on the north lane with the blue door".
4. Every ending's class passage becomes an aside under B1. Check each reads correctly after the default text and does not assume a different ending. The four class passages of `ending_alone_legend` and `ending_escape_together` must not say the missing person is beside you or absent in contradiction of the ending.

---

## N17 — The gender step (Polish)

AUTHOR DECISION, default: keep the step, add a third option, and use the answer.

- Options: Woman, Man, Neither. Store as `gender`.
- The game is in second person, so the only use is how others refer to you. Add tokens `[sir/ma'am]` → "ma'am", "sir", "traveller" and use it in Cael's and the checkpoint soldiers' speech (four or five lines).
- Add a fifth creation step, or a row under step 3: "How should we refer to [missing person]?" They / She / He. Store `missing_person.pronouns`. Add tokens `[they]`, `[them]`, `[their]`, `[They]` and verb helpers `[are]`, `[have]`, `[were]`. Convert the script. This is a large mechanical pass. Do it last and only if the author confirms; otherwise keep "they" throughout.

---

## N18 — Player-facing metadata and README (Polish)

- Rewrite every NPC `role` in the meta files as the player would describe them after meeting. Examples: Lira → "Works rope at the camp's edge"; Issa → "Seventeen. Vorne's daughter"; Pol → "The camp's healer. Used to keep the Covenant's archive"; Seriva → "Covenant scholar from the capital".
- Add a `name` and a one-line player-facing `description` to each inventory item.
- README: fix the timeline claims (N9), list four classes and five endings, replace "which choices are available to you" only after N13 is done.
