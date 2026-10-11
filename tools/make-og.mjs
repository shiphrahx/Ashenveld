#!/usr/bin/env node
// Builds public/og.jpg (1200×630) from the title screen, until key art exists (U18, A10).
// Run with `npm run og`. Starts its own dev server and stops it afterwards.
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PORT = 4190
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: ROOT, shell: true, stdio: 'ignore' })
const url = `http://localhost:${PORT}/Ashenveld/`
try {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(url)).ok) break } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 500))
  }
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
  await page.goto(url)
  await page.waitForTimeout(2500)                      // the title fades in
  await page.screenshot({ path: path.join(ROOT, 'public/og.jpg'), type: 'jpeg', quality: 82 })
  await browser.close()
  console.log('wrote public/og.jpg')
} finally {
  // On Windows the dev server runs under a shell, so stop the whole tree.
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' })
  else server.kill()
}
