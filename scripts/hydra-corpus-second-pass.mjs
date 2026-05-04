#!/usr/bin/env node

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const usage = `Usage:
  node scripts/hydra-corpus-second-pass.mjs --inputDir=docs/hydra-curated-corpus-ported-candidates --outDir=docs/hydra-curated-corpus-ported-candidates-v2

Creates a second-pass corpus from the first-pass port candidates.
Targets:
- move repeated helpers into shared-v2.js
- remove arrow/callback parameters
- replace Hydra array sequences with quantized texture-valued signals
- keep files syntax-checkable and reviewable
`

const parseArgs = (argv) => {
  const args = {
    inputDir: 'docs/hydra-curated-corpus-ported-candidates',
    outDir: 'docs/hydra-curated-corpus-ported-candidates-v2',
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

const sharedV2 = `// Shared helpers for Hydra curated corpus port candidates v2.
// Run once before evaluating individual pattern_*.v2.js files.

TAU = Math.PI * 2
A = width > height ? height / width : 1
B = height > width ? width / height : 1

function rn(max = 1) {
  return Math.random() * max
}

function btw(min = 0, max = 1, power = 1) {
  return min + Math.random() ** power * (max - min)
}

function intgr(min = 0, max = 1, power = 1) {
  const lo = Math.ceil(min)
  const hi = Math.floor(max)
  return lo + Math.floor(Math.random() ** power * (hi - lo + 1))
}

function maybe(p = 0.5) {
  return Math.random() < p
}

function bi(p = 0.5) {
  return rn() > p ? 1 : -1
}

function bl(p = 0.5, power = 1) {
  return Math.random() ** power > p ? 1 : 0
}

function pick(p, a, b) {
  return maybe(p) ? a : b
}

function choice2(a, b, power = 1) {
  return Math.random() ** power < 0.5 ? a : b
}

function choice3(a, b, c, power = 1) {
  const r = Math.random() ** power
  return r < 1 / 3 ? a : r < 2 / 3 ? b : c
}

function choice4(a, b, c, d, power = 1) {
  const r = Math.random() ** power
  return r < 0.25 ? a : r < 0.5 ? b : r < 0.75 ? c : d
}

function pixelX() {
  return choice3(1, intgr(4, 13), width)
}

function pixelY() {
  return choice3(1, intgr(4, 13), height)
}

function ns(freq = 3, vel = 0, x = rn(), y = rn()) {
  return noise(freq, vel)
    .scale(1, A, B)
    .modulate(solid(width * x, height * y), 1)
}

function nsloop(freq = 35, vel = 0.25, rad = 0.8, x = rn(), y = rn()) {
  return noiseloop(freq, vel, rad)
    .modulate(solid(width * x, height * y), 1)
}

function seqSignal(min = 0, max = 1, bins = 4, speed = 0.25, freq = 4) {
  const scale = (max - min) / 2
  const offset = (max + min) / 2
  return ns(freq, 0)
    .posterize(bins, 1)
    .pixelate(bins, 1)
    .scrollX(0, speed)
    .pixelate(1, 1)
    .r(scale, offset)
}

function uniSignal(min = 0, max = 1, bins = 8, freq = 1, vel = 0.05) {
  const scale = (max - min) / 2
  const offset = (max + min) / 2
  return nsloop(freq, vel, 0.8)
    .posterize(bins, 1)
    .pixelate(1, 1)
    .r(scale, offset)
}

function oscSignal(min = 0, max = 1, sync = 0.05) {
  return osc(Math.PI * 2, sync, 1)
    .pixelate(1, 1)
    .r(max - min, min)
}
`

const extractHeader = (code) => {
  const match = /^\/\*[\s\S]*?\*\//.exec(code)
  return match ? match[0] : ''
}

const stripHeaderAndHelpers = (code) => {
  let body = code.replace(/^\/\*[\s\S]*?\*\/\s*/u, '')
  body = body.replace(
    /\/\/ Shared helpers for first-pass corpus ports\.[\s\S]*?pixelY = \(\) => chc\(\[1, intgr\(4, 13\), height\]\)\s*/u,
    ''
  )
  return body.trim()
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

const numericValue = (text) => {
  const normalized = text.trim()
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/iu.test(normalized)) return null
  return Number(normalized)
}

const compactNumber = (value) => {
  if (Object.is(value, -0)) return '0'
  return Number(value.toFixed(8)).toString()
}

const arrayToSignal = (items, speed = '0.25') => {
  const numbers = items.map(numericValue)
  const bins = Math.max(items.length, 2)
  if (numbers.every((value) => value !== null)) {
    const min = Math.min(...numbers)
    const max = Math.max(...numbers)
    return `seqSignal(${compactNumber(min)}, ${compactNumber(max)}, ${bins}, ${speed})`
  }
  return `seqSignal(0, 1, ${bins}, ${speed})`
}

const replaceChoiceArrays = (code) =>
  code.replace(/chc\s*\(\s*\[([^\]]+)\]\s*(?:,\s*([^)]+))?\)/gu, (_match, rawItems, power) => {
    const items = splitTopLevelArgs(rawItems)
    const suffix = power ? `, ${power.trim()}` : ''
    if (items.length === 2) return `choice2(${items[0]}, ${items[1]}${suffix})`
    if (items.length === 3) return `choice3(${items[0]}, ${items[1]}, ${items[2]}${suffix})`
    if (items.length === 4) return `choice4(${items[0]}, ${items[1]}, ${items[2]}, ${items[3]}${suffix})`
    return arrayToSignal(items)
  })

