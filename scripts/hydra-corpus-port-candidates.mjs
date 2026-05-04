#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const usage = `Usage:
  node scripts/hydra-corpus-port-candidates.mjs --input="C:\\Users\\sebas\\Downloads\\curated_hydra_patterns_no_external_media.md" --audit=".tmp\\hydra-corpus-audit\\porting-audit.json" --outDir="docs\\hydra-curated-corpus-ported-candidates"

Creates first-pass semantic port candidates for the curated Hydra corpus.
The output patches are not visually accepted examples; they are reviewable ports.
`

const parseArgs = (argv) => {
  const args = {
    input: '',
    audit: '.tmp/hydra-corpus-audit/porting-audit.json',
    outDir: 'docs/hydra-curated-corpus-ported-candidates',
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

const parsePatterns = (markdown) => {
  const regex = /^###\s+(pattern_\d+)\s+-\s+([^\n]+)\n\n```js\n([\s\S]*?)\n```/gm
  const patterns = []
  let match
  while ((match = regex.exec(markdown))) {
    patterns.push({
      id: match[1],
      title: match[2].trim(),
      code: match[3].trim()
    })
  }
  return patterns
}

const matchingCloseParen = (source, openIndex) => {
  let quote = null
  let depth = 0
  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index]
    const next = source[index + 1]
    if (quote) {
      if (char === '\\') {
        index += 1
        continue
      }
      if (quote === '`' && char === '$' && next === '{') {
        depth += 1
        index += 1
        continue
      }
      if (quote === '`' && char === '}' && depth > 0) {
        depth -= 1
        continue
      }
      if (char === quote && depth === 0) quote = null
      continue
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char
      continue
    }
    if (char === '(') depth += 1
    if (char === ')') {
      depth -= 1
      if (depth === 0) return index
    }
  }
  return -1
}

const splitTopLevelArgs = (argText) => {
  const args = []
  let quote = null
  let depth = 0
  let start = 0

  for (let index = 0; index < argText.length; index += 1) {
    const char = argText[index]
    if (quote) {
      if (char === '\\') {
        index += 1
        continue
      }
      if (char === quote) quote = null
      continue
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char
      continue
    }
    if (char === '(' || char === '[' || char === '{') depth += 1
    if (char === ')' || char === ']' || char === '}') depth -= 1
    if (char === ',' && depth === 0) {
      args.push(argText.slice(start, index).trim())
      start = index + 1
    }
  }

  const tail = argText.slice(start).trim()
  if (tail) args.push(tail)
  return args
}

const replaceMethod = (code, methodName, replacer) => {
  let output = ''
  let cursor = 0
  const needle = `.${methodName}(`

  while (cursor < code.length) {
    const methodIndex = code.indexOf(needle, cursor)
    if (methodIndex < 0) {
      output += code.slice(cursor)
      break
    }

    const openIndex = methodIndex + needle.length - 1
    const closeIndex = matchingCloseParen(code, openIndex)
    if (closeIndex < 0) {
      output += code.slice(cursor)
      break
    }

    output += code.slice(cursor, methodIndex)
    const args = splitTopLevelArgs(code.slice(openIndex + 1, closeIndex))
    output += replacer(args, code.slice(methodIndex, closeIndex + 1))
    cursor = closeIndex + 1
  }

  return output
}

const asTextureExpr = (expr) => `(${expr})`

