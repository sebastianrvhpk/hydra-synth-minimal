import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const shouldOpen = args.includes('--open')
const readArgValue = (prefix) => {
  const argPrefix = `${prefix}=`
  const matched = args.find((arg) => arg.startsWith(argPrefix))
  if (!matched) return undefined
  return matched.slice(argPrefix.length)
}

const portArg = readArgValue('--port')
const pathArg = readArgValue('--path')
const hostArg = readArgValue('--host')
const playgroundEntry = '/playground/index.html'
const port = Number.parseInt(portArg ?? '8000', 10)
const openPath = pathArg ?? playgroundEntry
const host = hostArg ?? '127.0.0.1'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const captureSessions = new Map()

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon'
}

const normalizeRequestPath = (requestUrl = '/') => {
  const parsed = new URL(requestUrl, 'http://localhost')
  let pathname = decodeURIComponent(parsed.pathname)
  if (pathname === '/') pathname = playgroundEntry
  return pathname
}

const readRequestBody = async (request) => {
  const chunks = []
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

const readJsonBody = async (request) => {
  const body = await readRequestBody(request)
  if (body.length === 0) return {}
  try {
    return JSON.parse(body.toString('utf8'))
  } catch {
    throw new Error('Invalid JSON body.')
  }
}

const sendJson = (response, status, payload) => {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  })
  response.end(JSON.stringify(payload))
}

const sendText = (response, status, message) => {
  response.writeHead(status, {
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': 'no-store'
  })
  response.end(message)
}

const isLoopbackHost = (value) => (
  value === '127.0.0.1' ||
  value === '::1' ||
  value === 'localhost'
)

const isLoopbackAddress = (value) => (
  value === '127.0.0.1' ||
  value === '::1' ||
  value === '::ffff:127.0.0.1'
)

const isLocalRequest = (request) => {
  const remoteAddress = request.socket.remoteAddress ?? ''
  if (isLoopbackAddress(remoteAddress)) return true
  if (!remoteAddress && isLoopbackHost(host)) return true
  return false
}

const normalizeCaptureExtension = (value) => {
  const extension = String(value ?? 'png').toLowerCase()
  if (extension === 'png') return 'png'
  if (extension === 'jpg' || extension === 'jpeg') return 'jpg'
  if (extension === 'webp') return 'webp'
  throw new Error('Unsupported frame extension. Use png, jpg, or webp.')
}

const captureFormatConfigs = {
  mp4: {
    outputExtension: 'mp4',
    mimeType: 'video/mp4',
    buildFfmpegArgs: ({ fps, inputPattern, outputPath }) => [
      '-y',
      '-framerate',
      String(fps),
      '-start_number',
      '0',
      '-i',
      inputPattern,
      '-vf',
      'pad=ceil(iw/2)*2:ceil(ih/2)*2',
      '-c:v',
      'libx264',
      '-preset',
      'slow',
      '-crf',
      '12',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      outputPath
    ]
  }
}

const resolveCaptureFormatConfig = (value) => captureFormatConfigs[value] ?? null
const captureFormatDescription = Object.keys(captureFormatConfigs).join(', ')

const isSafeFileName = (value) => /^[A-Za-z0-9._-]+$/u.test(value) && !value.includes('..')

const createCaptureSession = (extension) => {
  const sessionId = randomUUID()
  const root = mkdtempSync(path.join(os.tmpdir(), 'hydra-capture-'))
  const framesDir = path.join(root, 'frames')
  mkdirSync(framesDir, { recursive: true })

  const session = {
    id: sessionId,
    extension,
    root,
    framesDir,
    framePrefix: 'frame',
    frameDigits: 3,
    hasFrames: false,
    outputPath: null,
    outputName: null,
    outputMimeType: null
  }
  captureSessions.set(sessionId, session)
  return session
}

const disposeCaptureSession = (sessionId) => {
  const session = captureSessions.get(sessionId)
  if (!session) return
  captureSessions.delete(sessionId)
  rmSync(session.root, { recursive: true, force: true })
}

const updatePatternFromFileName = (session, fileName) => {
  const parsed = /^([A-Za-z0-9_-]+)-([0-9]+)\.(png|jpg|jpeg|webp)$/iu.exec(fileName)
  if (!parsed) return
  const [, prefix, digits, extension] = parsed
  session.framePrefix = prefix
  session.frameDigits = Math.max(1, digits.length)
  session.extension = normalizeCaptureExtension(extension)
}

