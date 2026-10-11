#!/usr/bin/env node
// B22: art/legacy and art/source → public/resources/images/{name}@1x.webp (640 wide) and @2x.webp (1280 wide).
// Sources never go in public/. A file in art/source wins over a legacy file of the same name.
// Run with `npm run images`. Target: under 150 KB an image, under 3 MB for the set.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'public/resources/images')
const DIRS = ['art/legacy', 'art/source'].map(d => path.join(ROOT, d))
const SIZES = [['@1x', 640], ['@2x', 1280]]
const QUALITY = 78

const sources = new Map()
for (const dir of DIRS) {
  if (!fs.existsSync(dir)) continue
  for (const f of fs.readdirSync(dir).filter(f => /\.(png|jpe?g|webp)$/i.test(f))) sources.set(path.parse(f).name, path.join(dir, f))
}

fs.mkdirSync(OUT, { recursive: true })
let total = 0
const heavy = []
for (const [name, src] of [...sources].sort()) {
  for (const [suffix, width] of SIZES) {
    const out = path.join(OUT, `${name}${suffix}.webp`)
    // Never upscale: a source narrower than 1280 makes a @2x at its own width.
    await sharp(src).resize({ width, withoutEnlargement: true }).webp({ quality: QUALITY }).toFile(out)
    const kb = fs.statSync(out).size / 1024
    total += kb
    if (kb > 150) heavy.push(`${name}${suffix} ${kb.toFixed(0)} KB`)
  }
}
console.log(`${sources.size} images, ${(total / 1024).toFixed(2)} MB for the set`)
if (heavy.length) console.log(`over 150 KB:\n  ${heavy.join('\n  ')}`)