const portCode = (code) => {
  let output = code.trim()

  for (let pass = 0; pass < 6; pass += 1) {
    const before = output

    output = output.replace(/\.out\s*\(\s*\)/g, '.out(o0)')

    output = replaceMethod(output, 'modulateScrollX', (args, original) => {
      const field = args[0]
      const amount = args[1] ?? '0.5'
      const speed = args[2]
      if (!field) return original
      const scroll = speed ? `.scrollX(0, ${speed})` : ''
      return `.modulate(${asTextureExpr(field)}.r().color(1 / width, 0), (${amount}) * width)${scroll}`
    })

    output = replaceMethod(output, 'modulateScrollY', (args, original) => {
      const field = args[0]
      const amount = args[1] ?? '0.5'
      const speed = args[2]
      if (!field) return original
      const scroll = speed ? `.scrollY(0, ${speed})` : ''
      return `.modulate(${asTextureExpr(field)}.r().color(0, 1 / height), (${amount}) * height)${scroll}`
    })

    output = replaceMethod(output, 'modulateRotate', (args, original) => {
      const field = args[0]
      const multiple = args[1] ?? '1'
      const offset = args[2] ?? '0'
      if (!field) return original
      return `.modulate(gradient().rotate(${asTextureExpr(field)}.r(${multiple}, ${offset})).sub(gradient()), 1)`
    })

    output = replaceMethod(output, 'modulateScale', (args, original) => {
      const field = args[0]
      const multiple = args[1] ?? '1'
      const offset = args[2] ?? '1'
      if (!field) return original
      return `.modulate(gradient().scale(1, ${asTextureExpr(field)}.r(${multiple}, ${offset}), ${asTextureExpr(field)}.g(${multiple}, ${offset})).sub(gradient()), 1)`
    })

    if (output === before) break
  }

  return output
}

const sharedHelpers = `// Shared helpers for first-pass corpus ports.
// These are assignments, not const declarations, so snippets can be re-run in the Hydra editor.
TAU = Math.PI * 2
A = width > height ? height / width : 1
B = height > width ? width / height : 1
rn = (max = 1) => Math.random() * max
btw = (min = 0, max = 1, power = 1) => min + Math.random() ** power * (max - min)
intgr = (min = 0, max = 1, power = 1) => {
  const lo = Math.ceil(min)
  const hi = Math.floor(max)
  return lo + Math.floor(Math.random() ** power * (hi - lo + 1))
}
chc = (values, power = 1) => values[Math.min(values.length - 1, Math.floor(Math.random() ** power * values.length))]
maybe = (p = 0.5) => Math.random() < p
bi = (p = 0.5) => rn() > p ? 1 : -1
bl = (p = 0.5, power = 1) => Math.random() ** power > p ? 1 : 0
pick = (p, a, b) => maybe(p) ? a : b
ns = (freq = 3, vel = 0, x = rn(), y = rn()) =>
  noise(freq, vel).scale(1, A, B).modulate(solid(width * x, height * y), 1)
nsloop = (freq = 35, vel = 0.25, rad = 0.8, x = rn(), y = rn()) =>
  noiseloop(freq, vel, rad).modulate(solid(width * x, height * y), 1)
pixelX = () => chc([1, intgr(4, 13), width])
pixelY = () => chc([1, intgr(4, 13), height])
`

const portMoveText = {
  P: 'review feedback order; prefer pre-accumulation memory drift when clean ingress is intended',
  N: 'normalize feedback displacement into pixel-step units where possible',
  'AX?': 'review xy correlation; split axes when same-field diagonal motion is not intended',
  S: 'specialized modulation translated when math-safe, otherwise retained as a marked extension',
  'G?': 'review gate role; hard gates for ingress, soft/luma only for other roles or intended legacy behavior',
  'L/X': 'review global blend/diff/sub pressure; move into material before mask unless intentionally global',
  C: 'callback/time controls retained as legacy controls; replace manually when porting for the no-callback grammar',
  B: 'make buffer role explicit: staging, parallel feedback, or composite feedback',
  T: 'preserve metric tiling and anchor math',
  R: 'preserve raster oscillator math'
}

const parseMoveTokens = (moves) => moves.trim().split(/\s+/).filter(Boolean)

