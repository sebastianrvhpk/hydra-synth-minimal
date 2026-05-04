#!/usr/bin/env node

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const usage = `Usage:
  node scripts/hydra-corpus-final-pass.mjs --inputDir=docs/hydra-curated-corpus-ported-candidates --outDir=docs/hydra-curated-corpus-ported-candidates-v3 --original="C:\\Users\\sebas\\Downloads\\curated_hydra_patterns_no_external_media.md"

Creates a final review corpus from the first-pass port candidates.
Targets:
- reinterpret authored arrays as parameter-motion intent, not exact sequences
- replace seqSignal-style ports with compact Hydra signal idioms
- remove callback arrows where automatic conversion is safe
- use the real noiseLoop transform name
`

const defaultOriginal = 'C:/Users/sebas/Downloads/curated_hydra_patterns_no_external_media.md'

const parseArgs = (argv) => {
  const args = {
    inputDir: 'docs/hydra-curated-corpus-ported-candidates',
    outDir: 'docs/hydra-curated-corpus-ported-candidates-v3',
    original: defaultOriginal,
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

const sharedV3 = `// Shared helpers for Hydra curated corpus port candidates v3.
// Run once before evaluating individual pattern_*.v3.js files.
// Assignment arrows are intentionally editor-friendly and re-runnable.

TAU = Math.PI * 2
A = width > height ? height / width : 1
B = height > width ? width / height : 1

rn = (max = 1) => Math.random() * max

btw = (min = 0, max = 1, power = 1) =>
  min + Math.random() ** power * (max - min)

intgr = (min = 0, max = 1, power = 1) => {
  const lo = Math.ceil(min)
  const hi = Math.floor(max)
  return lo + Math.floor(Math.random() ** power * (hi - lo + 1))
}

maybe = (p = 0.5) => Math.random() < p

bi = (p = 0.5) => rn() > p ? 1 : -1

bl = (p = 0.5, power = 1) => Math.random() ** power > p ? 1 : 0

pick = (p, a, b) => maybe(p) ? a : b

choice2 = (a, b, power = 1) => Math.random() ** power < 0.5 ? a : b

choice3 = (a, b, c, power = 1) => {
  const r = Math.random() ** power
  return r < 1 / 3 ? a : r < 2 / 3 ? b : c
}

choice4 = (a, b, c, d, power = 1) => {
  const r = Math.random() ** power
  return r < 0.25 ? a : r < 0.5 ? b : r < 0.75 ? c : d
}

pixelX = () => choice3(1, intgr(4, 13), width)

pixelY = () => choice3(1, intgr(4, 13), height)

ns = (freq = 3, vel = 0, x = rn(), y = rn()) =>
  noise(freq, vel)
    .scale(1, A, B)
    .modulate(solid(width * x, height * y), 1)

nsloop = (freq = 35, vel = 0.25, rad = 0.8, x = rn(), y = rn()) =>
  noiseLoop(freq, vel, rad)
    .scale(1, A, B)
    .modulate(solid(width * x, height * y), 1)

knob = (base = 0, amount = 1, bins = 4, freq = 2, vel = 0.05) =>
  ns(freq, vel)
    .posterize(bins, 1)
    .pixelate(1, 1)
    .r(amount, base)

rng = (min = 0, max = 1, bins = 4, freq = 2, vel = 0.05) =>
  knob((min + max) / 2, (max - min) / 2, bins, freq, vel)

hit = (base = 0, amount = 1, threshold = 0.65, freq = 1, vel = 0.05) =>
  solid(base)
    .add(ns(freq, vel).pixelate(1, 1).thresh(threshold, 0), amount)

wob = (min = 0, max = 1, sync = 0.05) =>
  osc(TAU, sync, 1)
    .pixelate(1, 1)
    .r(max - min, min)

wobc = (base = 0, amount = 1, sync = 0.05) =>
  osc(TAU, sync, 1)
    .brightness(-0.5)
    .pixelate(1, 1)
    .r(amount * 2, base)
`

const parsePatterns = (markdown) => {
  const regex = /^###\s+(pattern_\d+)\s+-\s+([^\n]+)\n\n```js\n([\s\S]*?)\n```/gm
  const patterns = new Map()
  let match
  while ((match = regex.exec(markdown))) {
    patterns.set(match[1], {
      id: match[1],
      title: match[2].trim(),
      code: match[3].trim()
    })
  }
  return patterns
}

const extractHeader = (code) => {
  const match = /^\/\*[\s\S]*?\*\//.exec(code)
  return match ? match[0] : ''
}

const stripHeaderAndHelpers = (code) => {
  let body = code.replace(/^\/\*[\s\S]*?\*\/\s*/u, '')
  const helperStart = body.indexOf('// Shared helpers for first-pass corpus ports.')
  if (helperStart >= 0) {
    const helperEndText = 'pixelY = () => chc([1, intgr(4, 13), height])'
    const helperEnd = body.indexOf(helperEndText, helperStart)
    if (helperEnd >= 0) {
      body = `${body.slice(0, helperStart)}${body.slice(helperEnd + helperEndText.length)}`
    }
  }
  return body.trim()
}

const lineColumnForIndex = (source, index) => {
  const before = source.slice(0, index)
  const lines = before.split(/\r?\n/u)
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1
  }
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

const numericValue = (text) => {
  const normalized = text.trim()
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/iu.test(normalized)) return null
  return Number(normalized)
}

const compactNumber = (value) => {
  if (Object.is(value, -0)) return '0'
  const rounded = Number(value.toFixed(8))
  return rounded.toString()
}

const speedToVelocity = (speed) => {
  const numeric = speed ? numericValue(speed) : null
  if (numeric === null) return '0.05'
  const velocity = Math.min(0.5, Math.max(0.01, Math.abs(numeric) * 0.04))
  return compactNumber(velocity)
}

const thresholdForDuty = (duty) => {
  if (duty <= 0.125) return 0.75
  if (duty <= 0.25) return 0.6
  if (duty <= 0.375) return 0.35
  if (duty <= 0.55) return 0
  return -0.25
}

const arrayStats = (numbers) => {
  const counts = new Map()
  for (const value of numbers) {
    const key = compactNumber(value)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1])
  const [modeKey, modeCount] = entries[0]
  return {
    min: Math.min(...numbers),
    max: Math.max(...numbers),
    uniqueCount: counts.size,
    mode: Number(modeKey),
    modeCount,
    modeRatio: modeCount / numbers.length
  }
}

