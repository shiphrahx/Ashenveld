# 06 — Art (A1–A13)

Read `00-START-HERE.md` first.

**Order of work.** The images are made first. The code comes second.

1. **Part 1 is for the author.** Generate the new images and put them in `art/source/`.
2. **Part 2 is for Claude Code.** Run it once the images are in the folder. It replaces the old art with the new and wires everything else.

Part 2 also needs the responsive layout from `04-ui.md` (U1), because the layout sets the shape of the art frame.

## Who does what

| Item | What | Who |
|---|---|---|
| A1 | One viewpoint and style | Author: regenerate **every** image as one set (Part 1) |
| A2 | Art matches the writing | Author: prompts in Part 1 |
| A3 | Compose for the frame | Both: new shape (author), focal crop (code) |
| A4 | Show every image in the scenes it belongs to | Code |
| A5 | Replace the two duplicate files | Code deletes them. Author supplies a real sealed chamber |
| A6 | Show the town recovering | Code wires states. Author supplies the images |
| A7 | Time of day and deep forest | Code (CSS grading) |
| A8 | Portraits | Author. Code builds the slot and a fallback |
| A9 | Images that contradict the text | Author |
| A10 | Key image | Author. Code builds a stand-in |
| A11 | Bring palettes together | Code (grading), then author (prompts) |
| A12 | Items, factions, map | Code: these are drawn as SVG |
| A13 | Alt text | Code |

---

# Part 1 — for the author: make the images

## The short answer

Every image is redone. No old image is kept. That is the only way the set will look like one hand made it.

- **24 location images** replace the 22 current files and add the missing states.
- **1 wide key image** for the title and link previews.
- Optional: 1 extra location (the hidden passage) and 11 portraits.

## Step 1 — Lock the look with three anchor images

Do not start with the whole list. Make three images first and repeat them until you are happy:

1. `crestfall_docks` (town, night)
2. `crestfall_market_empty` (town, day)
3. `forest_edge` (forest)

Between them they fix the architecture, the daylight, the night, the trees and the palette. These three become the reference for every other image.

The look to aim for:

> Eye-level view, as if standing in the place. Painterly pixel art. Cold, desaturated blue-grey palette. At most one small warm light source. Empty or nearly empty of people. Quiet, not cosy.

## Step 2 — One tool, one setting, the anchors every time

Consistency comes from three habits:

- Use **one** image tool for the whole set. Do not mix tools.
- Keep the settings the same for every image: size, style strength, model version.
- Attach the three anchors as the style reference on **every** generation. Any current tool with a "style reference" or "image reference" feature can do this.

I cannot check which tools are best this month or what they cost.

## Step 3 — The shape

- **Size:** 2:3 portrait, at least 1024×1536. The same size for every image.
- **Safe box:** keep everything that matters inside the middle 70% of the width and the middle 40% of the height. On a desktop the game cuts the sides. On a phone it cuts the top and bottom.
- Leave the top and bottom fifth as calm sky, canopy, floor or water.
- No text, no borders, no interface elements in the image.
- No player and no missing person. The player defines them.

## Step 4 — Check the anchors before making the rest