const replaceArraySequences = (code) =>
  code.replace(/\[([^\[\]\n]+)\](?:\.fast\s*\(([^)]*)\))?/gu, (_match, rawItems, fastArg) => {
    const items = splitTopLevelArgs(rawItems)
    const speed = fastArg ? fastArg.trim() : '0.25'
    return arrayToSignal(items, speed)
  })

const callbackToSignal = (expression) => {
  const expr = expression.trim()

  const modRange = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*\+\s*time[\s\S]*?%\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))$/u.exec(expr)
  if (modRange) {
    const min = Number(modRange[1])
    const span = Number(modRange[2])
    return `seqSignal(${compactNumber(min)}, ${compactNumber(min + span)}, 8, 0.25)`
  }

  const sinDivHalf = /Math\.sin\s*\([^)]*\)\s*\/\s*2\s*\+\s*\.?5/u.test(expr)
  if (sinDivHalf) return 'oscSignal(0, 1, 0.05)'

  const sinScaleOffset = /Math\.sin\s*\([^)]*\)\s*\*\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*\+\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))/u.exec(expr)
  if (sinScaleOffset) {
    const amp = Math.abs(Number(sinScaleOffset[1]))
    const center = Number(sinScaleOffset[2])
    return `oscSignal(${compactNumber(center - amp)}, ${compactNumber(center + amp)}, 0.05)`
  }

  if (/Math\.sin\s*\(/u.test(expr)) return 'oscSignal(-1, 1, 0.05)'
  if (/time\s*<=/u.test(expr)) return 'seqSignal(0, 200, 8, 0.2)'
  if (/^-\s*time/u.test(expr)) return 'seqSignal(-1, 0, 8, 0.25)'
  if (/time\s*\*\s*5/u.test(expr)) return 'seqSignal(0, 8, 8, 0.25)'
  if (/\btime\b/u.test(expr)) return 'seqSignal(0, 1, 8, 0.25)'

  return expr
}