const oldSeqEquivalent = (items, speed = '0.25') => {
  const numbers = items.map(numericValue)
  const bins = Math.max(items.length, 2)
  if (numbers.every((value) => value !== null)) {
    return `seqSignal(${compactNumber(Math.min(...numbers))}, ${compactNumber(Math.max(...numbers))}, ${bins}, ${speed})`
  }
  return `seqSignal(0, 1, ${bins}, ${speed})`
}

const expressionForNumericArray = (items, speed = '0.25') => {
  const numbers = items.map((item) => numericValue(item))
  const stats = arrayStats(numbers)
  const bins = Math.min(8, Math.max(2, stats.uniqueCount))
  const vel = speedToVelocity(speed)

  if (stats.uniqueCount === 1) {
    return {
      replacement: compactNumber(stats.min),
      kind: 'static-scalar',
      stats,
      rationale: 'all entries are equal, so the array carried no motion density'
    }
  }

  const activeValues = numbers.filter((value) => value !== stats.mode)
  const activeDeltas = activeValues.map((value) => value - stats.mode)
  const minDelta = activeDeltas.length ? Math.min(...activeDeltas) : 0
  const maxDelta = activeDeltas.length ? Math.max(...activeDeltas) : 0

  if (stats.modeRatio > 0.5 && activeValues.length > 0) {
    const duty = activeValues.length / numbers.length
    const threshold = compactNumber(thresholdForDuty(duty))
    if (minDelta >= 0) {
      return {
        replacement: `hit(${compactNumber(stats.mode)}, ${compactNumber(maxDelta)}, ${threshold}, 1, ${vel})`,
        kind: stats.mode === 1 ? 'identity-hit' : 'base-hit',
        stats,
        rationale: 'dominant base with sparse upward changes; preserves null/identity plus activation density'
      }
    }
    if (maxDelta <= 0) {
      return {
        replacement: `hit(${compactNumber(stats.mode)}, ${compactNumber(minDelta)}, ${threshold}, 1, ${vel})`,
        kind: stats.mode === 1 ? 'identity-hit' : 'base-hit',
        stats,
        rationale: 'dominant base with sparse downward changes; preserves null/identity plus activation density'
      }
    }
    return {
      replacement: `knob(${compactNumber(stats.mode)}, ${compactNumber(Math.max(Math.abs(minDelta), Math.abs(maxDelta)))}, ${bins}, 2, ${vel})`,
      kind: 'centered-base-knob',
      stats,
      rationale: 'dominant base with signed excursions; preserves center and rough excursion amount'
    }
  }

  if (stats.min >= 0) {
    return {
      replacement: `rng(${compactNumber(stats.min)}, ${compactNumber(stats.max)}, ${bins}, 2, ${vel})`,
      kind: 'unipolar-range',
      stats,
      rationale: 'non-negative parameter range; preserves range and value density'
    }
  }

  const center = (stats.min + stats.max) / 2
  const amount = (stats.max - stats.min) / 2
  return {
    replacement: `knob(${compactNumber(center)}, ${compactNumber(amount)}, ${bins}, 2, ${vel})`,
    kind: 'signed-range',
    stats,
    rationale: 'signed parameter range; preserves center, excursion amount, and value density'
  }
}