For each anchor, check two crops by eye (any image viewer's crop tool will do):

- the middle 72% of the width at full height, and
- the full width at the middle 43% of the height.

The subject must survive both. Also view the three anchors side by side. If one looks like it came from a different game, redo it now. It is far cheaper than redoing twenty later.

## Step 5 — Make state changes by editing, not from scratch

For places that change, generate the base, then edit it (image-to-image or inpainting) so the composition stays identical:

- market: empty → mending → recovered
- inn: low fire → daytime → good fire
- source chamber: open → sealed
- camp: tents → established
- east road: going east → coming back

When the player sees the same square with three more stalls, the change reads. Three unrelated pictures of a market do not.

## Step 6 — The shot list

Put these two blocks at the start of every prompt, then add the scene line.

> **Style:** Eye-level view, painterly pixel art, muted cold blue-grey palette, overcast, soft low light, one small warm light source at most, quiet and still, 2:3 portrait, main subject centred, calm sky above and ground below.
>
> **World:** A poor river town of grey fieldstone, dark slate roofs and weathered oak. Soldiers wear grey-blue. The religious order uses plain grey cloth with no symbols. The camp is patched, undyed canvas. The ruins are a darker stone with a dry, salt-like surface.
>
> **Avoid:** isometric, top-down, tile map, cosy, bright saturated colour, crowds, text, borders, real-world religious symbols, glowing magic.

"Replaces" gives the number of the current file.

### Crestfall

| File name | Replaces | Scene line |
|---|---|---|
| `crestfall_docks` **(anchor)** | 001 | A river dock at nightfall. A rotting timber pier, cold dark water, one moored barge. A warehouse with its door hanging open on a broken hinge and a single lantern on the wall. Beyond, the town: a few lit windows, chimney smoke, a spire. |
| `crestfall_tallow_inn_low` | new | Interior of a low-beamed inn common room, seen from the door. A fire burning much lower than it should. Six tables, three of them occupied by single men sitting apart, seen as dark shapes. A bar at the left with one figure wiping it. Stairs at the right. Most of the room in shadow. |
| `crestfall_tallow_inn_day` | 003 | Edit of the low-fire inn. Grey window light. Fire nearly out. Chairs pulled to the centre of the room, away from the walls. Empty. |
| `crestfall_tallow_inn_warm` | 002 | Edit of the low-fire inn. The fire built high with good wood. More tables in use. The only warm interior in the set. |
| `crestfall_market_empty` **(anchor)** | 004 | A small market square built for twelve stalls. Only three are open, at one side. The other frames stand bare. A dry stone fountain in the centre with a bunch of grey dried flowers at its base. A bare tree. Beyond, a hall with a plain grey flag. Nobody lingering. |
| `crestfall_market_mending` | new | Edit of the empty market. Six stalls open. Seedlings planted in the soil round the fountain. A few people talking. Fountain still dry. |
| `crestfall_market_recovered` | 005 | Edit of the empty market. Nine stalls. The fountain running, cups along its rim, a child drinking. Soft morning light, a little warmer. |
| `crestfall_gate` | 006 | The east gate of the town, seen from inside looking out. A newer checkpoint built against old walls. Two soldiers standing very upright. A lamp above the arch. Beyond it the cobbles turn to mud, and then a tree line. |
| `crestfall_shrine` | 007 | Interior of an old town hall turned shrine. Rows of candles. Two bowls of ash. A carved, hooded figure with no face. One plain grey banner. No crosses and no other symbols. |
| `crestfall_compact_post` | 020 | An old stone granary on a town street, taken over by soldiers. New reinforced doors, a grey-blue flag, a lit window, three soldiers outside seen as shapes. A working building, not a castle. |
| `childhood_home_area` | 022 | A narrow lane running downhill past a crumbling mill wall. A stone terraced house with freshly painted shutters, window boxes of unfamiliar plants, and a door that is newer than its frame. Empty lane, grey sky. |

### Camp and road

| File name | Replaces | Scene line |
|---|---|---|
| `rootless_camp` | 008 | A camp at the edge of a forest, seen from the path in. Fifteen patched canvas tents among the first trees. A small central fire, the only warm light. A herb garden down one side, greener than anything else in the picture. A large man standing between two tents, seen as a shape. |
| `rootless_camp_established` | 009 | Edit of the camp. A new timber building with a small sign among the tents. Washing lines. More people. The same fire. |
| `east_road` | 011 | A forest road. Worn cobbles giving way to packed earth. Trees closing overhead until the sky is a thin strip. Grey, thin light. No birds, no animals, nothing glowing. |
| `east_road_return` | 012 | Edit of the east road. Low warm sun at the far end. Birds in the branches. No figures. |
| `abandoned_village_harrow` | 013 | The single street of a small village of twelve stone houses. Every house intact. One door standing open. Through a window, a table laid for a meal. A well. No people, no damage, no animals. Flat late-afternoon light. |
| `forest_edge` **(anchor)** | 014 | A forest seen from a road, split down the middle by a clear line. Left: ordinary trees, uneven, with colour in the leaves. Right: dark trunks at perfectly regular spacing, grey light, soft bare ground. Nothing moves on the right. |
| `west_road_leaving` | 021 | A paved road running west between autumn trees under a wide sky. Ordinary weather. No figures. |
| `elsewhere_market_town` | new | A small, ordinary market town far from the forest. A breakfast table outside an inn. Birds on a roofline. The warmest light in the set. |

### Ruins

| File name | Replaces | Scene line |
|---|---|---|
| `ruins_outskirts` | 015 | Deep forest. Broken worked stone pushing up through the forest floor like teeth. An archway with no building round it, framing grey sky. Three faint paths. Where they meet, a small fresh cairn with a scrap of cloth under the top stone. Even grey light with no direction. No fire. |
| `ruins_gate` | 016 | Two tall standing stones with a stone lintel, the remains of a gateway, in deep forest. A hooded figure in grey wool sits with their back against the right-hand stone, knees drawn up, face turned away. Grey light. |
| `ruins_inner_approach` | 017 | A stone passage sloping gently down. The walls, the ceiling and parts of the floor are covered edge to edge in dense carved script. Dark, smooth stone. A faint pale light from an opening ahead. No torch. |
| `ruins_source_chamber` | 018 | A large underground chamber, partly collapsed. Walls covered floor to ceiling in dense carved text and diagrams. In the centre a round mechanism of fused stone and metal about three metres across, split by a deep fracture. From the fracture a faint, pale thread rises and disperses. It is not fire and not smoke. The light comes from the stone itself. |
| `ruins_source_chamber_sealed` | new (019 was a copy) | Edit of the chamber. The thread is gone. A small dark fragment lies on the floor. The light is cooler and steady. The air looks clear. |
| `ruins_hidden_passage` (optional) | new | A narrow crack between two leaning walls going down into the dark. Dozens of small human figures scratched into the stone at hand height. |

Current file 010 is a copy of 009. It has no replacement.

### Key image

| File name | Replaces | Scene line |
|---|---|---|
| `key_art` (16:9, at least 1920×1080) | new | A river barge approaching a small lamplit town at nightfall, seen from the water. A dark forest rising behind the town, far larger than it. A few lit windows. Wide, quiet, a lot of sky. Leave the upper centre empty for the title. |

### Portraits (optional, A8)

Square, 768×768, head and shoulders, plain dark background, same Style and World blocks, lit from one side.

| File name | Description from the script |
|---|---|
| `maret` | A woman in her thirties, weathered by years outdoors. Looks straight at you. No expression offered. |
| `innkeeper_aldous` | An innkeeper of about sixty. Tired, careful. A cloth over one shoulder. |
| `branch` | A big, unhurried former soldier. Still. Plain clothes. |
| `lira` | A woman in her twenties. Careful where she used to be quick. Rope in her hands. Eyes a little unfocused. |
| `priest_edric` | A composed man in his fifties in grey. Settled, not smug. |
| `lieutenant_cael` | A young officer, too upright. Smiles with the lower half of his face only. |
| `commander_vorne` | A large man in his fifties who has not slept well for weeks. |
| `seriva` | A compact woman in her sixties, used to being deferred to. |
| `the_archivist` | Pol. Seventy. Dry, exact. Soil on her hands. |
| `issa_vorne` | Seventeen. Grey at her fingertips. Sharper than she looks. |
| `dockworker_sen` | A greying dockworker. Looks past you at the water. |

Do not make portraits of the player or the missing person.

## Step 7 — Quality check for each image

Reject and redo an image if any of these is true:

- The view is from above, or the horizon tilts.
- Buildings bend, doors float, stairs lead nowhere.
- The "pixels" are different sizes in different parts of the picture.
- There is lettering, a signature or a watermark.
- It is warmer or more colourful than the anchors.
- It shows a face clearly enough to be a character.
- It disagrees with its scene line (count the stalls, the tents, the tables).

## Step 8 — Hand over

1. Name each file exactly as in the tables, as PNG.
2. Put them in `art/source/` in the repo (portraits in `art/source/portraits/`).
3. You do not need every image on day one. Anything missing falls back to the old picture of that place, and Claude Code lists what is still missing.
4. Give this file to Claude Code and ask it to run Part 2.

## If you would rather not generate

- **Commission a pixel artist** for the whole set, or for the three anchors and the six most-seen places (inn, market, camp, east road, ruins outskirts, source chamber).
- **Hybrid:** generate, then pay an artist for a paint-over pass so the set shares one hand.
- Whichever route you take, check the licence terms of the tool or the commission if the game might ever be sold.

---

# Part 2 — for Claude Code: install the new art

Run this after the author has put images in `art/source/`.

Needs: file 01 section 0 (`Condition`), B8 (time of day), B10 (merged locations), B22 (image pipeline), and file 04 U1 (responsive layout).

## A.0 Take stock first

1. List the PNG files in `art/source/` and `art/source/portraits/`.
2. Compare them with the file names in the Part 1 shot list. Print a table: present, missing, and unexpected names.
3. Fix obvious naming slips (wrong case, spaces, a `.jpg` extension) by renaming. Do not guess at anything else. Ask the author.
4. Carry on with whatever is present. The manifest's fallbacks cover the gaps. Put the "missing" list in the PR description.
5. Open each new image and look at it. Check it against the list in Part 1, step 7, and against its scene line. Report these. Do not block on them.

## A.1 Two more condition fields

Add to `Condition` and `meets()`:

```ts
part?: DayPart[]      // world.time_of_day is one of these
min_day?: number      // world.day >= n
```

## A.2 The art manifest

Delete `src/data/imageMap.ts` and the special cases in `src/hooks/useLocationImage.ts`. Replace both with one data file, `public/resources/art.json`, loaded by `initLoader`.

```ts
export interface ArtVariant { image: string; when?: Condition }
export interface ArtEntry {
  alt: string
  focus?: [number, number]          // focal point in %, default [50, 50]
  baked?: DayPart                   // the image already depicts this time: skip time grading
  lights?: Array<{ x: number; y: number; r: number; color: string }>   // file 05, E8
  variants: ArtVariant[]            // first match wins. The last has no `when`
}
export type ArtManifest = Record<string, ArtEntry>   // key = location id
```

`resolveArt(locationId, state)`: take the entry, return the first variant whose `when` passes **and whose file exists**. To know which files exist, generate `public/resources/images/index.json` (a list of base names) in `tools/optimize-images.mjs`. A missing file falls through to the next variant, so the manifest can name images that have not been made yet.

Rename the image files to their keys and drop the numeric prefix (`ashenveld_img_004_crestfall_market.png` → `crestfall_market.png`). Keep originals in `art/source/`.

### Manifest content

Every image in the manifest now comes from the author's new set. No old image is kept.

For `focus`, `lights` and `alt`: the values below describe the old images. Treat them as placeholders. Rewrite each `alt` to describe the new picture. Open each new image, set `focus` on its main subject, and record each fire or lantern in `lights` as position and radius in percentages.

```jsonc
{
  "crestfall_docks": { "alt": "The Crestfall docks at night. A lantern on a warehouse wall, a moored boat, the moon over the far bank.",
    "focus": [55, 45], "baked": "night", "lights": [{ "x": 62, "y": 44, "r": 14, "color": "#ff9a3c" }],
    "variants": [{ "image": "crestfall_docks" }] },

  "crestfall_tallow_inn": { "alt": "The common room of the Tallow Inn.", "focus": [50, 40],
    "variants": [
      { "image": "crestfall_tallow_inn_warm", "when": { "any": [{ "flags": { "ritual_done": true } }, { "min_day": 15 }] } },
      { "image": "crestfall_tallow_inn_day",  "when": { "part": ["dawn", "morning", "midday", "afternoon"] } },
      { "image": "crestfall_tallow_inn_low" } ] },

  "crestfall_market": { "alt": "Crestfall market square and its fountain.", "focus": [50, 55],
    "variants": [
      { "image": "crestfall_market_recovered", "when": { "min_day": 45 } },
      { "image": "crestfall_market_mending",   "when": { "min_day": 30 } },
      { "image": "crestfall_market_empty" } ] },

  "childhood_home_area": { "alt": "A narrow lane of stone houses under a grey sky. One door has been repainted.", "focus": [70, 60],
    "variants": [{ "image": "childhood_home_area" }] },

  "crestfall_gate": { "alt": "The east gate of Crestfall. Two Compact soldiers and a brazier under the arch.", "focus": [50, 55],
    "lights": [{ "x": 62, "y": 78, "r": 10, "color": "#ff8a2a" }], "variants": [{ "image": "crestfall_gate" }] },

  "crestfall_shrine": { "alt": "Inside the Covenant shrine. Rows of candles, two ash bowls, a hooded figure with no face.", "focus": [50, 50],
    "variants": [{ "image": "crestfall_shrine" }] },

  "crestfall_compact_post": { "alt": "The old granary, now the Iron Compact post. A grey flag, a lit doorway, soldiers outside.", "focus": [55, 55],
    "variants": [{ "image": "crestfall_compact_post" }] },

  "rootless_camp": { "alt": "The Rootless camp at the forest's edge. Tents around a central fire.", "focus": [50, 55],
    "variants": [
      { "image": "rootless_camp_established", "when": { "min_day": 20, "flags": { "ritual_done": true } } },
      { "image": "rootless_camp" } ] },

  "east_road": { "alt": "The east road under a closed canopy. The trees stand too close.", "focus": [50, 50],
    "variants": [{ "image": "east_road" }] },
  "east_road_return": { "alt": "The east road walked west. Low sun at the end of it.", "focus": [50, 55],
    "variants": [{ "image": "east_road_return" }, { "image": "east_road" }] },

  "abandoned_village_harrow": { "alt": "Harrow. Twelve intact houses, open doors, nobody.", "focus": [50, 55],
    "variants": [{ "image": "abandoned_village_harrow" }] },

  "forest_edge": { "alt": "The line where ordinary trees stop and the dark, evenly spaced trees begin.", "focus": [50, 50],
    "variants": [{ "image": "forest_edge" }] },

  "ruins_outskirts": { "alt": "Broken arches and worked stone pushing through the forest floor. A small cairn.", "focus": [50, 55],
    "variants": [{ "image": "ruins_outskirts" }] },
  "ruins_gate": { "alt": "Two standing stones and a lintel. A figure sits against one of them, knees drawn up.", "focus": [55, 60],
    "variants": [{ "image": "ruins_gate" }, { "image": "ruins_outskirts" }] },
  "ruins_hidden_passage": { "alt": "A narrow passage going down. Small figures are scratched into the walls.", "focus": [50, 50],
    "variants": [{ "image": "ruins_hidden_passage" }, { "image": "ruins_inner_approach" }] },
  "ruins_inner_approach": { "alt": "A descending stone passage covered in carvings, lit by one torch.", "focus": [45, 50],
    "lights": [{ "x": 70, "y": 42, "r": 10, "color": "#ffb04a" }], "variants": [{ "image": "ruins_inner_approach" }] },
  "ruins_source_chamber": { "alt": "The source chamber. A broken mechanism at its centre.", "focus": [50, 50],
    "variants": [
      { "image": "ruins_source_chamber_sealed", "when": { "flags": { "ritual_done": true } } },
      { "image": "ruins_source_chamber" } ] },

  "west_road_leaving": { "alt": "A paved road running west between autumn trees.", "focus": [50, 55],
    "variants": [
      { "image": "elsewhere_market_town", "when": { "min_day": 30 } },
      { "image": "west_road_leaving" } ] }
}
```

## A.3 Replace the old images (A1, A4, A5)

1. Move all 22 current files from `resources/images/` to `art/source/old/`. Nothing in `old/` is published. No old image is kept in the game once its replacement exists.
2. For each manifest image that the author has **not** supplied yet (see A.0), copy the old picture of that place in under the new name, so the game still shows something. Use this table. List every such stand-in as "still old art" in the PR.

| New name | Stand-in from old file |
|---|---|
| `crestfall_docks` | 001 |
| `crestfall_tallow_inn_low`, `crestfall_tallow_inn_warm` | 002 |
| `crestfall_tallow_inn_day` | 003 |
| `crestfall_market_empty`, `crestfall_market_mending` | 004 |
| `crestfall_market_recovered` | 005 |
| `crestfall_gate` | 006 |
| `crestfall_shrine` | 007 |
| `rootless_camp` | 008 |
| `rootless_camp_established` | 009 |
| `east_road` | 011 |
| `east_road_return` | 012 |
| `abandoned_village_harrow` | 013 |
| `forest_edge` | 014 |
| `ruins_outskirts` | 015 |
| `ruins_gate` | 016 |
| `ruins_inner_approach` | 017 |
| `ruins_source_chamber`, `ruins_source_chamber_sealed` | 018 |
| `crestfall_compact_post` | 020 |
| `west_road_leaving` | 021 |
| `childhood_home_area` | 022 |
| `elsewhere_market_town`, `ruins_hidden_passage` | none. The manifest falls back to another place |

3. Old files 010 and 019 are exact copies of 009 and 018. They are not used.
4. Run `npm run art` (the script from B22). It writes the web versions and `images/index.json`.
5. Apply the `location` changes from the time table in file 01 (B8), if that work has not already done it: `act1_ch2_childhood_home` → `childhood_home_area`; the four reunion scenes → `ruins_gate`; `act2_ch7_aftermath_crestfall` → `east_road_return`; the five leaving scenes → `west_road_leaving`.
6. Delete `src/data/imageMap.ts` and the old `resources/images/` folder.

### One finish for the whole set (optional, ask the author first)

Generated "pixel art" often has pixels of uneven size and a slightly different palette in each picture. A shared finish hides that. If the author agrees, add a step to `tools/optimize-images.mjs`, applied to every image in the same way:

1. Downscale to 256×384 with nearest-neighbour sampling. Every image now has the same pixel size.
2. Build one palette of 48 colours from the three anchor images (`crestfall_docks`, `crestfall_market_empty`, `forest_edge`) and map every image onto it without dithering.
3. Upscale by a whole number (×4, then ×5 for the large size) with nearest-neighbour sampling.

Show the author a before and after of the three anchors in `docs/art-review.html` and let them choose. Keep the untouched files in `art/source/`.

## A.4 `SceneArt` changes (A3)

- Use `resolveArt`. Set `object-position` from `focus`. Set `alt` from the manifest.
- The art area's shape changes by layout (file 04, U1): about 1:2 on wide screens, about 3:2 on phones. With a 2:3 source and the focal point, both crops work.
- Keep the two-layer cross-fade. Key it on the image name, not the location, so a state change in the same place also fades.
- `srcSet` as in B22.

## A.5 Grading in CSS (A7, A11)

Tune this against the new images, not the old ones. The numbers below are starting points.

- Measure first. With `sharp`, compute the mean saturation of each new image. If the set's average is below 0.30, the art is already cold: turn the palette bridge down to `saturate(0.96)` and the overlay to 6%, or remove it.
- After setting values, look at every image in `docs/art-review.html` (A.9) by day, at night and at The Dimming 90. Nothing should go muddy or unreadable. Faces of buildings and the main subject must still separate from the background at night.

One wrapper around the image carries three filters, composed in this order.

1. **Palette bridge, always on.** Pull the warm, saturated art toward the cold interface: `saturate(0.88)`, plus an overlay layer `background: #0e1520; mix-blend-mode: color; opacity: 0.14`.
2. **Time of day.** Skip when the entry has `baked`.

| Part | Filter | Overlay |
|---|---|---|
| dawn | `brightness(0.92) sepia(0.10)` | `#6a7fa8` at 10%, `soft-light` |
| morning | none | none |
| midday | `brightness(1.04)` | none |
| afternoon | `sepia(0.08)` | none |
| evening | `brightness(0.82) sepia(0.18) saturate(1.05)` | `#3a2a4a` at 16%, `multiply` |
| night | `brightness(0.58) saturate(0.7)` | `#0d1828` at 35%, `multiply` |

3. **The Dimming and the deep forest.** File 05, E4.

Warm light layers (`lights`, file 05 E8) sit above the grading so fires and lanterns stay warm. That is the intended contrast: cold world, small warm lights.

## A.6 Portrait slot (A8)

- New component `Portrait.tsx`: looks for `public/resources/portraits/{npcId}.webp` (listed in the same generated index). If present, shows it in a square with a 1px border.
- Fallback: a tile with the character's initial in Cinzel on `--blue-faint`, with a 2px top edge in the faction's colour (Compact `--blue-steel`, Covenant `#8a8f98`, Rootless `#6f8a66`, none `--border-lit`).
- Use it in the People panel (file 04, U11) at 56px, and beside the first quoted line of a named speaker in a scene at 32px. The second use is behind a setting, default off, until portraits exist.
- Never render a portrait for the player or `the_missing_person`. Use a plain silhouette tile for the latter.

## A.7 Things to draw as SVG (A12)

These are vector work. Claude Code makes them. Match the existing sidebar icons: 24px viewBox, 1.5px stroke, round caps, no fill.

- **Ten item icons**, keyed by item ID: ward (disc on a cord), marker stone, map, provisions (bundle), bone figure, cloth note, papers, cellar map (carved wall fragment), notes, mechanism fragment.
- **Three faction marks**: Iron Compact (a gate with a bar across), Ashen Covenant (a bowl with a plain circle above it), Rootless (a tent line and a small flame). Use them in the sidebar, the People panel and the map.
- **Six day-part glyphs** (file 04, U9).
- **The map.** Redraw `Map.tsx` as an illustrated SVG: a river on the west edge, a town cluster, a road east, a tree line that thickens, broken stone marks for the ruins. Use a light `feTurbulence` displacement on strokes so lines look hand-drawn, and a parchment-dark fill (`#0b0f16`). Maret says "Lira drew it", so once `rootless_map` is held, add Lira's marks: small crosses and a dotted safe path in the outskirts.
- **Favicon** (file 04, U18).

## A.8 Key image stand-in (A10)

Until the author supplies key art: build `og.jpg` (1200×630) with a Playwright script that screenshots the title screen. When `art/source/key_art.png` exists, the image script crops it to 1200×630 for `og.jpg` and to 16:9 for the title background (shown at 35% opacity behind the title, with the existing radial gradient on top).

## A.9 Review page

New file `docs/art-review.html` (served in dev only, excluded from the build). For every manifest entry and variant it shows the image in three frames side by side: the wide-screen column (444×920), the phone banner (390×253), and a People-size thumbnail, each with the focal point and grading applied, plus a toggle for night and for The Dimming at 0, 50 and 90. Use it yourself to check A.4 and A.5, and attach a screenshot of it to the PR so the author can see every image in place. Mark missing files with a labelled placeholder.

## A.10 Validator additions

- Every `location` used by a scene has a manifest entry.
- Every manifest entry's last variant exists on disk.
- Warn (do not fail) for each variant whose file is missing, and list them as "art still needed".
- Fail on byte-identical image files.
- Every entry has `alt` text of at least 20 characters.
