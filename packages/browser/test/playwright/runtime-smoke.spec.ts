import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(currentDir, '../../../../')
const fixturePath = '/packages/browser/test/playwright/fixtures/runtime-smoke.html'

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8'
}

const resolveRequestPath = (request: IncomingMessage): string => {
  const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname
  if (pathname === '/') return fixturePath
  return pathname
}

const sendResponse = (response: ServerResponse, status: number, body: string | Buffer): void => {
  response.statusCode = status
  response.end(body)
}

const serveRequest = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
  const requestPath = resolveRequestPath(request)
  const resolved = path.resolve(workspaceRoot, `.${decodeURIComponent(requestPath)}`)
  if (!resolved.startsWith(workspaceRoot)) {
    sendResponse(response, 403, 'Forbidden')
    return
  }

  try {
    const fileBuffer = await readFile(resolved)
    const ext = path.extname(resolved).toLowerCase()
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('Content-Type', MIME_TYPES[ext] ?? 'application/octet-stream')
    sendResponse(response, 200, fileBuffer)
  } catch {
    sendResponse(response, 404, 'Not found')
  }
}

const startFixtureServer = async (): Promise<{ close: () => Promise<void>, baseUrl: string }> => {
  const server = createServer((request, response) => {
    void serveRequest(request, response)
  })

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve())
  })

  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Failed to resolve fixture server address.')
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error)
        else resolve()
      })
    })
  }
}

let fixtureServer: { close: () => Promise<void>, baseUrl: string } | null = null

test.beforeAll(async () => {
  fixtureServer = await startFixtureServer()
})

test.afterAll(async () => {
  if (!fixtureServer) return
  await fixtureServer.close()
  fixtureServer = null
})

const runFixture = async (
  page: import('@playwright/test').Page,
  mode: 'default' | 'legacy' | 'compute' | 'auto' | 'force-unavailable'
) => {
  if (!fixtureServer) throw new Error('Fixture server was not initialized.')
  const target = `${fixtureServer.baseUrl}${fixturePath}?mode=${mode}`
  await page.goto(target)
  await page.waitForFunction(() => (window as { __hydraSmokeDone?: boolean }).__hydraSmokeDone === true)
  return page.evaluate(() => (window as { __hydraSmokeResult: Record<string, unknown> }).__hydraSmokeResult)
}

test('browser runtime smoke: default mode is auto-compute-preferred', async ({ page }) => {
  const result = await runFixture(page, 'default')
  expect(['ok', 'no-webgpu'], `unexpected result: ${JSON.stringify(result)}`).toContain(result.status)
  if (result.status === 'ok') {
    expect(result.requestedMode).toBe('default')
    expect(result.configuredMode).toBe('auto')
    expect(['legacy', 'compute']).toContain(result.activeMode)
  }
})

test('browser runtime smoke: legacy mode init + one frame + dispose', async ({ page }) => {
  const result = await runFixture(page, 'legacy')
  expect(['ok', 'no-webgpu'], `unexpected result: ${JSON.stringify(result)}`).toContain(result.status)
  if (result.status === 'ok') {
    expect(result.requestedMode).toBe('legacy')
    expect(result.configuredMode).toBe('legacy')
    expect(result.activeMode).toBe('legacy')
  }
})

test('browser runtime smoke: compute mode init + one frame + dispose', async ({ page }) => {
  const result = await runFixture(page, 'compute')
  expect(['ok', 'no-webgpu'], `unexpected result: ${JSON.stringify(result)}`).toContain(result.status)
  if (result.status === 'ok') {
    expect(result.requestedMode).toBe('compute')
    expect(result.configuredMode).toBe('compute')
    expect(['legacy', 'compute']).toContain(result.activeMode)
  }
})

test('browser runtime smoke: auto mode init + one frame + dispose', async ({ page }) => {
  const result = await runFixture(page, 'auto')
  expect(['ok', 'no-webgpu'], `unexpected result: ${JSON.stringify(result)}`).toContain(result.status)
  if (result.status === 'ok') {
    expect(result.requestedMode).toBe('auto')
    expect(result.configuredMode).toBe('auto')
    expect(['legacy', 'compute']).toContain(result.activeMode)
  }
})

test('browser runtime smoke: explicit WebGPU failure path is clean', async ({ page }) => {
  const result = await runFixture(page, 'force-unavailable')
  expect(result.status).toBe('error')

  const message = String(result.message ?? '')
  const causeMessage = String(result.causeMessage ?? '')
  const expectedUnavailableMessage = String(result.expectedUnavailableMessage ?? '')
  expect(
    message.includes('WebGPU context creation failed') ||
    message.includes(expectedUnavailableMessage) ||
    causeMessage.includes('WebGPU context creation failed') ||
    causeMessage.includes(expectedUnavailableMessage),
    `unexpected result: ${JSON.stringify(result)}`
  ).toBe(true)
})
