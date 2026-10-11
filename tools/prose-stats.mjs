#!/usr/bin/env node
// Prose habits across the script. Run with `npm run prose`. No dependencies.
// Counts the patterns docs/02-narrative.md (N10) and the tone guide track,
// and words per scene (G15). --json prints the numbers for diffing.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const RES = [path.join(ROOT, 'public/resources'), path.join(ROOT, 'resources')]
  .find(p => fs.existsSync(path.join(p, 'master_scene_index.json')))

const CLASSES = ['commander', 'arcane', 'ranger', 'cipher']
const flat = rt => rt == null ? [] : typeof rt === 'string' ? [rt]
  : rt.flatMap(p => typeof p === 'string' ? [p] : [p.text, p.else].filter(Boolean))

// [where, kind, text] for every piece of story text
const pieces = []
const scenes = []
for (const act of ['act1', 'act2', 'act3']) {
  for (const f of fs.readdirSync(path.join(RES, act)).sort()) {
    if (!/_ch\d+_/.test(f)) continue
    for (const s of JSON.parse(fs.readFileSync(path.join(RES, act, f), 'utf8')).scenes) {
      scenes.push(s)
      for (const t of flat(s.text.default)) pieces.push([s.id, 'main', t])
      for (const c of CLASSES) for (const t of flat(s.text[c])) pieces.push([s.id, c, t])
      for (const ch of s.choices) {
        for (const t of flat(ch.text)) pieces.push([s.id, 'choice', t])
        for (const o of Object.values(ch.outcomes)) for (const t of flat(o.text)) pieces.push([s.id, 'outcome', t])
      }
    }
  }
}

const all = pieces.map(p => p[2]).join('\n\n')
const count = re => (all.match(re) ?? []).length
const countIn = (filter, re) => pieces.filter(filter).reduce((n, p) => n + (p[2].match(re) ?? []).length, 0)
const paraStarts = (cls, re) => pieces.filter(p => p[1] === cls).flatMap(p => p[2].split(/\n{2,}/)).filter(x => re.test(x.trim())).length

const stats = {
  'specific / specifically': count(/\bspecific(ally)?\b/gi),
  'the specific quality of': count(/the specific quality of/gi),
  'of someone who': count(/of someone who/gi),
  '"Not a question." / "Not accusing." / "Not unkind."': count(/Not (a question|accusing|unkind)\./g),
  '"You note" / "You file" outside Cipher asides': countIn(p => p[1] !== 'cipher', /\bYou (note|file)\b/g),
  'em dashes': count(/—/g),
  'paragraphs opening "You read" (Ranger)': paraStarts('ranger', /^You read\b/),
  'paragraphs opening "You read" (Cipher)': paraStarts('cipher', /^You read\b/),
  'contractions': count(/\b(\w+n't|(it|that|there|he|she|what|who|where|here|let)'s|I'm|(you|we|they)'re|(I|you|we|they|he|she|it)'(ll|ve|d))\b/gi),
  'for a long moment / time': count(/for a long (moment|time)/gi),
  'something in (his|her|their) face': count(/something in (his|her|their) face/gi),
  '"your missing person"': count(/your missing person/gi),
}

// Words per scene, main text plus the longest class aside (what one player reads).
// Relationship variants exclude each other, so only the longest counts; other
// guarded parts all count, which makes this an upper bound.
const words = t => (t.match(/[A-Za-z’'-]+/g) ?? []).length
function readerWords(rt) {
  if (rt == null) return 0
  if (typeof rt === 'string') return words(rt)
  let n = 0, variant = 0
  for (const p of rt) {
    if (typeof p === 'string') n += words(p)
    else if (p.when?.relationship_type) variant = Math.max(variant, words(p.text ?? ''))
    else n += Math.max(words(p.text ?? ''), words(p.else ?? ''))
  }
  return n + variant
}
const perScene = scenes.map(s => {
  const main = readerWords(s.text.default)
  const aside = Math.max(0, ...CLASSES.map(c => readerWords(s.text[c])))
  return { id: s.id, words: main + aside }
}).sort((a, b) => b.words - a.words)
const over220 = perScene.filter(s => s.words > 220)
const over260 = perScene.filter(s => s.words > 260)

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ stats, over220: over220.length, over260: over260.length }, null, 2))
} else {
  for (const [k, v] of Object.entries(stats)) console.log(`${String(v).padStart(5)}  ${k}`)
  console.log(`\n${over220.length} scenes over 220 words, ${over260.length} over 260 (main text plus the longest aside, one reader):`)
  for (const s of over220.slice(0, 25)) console.log(`  ${s.words}  ${s.id}`)
  if (over220.length > 25) console.log(`  … and ${over220.length - 25} more`)
}
