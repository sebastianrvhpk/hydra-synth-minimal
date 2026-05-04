#!/usr/bin/env node

import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const usage = `Usage:
  node scripts/hydra-corpus-form-map.mjs --dir=docs/hydra-curated-corpus-ported-candidates-v4 --out=docs/hydra-corpus-form-map.md
`

const args = {
  dir: 'docs/hydra-curated-corpus-ported-candidates-v4',
  out: 'docs/hydra-corpus-form-map.md',
  help: false
}

for (let index = 2; index < process.argv.length; index += 1) {
  const raw = process.argv[index]
  if (raw === '--help' || raw === '-h') {
    args.help = true
    continue
  }
  if (!raw.startsWith('--')) throw new Error(`Unexpected positional argument: ${raw}`)
  const [key, inline] = raw.slice(2).split('=', 2)
  const value = inline ?? process.argv[index + 1]
  if (inline === undefined) index += 1
  if (!(key in args)) throw new Error(`Unknown option --${key}`)
  if (value === undefined) throw new Error(`Missing value for --${key}`)
  args[key] = value
}

if (args.help) {
  console.log(usage)
  process.exit(0)
}

const roots = ['src', 'shape', 'solid', 'osc', 'noise', 'noiseLoop', 'gradient', 'ns', 'nsloop', 'nst', 'nstpx']
const ops = [
  'modulate',
  'modulateScale',
  'modulateRotate',
  'modulateHue',
  'modulateKaleid',
  'layer',
  'mask',
  'add',
  'sub',
  'diff',
  'blend',
  'mult',
  'scale',
  'rotate',
  'scroll',
  'scrollX',
  'scrollY',
  'repeat',
  'pixelate',
  'posterize',
  'thresh',
  'color',
  'brightness',
  'hue',
  'colorama',
  'kaleid',
  'blur',
  'dualKawaseBlur',
  'sharpen',
  'edgeDetect',
  'r',
  'g',
  'b',
  'out'
]
const controlHelpers = ['knob', 'rng', 'hit', 'wob', 'wobc']
const legacyHelpers = ['btw', 'rn', 'bi', 'bl', 'choice2', 'choice3', 'choice4', 'pixelX', 'pixelY']

const stripComments = (source) => {
  let output = ''
  let quote = null
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    const next = source[index + 1]

    if (quote) {
      output += char
      if (char === '\\') {
        index += 1
        output += source[index] ?? ''
        continue
      }
      if (char === quote) quote = null
      continue
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char
      output += char
      continue
    }

    if (char === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') index += 1
      output += '\n'
      continue
    }

    if (char === '/' && next === '*') {
      index += 2
      while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) {
        output += source[index] === '\n' ? '\n' : ' '
        index += 1
      }
      index += 1
      continue
    }

    output += char
  }
  return output
}

const countMatches = (source, pattern) => [...source.matchAll(pattern)].length

const countCalls = (source, names) =>
  Object.fromEntries(names.map((name) => [name, countMatches(source, new RegExp(`\\b${name}\\s*\\(`, 'gu'))]))

const uniqueMatches = (source, pattern) => [...new Set([...source.matchAll(pattern)].map((match) => match[1]))]

const findPatternId = (file) => path.basename(file).match(/pattern_\d+/u)?.[0] ?? path.basename(file)

const has = (source, pattern) => pattern.test(source)

const patternList = (items) => items.map((item) => item.id).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

const addForm = (forms, id, confidence, evidence) => {
  forms.push({ id, confidence, evidence })
}

