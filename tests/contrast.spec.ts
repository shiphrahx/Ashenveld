import { test, expect } from '@playwright/test'
import { lowContrast } from './contrast'

// U3: every piece of text passes 4.5:1 against the background.
// Waits let the fade-in animations finish before measuring.
test('text contrast is at least 4.5:1', async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 0.5 })
  await page.goto('./')
  await page.waitForTimeout(2200)
  expect(await lowContrast(page), 'title').toEqual([])

  await page.getByRole('button', { name: /begin/i }).click()
  await page.getByText('Woman', { exact: true }).click()
  await page.getByRole('button', { name: /next/i }).click()
  await page.waitForTimeout(800)
  expect(await lowContrast(page), 'class step').toEqual([])
  await page.getByText('The Arcane', { exact: true }).first().click()
  await page.getByRole('button', { name: /next/i }).click()
  await page.locator('input').first().fill('Ines')
  await page.getByRole('button', { name: 'Sibling', exact: true }).click()
  await page.getByRole('button', { name: /next/i }).click()
  await page.locator('input').first().fill('Tam')
  await page.getByRole('button', { name: /enter ashenveld/i }).click()
  await page.waitForTimeout(2200)
  expect(await lowContrast(page), 'summary').toEqual([])
  await page.getByRole('button', { name: /enter ashenveld/i }).click()

  await page.waitForTimeout(1500)
  expect(await lowContrast(page), 'act card').toEqual([])
  await page.locator('[data-act-card] button').click()

  await page.waitForTimeout(2200)
  expect(await lowContrast(page), 'game shell').toEqual([])
  await page.locator('[data-choice-id]').nth(1).click()
  await page.waitForTimeout(1500)                       // the roll lands and the verdict shows (E2)
  expect(await lowContrast(page), 'dice').toEqual([])
  await page.locator('[data-dice-continue]').click()
  await page.waitForTimeout(1200)
  expect(await lowContrast(page), 'outcome').toEqual([])
})
