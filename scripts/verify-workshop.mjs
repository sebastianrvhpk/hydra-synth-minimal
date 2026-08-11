import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { chapters, scenes } from '../packages/workshop/content.js'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packageDir = path.join(repoRoot, 'packages', 'workshop')
const failures = []

const requiredFiles = ['index.html', 'styles.css', 'content.js', 'app.js']
for (const fileName of requiredFiles) {
  if (!existsSync(path.join(packageDir, fileName))) failures.push('missing workshop file: ' + fileName)
}

const html = readFileSync(path.join(packageDir, 'index.html'), 'utf8')
const css = readFileSync(path.join(packageDir, 'styles.css'), 'utf8')
const app = readFileSync(path.join(packageDir, 'app.js'), 'utf8')

for (const marker of [
  'hydra-synth',
  'hydra-canvas',
  'experiment-controls',
  'code-panel',
  'map-panel',
  'media-input',
  'app.js'
]) {
  if (!html.includes(marker)) failures.push('workshop entry is missing marker: ' + marker)
}

for (const marker of [
  'createHydraBrowserRuntime',
  'parameterField',
  'deepIntermod',
  'prevN',
  'codeTexture',
  'startInterfaceRecording'
]) {
  if (!app.includes(marker)) failures.push('workshop app is missing capability marker: ' + marker)
}

if (/data:image\/svg/iu.test(css) || /<svg\b/iu.test(html + app)) {
  failures.push('workshop must not contain model-authored inline SVG')
}

if (scenes.length < 30) failures.push('workshop needs at least 30 cognitive scenes')
if (new Set(scenes.map((scene) => scene.id)).size !== scenes.length) {
  failures.push('workshop scene ids must be unique')
}

const chapterIds = new Set(chapters.map((chapter) => chapter.id))
for (const scene of scenes) {
  if (!chapterIds.has(scene.chapter)) failures.push('unknown chapter for scene: ' + scene.id)
}

const patchBlock = app.slice(app.indexOf('const patchLibrary = {'), app.indexOf('const getPatch ='))
const patchNames = new Set(
  Array.from(patchBlock.matchAll(/^  ([A-Za-z][A-Za-z0-9]*): \{/gmu), (match) => match[1])
)
for (const scene of scenes) {
  if (!patchNames.has(scene.patch)) failures.push('unknown patch for scene ' + scene.id + ': ' + scene.patch)
}

const sourceFile = ts.createSourceFile(
  path.join(packageDir, 'app.js'),
  app,
  ts.ScriptTarget.ESNext,
  true,
  ts.ScriptKind.JS
)
for (const diagnostic of sourceFile.parseDiagnostics) {
  const location = typeof diagnostic.start === 'number'
    ? sourceFile.getLineAndCharacterOfPosition(diagnostic.start)
    : { line: 0, character: 0 }
  failures.push(
    'app.js parse error at ' +
    String(location.line + 1) +
    ':' +
    String(location.character + 1) +
    ': ' +
    ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')
  )
}

if (failures.length > 0) {
  console.error('Workshop verification failed:')
  for (const failure of failures) console.error('- ' + failure)
  process.exit(1)
}

console.log('Workshop verified: ' + scenes.length + ' scenes across ' + chapters.length + ' chapters.')
