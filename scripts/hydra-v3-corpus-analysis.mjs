#!/usr/bin/env node

import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const usage = `Usage:
  node scripts/hydra-v3-corpus-analysis.mjs --dir=docs/hydra-curated-corpus-ported-candidates-v3 --out=docs/hydra-v3-ported-corpus-analysis.md
`

const parseArgs = (argv) => {
  const args = {
    dir: 'docs/hydra-curated-corpus-ported-candidates-v3',
    out: 'docs/hydra-v3-ported-corpus-analysis.md',
    help: false
  }
  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index]
    if (raw === '--help' || raw === '-h') {
      args.help = true
      continue
    }
    if (!raw.startsWith('--')) throw new Error(`Unexpected positional argument: ${raw}`)
    const [key, inlineValue] = raw.slice(2).split('=', 2)
    const value = inlineValue ?? argv[index + 1]
    if (inlineValue === undefined) index += 1
    if (value === undefined) throw new Error(`Missing value for --${key}`)
    if (!(key in args)) throw new Error(`Unknown option --${key}`)
    args[key] = value
  }
  return args
}

const stripComments = (source) =>
  source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/(^|[^:])\/\/.*$/gmu, '$1')

const countMatches = (source, pattern) => [...source.matchAll(pattern)].length

const uniqueMatches = (source, pattern) => [...new Set([...source.matchAll(pattern)].map((match) => match[1]))]

const helperNames = ['knob', 'rng', 'hit', 'wob', 'wobc', 'ns', 'nsloop', 'choice2', 'choice3', 'choice4', 'btw', 'rn', 'bi', 'bl', 'pixelX', 'pixelY']
const operationNames = ['modulate', 'layer', 'mask', 'add', 'blend', 'diff', 'sub', 'mult', 'scale', 'rotate', 'scroll', 'scrollX', 'scrollY', 'pixelate', 'posterize', 'thresh', 'color', 'brightness', 'hue', 'kaleid', 'blur', 'dualKawaseBlur', 'sharpen', 'edgeDetect']

const countByName = (source, names) => Object.fromEntries(
  names.map((name) => [name, countMatches(source, new RegExp(`\\b${name}\\s*\\(`, 'gu'))])
)

const sumValues = (object) => Object.values(object).reduce((sum, value) => sum + value, 0)

