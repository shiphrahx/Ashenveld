#!/usr/bin/env node
// Content validator. Run with `npm run validate`. No dependencies.
// Exits 1 on any error. Warnings are printed and do not fail.

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const RES = [path.join(ROOT, 'public/resources'), path.join(ROOT, 'resources')]
  .find(p => fs.existsSync(path.join(p, 'master_scene_index.json')))
const OUT = path.join(ROOT, 'tools/out')

const errors = []
const warnings = []
const err = m => errors.push(m)
const warn = m => warnings.push(m)
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'))

// ── Allowed shapes ──────────────────────────────────────────────────────────
const KEYS = {
  scene: ['id', 'act', 'chapter', 'location', 'title', 'when', 'on_enter', 'requires', 'text', 'choices',
    'text_mode', 'route', 'ending', 'rest', 'objective'],
  choice: ['id', 'text', 'requires', 'roll', 'outcomes', 'once', 'locked_hint'],
  outcomes: ['default', 'success', 'success_at_cost', 'failure'],
  outcome: ['text', 'next_scene', 'state_changes'],
  on_enter: ['state_changes'],
  state_changes: ['flags', 'resources', 'relationships', 'factions', 'inventory', 'inventory_remove', 'world', 'counters'],
  resources: ['gold', 'health', 'max_health'],
  world: ['curse_spread', 'time_of_day', 'day', 'skip_days'],
  roll: ['stat', 'dc', 'bonus'],
  bonus: ['when', 'value', 'label'],
  when: ['part', 'day', 'skip_days', 'hide_clock'],
  condition: ['flags', 'inventory', 'class', 'min_relationship', 'max_relationship', 'min_faction', 'max_faction',
    'min_stat', 'relationship_type', 'visited', 'not_visited', 'taken', 'min_curse', 'max_curse', 'health_below',
    'min_gold', 'min_counter', 'max_counter', 'any', 'not'],
  route: ['when', 'next'],
  chapterFile: ['chapter', 'title', 'objective', 'scenes'],
  ending: ['id', 'title'],
}
const CLASSES = ['commander', 'arcane', 'ranger', 'cipher']
const STATS = ['strength', 'dexterity', 'stamina', 'intelligence', 'mana', 'charisma', 'perception']
const FACTIONS = ['iron_compact', 'ashen_covenant', 'rootless']
const PARTS = ['dawn', 'morning', 'midday', 'afternoon', 'evening', 'night']
const TOKENS = ['[missing person]', '[player]', '[relationship]']
const ENGINE_FLAGS = ['crestfall_afflicted']            // set by the engine, not the data
const STAGE_PHRASES = ['if you have', 'if you carry', 'if she came', 'whichever', 'the reader', 'your missing person']
// Known duplicate images, kept until the new art lands (docs/06-art.md A5).
const ALLOWED_DUPLICATES = [
  ['ashenveld_img_009_rootless_camp_established.png', 'ashenveld_img_010_rootless_camp_alone.png'],
  ['ashenveld_img_018_ruins_source_chamber.png', 'ashenveld_img_019_ruins_source_chamber_sealed.png'],
]

function checkKeys(obj, kind, where) {
  if (!obj || typeof obj !== 'object') return
  for (const k of Object.keys(obj)) if (!KEYS[kind].includes(k)) err(`${where}: unknown ${kind} key "${k}"`)
}

// ── Load ────────────────────────────────────────────────────────────────────
const index = read(path.join(RES, 'master_scene_index.json'))
const metas = [1, 2, 3].map(a => read(path.join(RES, `act${a}`, `act${a}_00_meta.json`)))
const locations = {}
const npcs = {}
for (const m of metas) {
  Object.assign(locations, m.locations ?? {}, m.new_locations ?? {}, m.new_locations_act3 ?? {})
  Object.assign(npcs, m.npcs ?? {}, m.new_npcs ?? {})
}
const items = index.inventory_items ?? {}