const expressionForArray = (items, speed = '0.25') => {
  const numbers = items.map(numericValue)
  if (numbers.every((value) => value !== null)) return expressionForNumericArray(items, speed)

  if (items.length === 2) {
    return {
      replacement: `choice2(${items[0]}, ${items[1]})`,
      kind: 'choice-expression',
      stats: null,
      rationale: 'non-numeric array treated as initialization choice, not animated sequence'
    }
  }
  if (items.length === 3) {
    return {
      replacement: `choice3(${items[0]}, ${items[1]}, ${items[2]})`,
      kind: 'choice-expression',
      stats: null,
      rationale: 'non-numeric array treated as initialization choice, not animated sequence'
    }
  }
  if (items.length === 4) {
    return {
      replacement: `choice4(${items[0]}, ${items[1]}, ${items[2]}, ${items[3]})`,
      kind: 'choice-expression',
      stats: null,
      rationale: 'non-numeric array treated as initialization choice, not animated sequence'
    }
  }

  return {
    replacement: `rng(0, 1, ${Math.min(8, Math.max(2, items.length))}, 2, ${speedToVelocity(speed)})`,
    kind: 'unknown-range',
    stats: null,
    rationale: 'complex array could not be safely reduced; keeps a bounded quantized signal placeholder'
  }
}

const replaceChoiceArrays = (code, records, patternId) =>
  code.replace(/chc\s*\(\s*\[([^\]]+)\]\s*(?:,\s*([^)]+))?\)/gu, (match, rawItems, power, offset, source) => {
    const items = splitTopLevelArgs(rawItems)
    const suffix = power ? `, ${power.trim()}` : ''
    let replacement
    if (items.length === 2) replacement = `choice2(${items[0]}, ${items[1]}${suffix})`
    else if (items.length === 3) replacement = `choice3(${items[0]}, ${items[1]}, ${items[2]}${suffix})`
    else if (items.length === 4) replacement = `choice4(${items[0]}, ${items[1]}, ${items[2]}, ${items[3]}${suffix})`
    else replacement = expressionForArray(items).replacement
    records.push({
      patternId,
      source: 'choice-array',
      ...lineColumnForIndex(source, offset),
      raw: match,
      items,
      fast: null,
      v2Equivalent: replacement,
      replacement,
      kind: 'choice-expression',
      rationale: 'chc arrays are initialization choices, not temporal Hydra sequences'
    })
    return replacement
  })