const classifyPattern = (code) => {
  const stripped = stripComments(code)
  const helpers = countByName(stripped, helperNames)
  const ops = countByName(stripped, operationNames)
  const reads = uniqueMatches(stripped, /src\s*\(\s*(o\d+)\s*\)/gu)
  const writes = uniqueMatches(stripped, /\.out\s*\(\s*(o\d+)\s*\)/gu)
  const closed = writes.filter((buffer) => reads.includes(buffer))
  const renders = uniqueMatches(stripped, /render\s*\(\s*(o\d+)\s*\)/gu)

  const controlUses = helpers.knob + helpers.rng + helpers.hit + helpers.wob + helpers.wobc
  const hasControl = controlUses > 0
  const hasCanonicalCore = /src\s*\(\s*o\d+\s*\)[\s\S]*?\.modulate\s*\([\s\S]*?color\s*\(\s*1\s*\/\s*width\s*,\s*1\s*\/\s*height[\s\S]*?\.layer\s*\([\s\S]*?\.mask\s*\(/u.test(stripped)
  const hasMaskedIngress = /\.layer\s*\([\s\S]{0,900}?\.mask\s*\(/u.test(stripped)
  const hasAxisPacked = /color\s*\(\s*1\s*,\s*0\s*\)[\s\S]{0,180}?\.add\s*\([\s\S]{0,180}?color\s*\(\s*0\s*,\s*1\s*\)/u.test(stripped)
  const hasPixelStep = /color\s*\(\s*1\s*\/\s*width\s*,\s*1\s*\/\s*height/u.test(stripped) || /color\s*\(\s*1\s*\/\s*width\s*,\s*0/u.test(stripped) || /color\s*\(\s*0\s*,\s*1\s*\/\s*height/u.test(stripped)
  const hasTransformDelta = /gradient\s*\(\s*\)[\s\S]{0,240}?\.sub\s*\(\s*gradient\s*\(\s*\)\s*\)/u.test(stripped)
  const hasHardGate = /shape\s*\([^)]*,[^)]*,\s*0\s*\)/u.test(stripped) || /\.thresh\s*\([^)]*,\s*0\s*\)/u.test(stripped)
  const hasSoftThreshold = /\.thresh\s*\([^)]*,\s*(?!0\s*\))[^)]*\)/u.test(stripped)
  const hasGlobalBlendPressure = /src\s*\(\s*(o\d+)\s*\)[\s\S]{0,1400}?\.(?:add|blend|diff|sub)\s*\([\s\S]{0,280}?\1/u.test(stripped) || /src\s*\(\s*(o\d+)\s*\)[\s\S]{0,1400}?\.(?:add|blend|diff|sub)\s*\(\s*src\s*\(\s*\1\s*\)/u.test(stripped)
  const hasDirectFeedbackTransform = /src\s*\(\s*(o\d+)\s*\)[\s\S]{0,1200}?\.(?:scale|rotate|scroll|scrollX|scrollY)\s*\(/u.test(stripped)
  const hasRenderStaging = writes.length > 1 || reads.length > 1 || renders.some((buffer) => buffer !== 'o0')
  const hasNoiseLoop = /\bnoiseLoop\s*\(/u.test(stripped)
  const hasRepeatMetric = /repeat\s*\([^)]*width\s*\//u.test(stripped) || /repeat\s*\([^)]*height\s*\//u.test(stripped)
  const hasMetricRaster = /Math\.PI\s*\*\s*width/u.test(stripped) || /Math\.PI\s*\*\s*height/u.test(stripped) || /width\s*\/\s*\d/u.test(stripped) || /height\s*\/\s*\d/u.test(stripped)

  const tags = []
  if (hasCanonicalCore) tags.push('canonical-core')
  else if (hasMaskedIngress && hasPixelStep) tags.push('portable-core')
  else if (hasMaskedIngress) tags.push('ingress-focused')
  if (hasRenderStaging) tags.push('staging')
  if (hasControl) tags.push('parameter-signal')
  if (hasAxisPacked) tags.push('axis-packed')
  if (hasTransformDelta) tags.push('transform-delta')
  if (hasGlobalBlendPressure) tags.push('global-blend-pressure')
  if (hasDirectFeedbackTransform) tags.push('direct-transform-legacy')
  if (hasSoftThreshold) tags.push('soft-threshold')
  if (hasRepeatMetric || hasMetricRaster) tags.push('metric-raster')
  if (hasNoiseLoop) tags.push('noiseLoop')

  const rewrite = []
  if (hasControl) rewrite.push('name parameter-signal responsibilities before wiring receivers')
  if (hasGlobalBlendPressure) rewrite.push('move blend/diff/sub into material or mask the global artifact branch')
  if (hasDirectFeedbackTransform) rewrite.push('consider transform-delta field via gradient().op(...).sub(gradient())')
  if (hasRenderStaging) rewrite.push('name each buffer role: material stage, gate stage, field stage, feedback memory, or composite')
  if (hasSoftThreshold) rewrite.push('review soft threshold role: ingress gate, texture shaping, or conditioner')
  if (hasAxisPacked) rewrite.push('factor x/y fields into explicit vector-field builder')
  if (!hasPixelStep && closed.length) rewrite.push('review feedback displacement units and normalize if it is a memory drift')
  if (!rewrite.length) rewrite.push('already close; mostly needs module names and visual review')

  return {
    helpers,
    ops,
    reads,
    writes,
    closed,
    renders,
    tags,
    rewrite,
    controlUses,
    operationUses: sumValues(ops),
    lines: stripped.split(/\r?\n/u).filter((line) => line.trim()).length
  }
}

const renderMarkdown = ({ rows, totals }) => {
  const lines = [
    '# Hydra V3 Ported Corpus Analysis',
    '',
    'This analyzes the 90 v3 port candidates through the current modular feedback grammar. These are syntax-checked review candidates, not visually accepted patches.',
    '',
    '## High-Level Result',
    '',
    `- Patterns analyzed: ${rows.length}`,
    `- Patterns with texture-valued parameter signals: ${totals.withControl}`,
    `- Total parameter-signal helper uses: ${totals.controlUses}`,
    `- Closed feedback buffers detected: ${totals.withClosed}`,
    `- Staging / multi-buffer patterns: ${totals.withStaging}`,
    `- Patterns with transform-delta fields: ${totals.withTransformDelta}`,
    `- Patterns with global blend/diff/sub pressure: ${totals.withGlobalBlendPressure}`,
    `- Patterns with direct feedback transform legacy markers: ${totals.withDirectTransform}`,
    '',
    '## Current Reading',
    '',
    'The v3 pass migrated old arrays and callback motion into a visible `ParameterSignal` layer. That did not create a new style from nowhere; it exposed a practice already present in the corpus through arrays, `()=>time`, `Math.sin/cos`, `btw`, `bi/bl`, and `.pixelate(1,1)` uniform texture tricks.',
    '',
    'The main modular opportunity is now clearer:',
    '',
    '```text',
    'Material / Gate / UVField / Conditioner',
    '  receive ParameterSignal inputs',
    '  rather than hiding parameter motion as JS callbacks or Hydra arrays',
    '```',
    '',
    '## Modular Refactor Directions',
    '',
    '1. Extract `ParameterSignal` plans before writing patch code: range, center, activation density, grain, receiver.',
    '2. Name buffer roles in multi-buffer patches; avoid anonymous `o2/o3` staging unless the buffer role is obvious.',
    '3. Factor large `solid().add(...).add(...)` vector fields into x/y component builders before packing into RG.',
    '4. Treat global `.diff/.blend/.sub/.add` on feedback memory as artifact branches; either move them inside ingress material or hard-mask the artifact branch.',
    '5. Translate direct feedback `.scale/.rotate/.scroll` into transform-delta fields when the motion is meant to become field-composable.',
    '6. Review soft thresholds by role. They can shape material or conditioners, but hard ingress gates remain the default for clean feedback admission.',
    '',
    '## Legacy Thinking Exposed By The Port',
    '',
    '### Arrays And Callbacks As Hidden Parameter Motion',
    '',
    'The old corpus used arrays and `()=>time` callbacks to execute motion. V3 makes those into named `ParameterSignal` forms. This is a better fit for the grammar because it asks what kind of signal is driving the parameter: range, centered amount, identity hit, periodic range, or centered periodic wobble.',
    '',
    'Legacy form:',
    '',
    '```js',
    '.scale([1, 1, 1.00125], 1, 1, .75, .5)',
    '```',
    '',
    'Modular reading:',
    '',
    '```js',
    '.scale(hit(1, 0.00125, 0.35, 1, 0.01), 1, 1, .75, .5)',
    '```',
    '',
    'Raw Hydra reading:',
    '',
    '```js',
    '.scale(',
    '  solid(1).add(ns(1, 0.01).pixelate(1, 1).thresh(0.35, 0), 0.00125),',
    '  1, 1, .75, .5',
    ')',
    '```',
    '',
    '### Anonymous Buffer Thinking',
    '',
    'Many ports still read as `o1/o2/o3` choreography. That is historically accurate, but not modular enough for generation or mutation. A better rewrite names each buffer by role before code exists:',
    '',
    '```text',
    'o0: feedback memory',
    'o1: composite preview / render buffer',
    'o2: gate or material stage',
    'o3: chroma/material carrier',
    '```',
    '',
    'The same patch can then be reasoned as a circuit rather than a list of buffers.',
    '',
    '### Global Blend/Diff/Sub Pressure',
    '',
    'Global blend modes in feedback are valid, but they are high-energy recurrence operators. The modular rewrite is not to ban them; it is to name their responsibility.',
    '',
    'Prefer this reading:',
    '',
    '```text',
    'artifact branch = src(o0).diff(...).mask(hardArtifactGate)',
    'feedback = displaced memory + clean ingress + contained artifact branch',
    '```',
    '',
    'over treating `.diff`, `.blend`, `.sub`, and `.add` as interchangeable feedback decoration.',
    '',
    '### Direct Transform Thinking',
    '',
    'Direct `.scale`, `.rotate`, `.scroll`, `.scrollX`, and `.scrollY` are not invalid. The older corpus often uses them as immediate scalar transforms. The newer grammar asks whether that transform wants to become a composable field:',
    '',
    '```js',
    'gradient()',
    '  .scale(control)',
    '  .sub(gradient())',
    '```',
    '',
    'This matters because a transform-delta field can be masked, pixelated, blended, axis-split, normalized, and fed into feedback as a UV field.',
    '',
    '### Soft Threshold Ambiguity',
    '',
    'Soft thresholds appear throughout the corpus. The modular question is role-based:',
    '',
    '```text',
    'hard gate: ingress admission',
    'soft threshold: material shaping / conditioner / reaction term',
    'legacy soft gate: needs review before generation',
    '```',
    '',
    'This preserves the corpus while keeping hard ingress gates as the default for clean feedback admission.',
    '',
    '## Rewrite Templates',
    '',
    '### Parameter-Signal Receiver',
    '',
    '```text',
    'ParameterSignal(source, range, grain)',
    '  -> receiver parameter',
    '  -> module behavior',
    '```',
    '',
    'Hydra:',
    '',
    '```js',
    'shape(4, 1, 0)',
    '  .repeat(width / 8, height / 8, rng(0, 1, 8, 2, 0.05), 0)',
    '```',
    '',
    '### Axis-Packed Field Builder',
    '',
    '```js',
    'xField = ns(2, .05).posterize(6, 1).pixelate(8, 8).color(1, 0)',
    'yField = ns(2, .07).posterize(8, 1).pixelate(8, 8).color(0, 1)',
    '',
    'uvField = solid()',
    '  .add(xField, 1)',
    '  .add(yField, 1)',
    '  .color(1 / width, 1 / height)',
    '```',
    '',
    '### Contained Artifact Branch',
    '',
    '```js',
    'artifact = src(o0)',
    '  .diff(src(o0).blur(2))',
    '  .mask(hardArtifactGate)',
    '',
    'src(o0)',
    '  .modulate(pixelStepUVField, k)',
    '  .layer(material.mask(ingressGate))',
    '  .diff(artifact, amount)',
    '  .out(o0)',
    '```',
    '',
    '### Named Staging Buffers',
    '',
    '```text',
    'materialStage -> o2',
    'fieldStage -> o3',
    'feedbackMemory -> o0',
    'renderComposite -> o1',
    '```',
    '',
    'This is a documentation layer today. Later it can become a livecoding mutator contract.',
    '',
    '## Helper Use',
    '',
    ...Object.entries(totals.helperCounts).map(([name, count]) => `- \`${name}\`: ${count}`),
    '',
    '## Tag Counts',
    '',
    ...Object.entries(totals.tagCounts).sort((a, b) => b[1] - a[1]).map(([tag, count]) => `- ${tag}: ${count}`),
    '',
    '## Pattern Table',
    '',
    '| pattern | tags | controls | buffers | modular rewrite direction |',
    '|---|---|---:|---|---|'
  ]

  for (const row of rows) {
    const buffers = `read ${row.reads.join(',') || '-'} / write ${row.writes.join(',') || '-'}`
    lines.push(`| ${row.id} | ${row.tags.join(', ') || 'unclassified'} | ${row.controlUses} | ${buffers} | ${row.rewrite.join('; ')} |`)
  }

  lines.push(
    '',
    '## Reading Notes',
    '',
    '- `parameter-signal` means the patch now uses `rng`, `knob`, `hit`, `wob`, or `wobc` in executable code.',
    '- `transform-delta` means affine-like operations are represented as `gradient().op(...).sub(gradient())` fields.',
    '- `global-blend-pressure` is not an error. It marks artifact-heavy feedback mixing that should be named and contained when used.',
    '- `direct-transform-legacy` is not forbidden. It marks places where older scalar transform thinking may be refactored into field-composable motion.',
    '- `staging` means the patch likely needs buffer-role names before any further generation or mutation.',
    ''
  )

  return `${lines.join('\n')}\n`
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    console.log(usage)
    return
  }

  const files = (await readdir(args.dir)).filter((file) => /^pattern_.*\.v3\.js$/u.test(file)).sort()
  const rows = []
  for (const file of files) {
    const code = await readFile(path.join(args.dir, file), 'utf8')
    rows.push({
      id: file.replace(/\.v3\.js$/u, ''),
      file,
      ...classifyPattern(code)
    })
  }

  const helperCounts = Object.fromEntries(helperNames.map((name) => [name, rows.reduce((sum, row) => sum + row.helpers[name], 0)]))
  const tagCounts = {}
  for (const row of rows) {
    for (const tag of row.tags) tagCounts[tag] = (tagCounts[tag] ?? 0) + 1
  }

  const totals = {
    withControl: rows.filter((row) => row.controlUses > 0).length,
    controlUses: rows.reduce((sum, row) => sum + row.controlUses, 0),
    withClosed: rows.filter((row) => row.closed.length).length,
    withStaging: rows.filter((row) => row.tags.includes('staging')).length,
    withTransformDelta: rows.filter((row) => row.tags.includes('transform-delta')).length,
    withGlobalBlendPressure: rows.filter((row) => row.tags.includes('global-blend-pressure')).length,
    withDirectTransform: rows.filter((row) => row.tags.includes('direct-transform-legacy')).length,
    helperCounts,
    tagCounts
  }

  await writeFile(args.out, renderMarkdown({ rows, totals }))
  await writeFile(args.out.replace(/\.md$/u, '.json'), `${JSON.stringify({ totals, rows }, null, 2)}\n`)
  console.log(`Wrote ${args.out}`)
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exit(1)
})
