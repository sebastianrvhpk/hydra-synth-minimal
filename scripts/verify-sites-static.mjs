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
  'dist/client/hydra/png-patch-metadata.js',
  'dist/client/hydra/hydra-autocomplete.js',
  'dist/client/hydra/call-scopes.js',
  'dist/client/hydra/hydra-examples.js',
  'dist/client/hydra/datastream-system.js',
  'dist/client/hydra/media/datastream/331053620855083009_1.mp4',
  'dist/client/hydra/media/datastream/331815120922316809_2.mp4',
  'dist/client/hydra/media/datastream/331815120922316809_3.mp4',
  'dist/client/hydra/og.png',
  'dist/client/hydra/synth/index.js',
  'dist/client/hydra/synth/livecoding.js',
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

for (const fileName of [
  '331053620855083009_1.mp4',
  '331815120922316809_2.mp4',
  '331815120922316809_3.mp4'
]) {
  const videoPath = path.join(repoRoot, 'dist', 'client', 'hydra', 'media', 'datastream', fileName)
  if (!existsSync(videoPath)) continue
  const video = readFileSync(videoPath)
  if (!video.subarray(4, 12).toString('ascii').includes('ftyp')) {
    failures.push(`DATASTREAM media must be a valid MP4: ${fileName}`)
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
  const pngPatchModule = await worker.fetch(new Request('https://hydra.test/hydra/png-patch-metadata.js'), env)
  if ((await pngPatchModule.text()) !== '/hydra/png-patch-metadata.js') {
    failures.push('Sites worker must pass PNG patch metadata module requests through')
  }
  if (!assetRequests.includes('/hydra/index.html')) {
    failures.push('Sites worker must resolve /hydra/ to the built app entry')
  }

}

if (failures.length > 0) {
  console.error('Sites verification failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Sites app verified.')