const replaceArraySequences = (code, records, patternId) =>
  code.replace(/\[([^\[\]\n]+)\](?:\.fast\s*\(([^)]*)\))?/gu, (match, rawItems, fastArg, offset, source) => {
    const items = splitTopLevelArgs(rawItems)
    const speed = fastArg ? fastArg.trim() : '0.25'
    const interpreted = expressionForArray(items, speed)
    records.push({
      patternId,
      source: 'hydra-array',
      ...lineColumnForIndex(source, offset),
      raw: match,
      items,
      fast: fastArg ? fastArg.trim() : null,
      v2Equivalent: oldSeqEquivalent(items, speed),
      replacement: interpreted.replacement,
      kind: interpreted.kind,
      stats: interpreted.stats,
      rationale: interpreted.rationale
    })
    return interpreted.replacement
  })

const numericLiteralPattern = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)'

const callbackToSignal = (expression) => {
  const expr = expression.trim().replace(/\s+/gu, ' ')

  const sinDivHalf = /Math\.(?:sin|cos)\s*\([^)]*\)\s*\/\s*2\s*\+\s*\.?5/u.test(expr)
  if (sinDivHalf) return 'wob(0, 1, 0.05)'

  const sinShiftedHalfThenDiv = /Math\.(?:sin|cos)\s*\([^)]*\)\s*\*\s*\.?5\s*\+\s*\.?5\)\s*\/\s*2/u.test(expr)
  if (sinShiftedHalfThenDiv) return 'wob(0, 0.5, 0.05)'

  const sinScaleOffset = new RegExp(`Math\\.(?:sin|cos)\\s*\\([^)]*\\)\\s*\\*\\s*(${numericLiteralPattern})\\s*\\+\\s*(${numericLiteralPattern})`, 'u').exec(expr)
  if (sinScaleOffset) {
    const amp = Math.abs(Number(sinScaleOffset[1]))
    const center = Number(sinScaleOffset[2])
    return `wobc(${compactNumber(center)}, ${compactNumber(amp)}, 0.05)`
  }

  const sinDivisor = new RegExp(`Math\\.(?:sin|cos)\\s*\\([^)]*\\)\\s*\\/\\s*(${numericLiteralPattern})`, 'u').exec(expr)
  if (sinDivisor) {
    const divisor = Math.abs(Number(sinDivisor[1]))
    if (divisor > 0) return `wobc(0, ${compactNumber(1 / divisor)}, 0.05)`
  }

  const sinMultiplier = new RegExp(`Math\\.(?:sin|cos)\\s*\\([^)]*\\)\\s*\\*\\s*(${numericLiteralPattern})`, 'u').exec(expr)
  if (sinMultiplier) {
    return `wobc(0, ${compactNumber(Math.abs(Number(sinMultiplier[1])))}, 0.05)`
  }

  const sinExpressionMultiplier = /Math\.(?:sin|cos)\s*\([^)]*\)\s*\*\s*([A-Za-z_$][\w$]*(?:\s*\*\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+))?)/u.exec(expr)
  if (sinExpressionMultiplier) return `wobc(0, ${sinExpressionMultiplier[1].trim()}, 0.05)`

  if (/Math\.(?:sin|cos)\s*\(/u.test(expr)) return 'wob(-1, 1, 0.05)'

  if (/time\s*<=/u.test(expr)) return 'rng(0, 200, 8, 2, 0.05)'
  if (/^-\s*time/u.test(expr)) return 'rng(-1, 0, 8, 2, 0.05)'
  if (/time\s*\*\s*5/u.test(expr)) return 'rng(0, 8, 8, 2, 0.05)'

  const negativeParenModulo = new RegExp(`^-\\s*\\((?:time(?:\\s*\\*\\s*${numericLiteralPattern})?)\\)\\s*%\\s*\\(?\\s*([^)]+?)\\s*\\)?$`, 'u').exec(expr)
  if (negativeParenModulo) return `rng(-(${negativeParenModulo[1].trim()}), 0, 8, 2, 0.05)`

  const scaledModulo = new RegExp(`^\\(?\\s*time(?:\\s*\\/\\s*${numericLiteralPattern})?\\s*\\)?\\s*%\\s*(${numericLiteralPattern})\\s*\\*\\s*(${numericLiteralPattern})$`, 'u').exec(expr)
  if (scaledModulo) {
    const span = Number(scaledModulo[1]) * Number(scaledModulo[2])
    const min = span < 0 ? span : 0
    const max = span < 0 ? 0 : span
    return `rng(${compactNumber(min)}, ${compactNumber(max)}, 8, 2, 0.05)`
  }

  const positiveModulo = new RegExp(`^(?:(${numericLiteralPattern})\\s*\\+\\s*)?\\(?\\s*time(?:\\s*[+-]\\s*${numericLiteralPattern})?\\s*\\)?(?:\\s*\\/\\s*${numericLiteralPattern})?\\s*%\\s*(.+)$`, 'u').exec(expr)
  if (positiveModulo) {
    const base = positiveModulo[1] ? Number(positiveModulo[1]) : 0
    const span = positiveModulo[2].trim()
    const spanNumber = numericValue(span)
    const max = spanNumber === null
      ? base === 0 ? span : `${compactNumber(base)} + (${span})`
      : compactNumber(base + spanNumber)
    return `rng(${compactNumber(base)}, ${max}, 8, 2, 0.05)`
  }

  const negativeModulo = new RegExp(`^-\\s*time(?:\\s*\\/\\s*${numericLiteralPattern})?\\s*%\\s*(.+)$`, 'u').exec(expr)
  if (negativeModulo) {
    const span = negativeModulo[1].trim()
    const spanNumber = numericValue(span)
    const min = spanNumber === null ? `-(${span})` : compactNumber(-spanNumber)
    return `rng(${min}, 0, 8, 2, 0.05)`
  }

  const plusTime = new RegExp(`^(${numericLiteralPattern})\\s*\\+\\s*time`, 'u').exec(expr)
  if (plusTime) return `rng(${compactNumber(Number(plusTime[1]))}, ${compactNumber(Number(plusTime[1]) + 1)}, 8, 2, 0.05)`

  if (/\btime\b/u.test(expr)) return 'rng(0, 1, 8, 2, 0.05)'

  return expr
}