const portMovesForRow = (row) => {
  if (!row) return ''
  if (row.portMoves) return row.portMoves
  const moves = []
  if (row.bucket?.includes('staging') || row.bucket === 'extension / staging') moves.push('B')
  if (row.closed && row.feedbackAcc && !row.canonicalPre) moves.push('P')
  if (row.uv && !row.pixelNorm) moves.push('N')
  if (row.uv && !row.axisPacked) moves.push('AX?')
  if (row.specialized) moves.push('S')
  if (row.softGate) moves.push('G?')
  if (row.accumNotLayer || row.topGlobal) moves.push('L/X')
  if (row.callbacks) moves.push('C')
  if (row.metricTiling) moves.push('T')
  if (row.rasterOsc) moves.push('R')
  return moves.join(' ')
}

const renderPortFile = ({ pattern, auditRow }) => {
  const moves = parseMoveTokens(portMovesForRow(auditRow))
  const moveNotes = moves.length
    ? moves.map((move) => `- ${move}: ${portMoveText[move] ?? 'manual review'}`).join('\n')
    : '- none detected'
  const transformed = portCode(pattern.code)

  return `/*
Hydra curated corpus port candidate: ${pattern.id}
Title: ${pattern.title}
Status: semantic port, not visually accepted.
Bucket: ${auditRow?.bucket ?? 'unknown'}

Port moves:
${moveNotes}

This file preserves authored behavior where automatic conversion would be risky.
Math-safe automated rewrites currently include:
- .out() -> .out(o0)
- modulateScrollX/Y(field, amount, speed?) -> explicit .modulate(...) pixel-step equivalent
- modulateRotate(field, multiple, offset) -> gradient().rotate(...).sub(gradient()) transform delta
- modulateScale(field, multiple, offset) -> gradient().scale(...).sub(gradient()) transform delta
*/

${sharedHelpers}

${transformed}
`
}

const renderIndex = ({ patterns, auditRows, outDir }) => {
  const byBucket = new Map()
  for (const pattern of patterns) {
    const row = auditRows.get(pattern.id)
    const bucket = row?.bucket ?? 'unknown'
    byBucket.set(bucket, (byBucket.get(bucket) ?? 0) + 1)
  }

  const rows = patterns.map((pattern) => {
    const row = auditRows.get(pattern.id)
    const moves = portMovesForRow(row)
    return `| [${pattern.id}](./${pattern.id}.port.js) | ${row?.bucket ?? 'unknown'} | ${moves || 'none'} |`
  })

  return `# Hydra Curated Corpus Ported Candidates

This directory contains first-pass semantic port candidates for the 90 curated Hydra patterns.

These are not accepted visual examples. They are reviewable ports generated from the current grammar so each old patch can be tested, corrected, or rejected manually.

Generated files live in:

\`\`\`text
${outDir}
\`\`\`

## Bucket Counts

${[...byBucket.entries()].map(([bucket, count]) => `- ${bucket}: ${count}`).join('\n')}

## Port Moves

- P: feedback order review
- N: pixel-step normalization
- AX?: x/y axis responsibility review
- S: specialized modulation translation or review
- G?: gate hardness / role review
- L/X: global blend/diff/sub pressure review
- C: callback/time control review
- B: buffer role clarification
- T: metric tiling preservation
- R: raster oscillator preservation

## Ledger

| Pattern | Bucket | Port moves |
| --- | --- | --- |
${rows.join('\n')}
`
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))
  if (args.help || !args.input) {
    console.log(usage)
    process.exit(args.help ? 0 : 1)
  }

  const markdown = await readFile(args.input, 'utf8')
  const audit = JSON.parse(await readFile(args.audit, 'utf8'))
  const patterns = parsePatterns(markdown)
  const auditRows = new Map(audit.rows.map((row) => [row.id, row]))

  await mkdir(args.outDir, { recursive: true })
  for (const pattern of patterns) {
    await writeFile(
      path.join(args.outDir, `${pattern.id}.port.js`),
      renderPortFile({ pattern, auditRow: auditRows.get(pattern.id) })
    )
  }

  await writeFile(
    path.join(args.outDir, 'index.md'),
    renderIndex({ patterns, auditRows, outDir: args.outDir })
  )

  console.log(`Wrote ${patterns.length} port candidates to ${args.outDir}`)
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exit(1)
})
