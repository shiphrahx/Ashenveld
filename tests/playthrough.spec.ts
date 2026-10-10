import { test, expect, type Page } from '@playwright/test'

// Scripted playthroughs. Each always takes the first available choice, except
// where a test names a choice for a scene. Randomness is stubbed so rolls are fixed.

const FINAL = 'act2_ch8_point_of_no_return'
// The script still has "if she came with you" until the story pass (N7) removes it.
const STAGE_DIRECTIONS_FIXED = false

async function stubRandom(page: Page, value: number) {
  await page.addInitScript(v => { Math.random = () => v }, value)
}

function watchConsole(page: Page): string[] {
  const errors: string[] = []
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', e => errors.push(String(e)))
  return errors
}

async function createCharacter(page: Page, cls: string, name = 'Tam', missing = 'Ines') {
  await page.goto('./')
  await page.getByRole('button', { name: /^(begin|new game)$/i }).click()
  const again = page.getByRole('button', { name: /start again/i })
  if (await again.count()) await again.click()
  await page.getByText('Woman', { exact: true }).click()
  await page.getByRole('button', { name: /next/i }).click()
  await page.getByText(`The ${cls}`, { exact: true }).first().click()
  await page.getByRole('button', { name: /next/i }).click()
  await page.locator('input').first().fill(missing)
  await page.getByRole('button', { name: 'Sibling', exact: true }).click()
  await page.getByRole('button', { name: /next/i }).click()
  await page.locator('input').first().fill(name)
  // The last step and the summary both say "Enter Ashenveld".
  for (let i = 0; i < 3; i++) {
    if (await page.locator('[data-scene-id]').count()) break
    const enter = page.getByRole('button', { name: /enter ashenveld/i })
    if (await enter.count()) await enter.first().click()
    await skipInterstitials(page)
    await page.waitForTimeout(150)
  }
  await expect(page.locator('[data-scene-id]')).toBeVisible()
}

/** Act cards and similar full-shell pauses. */
async function skipInterstitials(page: Page) {
  const card = page.locator('[data-interstitial] button')
  if (await card.count()) await card.first().click()
}

const sceneId = (page: Page) => page.locator('[data-scene-id]').first().getAttribute('data-scene-id')

/** Click a choice, continue through the dice panel and the outcome. */
async function pickChoice(page: Page, choiceId: string) {
  await page.locator(`[data-choice-id="${choiceId}"]`).click()
  for (let i = 0; i < 400; i++) {
    const dice = page.locator('[data-dice-continue]')
    if (await dice.count()) { await dice.first().click(); continue }
    const cont = page.locator('[data-choice-id="continue"]')
    if (await cont.count()) {
      await cont.first().click()
      await expect(cont).toHaveCount(0)
      return
    }
    await page.waitForTimeout(20)
  }
  throw new Error(`no outcome after ${choiceId}`)
}

interface RunResult { ending: string | null; visits: Record<string, number> }

async function playToEnd(page: Page, picks: Record<string, string | number> = {}): Promise<RunResult> {
  const visits: Record<string, number> = {}
  for (let step = 0; step < 300; step++) {
    await skipInterstitials(page)
    const ending = page.locator('[data-ending-id]')
    if (await ending.count()) return { ending: await ending.getAttribute('data-ending-id'), visits }

    const id = await sceneId(page)
    if (!id) { await page.waitForTimeout(50); continue }
    visits[id] = (visits[id] ?? 0) + 1

    const text = await page.locator('[data-scene-id]').innerText()
    expect(text, `raw placeholder in ${id}`).not.toMatch(/\[missing person\]|\[player\]/)
    if (STAGE_DIRECTIONS_FIXED) expect(text, `stage direction in ${id}`).not.toMatch(/if she came with you/)
    expect(await page.locator('[data-location-name]').innerText(), `raw location id in ${id}`).not.toMatch(/_/)

    const choices = page.locator('[data-choice-id]:not([disabled]):not([aria-disabled="true"])')
    await expect(choices.first()).toBeVisible()
    const ids = await choices.evaluateAll(els => els.map(e => e.getAttribute('data-choice-id')!))
    const want = picks[id]
    const pick = typeof want === 'number' ? ids[want] : (want && ids.includes(want) ? want : ids[0])
    await pickChoice(page, pick)
  }
  throw new Error('no ending after 300 choices')
}

const ENDINGS: Array<{ cls: string; final: number; random: number; expect: string; picks?: Record<string, string> }> = [
  { cls: 'Commander', final: 0, random: 0.95, expect: 'ending_stays_together' },
  { cls: 'Arcane', final: 1, random: 0.02, expect: 'ending_escape_together' },
  // Sent ahead, then decide to stay and side with the camp. Without this the
  // sent-ahead path reaches the same ending as leaving together.
  { cls: 'Ranger', final: 2, random: 0.95, expect: 'ending_warden_of_ashenveld',
    picks: { act3_ch2_finishing_work: 'realise_you_are_staying', act2_ch8_faction_reckoning: 'choose_rootless_side' } },
  { cls: 'Cipher', final: 3, random: 0.02, expect: 'ending_alone_legend' },
]

for (const run of ENDINGS) {
  test(`${run.cls}, final choice ${run.final}, reaches an ending`, async ({ page }) => {
    const errors = watchConsole(page)
    await stubRandom(page, run.random)
    await createCharacter(page, run.cls)
    const { ending, visits } = await playToEnd(page, { [FINAL]: run.final, ...run.picks })
    expect(ending).toBe(run.expect)
    const repeated = Object.entries(visits).filter(([, n]) => n > 3)
    expect(repeated, 'scenes visited more than three times').toEqual([])
    expect(errors).toEqual([])
    await expect(page.getByText('An ending', { exact: true })).toBeVisible()
  })
}

test('the four expected endings are all different', () => {
  expect(new Set(ENDINGS.map(r => r.expect)).size).toBe(ENDINGS.length)
})

test('saves survive a reload and Return to Title', async ({ page }) => {
  const errors = watchConsole(page)
  await stubRandom(page, 0.5)
  await createCharacter(page, 'Cipher')
  for (let i = 0; i < 5; i++) {
    const first = page.locator('[data-choice-id]:not([disabled])').first()
    await pickChoice(page, (await first.getAttribute('data-choice-id'))!)
  }
  const snapshot = async () => page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('ashenveld_save')!)
    return { scene: s.current_scene, day: s.world.day, time: s.world.time_of_day, gold: s.player.resources.gold, health: s.player.resources.health, inv: s.inventory }
  })
  const before = await snapshot()
  for (let i = 0; i < 3; i++) {
    await page.reload()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page.locator(`[data-scene-id="${before.scene}"]`)).toBeVisible()
    expect(await snapshot()).toEqual(before)
  }
  await page.getByRole('button', { name: /menu/i }).first().click()
  await page.getByRole('button', { name: /return to title/i }).first().click()
  const confirm = page.getByRole('button', { name: /return to title/i })
  if (await confirm.count()) await confirm.last().click()
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test('story text and choices fit a phone screen', async ({ browser }) => {
  // The layout is fixed-width until U1 (step 4) makes it responsive.
  test.fixme(true, 'needs the responsive layout from U1')
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await createCharacter(page, 'Ranger')
  const width = 390
  const para = await page.locator('[data-scene-id] p').first().boundingBox()
  expect(para!.x).toBeGreaterThanOrEqual(0)
  expect(para!.x + para!.width).toBeLessThanOrEqual(width)
  for (const box of await page.locator('[data-choice-id]').evaluateAll(els => els.map(e => e.getBoundingClientRect().right)))
    expect(box).toBeLessThanOrEqual(width)
})
