import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { expect, test } from '@playwright/test'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.resolve(currentDir, 'fixtures/runtime-smoke.html')
const fixtureUrl = pathToFileURL(fixturePath).href

const runFixture = async (page: import('@playwright/test').Page, mode: 'auto' | 'force-unavailable') => {
  const target = `${fixtureUrl}?mode=${mode}`
  await page.goto(target)
  await page.waitForFunction(() => (window as { __hydraSmokeDone?: boolean }).__hydraSmokeDone === true)
  return page.evaluate(() => (window as { __hydraSmokeResult: Record<string, unknown> }).__hydraSmokeResult)
}

test('browser runtime smoke: init + one frame + dispose', async ({ page }) => {
  const result = await runFixture(page, 'auto')
  expect(['ok', 'no-webgpu']).toContain(result.status)
})

test('browser runtime smoke: explicit WebGPU failure path is clean', async ({ page }) => {
  const result = await runFixture(page, 'force-unavailable')
  expect(result.status).toBe('error')

  const message = String(result.message ?? '')
  const expectedUnavailableMessage = String(result.expectedUnavailableMessage ?? '')
  expect(
    message.includes('WebGPU context creation failed') ||
    message.includes(expectedUnavailableMessage)
  ).toBe(true)
})
