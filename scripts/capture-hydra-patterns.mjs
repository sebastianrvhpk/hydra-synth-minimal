import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
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
  return stem || 'pattern'
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

const runProcess = (command, args, options = {}) => new Promise((resolve, reject) => {
  const child = spawn(command, args, options)
  let stderr = ''
  let stdout = ''
  child.stdout?.on('data', (chunk) => { stdout += chunk.toString() })
  child.stderr?.on('data', (chunk) => { stderr += chunk.toString() })
  child.on('error', reject)
  child.on('close', (code) => {
    if (code === 0) {
      resolve({ stdout, stderr })
      return
    }
    reject(new Error(stderr || stdout || `${command} exited with code ${code}`))
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

const isMediaRequest = (url = '', resourceType = '') => {
  if (resourceType === 'image' || resourceType === 'media') return true
  return /\.(?:mp4|webm|mov|m4v|png|jpe?g|webp|gif|svg)(?:[?#].*)?$/iu.test(url)
}

const resolveChromiumArgs = ({ gpuBackend }) => {
  const backend = String(gpuBackend ?? (process.platform === 'win32' ? 'd3d11' : 'vulkan')).toLowerCase()
  const args = [
    '--enable-unsafe-webgpu',
    '--autoplay-policy=no-user-gesture-required'
  ]

  if (backend === 'd3d11') {
    args.push(
      '--enable-features=UseSkiaRenderer,WebGPUDeveloperFeatures',
      '--use-angle=d3d11'
    )
  } else if (backend === 'vulkan') {
    args.push('--enable-features=Vulkan,UseSkiaRenderer,WebGPUDeveloperFeatures')
  } else if (backend === 'default') {
    args.push('--enable-features=WebGPUDeveloperFeatures')
  } else {
    throw new Error(`Unsupported --gpuBackend=${gpuBackend}. Use d3d11, vulkan, or default.`)
  }

  return args
}

const probeCaptureSupport = async ({ browser, appUrl, width, height, fps }) => {
  const context = await browser.newContext({ viewport: { width, height } })
  const page = await context.newPage()
  try {
    await page.goto(`${appUrl}?livecoding=1`, { waitUntil: 'domcontentloaded' })
    return await page.evaluate(async ({ width, height, fps }) => {
      const result = {
        webgpu: false,
        h264Avc: false,
        webcodecs: typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined',
        errors: []
      }

      if (!navigator.gpu) {
        result.errors.push('navigator.gpu is unavailable')
      } else {
        try {
          result.webgpu = Boolean(await navigator.gpu.requestAdapter())
        } catch (error) {
          result.errors.push(error instanceof Error ? error.message : String(error))
        }
      }

      if (!result.webcodecs) {
        result.errors.push('VideoEncoder/VideoFrame is unavailable')
        return result
      }

      const baseConfig = {
        width,
        height,
        bitrate: 1_000_000,
        framerate: fps,
        latencyMode: 'quality',
        avc: { format: 'avc' }
      }
      const codecs = ['avc1.640033', 'avc1.640032', 'avc1.4d002a', 'avc1.42001f']
      for (const codec of codecs) {
        try {
          const support = await VideoEncoder.isConfigSupported({ ...baseConfig, codec })
          if (support.supported) {
            result.h264Avc = true
            break
          }
        } catch (error) {
          result.errors.push(error instanceof Error ? error.message : String(error))
        }
      }

      if (!result.h264Avc) result.errors.push('H.264 AVC WebCodecs MP4 encoding is unavailable')
      return result
    }, { width, height, fps })
  } finally {
    await context.close().catch(() => {})
  }
}

const launchCaptureBrowser = async ({ appUrl, channel, headed, gpuBackend, width, height, fps }) => {
  const requestedChannels = channel
    ? [channel]
    : process.platform === 'win32'
      ? ['chrome', 'msedge', undefined]
      : ['chrome', undefined]
  const failures = []

  for (const candidateChannel of requestedChannels) {
    let browser
    const label = candidateChannel ?? 'playwright-chromium'
    try {
      browser = await chromium.launch({
        ...(candidateChannel ? { channel: candidateChannel } : {}),
        headless: !headed,
        args: resolveChromiumArgs({ gpuBackend })
      })
      const support = await probeCaptureSupport({ browser, appUrl, width, height, fps })
      if (support.webgpu && support.h264Avc) {
        console.log(`[capture] browser=${label} webgpu=ok h264-avc=ok`)
        return browser
      }

      failures.push(`${label}: ${support.errors.join('; ')}`)
      await browser.close().catch(() => {})
      browser = null
    } catch (error) {
      failures.push(`${label}: ${error instanceof Error ? error.message : String(error)}`)
      if (browser) await browser.close().catch(() => {})
    }
  }

  throw new Error(
    `No browser with WebGPU + H.264 AVC WebCodecs MP4 support was available. Tried: ${failures.join(' | ')}`
  )
}

const main = async () => {
  const defaultPatternsDir = path.resolve(process.env.USERPROFILE ?? '', 'Documents', 'New project 4', 'hydra_patterns_2026-04-29_184942')
  const patternsDir = path.resolve(readArg('patternsDir', defaultPatternsDir))
  const outDir = path.resolve(readArg('outDir', path.join(repoRoot, '.tmp', 'hydra-pattern-captures')))
  const duration = resolveNumberArg('duration', 10, { min: 0.1 })
  const fps = Math.floor(resolveNumberArg('fps', 30, { min: 24 }))
  const width = resolveNumberArg('width', 1280, { min: 2 })
  const height = resolveNumberArg('height', 720, { min: 2 })
  const port = Math.floor(resolveNumberArg('port', 8126, { min: 1 }))
  const limitRaw = readArg('limit')
  const limit = limitRaw == null ? Number.POSITIVE_INFINITY : Number(limitRaw)
  const offset = resolveNumberArg('offset', 0, { min: 0 })
  const realtime = hasFlag('realtime')
  const headed = hasFlag('headed')
  const keepFrames = hasFlag('keepFrames')
  const skipUnavailableMedia = !hasFlag('captureUnavailableMedia')
  const gpuBackend = readArg('gpuBackend')
  const waitForGPU = !hasFlag('noWaitForGPU')
  const channel = readArg('channel')

  mkdirSync(outDir, { recursive: true })

  const patterns = parsePatterns({ patternsDir, limit, offset })
  if (patterns.length === 0) throw new Error('No pattern .js files matched the requested range.')

  const manifestPath = path.join(outDir, 'manifest.jsonl')
  const server = spawn(
    process.execPath,
    ['scripts/dev-server.mjs', `--port=${port}`],
    { cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'] }
  )

  let browser
  try {
    const appUrl = await waitForServerLine(server)
    browser = await launchCaptureBrowser({ appUrl, channel, headed, gpuBackend, width, height, fps })
    const context = await browser.newContext({
      acceptDownloads: true,
      viewport: { width, height }
    })
    const page = await context.newPage()
    page.setDefaultTimeout(120_000)
    let mediaFailures = []
    page.on('console', (message) => {
      const type = message.type()
      if (type === 'error' || type === 'warning') {
        console.log(`[browser:${type}] ${message.text()}`)
      }
    })
    page.on('requestfailed', (request) => {
      if (!isMediaRequest(request.url(), request.resourceType())) return
      mediaFailures.push({
        type: 'requestfailed',
        url: request.url(),
        resourceType: request.resourceType(),
        errorText: request.failure()?.errorText ?? null
      })
    })
    page.on('response', (response) => {
      if (response.status() < 400) return
      const request = response.request()
      if (!isMediaRequest(response.url(), request.resourceType())) return
      mediaFailures.push({
        type: 'response',
        url: response.url(),
        resourceType: request.resourceType(),
        status: response.status()
      })
    })

    await page.goto(`${appUrl}?livecoding=1`, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => window.livecoding?.run && window.captureAndSaveMp4 && window.hydra)

    for (let index = 0; index < patterns.length; index += 1) {
      const patternPath = patterns[index]
      const patternName = path.basename(patternPath)
      const outputBaseName = safeFileStem(patternName)
      const outputPath = path.join(outDir, `${outputBaseName}.mp4`)
      const startedAt = new Date().toISOString()
      const code = readFileSync(patternPath, 'utf8')

      console.log(`[${index + 1}/${patterns.length}] ${patternName}`)
      const result = {
        patternPath,
        outputPath,
        outputBaseName,
        duration,
        fps,
        width,
        height,
        realtime,
        startedAt,
        endedAt: null,
        status: 'pending',
        error: null,
        mediaFailures: []
      }

      try {
        mediaFailures = []
        await page.evaluate(async (patch) => {
          document.getElementById('welcome-modal')?.setAttribute('hidden', '')
          document.getElementById('record-popover')?.setAttribute('hidden', '')
          document.getElementById('options-popover')?.setAttribute('hidden', '')
          window.hideCode?.()
          window.hush?.()
          window.solid?.(0, 0, 0)?.out?.()
          await Promise.resolve(window.livecoding.run(`(async () => {\n${patch}\n})()`))
        }, code)

        await page.waitForTimeout(skipUnavailableMedia ? 1500 : 250)
        if (skipUnavailableMedia && mediaFailures.length > 0) {
          result.status = 'skipped_media'
          result.mediaFailures = mediaFailures
          continue
        }

        await page.evaluate(async ({ width, height }) => {
          document.getElementById('welcome-modal')?.setAttribute('hidden', '')
          document.getElementById('record-popover')?.setAttribute('hidden', '')
          document.getElementById('options-popover')?.setAttribute('hidden', '')
          window.hideCode?.()
          const runtime = window.hydra
          await runtime.init()
          runtime.setResolution?.(width, height)
          if (window.synth) window.synth.fps = undefined
          window.fitCanvasToWindow?.()
        }, { width, height })

        const downloadPromise = page.waitForEvent('download', { timeout: Math.max(120_000, duration * 10_000) })
          .then((download) => ({ download }))
          .catch((error) => ({ error }))
        await page.evaluate(async ({ duration, fps, width, height, outputBaseName, realtime, waitForGPU }) => {
          await window.captureAndSaveMp4({
            duration,
            fps,
            width,
            height,
            outputBaseName,
            realtime,
            waitForGPU
          })
        }, { duration, fps, width, height, outputBaseName, realtime, waitForGPU })
        const { download, error: downloadError } = await downloadPromise
        if (downloadError) throw downloadError
        await download.saveAs(outputPath)
        result.status = 'ok'
      } catch (error) {
        result.status = 'error'
        result.error = error instanceof Error ? error.message : String(error)
      } finally {
        result.endedAt = new Date().toISOString()
        writeFileSync(manifestPath, `${JSON.stringify(result)}\n`, { flag: 'a' })
      }
    }

    await context.close()
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
