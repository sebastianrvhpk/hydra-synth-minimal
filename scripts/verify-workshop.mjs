import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { movements, scenes } from '../packages/workshop/content.js'
import {
  controlSets,
  defaults,
  getCode,
  getPatch,
  recoveries
} from '../packages/workshop/patches.js'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packageDir = path.join(repoRoot, 'packages', 'workshop')
const failures = []

const requiredFiles = ['index.html', 'styles.css', 'content.js', 'patches.js', 'app.js', 'og.png']
for (const fileName of requiredFiles) {
  if (!existsSync(path.join(packageDir, fileName))) failures.push(`missing workshop file: ${fileName}`)
}

const html = readFileSync(path.join(packageDir, 'index.html'), 'utf8')
const css = readFileSync(path.join(packageDir, 'styles.css'), 'utf8')
const app = readFileSync(path.join(packageDir, 'app.js'), 'utf8')
const patchSource = readFileSync(path.join(packageDir, 'patches.js'), 'utf8')
const contentSource = readFileSync(path.join(packageDir, 'content.js'), 'utf8')

for (const marker of [
  'hydra-synth',
  'hydra-canvas',
  'scene-statement',
  'code-lines',
  'experiment-controls',
  'map-panel',
  'notes-panel',
  'media-input',
  'app.js'
]) {
  if (!html.includes(marker)) failures.push(`workshop entry is missing marker: ${marker}`)
}

for (const marker of [
  'createHydraBrowserRuntime',
  'runCurrentPatch',
  'renderCode',
  'renderControls',
  'copyWorkshopUrl',
  'facilitator'
]) {
  if (!app.includes(marker)) failures.push(`workshop app is missing interaction marker: ${marker}`)
}

for (const marker of ['openingCode', 'branchA', 'branchB', 'feedbackEnabled', 'prev()']) {
  if (!patchSource.includes(marker)) failures.push(`patch family is missing marker: ${marker}`)
}

if (/data:image\/svg/iu.test(css) || /<svg\b/iu.test(html + app + patchSource)) {
  failures.push('workshop must not contain model-authored inline SVG')
}

if (/\b(?:audio|fft|mic|initAudio)\b/iu.test(contentSource)) {
  failures.push('the two-hour workshop core must not introduce audio-reactive material')
}

if (scenes.length !== 33) failures.push(`workshop contract requires 33 scenes; found ${scenes.length}`)
if (new Set(scenes.map((scene) => scene.id)).size !== scenes.length) {
  failures.push('workshop scene ids must be unique')
}

const movementIds = new Set(movements.map((movement) => movement.id))
if (movementIds.size !== 5) failures.push('workshop contract requires five cumulative movements')

const validModes = new Set(['phenomenon', 'coupling', 'model', 'reference', 'workshop', 'pause', 'closing'])
const validCodeModes = new Set(['hidden', 'contextual', 'primary'])
let totalMinutes = 0
let expectedStart = 0

const parseClock = (clock) => {
  const match = /^(\d{2}):(\d{2})$/u.exec(clock)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

for (const [index, scene] of scenes.entries()) {
  for (const field of ['id', 'movement', 'time', 'mode', 'title', 'statement', 'patch', 'code']) {
    if (!scene[field]) failures.push(`scene ${index + 1} is missing ${field}`)
  }

  if (!movementIds.has(scene.movement)) failures.push(`unknown movement for scene: ${scene.id}`)
  if (!validModes.has(scene.mode)) failures.push(`unknown layout mode for scene: ${scene.id}`)
  if (!validCodeModes.has(scene.code)) failures.push(`unknown code visibility for scene: ${scene.id}`)

  const timeMatch = /^(\d{2}:\d{2})–(\d{2}:\d{2})$/u.exec(scene.time)
  if (!timeMatch) {
    failures.push(`invalid time range for scene: ${scene.id}`)
  } else {
    const start = parseClock(timeMatch[1])
    const end = parseClock(timeMatch[2])
    if (start !== expectedStart) failures.push(`non-cumulative time range at scene: ${scene.id}`)
    if (end <= start) failures.push(`non-positive duration at scene: ${scene.id}`)
    totalMinutes += end - start
    expectedStart = end
  }

  const patch = getPatch(scene.patch)
  if (!patch || typeof patch.run !== 'function' || typeof patch.code !== 'function') {
    failures.push(`unknown patch for scene ${scene.id}: ${scene.patch}`)
    continue
  }

  const specification = getCode(scene.patch, { ...defaults }, { scene })
  if (!specification.text || !Array.isArray(specification.lines)) {
    failures.push(`patch code is not inspectable for scene: ${scene.id}`)
  }

  const alternateSpecification = scene.patch === 'feedback'
    ? getCode(scene.patch, { ...defaults, feedbackEnabled: true }, { scene })
    : specification
  const regions = new Set([
    ...specification.lines.map((line) => line.region),
    ...alternateSpecification.lines.map((line) => line.region)
  ])
  for (const focus of scene.focus || []) {
    if (!regions.has(focus)) failures.push(`focus region ${focus} is absent in scene: ${scene.id}`)
  }

  if (scene.controls) {
    const definitions = controlSets[scene.controls]
    if (!definitions) failures.push(`unknown control set for scene ${scene.id}: ${scene.controls}`)
    else {
      const controlCount = definitions.reduce(
        (count, definition) => count + (definition.type === 'actions' ? definition.actions.length : 1),
        0
      )
      if (controlCount > 3) failures.push(`scene ${scene.id} exposes more than three controls`)
    }
  }

  if (scene.recovery && !recoveries[scene.recovery]) {
    failures.push(`unknown recovery point for scene ${scene.id}: ${scene.recovery}`)
  }

  for (const source of scene.sources || []) {
    if (!source.label || !/^https:\/\//u.test(source.href)) {
      failures.push(`invalid source reference for scene: ${scene.id}`)
    }
  }
}

if (totalMinutes !== 120 || expectedStart !== 120) {
  failures.push(`workshop must accumulate to 120 minutes; found ${totalMinutes}`)
}

const returnScene = scenes.find((scene) => scene.id === 'regreso-al-sistema')
if (scenes[0]?.patch !== returnScene?.patch || scenes[0]?.patch !== 'opening') {
  failures.push('D0 and D8 must return to the same opening patch family')
}

const sourcesToParse = [
  ['app.js', app],
  ['patches.js', patchSource],
  ['content.js', contentSource]
]

for (const [fileName, source] of sourcesToParse) {
  const sourceFile = ts.createSourceFile(
    path.join(packageDir, fileName),
    source,
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.JS
  )
  for (const diagnostic of sourceFile.parseDiagnostics) {
    const location = typeof diagnostic.start === 'number'
      ? sourceFile.getLineAndCharacterOfPosition(diagnostic.start)
      : { line: 0, character: 0 }
    failures.push(
      `${fileName} parse error at ${location.line + 1}:${location.character + 1}: ` +
      ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')
    )
  }
}

if (failures.length > 0) {
  console.error('Workshop verification failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`Workshop verified: ${scenes.length} scenes, ${movements.length} movements, ${totalMinutes} minutes.`)
