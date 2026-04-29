import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(currentDir, '../../../../')
const fixturePath = '/packages/synth/test/playwright/fixtures/runtime-smoke.html'

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
  mode: 'default' | 'fragment' | 'auto' | 'force-unavailable'
) => {
  if (!fixtureServer) throw new Error('Fixture server was not initialized.')
  const target = `${fixtureServer.baseUrl}${fixturePath}?mode=${mode}`
  await page.goto(target)
  await page.waitForFunction(() => (window as { __hydraSmokeDone?: boolean }).__hydraSmokeDone === true)
  return page.evaluate(() => (window as { __hydraSmokeResult: Record<string, unknown> }).__hydraSmokeResult)
}

const encodeSketchForUrl = (code: string): string => Buffer.from(code, 'utf8').toString('base64url')

const openHydraApp = async (page: import('@playwright/test').Page, hash = ''): Promise<void> => {
  if (!fixtureServer) throw new Error('Fixture server was not initialized.')
  await page.addInitScript(() => {
    window.localStorage.setItem('hydra-welcome-dismissed', '1')
  })
  await page.goto(`${fixtureServer.baseUrl}/packages/hydra/index.html${hash}`)
  await page.waitForSelector('#live-editor .cm-editor')
}

type CodeMaterialMetrics = {
  width: number
  height: number
  alphaPixels: number
  magentaPixels: number
  bounds: null | {
    left: number
    top: number
    right: number
    bottom: number
    width: number
    height: number
  }
}

const readCodeMaterialMetrics = async (page: import('@playwright/test').Page): Promise<CodeMaterialMetrics> => page.evaluate(() => {
  const canvas = (window as unknown as { codeMaterialCanvas?: HTMLCanvasElement }).codeMaterialCanvas
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Missing code material canvas.')
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Missing code material canvas context.')

  const { width, height } = canvas
  const data = context.getImageData(0, 0, width, height).data
  let alphaPixels = 0
  let magentaPixels = 0
  let left = width
  let top = height
  let right = -1
  let bottom = -1

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4
      const red = data[index]
      const green = data[index + 1]
      const blue = data[index + 2]
      const alpha = data[index + 3]
      if (alpha <= 0) continue
      alphaPixels += 1
      if (red > 170 && green < 170 && blue > 130 && alpha > 20) magentaPixels += 1
      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)
    }
  }

  return {
    width,
    height,
    alphaPixels,
    magentaPixels,
    bounds: alphaPixels > 0
      ? { left, top, right, bottom, width: right - left + 1, height: bottom - top + 1 }
      : null
  }
})

test('browser runtime smoke: default mode is auto-fragment-preferred', async ({ page }) => {
  const result = await runFixture(page, 'default')
  expect(['ok', 'no-webgpu'], `unexpected result: ${JSON.stringify(result)}`).toContain(result.status)
  if (result.status === 'ok') {
    expect(result.requestedMode).toBe('default')
    expect(result.configuredMode).toBe('auto')
    expect(result.activeMode).toBe('fragment')
  }
})

test('browser runtime smoke: fragment mode init + one frame + dispose', async ({ page }) => {
  const result = await runFixture(page, 'fragment')
  expect(['ok', 'no-webgpu'], `unexpected result: ${JSON.stringify(result)}`).toContain(result.status)
  if (result.status === 'ok') {
    expect(result.requestedMode).toBe('fragment')
    expect(result.configuredMode).toBe('fragment')
    expect(result.activeMode).toBe('fragment')
  }
})

