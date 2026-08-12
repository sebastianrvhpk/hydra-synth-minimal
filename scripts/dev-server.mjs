import http from 'node:http'
import path from 'node:path'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const readArgValue = (prefix) => {
  const match = args.find((arg) => arg.startsWith(`${prefix}=`))
  return match?.slice(prefix.length + 1)
}

const appEntry = '/packages/hydra/index.html'
const port = Number.parseInt(readArgValue('--port') ?? '8000', 10)
const host = readArgValue('--host') ?? '127.0.0.1'
const openPath = readArgValue('--path') ?? appEntry
const shouldOpen = args.includes('--open')
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webm': 'video/webm'
}

const resolveRequestPath = (requestUrl = '/') => {
  const parsed = new URL(requestUrl, 'http://localhost')
  const pathname = decodeURIComponent(
    parsed.pathname === '/hydra/DATASTREAM' || parsed.pathname === '/hydra/DATASTREAM/'
      ? appEntry
      : parsed.pathname === '/'
        ? appEntry
        : parsed.pathname
  )
  const candidate = path.resolve(rootDir, `.${pathname}`)
  if (candidate !== rootDir && !candidate.startsWith(`${rootDir}${path.sep}`)) return null
  if (!existsSync(candidate)) return null
  const stats = statSync(candidate)
  if (stats.isDirectory()) {
    const indexPath = path.join(candidate, 'index.html')
    return existsSync(indexPath) ? indexPath : null
  }
  return stats.isFile() ? candidate : null
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

const server = http.createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('Method not allowed.')
    return
  }

  const target = resolveRequestPath(request.url)
  if (!target) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('Not found.')
    return
  }

  const stats = statSync(target)
  const baseHeaders = {
    'accept-ranges': 'bytes',
    'cache-control': 'no-store',
    'content-type': mimeTypes[path.extname(target).toLowerCase()] ?? 'application/octet-stream'
  }
  const requestedRange = String(request.headers.range ?? '')
  const rangeMatch = /^bytes=(\d*)-(\d*)$/u.exec(requestedRange)
  if (rangeMatch) {
    const start = rangeMatch[1] ? Number.parseInt(rangeMatch[1], 10) : 0
    const end = rangeMatch[2]
      ? Math.min(stats.size - 1, Number.parseInt(rangeMatch[2], 10))
      : stats.size - 1
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start > end || start >= stats.size) {
      response.writeHead(416, { ...baseHeaders, 'content-range': `bytes */${stats.size}` })
      response.end()
      return
    }
    response.writeHead(206, {
      ...baseHeaders,
      'content-length': end - start + 1,
      'content-range': `bytes ${start}-${end}/${stats.size}`
    })
    if (request.method === 'HEAD') response.end()
    else createReadStream(target, { start, end }).pipe(response)
    return
  }

  response.writeHead(200, { ...baseHeaders, 'content-length': stats.size })
  if (request.method === 'HEAD') response.end()
  else createReadStream(target).pipe(response)
})

server.listen(port, host, () => {
  const url = `http://${host}:${port}${openPath}`
  console.log(`Hydra: ${url}`)
  if (shouldOpen) openBrowser(url)
})