const replaceCallbackArrows = (code, callbackRecords, patternId) => {
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

    const rawExpression = code.slice(exprStart, end)
    const replacement = callbackToSignal(rawExpression)
    callbackRecords.push({
      patternId,
      ...lineColumnForIndex(code, arrowIndex),
      raw: `() => ${rawExpression.trim()}`,
      replacement
    })
    output += replacement
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

const replaceArrowAssignments = (code) => {
  const lines = code.split(/\r?\n/u)
  const output = []

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const parenStart = /^(\s*)([A-Za-z_$][\w$]*)\s*=\s*\(/u.exec(line)
    if (parenStart) {
      const [, indent, name] = parenStart
      const openIndex = line.indexOf('(', parenStart[0].length - 1)
      const closeIndex = matchingCloseParenInLine(line, openIndex)
      if (closeIndex >= 0) {
        const afterParams = line.slice(closeIndex + 1)
        const arrowMatch = /^\s*=>\s*(.+)\s*$/u.exec(afterParams)
        if (arrowMatch) {
          const params = line.slice(openIndex + 1, closeIndex)
          const expressionLines = [arrowMatch[1].trim()]
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
          continue
        }
      }
    }

    const emptyStart = /^(\s*)([A-Za-z_$][\w$]*)\s*=\s*\(\)\s*=>\s*(.+)\s*$/u.exec(line)
    if (emptyStart) {
      const [, indent, name, expression] = emptyStart
      output.push(`${indent}function ${name}() {`)
      output.push(`${indent}  return ${expression.trim()}`)
      output.push(`${indent}}`)
      continue
    }

    output.push(line)
  }

  return output.join('\n')
}

const extractPatternId = (fileName) => fileName.replace(/\.port\.js$/u, '')

const renderV3File = ({ fileName, source }) => {
  const patternId = extractPatternId(fileName)
  const originalHeader = extractHeader(source)
  const arrayRecords = []
  const callbackRecords = []
  let body = stripHeaderAndHelpers(source)
  body = body.replace(/\bnoiseloop\b/gu, 'noiseLoop')
  body = replaceLocalArrowHelpers(body)
  body = replaceArrowAssignments(body)
  body = replaceChoiceArrays(body, arrayRecords, patternId)
  body = replaceArraySequences(body, arrayRecords, patternId)
  body = replaceCallbackArrows(body, callbackRecords, patternId)
  body = replaceLocalArrowHelpers(body)
  body = replaceArrowAssignments(body)
  body = body.replace(/\bseqSignal\b|\boscSignal\b|\buniSignal\b/gu, 'rng')

  const text = `${originalHeader}

/*
Final v3 pass:
- shared helpers moved to shared-v3.js
- arrays are ported by intent: range, density, null/identity base, and motion character
- old exact-sequence helper emulation is intentionally removed
- callback parameters are replaced with compact signal helpers where possible
- status remains: review candidate, not visually accepted
*/

// Run shared-v3.js once before this patch.

${body}
`

  return { text, arrayRecords, callbackRecords }
}

const collectOriginalArrays = (code) => {
  const records = []
  code.replace(/\[([^\[\]\n]+)\](?:\.fast\s*\(([^)]*)\))?/gu, (match, rawItems, fastArg, offset, source) => {
    records.push({
      ...lineColumnForIndex(source, offset),
      raw: match,
      items: splitTopLevelArgs(rawItems),
      fast: fastArg ? fastArg.trim() : null
    })
    return match
  })
  return records
}

