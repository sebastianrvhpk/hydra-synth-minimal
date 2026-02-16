#!/usr/bin/env node

import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { chromium } from '@playwright/test'

const defaultScene = `osc(12, 0.08, 0).out()`

const parseArgs = (argv) => {
  const options = {}
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (!arg.startsWith('--')) continue
    const [rawKey, inlineValue] = arg.slice(2).split('=', 2)
    const key = rawKey.trim()
    if (!key) continue
    const value = inlineValue ?? argv[index + 1]
    if (inlineValue === undefined && argv[index + 1] && !argv[index + 1].startsWith('--')) {
      index += 1
    }
    options[key] = inlineValue !== undefined || (argv[index] && !argv[index].startsWith('--')) ? value : true
  }
  return options
}

const asPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

const asPositiveNumber = (value, fallback) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

const asNonNegativeNumber = (value, fallback) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return fallback
  return parsed
}

const asInteger = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed)) return fallback
  return parsed
}

const isReachable = async (url) => {
  try {
    return await new Promise((resolve) => {
      const request = http.get(url, (response) => {
        response.resume()
        resolve((response.statusCode ?? 0) >= 200 && (response.statusCode ?? 0) < 500)
      })
      request.on('error', () => resolve(false))
      request.setTimeout(2500, () => {
        request.destroy()
        resolve(false)
      })
    })
  } catch {
    return false
  }
}