const formDefs = {
  F01: {
    name: 'hard-gated feedback ingress',
    role: 'clean material enters memory through a hard gate, usually with `.layer(material.mask(gate))`',
    hydra: `src(o0)\n  .modulate(field.color(1 / width, 1 / height), k)\n  .layer(material.mask(hardGate))\n  .out(o0)`
  },
  F02: {
    name: 'compound/interleaved feedback accumulation',
    role: 'feedback path mixes repeated layers, modulation, or global blend pressure in one recurrence',
    hydra: `src(o0)\n  .layer(a.mask(gateA))\n  .modulate(fieldA, kA)\n  .layer(b.mask(gateB))\n  .diff(src(o0), amount)\n  .out(o0)`
  },
  F03: {
    name: 'multi-buffer staged circuit',
    role: 'extra buffers hold material, field, composite, render, or parallel feedback responsibilities',
    hydra: `materialStage.out(o1)\nsrc(o0).layer(src(o1).mask(gate)).out(o0)\nrender(o0)`
  },
  F04: {
    name: 'feed-forward lattice/source construction',
    role: 'shape/noise/osc program constructs a material, mask, or source without closed feedback as the main fact',
    hydra: `shape(4, 1, 0)\n  .scale(1 / n, 1, 1, 0, 0)\n  .repeat(width / n, height / n)\n  .mult(texture)\n  .out(o0)`
  },
  F05: {
    name: 'metric raster / pixel-grid form',
    role: 'width/height, repeat, pixelate, or raster oscillator math controls exact grid or scanline structure',
    hydra: `shape(4, 1, 0)\n  .scale(1 / 8, 1, 1, 0, 0)\n  .repeat(width / 8, height / 8, .5)`
  },
  F06: {
    name: 'axis-packed vector field',
    role: 'x and y displacement responsibilities are built separately then packed into R/G',
    hydra: `solid()\n  .add(xField.color(1, 0), xGain)\n  .add(yField.color(0, 1), yGain)\n  .color(1 / width, 1 / height)`
  },
  F07: {
    name: 'transform-delta coordinate field',
    role: 'a coordinate operation becomes a UV field by subtracting the identity gradient',
    hydra: `gradient()\n  .scale(scaleProgram)\n  .sub(gradient())`
  },
  F08: {
    name: 'channel / chroma carrier',
    role: 'R/G/B extraction, hue, colorama, or modulateHue is structural rather than just decoration',
    hydra: `src(o0)\n  .modulateHue(o0, k)\n  .layer(material.r(a, b).mask(gate))`
  },
  F09: {
    name: 'kaleid / symmetry recurrence',
    role: 'kaleid symmetry is used as material, field, mask, or feedback conditioner',
    hydra: `material\n  .kaleid(n)\n  .mask(gate)`
  },
  F10: {
    name: 'global artifact / blend-pressure feedback',
    role: 'diff, sub, add, or blend acts on feedback memory globally or semi-globally',
    hydra: `src(o0)\n  .modulate(field, k)\n  .layer(material.mask(gate))\n  .diff(src(o0).blur(2), amount)\n  .out(o0)`
  },
  F11: {
    name: 'spectral conditioner feedback',
    role: 'blur, dualKawaseBlur, sharpen, or edgeDetect introduces low/high frequency recurrence pressure',
    hydra: `src(o0)\n  .dualKawaseBlur(3)\n  .modulate(field, k)\n  .layer(material.mask(gate))\n  .sub(src(o0).sharpen(2), amount)\n  .out(o0)`
  },
  F12: {
    name: 'parameter-signal receiver form',
    role: 'texture-valued controls replace arrays/callbacks and drive parameters with range, grain, or activation density',
    hydra: `phase = ns(1, .03).posterize(4, 1).pixelate(1, 1).r(.5, 0)\nshape(4, 1, 0).repeat(width / 8, height / 8, phase, 0)`
  },
  F13: {
    name: 'direct-transform legacy form',
    role: 'scale, rotate, scroll, and friends act directly on feedback/material before being rewritten into fields',
    hydra: `src(o0)\n  .scale(amount, 1, 1, anchorX, anchorY)\n  .layer(material.mask(gate))\n  .out(o0)`
  }
}