const summarizeKinds = (records) => {
  const counts = new Map()
  for (const record of records) counts.set(record.kind, (counts.get(record.kind) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))
}

const renderArrayAuditMarkdown = ({ patternAudits, totals }) => {
  const lines = [
    '# Hydra Curated Corpus Final Array Port Audit',
    '',
    'This audit checks the authored arrays against the v3 porting lens. The important shift is intentional: arrays are no longer treated as exact ordered sequences. They are interpreted as parameter-motion hints: range, value density, base/null/identity, and activation character.',
    '',
    '## Summary',
    '',
    `- Patterns processed: ${totals.patterns}`,
    `- Original authored arrays found: ${totals.originalArrays}`,
    `- Arrays ported in v3 bodies: ${totals.portedArrays}`,
    `- Callback arrows ported: ${totals.callbacks}`,
    `- Pattern count mismatches between original arrays and v3 body arrays: ${totals.arrayCountMismatches}`,
    '',
    '## V3 Array Mapping Rules',
    '',
    '- `static-scalar`: equal entries collapse to the scalar because there is no motion density.',
    '- `identity-hit` / `base-hit`: dominant base values become `hit(base, amount, threshold, ...)`, preserving identity/nullity and sparse activation.',
    '- `unipolar-range`: non-negative ranges become `rng(min, max, bins, ...)`.',
    '- `signed-range`: signed ranges become `knob(center, amount, bins, ...)`.',
    '- `choice-expression`: expression arrays become `choice2/3/4(...)` when they are initialization choices rather than Hydra sequence motion.',
    '',
    '## Kind Counts',
    '',
    ...totals.kindCounts.map(([kind, count]) => `- ${kind}: ${count}`),
    '',
    '## Per-Pattern Array Ports',
    ''
  ]

  for (const audit of patternAudits) {
    if (!audit.originalArrays.length && !audit.portedArrays.length && !audit.callbackRecords.length) continue
    lines.push(`### ${audit.patternId} - ${audit.title}`)
    lines.push('')
    lines.push(`- Original arrays: ${audit.originalArrays.length}`)
    lines.push(`- V3 array ports: ${audit.portedArrays.length}`)
    lines.push(`- Callback ports: ${audit.callbackRecords.length}`)
    if (audit.originalArrays.length !== audit.portedArrays.length) {
      lines.push('- Count note: original/v3 authored array counts differ after first-pass semantic rewrites; inspect JSON for exact records.')
    }
    for (let index = 0; index < audit.portedArrays.length; index += 1) {
      const record = audit.portedArrays[index]
      const original = audit.originalArrays[index]
      lines.push(`- ${index + 1}. ${record.kind}: \`${original?.raw ?? record.raw}\` -> v2 \`${record.v2Equivalent}\` -> v3 \`${record.replacement}\``)
    }
    for (const record of audit.callbackRecords) {
      lines.push(`- callback: \`${record.raw}\` -> \`${record.replacement}\``)
    }
    lines.push('')
  }

  return `${lines.join('\n')}\n`
}