test('browser runtime smoke: auto mode init + one frame + dispose', async ({ page }) => {
  const result = await runFixture(page, 'auto')
  expect(['ok', 'no-webgpu'], `unexpected result: ${JSON.stringify(result)}`).toContain(result.status)
  if (result.status === 'ok') {
    expect(result.requestedMode).toBe('auto')
    expect(result.configuredMode).toBe('auto')
    expect(result.activeMode).toBe('fragment')
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

test('hydra app smoke: editor geometry and sketch helpers are live', async ({ page }) => {
  const code = 'osc(9, 0.1, 0).out()\nspeed = 0.5'
  await openHydraApp(page, `#code=${encodeSketchForUrl(code)}`)

  await expect(page.locator('#live-panel')).toBeVisible()
  await expect(page.locator('#live-share')).toBeVisible()
  await expect(page.locator('#live-random')).toBeVisible()
  await expect(page.locator('#live-dice')).toBeVisible()
  await expect(page.locator('#live-record-toggle')).toBeVisible()
  await expect(page.locator('#live-options-toggle')).toBeVisible()
  await expect.poll(async () => page.evaluate(() => (
    window as unknown as { hydraEditor: { getCodeMaterial: () => { sourceName: string | null, width: number, height: number } } }
  ).hydraEditor.getCodeMaterial())).toMatchObject({
    sourceName: 's3',
    width: expect.any(Number),
    height: expect.any(Number)
  })

  const viewport = page.viewportSize()
  const expectedCanvasWidth = (viewport?.width ?? 0) % 2 === 0 ? (viewport?.width ?? 0) : (viewport?.width ?? 0) - 1
  const expectedCanvasHeight = (viewport?.height ?? 0) % 2 === 0 ? (viewport?.height ?? 0) : (viewport?.height ?? 0) - 1
  const initialCanvasDisplay = await page.evaluate(() => (
    window as unknown as {
      getCanvasDisplay: () => { mode: string, width: number, height: number, displayWidth: number, displayHeight: number }
    }
  ).getCanvasDisplay())
  expect(initialCanvasDisplay.mode).toBe('auto')
  expect(initialCanvasDisplay.width).toBe(expectedCanvasWidth)
  expect(initialCanvasDisplay.height).toBe(expectedCanvasHeight)
  expect(Math.round(initialCanvasDisplay.displayWidth)).toBe(viewport?.width)
  expect(Math.round(initialCanvasDisplay.displayHeight)).toBe(viewport?.height)

  const fullscreenBox = await page.locator('#live-editor-shell').boundingBox()
  expect(fullscreenBox).not.toBeNull()
  expect(Math.round(fullscreenBox?.x ?? -1)).toBe(0)
  expect(Math.round(fullscreenBox?.y ?? -1)).toBe(0)
  expect(Math.round(fullscreenBox?.width ?? 0)).toBe(viewport?.width)
  expect(Math.round(fullscreenBox?.height ?? 0)).toBe(viewport?.height)

  await page.locator('#live-record-toggle').click()
  await expect(page.locator('#record-popover')).toBeVisible()
  await expect(page.locator('#interface-record-toggle')).toBeVisible()
  await expect(page.locator('#interface-playback-button')).toBeDisabled()
  await expect(page.locator('#capture-fps-input')).toHaveValue('60')
  await page.locator('#capture-duration-input').fill('3.5')
  await page.locator('#capture-fps-input').fill('30')
  await page.locator('#capture-resolution-select').selectOption('custom')
  await page.locator('#capture-width-input').fill('641')
  await page.locator('#capture-height-input').fill('361')
  await page.locator('#capture-height-input').blur()
  await expect(page.locator('#capture-width-input')).toHaveValue('640')
  await expect(page.locator('#capture-height-input')).toHaveValue('360')
  await page.locator('#capture-resolution-select').selectOption('720p')
  await page.locator('#record-close').click()
  await expect(page.locator('#record-popover')).toBeHidden()

  await page.locator('#live-options-toggle').click()
  await expect(page.locator('#options-panel')).toBeVisible()
  await expect(page.locator('#code-material-source-select')).toHaveValue('s3')
  await page.locator('#code-material-source-select').selectOption('s2')
  await expect(page.locator('#code-material-status')).toHaveText('src(s2)')
  await expect.poll(async () => page.evaluate(() => (
    window as unknown as { hydraEditor: { getCodeMaterial: () => { sourceName: string | null } } }
  ).hydraEditor.getCodeMaterial().sourceName)).toBe('s2')
  await page.locator('#editor-font-size-input').fill('16')
  await page.evaluate(() => {
    const opacity = document.querySelector<HTMLInputElement>('#editor-opacity-input')
    if (!opacity) throw new Error('Missing editor opacity input')
    opacity.value = '0.7'
    opacity.dispatchEvent(new Event('input', { bubbles: true }))
    opacity.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await page.locator('#options-close').click()
  await expect(page.locator('#options-panel')).toBeHidden()

  const initialCode = await page.evaluate(() => (
    window as unknown as { hydraEditor: { getCode: () => string } }
  ).hydraEditor.getCode())
  expect(initialCode).toBe(code)

  await page.evaluate(() => (
    window as unknown as {
      hydraEditor: {
        setPanelGeometry: (geometry: { left: number, top: number, width: number, height: number }) => void
      }
    }
  ).hydraEditor.setPanelGeometry({ left: 64, top: 72, width: 520, height: 300 }))

  const panelBox = await page.locator('#live-editor-shell').boundingBox()
  expect(panelBox).not.toBeNull()
  expect(Math.round(panelBox?.x ?? 0)).toBe(64)
  expect(Math.round(panelBox?.y ?? 0)).toBe(72)
  expect(Math.round(panelBox?.width ?? 0)).toBe(520)
  expect(Math.round(panelBox?.height ?? 0)).toBe(300)

  const runButtonBox = await page.locator('#live-run').boundingBox()
  expect(runButtonBox).not.toBeNull()
  if (!runButtonBox) throw new Error('Expected run button bounds.')
  await page.mouse.move(runButtonBox.x + (runButtonBox.width / 2), runButtonBox.y + (runButtonBox.height / 2))
  await page.mouse.down()
  await page.mouse.move(runButtonBox.x + (runButtonBox.width / 2) + 82, runButtonBox.y + (runButtonBox.height / 2) + 64, { steps: 4 })
  await page.mouse.up()
  const toolbarDragBox = await page.locator('#live-editor-shell').boundingBox()
  expect(toolbarDragBox).not.toBeNull()
  expect(Math.round(toolbarDragBox?.x ?? 0)).toBe(64)
  expect(Math.round(toolbarDragBox?.y ?? 0)).toBe(72)
  expect(Math.round(toolbarDragBox?.width ?? 0)).toBe(520)
  expect(Math.round(toolbarDragBox?.height ?? 0)).toBe(300)

  const resizeFromHandle = async (edge: string, dx: number, dy: number): Promise<void> => {
    const handleBox = await page.locator(`.live-resize-handle[data-edge="${edge}"]`).boundingBox()
    expect(handleBox).not.toBeNull()
    if (!handleBox) throw new Error(`Expected resize handle ${edge} bounds.`)
    await page.mouse.move(handleBox.x + (handleBox.width / 2), handleBox.y + (handleBox.height / 2))
    await page.mouse.down()
    await page.mouse.move(handleBox.x + (handleBox.width / 2) + dx, handleBox.y + (handleBox.height / 2) + dy, { steps: 4 })
    await page.mouse.up()
  }

  await resizeFromHandle('e', 60, 0)
  let resizedBox = await page.locator('#live-editor-shell').boundingBox()
  expect(resizedBox).not.toBeNull()
  expect(Math.round(resizedBox?.x ?? 0)).toBe(64)
  expect(Math.round(resizedBox?.width ?? 0)).toBe(580)

  await resizeFromHandle('w', -40, 0)
  resizedBox = await page.locator('#live-editor-shell').boundingBox()
  expect(resizedBox).not.toBeNull()
  expect(Math.round(resizedBox?.x ?? 0)).toBe(24)
  expect(Math.round(resizedBox?.width ?? 0)).toBe(620)

  await resizeFromHandle('s', 0, 50)
  resizedBox = await page.locator('#live-editor-shell').boundingBox()
  expect(resizedBox).not.toBeNull()
  expect(Math.round(resizedBox?.y ?? 0)).toBe(72)
  expect(Math.round(resizedBox?.height ?? 0)).toBe(350)

  await resizeFromHandle('n', 0, -30)
  resizedBox = await page.locator('#live-editor-shell').boundingBox()
  expect(resizedBox).not.toBeNull()
  expect(Math.round(resizedBox?.y ?? 0)).toBe(42)
  expect(Math.round(resizedBox?.height ?? 0)).toBe(380)

  await resizeFromHandle('se', 20, 20)
  resizedBox = await page.locator('#live-editor-shell').boundingBox()
  expect(resizedBox).not.toBeNull()
  expect(Math.round(resizedBox?.width ?? 0)).toBe(640)
  expect(Math.round(resizedBox?.height ?? 0)).toBe(400)

  const sideDragBox = await page.locator('.live-drag-surface[data-zone="left"]').boundingBox()
  expect(sideDragBox).not.toBeNull()
  if (!sideDragBox) throw new Error('Expected side drag surface bounds.')
  expect(Math.round(sideDragBox.width)).toBeGreaterThanOrEqual(12)
  const toolbarBeforeSideDrag = await page.locator('#live-tools').boundingBox()
  expect(toolbarBeforeSideDrag).not.toBeNull()
  await page.mouse.move(sideDragBox.x + (sideDragBox.width / 2), sideDragBox.y + (sideDragBox.height / 2))
  await page.mouse.down()
  await page.mouse.move(sideDragBox.x + (sideDragBox.width / 2) + 30, sideDragBox.y + (sideDragBox.height / 2) + 18, { steps: 4 })
  await page.mouse.up()
  resizedBox = await page.locator('#live-editor-shell').boundingBox()
  expect(resizedBox).not.toBeNull()
  expect(Math.round(resizedBox?.x ?? 0)).toBe(54)
  expect(Math.round(resizedBox?.y ?? 0)).toBe(60)
  expect(Math.round(resizedBox?.width ?? 0)).toBe(640)
  expect(Math.round(resizedBox?.height ?? 0)).toBe(400)
  const toolbarAfterSideDrag = await page.locator('#live-tools').boundingBox()
  expect(toolbarAfterSideDrag).not.toBeNull()
  expect(Math.round(toolbarAfterSideDrag?.x ?? 0)).toBe(Math.round(toolbarBeforeSideDrag?.x ?? 0))
  expect(Math.round(toolbarAfterSideDrag?.y ?? 0)).toBe(Math.round(toolbarBeforeSideDrag?.y ?? 0))

  await expect(page.locator('#live-fit')).toHaveAttribute('aria-label', 'Fullscreen code layer')
  await page.locator('#live-fit').click()
  let toggledBox = await page.locator('#live-editor-shell').boundingBox()
  expect(toggledBox).not.toBeNull()
  expect(Math.round(toggledBox?.x ?? -1)).toBe(0)
  expect(Math.round(toggledBox?.y ?? -1)).toBe(0)
  expect(Math.round(toggledBox?.width ?? 0)).toBe(viewport?.width)
  expect(Math.round(toggledBox?.height ?? 0)).toBe(viewport?.height)
  await expect(page.locator('#live-fit')).toHaveAttribute('aria-label', 'Window code layer')
  await page.locator('#live-fit').click()
  toggledBox = await page.locator('#live-editor-shell').boundingBox()
  expect(toggledBox).not.toBeNull()
  expect(Math.round(toggledBox?.x ?? 0)).toBe(54)
  expect(Math.round(toggledBox?.y ?? 0)).toBe(60)
  expect(Math.round(toggledBox?.width ?? 0)).toBe(640)
  expect(Math.round(toggledBox?.height ?? 0)).toBe(400)
  await expect(page.locator('#live-fit')).toHaveAttribute('aria-label', 'Fullscreen code layer')

  const canvasSize = await page.evaluate(() => {
    const hydraWindow = window as unknown as {
      hydra: { host: { canvas: HTMLCanvasElement } }
      setCanvasDisplay: (width: number, height: number) => void
      resetCanvasDisplay: () => void
      getCanvasDisplay: () => { mode: string, width: number, height: number, displayWidth: number, displayHeight: number }
    }
    hydraWindow.setCanvasDisplay(511, 513)
    const manual = hydraWindow.getCanvasDisplay()
    hydraWindow.resetCanvasDisplay()
    const reset = hydraWindow.getCanvasDisplay()
    const canvas = hydraWindow.hydra.host.canvas
    return { width: canvas.width, height: canvas.height, manual, reset }
  })
  expect(canvasSize.manual).toMatchObject({ mode: 'manual', width: 510, height: 512 })
  expect(canvasSize.reset.mode).toBe('auto')
  expect(canvasSize.width).toBe(expectedCanvasWidth)
  expect(canvasSize.height).toBe(expectedCanvasHeight)

  await page.locator('#live-dice').click()
  const dicedCode = await page.evaluate(() => (
    window as unknown as { hydraEditor: { getCode: () => string } }
  ).hydraEditor.getCode())
  expect(dicedCode).not.toBe(code)

  const sketchUrl = await page.evaluate(() => (
    window as unknown as { saveSketchToUrl: (options: { historyMode: string }) => string }
  ).saveSketchToUrl({ historyMode: 'replace' }))
  expect(sketchUrl).toContain('#code=')

  await page.locator('#live-random').click()
  await expect.poll(async () => page.evaluate(() => (
    window as unknown as { hydraEditor: { getCode: () => string } }
  ).hydraEditor.getCode())).not.toBe(dicedCode)
})

test('hydra app smoke: interface recorder captures editor performance', async ({ page }) => {
  const code = 'osc(9, 0.1, 0).out()'
  await openHydraApp(page, `#code=${encodeSketchForUrl(code)}`)

  await page.evaluate(() => {
    (window as unknown as {
      hydraInterfaceRecorder: { start: (options?: { label?: string }) => unknown }
    }).hydraInterfaceRecorder.start({ label: 'smoke' })
  })

  await page.locator('#live-record-toggle').click()
  await expect(page.locator('#record-popover')).toBeVisible()
  await page.locator('#record-close').click()
  await page.locator('#live-editor .cm-content').click()
  await page.keyboard.press('End')
  await page.keyboard.type('\n// interface score')
  await page.mouse.move(140, 160)
  await page.mouse.move(220, 200)
  await page.setViewportSize({ width: 900, height: 640 })
  await expect.poll(async () => page.evaluate(() => (
    window as unknown as { getCanvasDisplay: () => { mode: string, width: number, height: number } }
  ).getCanvasDisplay())).toMatchObject({
    mode: 'auto',
    width: 900,
    height: 640
  })
  const executedDuringRecord = await page.evaluate(async () => {
    const hydraWindow = window as unknown as {
      __interfaceRunCount?: number
      hydraEditor: {
        setCode: (code: string, options?: { persist?: boolean, focus?: boolean }) => string
        run: (scope?: string) => Promise<void>
      }
    }
    hydraWindow.__interfaceRunCount = 0
    hydraWindow.hydraEditor.setCode(
      'window.__interfaceRunCount = (window.__interfaceRunCount || 0) + 1',
      { persist: false, focus: false }
    )
    await hydraWindow.hydraEditor.run('all')
    return hydraWindow.__interfaceRunCount
  })
  expect(executedDuringRecord).toBe(1)
  await page.evaluate(() => {
    (window as unknown as {
      hydraEditor: {
        setPanelGeometry: (geometry: { left: number, top: number, width: number, height: number }) => void
      }
    }).hydraEditor.setPanelGeometry({ left: 88, top: 96, width: 480, height: 280 })
  })

  const recording = await page.evaluate(() => (
    window as unknown as {
      hydraInterfaceRecorder: {
        stop: (options?: { download?: boolean }) => {
          kind: string
          version: number
          durationMs: number
          events?: unknown[]
          initial: { code: string }
          tracks: {
            code: unknown[]
            canvas: unknown[]
            pointer: { origin: [number, number] | null, samples: unknown[] }
            panel: unknown[]
            actions: unknown[]
            runs: Array<{ phase: string, code?: string }>
          }
          stats: { events: number, tracks: Record<string, number> }
        }
      }
    }
  ).hydraInterfaceRecorder.stop({ download: false }))

  expect(recording.kind).toBe('hydra-interface-score')
  expect(recording.version).toBe(2)
  expect(recording.durationMs).toBeGreaterThan(0)
  expect(recording.events).toBeUndefined()
  expect(recording.initial.code).toBe(code)
  expect(recording.tracks.code.length).toBeGreaterThan(0)
  expect(recording.tracks.canvas.length).toBeGreaterThan(0)
  expect(recording.tracks.pointer.origin).not.toBeNull()
  expect(recording.tracks.pointer.samples.length).toBeGreaterThan(0)
  expect(recording.tracks.panel.length).toBeGreaterThan(0)
  expect(recording.tracks.actions.length).toBeGreaterThan(0)
  expect(recording.tracks.runs.some((run) => run.phase === 'start' && run.code?.includes('__interfaceRunCount'))).toBe(true)
  expect(recording.stats.tracks.code).toBe(recording.tracks.code.length)
  expect(recording.stats.events).toBeGreaterThan(0)
  await expect(page.locator('#interface-playback-button')).toBeEnabled()

  const replayed = await page.evaluate(async (score) => {
    const hydraWindow = window as unknown as {
      hydraEditor: {
        getCode: () => string
        setCode: (code: string, options?: { persist?: boolean, focus?: boolean }) => string
        getPanelGeometry: () => { mode?: string, left?: number, top?: number, width?: number, height?: number } | null
        getCanvasDisplay: () => { mode: string, width: number, height: number }
      }
      __interfaceRunCount?: number
      hydraInterfaceRecorder: {
        play: (recording: unknown, options?: { realtime?: boolean }) => Promise<unknown>
      }
    }
    hydraWindow.__interfaceRunCount = 0
    hydraWindow.hydraEditor.setCode('solid(0).out()', { persist: false, focus: false })
    await hydraWindow.hydraInterfaceRecorder.play(score, { realtime: false })
    return {
      runCount: hydraWindow.__interfaceRunCount,
      code: hydraWindow.hydraEditor.getCode(),
      canvas: hydraWindow.hydraEditor.getCanvasDisplay(),
      geometry: hydraWindow.hydraEditor.getPanelGeometry()
    }
  }, recording)

  expect(replayed.runCount).toBe(1)
  expect(replayed.code).toContain('__interfaceRunCount')
  expect(replayed.canvas).toMatchObject({ mode: 'auto', width: 900, height: 640 })
  expect(replayed.geometry?.mode).toBe('floating')
  expect(Math.round(replayed.geometry?.left ?? 0)).toBe(88)
  expect(Math.round(replayed.geometry?.top ?? 0)).toBe(96)
  await expect(page.locator('#interface-record-status')).toContainText('played')
})

test('hydra app smoke: bundled interface score loads and replays dry', async ({ page }) => {
  await openHydraApp(page)

  const replayed = await page.evaluate(async () => {
    const hydraWindow = window as unknown as {
      hydraEditor: {
        getCode: () => string
        getCanvasDisplay: () => { mode: string, width: number, height: number }
        getPanelGeometry: () => { mode?: string } | null
      }
      loadInterfacePerformance: (
        source: string,
        options?: { play?: boolean, realtime?: boolean, runCode?: boolean }
      ) => Promise<{ durationMs: number, label: string, stats: { events: number, tracks: { code: number, runs: number } } }>
    }
    const score = await hydraWindow.loadInterfacePerformance(
      '/packages/hydra/performances/feedback-bloom-build.hydra-score.json',
      { play: true, realtime: false, runCode: false }
    )
    return {
      label: score.label,
      durationMs: score.durationMs,
      eventCount: score.stats.events,
      codeEditCount: score.stats.tracks.code,
      runEntryCount: score.stats.tracks.runs,
      code: hydraWindow.hydraEditor.getCode(),
      canvas: hydraWindow.hydraEditor.getCanvasDisplay(),
      panel: hydraWindow.hydraEditor.getPanelGeometry()
    }
  })

  expect(replayed.label).toBe('feedback-bloom-build')
  expect(replayed.durationMs).toBeGreaterThan(80000)
  expect(replayed.eventCount).toBeGreaterThan(350)
  expect(replayed.codeEditCount).toBeGreaterThan(50)
  expect(replayed.runEntryCount).toBeGreaterThan(90)
  expect(replayed.code).toContain('dualKawaseBloom')
  expect(replayed.code).toContain('render(o1)')
  expect(replayed.canvas).toMatchObject({ mode: 'manual', width: 512, height: 512 })
  expect(replayed.panel?.mode).toBe('fullscreen')
})

test('hydra app smoke: code texture tracks CodeMirror visibility, selection, and geometry', async ({ page }) => {
  const code = 'gradient(1).rotate(0.2).out()\nshape(4, 0.8).repeat(3, 2).out()'
  await openHydraApp(page, `#code=${encodeSketchForUrl(code)}`)

  const viewport = page.viewportSize()
  const fullscreenRects = await page.evaluate(() => {
    const hydraWindow = window as unknown as {
      hydra: { host: { canvas: HTMLCanvasElement } }
      setCanvasDisplay?: (width: number, height: number) => void
      hydraEditor: {
        show: () => void
        fit: () => void
        attachCodeMaterial: (sourceName: string) => HTMLCanvasElement | null
        syncCodeMaterial: () => HTMLCanvasElement | null
      }
    }
    hydraWindow.setCanvasDisplay?.(512, 512)
    hydraWindow.hydraEditor.show()
    hydraWindow.hydraEditor.fit()
    hydraWindow.hydraEditor.attachCodeMaterial('s3')
    hydraWindow.hydraEditor.syncCodeMaterial()
    const canvasRect = hydraWindow.hydra.host.canvas.getBoundingClientRect()
    const panelRect = document.getElementById('live-editor-shell')?.getBoundingClientRect()
    return {
      canvas: {
        left: canvasRect.left,
        top: canvasRect.top,
        width: canvasRect.width,
        height: canvasRect.height
      },
      panel: panelRect
        ? {
            left: panelRect.left,
            top: panelRect.top,
            width: panelRect.width,
            height: panelRect.height
          }
        : null
    }
  })
  expect(fullscreenRects.panel).not.toBeNull()
  if (!fullscreenRects.panel) throw new Error('Expected live panel rect.')
  expect(Math.round(fullscreenRects.panel.left)).toBe(0)
  expect(Math.round(fullscreenRects.panel.top)).toBe(0)
  expect(Math.round(fullscreenRects.panel.width)).toBe(viewport?.width)
  expect(Math.round(fullscreenRects.panel.height)).toBe(viewport?.height)
  expect(Math.round(fullscreenRects.canvas.width)).toBe(512)
  expect(Math.round(fullscreenRects.canvas.height)).toBe(512)

  await page.evaluate(() => {
    const hydraWindow = window as unknown as {
      hydra: { host: { canvas: HTMLCanvasElement } }
      setCanvasDisplay?: (width: number, height: number) => void
      hydraEditor: {
        show: () => void
        setPanelGeometry: (geometry: { left: number, top: number, width: number, height: number }) => void
        attachCodeMaterial: (sourceName: string) => HTMLCanvasElement | null
        syncCodeMaterial: () => HTMLCanvasElement | null
      }
    }
    hydraWindow.setCanvasDisplay?.(512, 512)
    hydraWindow.hydraEditor.show()
    const canvasRect = hydraWindow.hydra.host.canvas.getBoundingClientRect()
    hydraWindow.hydraEditor.setPanelGeometry({
      left: canvasRect.left + 16,
      top: canvasRect.top + 18,
      width: 460,
      height: 260
    })
    hydraWindow.hydraEditor.attachCodeMaterial('s3')
    hydraWindow.hydraEditor.syncCodeMaterial()
  })

  await expect.poll(async () => (await readCodeMaterialMetrics(page)).alphaPixels).toBeGreaterThan(500)
  const fullscreenMetrics = await readCodeMaterialMetrics(page)
  expect(fullscreenMetrics.bounds).not.toBeNull()
  const fullscreenBounds = fullscreenMetrics.bounds
  if (!fullscreenBounds) throw new Error('Expected visible code material bounds.')

  const toolbarBoxBeforeDrag = await page.locator('#live-tools').boundingBox()
  expect(toolbarBoxBeforeDrag).not.toBeNull()
  if (!toolbarBoxBeforeDrag) throw new Error('Expected live toolbar bounds.')
  const dragHandleBox = await page.locator('#live-drag-handle').boundingBox()
  expect(dragHandleBox).not.toBeNull()
  if (!dragHandleBox) throw new Error('Expected live panel drag handle bounds.')
  await page.mouse.move(dragHandleBox.x + (dragHandleBox.width / 2), dragHandleBox.y + (dragHandleBox.height / 2))
  await page.mouse.down()
  await page.mouse.move(dragHandleBox.x + (dragHandleBox.width / 2) + 74, dragHandleBox.y + (dragHandleBox.height / 2) + 68, { steps: 4 })
  const draggingMetrics = await readCodeMaterialMetrics(page)
  const toolbarBoxDuringDrag = await page.locator('#live-tools').boundingBox()
  expect(toolbarBoxDuringDrag).not.toBeNull()
  expect(Math.round(toolbarBoxDuringDrag?.x ?? 0)).toBe(Math.round(toolbarBoxBeforeDrag.x))
  expect(Math.round(toolbarBoxDuringDrag?.y ?? 0)).toBe(Math.round(toolbarBoxBeforeDrag.y))
  expect(draggingMetrics.bounds).not.toBeNull()
  if (!draggingMetrics.bounds) throw new Error('Expected dragging code material bounds.')
  expect(draggingMetrics.bounds.left).toBeGreaterThan(fullscreenBounds.left + 30)
  expect(draggingMetrics.bounds.top).toBeGreaterThan(fullscreenBounds.top + 30)
  await page.mouse.up()
  const draggedBounds = draggingMetrics.bounds

  const baselineMagentaPixels = fullscreenMetrics.magentaPixels
  await page.evaluate(() => {
    const hydraEditor = (window as unknown as {
      hydraEditor: {
        select: (range: { from: number, to: number }) => { from: number, to: number } | null
        syncCodeMaterial: () => HTMLCanvasElement | null
      }
    }).hydraEditor
    hydraEditor.select({ from: 0, to: 14 })
    hydraEditor.syncCodeMaterial()
  })
  await expect.poll(async () => (await readCodeMaterialMetrics(page)).magentaPixels).toBeGreaterThan(baselineMagentaPixels + 50)

  await page.evaluate(() => {
    const hydraWindow = window as unknown as {
      hydra: { host: { canvas: HTMLCanvasElement } }
      hydraEditor: {
        setPanelGeometry: (geometry: { left: number, top: number, width: number, height: number }) => void
        syncCodeMaterial: () => HTMLCanvasElement | null
      }
    }
    const canvasRect = hydraWindow.hydra.host.canvas.getBoundingClientRect()
    const hydraEditor = hydraWindow.hydraEditor
    hydraEditor.setPanelGeometry({
      left: canvasRect.left + 180,
      top: canvasRect.top + 170,
      width: 360,
      height: 260
    })
    hydraEditor.syncCodeMaterial()
  })
  const floatingMetrics = await readCodeMaterialMetrics(page)
  expect(floatingMetrics.bounds).not.toBeNull()
  if (!floatingMetrics.bounds) throw new Error('Expected floating code material bounds.')
  expect(floatingMetrics.bounds.left).toBeGreaterThan(draggedBounds.left + 30)
  expect(floatingMetrics.bounds.top).toBeGreaterThan(draggedBounds.top + 20)

  const completionBaselineMetrics = await readCodeMaterialMetrics(page)
  await page.evaluate(() => {
    const hydraEditor = (window as unknown as {
      hydraEditor: {
        select: (range: { from: number, to: number }) => { from: number, to: number } | null
        showCompletions: () => boolean
        syncCodeMaterial: () => HTMLCanvasElement | null
      }
    }).hydraEditor
    hydraEditor.select({ from: 2, to: 2 })
    hydraEditor.showCompletions()
  })
  await page.waitForSelector('.cm-tooltip-autocomplete')
  await page.evaluate(() => {
    (window as unknown as {
      hydraEditor: {
        syncCodeMaterial: () => HTMLCanvasElement | null
      }
    }).hydraEditor.syncCodeMaterial()
  })
  await expect.poll(async () => (await readCodeMaterialMetrics(page)).alphaPixels).toBeGreaterThan(
    completionBaselineMetrics.alphaPixels + 40
  )
  await page.keyboard.press('Escape')

  await page.evaluate(() => {
    const hydraWindow = window as unknown as {
      hydra: { host: { canvas: HTMLCanvasElement } }
      setCanvasDisplay?: (width: number, height: number) => void
      hydraEditor: {
        setPanelGeometry: (geometry: { left: number, top: number, width: number, height: number }) => void
        syncCodeMaterial: () => HTMLCanvasElement | null
      }
    }
    hydraWindow.setCanvasDisplay?.(256, 256)
    const canvasRect = hydraWindow.hydra.host.canvas.getBoundingClientRect()
    hydraWindow.hydraEditor.setPanelGeometry({
      left: canvasRect.left - 150,
      top: canvasRect.top - 40,
      width: 360,
      height: 260
    })
    hydraWindow.hydraEditor.syncCodeMaterial()
  })
  const croppedMetrics = await readCodeMaterialMetrics(page)
  expect(croppedMetrics.width).toBe(256)
  expect(croppedMetrics.height).toBe(256)
  expect(croppedMetrics.alphaPixels).toBeGreaterThan(100)
  expect(croppedMetrics.bounds).not.toBeNull()
  if (!croppedMetrics.bounds) throw new Error('Expected cropped overlap code material bounds.')
  expect(croppedMetrics.bounds.left).toBeGreaterThanOrEqual(0)
  expect(croppedMetrics.bounds.top).toBeGreaterThanOrEqual(0)
  expect(croppedMetrics.bounds.right).toBeLessThan(croppedMetrics.width)
  expect(croppedMetrics.bounds.bottom).toBeLessThan(croppedMetrics.height)

  await page.evaluate(() => {
    const hydraWindow = window as unknown as {
      hydra: { host: { canvas: HTMLCanvasElement } }
      hydraEditor: {
        setPanelGeometry: (geometry: { left: number, top: number, width: number, height: number }) => void
        syncCodeMaterial: () => HTMLCanvasElement | null
      }
    }
    const canvasRect = hydraWindow.hydra.host.canvas.getBoundingClientRect()
    hydraWindow.hydraEditor.setPanelGeometry({
      left: canvasRect.right + 24,
      top: canvasRect.top + 8,
      width: 360,
      height: 260
    })
    hydraWindow.hydraEditor.syncCodeMaterial()
  })
  await expect.poll(async () => (await readCodeMaterialMetrics(page)).alphaPixels).toBe(0)

  await page.evaluate(() => {
    const hydraWindow = window as unknown as {
      hydra: { host: { canvas: HTMLCanvasElement } }
      hydraEditor: {
        setPanelGeometry: (geometry: { left: number, top: number, width: number, height: number }) => void
        syncCodeMaterial: () => HTMLCanvasElement | null
      }
    }
    const canvasRect = hydraWindow.hydra.host.canvas.getBoundingClientRect()
    hydraWindow.hydraEditor.setPanelGeometry({
      left: canvasRect.left + 16,
      top: canvasRect.top + 18,
      width: 360,
      height: 240
    })
    hydraWindow.hydraEditor.syncCodeMaterial()
  })
  await expect.poll(async () => (await readCodeMaterialMetrics(page)).alphaPixels).toBeGreaterThan(500)

  await page.evaluate(() => {
    const hydraEditor = (window as unknown as {
      hydraEditor: {
        hide: () => void
        syncCodeMaterial: () => HTMLCanvasElement | null
      }
    }).hydraEditor
    hydraEditor.hide()
    hydraEditor.syncCodeMaterial()
  })
  await expect.poll(async () => (await readCodeMaterialMetrics(page)).alphaPixels).toBe(0)

  await page.evaluate(() => {
    const hydraEditor = (window as unknown as {
      hydraEditor: {
        show: () => void
        syncCodeMaterial: () => HTMLCanvasElement | null
      }
    }).hydraEditor
    hydraEditor.show()
    hydraEditor.syncCodeMaterial()
  })
  await expect.poll(async () => (await readCodeMaterialMetrics(page)).alphaPixels).toBeGreaterThan(500)
  const renderer = await page.evaluate(() => (
    window as unknown as { hydraEditor: { getCodeMaterial: () => { renderer: string } } }
  ).hydraEditor.getCodeMaterial().renderer)
  expect(renderer).toBe('codemirror-measured')
})