const runFfmpeg = (args, cwd) => new Promise((resolve, reject) => {
  const child = spawn('ffmpeg', args, { cwd })
  let stderr = ''

  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString()
  })

  child.on('error', (error) => {
    reject(error)
  })

  child.on('close', (code) => {
    if (code === 0) {
      resolve({ stderr })
      return
    }
    reject(new Error(stderr || `ffmpeg exited with code ${code}.`))
  })
})

const parseCaptureDownloadPath = (pathname) => {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length !== 4) return null
  if (segments[0] !== '__capture' || segments[1] !== 'download') return null
  return { sessionId: segments[2], fileName: segments[3] }
}

const resolvePath = (pathname) => {
  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '')
  const candidate = path.resolve(rootDir, `.${safePath}`)
  if (!candidate.startsWith(rootDir)) return null
  return candidate
}

const openBrowser = (url) => {
  const options = { detached: true, stdio: 'ignore' }

  if (process.platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', url], options).unref()
    return
  }

  if (process.platform === 'darwin') {
    spawn('open', [url], options).unref()
    return
  }

  spawn('xdg-open', [url], options).unref()
}

const handleCaptureRoute = async (request, response, parsedUrl, pathname) => {
  if (pathname === '/__capture/start') {
    if (request.method !== 'POST') {
      sendText(response, 405, 'Method not allowed.')
      return true
    }

    const body = await readJsonBody(request)
    const extension = normalizeCaptureExtension(body.extension)
    const session = createCaptureSession(extension)
    sendJson(response, 200, {
      sessionId: session.id,
      extension: session.extension
    })
    return true
  }

  if (pathname === '/__capture/frame') {
    if (request.method !== 'POST') {
      sendText(response, 405, 'Method not allowed.')
      return true
    }

    const sessionId = parsedUrl.searchParams.get('sessionId')
    const fileName = parsedUrl.searchParams.get('fileName')
    if (!sessionId || !fileName) {
      sendText(response, 400, 'Missing sessionId or fileName query parameter.')
      return true
    }

    const session = captureSessions.get(sessionId)
    if (!session) {
      sendText(response, 404, 'Capture session not found.')
      return true
    }

    if (!isSafeFileName(fileName)) {
      sendText(response, 400, 'Invalid frame fileName.')
      return true
    }

    const frameExtension = normalizeCaptureExtension(path.extname(fileName).replace('.', '').toLowerCase())
    if (frameExtension !== session.extension) {
      sendText(response, 400, 'Frame extension does not match session extension.')
      return true
    }

    const frameBuffer = await readRequestBody(request)
    if (frameBuffer.length === 0) {
      sendText(response, 400, 'Frame payload is empty.')
      return true
    }

    const framePath = path.join(session.framesDir, fileName)
    if (!framePath.startsWith(session.framesDir)) {
      sendText(response, 400, 'Invalid frame path.')
      return true
    }

    writeFileSync(framePath, frameBuffer)
    updatePatternFromFileName(session, fileName)
    session.hasFrames = true
    sendJson(response, 200, { ok: true })
    return true
  }

  if (pathname === '/__capture/finalize') {
    if (request.method !== 'POST') {
      sendText(response, 405, 'Method not allowed.')
      return true
    }

    const body = await readJsonBody(request)
    const sessionId = body.sessionId
    const format = String(body.format ?? 'mp4').toLowerCase()
    const formatConfig = resolveCaptureFormatConfig(format)
    const fps = Number(body.fps)
    const outputBaseName = String(body.outputBaseName ?? `hydra-capture-${Date.now()}`)

    if (!sessionId || typeof sessionId !== 'string') {
      sendText(response, 400, 'Missing sessionId.')
      return true
    }

    if (!Number.isFinite(fps) || fps <= 0) {
      sendText(response, 400, 'Invalid fps.')
      return true
    }

    if (!formatConfig) {
      sendText(response, 400, `Unsupported format. Use ${captureFormatDescription}.`)
      return true
    }

    if (!isSafeFileName(outputBaseName)) {
      sendText(response, 400, 'Invalid outputBaseName.')
      return true
    }

    const session = captureSessions.get(sessionId)
    if (!session) {
      sendText(response, 404, 'Capture session not found.')
      return true
    }

    if (!session.hasFrames) {
      sendText(response, 400, 'No frames uploaded for this session.')
      return true
    }

    const inputPattern = path.join(
      session.framesDir,
      `${session.framePrefix}-%0${session.frameDigits}d.${session.extension}`
    )
    const outputName = `${outputBaseName}.${formatConfig.outputExtension}`
    const outputPath = path.join(session.root, outputName)
    const ffmpegArgs = formatConfig.buildFfmpegArgs({
      fps,
      inputPattern,
      outputPath
    })

    try {
      await runFfmpeg(ffmpegArgs, session.root)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const ffmpegMissing = message.includes('ENOENT')
      sendJson(response, ffmpegMissing ? 501 : 500, {
        error: ffmpegMissing
          ? 'ffmpeg is not installed or not available on PATH for the dev server process.'
          : `ffmpeg encode failed: ${message}`
      })
      return true
    }

    session.outputPath = outputPath
    session.outputName = outputName
    session.outputMimeType = formatConfig.mimeType
    sendJson(response, 200, {
      fileName: outputName,
      mimeType: session.outputMimeType,
      downloadPath: `/__capture/download/${session.id}/${outputName}`
    })
    return true
  }

  if (pathname === '/__capture/abort') {
    if (request.method !== 'POST') {
      sendText(response, 405, 'Method not allowed.')
      return true
    }

    const body = await readJsonBody(request)
    const sessionId = String(body.sessionId ?? '')
    if (!sessionId) {
      sendText(response, 400, 'Missing sessionId.')
      return true
    }

    disposeCaptureSession(sessionId)
    sendJson(response, 200, { ok: true })
    return true
  }

  const downloadInfo = parseCaptureDownloadPath(pathname)
  if (downloadInfo) {
    if (request.method !== 'GET') {
      sendText(response, 405, 'Method not allowed.')
      return true
    }

    const session = captureSessions.get(downloadInfo.sessionId)
    if (!session || !session.outputPath || !session.outputName || !session.outputMimeType) {
      sendText(response, 404, 'Capture result not found.')
      return true
    }

    if (downloadInfo.fileName !== session.outputName) {
      sendText(response, 404, 'Capture result not found.')
      return true
    }

    if (!existsSync(session.outputPath)) {
      disposeCaptureSession(downloadInfo.sessionId)
      sendText(response, 404, 'Capture result file not found.')
      return true
    }

    response.writeHead(200, {
      'content-type': session.outputMimeType,
      'content-disposition': `attachment; filename="${session.outputName}"`,
      'cache-control': 'no-store'
    })
    response.end(readFileSync(session.outputPath))
    disposeCaptureSession(downloadInfo.sessionId)
    return true
  }

  return false
}