const renderIndex = ({ files, totals }) => `# Hydra Curated Corpus Ported Candidates V3

This directory is the final review pass over the 90 curated corpus ports.

Use:

\`\`\`js
// run this once
shared-v3.js

// then evaluate individual pattern files
pattern_002.v3.js
\`\`\`

V3 targets:

- array ports preserve parameter-motion intent rather than exact array order
- legacy sequence helper calls are removed
- \`()=>time\` style callback parameters are replaced where possible
- \`noiseLoop\` is used as the real transform name
- every original authored array is audited in \`array-port-audit.md\` and \`array-port-audit.json\`

Audit summary:

- Original authored arrays: ${totals.originalArrays}
- V3 array ports: ${totals.portedArrays}
- Callback ports: ${totals.callbacks}
- Original/v3 array count mismatches: ${totals.arrayCountMismatches}

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

  const originalMarkdown = await readFile(args.original, 'utf8')
  const originalPatterns = parsePatterns(originalMarkdown)

  await mkdir(args.outDir, { recursive: true })
  await writeFile(path.join(args.outDir, 'shared-v3.js'), sharedV3)

  const entries = (await readdir(args.inputDir))
    .filter((file) => file.endsWith('.port.js'))
    .sort()

  const outputFiles = []
  const patternAudits = []
  const allArrayRecords = []
  const allCallbackRecords = []

  for (const file of entries) {
    const source = await readFile(path.join(args.inputDir, file), 'utf8')
    const patternId = extractPatternId(file)
    const originalPattern = originalPatterns.get(patternId)
    const rendered = renderV3File({ fileName: file, source })
    const outName = file.replace(/\.port\.js$/u, '.v3.js')
    await writeFile(path.join(args.outDir, outName), rendered.text)
    outputFiles.push(outName)
    allArrayRecords.push(...rendered.arrayRecords)
    allCallbackRecords.push(...rendered.callbackRecords)

    const originalArrays = originalPattern ? collectOriginalArrays(originalPattern.code) : []
    patternAudits.push({
      patternId,
      title: originalPattern?.title ?? 'unknown source title',
      file: outName,
      originalArrays,
      portedArrays: rendered.arrayRecords,
      callbackRecords: rendered.callbackRecords
    })
  }

  const totals = {
    patterns: outputFiles.length,
    originalArrays: patternAudits.reduce((sum, audit) => sum + audit.originalArrays.length, 0),
    portedArrays: allArrayRecords.length,
    callbacks: allCallbackRecords.length,
    arrayCountMismatches: patternAudits.filter((audit) => audit.originalArrays.length !== audit.portedArrays.length).length,
    kindCounts: summarizeKinds(allArrayRecords)
  }

  const auditJson = {
    generatedAt: new Date().toISOString(),
    source: {
      original: args.original,
      inputDir: args.inputDir,
      outDir: args.outDir
    },
    totals,
    patternAudits
  }

  await writeFile(path.join(args.outDir, 'array-port-audit.json'), `${JSON.stringify(auditJson, null, 2)}\n`)
  await writeFile(path.join(args.outDir, 'array-port-audit.md'), renderArrayAuditMarkdown({ patternAudits, totals }))
  await writeFile(path.join(args.outDir, 'index.md'), renderIndex({ files: outputFiles, totals }))
  console.log(`Wrote ${outputFiles.length} v3 candidates to ${args.outDir}`)
  console.log(`Original arrays: ${totals.originalArrays}; v3 array ports: ${totals.portedArrays}; callbacks: ${totals.callbacks}`)
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exit(1)
})