const classify = (file, source) => {
  const code = stripComments(source)
  const rootCounts = countCalls(code, roots)
  const opCounts = countCalls(code, ops)
  const controlCounts = countCalls(code, controlHelpers)
  const legacyCounts = countCalls(code, legacyHelpers)
  const reads = uniqueMatches(code, /src\s*\(\s*(o\d+)\s*\)/gu)
  const writes = uniqueMatches(code, /\.out\s*\(\s*(o\d+)\s*\)/gu)
  const renders = uniqueMatches(code, /render\s*\(\s*(o\d+)\s*\)/gu)
  const closed = writes.filter((buffer) => reads.includes(buffer))
  const forms = []

  const maskedLayer = has(code, /\.layer\s*\([\s\S]{0,1600}?\.mask\s*\(/u)
  const pixelStep = has(code, /color\s*\(\s*1\s*\/\s*width\s*,\s*1\s*\/\s*height/u) ||
    has(code, /color\s*\(\s*1\s*\/\s*width\s*,\s*0/u) ||
    has(code, /color\s*\(\s*0\s*,\s*1\s*\/\s*height/u) ||
    has(code, /\/\s*width/u) && has(code, /\/\s*height/u) && has(code, /\.modulate\s*\(/u)
  const layerCount = opCounts.layer ?? 0
  const modulateCount = (opCounts.modulate ?? 0) + (opCounts.modulateScale ?? 0) + (opCounts.modulateRotate ?? 0)
  const closedFeedback = closed.length > 0
  const staging = writes.length > 1 || reads.length > 1 || renders.some((buffer) => buffer !== 'o0')
  const metricRaster = has(code, /repeat\s*\([^)]*(?:width|height)\s*\//u) ||
    has(code, /pixelate\s*\([^)]*(?:width|height)\s*\//u) ||
    has(code, /Math\.PI\s*\*\s*(?:width|height)/u) ||
    has(code, /(?:width|height)\s*\/\s*\d/u)
  const axisPacked = has(code, /color\s*\(\s*1\s*,\s*0\s*\)[\s\S]{0,500}?color\s*\(\s*0\s*,\s*1\s*\)/u) ||
    has(code, /color\s*\(\s*1\s*\/\s*width\s*,\s*0\s*\)[\s\S]{0,700}?color\s*\(\s*0\s*,\s*1\s*\/\s*height\s*\)/u)
  const transformDelta = has(code, /gradient\s*\(\s*\)[\s\S]{0,800}?\.sub\s*\(\s*gradient\s*\(\s*\)\s*\)/u)
  const channelCarrier = has(code, /\.(?:r|g|b)\s*\(/u) || has(code, /\.(?:hue|colorama|modulateHue)\s*\(/u)
  const kaleid = has(code, /\.kaleid\s*\(/u) || has(code, /\.modulateKaleid\s*\(/u)
  const globalPressure = closedFeedback && (
    has(code, /src\s*\(\s*(o\d+)\s*\)[\s\S]{0,1800}?\.(?:add|blend|diff|sub)\s*\(\s*(?:src\s*\(\s*)?\1/u) ||
    has(code, /\.diff\s*\(\s*solid\s*\(\s*\)\s*\)/u) ||
    (opCounts.diff ?? 0) + (opCounts.sub ?? 0) + (opCounts.blend ?? 0) > 2
  )
  const spectral = (opCounts.blur ?? 0) + (opCounts.dualKawaseBlur ?? 0) + (opCounts.sharpen ?? 0) + (opCounts.edgeDetect ?? 0) > 0
  const controlUses = Object.values(controlCounts).reduce((sum, count) => sum + count, 0)
  const directTransform = closedFeedback && has(code, /src\s*\(\s*o\d+\s*\)[\s\S]{0,1800}?\.(?:scale|rotate|scroll|scrollX|scrollY)\s*\(/u)
  const feedForwardLattice = !closedFeedback && (rootCounts.shape || rootCounts.osc || rootCounts.noise || rootCounts.ns) && (metricRaster || (opCounts.mask ?? 0) > 0 || (opCounts.diff ?? 0) > 0)

  if (closedFeedback && maskedLayer) {
    addForm(forms, 'F01', pixelStep ? 'high' : 'medium', pixelStep ? 'closed feedback with masked layer and dimensional/pixel-step cues' : 'closed feedback with masked layer')
  }
  if (closedFeedback && (layerCount > 1 || modulateCount > 2 || globalPressure)) {
    addForm(forms, 'F02', 'medium', 'closed recurrence has multiple layers/modulators or global pressure')
  }
  if (staging) addForm(forms, 'F03', 'high', `reads ${reads.join(',') || '-'} / writes ${writes.join(',') || '-'} / render ${renders.join(',') || '-'}`)
  if (feedForwardLattice) addForm(forms, 'F04', 'high', 'no closed feedback; source/lattice construction is primary')
  if (metricRaster) addForm(forms, 'F05', 'high', 'width/height, repeat, pixelate, or raster oscillator metric is present')
  if (axisPacked) addForm(forms, 'F06', 'high', 'x/y components are packed into R/G')
  if (transformDelta) addForm(forms, 'F07', 'high', 'gradient coordinate op minus identity gradient')
  if (channelCarrier) addForm(forms, 'F08', 'medium', 'channel extraction, hue/colorama, or modulateHue appears')
  if (kaleid) addForm(forms, 'F09', 'medium', 'kaleid symmetry participates in material/field/feedback')
  if (globalPressure) addForm(forms, 'F10', 'medium', 'global or semi-global blend/diff/sub pressure in recurrence')
  if (spectral) addForm(forms, 'F11', 'high', 'blur/sharpen/edge/dualKawase operators appear')
  if (controlUses > 0) addForm(forms, 'F12', 'high', `${controlUses} texture-valued control helper call(s)`)
  if (directTransform) addForm(forms, 'F13', 'medium', 'direct transform appears on a feedback chain')

  let primary = 'closed feedback / uncategorized'
  if (!closedFeedback && feedForwardLattice) primary = 'feed-forward lattice/source construction'
  else if (!closedFeedback) primary = 'feed-forward material/composite'
  else if (staging) primary = 'multi-buffer feedback pipeline'
  else if (maskedLayer && pixelStep) primary = 'single-buffer hard-gated pixel-step feedback'
  else if (maskedLayer) primary = 'single-buffer hard-gated feedback'
  else if (globalPressure || spectral) primary = 'memory conditioner / artifact feedback'

  return {
    file,
    id: findPatternId(file),
    code,
    rootCounts,
    opCounts,
    controlCounts,
    legacyCounts,
    reads,
    writes,
    renders,
    closed,
    primary,
    forms,
    features: {
      closedFeedback,
      staging,
      maskedLayer,
      pixelStep,
      metricRaster,
      axisPacked,
      transformDelta,
      channelCarrier,
      kaleid,
      globalPressure,
      spectral,
      controlUses,
      directTransform,
      feedForwardLattice
    }
  }
}

const top = (entries, limit = 12) =>
  entries
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .slice(0, limit)

const table = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.map((cell) => String(cell).replaceAll('|', '\\|').replace(/\s+/gu, ' ').trim()).join(' | ')} |`)
].join('\n')

const bagFor = (item) => {
  const bag = new Map()
  const add = (key, value = 1) => bag.set(key, (bag.get(key) ?? 0) + value)
  for (const form of item.forms) add(`form:${form.id}`, 3)
  add(`primary:${item.primary}`, 4)
  for (const [op, count] of Object.entries(item.opCounts)) {
    if (count > 0) add(`op:${op}`, Math.min(count, 6))
  }
  for (const read of item.reads) add(`read:${read}`, 1)
  for (const write of item.writes) add(`write:${write}`, 1)
  return bag
}

const cosine = (a, b) => {
  let dot = 0
  let aLen = 0
  let bLen = 0
  for (const value of a.values()) aLen += value * value
  for (const value of b.values()) bLen += value * value
  for (const [key, value] of a.entries()) dot += value * (b.get(key) ?? 0)
  return dot / (Math.sqrt(aLen) * Math.sqrt(bLen) || 1)
}

const buildEvolutionRuns = (items) => {
  const ordered = [...items].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
  const bags = new Map(ordered.map((item) => [item.id, bagFor(item)]))
  const links = []
  for (let index = 0; index < ordered.length - 1; index += 1) {
    const left = ordered[index]
    const right = ordered[index + 1]
    const score = cosine(bags.get(left.id), bags.get(right.id))
    if (score >= 0.72) links.push({ left: left.id, right: right.id, score })
  }

  const runs = []
  let current = []
  for (const link of links) {
    if (!current.length) current = [link.left, link.right]
    else if (current.at(-1) === link.left) current.push(link.right)
    else {
      runs.push(current)
      current = [link.left, link.right]
    }
  }
  if (current.length) runs.push(current)

  return runs.map((members) => {
    const memberItems = members.map((id) => ordered.find((item) => item.id === id))
    const formCounts = new Map()
    for (const item of memberItems) {
      for (const form of item.forms) formCounts.set(form.id, (formCounts.get(form.id) ?? 0) + 1)
    }
    return {
      members,
      sharedForms: top([...formCounts.entries()], 6).map(([id, count]) => ({ id, count })),
      primaryPath: memberItems.map((item) => item.primary)
    }
  })
}

const renderMarkdown = (items, formMembers, evolutionRuns) => {
  const primaryCounts = new Map()
  for (const item of items) primaryCounts.set(item.primary, (primaryCounts.get(item.primary) ?? 0) + 1)

  const lines = [
    '# Hydra Corpus Form Map',
    '',
    'This maps the v4 corpus into reusable patch forms. A form is not a visual family name and not a frequency claim. It is a signal-flow or graphics-program responsibility that can be recombined in a generator.',
    '',
    'The forms are intentionally non-exclusive: one patch can be hard-gated feedback, a transform-delta field patch, a channel carrier, and a global blend-pressure patch at the same time.',
    '',
    '## Summary',
    '',
    `- Patterns analyzed: ${items.length}`,
    `- Primary circuit forms: ${primaryCounts.size}`,
    `- Non-exclusive reusable forms present: ${[...formMembers.values()].filter((members) => members.length > 0).length}`,
    `- Evolution/rework runs detected by adjacent structural similarity: ${evolutionRuns.length}`,
    '',
    'Primary circuit form counts:',
    '',
    ...top([...primaryCounts.entries()], 20).map(([name, count]) => `- ${name}: ${count}`),
    '',
    '## Reusable Forms',
    ''
  ]

  const absentForms = []
  for (const [id, def] of Object.entries(formDefs)) {
    const members = formMembers.get(id) ?? []
    if (!members.length) {
      absentForms.push([id, def])
      continue
    }
    lines.push(
      `### ${id} ${def.name}`,
      '',
      def.role,
      '',
      'Hydra shape:',
      '',
      '```js',
      def.hydra,
      '```',
      '',
      `Members (${members.length}): ${members.join(', ') || '-'}`,
      ''
    )
  }

  if (absentForms.length) {
    lines.push(
      '### Grammar-adjacent but not detected in this v4 corpus',
      '',
      absentForms.map(([id, def]) => `- ${id} ${def.name}: ${def.role}`).join('\n'),
      ''
    )
  }

  lines.push(
    '## Evolution / Rework Runs',
    '',
    'These are adjacent corpus runs with high structural similarity after the v4 pass. They should be read as likely reworks, variations, or neighboring iterations, not proof of authorial intent.',
    ''
  )

  if (evolutionRuns.length) {
    lines.push(table(
      ['run', 'members', 'shared forms', 'primary path'],
      evolutionRuns.map((run, index) => [
        `run_${String(index + 1).padStart(2, '0')}`,
        run.members.join(', '),
        run.sharedForms.map((form) => `${form.id} ${formDefs[form.id]?.name ?? ''} (${form.count})`).join('; '),
        [...new Set(run.primaryPath)].join(' -> ')
      ])
    ))
  } else {
    lines.push('No adjacent runs above threshold.')
  }

  lines.push(
    '',
    '## Pattern Form Table',
    '',
    table(
      ['pattern', 'primary circuit form', 'forms', 'reads/writes'],
      items
        .slice()
        .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
        .map((item) => [
          item.id,
          item.primary,
          item.forms.map((form) => form.id).join(', '),
          `read ${item.reads.join(',') || '-'} / write ${item.writes.join(',') || '-'} / render ${item.renders.join(',') || '-'}`
        ])
    ),
    '',
    '## Generator Reading',
    '',
    'The useful abstraction is not one master family. The corpus is better read as a small number of circuit topologies receiving reusable form modules:',
    '',
    '```text',
    'Circuit topology',
    '  + ingress form',
    '  + field form',
    '  + material/gate form',
    '  + conditioner/pressure form',
    '  + parameter-signal form',
    '```',
    '',
    'This means generation should choose a circuit first, then attach compatible forms. For example:',
    '',
    '```text',
    'single-buffer hard-gated pixel-step feedback',
    '  + metric raster gate',
    '  + axis-packed vector field',
    '  + transform-delta drift',
    '  + channel/chroma carrier',
    '  + bounded global artifact branch',
    '```',
    '',
    'That is a grammar object. A specific Hydra patch is one rendering of it.'
  )

  return `${lines.join('\n')}\n`
}

const main = async () => {
  const files = (await readdir(args.dir))
    .filter((file) => /^pattern_\d+\.v\d+\.js$/u.test(file))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  const items = []
  for (const file of files) {
    const fullPath = path.join(args.dir, file)
    items.push(classify(file, await readFile(fullPath, 'utf8')))
  }

  const formMembers = new Map(Object.keys(formDefs).map((id) => [id, []]))
  for (const item of items) {
    for (const form of item.forms) formMembers.get(form.id)?.push(item.id)
  }
  for (const members of formMembers.values()) members.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  const evolutionRuns = buildEvolutionRuns(items)
  const markdown = renderMarkdown(items, formMembers, evolutionRuns)
  await writeFile(args.out, markdown)
  await writeFile(args.out.replace(/\.md$/u, '.json'), `${JSON.stringify({ forms: formDefs, patterns: items, evolutionRuns }, null, 2)}\n`)
  console.log(`Wrote ${args.out}`)
  console.log(`Wrote ${args.out.replace(/\.md$/u, '.json')}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
