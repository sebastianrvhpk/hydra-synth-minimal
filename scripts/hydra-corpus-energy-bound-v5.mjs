#!/usr/bin/env node

import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const usage = `Usage:
  node scripts/hydra-corpus-energy-bound-v5.mjs --inputDir=docs/hydra-curated-corpus-ported-candidates-v4 --outDir=docs/hydra-curated-corpus-ported-candidates-v5 --maxPx=6
`

const args = {
  inputDir: 'docs/hydra-curated-corpus-ported-candidates-v4',
  outDir: 'docs/hydra-curated-corpus-ported-candidates-v5',
  maxPx: '6',
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

const maxPx = Number(args.maxPx)
if (!Number.isFinite(maxPx) || maxPx <= 0) throw new Error(`Invalid --maxPx: ${args.maxPx}`)

const hydraRootPattern = /^(?:src|shape|solid|osc|noise|noiseLoop|gradient|ns|nsloop|nst|nstpx|voronoi)\s*\(/u

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

const bracketDelta = (text) => {
  let delta = 0
  let quote = null
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
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
    if (char === '(' || char === '[' || char === '{') delta += 1
    if (char === ')' || char === ']' || char === '}') delta -= 1
  }
  return delta
}

const findMatchingParen = (source, openIndex) => {
  let depth = 0
  let quote = null
  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index]
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
    if (char === '(') depth += 1
    if (char === ')') {
      depth -= 1
      if (depth === 0) return index
    }
  }
  return -1
}

const splitTopLevelArgs = (text) => {
  const argsOut = []
  let start = 0
  let depth = 0
  let quote = null
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
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
      argsOut.push(text.slice(start, index).trim())
      start = index + 1
    }
  }
  argsOut.push(text.slice(start).trim())
  return argsOut
}

const formatNumber = (value) => {
  if (Object.is(value, -0)) return '0'
  if (Number.isInteger(value)) return String(value)
  return String(Number(value.toFixed(6))).replace(/^(-?)0\./u, '$1.')
}

const clampNumber = (value, limit) => Math.max(-limit, Math.min(limit, value))

const tryEvalNumeric = (expression) => {
  if (!/^[\d\s+\-*/().%A-Za-z_]+$/u.test(expression)) return null
  if (/\b(?:width|height|A|B|time|rn|btw|rng|knob|wob|wobc|hit|ns|noise|src|solid|osc|shape)\b/u.test(expression)) return null
  try {
    const value = Function('Math', 'TAU', `"use strict"; return (${expression});`)(Math, Math.PI * 2)
    return Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}

const clampNumericArgumentList = (expression, functionName, positions, limit) => {
  const pattern = new RegExp(`^${functionName}\\s*\\((.*)\\)$`, 'u')
  const match = expression.trim().match(pattern)
  if (!match) return null
  const parts = splitTopLevelArgs(match[1])
  let changed = false
  for (const position of positions) {
    if (parts[position] === undefined) continue
    const value = tryEvalNumeric(parts[position])
    if (value === null) continue
    const next = clampNumber(value, limit)
    if (next !== value) {
      parts[position] = formatNumber(next)
      changed = true
    }
  }
  return changed ? `${functionName}(${parts.join(', ')})` : null
}

const normalizedColorCoefficient = (field) => {
  let coeff = 0
  const compact = field.replace(/\s+/gu, '')
  const colorPattern = /\.color\(([^)]*)\)/gu
  for (const match of compact.matchAll(colorPattern)) {
    const parts = splitTopLevelArgs(match[1])
    for (const part of parts.slice(0, 2)) {
      const normalizedMatch = part.match(/^([+-]?(?:\d+(?:\.\d+)?|\.\d+))?\/(?:width|height)$/u)
      if (normalizedMatch) coeff = Math.max(coeff, Math.abs(Number(normalizedMatch[1] ?? 1)))
    }
  }
  if (/(?:solid|color)\([^)]*1\/width/u.test(compact) || /(?:solid|color)\([^)]*1\/height/u.test(compact)) {
    coeff = Math.max(coeff, 1)
  }
  return coeff || 0
}

const isTransformDeltaField = (field) =>
  /gradient\s*\(\s*\)[\s\S]*?\.sub\s*\(\s*gradient\s*\(\s*\)\s*\)/u.test(field)

