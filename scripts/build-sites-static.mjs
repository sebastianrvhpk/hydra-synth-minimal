import { copyFileSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(repoRoot, 'dist')
const clientDir = path.join(outDir, 'client')
const serverDir = path.join(outDir, 'server')
const hostingSource = path.join(repoRoot, '.openai', 'hosting.json')

const staticEntries = readdirSync(outDir).filter((entry) => !['.openai', 'client', 'server'].includes(entry))

mkdirSync(clientDir, { recursive: true })
for (const entry of staticEntries) {
  renameSync(path.join(outDir, entry), path.join(clientDir, entry))
}

const hydraEntry = path.join(clientDir, 'hydra', 'index.html')
const hydraHtml = readFileSync(hydraEntry, 'utf8').replaceAll(
  'content="/hydra/og.png"',
  'content="__HYDRA_ORIGIN__/hydra/og.png"'
)
writeFileSync(hydraEntry, hydraHtml, 'utf8')

mkdirSync(serverDir, { recursive: true })
writeFileSync(path.join(serverDir, 'index.js'), `const redirectToApp = (request) => {
  const url = new URL(request.url)
  url.pathname = '/hydra/'
  return Response.redirect(url.toString(), 308)
}

const renderHydraEntry = async (request, env) => {
  const requestUrl = new URL(request.url)
  const assetUrl = new URL(request.url)
  assetUrl.pathname = '/hydra/index.html'
  const response = await env.ASSETS.fetch(new Request(assetUrl, request))
  if (request.method === 'HEAD' || !response.ok) return response

  const headers = new Headers(response.headers)
  headers.delete('content-length')
  headers.delete('etag')
  const html = (await response.text()).replaceAll('__HYDRA_ORIGIN__', requestUrl.origin)
  return new Response(html, { status: response.status, statusText: response.statusText, headers })
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url)
    if (pathname === '/' || pathname === '/index.html' || pathname === '/hydra') {
      return redirectToApp(request)
    }
    if (pathname === '/hydra/' || pathname === '/hydra/index.html') {
      return renderHydraEntry(request, env)
    }
    return env.ASSETS.fetch(request)
  }
}
`, 'utf8')

const hostingOutDir = path.join(outDir, '.openai')
mkdirSync(hostingOutDir, { recursive: true })
copyFileSync(hostingSource, path.join(hostingOutDir, 'hosting.json'))

console.log(`Built Sites app into ${outDir}`)
