import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const target = path.resolve(process.cwd(), process.argv[2] ?? 'index.html')
const failures = []

if (!existsSync(target)) {
  failures.push(`missing app entry: ${target}`)
} else {
  const html = readFileSync(target, 'utf8')
  if (!html.includes('hydra-synth')) failures.push('app entry must import hydra-synth')
  if (!html.includes('live-panel')) failures.push('app entry must include the livecoding panel')
  if (!html.includes('createHydraBrowserRuntime')) failures.push('app entry must create the synth runtime')
  if (!html.includes('saveSketchToUrl')) failures.push('app entry must include URL sketch helpers')
  if (!html.includes('loadRandomSketch')) failures.push('app entry must include random sketch helpers')
  if (!html.includes('ResizeObserver')) failures.push('app entry must persist resizable editor geometry')
  if (!html.includes('welcome-modal')) failures.push('app entry must include the first-run welcome modal')
  if (!html.includes('record-popover')) failures.push('app entry must include record settings')
  if (!html.includes('options-panel')) failures.push('app entry must include runtime/editor options')
  if (!html.includes('code-material-canvas')) failures.push('app entry must include the editor code material canvas')
  if (!html.includes('attachCodeMaterial')) failures.push('app entry must expose code material source helpers')
}

if (failures.length > 0) {
  console.error('Static app verification failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`Static app verified: ${path.relative(process.cwd(), target)}`)