const hasPixelStepColor = (field) =>
  /\.color\s*\(\s*(?:[+-]?(?:\d+(?:\.\d+)?|\.\d+)\s*)?\/\s*width\s*,\s*(?:[+-]?(?:\d+(?:\.\d+)?|\.\d+)\s*)?\/\s*height/u.test(field.replace(/\s+/gu, ' '))

const hasOuterPixelStep = (field) => {
  const subIndex = field.lastIndexOf('.sub')
  if (subIndex === -1) return hasPixelStepColor(field)
  return hasPixelStepColor(field.slice(subIndex))
}

const normalizeTransformDeltaField = (field) => {
  if (!isTransformDeltaField(field) || hasOuterPixelStep(field)) return { field, changed: false }
  return {
    field: `(${field}).color(1 / width, 1 / height)`,
    changed: true
  }
}

const rawColorAxis = (field) => {
  const compact = field.replace(/\s+/gu, '')
  const hasX = /\.color\(\s*(?:1|1\.0|1\.0+)\s*,\s*0(?:\s*,\s*0)?\s*\)/u.test(compact)
  const hasY = /\.color\(\s*0\s*,\s*(?:1|1\.0|1\.0+)(?:\s*,\s*0)?\s*\)/u.test(compact)
  if (hasX && !hasY) return 'x'
  if (hasY && !hasX) return 'y'
  if (hasX && hasY) return 'xy'
  return 'xy'
}

const normalizeRawField = (field, axis = rawColorAxis(field)) => {
  if (axis === 'x') return `(${field}).color(1 / width, 0)`
  if (axis === 'y') return `(${field}).color(0, 1 / height)`
  return `(${field}).color(1 / width, 1 / height)`
}

const convertRawFieldAmount = (amount, maxPixels) => {
  if (!amount) {
    return {
      amount: '1',
      reason: 'implicit raw feedback modulation converted to explicit 1 px/pass'
    }
  }
  const trimmed = amount.trim()
  const knobMatch = trimmed.match(/^knob\s*\((.*)\)$/u)
  if (knobMatch) {
    const parts = splitTopLevelArgs(knobMatch[1])
    const base = tryEvalNumeric(parts[0] ?? '0')
    const range = tryEvalNumeric(parts[1] ?? '1')
    if (base !== null && range !== null && Math.abs(base) <= 0.5 && Math.abs(range) <= 0.5) {
      return {
        amount: `pxknob(${parts.join(', ')})`,
        reason: `fractional knob amount ${trimmed} converted to bounded pixel-valued pxknob(...)`
      }
    }
  }

  const rngMatch = trimmed.match(/^rng\s*\((.*)\)$/u)
  if (rngMatch) {
    const parts = splitTopLevelArgs(rngMatch[1])
    const min = tryEvalNumeric(parts[0] ?? '0')
    const max = tryEvalNumeric(parts[1] ?? '1')
    if (min !== null && max !== null && Math.max(Math.abs(min), Math.abs(max)) <= 0.5) {
      return {
        amount: `pxrng(${parts.join(', ')})`,
        reason: `fractional rng amount ${trimmed} converted to bounded pixel-valued pxrng(...)`
      }
    }
    if (min !== null && max !== null && Math.max(Math.abs(min), Math.abs(max)) <= maxPixels) {
      return {
        amount: trimmed,
        reason: `raw field normalized; ${trimmed} kept as bounded pixel-valued range`
      }
    }
  }

  for (const fn of ['wob', 'wobc']) {
    const match = trimmed.match(new RegExp(`^${fn}\\s*\\((.*)\\)$`, 'u'))
    if (!match) continue
    const parts = splitTopLevelArgs(match[1])
    const first = tryEvalNumeric(parts[0] ?? '0')
    const second = tryEvalNumeric(parts[1] ?? '1')
    if (first !== null && second !== null && Math.max(Math.abs(first), Math.abs(second)) <= 0.5) {
      return {
        amount: `px${fn}(${parts.join(', ')})`,
        reason: `fractional ${fn} amount ${trimmed} converted to bounded pixel-valued px${fn}(...)`
      }
    }
    if (first !== null && second !== null && Math.max(Math.abs(first), Math.abs(second)) <= maxPixels) {
      return {
        amount: trimmed,
        reason: `raw field normalized; ${trimmed} kept as bounded pixel-valued signal`
      }
    }
  }

  const fraction = trimmed.match(/^([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*\/\s*(?:width|height)$/u)
  if (fraction) {
    const pixels = clampNumber(Number(fraction[1]), maxPixels)
    return {
      amount: formatNumber(pixels),
      reason: `fractional pixel amount ${trimmed} converted to ${formatNumber(pixels)} px`
    }
  }

  const numeric = tryEvalNumeric(trimmed)
  if (numeric !== null && Math.abs(numeric) <= 0.5) {
    return {
      amount: `px((${trimmed}) * Math.max(width, height))`,
      reason: `fractional native amount ${trimmed} converted through px(... * Math.max(width, height))`
    }
  }
  if (numeric !== null && Math.abs(numeric) <= maxPixels) {
    return {
      amount: trimmed,
      reason: `raw field normalized; numeric amount ${trimmed} kept as bounded pixel amount`
    }
  }

  return null
}

const capAmount = (amount, coefficient, maxPixels) => {
  const limit = coefficient > 0 ? maxPixels / coefficient : maxPixels
  if (!amount) return { amount, changed: false, reason: 'implicit amount left unchanged' }

  const trimmed = amount.trim()
  const numeric = tryEvalNumeric(trimmed)
  if (numeric !== null) {
    const capped = clampNumber(numeric, limit)
    return capped === numeric
      ? { amount, changed: false, reason: 'numeric amount already within bound' }
      : { amount: formatNumber(capped), changed: true, reason: `numeric amount ${formatNumber(numeric)} capped to ${formatNumber(capped)}` }
  }

  for (const fn of ['rng', 'wob']) {
    const next = clampNumericArgumentList(trimmed, fn, [0, 1], limit)
    if (next) return { amount: next, changed: true, reason: `${fn} range capped to +/-${formatNumber(limit)}` }
  }

  const wobc = clampNumericArgumentList(trimmed, 'wobc', [0, 1], limit)
  if (wobc) return { amount: wobc, changed: true, reason: `wobc base/amount capped to +/-${formatNumber(limit)}` }

  const btw = clampNumericArgumentList(trimmed, 'btw', [0, 1], limit)
  if (btw) return { amount: btw, changed: true, reason: `btw range capped to +/-${formatNumber(limit)}` }

  return { amount, changed: false, reason: 'dynamic amount not automatically clamped' }
}

const transformModulateCall = ({ callText, file, chainRoot, changes, residuals }) => {
  const openIndex = callText.indexOf('(')
  const argsText = callText.slice(openIndex + 1, -1)
  const parts = splitTopLevelArgs(argsText)
  if (!parts[0]) return callText

  const originalField = parts[0]
  const originalAmount = parts[1]
  const normalized = normalizeTransformDeltaField(originalField)
  let field = normalized.field
  let coefficient = normalized.changed ? 1 : normalizedColorCoefficient(field)
  let amount = originalAmount
  let amountChange = { amount, changed: false, reason: 'no amount' }
  let rawFieldNormalized = false

  if (coefficient > 0 || normalized.changed) {
    amountChange = capAmount(amount, coefficient || 1, maxPx)
    amount = amountChange.amount
    coefficient = coefficient || 1
  } else {
    const fraction = convertRawFieldAmount(amount, maxPx)
    if (fraction) {
      field = normalizeRawField(field)
      amount = fraction.amount
      amountChange = { amount, changed: true, reason: fraction.reason }
      rawFieldNormalized = true
      coefficient = 1
    }
  }

  const changed = normalized.changed || amountChange.changed || rawFieldNormalized
  if (changed) {
    changes.push({
      file,
      chainRoot,
      kind: 'feedback-modulate-energy-bound',
      normalizedTransformDelta: normalized.changed,
      normalizedRawField: rawFieldNormalized,
      amountChanged: amountChange.changed,
      reason: amountChange.reason,
      before: callText.trim(),
      after: `.modulate(${[field, amount, ...parts.slice(2)].filter((part) => part !== undefined && part !== '').join(', ')})`
    })
  }

  if (!changed && coefficient <= 0 && !/(?:\/\s*width|\/\s*height)/u.test(field)) {
    residuals.push({
      file,
      chainRoot,
      kind: 'unbounded-feedback-modulate-review',
      reason: 'top-level feedback modulate did not expose pixel-step normalization or transform-delta pattern',
      call: callText.trim()
    })
  }

  if (!changed) return callText
  return `.modulate(${[field, amount, ...parts.slice(2)].filter((part) => part !== undefined && part !== '').join(', ')})`
}

const transformClosedFeedbackChain = ({ block, file, changes, residuals }) => {
  const outMatch = block.match(/\.out\s*\(\s*(o\d+)\s*\)/u)
  if (!outMatch) return block
  const chainRoot = outMatch[1]
  const outIndex = outMatch.index ?? block.length
  const beforeOut = block.slice(0, outIndex)
  const beforeOutForRead = stripComments(beforeOut)
  const srcReadMatch = beforeOutForRead.match(new RegExp(`src\\s*\\(\\s*${chainRoot}\\s*\\)`, 'u'))
  const bareReadMatch = beforeOutForRead.match(new RegExp(`\\b${chainRoot}\\b`, 'u'))
  const firstFeedbackReadIndex = Math.min(
    srcReadMatch?.index ?? Number.POSITIVE_INFINITY,
    bareReadMatch?.index ?? Number.POSITIVE_INFINITY
  )
  const readsOutput = Number.isFinite(firstFeedbackReadIndex)
  if (!readsOutput) return block

  let output = ''
  let cursor = 0
  let depth = 0
  let quote = null
  const rootEnd = findMatchingParen(block, block.indexOf('('))

  for (let index = 0; index < block.length; index += 1) {
    const char = block[index]
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
    if (char === '(') depth += 1
    if (char === ')') depth -= 1

    if (index > rootEnd && depth === 0 && block.startsWith('.modulate(', index)) {
      const openIndex = index + '.modulate'.length
      const closeIndex = findMatchingParen(block, openIndex)
      if (closeIndex === -1) continue
      const callText = block.slice(index, closeIndex + 1)
      const callUsesFeedback = new RegExp(`src\\s*\\(\\s*${chainRoot}\\s*\\)|\\b${chainRoot}\\b`, 'u').test(callText)
      if (index < firstFeedbackReadIndex && !callUsesFeedback) {
        index = closeIndex
        continue
      }
      output += block.slice(cursor, index)
      output += transformModulateCall({ callText, file, chainRoot, changes, residuals })
      cursor = closeIndex + 1
      index = closeIndex
    }
  }

  output += block.slice(cursor)
  return output
}

const transformAllNormalizedLargeModulates = ({ source, file, changes }) => {
  let output = ''
  let cursor = 0
  for (let index = 0; index < source.length; index += 1) {
    if (!source.startsWith('.modulate(', index)) continue
    const openIndex = index + '.modulate'.length
    const closeIndex = findMatchingParen(source, openIndex)
    if (closeIndex === -1) continue
    const callText = source.slice(index, closeIndex + 1)
    const argsText = callText.slice(callText.indexOf('(') + 1, -1)
    const parts = splitTopLevelArgs(argsText)
    let field = parts[0] ?? ''
    const amount = parts[1]
    const normalized = normalizeTransformDeltaField(field)
    field = normalized.field
    const coefficient = normalized.changed ? 1 : normalizedColorCoefficient(field)
    if (!amount || coefficient <= 0) continue
    const amountChange = capAmount(amount, coefficient, maxPx)
    if (!amountChange.changed && !normalized.changed) continue
    const nextCall = `.modulate(${[field, amountChange.amount, ...parts.slice(2)].filter((part) => part !== undefined && part !== '').join(', ')})`
    output += source.slice(cursor, index)
    output += nextCall
    cursor = closeIndex + 1
    changes.push({
      file,
      chainRoot: 'any-normalized-modulate',
      kind: normalized.changed ? 'transform-delta-global-normalize' : 'normalized-modulate-global-cap',
      normalizedTransformDelta: normalized.changed,
      normalizedRawField: false,
      amountChanged: amountChange.changed,
      reason: amountChange.changed ? amountChange.reason : 'transform-delta field normalized in global sweep',
      before: callText.trim(),
      after: nextCall
    })
    index = closeIndex
  }
  output += source.slice(cursor)
  return output
}

const transformHydraBlocks = (source, file) => {
  const lines = source.split(/\r?\n/u)
  const output = []
  const changes = []
  const residuals = []
  let block = []
  let depth = 0

  const flushBlock = () => {
    if (!block.length) return
    const text = block.join('\n')
    output.push(transformClosedFeedbackChain({ block: text, file, changes, residuals }))
    block = []
    depth = 0
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!block.length && hydraRootPattern.test(trimmed)) {
      block.push(line)
      depth += bracketDelta(stripComments(line))
      if (/\.out\s*\(/u.test(line) && depth <= 0) flushBlock()
      continue
    }

    if (block.length) {
      block.push(line)
      depth += bracketDelta(stripComments(line))
      if (/\.out\s*\(/u.test(line) && depth <= 0) flushBlock()
      continue
    }

    output.push(line)
  }
  flushBlock()

  const globallyCapped = transformAllNormalizedLargeModulates({ source: output.join('\n'), file, changes })
  return { source: globallyCapped, changes, residuals }
}

const updateShared = (source) => {
  let next = source
    .replaceAll('v3', 'v5')
    .replaceAll('v4', 'v5')
    .replace(/^\s*\/\/ Shared helpers[^\n]*\r?\n\/\/ Run once[^\n]*\r?\n\/\/ Assignment arrows[^\n]*\r?\n\s*/u, '')

  if (!/\bPX_MAX\b/u.test(next)) {
    next = next.replace(
      'B = height > width ? width / height : 1\n',
      `B = height > width ? width / height : 1\nPX_MAX = ${formatNumber(maxPx)}\n\npx = (value = 0, max = PX_MAX) => Math.max(-max, Math.min(max, value))\n`
    )
  }
  if (!/\bpxknob\b/u.test(next)) {
    next += `

pxknob = (base = 0, amount = 1, bins = 4, freq = 2, vel = 0.05, max = PX_MAX) => {
  const center = px(base * Math.max(width, height), max)
  const room = Math.max(0, max - Math.abs(center))
  const range = Math.min(Math.abs(amount * Math.max(width, height)), room)
  return knob(center, range, bins, freq, vel)
}

pxrng = (min = 0, maxValue = 1, bins = 4, freq = 2, vel = 0.05, max = PX_MAX) =>
  rng(px(min * Math.max(width, height), max), px(maxValue * Math.max(width, height), max), bins, freq, vel)

pxwob = (min = 0, maxValue = 1, sync = 0.05, max = PX_MAX) =>
  wob(px(min * Math.max(width, height), max), px(maxValue * Math.max(width, height), max), sync)

pxwobc = (base = 0, amount = 1, sync = 0.05, max = PX_MAX) => {
  const center = px(base * Math.max(width, height), max)
  const room = Math.max(0, max - Math.abs(center))
  const range = Math.min(Math.abs(amount * Math.max(width, height)), room)
  return wobc(center, range, sync)
}
`
  }
  return next.trimStart()
}

const stripGeneratedPrelude = (source) =>
  source
    .replace(/^\s*\/\*\s*Hydra curated corpus port candidate:[\s\S]*?\*\/\s*/u, '')
    .replace(/^\s*\/\*\s*Final v3 pass[\s\S]*?\*\/\s*/u, '')
    .replace(/^\s*\/\/ Run shared-v\d+\.js once before this patch\.\s*\r?\n?/u, '')
    .trimStart()

const convertFunctionDeclarations = (source) => {
  let output = ''
  let cursor = 0
  const pattern = /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/gu

  for (const match of source.matchAll(pattern)) {
    const start = match.index ?? 0
    const name = match[1]
    const openIndex = start + match[0].length - 1
    const closeIndex = findMatchingParen(source, openIndex)
    if (closeIndex === -1) continue
    let braceIndex = closeIndex + 1
    while (/\s/u.test(source[braceIndex] ?? '')) braceIndex += 1
    if (source[braceIndex] !== '{') continue

    const params = source.slice(openIndex + 1, closeIndex)
    output += source.slice(cursor, start)
    output += `${name} = (${params}) => `
    cursor = braceIndex
  }

  output += source.slice(cursor)
  return output
}

const updateHeader = (source) =>
  convertFunctionDeclarations(stripGeneratedPrelude(source
    .replaceAll('shared-v4.js', 'shared-v5.js')
    .replaceAll('shared-v3.js', 'shared-v5.js')
    .replaceAll('pattern_*.v3.js', 'pattern_*.v5.js')
    .replaceAll('Final v3 pass + v4 buffer-normalized pass:', 'Final v3 pass + v4 buffer-normalized pass + v5 feedback energy-bound pass:')
    .replace(
      'status remains: review candidate, not visually accepted',
      `feedback/coordinate-energy modulates are normalized to <= ${formatNumber(maxPx)} px/pass where math-safe\n- status remains: review candidate, not visually accepted`
    )))

const writeIndex = async (files, audit) => {
  const lines = [
    '# Hydra Curated Corpus Ported Candidates V5',
    '',
    'This directory is an energy-bound pass over the v4 corpus.',
    '',
    'Rule:',
    '',
    `- feedback-influencing displacement is capped at ${formatNumber(maxPx)} pixels/pass where the field exposes pixel-step units`,
    '- transform-delta fields used as modulators are converted to pixel-step fields with `.color(1 / width, 1 / height)`',
    '- lower-energy authored motions are preserved',
    '- pre-feedback material/gate raw modulates are not flattened unless they expose coordinate-delta energy',
    '- unresolved dynamic or non-normalized cases, if any, are listed in the audit for manual review',
    '',
    'Use:',
    '',
    '```js',
    '// run this once',
    'shared-v5.js',
    '',
    '// then evaluate individual pattern files',
    'pattern_002.v5.js',
    '```',
    '',
    'Audit:',
    '',
    `- changed modulate calls: ${audit.changes.length}`,
    `- residual review calls: ${audit.residuals.length}`,
    '',
    '## Files',
    '',
    ...files.map((file) => `- [${file}](./${file})`)
  ]
  await writeFile(path.join(args.outDir, 'index.md'), `${lines.join('\n')}\n`)
}

const writeAudit = async (audit) => {
  const groupedChanges = new Map()
  for (const change of audit.changes) {
    if (!groupedChanges.has(change.file)) groupedChanges.set(change.file, [])
    groupedChanges.get(change.file).push(change)
  }
  const groupedResiduals = new Map()
  for (const residual of audit.residuals) {
    if (!groupedResiduals.has(residual.file)) groupedResiduals.set(residual.file, [])
    groupedResiduals.get(residual.file).push(residual)
  }

  const lines = [
    '# Hydra V5 Feedback Energy Audit',
    '',
    `Max feedback displacement: ${formatNumber(maxPx)} px/pass`,
    '',
    `Changed modulate calls: ${audit.changes.length}`,
    `Residual review calls: ${audit.residuals.length}`,
    '',
    '## Changed Files',
    ''
  ]

  for (const [file, changes] of [...groupedChanges.entries()].sort()) {
    lines.push(`### ${file}`, '')
    for (const change of changes) {
      const unitPhrase = change.normalizedTransformDelta
        ? 'normalized transform-delta field'
        : change.normalizedRawField
          ? 'normalized raw/fractional field'
          : 'kept field units'
      lines.push(
        `- ${unitPhrase}; ${change.amountChanged ? change.reason : 'amount already within bound'}`,
        '',
        '```js',
        change.after,
        '```',
        ''
      )
    }
  }

  lines.push('## Residual Manual Review', '')
  if (!audit.residuals.length) {
    lines.push('No residual top-level feedback modulates were left without recognizable pixel-step or transform-delta handling.')
  } else {
    for (const [file, residuals] of [...groupedResiduals.entries()].sort()) {
      lines.push(`### ${file}`, '')
      for (const residual of residuals) {
        lines.push('- top-level feedback modulate needs manual energy reading:', '', '```js', residual.call, '```', '')
      }
    }
  }

  await writeFile(path.join(args.outDir, 'energy-bound-audit.md'), `${lines.join('\n')}\n`)
  await writeFile(path.join(args.outDir, 'energy-bound-audit.json'), `${JSON.stringify(audit, null, 2)}\n`)
}

const main = async () => {
  await mkdir(args.outDir, { recursive: true })
  const entries = await readdir(args.inputDir)
  const patternFiles = entries
    .filter((file) => /^pattern_\d+\.v4\.js$/u.test(file))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  const outPatternFiles = []
  const audit = { maxPx, changes: [], residuals: [] }

  const sharedInput = path.join(args.inputDir, 'shared-v4.js')
  const sharedOutput = path.join(args.outDir, 'shared-v5.js')
  await writeFile(sharedOutput, updateShared(await readFile(sharedInput, 'utf8')))

  for (const file of patternFiles) {
    const source = await readFile(path.join(args.inputDir, file), 'utf8')
    const targetFile = file.replace('.v4.js', '.v5.js')
    const withHeader = updateHeader(source).replaceAll('.v4.js', '.v5.js')
    const transformed = transformHydraBlocks(withHeader, targetFile)
    await writeFile(path.join(args.outDir, targetFile), transformed.source)
    outPatternFiles.push(targetFile)
    audit.changes.push(...transformed.changes)
    audit.residuals.push(...transformed.residuals)
  }

  for (const file of ['buffer-normalization-audit.md', 'buffer-normalization-audit.json']) {
    try {
      await copyFile(path.join(args.inputDir, file), path.join(args.outDir, file))
    } catch {
      // optional provenance only
    }
  }

  await writeIndex(outPatternFiles, audit)
  await writeAudit(audit)

  console.log(`Wrote ${outPatternFiles.length} v5 candidates to ${args.outDir}`)
  console.log(`Changed modulate calls: ${audit.changes.length}`)
  console.log(`Residual review calls: ${audit.residuals.length}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