const waitForUrl = async (url, timeoutMs = 120_000) => {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (await isReachable(url)) return
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Timed out waiting for ${url}`)
}

const startDevServer = (port) => {
  const args = ['scripts/dev-server.mjs', `--port=${port}`]
  const processHandle = spawn('node', args, {
    cwd: path.resolve(process.cwd()),
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe']
  })

  let logs = ''
  processHandle.stdout.on('data', (chunk) => {
    logs += chunk.toString()
  })
  processHandle.stderr.on('data', (chunk) => {
    logs += chunk.toString()
  })

  return {
    processHandle,
    getLogs: () => logs
  }
}

const median = (values) => {
  if (!Array.isArray(values) || values.length === 0) return 0
  const sorted = values.slice().sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

const average = (values) => {
  if (!Array.isArray(values) || values.length === 0) return 0
  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length
}

const parseFrameSampleList = (value, totalFrames) => {
  if (!value) {
    return [0, Math.max(0, Math.floor(totalFrames / 2)), Math.max(0, totalFrames - 1)]
  }
  const frames = String(value)
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => Number.parseInt(token, 10))
    .filter((frame) => Number.isFinite(frame) && frame >= 0 && frame < totalFrames)
  if (frames.length === 0) {
    return [0, Math.max(0, Math.floor(totalFrames / 2)), Math.max(0, totalFrames - 1)]
  }
  return Array.from(new Set(frames)).sort((a, b) => a - b)
}

const writeDataUrlFile = (dataUrl, filePath) => {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    throw new Error(`Invalid data URL for ${filePath}`)
  }
  const separatorIndex = dataUrl.indexOf(',')
  if (separatorIndex < 0) {
    throw new Error(`Malformed data URL for ${filePath}`)
  }
  const base64Payload = dataUrl.slice(separatorIndex + 1)
  fs.writeFileSync(filePath, Buffer.from(base64Payload, 'base64'))
}

const writeBase64File = (base64Payload, filePath) => {
  if (typeof base64Payload !== 'string' || base64Payload.length === 0) {
    throw new Error(`Invalid base64 payload for ${filePath}`)
  }
  fs.writeFileSync(filePath, Buffer.from(base64Payload, 'base64'))
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))
  const width = asPositiveInt(args.width, 1080)
  const height = asPositiveInt(args.height, 1080)
  const fps = asPositiveNumber(args.fps, 120)
  const duration = asPositiveNumber(args.duration, 1)
  const trials = asPositiveInt(args.trials, 3)
  const preRollSeconds = asNonNegativeNumber(args['pre-roll-seconds'], 15)
  const seed = asInteger(args.seed, 1337)
  const totalFrames = Math.max(1, Math.ceil(duration * fps))
  const sampleFrames = parseFrameSampleList(args.sampleFrames, totalFrames)
  const exportDiffImages = args['no-diff-images'] ? false : true
  const exportMp4Artifacts = args['no-mp4-artifacts'] ? false : true
  const sceneCode = args['scene-file']
    ? fs.readFileSync(path.resolve(String(args['scene-file'])), 'utf8')
    : defaultScene
  const outputJson = args.out ? path.resolve(String(args.out)) : null
  const diffOutputDir = args['diff-dir']
    ? path.resolve(String(args['diff-dir']))
    : outputJson
      ? path.resolve(path.dirname(outputJson), `${path.basename(outputJson, path.extname(outputJson))}-diffs`)
      : path.resolve('.tmp/bench/capture-parity-diffs')
  const mp4OutputDir = args['mp4-dir']
    ? path.resolve(String(args['mp4-dir']))
    : outputJson
      ? path.resolve(path.dirname(outputJson), `${path.basename(outputJson, path.extname(outputJson))}-mp4`)
      : path.resolve('.tmp/bench/capture-parity-mp4')
  const headless = args.headful ? false : true

  const configuredUrl = String(args.url ?? 'http://127.0.0.1:8000/playground/index.html')
  const urlObject = new URL(configuredUrl)
  const port = Number.parseInt(urlObject.port || '80', 10)

  let ownedServer = null
  if (!(await isReachable(configuredUrl))) {
    ownedServer = startDevServer(port)
    try {
      await waitForUrl(configuredUrl)
    } catch (error) {
      const logs = ownedServer.getLogs()
      try { ownedServer.processHandle.kill('SIGTERM') } catch { /* ignore */ }
      throw new Error(`${String(error)}\n\nDev server logs:\n${logs}`)
    }
  }

  const browser = await chromium.launch({ headless, channel: 'chrome' })
  const page = await browser.newPage()

  let benchmarkResult
  try {
    await page.goto(configuredUrl)

    benchmarkResult = await page.evaluate(async (config) => {
      const {
        sceneCode,
        width,
        height,
        fps,
        duration,
        preRollSeconds,
        totalFrames,
        sampleFrames,
        trials,
        seed,
        exportDiffImages,
        exportMp4Artifacts
      } = config

      const { createHydraBrowserRuntime } = await import('/packages/browser/dist/index.js')
      const { captureHydraFrameSequence, captureHydraVideo } = await import('/packages/browser/dist/capture/frame-sequence.js')

      const hasWebCodecs = typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined'
      if (!hasWebCodecs) {
        return {
          secureContext: isSecureContext,
          hasWebCodecs,
          error: 'WebCodecs (VideoEncoder/VideoFrame) is not available in this browser context.'
        }
      }

      const mulberry32 = (value) => {
        let state = value >>> 0
        return () => {
          state += 0x6D2B79F5
          let t = Math.imul(state ^ (state >>> 15), 1 | state)
          t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296
        }
      }

      const toImagePixels = async (blob, width, height) => {
        const bitmap = await createImageBitmap(blob)
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) throw new Error('Unable to acquire 2D canvas context for image decode.')
        context.drawImage(bitmap, 0, 0, width, height)
        bitmap.close()
        const pixels = context.getImageData(0, 0, width, height).data
        return new Uint8ClampedArray(pixels)
      }

      const waitForEvent = (target, eventName) =>
        new Promise((resolve, reject) => {
          const onEvent = () => {
            cleanup()
            resolve()
          }
          const onError = () => {
            cleanup()
            reject(new Error(`Media event failed: ${eventName}`))
          }
          const cleanup = () => {
            target.removeEventListener(eventName, onEvent)
            target.removeEventListener('error', onError)
          }
          target.addEventListener(eventName, onEvent, { once: true })
          target.addEventListener('error', onError, { once: true })
        })

      const parseJsonResponse = async (response) => {
        const text = await response.text()
        let payload = {}

        if (text) {
          try {
            payload = JSON.parse(text)
          } catch {
            payload = { error: text }
          }
        }

        if (!response.ok) {
          const errorMessage = typeof payload.error === 'string'
            ? payload.error
            : `Request failed with status ${response.status}.`
          throw new Error(errorMessage)
        }

        return payload
      }

      const requestCaptureSession = async ({ extension = 'png' } = {}) => {
        const response = await fetch('/__capture/start', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ extension })
        })
        return parseJsonResponse(response)
      }

      const uploadCaptureFrame = async ({ sessionId, fileName, blob }) => {
        const query = new URLSearchParams({ sessionId, fileName })
        const response = await fetch(`/__capture/frame?${query.toString()}`, {
          method: 'POST',
          body: blob
        })
        return parseJsonResponse(response)
      }

      const finalizeCaptureSession = async ({ sessionId, fps, format = 'mp4', outputBaseName }) => {
        const response = await fetch('/__capture/finalize', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sessionId, fps, format, outputBaseName })
        })
        return parseJsonResponse(response)
      }

      const fetchCaptureResultBlob = async ({ downloadPath }) => {
        const response = await fetch(downloadPath, { method: 'GET' })
        if (!response.ok) {
          const text = await response.text()
          throw new Error(text || `Download failed with status ${response.status}.`)
        }
        return response.blob()
      }

      const abortCaptureSession = async (sessionId) => {
        try {
          await fetch('/__capture/abort', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ sessionId })
          })
        } catch {
          // Best effort cleanup if the session is already gone.
        }
      }

      const uint8ToBase64 = (bytes) => {
        let binary = ''
        const chunkSize = 0x8000
        for (let index = 0; index < bytes.length; index += chunkSize) {
          const chunk = bytes.subarray(index, index + chunkSize)
          binary += String.fromCharCode(...chunk)
        }
        return btoa(binary)
      }

      const blobToBase64 = async (blob) => {
        const buffer = await blob.arrayBuffer()
        return uint8ToBase64(new Uint8Array(buffer))
      }

      const extractVideoSamples = async (blob, sampleFrames, width, height) => {
        const samplePixels = {}
        const sampleTimeErrors = {}
        const objectUrl = URL.createObjectURL(blob)
        const video = document.createElement('video')
        video.preload = 'auto'
        video.muted = true
        video.playsInline = true
        video.src = objectUrl

        await waitForEvent(video, 'loadedmetadata')
        if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          await waitForEvent(video, 'loadeddata')
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) throw new Error('Unable to acquire 2D canvas context for video decode.')

        const sortedFrames = sampleFrames.slice().sort((a, b) => a - b)
        const targets = sortedFrames.map((frame) => ({
          frame,
          time: frame / fps,
          bestError: Number.POSITIVE_INFINITY,
          bestTime: null,
          pixels: null
        }))

        const updateTargetsFromCurrentFrame = (mediaTime) => {
          let shouldCapture = false
          const errors = []
          for (const target of targets) {
            const error = Math.abs(mediaTime - target.time)
            errors.push({ target, error })
            if (error < target.bestError) shouldCapture = true
          }
          if (!shouldCapture) return

          context.drawImage(video, 0, 0, width, height)
          const pixels = new Uint8ClampedArray(context.getImageData(0, 0, width, height).data)
          for (const { target, error } of errors) {
            if (error < target.bestError) {
              target.bestError = error
              target.bestTime = mediaTime
              target.pixels = pixels
            }
          }
        }

        // Seed with the very first frame at time 0.
        updateTargetsFromCurrentFrame(video.currentTime)

        await new Promise((resolve, reject) => {
          let ended = false
          const onEnded = () => {
            ended = true
            cleanup()
            resolve()
          }
          const onError = () => {
            cleanup()
            reject(new Error('Video playback failed while extracting samples.'))
          }
          const cleanup = () => {
            video.removeEventListener('ended', onEnded)
            video.removeEventListener('error', onError)
          }
          const onFrame = (_now, metadata) => {
            updateTargetsFromCurrentFrame(metadata.mediaTime)
            if (!ended) video.requestVideoFrameCallback(onFrame)
          }

          video.addEventListener('ended', onEnded, { once: true })
          video.addEventListener('error', onError, { once: true })
          video.requestVideoFrameCallback(onFrame)
          video.play().catch((error) => {
            cleanup()
            reject(error)
          })
        })

        for (const target of targets) {
          if (!target.pixels) continue
          samplePixels[target.frame] = target.pixels
          sampleTimeErrors[target.frame] = {
            expectedTime: target.time,
            sampledTime: target.bestTime,
            absError: target.bestError
          }
        }

        URL.revokeObjectURL(objectUrl)
        video.removeAttribute('src')
        video.load()
        return { samplePixels, sampleTimeErrors }
      }

      const executeScene = (runtime, sceneCode, seed) => {
        const synth = runtime.synth
        const localScope = Object.create(null)
        const rng = mulberry32(seed)
        const randomOriginal = Math.random
        Math.random = () => rng()

        const proxy = new Proxy(localScope, {
          has: () => true,
          get: (target, property) => {
            if (property === Symbol.unscopables) return undefined
            if (Object.prototype.hasOwnProperty.call(target, property)) return target[property]
            if (Object.prototype.hasOwnProperty.call(synth, property)) return synth[property]
            return globalThis[property]
          },
          set: (target, property, value) => {
            if (Object.prototype.hasOwnProperty.call(synth, property)) {
              synth[property] = value
              return true
            }
            target[property] = value
            return true
          }
        })

        try {
          const run = new Function('scope', `with (scope) {\n${sceneCode}\n}`)
          run(proxy)
        } finally {
          Math.random = randomOriginal
        }
      }

      const waitForGPUQueue = async (runtime) => {
        const queue = runtime.renderer?.device?.queue
        if (!queue || typeof queue.onSubmittedWorkDone !== 'function') return
        await queue.onSubmittedWorkDone()
      }

      const preRollRuntime = async (runtime, seconds) => {
        if (!(seconds > 0)) return { preRollSeconds: 0, preRollFrames: 0, deltaMs: 0 }
        const deltaMs = 1000 / fps
        const preRollFrames = Math.max(0, Math.round(seconds * fps))
        for (let frame = 0; frame < preRollFrames; frame += 1) {
          runtime.tick(deltaMs)
          if ((frame + 1) % 60 === 0) {
            await waitForGPUQueue(runtime)
          }
        }
        await waitForGPUQueue(runtime)
        return { preRollSeconds: seconds, preRollFrames, deltaMs }
      }

      const pixelsToPngDataUrl = (pixels, width, height) => {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) throw new Error('Unable to acquire 2D canvas context for PNG export.')
        const imageData = new ImageData(new Uint8ClampedArray(pixels), width, height)
        context.putImageData(imageData, 0, 0)
        return canvas.toDataURL('image/png')
      }

      const buildRgbDiffPixels = (left, right, gain = 8) => {
        const output = new Uint8ClampedArray(left.length)
        for (let index = 0; index < left.length; index += 4) {
          const dr = Math.abs(left[index] - right[index])
          const dg = Math.abs(left[index + 1] - right[index + 1])
          const db = Math.abs(left[index + 2] - right[index + 2])
          output[index] = Math.min(255, dr * gain)
          output[index + 1] = Math.min(255, dg * gain)
          output[index + 2] = Math.min(255, db * gain)
          output[index + 3] = 255
        }
        return output
      }

      const buildAlphaDiffPixels = (left, right, gain = 2) => {
        const output = new Uint8ClampedArray(left.length)
        for (let index = 0; index < left.length; index += 4) {
          const da = Math.abs(left[index + 3] - right[index + 3])
          const v = Math.min(255, da * gain)
          output[index] = v
          output[index + 1] = v
          output[index + 2] = v
          output[index + 3] = 255
        }
        return output
      }

      const buildTriptychPngDataUrl = (left, right, diff, width, height) => {
        const canvas = document.createElement('canvas')
        canvas.width = width * 3
        canvas.height = height
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) throw new Error('Unable to acquire 2D canvas context for triptych export.')
        context.putImageData(new ImageData(new Uint8ClampedArray(left), width, height), 0, 0)
        context.putImageData(new ImageData(new Uint8ClampedArray(right), width, height), width, 0)
        context.putImageData(new ImageData(new Uint8ClampedArray(diff), width, height), width * 2, 0)
        return canvas.toDataURL('image/png')
      }

      const comparePixels = (left, right) => {
        if (!left || !right || left.length !== right.length) {
          return {
            comparable: false,
            rgba: null,
            rgb: null,
            alpha: null
          }
        }

        const length = left.length
        const pixelCount = Math.floor(length / 4)
        let absSumRgba = 0
        let sqSumRgba = 0
        let maxDiffRgba = 0
        let changedPixelsRgba2 = 0
        let absSumRgb = 0
        let sqSumRgb = 0
        let maxDiffRgb = 0
        let changedPixelsRgb2 = 0
        let changedPixelsRgb8 = 0
        let changedPixelsRgb16 = 0
        let absSumAlpha = 0
        let sqSumAlpha = 0
        let maxDiffAlpha = 0
        let changedPixelsAlpha2 = 0

        for (let index = 0; index < length; index += 4) {
          const dr = Math.abs(left[index] - right[index])
          const dg = Math.abs(left[index + 1] - right[index + 1])
          const db = Math.abs(left[index + 2] - right[index + 2])
          const da = Math.abs(left[index + 3] - right[index + 3])

          const pixelMaxRgba = Math.max(dr, dg, db, da)
          const pixelMaxRgb = Math.max(dr, dg, db)
          if (pixelMaxRgba > 2) changedPixelsRgba2 += 1
          if (pixelMaxRgb > 2) changedPixelsRgb2 += 1
          if (pixelMaxRgb > 8) changedPixelsRgb8 += 1
          if (pixelMaxRgb > 16) changedPixelsRgb16 += 1
          if (da > 2) changedPixelsAlpha2 += 1
          if (pixelMaxRgba > maxDiffRgba) maxDiffRgba = pixelMaxRgba
          if (pixelMaxRgb > maxDiffRgb) maxDiffRgb = pixelMaxRgb
          if (da > maxDiffAlpha) maxDiffAlpha = da

          absSumRgba += dr + dg + db + da
          sqSumRgba += dr * dr + dg * dg + db * db + da * da
          absSumRgb += dr + dg + db
          sqSumRgb += dr * dr + dg * dg + db * db
          absSumAlpha += da
          sqSumAlpha += da * da
        }

        const rgbaMae = absSumRgba / length
        const rgbaMse = sqSumRgba / length
        const rgbaRmse = Math.sqrt(rgbaMse)
        const rgbaPsnr = rgbaMse === 0 ? Number.POSITIVE_INFINITY : 10 * Math.log10((255 * 255) / rgbaMse)

        const rgbLength = pixelCount * 3
        const rgbMae = rgbLength > 0 ? absSumRgb / rgbLength : 0
        const rgbMse = rgbLength > 0 ? sqSumRgb / rgbLength : 0
        const rgbRmse = Math.sqrt(rgbMse)
        const rgbPsnr = rgbMse === 0 ? Number.POSITIVE_INFINITY : 10 * Math.log10((255 * 255) / rgbMse)

        const alphaMae = pixelCount > 0 ? absSumAlpha / pixelCount : 0
        const alphaMse = pixelCount > 0 ? sqSumAlpha / pixelCount : 0
        const alphaRmse = Math.sqrt(alphaMse)
        const alphaPsnr = alphaMse === 0 ? Number.POSITIVE_INFINITY : 10 * Math.log10((255 * 255) / alphaMse)

        return {
          comparable: true,
          rgba: {
            mae: rgbaMae,
            rmse: rgbaRmse,
            psnr: rgbaPsnr,
            maxDiff: maxDiffRgba,
            changedPixelRatioOver2: pixelCount > 0 ? changedPixelsRgba2 / pixelCount : 0
          },
          rgb: {
            mae: rgbMae,
            rmse: rgbRmse,
            psnr: rgbPsnr,
            maxDiff: maxDiffRgb,
            changedPixelRatioOver2: pixelCount > 0 ? changedPixelsRgb2 / pixelCount : 0,
            changedPixelRatioOver8: pixelCount > 0 ? changedPixelsRgb8 / pixelCount : 0,
            changedPixelRatioOver16: pixelCount > 0 ? changedPixelsRgb16 / pixelCount : 0
          },
          alpha: {
            mae: alphaMae,
            rmse: alphaRmse,
            psnr: alphaPsnr,
            maxDiff: maxDiffAlpha,
            changedPixelRatioOver2: pixelCount > 0 ? changedPixelsAlpha2 / pixelCount : 0
          }
        }
      }

      const runPipeline = async ({ method, collectSamples, collectVideoArtifact, seed, trial }) => {
        const runtime = createHydraBrowserRuntime({
          autoLoop: false,
          numSources: 4,
          numOutputs: 4,
          hostOptions: { width, height, autoAppend: false }
        })
        await runtime.init()
        let activeCaptureSessionId = null

        try {
          executeScene(runtime, sceneCode, seed)
          const preRoll = await preRollRuntime(runtime, preRollSeconds)

          if (method === 'frame-sequence') {
            const sampleFrameSet = new Set(sampleFrames)
            const selectedFrameBlobs = new Map()
            let totalBytes = 0
            let mp4Base64 = null

            if (collectVideoArtifact && exportMp4Artifacts) {
              const session = await requestCaptureSession({ extension: 'png' })
              activeCaptureSessionId = String(session.sessionId)
            }

            const started = performance.now()
            const captureResult = await captureHydraFrameSequence({
              runtime,
              width,
              height,
              fps,
              duration,
              extension: 'png',
              waitForRAF: false,
              downloadFallback: false,
              waitForGPU: true,
              ignoreEngineFpsGate: true,
              onFrameBlob: async ({ frame, fileName, blob }) => {
                totalBytes += blob.size
                if (collectSamples && sampleFrameSet.has(frame)) {
                  selectedFrameBlobs.set(frame, blob)
                }
                if (activeCaptureSessionId) {
                  await uploadCaptureFrame({
                    sessionId: activeCaptureSessionId,
                    fileName,
                    blob
                  })
                }
              }
            })
            const elapsedMs = performance.now() - started

            if (activeCaptureSessionId) {
              const outputBaseName = `bench-frame-seq-trial-${trial}`
              const encoded = await finalizeCaptureSession({
                sessionId: activeCaptureSessionId,
                fps: captureResult.fps,
                format: 'mp4',
                outputBaseName
              })
              const encodedBlob = await fetchCaptureResultBlob({ downloadPath: encoded.downloadPath })
              mp4Base64 = await blobToBase64(encodedBlob)
              activeCaptureSessionId = null
            }

            const samplePixels = {}
            if (collectSamples) {
              for (const frame of sampleFrames) {
                const blob = selectedFrameBlobs.get(frame)
                if (!blob) continue
                samplePixels[frame] = await toImagePixels(blob, width, height)
              }
            }

            return {
              method,
              elapsedMs,
              totalBytes,
              totalFrames: captureResult.totalFrames,
              ffmpegPattern: captureResult.ffmpegPattern,
              samplePixels,
              mp4Base64,
              preRoll
            }
          }

          if (method === 'webcodecs') {
            const started = performance.now()
            const blob = await captureHydraVideo({
              runtime,
              width,
              height,
              fps,
              duration,
              waitForGPU: true,
              ignoreEngineFpsGate: true
            })
            const elapsedMs = performance.now() - started
            const mp4Base64 = collectVideoArtifact && exportMp4Artifacts
              ? await blobToBase64(blob)
              : null

            const decodedSamples = collectSamples
              ? await extractVideoSamples(blob, sampleFrames, width, height)
              : { samplePixels: {}, sampleTimeErrors: {} }

            return {
              method,
              elapsedMs,
              totalBytes: blob.size,
              totalFrames,
              mimeType: blob.type || 'video/mp4',
              samplePixels: decodedSamples.samplePixels,
              sampleTimeErrors: decodedSamples.sampleTimeErrors,
              mp4Base64,
              preRoll
            }
          }

          throw new Error(`Unknown pipeline method: ${method}`)
        } finally {
          if (activeCaptureSessionId) {
            await abortCaptureSession(activeCaptureSessionId)
          }
          runtime.dispose()
        }
      }

      const frameSequenceTimes = []
      const webCodecsTimes = []
      const frameSequenceBytes = []
      const webCodecsBytes = []
      let firstTrialFrameSamples = {}
      let firstTrialWebCodecsSamples = {}
      let firstTrialWebCodecsSampleTiming = {}
      let firstTrialMeta = {}
      let firstTrialFrameSequenceMp4Base64 = null
      let firstTrialWebCodecsMp4Base64 = null

      for (let trial = 0; trial < trials; trial += 1) {
        const collectSamples = trial === 0
        const collectVideoArtifact = trial === 0
        const order = trial % 2 === 0
          ? ['frame-sequence', 'webcodecs']
          : ['webcodecs', 'frame-sequence']

        let frameSequenceResult = null
        let webCodecsResult = null

        for (const method of order) {
          const result = await runPipeline({ method, collectSamples, collectVideoArtifact, seed, trial })
          if (method === 'frame-sequence') {
            frameSequenceResult = result
          } else {
            webCodecsResult = result
          }
        }

        if (!frameSequenceResult || !webCodecsResult) {
          throw new Error('Benchmark trial failed: missing one of the pipeline results.')
        }

        frameSequenceTimes.push(frameSequenceResult.elapsedMs)
        webCodecsTimes.push(webCodecsResult.elapsedMs)
        frameSequenceBytes.push(frameSequenceResult.totalBytes)
        webCodecsBytes.push(webCodecsResult.totalBytes)

        if (collectSamples) {
          firstTrialFrameSamples = frameSequenceResult.samplePixels
          firstTrialWebCodecsSamples = webCodecsResult.samplePixels
          firstTrialWebCodecsSampleTiming = webCodecsResult.sampleTimeErrors
          firstTrialFrameSequenceMp4Base64 = frameSequenceResult.mp4Base64 ?? null
          firstTrialWebCodecsMp4Base64 = webCodecsResult.mp4Base64 ?? null
          firstTrialMeta = {
            frameSequencePattern: frameSequenceResult.ffmpegPattern,
            webcodecsMimeType: webCodecsResult.mimeType,
            webcodecsSampleTiming: firstTrialWebCodecsSampleTiming,
            preRoll: frameSequenceResult.preRoll
          }
        }
      }

      const perFrameDiff = {}
      const comparableFrames = []
      const comparableFramesTimingReliable = []
      const visualDiffs = {}
      const maxTimingErrorForReliable = 0.5 / fps
      for (const frame of sampleFrames) {
        const sequencePixels = firstTrialFrameSamples[frame]
        const webCodecsPixels = firstTrialWebCodecsSamples[frame]
        const diff = comparePixels(firstTrialFrameSamples[frame], firstTrialWebCodecsSamples[frame])
        const timing = firstTrialWebCodecsSampleTiming?.[frame] ?? null
        const timingReliable = timing ? timing.absError <= maxTimingErrorForReliable : false
        perFrameDiff[frame] = {
          ...diff,
          sampleTiming: timing,
          timingReliable
        }
        if (diff.comparable) {
          comparableFrames.push(diff)
          if (timingReliable) comparableFramesTimingReliable.push(diff)
          if (exportDiffImages && sequencePixels && webCodecsPixels) {
            const rgbDiffPixels = buildRgbDiffPixels(sequencePixels, webCodecsPixels, 8)
            const alphaDiffPixels = buildAlphaDiffPixels(sequencePixels, webCodecsPixels, 2)
            visualDiffs[frame] = {
              frameSequencePngDataUrl: pixelsToPngDataUrl(sequencePixels, width, height),
              webCodecsPngDataUrl: pixelsToPngDataUrl(webCodecsPixels, width, height),
              diffRgbPngDataUrl: pixelsToPngDataUrl(rgbDiffPixels, width, height),
              diffAlphaPngDataUrl: pixelsToPngDataUrl(alphaDiffPixels, width, height),
              triptychRgbPngDataUrl: buildTriptychPngDataUrl(sequencePixels, webCodecsPixels, rgbDiffPixels, width, height)
            }
          }
        }
      }

      const summarizeDiffFrames = (frames) => frames.length > 0
        ? {
            comparableFrameCount: frames.length,
            rgba: {
              maeAvg: frames.reduce((sum, item) => sum + (item.rgba?.mae ?? 0), 0) / frames.length,
              rmseAvg: frames.reduce((sum, item) => sum + (item.rgba?.rmse ?? 0), 0) / frames.length,
              psnrAvg: frames.reduce((sum, item) => sum + (item.rgba?.psnr ?? 0), 0) / frames.length,
              maxDiffMax: Math.max(...frames.map((item) => item.rgba?.maxDiff ?? 0)),
              changedPixelRatioOver2Avg:
                frames.reduce((sum, item) => sum + (item.rgba?.changedPixelRatioOver2 ?? 0), 0) / frames.length
            },
            rgb: {
              maeAvg: frames.reduce((sum, item) => sum + (item.rgb?.mae ?? 0), 0) / frames.length,
              rmseAvg: frames.reduce((sum, item) => sum + (item.rgb?.rmse ?? 0), 0) / frames.length,
              psnrAvg: frames.reduce((sum, item) => sum + (item.rgb?.psnr ?? 0), 0) / frames.length,
              maxDiffMax: Math.max(...frames.map((item) => item.rgb?.maxDiff ?? 0)),
              changedPixelRatioOver2Avg:
                frames.reduce((sum, item) => sum + (item.rgb?.changedPixelRatioOver2 ?? 0), 0) / frames.length,
              changedPixelRatioOver8Avg:
                frames.reduce((sum, item) => sum + (item.rgb?.changedPixelRatioOver8 ?? 0), 0) / frames.length,
              changedPixelRatioOver16Avg:
                frames.reduce((sum, item) => sum + (item.rgb?.changedPixelRatioOver16 ?? 0), 0) / frames.length
            },
            alpha: {
              maeAvg: frames.reduce((sum, item) => sum + (item.alpha?.mae ?? 0), 0) / frames.length,
              rmseAvg: frames.reduce((sum, item) => sum + (item.alpha?.rmse ?? 0), 0) / frames.length,
              psnrAvg: frames.reduce((sum, item) => sum + (item.alpha?.psnr ?? 0), 0) / frames.length,
              maxDiffMax: Math.max(...frames.map((item) => item.alpha?.maxDiff ?? 0)),
              changedPixelRatioOver2Avg:
                frames.reduce((sum, item) => sum + (item.alpha?.changedPixelRatioOver2 ?? 0), 0) / frames.length
            }
          }
        : {
            comparableFrameCount: 0,
            rgba: null,
            rgb: null,
            alpha: null
          }

      const aggregateDiff = {
        maxTimingErrorForReliable,
        allComparable: summarizeDiffFrames(comparableFrames),
        timingReliable: summarizeDiffFrames(comparableFramesTimingReliable)
      }

      return {
        secureContext: isSecureContext,
        hasWebCodecs,
        userAgent: navigator.userAgent,
        settings: {
          width,
          height,
          fps,
          duration,
          preRollSeconds,
          totalFrames,
          sampleFrames,
          trials,
          seed
        },
        timings: {
          frameSequenceMs: frameSequenceTimes,
          webCodecsMs: webCodecsTimes,
          frameSequenceBytes,
          webCodecsBytes
        },
        parity: {
          perFrameDiff,
          aggregateDiff
        },
        firstTrialMeta,
        visualDiffs,
        videoArtifacts: {
          frameSequenceMp4Base64: firstTrialFrameSequenceMp4Base64,
          webCodecsMp4Base64: firstTrialWebCodecsMp4Base64
        }
      }
    }, {
      sceneCode,
      width,
      height,
      fps,
      duration,
      preRollSeconds,
      totalFrames,
      sampleFrames,
      trials,
      seed,
      exportDiffImages,
      exportMp4Artifacts
    })
  } finally {
    await browser.close()
    if (ownedServer) {
      try { ownedServer.processHandle.kill('SIGTERM') } catch { /* ignore */ }
    }
  }

  if (!benchmarkResult || benchmarkResult.error) {
    const message = benchmarkResult?.error ?? 'Benchmark failed with unknown error.'
    throw new Error(message)
  }

  const frameTimes = benchmarkResult.timings.frameSequenceMs
  const codecTimes = benchmarkResult.timings.webCodecsMs
  const frameMedian = median(frameTimes)
  const codecMedian = median(codecTimes)
  const frameAvg = average(frameTimes)
  const codecAvg = average(codecTimes)
  const speedup = codecMedian > 0 ? frameMedian / codecMedian : null
  const frameMedianFps = frameMedian > 0 ? (totalFrames / frameMedian) * 1000 : 0
  const codecMedianFps = codecMedian > 0 ? (totalFrames / codecMedian) * 1000 : 0
  const frameLabelDigits = Math.max(3, String(Math.max(0, totalFrames - 1)).length)
  const diffArtifactFiles = []
  if (exportDiffImages) {
    const visualDiffs = benchmarkResult.visualDiffs ?? {}
    const frameEntries = Object.entries(visualDiffs)
      .map(([frame, payload]) => [Number.parseInt(frame, 10), payload])
      .filter(([frame, payload]) => Number.isFinite(frame) && payload && typeof payload === 'object')
      .sort((a, b) => a[0] - b[0])

    if (frameEntries.length > 0) {
      fs.mkdirSync(diffOutputDir, { recursive: true })
      for (const [frame, payload] of frameEntries) {
        const frameLabel = String(frame).padStart(frameLabelDigits, '0')
        const fileDefs = [
          { key: 'frameSequencePngDataUrl', suffix: 'frame-sequence' },
          { key: 'webCodecsPngDataUrl', suffix: 'webcodecs' },
          { key: 'diffRgbPngDataUrl', suffix: 'diff-rgb-x8' },
          { key: 'diffAlphaPngDataUrl', suffix: 'diff-alpha-x2' },
          { key: 'triptychRgbPngDataUrl', suffix: 'triptych-rgb' }
        ]
        for (const { key, suffix } of fileDefs) {
          const dataUrl = payload[key]
          if (typeof dataUrl !== 'string' || dataUrl.length === 0) continue
          const filePath = path.join(diffOutputDir, `frame-${frameLabel}-${suffix}.png`)
          writeDataUrlFile(dataUrl, filePath)
          diffArtifactFiles.push(filePath)
        }
      }
    }
  }

  const videoArtifactFiles = []
  const derivedVideoArtifacts = []
  const videoArtifactWarnings = []
  if (exportMp4Artifacts) {
    const frameSequenceMp4Base64 = benchmarkResult.videoArtifacts?.frameSequenceMp4Base64 ?? null
    const webCodecsMp4Base64 = benchmarkResult.videoArtifacts?.webCodecsMp4Base64 ?? null

    if (frameSequenceMp4Base64 || webCodecsMp4Base64) {
      fs.mkdirSync(mp4OutputDir, { recursive: true })
    }

    let frameSequenceMp4Path = null
    let webCodecsMp4Path = null

    if (frameSequenceMp4Base64) {
      frameSequenceMp4Path = path.join(mp4OutputDir, 'frame-sequence.mp4')
      writeBase64File(frameSequenceMp4Base64, frameSequenceMp4Path)
      videoArtifactFiles.push(frameSequenceMp4Path)
    }
    if (webCodecsMp4Base64) {
      webCodecsMp4Path = path.join(mp4OutputDir, 'webcodecs.mp4')
      writeBase64File(webCodecsMp4Base64, webCodecsMp4Path)
      videoArtifactFiles.push(webCodecsMp4Path)
    }

    if (frameSequenceMp4Path && webCodecsMp4Path) {
      const sideBySidePath = path.join(mp4OutputDir, 'compare-side-by-side.mp4')
      const diffPath = path.join(mp4OutputDir, 'compare-difference.mp4')

      const sideBySideArgs = [
        '-y',
        '-i', frameSequenceMp4Path,
        '-i', webCodecsMp4Path,
        '-filter_complex',
        '[0:v]setpts=PTS-STARTPTS[left];[1:v]setpts=PTS-STARTPTS[right];[left][right]hstack=inputs=2[v]',
        '-map', '[v]',
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '18',
        '-pix_fmt', 'yuv420p',
        sideBySidePath
      ]
      const sideBySideResult = spawnSync('ffmpeg', sideBySideArgs, { encoding: 'utf8' })
      if (sideBySideResult.status === 0) {
        derivedVideoArtifacts.push(sideBySidePath)
      } else {
        const reason = sideBySideResult.error
          ? String(sideBySideResult.error.message || sideBySideResult.error)
          : String(sideBySideResult.stderr || sideBySideResult.stdout || 'ffmpeg failed')
        videoArtifactWarnings.push(`side-by-side generation failed: ${reason}`)
      }

      const diffArgs = [
        '-y',
        '-i', frameSequenceMp4Path,
        '-i', webCodecsMp4Path,
        '-filter_complex',
        '[0:v]setpts=PTS-STARTPTS,format=rgb24[a];[1:v]setpts=PTS-STARTPTS,format=rgb24[b];[a][b]blend=all_mode=difference,eq=contrast=3.0:brightness=0.05[v]',
        '-map', '[v]',
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '18',
        '-pix_fmt', 'yuv420p',
        diffPath
      ]
      const diffResult = spawnSync('ffmpeg', diffArgs, { encoding: 'utf8' })
      if (diffResult.status === 0) {
        derivedVideoArtifacts.push(diffPath)
      } else {
        const reason = diffResult.error
          ? String(diffResult.error.message || diffResult.error)
          : String(diffResult.stderr || diffResult.stdout || 'ffmpeg failed')
        videoArtifactWarnings.push(`difference-video generation failed: ${reason}`)
      }
    }
  }

  const summary = {
    timestamp: new Date().toISOString(),
    url: configuredUrl,
    settings: {
      width,
      height,
      fps,
      duration,
      preRollSeconds,
      totalFrames,
      sampleFrames,
      trials,
      seed
    },
    environment: {
      secureContext: benchmarkResult.secureContext,
      hasWebCodecs: benchmarkResult.hasWebCodecs,
      userAgent: benchmarkResult.userAgent
    },
    performance: {
      frameSequence: {
        samplesMs: frameTimes,
        avgMs: frameAvg,
        medianMs: frameMedian,
        medianFpsEquivalent: frameMedianFps,
        avgBytes: average(benchmarkResult.timings.frameSequenceBytes),
        samplesBytes: benchmarkResult.timings.frameSequenceBytes
      },
      webCodecs: {
        samplesMs: codecTimes,
        avgMs: codecAvg,
        medianMs: codecMedian,
        medianFpsEquivalent: codecMedianFps,
        avgBytes: average(benchmarkResult.timings.webCodecsBytes),
        samplesBytes: benchmarkResult.timings.webCodecsBytes
      },
      speedupMedianFrameSequenceOverWebCodecs: speedup
    },
    parity: benchmarkResult.parity,
    firstTrialMeta: benchmarkResult.firstTrialMeta,
    diffArtifacts: {
      enabled: exportDiffImages,
      directory: diffArtifactFiles.length > 0 ? diffOutputDir : null,
      files: diffArtifactFiles
    },
    mp4Artifacts: {
      enabled: exportMp4Artifacts,
      directory: videoArtifactFiles.length > 0 || derivedVideoArtifacts.length > 0 ? mp4OutputDir : null,
      files: videoArtifactFiles,
      derivedFiles: derivedVideoArtifacts,
      warnings: videoArtifactWarnings
    }
  }

  if (outputJson) {
    fs.mkdirSync(path.dirname(outputJson), { recursive: true })
    fs.writeFileSync(outputJson, JSON.stringify(summary, null, 2))
  }

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
