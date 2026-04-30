import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const readArg = (name, fallback = undefined) => {
  const prefix = `--${name}=`
  const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix))
  return match ? match.slice(prefix.length) : fallback
}

const hasFlag = (name) => process.argv.slice(2).includes(`--${name}`)

const resolveNumberArg = (name, fallback, { min = 0 } = {}) => {
  const raw = readArg(name)
  if (raw == null || raw === '') return fallback
  const value = Number(raw)
  if (!Number.isFinite(value) || value < min) {
    throw new Error(`--${name} must be a number >= ${min}.`)
  }
  return value
}

const safeFileStem = (value) => {
  const stem = String(value)
    .replace(/\.js$/iu, '')
    .replace(/[^A-Za-z0-9._-]+/gu, '_')
    .replace(/^_+|_+$/gu, '')
  return stem || 'preview'
}

const waitForServerLine = (child) => new Promise((resolve, reject) => {
  let settled = false
  let output = ''
  const timeout = setTimeout(() => {
    if (settled) return
    settled = true
    reject(new Error(`Timed out waiting for dev server. Output:\n${output}`))
  }, 30_000)

  const onData = (chunk) => {
    const text = chunk.toString()
    output += text
    const match = /Hydra:\s+(http:\/\/[^\s]+)/u.exec(output)
    if (!match || settled) return
    settled = true
    clearTimeout(timeout)
    resolve(match[1])
  }

  child.stdout.on('data', onData)
  child.stderr.on('data', onData)
  child.on('error', (error) => {
    if (settled) return
    settled = true
    clearTimeout(timeout)
    reject(error)
  })
  child.on('exit', (code) => {
    if (settled) return
    settled = true
    clearTimeout(timeout)
    reject(new Error(`Dev server exited before becoming ready (code ${code}). Output:\n${output}`))
  })
})

const parsePatterns = ({ patternsDir, limit, offset }) => {
  if (!patternsDir || !existsSync(patternsDir)) {
    throw new Error(`Patterns directory does not exist: ${patternsDir}`)
  }

  const files = readdirSync(patternsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b))
    .map((fileName) => path.join(patternsDir, fileName))

  const start = Math.max(0, Math.floor(offset))
  const end = Number.isFinite(limit) && limit > 0 ? start + Math.floor(limit) : undefined
  return files.slice(start, end)
}

const main = async () => {
  const patternsDir = path.resolve(readArg('patternsDir', path.join(repoRoot, '.tmp', 'hydra-style', 'recording-candidates')))
  const outDir = path.resolve(readArg('outDir', path.join(repoRoot, '.tmp', 'hydra-style', 'preview-recordings')))
  const duration = resolveNumberArg('duration', 5, { min: 0.5 })
  const width = Math.floor(resolveNumberArg('width', 720, { min: 2 }))
  const height = Math.floor(resolveNumberArg('height', 720, { min: 2 }))
  const port = Math.floor(resolveNumberArg('port', 8140, { min: 1 }))
  const limitRaw = readArg('limit')
  const limit = limitRaw == null ? Number.POSITIVE_INFINITY : Number(limitRaw)
  const offset = resolveNumberArg('offset', 0, { min: 0 })
  const headless = hasFlag('headless')

  mkdirSync(outDir, { recursive: true })
  const tmpVideoDir = path.join(outDir, '.playwright-video')
  rmSync(tmpVideoDir, { recursive: true, force: true })
  mkdirSync(tmpVideoDir, { recursive: true })

  const patterns = parsePatterns({ patternsDir, limit, offset })
  if (patterns.length === 0) throw new Error('No pattern .js files matched the requested range.')

  const manifestPath = path.join(outDir, 'manifest.jsonl')
  rmSync(manifestPath, { force: true })

  const server = spawn(
    process.execPath,
    ['scripts/dev-server.mjs', `--port=${port}`],
    { cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'] }
  )

  let browser
  try {
    const appUrl = await waitForServerLine(server)
    browser = await chromium.launch({
      headless,
      args: [
        '--enable-unsafe-webgpu',
        '--enable-features=Vulkan,UseSkiaRenderer,WebGPUDeveloperFeatures',
        '--autoplay-policy=no-user-gesture-required'
      ]
    })

    for (let index = 0; index < patterns.length; index += 1) {
      const patternPath = patterns[index]
      const patternName = path.basename(patternPath)
      const outputBaseName = safeFileStem(patternName)
      const outputPath = path.join(outDir, `${outputBaseName}.webm`)
      const startedAt = new Date().toISOString()
      const result = {
        patternPath,
        outputPath,
        outputBaseName,
        duration,
        width,
        height,
        headless,
        startedAt,
        endedAt: null,
        status: 'pending',
        error: null
      }

      console.log(`[${index + 1}/${patterns.length}] ${patternName}`)
      const context = await browser.newContext({
        viewport: { width, height },
        recordVideo: {
          dir: tmpVideoDir,
          size: { width, height }
        }
      })
      const page = await context.newPage()
      page.setDefaultTimeout(120_000)
      page.on('console', (message) => {
        const type = message.type()
        if (type === 'error' || type === 'warning') console.log(`[browser:${type}] ${message.text()}`)
      })

      try {
        const code = readFileSync(patternPath, 'utf8')
        await page.goto(`${appUrl}?livecoding=1`, { waitUntil: 'domcontentloaded' })
        await page.waitForFunction(() => window.livecoding?.run && window.hydra)
        await page.evaluate(async ({ patch, width, height }) => {
          document.getElementById('welcome-modal')?.setAttribute('hidden', '')
          document.getElementById('record-popover')?.setAttribute('hidden', '')
          document.getElementById('options-popover')?.setAttribute('hidden', '')
          window.hideCode?.()
          window.hush?.()
          window.solid?.(0, 0, 0)?.out?.()
          await Promise.resolve(window.livecoding.run(`(async () => {\n${patch}\n})()`))
          const runtime = window.hydra
          await runtime.init()
          runtime.setResolution?.(width, height)
          window.fitCanvasToWindow?.()
        }, { patch: code, width, height })

        await page.waitForTimeout(duration * 1000)
        result.status = 'ok'
      } catch (error) {
        result.status = 'error'
        result.error = error instanceof Error ? error.message : String(error)
      } finally {
        result.endedAt = new Date().toISOString()
        await page.close().catch(() => {})
        await context.close().catch(() => {})
        const videoPath = await page.video()?.path().catch(() => null)
        if (videoPath && existsSync(videoPath)) copyFileSync(videoPath, outputPath)
        writeFileSync(manifestPath, `${JSON.stringify(result)}\n`, { flag: 'a' })
      }
    }
  } finally {
    if (browser) await browser.close().catch(() => {})
    server.kill()
  }

  console.log(`Manifest: ${manifestPath}`)
  console.log(`Output: ${outDir}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