const scenes = new Map()          // id → { scene, file }
const texts = []                  // [where, string]
for (const act of ['act1', 'act2', 'act3']) {
  for (const f of fs.readdirSync(path.join(RES, act)).sort()) {
    if (!/_ch\d+_/.test(f)) continue
    const j = read(path.join(RES, act, f))
    checkKeys(j, 'chapterFile', f)
    if (j.objective) texts.push([`${f}:objective`, j.objective])
    for (const s of j.scenes) {
      if (scenes.has(s.id)) err(`${s.id}: defined twice (${scenes.get(s.id).file}, ${f})`)
      scenes.set(s.id, { scene: s, file: f })
    }
  }
}

// ── 1. Index matches files ──────────────────────────────────────────────────
for (const [id, ref] of Object.entries(index.scene_index)) {
  const s = scenes.get(id)
  if (!s) err(`${id}: in scene_index but in no chapter file`)
  else if (s.file !== ref.file) err(`${id}: scene_index says ${ref.file}, found in ${s.file}`)
}
for (const id of scenes.keys()) if (!index.scene_index[id]) err(`${id}: missing from scene_index`)

// ── Walkers ─────────────────────────────────────────────────────────────────
const flagsSet = new Set(ENGINE_FLAGS)
const flagsRead = new Set()
const flagsRequiredTrue = new Map()     // flag → first place it is required
const itemsGranted = new Set()
const itemsRequired = new Set()

function checkCondition(c, where) {
  if (!c || typeof c !== 'object') return
  checkKeys(c, 'condition', where)
  for (const [k, v] of Object.entries(c.flags ?? {})) {
    flagsRead.add(k)
    if (v !== false && !flagsRequiredTrue.has(k)) flagsRequiredTrue.set(k, where)
  }
  for (const i of c.inventory ?? []) { itemsRequired.add(i); if (!items[i]) err(`${where}: unknown item "${i}"`) }
  for (const k of [...Object.keys(c.min_relationship ?? {}), ...Object.keys(c.max_relationship ?? {})])
    if (!npcs[k]) err(`${where}: unknown relationship "${k}"`)
  for (const k of [...Object.keys(c.min_faction ?? {}), ...Object.keys(c.max_faction ?? {})])
    if (!FACTIONS.includes(k)) err(`${where}: unknown faction "${k}"`)
  for (const k of Object.keys(c.min_stat ?? {})) if (!STATS.includes(k)) err(`${where}: unknown stat "${k}"`)
  for (const cl of [c.class ?? []].flat()) if (!CLASSES.includes(cl)) err(`${where}: unknown class "${cl}"`)
  for (const id of [...(c.visited ?? []), ...(c.not_visited ?? [])]) if (!scenes.has(id)) err(`${where}: unknown scene "${id}" in visited`)
  for (const t of c.taken ?? []) {
    const [sid, cid] = t.split(':')
    if (!scenes.get(sid)?.scene.choices.some(ch => ch.id === cid)) err(`${where}: unknown choice "${t}" in taken`)
  }
  for (const x of c.any ?? []) checkCondition(x, where)
  if (c.not) checkCondition(c.not, where)
}

function walkRich(rt, where) {
  if (rt === undefined || rt === null) return
  if (typeof rt === 'string') { texts.push([where, rt]); return }
  if (!Array.isArray(rt)) { err(`${where}: text is neither a string nor a list`); return }
  for (const p of rt) {
    if (typeof p === 'string') { texts.push([where, p]); continue }
    for (const k of Object.keys(p)) if (!['when', 'text', 'else'].includes(k)) err(`${where}: unknown text part key "${k}"`)
    checkCondition(p.when, where)
    texts.push([where, p.text])
    if (p.else) texts.push([where, p.else])
  }
}

