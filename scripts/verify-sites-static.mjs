import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const repoRoot = process.cwd()
const failures = []
const requiredFiles = [
  'dist/server/index.js',
  'dist/client/index.html',
  'dist/client/LICENSE',
  'dist/client/hydra/index.html',
  'dist/client/hydra/media-library.js',
  'dist/client/hydra/og.png',
  'dist/client/hydra/synth/index.js',
  'dist/client/hydra/synth/livecoding.js',
  'dist/client/workshop/index.html',
  'dist/client/workshop/app.js',
  'dist/client/workshop/content.js',
  'dist/client/workshop/styles.css',
  'dist/client/workshop/og.png',
  'dist/.openai/hosting.json'
]

for (const file of requiredFiles) {
  if (!existsSync(path.join(repoRoot, file))) failures.push(`missing Sites output: ${file}`)
}

const hostingPath = path.join(repoRoot, 'dist', '.openai', 'hosting.json')
if (existsSync(hostingPath)) {
  try {
    const hosting = JSON.parse(readFileSync(hostingPath, 'utf8'))
    if (!Object.hasOwn(hosting, 'd1') || !Object.hasOwn(hosting, 'r2')) {
      failures.push('Sites hosting metadata must declare d1 and r2')
    }
  } catch (error) {
    failures.push(`invalid Sites hosting metadata: ${error instanceof Error ? error.message : String(error)}`)
  }
}

const hydraEntry = path.join(repoRoot, 'dist', 'client', 'hydra', 'index.html')
if (existsSync(hydraEntry)) {
  const html = readFileSync(hydraEntry, 'utf8')
  if (!html.includes('__HYDRA_ORIGIN__/hydra/og.png')) {
    failures.push('Sites entry is missing the dynamic absolute social image URL')
  }
}

const imagePath = path.join(repoRoot, 'dist', 'client', 'hydra', 'og.png')
if (existsSync(imagePath)) {
  const image = readFileSync(imagePath)
  const signature = image.subarray(0, 8).toString('hex')
  if (signature !== '89504e470d0a1a0a') {
    failures.push('social preview must be a valid PNG')
  } else if (image.readUInt32BE(16) !== 1536 || image.readUInt32BE(20) !== 1024) {
    failures.push('social preview must be 1536x1024')
  }
}

const workshopEntry = path.join(repoRoot, 'dist', 'client', 'workshop', 'index.html')
if (existsSync(workshopEntry)) {
  const html = readFileSync(workshopEntry, 'utf8')
  if (!html.includes('__WORKSHOP_ORIGIN__/workshop/og.png')) {
    failures.push('workshop entry is missing the dynamic absolute social image URL')
  }
}

const workshopImagePath = path.join(repoRoot, 'dist', 'client', 'workshop', 'og.png')
if (existsSync(workshopImagePath)) {
  const image = readFileSync(workshopImagePath)
  const signature = image.subarray(0, 8).toString('hex')
  if (signature !== '89504e470d0a1a0a') {
    failures.push('workshop social preview must be a valid PNG')
  } else if (image.readUInt32BE(16) !== 1536 || image.readUInt32BE(20) !== 1024) {
    failures.push('workshop social preview must be 1536x1024')
  }
}

const workerPath = path.join(repoRoot, 'dist', 'server', 'index.js')
if (existsSync(workerPath)) {
  const worker = (await import(`${pathToFileURL(workerPath).href}?verify=${Date.now()}`)).default
  const assetRequests = []
  const env = {
    ASSETS: {
      async fetch(request) {
        const url = new URL(request.url)
        assetRequests.push(url.pathname)
        if (url.pathname === '/hydra/index.html') {
          return new Response('<meta property="og:image" content="__HYDRA_ORIGIN__/hydra/og.png">', {
            headers: { 'content-type': 'text/html; charset=utf-8' }
          })
        }
        if (url.pathname === '/workshop/index.html') {
          return new Response('<meta property="og:image" content="__WORKSHOP_ORIGIN__/workshop/og.png">', {
            headers: { 'content-type': 'text/html; charset=utf-8' }
          })
        }
        return new Response(url.pathname)
      }
    }
  }

  const redirect = await worker.fetch(new Request('https://hydra.test/?sketch=one'), env)
  if (redirect.status !== 308 || redirect.headers.get('location') !== 'https://hydra.test/hydra/?sketch=one') {
    failures.push('Sites worker must redirect the root URL to /hydra/ and preserve its query')
  }

  const entry = await worker.fetch(new Request('https://hydra.test/hydra/'), env)
  const entryHtml = await entry.text()
  if (!entryHtml.includes('content="https://hydra.test/hydra/og.png"')) {
    failures.push('Sites worker must render an absolute social image URL')
  }

  const asset = await worker.fetch(new Request('https://hydra.test/hydra/media-library.js'), env)
  if ((await asset.text()) !== '/hydra/media-library.js') {
    failures.push('Sites worker must pass static asset requests through')
  }
  if (!assetRequests.includes('/hydra/index.html')) {
    failures.push('Sites worker must resolve /hydra/ to the built app entry')
  }

  const workshopRedirect = await worker.fetch(new Request('https://hydra.test/workshop?scene=one'), env)
  if (workshopRedirect.status !== 308 || workshopRedirect.headers.get('location') !== 'https://hydra.test/workshop/?scene=one') {
    failures.push('Sites worker must redirect /workshop to /workshop/ and preserve its query')
  }

  const workshop = await worker.fetch(new Request('https://hydra.test/workshop/'), env)
  const workshopHtml = await workshop.text()
  if (!workshopHtml.includes('content="https://hydra.test/workshop/og.png"')) {
    failures.push('Sites worker must render an absolute workshop social image URL')
  }
  if (!assetRequests.includes('/workshop/index.html')) {
    failures.push('Sites worker must resolve /workshop/ to the workshop entry')
  }
}

if (failures.length > 0) {
  console.error('Sites verification failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Sites app verified.')
