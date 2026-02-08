import http from 'node:http'
import path from 'node:path'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const shouldOpen = args.includes('--open')
const portArg = args.find((arg) => arg.startsWith('--port='))
const pathArg = args.find((arg) => arg.startsWith('--path='))
const playgroundEntry = '/playground/index.html'
const port = Number.parseInt(portArg?.split('=')[1] ?? '8000', 10)
const openPath = pathArg?.split('=')[1] ?? playgroundEntry

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

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
  '.gif': 'image/gif',
  '.ico': 'image/x-icon'
}

const normalizeRequestPath = (requestUrl = '/') => {
  const parsed = new URL(requestUrl, 'http://localhost')
  let pathname = decodeURIComponent(parsed.pathname)
  if (pathname === '/') pathname = playgroundEntry
  return pathname
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

const server = http.createServer((request, response) => {
  const pathname = normalizeRequestPath(request.url)
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
})

server.listen(port, () => {
  const playgroundUrl = `http://localhost:${port}${playgroundEntry}`
  const openUrl = `http://localhost:${port}${openPath}`
  console.log(`Hydra v2 playground: ${playgroundUrl}`)

  if (shouldOpen) {
    try {
      openBrowser(openUrl)
    } catch {
      // Browser auto-open is best effort only.
    }
  }
})