function checkChanges(sc, where) {
  if (!sc) return
  checkKeys(sc, 'state_changes', where)
  checkKeys(sc.resources, 'resources', where)
  checkKeys(sc.world, 'world', where)
  if (sc.world?.time_of_day && !PARTS.includes(sc.world.time_of_day)) err(`${where}: time_of_day "${sc.world.time_of_day}" is not a day part`)
  for (const k of Object.keys(sc.flags ?? {})) flagsSet.add(k)
  for (const k of Object.keys(sc.relationships ?? {})) if (!npcs[k]) err(`${where}: unknown relationship "${k}"`)
  for (const k of Object.keys(sc.factions ?? {})) if (!FACTIONS.includes(k)) err(`${where}: unknown faction "${k}"`)
  for (const i of sc.inventory ?? []) { itemsGranted.add(i); if (!items[i]) err(`${where}: unknown item "${i}"`) }
  for (const i of sc.inventory_remove ?? []) if (!items[i]) err(`${where}: unknown item "${i}"`)
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// ── Per scene ───────────────────────────────────────────────────────────────
for (const [id, { scene: s }] of scenes) {
  checkKeys(s, 'scene', id)
  if (!s.when) err(`${id}: no "when"`)                                        // 9
  else {
    checkKeys(s.when, 'when', id)
    for (const p of [s.when.part].flat()) if (!PARTS.includes(p)) err(`${id}: when.part "${p}" is not a day part`)
  }
  if (!locations[s.location]) err(`${id}: unknown location "${s.location}"`)   // 6
  checkKeys(s.on_enter, 'on_enter', id)
  checkChanges(s.on_enter?.state_changes, `${id}:on_enter`)
  checkCondition(s.requires, `${id}:requires`)
  if (s.ending) checkKeys(s.ending, 'ending', id)
  if (s.objective) texts.push([`${id}:objective`, s.objective])
  for (const k of Object.keys(s.text ?? {})) {
    if (k === 'default' || CLASSES.includes(k)) walkRich(s.text[k], `${id}:text.${k}`)
    else warn(`${id}: non-class key "${k}" inside text`)
  }
  for (const r of s.route ?? []) {
    checkKeys(r, 'route', `${id}:route`)
    checkCondition(r.when, `${id}:route`)
    if (!scenes.has(r.next)) err(`${id}: route.next "${r.next}" is not a scene`)   // 2
  }
  if (s.choices.length === 0 && !s.route?.length) err(`${id}: no choices and no route`)   // 11
  for (const c of s.choices) {
    const cw = `${id}:${c.id}`
    checkKeys(c, 'choice', cw)
    checkCondition(c.requires, cw)
    walkRich(c.text, `${cw}:text`)
    checkKeys(c.outcomes, 'outcomes', cw)
    if (c.roll) {
      checkKeys(c.roll, 'roll', cw)
      for (const st of [c.roll.stat].flat()) if (!STATS.includes(st)) err(`${cw}: unknown stat "${st}"`)
      for (const b of c.roll.bonus ?? []) {
        checkKeys(b, 'bonus', `${cw}:bonus`)
        checkCondition(b.when, `${cw}:bonus`)
        if (typeof b.value !== 'number' || !b.label) err(`${cw}: bonus needs a number value and a label`)
      }
      for (const k of ['success', 'success_at_cost', 'failure']) if (!c.outcomes[k]) err(`${cw}: rolled choice has no ${k} outcome`)   // 4
      const [a, b, d] = ['success', 'success_at_cost', 'failure'].map(k => c.outcomes[k])
      if (a && b && d && a.next_scene === b.next_scene && b.next_scene === d.next_scene
        && same(a.state_changes, b.state_changes) && same(b.state_changes, d.state_changes))
        warn(`${cw}: all three outcomes are identical`)
    } else if (!c.outcomes.default) err(`${cw}: unrolled choice has no default outcome`)
    for (const [k, o] of Object.entries(c.outcomes)) {
      const ow = `${cw}:${k}`
      checkKeys(o, 'outcome', ow)
      walkRich(o.text, `${ow}:text`)
      checkChanges(o.state_changes, ow)
      if (o.next_scene !== null && !scenes.has(o.next_scene)) err(`${ow}: next_scene "${o.next_scene}" is not a scene`)   // 2
    }
  }
}
for (const [id, def] of Object.entries(items)) texts.push([`item ${id}`, def.description ?? ''])

// ── Journal notes and leads ─────────────────────────────────────────────────
const notesPath = path.join(RES, 'notes.json')
const journalNotes = fs.existsSync(notesPath) ? read(notesPath) : { leads: [], notes: [] }
const NOTE_GROUPS = ['People', 'The Curse', 'The Ruins', 'The Factions']
journalNotes.leads.forEach((l, i) => { checkCondition(l.when, `notes.json lead ${i}`); texts.push([`notes.json lead ${i}`, l.text]) })
for (const n of journalNotes.notes) {
  flagsRead.add(n.flag)
  if (!NOTE_GROUPS.includes(n.group)) err(`notes.json ${n.flag}: unknown group "${n.group}"`)
  texts.push([`notes.json ${n.flag}`, n.text])
}

// ── 3. Reachability ─────────────────────────────────────────────────────────
const start = index.starting_scene
if (!scenes.has(start)) err(`starting_scene "${start}" is not a scene`)
const seen = new Set([start])
const queue = [start]
while (queue.length) {
  const s = scenes.get(queue.shift())?.scene
  if (!s) continue
  const next = [...(s.route ?? []).map(r => r.next), ...s.choices.flatMap(c => Object.values(c.outcomes).map(o => o.next_scene))]
  for (const n of next) if (n && !seen.has(n)) { seen.add(n); queue.push(n) }
}
for (const id of scenes.keys()) if (!seen.has(id)) err(`${id}: cannot be reached from ${start}`)

for (const n of journalNotes.notes) if (!flagsSet.has(n.flag)) err(`notes.json: note for "${n.flag}", which is never set`)

// ── 7. Flags required and never set ─────────────────────────────────────────
for (const [f, where] of flagsRequiredTrue) if (!flagsSet.has(f)) err(`${where}: flag "${f}" is required but never set`)

// ── 10. Unknown tokens; stage-direction phrases ─────────────────────────────
const phraseHits = Object.fromEntries(STAGE_PHRASES.map(p => [p, []]))
for (const [where, t] of texts) {
  for (const m of t.match(/\[[^\]\n]*\]/g) ?? []) if (!TOKENS.includes(m)) err(`${where}: unknown token ${m}`)
  const low = t.toLowerCase()
  for (const ph of STAGE_PHRASES) if (low.includes(ph)) phraseHits[ph].push(where)
}