const replaceCallbackArrows = (code) => {
  let output = ''
  let cursor = 0
  const arrowPattern = /\(\)\s*=>/gu

  while (cursor < code.length) {
    arrowPattern.lastIndex = cursor
    const match = arrowPattern.exec(code)
    if (!match) {
      output += code.slice(cursor)
      break
    }

    const arrowIndex = match.index
    output += code.slice(cursor, arrowIndex)
    let exprStart = arrowPattern.lastIndex
    while (/\s/u.test(code[exprStart] ?? '')) exprStart += 1

    let quote = null
    let depth = 0
    let end = exprStart
    for (; end < code.length; end += 1) {
      const char = code[end]
      if (quote) {
        if (char === '\\') {
          end += 1
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
      if (char === ')' || char === ']' || char === '}') {
        if (depth === 0) break
        depth -= 1
        continue
      }
      if (char === ',' && depth === 0) break
      if (char === '\n' && depth === 0) break
    }

    output += callbackToSignal(code.slice(exprStart, end))
    cursor = end
  }

  return output
}

const replaceLocalArrowHelpers = (code) => {
  let output = code

  output = output.replace(
    /nst=\(f,v,t,x=rn\(\),y=rn\(\)\)=>ns\(f,v,x,y\)\.thresh\(t,0\),nstpx=\(f,v,t,pxx,pxy=pxx,x=rn\(\),y=rn\(\)\)=>nst\(f,v,t,x,y\)\.pixelate\(pxx\/A,pxy\)/gu,
    `function nst(f, v, t, x = rn(), y = rn()) {
  return ns(f, v, x, y).thresh(t, 0)
}
function nstpx(f, v, t, pxx, pxy = pxx, x = rn(), y = rn()) {
  return nst(f, v, t, x, y).pixelate(pxx / A, pxy)
}`
  )

  output = output.replace(
    /ns=\(f,v,x=rn\(\),y=rn\(\)\)=>noise\(f,v\)\.scale\(1,\s*A,\s*B,rn\(\)\)\.modulate\(solid\(width\*x,height\*y\)\.mask\(noise\(Math\.PI\*20,\.02\)\.thresh\(0,\.025\)\.pixelate\(1,1\)\),1\)/gu,
    `function ns(f = 3, v = 0, x = rn(), y = rn()) {
  return noise(f, v)
    .scale(1, A, B, rn())
    .modulate(
      solid(width * x, height * y)
        .mask(noise(Math.PI * 20, .02).thresh(0, .025).pixelate(1, 1)),
      1
    )
}`
  )

  return output
}

const replaceArrowAssignments = (code) => {
  const lines = code.split(/\r?\n/u)
  const output = []

  const matchingCloseParenInLine = (line, openIndex) => {
    let depth = 0
    for (let index = openIndex; index < line.length; index += 1) {
      const char = line[index]
      if (char === '(') depth += 1
      if (char === ')') {
        depth -= 1
        if (depth === 0) return index
      }
    }
    return -1
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const start = /^(\s*)([A-Za-z_$][\w$]*)\s*=\s*\(/u.exec(line)
    if (!start) {
      output.push(line)
      continue
    }

    const [, indent, name] = start
    const openIndex = line.indexOf('(', start[0].length - 1)
    const closeIndex = matchingCloseParenInLine(line, openIndex)
    if (closeIndex < 0) {
      output.push(line)
      continue
    }

    const afterParams = line.slice(closeIndex + 1)
    const arrowMatch = /^\s*=>\s*(.+)\s*$/u.exec(afterParams)
    if (!arrowMatch) {
      output.push(line)
      continue
    }

    const params = line.slice(openIndex + 1, closeIndex)
    const firstExpression = arrowMatch[1]
    const expressionLines = [firstExpression.trim()]
    while (index + 1 < lines.length && lines[index + 1].trimStart().startsWith('.')) {
      index += 1
      expressionLines.push(lines[index].trimEnd())
    }

    output.push(`${indent}function ${name}(${params}) {`)
    output.push(`${indent}  return ${expressionLines[0]}`)
    for (const continuation of expressionLines.slice(1)) {
      output.push(`${indent}    ${continuation.trimStart()}`)
    }
    output.push(`${indent}}`)
  }

  return output.join('\n')
}

const renderV2File = ({ fileName, source }) => {
  const originalHeader = extractHeader(source)
  let body = stripHeaderAndHelpers(source)
  body = replaceLocalArrowHelpers(body)
  body = replaceArrowAssignments(body)
  body = replaceChoiceArrays(body)
  body = replaceArraySequences(body)
  body = replaceCallbackArrows(body)
  body = replaceLocalArrowHelpers(body)
  body = replaceArrowAssignments(body)

  return `${originalHeader}

/*
Second pass:
- shared helpers moved to shared-v2.js
- Hydra array sequences converted to quantized texture-valued seqSignal(...)
- callback parameters converted to signal helpers where possible
- status remains: review candidate, not visually accepted
*/

// Run shared-v2.js once before this patch.

${body}
`
}

const renderIndex = ({ files }) => `# Hydra Curated Corpus Ported Candidates V2

This directory is the second-pass corpus.

Use:

\`\`\`js
// run this once
shared-v2.js

// then evaluate individual pattern files
pattern_002.v2.js
\`\`\`

Second-pass targets:

- repeated helper boilerplate moved into \`shared-v2.js\`
- \`()=>time\` style callback parameters replaced by texture-valued signal helpers where possible
- Hydra array sequences replaced by \`seqSignal(min, max, bins, speed)\`
- local arrow helper definitions converted to function declarations

These are still review candidates, not accepted visual ports.

## Files

${files.map((file) => `- [${file}](./${file})`).join('\n')}
`

const main = async () => {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    console.log(usage)
    return
  }

  await mkdir(args.outDir, { recursive: true })
  await writeFile(path.join(args.outDir, 'shared-v2.js'), sharedV2)

  const entries = (await readdir(args.inputDir))
    .filter((file) => file.endsWith('.port.js'))
    .sort()

  const outputFiles = []
  for (const file of entries) {
    const source = await readFile(path.join(args.inputDir, file), 'utf8')
    const outName = file.replace(/\.port\.js$/u, '.v2.js')
    await writeFile(path.join(args.outDir, outName), renderV2File({ fileName: file, source }))
    outputFiles.push(outName)
  }

  await writeFile(path.join(args.outDir, 'index.md'), renderIndex({ files: outputFiles }))
  console.log(`Wrote ${outputFiles.length} v2 candidates to ${args.outDir}`)
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exit(1)
})