const handleStaticRoute = (request, response, pathname) => {
  const absolutePath = resolvePath(pathname)

  if (!absolutePath || !existsSync(absolutePath)) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    response.end(`Not found: ${pathname}`)
    return
  }

  let filePath = absolutePath
  if (statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html')
    if (!existsSync(filePath)) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      response.end(`Directory index not found: ${pathname}`)
      return
    }
  }

  const extension = path.extname(filePath).toLowerCase()
  const contentType = mimeTypes[extension] ?? 'application/octet-stream'

  response.writeHead(200, {
    'content-type': contentType,
    'cache-control': 'no-store'
  })
  response.end(readFileSync(filePath))
}

const handleRequest = async (request, response) => {
  if (!isLocalRequest(request)) {
    sendJson(response, 403, {
      error: 'Dev server access is restricted to loopback clients. Pass --host=0.0.0.0 only when you explicitly want remote access.'
    })
    return
  }

  const parsedUrl = new URL(request.url ?? '/', 'http://localhost')
  const pathname = normalizeRequestPath(request.url)

  if (pathname.startsWith('/__capture/')) {
    const handled = await handleCaptureRoute(request, response, parsedUrl, pathname)
    if (handled) return
  }

  handleStaticRoute(request, response, pathname)
}

const server = http.createServer((request, response) => {
  void handleRequest(request, response).catch((error) => {
    const message = error instanceof Error ? error.message : String(error)
    sendJson(response, 500, { error: message })
  })
})

server.listen(port, host, () => {
  const publicHost = isLoopbackHost(host) ? 'localhost' : host
  const playgroundUrl = `http://${publicHost}:${port}${playgroundEntry}`
  const openUrl = `http://${publicHost}:${port}${openPath}`
  console.log(`Hydra v2 playground: ${playgroundUrl}`)

  if (shouldOpen) {
    try {
      openBrowser(openUrl)
    } catch {
      // Browser auto-open is best effort only.
    }
  }
})