// ── 8. Byte-identical images ────────────────────────────────────────────────
const imgDir = path.join(RES, 'images')
if (fs.existsSync(imgDir)) {
  const byHash = new Map()
  for (const f of fs.readdirSync(imgDir).filter(f => /\.(png|webp|jpe?g)$/i.test(f)).sort()) {
    const h = crypto.createHash('sha1').update(fs.readFileSync(path.join(imgDir, f))).digest('hex')
    if (byHash.has(h)) {
      const pair = [byHash.get(h), f]
      if (ALLOWED_DUPLICATES.some(p => same(p, pair))) warn(`images ${pair.join(' and ')} are identical (known, see docs/06-art.md A5)`)
      else err(`images ${pair.join(' and ')} are byte-identical`)
    } else byHash.set(h, f)
  }
}

// ── Warnings ────────────────────────────────────────────────────────────────
const unread = [...flagsSet].filter(f => !flagsRead.has(f) && !ENGINE_FLAGS.includes(f)).sort()
fs.mkdirSync(OUT, { recursive: true })
fs.writeFileSync(path.join(OUT, 'unread-flags.txt'), unread.join('\n') + '\n')
warn(`${unread.length} flags are set and never read (list in tools/out/unread-flags.txt)`)
for (const i of itemsGranted) if (!itemsRequired.has(i)) warn(`item "${i}" is granted and never required`)
const phraseLines = []
for (const [ph, hits] of Object.entries(phraseHits)) {
  if (!hits.length) continue
  warn(`${hits.length} texts contain "${ph}" (list in tools/out/stage-phrases.txt)`)
  phraseLines.push(`## ${ph}`, ...hits, '')
}
fs.writeFileSync(path.join(OUT, 'stage-phrases.txt'), phraseLines.join('\n'))

// ── Report ──────────────────────────────────────────────────────────────────
const quiet = process.argv.includes('--quiet')
if (!quiet) for (const w of warnings) console.log(`warn  ${w}`)
for (const e of errors) console.log(`error ${e}`)
console.log(`\n${scenes.size} scenes, ${flagsSet.size} flags set, ${flagsRead.size} flags read.`)
console.log(`${errors.length} errors, ${warnings.length} warnings.`)
process.exit(errors.length ? 1 : 0)
