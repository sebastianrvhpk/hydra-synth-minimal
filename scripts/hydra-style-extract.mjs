import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const HYDRA_ROOTS = new Set([
  'src',
  'shape',
  'solid',
  'osc',
  'noise',
  'noiseloop',
  'gradient',
  'voronoi',
  'ns',
  'nsloop',
  'nst',
  'nstpx',
  'nspx'
])

const CONTROL_CALLS = new Set([
  'render',
  'screencap',
  'hush',
  'setResolution'
])

const HELPERS = [
  'rn',
  'btw',
  'intgr',
  'chc',
  'maybe',
  'bi',
  'bl',
  'pick',
  'ns',
  'nsloop',
  'pixelX',
  'pixelY',
  'A',
  'B',
  'TAU'
]

const CATEGORY_BY_OP = new Map([
  ['src', 'feedback-source'],
  ['shape', 'geometry-source'],
  ['solid', 'color-source'],
  ['osc', 'oscillator-source'],
  ['noise', 'field-source'],
  ['noiseloop', 'field-source'],
  ['gradient', 'field-source'],
  ['ns', 'field-source'],
  ['nsloop', 'field-source'],
  ['voronoi', 'field-source'],
  ['mask', 'masking'],
  ['luma', 'masking'],
  ['thresh', 'masking'],
  ['layer', 'composite'],
  ['add', 'composite'],
  ['sub', 'composite'],
  ['diff', 'composite'],
  ['blend', 'composite'],
  ['mult', 'composite'],
  ['modulate', 'modulation'],
  ['modulateScale', 'modulation'],
  ['modulateHue', 'modulation'],
  ['modulateRotate', 'modulation'],
  ['modulateScrollX', 'modulation'],
  ['modulateScrollY', 'modulation'],
  ['modulateKaleid', 'modulation'],
  ['scale', 'geometry'],
  ['rotate', 'geometry'],
  ['scroll', 'geometry'],
  ['scrollX', 'geometry'],
  ['scrollY', 'geometry'],
  ['repeat', 'geometry'],
  ['repeatX', 'geometry'],
  ['repeatY', 'geometry'],
  ['pixelate', 'sampling'],
  ['posterize', 'sampling'],
  ['kaleid', 'symmetry'],
  ['color', 'color'],
  ['colorama', 'color'],
  ['hue', 'color'],
  ['saturate', 'color'],
  ['contrast', 'tone'],
  ['brightness', 'tone'],
  ['invert', 'tone'],
  ['out', 'sink'],
  ['r', 'channel'],
  ['g', 'channel'],
  ['b', 'channel']
])

const readArg = (name, fallback = undefined) => {
  const prefix = `--${name}=`
  const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix))
  return match ? match.slice(prefix.length) : fallback
}

const hasFlag = (name) => process.argv.slice(2).includes(`--${name}`)

const increment = (map, key, amount = 1) => {
  if (!key) return
  map.set(key, (map.get(key) ?? 0) + amount)
}

const objectFromMap = (map) =>
  Object.fromEntries([...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])))

const topEntries = (mapOrObject, limit = 20) => {
  const entries = mapOrObject instanceof Map ? [...mapOrObject.entries()] : Object.entries(mapOrObject)
  return entries
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .slice(0, limit)
}

const markdownTable = (headers, rows) => {
  const escapeCell = (value) => String(value).replaceAll('|', '\\|').replace(/\s+/gu, ' ').trim()
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(escapeCell).join(' | ')} |`)
  ].join('\n')
}

const formatCountList = (entries) =>
  entries.map(([key, count]) => `- ${key}: ${count}`).join('\n')

const stripComments = (code) => {
  let output = ''
  let quote = null
  let templateDepth = 0

  for (let index = 0; index < code.length; index += 1) {
    const char = code[index]
    const next = code[index + 1]

    if (quote) {
      output += char
      if (char === '\\') {
        index += 1
        output += code[index] ?? ''
        continue
      }
      if (quote === '`' && char === '$' && next === '{') {
        templateDepth += 1
        output += next
        index += 1
        continue
      }
      if (quote === '`' && char === '}' && templateDepth > 0) {
        templateDepth -= 1
        continue
      }
      if (char === quote && templateDepth === 0) quote = null
      continue
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char
      output += char
      continue
    }

    if (char === '/' && next === '/') {
      while (index < code.length && code[index] !== '\n') index += 1
      output += '\n'
      continue
    }

    if (char === '/' && next === '*') {
      index += 2
      while (index < code.length && !(code[index] === '*' && code[index + 1] === '/')) {
        output += code[index] === '\n' ? '\n' : ' '
        index += 1
      }
      index += 1
      continue
    }

    output += char
  }

  return output
}

const bracketDelta = (line) => {
  let delta = 0
  let quote = null
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
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

const looksLikeNewStatement = (line) => {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('.')) return false
  const identifier = /^([A-Za-z_$][\w$]*)\s*\(/u.exec(trimmed)?.[1]
  if (identifier && (HYDRA_ROOTS.has(identifier) || CONTROL_CALLS.has(identifier))) return true
  return /^[A-Za-z_$][\w$]*\s*=/u.test(trimmed)
}

const splitStatements = (code) => {
  const clean = stripComments(code)
  const chunks = []
  let current = []
  let depth = 0

  const flush = () => {
    const text = current.join('\n').trim()
    if (text) chunks.push(text.replace(/;\s*$/u, ''))
    current = []
    depth = 0
  }

  for (const line of clean.split(/\r?\n/u)) {
    const trimmed = line.trim()
    if (!trimmed) {
      if (current.length > 0 && depth <= 0) flush()
      continue
    }

    if (current.length > 0 && depth <= 0 && looksLikeNewStatement(line)) flush()

    current.push(line)
    depth += bracketDelta(line)
    if (depth <= 0 && /;\s*$/u.test(trimmed)) flush()
  }

  if (current.length > 0) flush()
  return chunks
}

const readBalancedCall = (text, openIndex) => {
  let depth = 0
  let quote = null

  for (let index = openIndex; index < text.length; index += 1) {
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
    if (char === '(') depth += 1
    if (char === ')') {
      depth -= 1
      if (depth === 0) {
        return {
          args: text.slice(openIndex + 1, index),
          end: index + 1
        }
      }
    }
  }

  return {
    args: text.slice(openIndex + 1),
    end: text.length
  }
}

const readIdentifier = (text, index) => {
  const match = /^[A-Za-z_$][\w$]*/u.exec(text.slice(index))
  if (!match) return null
  return {
    name: match[0],
    end: index + match[0].length
  }
}

const findNextNonWhitespace = (text, index) => {
  let current = index
  while (/\s/u.test(text[current] ?? '')) current += 1
  return current
}

const extractTopLevelMethods = (text, startIndex) => {
  const methods = []
  let depth = 0
  let quote = null

  for (let index = startIndex; index < text.length; index += 1) {
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

    if (depth === 0 && char === '.') {
      const identifier = readIdentifier(text, index + 1)
      if (!identifier) continue
      const openIndex = findNextNonWhitespace(text, identifier.end)
      if (text[openIndex] !== '(') continue
      const call = readBalancedCall(text, openIndex)
      methods.push({
        name: identifier.name,
        args: call.args.trim(),
        category: CATEGORY_BY_OP.get(identifier.name) ?? 'other'
      })
      index = call.end - 1
      continue
    }

    if (char === '(' || char === '[' || char === '{') depth += 1
    if (char === ')' || char === ']' || char === '}') depth -= 1
  }

  return methods
}

const extractAllCallNames = (code) => {
  const names = []
  let quote = null

  for (let index = 0; index < code.length; index += 1) {
    const char = code[index]
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
    if (!/[A-Za-z_$]/u.test(char)) continue
    const identifier = readIdentifier(code, index)
    if (!identifier) continue
    const openIndex = findNextNonWhitespace(code, identifier.end)
    if (code[openIndex] === '(') names.push(identifier.name)
    index = identifier.end - 1
  }

  return names
}

const previousNonWhitespace = (text, index) => {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (!/\s/u.test(text[cursor])) return text[cursor]
  }
  return ''
}

const previousIdentifierBeforeDot = (text, dotIndex) => {
  let cursor = dotIndex - 1
  while (cursor >= 0 && /\s/u.test(text[cursor])) cursor -= 1
  const end = cursor + 1
  while (cursor >= 0 && /[A-Za-z_$\w]/u.test(text[cursor])) cursor -= 1
  return text.slice(cursor + 1, end)
}

const extractStandaloneCallNames = (code) => {
  const names = []
  let quote = null

  for (let index = 0; index < code.length; index += 1) {
    const char = code[index]
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
    if (!/[A-Za-z_$]/u.test(char)) continue
    if (previousNonWhitespace(code, index) === '.') continue
    const identifier = readIdentifier(code, index)
    if (!identifier) continue
    const openIndex = findNextNonWhitespace(code, identifier.end)
    if (code[openIndex] === '(') names.push(identifier.name)
    index = identifier.end - 1
  }

  return names
}

const extractAllMethodNames = (code) => {
  const names = []
  let quote = null

  for (let index = 0; index < code.length; index += 1) {
    const char = code[index]
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
    if (char !== '.') continue
    const previous = code[index - 1] ?? ''
    if (/\d/u.test(previous)) continue
    const identifier = readIdentifier(code, index + 1)
    if (!identifier) continue
    if (previousIdentifierBeforeDot(code, index) === 'Math') {
      index = identifier.end - 1
      continue
    }
    const openIndex = findNextNonWhitespace(code, identifier.end)
    if (code[openIndex] === '(') names.push(identifier.name)
    index = identifier.end - 1
  }

  return names
}

const extractRootCall = (statement) => {
  const rootMatch = /^\s*([A-Za-z_$][\w$]*)\s*\(/u.exec(statement)
  if (!rootMatch) return null
  const root = rootMatch[1]
  if (!HYDRA_ROOTS.has(root)) return null
  const openIndex = statement.indexOf('(', rootMatch.index + root.length)
  const rootCall = readBalancedCall(statement, openIndex)
  return {
    root,
    rootArgs: rootCall.args.trim(),
    rootEnd: rootCall.end
  }
}

const extractControlCall = (statement) => {
  const match = /^\s*([A-Za-z_$][\w$]*)\s*\(/u.exec(statement)
  if (!match || !CONTROL_CALLS.has(match[1])) return null
  const openIndex = statement.indexOf('(', match.index + match[1].length)
  const call = readBalancedCall(statement, openIndex)
  return {
    name: match[1],
    args: call.args.trim()
  }
}

const normalizeOutputTarget = (args) => args.trim() || 'o0'

const collectBuffers = (text) => {
  const reads = new Set()
  const bare = new Set()
  for (const match of text.matchAll(/\bsrc\s*\(\s*(o\d+)\s*\)/gu)) reads.add(match[1])
  for (const match of text.matchAll(/\b(o\d+)\b/gu)) bare.add(match[1])
  return {
    reads: [...reads].sort(),
    references: [...bare].sort()
  }
}

const countRegex = (text, regex) => [...text.matchAll(regex)].length

const extractNumberLiterals = (text) => {
  const values = []
  for (const match of text.matchAll(/(?<![\w$])[-+]?(?:\d+\.\d+|\.\d+|\d+)(?:e[-+]?\d+)?(?![\w$])/giu)) {
    const value = Number(match[0])
    if (Number.isFinite(value)) values.push(value)
  }
  return values
}

const summarizeNumbers = (values) => {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const sum = sorted.reduce((total, value) => total + value, 0)
  return {
    count: sorted.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: Number((sum / sorted.length).toFixed(5)),
    p25: sorted[Math.floor(sorted.length * 0.25)],
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p75: sorted[Math.floor(sorted.length * 0.75)]
  }
}

const extractCallRanges = (text, callName) => {
  const ranges = []
  const regex = new RegExp(`\\b${callName}\\s*\\(([^)]*)\\)`, 'gu')
  for (const match of text.matchAll(regex)) {
    const args = match[1].split(',').map((arg) => arg.trim()).slice(0, 3)
    ranges.push(args)
  }
  return ranges
}

const extractSymbolUsage = (text) => {
  const symbols = new Map()
  for (const symbol of ['width', 'height', 'time', 'A', 'B', 'TAU', 'mouse', 'speed', 'bpm']) {
    const count = countRegex(text, new RegExp(`\\b${symbol}\\b`, 'gu'))
    if (count > 0) symbols.set(symbol, count)
  }
  for (const match of text.matchAll(/\b(o\d+)\b/gu)) increment(symbols, match[1])
  return symbols
}

const createPrimitiveAccumulator = () => ({
  initialGenerators: new Map(),
  nestedGenerators: new Map(),
  modulatorGenerators: new Map(),
  maskGenerators: new Map(),
  compositeGenerators: new Map(),
  geometryGenerators: new Map(),
  colorGenerators: new Map(),
  helperCalls: new Map(),
  symbolUsage: new Map(),
  methodArgumentGenerators: new Map(),
  methodArgumentHelpers: new Map(),
  operationBigrams: new Map(),
  operationTrigrams: new Map(),
  chainPrefixes: new Map(),
  categoryTransitions: new Map(),
  rootToFirstOp: new Map()
})

const roleForMethod = (method) => {
  if (method.category === 'modulation') return 'modulatorGenerators'
  if (method.category === 'masking' || method.name === 'mask') return 'maskGenerators'
  if (method.category === 'composite') return 'compositeGenerators'
  if (method.category === 'geometry' || method.category === 'sampling' || method.category === 'symmetry') {
    return 'geometryGenerators'
  }
  if (method.category === 'color' || method.category === 'tone' || method.category === 'channel') return 'colorGenerators'
  return 'nestedGenerators'
}

const incrementNestedMap = (map, outer, inner, amount = 1) => {
  const current = map.get(outer) ?? new Map()
  increment(current, inner, amount)
  map.set(outer, current)
}

const recordPrimitiveVocabulary = ({ accumulator, chain }) => {
  increment(accumulator.initialGenerators, chain.root)
  if (chain.methods[0]) increment(accumulator.rootToFirstOp, `${chain.root} > ${chain.methods[0].name}`)
  const opNames = chain.methods.map((method) => method.name)
  const categories = chain.methods.map((method) => method.category)

  for (let index = 0; index < opNames.length - 1; index += 1) {
    increment(accumulator.operationBigrams, `${opNames[index]} > ${opNames[index + 1]}`)
  }
  for (let index = 0; index < opNames.length - 2; index += 1) {
    increment(accumulator.operationTrigrams, `${opNames[index]} > ${opNames[index + 1]} > ${opNames[index + 2]}`)
  }
  for (let index = 0; index < categories.length - 1; index += 1) {
    increment(accumulator.categoryTransitions, `${categories[index]} > ${categories[index + 1]}`)
  }
  if (opNames.length > 0) {
    increment(accumulator.chainPrefixes, [chain.root, ...opNames.slice(0, 4)].join(' > '))
  }

  for (const method of chain.methods) {
    const standaloneCalls = extractStandaloneCallNames(method.args)
    const symbolUsage = extractSymbolUsage(method.args)
    for (const [symbol, count] of symbolUsage.entries()) increment(accumulator.symbolUsage, symbol, count)

    for (const callName of standaloneCalls) {
      if (HYDRA_ROOTS.has(callName)) {
        increment(accumulator.nestedGenerators, callName)
        increment(accumulator[roleForMethod(method)], callName)
        incrementNestedMap(accumulator.methodArgumentGenerators, method.name, callName)
      }
      if (HELPERS.includes(callName)) {
        increment(accumulator.helperCalls, callName)
        incrementNestedMap(accumulator.methodArgumentHelpers, method.name, callName)
      }
    }
  }
}

const finalizePrimitiveAccumulator = (accumulator) => {
  const finalizeNested = (map) => Object.fromEntries(
    [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, value]) => [key, objectFromMap(value)])
  )

  return {
    initialGenerators: objectFromMap(accumulator.initialGenerators),
    nestedGenerators: objectFromMap(accumulator.nestedGenerators),
    modulatorGenerators: objectFromMap(accumulator.modulatorGenerators),
    maskGenerators: objectFromMap(accumulator.maskGenerators),
    compositeGenerators: objectFromMap(accumulator.compositeGenerators),
    geometryGenerators: objectFromMap(accumulator.geometryGenerators),
    colorGenerators: objectFromMap(accumulator.colorGenerators),
    helperCalls: objectFromMap(accumulator.helperCalls),
    symbolUsage: objectFromMap(accumulator.symbolUsage),
    methodArgumentGenerators: finalizeNested(accumulator.methodArgumentGenerators),
    methodArgumentHelpers: finalizeNested(accumulator.methodArgumentHelpers),
    operationBigrams: objectFromMap(accumulator.operationBigrams),
    operationTrigrams: objectFromMap(accumulator.operationTrigrams),
    chainPrefixes: objectFromMap(accumulator.chainPrefixes),
    categoryTransitions: objectFromMap(accumulator.categoryTransitions),
    rootToFirstOp: objectFromMap(accumulator.rootToFirstOp)
  }
}

const roleForRoot = (root, args = '') => {
  if (root === 'src') return /\bo\d+\b/u.test(args) ? 'feedback-memory' : 'source-memory'
  if (root === 'shape') return 'geometry-seed'
  if (root === 'solid') return 'constant-field'
  if (root === 'osc') return 'wave-seed'
  if (root === 'gradient') return 'gradient-field'
  if (['noise', 'noiseloop', 'ns', 'nsloop', 'nst', 'nstpx', 'nspx', 'voronoi'].includes(root)) return 'noise-field'
  return 'source-seed'
}

const roleForHydraGenerator = (name) => {
  if (name === 'src') return 'buffer'
  if (name === 'shape') return 'geometry'
  if (name === 'solid') return 'constant'
  if (name === 'osc') return 'wave'
  if (name === 'gradient') return 'gradient'
  if (['noise', 'noiseloop', 'ns', 'nsloop', 'nst', 'nstpx', 'nspx', 'voronoi'].includes(name)) return 'noise-field'
  return 'source'
}

const roleForOperation = (name) => {
  if (['layer', 'add', 'blend'].includes(name)) return 'accumulate'
  if (['diff', 'sub'].includes(name)) return 'subtract'
  if (name === 'mult') return 'multiply'
  if (['mask', 'luma', 'thresh'].includes(name)) return 'gate'
  if (name === 'modulate') return 'displace'
  if (['modulateScale', 'modulateRotate', 'modulateScrollX', 'modulateScrollY', 'modulateKaleid'].includes(name)) {
    return 'geometry-modulate'
  }
  if (name === 'modulateHue') return 'chroma-modulate'
  if (['scale', 'rotate', 'scroll', 'scrollX', 'scrollY', 'repeat', 'repeatX', 'repeatY'].includes(name)) return 'layout'
  if (['pixelate', 'posterize'].includes(name)) return 'quantize'
  if (['color', 'hue', 'colorama', 'saturate'].includes(name)) return 'chroma'
  if (['brightness', 'contrast', 'invert'].includes(name)) return 'tone'
  if (['r', 'g', 'b'].includes(name)) return 'channel'
  if (name === 'kaleid') return 'symmetry'
  if (name === 'out') return 'write'
  return 'other'
}

const METHOD_ROLE_VOCABULARY = [
  {
    role: 'feedback-memory',
    computerScience: 'A chain root reads a Hydra buffer, usually `src(o0)` or another `o*` target.',
    graphics: 'Previous frame or staged buffer becomes editable visual memory.'
  },
  {
    role: 'geometry-seed',
    computerScience: '`shape(...)` starts the expression tree.',
    graphics: 'A spatial primitive acts as a mask, tile, cell, or hard-edged seed.'
  },
  {
    role: 'constant-field',
    computerScience: '`solid(...)` starts or enters the chain as a uniform field.',
    graphics: 'Flat color or scalar material is used as a base, matte, or subtractive field.'
  },
  {
    role: 'wave-seed',
    computerScience: '`osc(...)` starts or enters the chain as a periodic source.',
    graphics: 'Wave bands supply stripes, color cycling, scanlines, or rhythmic interference.'
  },
  {
    role: 'noise-field',
    computerScience: '`noise`, `noiseloop`, `ns`, `nstpx`, and related helpers supply sampled fields.',
    graphics: 'Noisy terrain drives displacement, masks, erosion, flicker, or texture structure.'
  },
  {
    role: 'accumulate',
    computerScience: '`layer`, `add`, and `blend` combine streams without discarding the base chain.',
    graphics: 'Visual mass is built by piling color, fields, or buffer memory into the frame.'
  },
  {
    role: 'gate',
    computerScience: '`mask`, `luma`, and `thresh` convert material into visibility or selection logic.',
    graphics: 'Shapes and fields open or close regions, creating cutouts, cells, windows, and erosion.'
  },
  {
    role: 'displace',
    computerScience: '`modulate` uses an argument texture as a coordinate offset field.',
    graphics: 'The image is pushed through a vector-like field, often normalized by width or height.'
  },
  {
    role: 'geometry-modulate',
    computerScience: '`modulateScale`, `modulateRotate`, and scroll variants modulate transform parameters.',
    graphics: 'Scale, rotation, or drift is made field-dependent instead of globally fixed.'
  },
  {
    role: 'subtract',
    computerScience: '`diff` and `sub` compare or remove material from the current chain.',
    graphics: 'Edges, voids, silhouettes, and contrast pressure are carved out.'
  },
  {
    role: 'quantize',
    computerScience: '`pixelate` and `posterize` reduce sampling or value resolution.',
    graphics: 'Continuous fields become grids, steps, scanlines, or coarse cells.'
  },
  {
    role: 'write',
    computerScience: '`out(...)` commits the chain to a Hydra output buffer.',
    graphics: 'The constructed frame becomes memory for render or later feedback.'
  }
]

const TOPOLOGY_VOCABULARY = [
  ['closed-feedback:oN', 'Read and write the same buffer.', 'A frame edits its own memory.'],
  ['cross-buffer:oA->oB', 'Read one buffer and write another.', 'A staged pass moves material through a buffer pipeline.'],
  ['multi-read-write:oN', 'Read multiple buffers and write one target.', 'Several memories are fused into a shared output.'],
  ['source-write:oN', 'No buffer read; generated material writes to a buffer.', 'A fresh generator pass creates memory for later use.'],
  ['read-transform-no-write', 'Read a buffer without a detected `.out(...)`.', 'A transform expression is present but not committed in that statement.']
]

const compressSequence = (values) => {
  const compressed = []
  for (const value of values) {
    if (compressed.at(-1) !== value) compressed.push(value)
  }
  return compressed
}

const classifyTopology = (chain) => {
  const write = chain.writeTarget ?? null
  const reads = chain.readBuffers
  if (!write) return reads.length > 0 ? 'read-transform-no-write' : 'source-transform-no-write'
  if (reads.includes(write)) return `closed-feedback:${write}`
  if (reads.length > 1) return `multi-read-write:${write}`
  if (reads.length === 1) return `cross-buffer:${reads[0]}->${write}`
  return `source-write:${write}`
}

const splitTopLevelArgs = (text) => {
  const args = []
  let depth = 0
  let quote = null
  let start = 0

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
      args.push(text.slice(start, index).trim())
      start = index + 1
    }
  }

  const tail = text.slice(start).trim()
  if (tail || text.includes(',')) args.push(tail)
  return args
}

const argumentMaterialRoles = (args) => {
  const roles = new Set()
  for (const callName of extractStandaloneCallNames(args)) {
    if (HYDRA_ROOTS.has(callName)) roles.add(roleForHydraGenerator(callName))
  }
  for (const symbol of ['width', 'height', 'A', 'B', 'TAU', 'time']) {
    if (new RegExp(`\\b${symbol}\\b`, 'u').test(args)) roles.add(symbol)
  }
  for (const match of args.matchAll(/\bo\d+\b/gu)) roles.add('buffer-ref')
  return [...roles].sort()
}

const readHydraExpressionAt = (text, index) => {
  const identifier = readIdentifier(text, index)
  if (!identifier || !HYDRA_ROOTS.has(identifier.name)) return null
  if (previousNonWhitespace(text, index) === '.') return null
  const openIndex = findNextNonWhitespace(text, identifier.end)
  if (text[openIndex] !== '(') return null
  const rootCall = readBalancedCall(text, openIndex)
  const methods = []
  let cursor = rootCall.end
  let end = rootCall.end

  while (true) {
    const dotIndex = findNextNonWhitespace(text, cursor)
    if (text[dotIndex] !== '.') break
    const methodIdentifier = readIdentifier(text, dotIndex + 1)
    if (!methodIdentifier) break
    const methodOpenIndex = findNextNonWhitespace(text, methodIdentifier.end)
    if (text[methodOpenIndex] !== '(') break
    const methodCall = readBalancedCall(text, methodOpenIndex)
    methods.push({
      name: methodIdentifier.name,
      args: methodCall.args.trim(),
      category: CATEGORY_BY_OP.get(methodIdentifier.name) ?? 'other'
    })
    cursor = methodCall.end
    end = methodCall.end
  }

  return {
    root: identifier.name,
    rootArgs: rootCall.args.trim(),
    methods,
    operationRoles: methods.map((method) => roleForOperation(method.name)),
    signature: [identifier.name, ...methods.map((method) => method.name)].join(' > '),
    roleSignature: [
      roleForHydraGenerator(identifier.name),
      ...compressSequence(methods.map((method) => roleForOperation(method.name)))
    ].join(' > '),
    code: compactExpression(text.slice(index, end), 220),
    end
  }
}

const extractHydraExpressions = (text) => {
  const expressions = []
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
    if (!/[A-Za-z_$]/u.test(char)) continue
    if (index > 0 && /[\w$]/u.test(text[index - 1])) continue
    const expression = readHydraExpressionAt(text, index)
    if (expression) expressions.push(expression)
  }

  return expressions
}

const isModulationHost = (name) => /^modulate/u.test(name)

const argumentSpaceForHost = (name) => {
  if (name === 'modulate') return 'inside-uv-modulation'
  if (name === 'modulateHue') return 'inside-chroma-modulation'
  if (isModulationHost(name)) return 'inside-geometry-modulation'
  const role = roleForOperation(name)
  if (role === 'gate') return 'inside-gate'
  if (['accumulate', 'subtract', 'multiply'].includes(role)) return 'inside-composite'
  if (['layout', 'symmetry', 'quantize'].includes(role)) return 'inside-layout'
  if (['chroma', 'tone', 'channel', 'chroma-modulate'].includes(role)) return 'inside-color'
  return 'inside-other'
}

const hasWidthHeightPair = (args) => {
  const parts = splitTopLevelArgs(args)
  if (parts.length < 2) return false
  const first = /\bwidth\b/u.test(parts[0]) || /\bheight\b/u.test(parts[0])
  const second = /\bwidth\b/u.test(parts[1]) || /\bheight\b/u.test(parts[1])
  return first && second && parts[0] !== parts[1]
}

const expressionVectorCues = (expression) => {
  const cues = new Set()
  if (/\bwidth\b/u.test(expression.rootArgs) && /\bheight\b/u.test(expression.rootArgs)) {
    cues.add('root-width-height')
  }

  for (const method of expression.methods) {
    if (method.name === 'color' || method.name === 'solid') {
      cues.add('color-encoded-field')
      if (hasWidthHeightPair(method.args)) cues.add('rg-width-height-vector')
    }
    if (['r', 'g'].includes(method.name)) cues.add('channel-sampled-rg')
    if (method.name === 'b') cues.add('channel-sampled-b')
    if (/\bwidth\b/u.test(method.args) && /\bheight\b/u.test(method.args)) {
      cues.add('width-height-normalized')
    }
  }

  return [...cues].sort()
}

const classifyArgumentField = ({ method, programs }) => {
  const cues = new Set()
  if (method.name === 'modulate') cues.add('uv-displacement-host')
  if (['modulateScrollX', 'modulateScrollY'].includes(method.name)) cues.add('axis-displacement-host')
  if (['modulateScale', 'modulateRotate', 'modulateKaleid'].includes(method.name)) cues.add('geometry-parameter-host')
  if (method.name === 'modulateHue') cues.add('chroma-field-host')
  if (/\bwidth\b/u.test(method.args) && /\bheight\b/u.test(method.args)) cues.add('width-height-normalized')
  if (hasWidthHeightPair(method.args)) cues.add('rg-width-height-vector')
  if (/\.(?:r|g)\s*\(/u.test(method.args)) cues.add('channel-sampled-rg')
  if (/\bcolor\s*\(/u.test(method.args)) cues.add('color-encoded-field')

  for (const program of programs) {
    for (const cue of program.vectorCues) cues.add(cue)
  }

  if (cues.size === 0 && programs.length > 0) cues.add('texture-field')
  return [...cues].sort()
}

const topLevelSemanticSpace = ({ chain, method, index, topology = classifyTopology(chain), sourceRole = roleForRoot(chain.root, chain.rootArgs) }) => {
  const role = roleForOperation(method.name)
  if (role === 'write') return 'buffer-write'

  const accumulationIndexes = chain.methods
    .map((item, itemIndex) => roleForOperation(item.name) === 'accumulate' ? itemIndex : -1)
    .filter((itemIndex) => itemIndex >= 0)
  const firstAccumulation = accumulationIndexes[0] ?? -1
  const lastAccumulation = accumulationIndexes.at(-1) ?? -1

  if (role === 'accumulate') {
    if (topology.startsWith('closed-feedback')) return 'feedback-accumulation-host'
    if (sourceRole === 'feedback-memory') return 'staged-feedback-accumulation-host'
    return 'source-accumulation-host'
  }

  if (sourceRole === 'feedback-memory' && topology.startsWith('closed-feedback')) {
    if (firstAccumulation < 0) return 'feedback-memory-treatment'
    if (index < firstAccumulation) return 'feedback-pre-accumulation-treatment'
    if (index > lastAccumulation) return 'feedback-post-accumulation-treatment'
    return 'feedback-between-accumulations-treatment'
  }

  if (sourceRole === 'feedback-memory') return 'staged-feedback-treatment'
  if (topology.startsWith('source-write')) return 'source-construction-treatment'
  if (topology.startsWith('cross-buffer')) return 'cross-buffer-treatment'
  return 'outer-chain-treatment'
}

const semanticSpaceForArgumentProgram = (argumentProgram) => {
  if (argumentProgram.space === 'inside-uv-modulation') return 'uv-displacement-field'
  if (argumentProgram.space === 'inside-geometry-modulation') return 'geometry-modulation-field'
  if (argumentProgram.space === 'inside-chroma-modulation') return 'chroma-modulation-field'
  if (argumentProgram.space === 'inside-gate') return 'gate-mask-field'
  if (argumentProgram.space === 'inside-layout') return 'layout-parameter-material'
  if (argumentProgram.space === 'inside-color') return 'color-tone-input-material'

  if (argumentProgram.space === 'inside-composite') {
    if (argumentProgram.hostRole === 'accumulate') {
      if (argumentProgram.hostPathContext === 'feedback-accumulation-host') {
        return 'feedback-accumulation-input-material'
      }
      if (argumentProgram.hostPathContext === 'staged-feedback-accumulation-host') {
        return 'staged-feedback-accumulation-input-material'
      }
      return 'source-accumulation-input-material'
    }
    if (argumentProgram.hostRole === 'subtract') return 'subtractive-comparison-input'
    if (argumentProgram.hostRole === 'multiply') return 'multiplicative-field'
    return 'composite-input-material'
  }

  return 'embedded-texture-material'
}

const analyzeMethodArgumentPrograms = (method, metadata = {}) => {
  const programs = extractHydraExpressions(method.args).map((expression) => ({
    root: expression.root,
    rootRole: roleForHydraGenerator(expression.root),
    signature: expression.signature,
    roleSignature: expression.roleSignature,
    operations: expression.methods.map((innerMethod) => innerMethod.name),
    operationRoles: expression.operationRoles,
    vectorCues: expressionVectorCues(expression),
    code: expression.code
  }))

  if (programs.length === 0) return null
  return {
    hostOp: method.name,
    hostRole: roleForOperation(method.name),
    hostIndex: metadata.hostIndex ?? null,
    hostPathContext: metadata.hostPathContext ?? null,
    space: argumentSpaceForHost(method.name),
    fieldCues: classifyArgumentField({ method, programs }),
    programs
  }
}

const analyzeConstructionMethod = (chain) => {
  const operationRoles = chain.methods.map((method) => roleForOperation(method.name))
  const compressedOperationRoles = compressSequence(operationRoles)
  const sourceRole = roleForRoot(chain.root, chain.rootArgs)
  const topology = classifyTopology(chain)
  const argumentPrograms = chain.methods
    .map((method, index) => analyzeMethodArgumentPrograms(method, {
      hostIndex: index,
      hostPathContext: topLevelSemanticSpace({ chain, method, index, topology, sourceRole })
    }))
    .filter(Boolean)
    .map((argumentProgram) => ({
      ...argumentProgram,
      semanticSpace: semanticSpaceForArgumentProgram(argumentProgram)
    }))
  const moves = chain.methods.map((method) => ({
    op: method.name,
    role: roleForOperation(method.name),
    materials: argumentMaterialRoles(method.args)
  }))
  const moveSignature = moves
    .filter((move) => move.role !== 'write')
    .map((move) => {
      const materials = move.materials.length > 0 ? `(${move.materials.join('+')})` : ''
      return `${move.role}:${move.op}${materials}`
    })
  const methodTrail = compressedOperationRoles.length > 0
    ? compressedOperationRoles.join(' > ')
    : 'read'

  return {
    topology,
    sourceRole,
    roleSequence: [sourceRole, ...operationRoles],
    compressedRoleSequence: [sourceRole, ...compressedOperationRoles],
    methodSignature: `${topology} | ${sourceRole} -> ${methodTrail}`,
    moveSignature,
    argumentPrograms,
    moves
  }
}

const summarizeMethodMap = (patterns) => {
  const topologyCounts = new Map()
  const methodSignatureCounts = new Map()
  const roleSequenceCounts = new Map()
  const moveCounts = new Map()
  const topologyExamples = new Map()
  const signatureExamples = new Map()
  const moveExamples = new Map()

  const addExample = (map, key, example) => {
    const examples = map.get(key) ?? []
    if (examples.length < 5 && !examples.includes(example)) examples.push(example)
    map.set(key, examples)
  }

  for (const pattern of patterns) {
    for (const chain of pattern.chains) {
      const method = chain.constructionMethod
      increment(topologyCounts, method.topology)
      increment(methodSignatureCounts, method.methodSignature)
      increment(roleSequenceCounts, method.compressedRoleSequence.join(' > '))
      addExample(topologyExamples, method.topology, `${pattern.id}:${chain.id}`)
      addExample(signatureExamples, method.methodSignature, `${pattern.id}:${chain.id}`)
      for (const move of method.moveSignature) {
        increment(moveCounts, move)
        addExample(moveExamples, move, `${pattern.id}:${chain.id}`)
      }
    }
  }

  const examplesFor = (map) => Object.fromEntries([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])))

  return {
    roleVocabulary: METHOD_ROLE_VOCABULARY,
    topologyVocabulary: TOPOLOGY_VOCABULARY,
    topologyCounts: objectFromMap(topologyCounts),
    methodSignatureCounts: objectFromMap(methodSignatureCounts),
    roleSequenceCounts: objectFromMap(roleSequenceCounts),
    moveCounts: objectFromMap(moveCounts),
    topologyExamples: examplesFor(topologyExamples),
    signatureExamples: examplesFor(signatureExamples),
    moveExamples: examplesFor(moveExamples)
  }
}

const objectFromNestedMap = (map) =>
  Object.fromEntries(
    [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, value]) => [key, objectFromMap(value)])
  )

const summarizeTextureOperationMap = (patterns) => {
  const outerOperationCounts = new Map()
  const outerRoleCounts = new Map()
  const argumentSpaceCounts = new Map()
  const modulationHostCounts = new Map()
  const modulationFieldCueCounts = new Map()
  const modulationRootCounts = new Map()
  const modulationProgramCounts = new Map()
  const modulationInnerOperationCounts = new Map()
  const modulationInnerRoleCounts = new Map()
  const nonModulationInnerOperationCounts = new Map()
  const hostInnerOperationCounts = new Map()
  const hostInnerRoleCounts = new Map()
  const spaceInnerOperationCounts = new Map()
  const spaceInnerRoleCounts = new Map()
  const modulationProgramExamples = new Map()
  const modulationCueExamples = new Map()
  const hostExamples = new Map()

  const addExample = (map, key, example) => {
    const examples = map.get(key) ?? []
    if (examples.length < 5 && !examples.includes(example)) examples.push(example)
    map.set(key, examples)
  }

  for (const pattern of patterns) {
    for (const chain of pattern.chains) {
      for (const method of chain.methods) {
        increment(outerOperationCounts, method.name)
        increment(outerRoleCounts, roleForOperation(method.name))
      }

      for (const argumentProgram of chain.constructionMethod.argumentPrograms) {
        const example = `${pattern.id}:${chain.id}:${argumentProgram.hostOp}`
        increment(argumentSpaceCounts, argumentProgram.space)
        addExample(hostExamples, argumentProgram.hostOp, `${pattern.id}:${chain.id}`)

        const isModulationSpace = argumentProgram.space.includes('modulation')
        if (isModulationSpace) {
          increment(modulationHostCounts, argumentProgram.hostOp)
          for (const cue of argumentProgram.fieldCues) {
            increment(modulationFieldCueCounts, cue)
            addExample(modulationCueExamples, cue, example)
          }
        }

        for (const program of argumentProgram.programs) {
          if (isModulationSpace) {
            increment(modulationRootCounts, program.root)
            increment(modulationProgramCounts, program.signature)
            addExample(modulationProgramExamples, program.signature, example)
          }

          for (const op of program.operations) {
            incrementNestedMap(hostInnerOperationCounts, argumentProgram.hostOp, op)
            incrementNestedMap(spaceInnerOperationCounts, argumentProgram.space, op)
            if (isModulationSpace) {
              increment(modulationInnerOperationCounts, op)
            } else {
              increment(nonModulationInnerOperationCounts, op)
            }
          }
          for (const role of program.operationRoles) {
            incrementNestedMap(hostInnerRoleCounts, argumentProgram.hostOp, role)
            incrementNestedMap(spaceInnerRoleCounts, argumentProgram.space, role)
            if (isModulationSpace) increment(modulationInnerRoleCounts, role)
          }
        }
      }
    }
  }

  const examplesFor = (map) => Object.fromEntries([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])))

  return {
    outerOperationCounts: objectFromMap(outerOperationCounts),
    outerRoleCounts: objectFromMap(outerRoleCounts),
    argumentSpaceCounts: objectFromMap(argumentSpaceCounts),
    modulationHostCounts: objectFromMap(modulationHostCounts),
    modulationFieldCueCounts: objectFromMap(modulationFieldCueCounts),
    modulationRootCounts: objectFromMap(modulationRootCounts),
    modulationProgramCounts: objectFromMap(modulationProgramCounts),
    modulationInnerOperationCounts: objectFromMap(modulationInnerOperationCounts),
    modulationInnerRoleCounts: objectFromMap(modulationInnerRoleCounts),
    nonModulationInnerOperationCounts: objectFromMap(nonModulationInnerOperationCounts),
    hostInnerOperationCounts: objectFromNestedMap(hostInnerOperationCounts),
    hostInnerRoleCounts: objectFromNestedMap(hostInnerRoleCounts),
    spaceInnerOperationCounts: objectFromNestedMap(spaceInnerOperationCounts),
    spaceInnerRoleCounts: objectFromNestedMap(spaceInnerRoleCounts),
    modulationProgramExamples: examplesFor(modulationProgramExamples),
    modulationCueExamples: examplesFor(modulationCueExamples),
    hostExamples: examplesFor(hostExamples)
  }
}

const CONTEXTUAL_OPERATION_VOCABULARY = [
  ['uv-displacement-field', 'Operations inside `modulate(...)` texture arguments.', '`color`, `brightness`, `pixelate`, and friends shape a UV offset field, often encoded through red/green channels.'],
  ['geometry-modulation-field', 'Operations inside `modulateScale`, `modulateRotate`, and related arguments.', 'Texture values drive transform parameters rather than direct image color.'],
  ['chroma-modulation-field', 'Operations inside `modulateHue(...)` arguments.', 'Texture values shift color/hue relationships.'],
  ['feedback-accumulation-host', 'A top-level `layer`, `add`, or `blend` in a closed feedback chain.', 'New material is merged into live feedback memory.'],
  ['feedback-accumulation-input-material', 'Texture programs passed into `layer`, `add`, or `blend` on a closed feedback chain.', 'Material is built outside the memory path, then injected into the feedback accumulation.'],
  ['feedback-pre-accumulation-treatment', 'Top-level feedback-path operations before the first accumulation host.', 'Existing memory is prepared before new material is merged.'],
  ['feedback-post-accumulation-treatment', 'Top-level feedback-path operations after accumulation hosts.', 'The combined feedback result is displaced, colored, gated, or quantized before writeback.'],
  ['feedback-memory-treatment', 'Top-level operations on feedback memory with no detected accumulation host.', 'The loop edits its own memory directly.'],
  ['staged-feedback-accumulation-input-material', 'Texture programs feeding accumulation on a cross-buffer feedback read.', 'Material is added to a staged buffer pass rather than the same buffer.'],
  ['source-accumulation-input-material', 'Texture programs feeding accumulation on a generated source chain.', 'Material is assembled before being written as fresh buffer content.'],
  ['gate-mask-field', 'Texture programs passed into `mask`, `luma`, or `thresh` hosts.', 'Operations shape visibility, erosion, apertures, and hard gates.'],
  ['subtractive-comparison-input', 'Texture programs passed into `diff` or `sub` hosts.', 'Operations shape what is carved out or compared against.'],
  ['multiplicative-field', 'Texture programs passed into `mult` hosts.', 'Operations shape gain, contrast, or field multiplication.'],
  ['source-construction-treatment', 'Top-level operations on non-feedback source chains that write a buffer.', 'Generated material is styled before becoming buffer memory.']
]

const contextualMeaning = ({ context, op }) => {
  if (context === 'uv-displacement-field') {
    if (op === 'color') return 'encode or weight R/G displacement channels'
    if (op === 'brightness') return 'bias the displacement field'
    if (op === 'pixelate') return 'quantize displacement into cells or scan steps'
    if (op === 'scale') return 'set displacement field spatial scale'
    if (op === 'mask') return 'localize where displacement exists'
    if (op === 'thresh') return 'harden displacement regions'
  }
  if (context === 'geometry-modulation-field') {
    if (op === 'color') return 'encode transform-control values'
    if (op === 'pixelate') return 'step transform-control regions'
    if (op === 'brightness') return 'bias transform-control amount'
  }
  if (context.endsWith('accumulation-input-material')) {
    if (op === 'color') return 'choose visible injected material color'
    if (op === 'brightness') return 'tone the material before accumulation'
    if (op === 'pixelate') return 'make injected material grid/cell based'
    if (op === 'mask') return 'cut the injected material before merge'
    if (op === 'thresh') return 'gate the injected material before merge'
    if (op === 'scale') return 'place or size the injected material'
  }
  if (context.includes('feedback') && context.includes('treatment')) {
    if (op === 'color') return 'color the live feedback memory'
    if (op === 'brightness') return 'bias or decay live feedback memory'
    if (op === 'pixelate') return 'quantize live feedback memory'
    if (op === 'modulate') return 'displace live feedback memory'
    if (op === 'mask') return 'gate live feedback memory'
  }
  if (context === 'gate-mask-field') {
    if (op === 'color') return 'prepare mask-channel material'
    if (op === 'brightness') return 'bias mask strength'
    if (op === 'pixelate') return 'make the mask blocky or scan-stepped'
    if (op === 'thresh') return 'harden the mask boundary'
  }
  return ''
}

const summarizeContextualOperationMap = (patterns) => {
  const contextCounts = new Map()
  const contextOperationCounts = new Map()
  const operationContextCounts = new Map()
  const semanticOperationCounts = new Map()
  const semanticExamples = new Map()
  const focusedOperationContextCounts = new Map()
  const hostPathContextCounts = new Map()
  const argumentSemanticSpaceCounts = new Map()
  const operationMeaningCounts = new Map()
  const focusOps = new Set(['color', 'brightness', 'pixelate', 'scale', 'mask', 'thresh', 'modulate', 'add', 'blend', 'layer'])

  const addExample = (map, key, example) => {
    const examples = map.get(key) ?? []
    if (examples.length < 5 && !examples.includes(example)) examples.push(example)
    map.set(key, examples)
  }

  const recordOperation = ({ context, op, example }) => {
    increment(contextCounts, context)
    incrementNestedMap(contextOperationCounts, context, op)
    incrementNestedMap(operationContextCounts, op, context)
    increment(semanticOperationCounts, `${context}:${op}`)
    addExample(semanticExamples, `${context}:${op}`, example)
    if (focusOps.has(op)) incrementNestedMap(focusedOperationContextCounts, op, context)
    const meaning = contextualMeaning({ context, op })
    if (meaning) increment(operationMeaningCounts, `${op}: ${meaning}`)
  }

  for (const pattern of patterns) {
    for (const chain of pattern.chains) {
      const topology = chain.constructionMethod.topology
      const sourceRole = chain.constructionMethod.sourceRole
      for (let index = 0; index < chain.methods.length; index += 1) {
        const method = chain.methods[index]
        const context = topLevelSemanticSpace({ chain, method, index, topology, sourceRole })
        increment(hostPathContextCounts, context)
        recordOperation({
          context,
          op: method.name,
          example: `${pattern.id}:${chain.id}:${method.name}`
        })
      }

      for (const argumentProgram of chain.constructionMethod.argumentPrograms) {
        increment(argumentSemanticSpaceCounts, argumentProgram.semanticSpace)
        for (const program of argumentProgram.programs) {
          for (const op of program.operations) {
            recordOperation({
              context: argumentProgram.semanticSpace,
              op,
              example: `${pattern.id}:${chain.id}:${argumentProgram.hostOp}:${program.signature}`
            })
          }
        }
      }
    }
  }

  const examplesFor = (map) => Object.fromEntries([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])))

  return {
    vocabulary: CONTEXTUAL_OPERATION_VOCABULARY.map(([space, computerScience, graphics]) => ({
      space,
      computerScience,
      graphics
    })),
    contextCounts: objectFromMap(contextCounts),
    contextOperationCounts: objectFromNestedMap(contextOperationCounts),
    operationContextCounts: objectFromNestedMap(operationContextCounts),
    semanticOperationCounts: objectFromMap(semanticOperationCounts),
    focusedOperationContextCounts: objectFromNestedMap(focusedOperationContextCounts),
    hostPathContextCounts: objectFromMap(hostPathContextCounts),
    argumentSemanticSpaceCounts: objectFromMap(argumentSemanticSpaceCounts),
    operationMeaningCounts: objectFromMap(operationMeaningCounts),
    semanticExamples: examplesFor(semanticExamples)
  }
}

const FLOW_VOCABULARY = [
  ['closed-feedback-accumulation', 'Closed buffer loop with a top-level `layer`, `add`, or `blend` host.', 'Existing memory receives new material, then returns to the same buffer.'],
  ['masked-source-feedback-accumulation', 'Closed feedback accumulation whose injected material contains mask/luma/thresh gates.', 'A source/material path is shaped before being merged into feedback memory.'],
  ['uv-displaced-feedback', 'Feedback path uses `modulate(...)` with an embedded texture field.', 'Live memory is pushed by a UV displacement field, commonly R/G encoded.'],
  ['post-accumulation-feedback-treatment', 'Operations occur after the last accumulation host before writeback.', 'The merged feedback result is displaced, colored, gated, or quantized before becoming memory again.'],
  ['pre-accumulation-feedback-treatment', 'Operations occur before the first accumulation host.', 'Memory is prepared or distorted before new material enters.'],
  ['cross-buffer-staging', 'A chain reads one buffer and writes another.', 'Material moves through a staged pass rather than closing immediately on itself.'],
  ['source-buffer-construction', 'A non-buffer source writes into an output buffer.', 'Fresh generated material becomes buffer memory for later use.'],
  ['source-accumulation-construction', 'A generated source chain uses `layer`, `add`, or `blend` before writing.', 'Fresh material is assembled from several ingredients before becoming memory.'],
  ['subtractive-carve', 'A top-level `diff/sub` or embedded subtractive input participates in the chain.', 'A comparison field cuts edges, holes, silhouettes, or contrast pressure.'],
  ['gate-driven-selection', 'A top-level or embedded mask/luma/thresh path participates in the chain.', 'Visibility is controlled by gates, apertures, erosion, or threshold regions.'],
  ['geometry-parameter-modulation', 'An embedded field drives `modulateScale`, `modulateRotate`, or related geometry modulation.', 'Scale, rotation, scroll, or symmetry changes are field-dependent.'],
  ['chroma-field-modulation', 'An embedded field drives `modulateHue`.', 'Color relationships are displaced through a texture field.'],
  ['channel-staging', 'Channel methods `r/g/b` appear on a staged or material path.', 'Specific channels are extracted or recombined as material.']
]

const topologyFlowFamily = (topology) => {
  if (topology.startsWith('closed-feedback')) return 'closed-feedback-loop'
  if (topology.startsWith('cross-buffer')) return 'cross-buffer-stage'
  if (topology.startsWith('multi-read-write')) return 'multi-buffer-fusion'
  if (topology.startsWith('source-write')) return 'source-buffer-write'
  if (topology === 'read-transform-no-write') return 'read-transform'
  return 'source-transform'
}

const programHasAnyOperation = (argumentProgram, names) =>
  argumentProgram.programs.some((program) => program.operations.some((operation) => names.includes(operation)))

const summarizeArgumentProgramMaterials = (argumentPrograms) => {
  const roots = new Set()
  const roles = new Set()
  const cues = new Set()
  const operations = new Set()
  for (const argumentProgram of argumentPrograms) {
    for (const cue of argumentProgram.fieldCues ?? []) cues.add(cue)
    for (const program of argumentProgram.programs) {
      roots.add(program.root)
      roles.add(program.rootRole)
      for (const operation of program.operations) operations.add(operation)
    }
  }
  return {
    roots: [...roots].sort(),
    roles: [...roles].sort(),
    cues: [...cues].sort(),
    operations: [...operations].sort()
  }
}

const analyzeFlow = (chain) => {
  const topology = chain.constructionMethod.topology
  const topologyFamily = topologyFlowFamily(topology)
  const sourceRole = chain.constructionMethod.sourceRole
  const topLevel = chain.methods.map((method, index) => ({
    op: method.name,
    role: roleForOperation(method.name),
    context: topLevelSemanticSpace({ chain, method, index, topology, sourceRole })
  }))
  const argumentPrograms = chain.constructionMethod.argumentPrograms
  const accumulationInputs = argumentPrograms.filter((program) => program.semanticSpace.endsWith('accumulation-input-material'))
  const uvFields = argumentPrograms.filter((program) => program.semanticSpace === 'uv-displacement-field')
  const geometryFields = argumentPrograms.filter((program) => program.semanticSpace === 'geometry-modulation-field')
  const chromaFields = argumentPrograms.filter((program) => program.semanticSpace === 'chroma-modulation-field')
  const gateFields = argumentPrograms.filter((program) => program.semanticSpace === 'gate-mask-field')
  const subtractiveInputs = argumentPrograms.filter((program) => program.semanticSpace === 'subtractive-comparison-input')
  const hasAccumulationHost = topLevel.some((method) => method.role === 'accumulate')
  const hasTopLevelGate = topLevel.some((method) => method.role === 'gate')
  const hasTopLevelSubtract = topLevel.some((method) => method.role === 'subtract')
  const hasChannel = topLevel.some((method) => method.role === 'channel') ||
    argumentPrograms.some((program) => programHasAnyOperation(program, ['r', 'g', 'b']))
  const hasMaskedAccumulationInput = accumulationInputs.some((program) =>
    program.semanticSpace.includes('accumulation-input') && programHasAnyOperation(program, ['mask', 'luma', 'thresh'])
  )
  const hasPreAccumulationTreatment = topLevel.some((method) => method.context === 'feedback-pre-accumulation-treatment')
  const hasPostAccumulationTreatment = topLevel.some((method) => method.context === 'feedback-post-accumulation-treatment')
  const hasBetweenAccumulationTreatment = topLevel.some((method) => method.context === 'feedback-between-accumulations-treatment')

  const tags = []
  if (topologyFamily === 'closed-feedback-loop' && hasAccumulationHost) tags.push('closed-feedback-accumulation')
  if (topologyFamily === 'closed-feedback-loop' && hasMaskedAccumulationInput) tags.push('masked-source-feedback-accumulation')
  if (topologyFamily === 'closed-feedback-loop' && uvFields.length > 0) tags.push('uv-displaced-feedback')
  if (hasPreAccumulationTreatment) tags.push('pre-accumulation-feedback-treatment')
  if (hasPostAccumulationTreatment) tags.push('post-accumulation-feedback-treatment')
  if (hasBetweenAccumulationTreatment) tags.push('between-accumulations-feedback-treatment')
  if (topologyFamily === 'cross-buffer-stage') tags.push('cross-buffer-staging')
  if (topologyFamily === 'multi-buffer-fusion') tags.push('multi-buffer-fusion')
  if (topologyFamily === 'source-buffer-write') tags.push('source-buffer-construction')
  if (topologyFamily === 'source-buffer-write' && hasAccumulationHost) tags.push('source-accumulation-construction')
  if (hasTopLevelSubtract || subtractiveInputs.length > 0) tags.push('subtractive-carve')
  if (hasTopLevelGate || gateFields.length > 0 || hasMaskedAccumulationInput) tags.push('gate-driven-selection')
  if (geometryFields.length > 0) tags.push('geometry-parameter-modulation')
  if (chromaFields.length > 0) tags.push('chroma-field-modulation')
  if (hasChannel) tags.push('channel-staging')
  if (uvFields.length > 0 && !tags.includes('uv-displaced-feedback')) tags.push('uv-displacement-field')

  const flowParts = [
    topologyFamily,
    sourceRole
  ]
  if (hasAccumulationHost) flowParts.push('accumulate')
  if (hasMaskedAccumulationInput) flowParts.push('masked-input')
  if (uvFields.length > 0) flowParts.push('uv-displace')
  if (geometryFields.length > 0) flowParts.push('geometry-modulate')
  if (chromaFields.length > 0) flowParts.push('chroma-modulate')
  if (hasTopLevelSubtract || subtractiveInputs.length > 0) flowParts.push('carve')
  if (hasTopLevelGate || gateFields.length > 0) flowParts.push('gate')
  flowParts.push(chain.writeTarget ? `write:${chain.writeTarget}` : 'no-write')

  return {
    topologyFamily,
    sourceRole,
    tags,
    signature: flowParts.join(' -> '),
    basePath: {
      topology,
      root: chain.root,
      sourceRole,
      topLevelRoleSequence: compressSequence(topLevel.map((method) => method.role)),
      topLevelContexts: compressSequence(topLevel.map((method) => method.context))
    },
    paths: {
      accumulationInputs: summarizeArgumentProgramMaterials(accumulationInputs),
      uvFields: summarizeArgumentProgramMaterials(uvFields),
      geometryFields: summarizeArgumentProgramMaterials(geometryFields),
      chromaFields: summarizeArgumentProgramMaterials(chromaFields),
      gateFields: summarizeArgumentProgramMaterials(gateFields),
      subtractiveInputs: summarizeArgumentProgramMaterials(subtractiveInputs)
    }
  }
}

const summarizeFlowGrammar = (patterns) => {
  const tagCounts = new Map()
  const signatureCounts = new Map()
  const topologyFamilyCounts = new Map()
  const tagExamples = new Map()
  const signatureExamples = new Map()
  const tagCooccurrences = new Map()
  const pathMaterialCounts = new Map()

  const addExample = (map, key, example) => {
    const examples = map.get(key) ?? []
    if (examples.length < 5 && !examples.includes(example)) examples.push(example)
    map.set(key, examples)
  }

  for (const pattern of patterns) {
    for (const chain of pattern.chains) {
      const flow = chain.flow
      const example = `${pattern.id}:${chain.id}`
      increment(topologyFamilyCounts, flow.topologyFamily)
      increment(signatureCounts, flow.signature)
      addExample(signatureExamples, flow.signature, example)
      for (const tag of flow.tags) {
        increment(tagCounts, tag)
        addExample(tagExamples, tag, example)
      }
      for (let index = 0; index < flow.tags.length; index += 1) {
        for (let otherIndex = index + 1; otherIndex < flow.tags.length; otherIndex += 1) {
          increment(tagCooccurrences, `${flow.tags[index]} + ${flow.tags[otherIndex]}`)
        }
      }
      for (const [pathName, summary] of Object.entries(flow.paths)) {
        for (const role of summary.roles) incrementNestedMap(pathMaterialCounts, pathName, role)
        for (const cue of summary.cues) incrementNestedMap(pathMaterialCounts, pathName, cue)
      }
    }
  }

  const examplesFor = (map) => Object.fromEntries([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])))

  return {
    vocabulary: FLOW_VOCABULARY.map(([flow, computerScience, graphics]) => ({ flow, computerScience, graphics })),
    topologyFamilyCounts: objectFromMap(topologyFamilyCounts),
    tagCounts: objectFromMap(tagCounts),
    signatureCounts: objectFromMap(signatureCounts),
    tagCooccurrences: objectFromMap(tagCooccurrences),
    pathMaterialCounts: objectFromNestedMap(pathMaterialCounts),
    tagExamples: examplesFor(tagExamples),
    signatureExamples: examplesFor(signatureExamples)
  }
}

const SIGNAL_TYPE_VOCABULARY = [
  ['ControlSignal', 'Numeric/time/random/aspect parameters.', '`time`, `width`, `height`, `A`, `B`, `TAU`, stochastic helpers, and constants tune modules without being images.'],
  ['MemorySignal', 'A readable/writable Hydra buffer signal.', '`src(o0)` and `out(o0)` form video memory and feedback state.'],
  ['MaterialSignal', 'Visible image/material signal.', 'Color, texture, geometry, noise, wave, or buffer material that can be seen or injected.'],
  ['MaskSignal', 'Visibility/selection signal.', 'A gate, matte, threshold, aperture, or erosion field.'],
  ['MaskedMaterialSignal', 'Material already shaped by a mask.', 'Injectable source/material with visibility constraints applied.'],
  ['UVFieldSignal', 'Coordinate-displacement field.', 'Usually red/green encoded field used by `modulate(...)` to push image coordinates.'],
  ['TransformFieldSignal', 'Field controlling transform parameters.', 'Texture values driving scale, rotation, scroll, kaleid, or geometric drift.'],
  ['ChromaFieldSignal', 'Field controlling color/hue modulation.', 'Texture values used by `modulateHue(...)` or related color displacement.'],
  ['ComparisonSignal', 'Field used for carving or comparison.', 'Input to `diff`/`sub` that removes, outlines, or contrasts.'],
  ['ScalarFieldSignal', 'Gain/intensity/amount field.', 'Input to `mult` or scalar-like parameter modulation.'],
  ['AccumulatedSignal', 'Result of combining base path plus injected material.', 'Layered, added, or blended signal before later treatment/writeback.'],
  ['DisplacedSignal', 'Signal after UV displacement.', 'Image/memory after coordinate deformation.'],
  ['ConditionedSignal', 'Signal after non-structural shaping.', 'Tone/layout/chroma/quantization treatment whose meaning depends on context.'],
  ['CarvedSignal', 'Signal after subtractive comparison.', 'Material or memory with edges/voids/contrast carved out.'],
  ['ChannelSignal', 'Extracted or packed channel signal.', 'R/G/B channel material used visibly, as a field, or for staging.']
]

const MODULE_VOCABULARY = [
  ['ControlSource', 'Emits control/parameter signals.', 'Supplies timing, randomness, aspect normalization, and constants.'],
  ['BufferRead', 'Reads a Hydra output buffer.', 'Turns memory into an editable signal.'],
  ['BufferWrite', 'Writes a signal to a Hydra output buffer.', 'Commits current signal as memory/render target.'],
  ['GeneratorSource', 'Creates a raw visual/field source.', '`osc`, `noise`, `shape`, `solid`, `gradient`, and helpers produce material/field starts.'],
  ['MaterialBuilder', 'Builds visible or injectable material.', 'Shapes color/texture/geometry before it is seen or accumulated.'],
  ['MaskBuilder', 'Builds a mask/gate field.', 'Produces selection, aperture, threshold, erosion, or visibility signal.'],
  ['VectorFieldBuilder', 'Builds a UV displacement field.', 'Produces R/G-like coordinate offsets for `modulate(...)`.'],
  ['TransformFieldBuilder', 'Builds a transform-control field.', 'Produces scale/rotation/scroll/kaleid control textures.'],
  ['ChromaFieldBuilder', 'Builds a hue/color modulation field.', 'Produces color-displacement control textures.'],
  ['AccumulatorMixer', 'Combines base signal with injected material.', '`layer`, `add`, and `blend` as modular mixer/accumulator hosts.'],
  ['Displacer', 'Applies a UV field to a base signal.', '`modulate(...)` as coordinate displacement.'],
  ['TransformModulator', 'Applies field-driven geometric transform.', '`modulateScale`, `modulateRotate`, scroll modulation, and related hosts.'],
  ['ChromaModulator', 'Applies field-driven hue/color modulation.', '`modulateHue(...)` as color-space displacement.'],
  ['GateApplier', 'Applies a mask/gate to a signal.', '`mask`, `luma`, and `thresh` as visibility control.'],
  ['ComparatorCarver', 'Carves or compares with another signal.', '`diff` and `sub` as subtractive/comparison modules.'],
  ['Multiplier', 'Multiplies by material/scalar field.', '`mult` as gain, contrast, or field multiplication.'],
  ['FeedbackConditioner', 'Treats live memory before/after accumulation.', 'Color, tone, quantization, layout, or displacement on the feedback path.'],
  ['FieldShaper', 'Reshapes a signal without changing its broad role.', '`scale`, `rotate`, `scroll`, `repeat`, `kaleid`, `pixelate`, `posterize`, tone/color operations in context.'],
  ['ChannelPackUnpack', 'Extracts or combines channels.', '`r`, `g`, `b`, color packing, and channel staging.']
]

const HYDRA_DSL_SIGNAL_SPEC = [
  {
    signal: 'ControlSignal',
    evidenceLevel: 'observed',
    hydraDsl: ['time', 'width', 'height', 'A', 'B', 'TAU', 'rn()', 'btw()', 'intgr()'],
    use: 'Parameterizes frequencies, thresholds, displacement amount, grid sizes, scale, scroll, blend strength, and aspect correction.'
  },
  {
    signal: 'MemorySignal',
    evidenceLevel: 'observed',
    hydraDsl: ['src(o0)', 'src(o1)', 'src(o2)', '.out()', '.out(o0)', '.out(o1)', '.out(o2)'],
    use: 'Readable/writable feedback and staging memory.'
  },
  {
    signal: 'MaterialSignal',
    evidenceLevel: 'observed',
    hydraDsl: ['osc(...)', 'noise(...)', 'noiseloop(...)', 'shape(...)', 'solid(...)', 'gradient()', 'src(oN)', '.color(...)', '.brightness(...)', '.pixelate(...)', '.scale(...)'],
    use: 'Visible or injectable image material.'
  },
  {
    signal: 'MaskSignal',
    evidenceLevel: 'observed',
    hydraDsl: ['shape(...).thresh(...)', 'noise(...).thresh(...)', 'osc(...).thresh(...)', '.mask(...)', '.luma(...)'],
    use: 'Visibility, aperture, matte, threshold, and erosion logic.'
  },
  {
    signal: 'MaskedMaterialSignal',
    evidenceLevel: 'observed',
    hydraDsl: ['material.mask(maskField)', 'shape(...).mask(noise(...))', 'solid().add(...).mask(shape(...))'],
    use: 'Injectable material after gate/mask shaping.'
  },
  {
    signal: 'UVFieldSignal',
    evidenceLevel: 'observed',
    hydraDsl: ['noise(...).color(1/width, 1/height)', 'gradient().color(2/width, 2/height)', 'solid().add(...).color(...)', '.pixelate(...).color(...)'],
    use: 'R/G-like coordinate offset field for `modulate(...)`.'
  },
  {
    signal: 'TransformFieldSignal',
    evidenceLevel: 'observed',
    hydraDsl: ['noise(...)', 'noiseloop(...).pixelate(...).thresh(...)', 'osc(...).scrollX(...).pixelate(...)'],
    use: 'Texture field controlling scale, rotation, scroll, or kaleid modulation.'
  },
  {
    signal: 'ChromaFieldSignal',
    evidenceLevel: 'observed',
    hydraDsl: ['src(oN)', 'gradient(...).rotate(...)', 'noise(...).pixelate(...)'],
    use: 'Field used by `modulateHue(...)` and color displacement.'
  },
  {
    signal: 'ComparisonSignal',
    evidenceLevel: 'observed',
    hydraDsl: ['.diff(shape(...))', '.diff(noise(...))', '.sub(...)'],
    use: 'Carving/comparison input for edge pressure, voids, and silhouettes.'
  },
  {
    signal: 'ScalarFieldSignal',
    evidenceLevel: 'observed',
    hydraDsl: ['.mult(noise(...))', '.mult(gradient(...))', '.mult(shape(...))'],
    use: 'Gain, attenuation, contrast, or scalar-like field multiplication.'
  },
  {
    signal: 'AccumulatedSignal',
    evidenceLevel: 'observed',
    hydraDsl: ['base.layer(material)', 'base.add(material, amount)', 'base.blend(material, amount)'],
    use: 'Base signal after material has been injected by an accumulator/mixer.'
  },
  {
    signal: 'DisplacedSignal',
    evidenceLevel: 'observed',
    hydraDsl: ['base.modulate(uvField, amount)'],
    use: 'Base/material/memory after UV coordinate displacement.'
  },
  {
    signal: 'ConditionedSignal',
    evidenceLevel: 'observed',
    hydraDsl: ['signal.brightness(...)', 'signal.color(...)', 'signal.pixelate(...)', 'signal.modulateScale(...)'],
    use: 'Signal after contextual treatment, often feedback or transform conditioning.'
  },
  {
    signal: 'CarvedSignal',
    evidenceLevel: 'observed',
    hydraDsl: ['signal.diff(comparisonField)', 'signal.sub(comparisonField)'],
    use: 'Signal after subtractive comparison/carving.'
  },
  {
    signal: 'ChannelSignal',
    evidenceLevel: 'observed',
    hydraDsl: ['.r()', '.g()', '.b()', '.color(r, g, b)'],
    use: 'Channel extraction, recombination, staging, or field packing.'
  }
]

const HYDRA_DSL_MODULE_SPEC = [
  {
    module: 'ControlSource',
    evidenceLevel: 'observed',
    observedDsl: ['time', 'width', 'height', 'A', 'B', 'TAU', 'rn()', 'btw()', 'intgr()', 'chc()', 'pick()'],
    possibleHydraForms: ['const A = width > height ? height / width : 1', 'noise(btw(...), rn(...))', 'shape(intgr(...), ...)', '.color(1/width, 1/height)'],
    responsibility: 'Tune modules without directly producing pixels.',
    generationUse: 'Keep controls attached to module parameters, not as free-floating decoration.'
  },
  {
    module: 'BufferRead',
    evidenceLevel: 'observed',
    observedDsl: ['src(o0)', 'src(o1)', 'src(o2)'],
    possibleHydraForms: ['src(o0)', 'src(o1).b()', 'src(o2).scale(...)'],
    responsibility: 'Read memory or staged buffers into the graph.',
    generationUse: 'Use for feedback or routing only when the graph has a matching BufferWrite/staging intent.'
  },
  {
    module: 'BufferWrite',
    evidenceLevel: 'observed',
    observedDsl: ['.out()', '.out(o0)', '.out(o1)', '.out(o2)', '.out(o3)', '.out(o4)'],
    possibleHydraForms: ['... .out()', '... .out(o1)', 'render(o2)'],
    responsibility: 'Commit the graph output to memory/render target.',
    generationUse: 'Close feedback by writing to the same buffer read, or stage intentionally into another buffer.'
  },
  {
    module: 'GeneratorSource',
    evidenceLevel: 'observed',
    observedDsl: ['osc(...)', 'noise(...)', 'noiseloop(...)', 'ns(...)', 'nstpx(...)', 'shape(...)', 'solid(...)', 'gradient()'],
    possibleHydraForms: ['osc(freq, sync, offset)', 'noise(freq, speed)', 'shape(sides, radius, smoothing)', 'solid(r, g, b)', 'gradient().brightness(...)'],
    responsibility: 'Create raw material, mask, comparison, or field starts.',
    generationUse: 'Do not decide its meaning at root time; decide by the receiving module port.'
  },
  {
    module: 'MaterialBuilder',
    evidenceLevel: 'observed',
    observedDsl: ['.color(...)', '.brightness(...)', '.contrast(...)', '.scale(...)', '.rotate(...)', '.repeat(...)', '.kaleid(...)', '.pixelate(...)', '.posterize(...)'],
    possibleHydraForms: ['osc(...).color(...).scale(...)', 'solid().add(osc(...), amount)', 'shape(...).scale(...).repeat(...)'],
    responsibility: 'Build visible/injectable material before accumulation or staging.',
    generationUse: 'Use as an input material path to AccumulatorMixer or BufferWrite.'
  },
  {
    module: 'MaskBuilder',
    evidenceLevel: 'observed',
    observedDsl: ['shape(...).mask(...)', 'noise(...).thresh(...)', 'osc(...).thresh(...)', '.luma(...)', '.mask(...)'],
    possibleHydraForms: ['shape(...).modulateScale(noise(...)).thresh(...)', 'material.mask(shape(...))', 'noise(...).pixelate(...).thresh(...)'],
    responsibility: 'Create masks, gates, mattes, and masked material.',
    generationUse: 'Use on material inputs before AccumulatorMixer, or feed GateApplier as a MaskSignal.'
  },
  {
    module: 'VectorFieldBuilder',
    evidenceLevel: 'observed',
    observedDsl: ['noise(...).color(1/width, 1/height)', 'gradient().color(2/width, 2/height)', 'solid().add(noise(...).color(1, 0)).add(noise(...).color(0, 1))'],
    possibleHydraForms: ['field.color(xAmount/width, yAmount/height)', 'gradient().brightness(...).pixelate(...).color(.../width, .../height)', 'solid().add(xField.color(1,0)).add(yField.color(0,1))'],
    responsibility: 'Build R/G-like UV displacement fields.',
    generationUse: 'Feed only Displacer/`modulate` unless intentionally using nested field construction.'
  },
  {
    module: 'Displacer',
    evidenceLevel: 'observed',
    observedDsl: ['.modulate(field, amount)', '.modulate(gradient().color(2/width, 2/height), -2)'],
    possibleHydraForms: ['base.modulate(uvField, amount)', 'accumulated.modulate(vectorField, -1)', 'memory.modulate(maskedVectorField, amount)'],
    responsibility: 'Apply UVFieldSignal to a base Material/Memory/Accumulated signal.',
    generationUse: 'Keep the displacement field as a separate module from the displaced image.'
  },
  {
    module: 'TransformFieldBuilder',
    evidenceLevel: 'observed',
    observedDsl: ['noise(...)', 'noiseloop(...).pixelate(...).thresh(...)', 'osc(...).scrollX(...).pixelate(...)'],
    possibleHydraForms: ['noise(...).pixelate(...).thresh(...)', 'osc(...).rotate(...).kaleid(...)'],
    responsibility: 'Build texture fields for scale/rotate/scroll/kaleid parameter modulation.',
    generationUse: 'Feed TransformModulator ports, not the visible material port.'
  },
  {
    module: 'TransformModulator',
    evidenceLevel: 'observed',
    observedDsl: ['.modulateScale(field, amount)', '.modulateRotate(field, amount)', '.modulateScrollX(field, amount)', '.modulateScrollY(field, amount)', '.modulateKaleid(field, amount)'],
    possibleHydraForms: ['base.modulateScale(transformField, amount)', 'base.modulateRotate(noise(...), amount)'],
    responsibility: 'Apply field-driven geometric parameter changes.',
    generationUse: 'Use when the graph needs scale/rotation/scroll drift rather than direct UV displacement.'
  },
  {
    module: 'ChromaFieldBuilder',
    evidenceLevel: 'observed',
    observedDsl: ['src(oN)', 'gradient().rotate(...)', 'noise(...).pixelate(...)'],
    possibleHydraForms: ['src(o1)', 'gradient().scale(...).rotate(...)'],
    responsibility: 'Build fields for hue/color modulation.',
    generationUse: 'Feed ChromaModulator/`modulateHue`.'
  },
  {
    module: 'ChromaModulator',
    evidenceLevel: 'observed',
    observedDsl: ['.modulateHue(field, amount)'],
    possibleHydraForms: ['base.modulateHue(src(o1), amount)', 'memory.modulateHue(chromaField, amount)'],
    responsibility: 'Apply hue/color field modulation.',
    generationUse: 'Keep separate from visible `color()` material styling.'
  },
  {
    module: 'AccumulatorMixer',
    evidenceLevel: 'observed',
    observedDsl: ['.layer(material)', '.add(material, amount)', '.blend(material, amount)'],
    possibleHydraForms: ['src(o0).layer(maskedMaterial)', 'memory.add(material, amount)', 'base.blend(src(o1), amount)'],
    responsibility: 'Combine a base signal with injected material.',
    generationUse: 'Use with explicit base and material ports; accumulation is not just a chain method.'
  },
  {
    module: 'FeedbackConditioner',
    evidenceLevel: 'observed',
    observedDsl: ['src(o0).brightness(...)', 'src(o0).color(...)', 'src(o0).pixelate(...)', 'accumulated.contrast(...)', 'accumulated.modulate(...)'],
    possibleHydraForms: ['memory.brightness(decay)', 'memory.color(...)', 'accumulated.pixelate(...)'],
    responsibility: 'Treat live memory before, between, or after accumulation.',
    generationUse: 'Use to shape temporal behavior, not as generic visual polish.'
  },
  {
    module: 'ComparatorCarver',
    evidenceLevel: 'observed',
    observedDsl: ['.diff(field)', '.sub(field)'],
    possibleHydraForms: ['base.diff(shape(...))', 'material.diff(noise(...).thresh(...))', 'memory.sub(comparisonField)'],
    responsibility: 'Carve, compare, edge, or subtract signal pressure.',
    generationUse: 'Use as a comparison circuit, especially before/after modulation or accumulation.'
  },
  {
    module: 'GateApplier',
    evidenceLevel: 'observed',
    observedDsl: ['.mask(maskSignal)', '.luma(...)', '.thresh(...)'],
    possibleHydraForms: ['material.mask(maskField)', 'memory.luma(threshold, tolerance)', 'field.thresh(threshold, tolerance)'],
    responsibility: 'Apply visibility selection to an existing signal.',
    generationUse: 'Distinguish from MaskBuilder: builder creates mask; applier applies it.'
  },
  {
    module: 'Multiplier',
    evidenceLevel: 'observed',
    observedDsl: ['.mult(field, amount)'],
    possibleHydraForms: ['base.mult(noise(...), amount)', 'field.mult(gradient(...), amount)'],
    responsibility: 'Apply gain, attenuation, or multiplicative field interaction.',
    generationUse: 'Use for field strength/contrast, not as generic accumulation.'
  },
  {
    module: 'FieldShaper',
    evidenceLevel: 'observed',
    observedDsl: ['.scale(...)', '.rotate(...)', '.scroll(...)', '.repeat(...)', '.kaleid(...)', '.pixelate(...)', '.posterize(...)', '.brightness(...)', '.contrast(...)', '.color(...)'],
    possibleHydraForms: ['signal.scale(...).rotate(...)', 'field.pixelate(...).thresh(...)', 'material.kaleid(...).repeat(...)'],
    responsibility: 'Reshape a signal while preserving its current broad role.',
    generationUse: 'Meaning depends on signal type: `pixelate(UVField)` differs from `pixelate(Material)`.'
  },
  {
    module: 'ChannelPackUnpack',
    evidenceLevel: 'observed',
    observedDsl: ['.r()', '.g()', '.b()', '.color(r, g, b)'],
    possibleHydraForms: ['src(o0).b()', 'signal.r()', 'solid().add(x.color(1,0)).add(y.color(0,1))'],
    responsibility: 'Extract, stage, or encode channels.',
    generationUse: 'Use for RGB recombination or R/G vector packing when evidence supports it.'
  }
]

const HYDRA_DSL_CIRCUIT_SPEC = [
  {
    circuit: 'feedback-accumulator-circuit',
    evidenceLevel: 'observed',
    hydraDsl: 'src(oN).layer(material).out(oN)',
    template: 'BufferRead -> AccumulatorMixer(material:MaterialBuilder|MaskBuilder) -> BufferWrite',
    possibility: 'Use `layer/add/blend` to inject material into live memory.'
  },
  {
    circuit: 'masked-material-injection-circuit',
    evidenceLevel: 'observed',
    hydraDsl: 'src(oN).layer(sourceMaterial.mask(maskField)).out(oN)',
    template: 'MaterialBuilder + MaskBuilder -> AccumulatorMixer(material)',
    possibility: 'Shape material before it enters feedback accumulation.'
  },
  {
    circuit: 'uv-displacement-circuit',
    evidenceLevel: 'observed',
    hydraDsl: 'base.modulate(vectorField.color(x/width, y/height), amount)',
    template: 'VectorFieldBuilder -> Displacer(uv-field)',
    possibility: 'Build R/G displacement fields separately from the image being displaced.'
  },
  {
    circuit: 'transform-field-circuit',
    evidenceLevel: 'observed',
    hydraDsl: 'base.modulateScale(field, amount).modulateRotate(field, amount)',
    template: 'TransformFieldBuilder -> TransformModulator(transform-field)',
    possibility: 'Use fields to steer transform parameters.'
  },
  {
    circuit: 'gate-selection-circuit',
    evidenceLevel: 'observed',
    hydraDsl: 'signal.mask(maskField).thresh(...)',
    template: 'MaskBuilder -> GateApplier(mask)',
    possibility: 'Use hard/soft selection, erosion, apertures, and thresholded gates.'
  },
  {
    circuit: 'carve-comparison-circuit',
    evidenceLevel: 'observed',
    hydraDsl: 'signal.diff(comparisonField)',
    template: 'ComparisonSignal -> ComparatorCarver(comparison)',
    possibility: 'Create edge pressure, voids, silhouettes, and contrast cuts.'
  },
  {
    circuit: 'buffer-routing-circuit',
    evidenceLevel: 'observed',
    hydraDsl: 'source.out(o1); src(o1).layer(...).out(o0)',
    template: 'BufferWrite(o1) -> BufferRead(o1) -> downstream module',
    possibility: 'Stage material or fields in one buffer before mixing into another.'
  },
  {
    circuit: 'channel-routing-circuit',
    evidenceLevel: 'observed',
    hydraDsl: 'src(oN).r() / .g() / .b() / .color(...)',
    template: 'ChannelPackUnpack -> material or field port',
    possibility: 'Extract/repack channels for RGB logic or vector-field encoding.'
  }
]

const signalTypeForRoot = (root, args = '') => {
  if (root === 'src') return /\bo\d+\b/u.test(args) ? 'MemorySignal' : 'MaterialSignal'
  if (root === 'shape') return 'MaskSignal'
  if (['noise', 'noiseloop', 'ns', 'nsloop', 'nst', 'nstpx', 'nspx', 'voronoi'].includes(root)) return 'MaterialSignal'
  return 'MaterialSignal'
}

const moduleForRoot = (root) => root === 'src' ? 'BufferRead' : 'GeneratorSource'

const signalTypeForArgumentSpace = (semanticSpace) => {
  if (semanticSpace === 'uv-displacement-field') return 'UVFieldSignal'
  if (semanticSpace === 'geometry-modulation-field') return 'TransformFieldSignal'
  if (semanticSpace === 'chroma-modulation-field') return 'ChromaFieldSignal'
  if (semanticSpace === 'gate-mask-field') return 'MaskSignal'
  if (semanticSpace === 'subtractive-comparison-input') return 'ComparisonSignal'
  if (semanticSpace === 'multiplicative-field') return 'ScalarFieldSignal'
  if (semanticSpace.endsWith('accumulation-input-material')) return 'MaterialSignal'
  return 'MaterialSignal'
}

const moduleForArgumentSpace = (semanticSpace, argumentProgram) => {
  if (semanticSpace === 'uv-displacement-field') return 'VectorFieldBuilder'
  if (semanticSpace === 'geometry-modulation-field') return 'TransformFieldBuilder'
  if (semanticSpace === 'chroma-modulation-field') return 'ChromaFieldBuilder'
  if (semanticSpace === 'gate-mask-field') return 'MaskBuilder'
  if (semanticSpace === 'subtractive-comparison-input') return 'ComparatorCarver'
  if (semanticSpace === 'multiplicative-field') return 'Multiplier'
  if (semanticSpace.endsWith('accumulation-input-material')) {
    return programHasAnyOperation(argumentProgram, ['mask', 'luma', 'thresh']) ? 'MaskBuilder' : 'MaterialBuilder'
  }
  return 'MaterialBuilder'
}

const moduleForTopLevelMethod = ({ method, context }) => {
  const role = roleForOperation(method.name)
  if (role === 'write') return 'BufferWrite'
  if (role === 'accumulate') return 'AccumulatorMixer'
  if (role === 'displace') return 'Displacer'
  if (role === 'geometry-modulate') return 'TransformModulator'
  if (role === 'chroma-modulate') return 'ChromaModulator'
  if (role === 'gate') return 'GateApplier'
  if (role === 'subtract') return 'ComparatorCarver'
  if (role === 'multiply') return 'Multiplier'
  if (role === 'channel') return 'ChannelPackUnpack'
  if (context.includes('feedback') && context.includes('treatment')) return 'FeedbackConditioner'
  return 'FieldShaper'
}

const outputSignalForTopLevelMethod = ({ method, context, previousSignal }) => {
  const role = roleForOperation(method.name)
  if (role === 'write') return 'MemorySignal'
  if (role === 'accumulate') return 'AccumulatedSignal'
  if (role === 'displace') return 'DisplacedSignal'
  if (role === 'geometry-modulate' || role === 'chroma-modulate') return 'ConditionedSignal'
  if (role === 'gate') return 'MaskedMaterialSignal'
  if (role === 'subtract') return 'CarvedSignal'
  if (role === 'channel') return 'ChannelSignal'
  if (context.includes('feedback') && context.includes('treatment')) return 'ConditionedSignal'
  return previousSignal === 'MemorySignal' ? 'ConditionedSignal' : 'MaterialSignal'
}

const portForHostRole = (hostRole) => {
  if (hostRole === 'accumulate') return 'material'
  if (hostRole === 'displace') return 'uv-field'
  if (hostRole === 'geometry-modulate') return 'transform-field'
  if (hostRole === 'chroma-modulate') return 'chroma-field'
  if (hostRole === 'gate') return 'mask'
  if (hostRole === 'subtract') return 'comparison'
  if (hostRole === 'multiply') return 'scalar-field'
  return 'aux'
}

const extractControlSignals = (text) => {
  const controls = new Set()
  for (const symbol of ['width', 'height', 'A', 'B', 'TAU', 'time', 'mouse', 'speed', 'bpm']) {
    if (new RegExp(`\\b${symbol}\\b`, 'u').test(text)) controls.add(symbol)
  }
  for (const helper of ['rn', 'btw', 'intgr', 'chc', 'maybe', 'pick']) {
    if (new RegExp(`\\b${helper}\\s*\\(`, 'u').test(text)) controls.add(`${helper}()`)
  }
  return [...controls].sort()
}

const circuitTagsForSignalFlow = (chain) => {
  const tags = []
  const flowTags = new Set(chain.flow.tags)
  if (flowTags.has('closed-feedback-accumulation')) tags.push('feedback-accumulator-circuit')
  if (flowTags.has('masked-source-feedback-accumulation')) tags.push('masked-material-injection-circuit')
  if (flowTags.has('uv-displaced-feedback') || flowTags.has('uv-displacement-field')) tags.push('uv-displacement-circuit')
  if (flowTags.has('geometry-parameter-modulation')) tags.push('transform-field-circuit')
  if (flowTags.has('chroma-field-modulation')) tags.push('chroma-field-circuit')
  if (flowTags.has('cross-buffer-staging')) tags.push('buffer-routing-circuit')
  if (flowTags.has('source-buffer-construction')) tags.push('source-construction-circuit')
  if (flowTags.has('subtractive-carve')) tags.push('carve-comparison-circuit')
  if (flowTags.has('gate-driven-selection')) tags.push('gate-selection-circuit')
  if (flowTags.has('channel-staging')) tags.push('channel-routing-circuit')
  return tags
}

const analyzeSignalFlowGraph = (chain) => {
  const nodes = []
  const edges = []
  const controls = extractControlSignals([
    chain.rootArgs,
    ...chain.methods.map((method) => method.args)
  ].join('\n'))
  const addNode = (partial) => {
    nodes.push(partial)
    return partial.id
  }
  const addEdge = ({ from, to, signal, port, relation }) => {
    edges.push({ from, to, signal, port, relation })
  }

  let currentNode = addNode({
    id: `${chain.id}_source`,
    module: moduleForRoot(chain.root),
    label: chain.root === 'src' ? `read ${chain.rootArgs || 'source'}` : chain.root,
    signalOut: signalTypeForRoot(chain.root, chain.rootArgs),
    evidence: chain.root === 'src' ? `src(${chain.rootArgs})` : `${chain.root}(...)`
  })
  let currentSignal = signalTypeForRoot(chain.root, chain.rootArgs)
  const signatureParts = [moduleForRoot(chain.root)]

  let controlNode = null
  if (controls.length > 0) {
    controlNode = addNode({
      id: `${chain.id}_control`,
      module: 'ControlSource',
      label: controls.join(', '),
      signalOut: 'ControlSignal',
      controls
    })
  }

  for (let index = 0; index < chain.methods.length; index += 1) {
    const method = chain.methods[index]
    const context = topLevelSemanticSpace({
      chain,
      method,
      index,
      topology: chain.constructionMethod.topology,
      sourceRole: chain.constructionMethod.sourceRole
    })
    const methodModule = moduleForTopLevelMethod({ method, context })
    const methodNode = addNode({
      id: `${chain.id}_op_${String(index + 1).padStart(2, '0')}`,
      module: methodModule,
      label: method.name,
      op: method.name,
      context,
      signalIn: currentSignal,
      signalOut: outputSignalForTopLevelMethod({ method, context, previousSignal: currentSignal })
    })

    addEdge({
      from: currentNode,
      to: methodNode,
      signal: currentSignal,
      port: 'base',
      relation: 'base-path'
    })

    const argumentProgram = chain.constructionMethod.argumentPrograms.find((program) => program.hostIndex === index)
    let signatureInput = ''
    if (argumentProgram) {
      const argumentModule = moduleForArgumentSpace(argumentProgram.semanticSpace, argumentProgram)
      const argumentPort = portForHostRole(argumentProgram.hostRole)
      const argNode = addNode({
        id: `${chain.id}_arg_${String(index + 1).padStart(2, '0')}`,
        module: argumentModule,
        label: `${argumentProgram.semanticSpace} -> ${method.name}`,
        hostOp: method.name,
        semanticSpace: argumentProgram.semanticSpace,
        signalOut: signalTypeForArgumentSpace(argumentProgram.semanticSpace),
        fieldCues: argumentProgram.fieldCues,
        roots: [...new Set(argumentProgram.programs.map((program) => program.root))].sort(),
        programSignatures: argumentProgram.programs.map((program) => program.signature)
      })

      addEdge({
        from: argNode,
        to: methodNode,
        signal: signalTypeForArgumentSpace(argumentProgram.semanticSpace),
        port: argumentPort,
        relation: 'argument-field'
      })
      signatureInput = `(${argumentPort}:${argumentModule})`

      if (controlNode && (argumentProgram.fieldCues ?? []).some((cue) => cue.includes('width') || cue.includes('height'))) {
        addEdge({
          from: controlNode,
          to: argNode,
          signal: 'ControlSignal',
          port: 'controls',
          relation: 'parameter-control'
        })
      }
    }

    if (controlNode && extractControlSignals(method.args).length > 0) {
      addEdge({
        from: controlNode,
        to: methodNode,
        signal: 'ControlSignal',
        port: 'controls',
        relation: 'parameter-control'
      })
    }

    signatureParts.push(`${methodModule}${signatureInput}`)
    currentNode = methodNode
    currentSignal = nodes.find((node) => node.id === methodNode)?.signalOut ?? currentSignal
  }

  return {
    signalTypes: [...new Set(nodes.map((node) => node.signalOut).filter(Boolean))].sort(),
    modules: [...new Set(nodes.map((node) => node.module))].sort(),
    controls,
    circuitTags: circuitTagsForSignalFlow(chain),
    signature: signatureParts.join(' -> '),
    nodes,
    edges
  }
}

const summarizeSignalFlowGraph = (patterns) => {
  const moduleCounts = new Map()
  const signalTypeCounts = new Map()
  const edgeCounts = new Map()
  const moduleConnectionCounts = new Map()
  const signalConnectionCounts = new Map()
  const graphSignatureCounts = new Map()
  const circuitCounts = new Map()
  const controlCounts = new Map()
  const circuitExamples = new Map()
  const graphSignatureExamples = new Map()

  const addExample = (map, key, example) => {
    const examples = map.get(key) ?? []
    if (examples.length < 5 && !examples.includes(example)) examples.push(example)
    map.set(key, examples)
  }

  for (const pattern of patterns) {
    for (const chain of pattern.chains) {
      const graph = chain.signalFlow
      const nodeById = new Map(graph.nodes.map((node) => [node.id, node]))
      const example = `${pattern.id}:${chain.id}`

      increment(graphSignatureCounts, graph.signature)
      addExample(graphSignatureExamples, graph.signature, example)
      for (const circuit of graph.circuitTags) {
        increment(circuitCounts, circuit)
        addExample(circuitExamples, circuit, example)
      }
      for (const control of graph.controls) increment(controlCounts, control)
      for (const node of graph.nodes) {
        increment(moduleCounts, node.module)
        if (node.signalOut) increment(signalTypeCounts, node.signalOut)
      }
      for (const edge of graph.edges) {
        const from = nodeById.get(edge.from)?.module ?? 'unknown'
        const to = nodeById.get(edge.to)?.module ?? 'unknown'
        increment(edgeCounts, `${edge.signal} -> ${edge.port}`)
        increment(moduleConnectionCounts, `${from} -> ${to}`)
        increment(signalConnectionCounts, `${edge.signal}: ${from} -> ${to}`)
      }
    }
  }

  const examplesFor = (map) => Object.fromEntries([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])))

  return {
    signalTypes: SIGNAL_TYPE_VOCABULARY.map(([type, computerScience, graphics]) => ({ type, computerScience, graphics })),
    modules: MODULE_VOCABULARY.map(([module, computerScience, graphics]) => ({ module, computerScience, graphics })),
    moduleCounts: objectFromMap(moduleCounts),
    signalTypeCounts: objectFromMap(signalTypeCounts),
    edgeCounts: objectFromMap(edgeCounts),
    moduleConnectionCounts: objectFromMap(moduleConnectionCounts),
    signalConnectionCounts: objectFromMap(signalConnectionCounts),
    graphSignatureCounts: objectFromMap(graphSignatureCounts),
    circuitCounts: objectFromMap(circuitCounts),
    controlCounts: objectFromMap(controlCounts),
    circuitExamples: examplesFor(circuitExamples),
    graphSignatureExamples: examplesFor(graphSignatureExamples)
  }
}

const chainSignature = (chain) => {
  const topOps = chain.methods.map((method) => method.name)
  return [chain.root, ...topOps].join(' > ')
}

const compactExpression = (value, max = 84) => {
  const text = value.replace(/\s+/gu, ' ').trim()
  return text.length > max ? `${text.slice(0, max - 1)}...` : text
}

const motifTaxonomy = [
  {
    id: 'feedback_memory',
    label: 'Feedback memory',
    description: 'Reads from o0 or writes back into a previously read output buffer.'
  },
  {
    id: 'multi_buffer_pipeline',
    label: 'Multi-buffer pipeline',
    description: 'Uses multiple output buffers as intermediate visual memory.'
  },
  {
    id: 'noise_vector_field',
    label: 'Noise vector field',
    description: 'Uses noise/noiseloop/ns as displacement, mask, or texture field.'
  },
  {
    id: 'mask_stack',
    label: 'Mask stack',
    description: 'Builds a result through repeated mask/luma/thresh gates.'
  },
  {
    id: 'pixel_grid_sampling',
    label: 'Pixel-grid sampling',
    description: 'Uses pixelate/repeat/width/height to create hard sampling grids.'
  },
  {
    id: 'scanline_axis_logic',
    label: 'Scanline axis logic',
    description: 'Uses full-width or full-height pixelation to isolate an axis.'
  },
  {
    id: 'subpixel_displacement',
    label: 'Subpixel displacement',
    description: 'Uses 1/width or 1/height as a normalized motion/color vector.'
  },
  {
    id: 'aspect_safe_geometry',
    label: 'Aspect-safe geometry',
    description: 'Uses A/B aspect factors to preserve shape or field proportions.'
  },
  {
    id: 'rgb_channel_logic',
    label: 'RGB channel logic',
    description: 'Separates or recombines color channels explicitly.'
  },
  {
    id: 'threshold_gate',
    label: 'Threshold gate',
    description: 'Uses thresholds/luma to create sparse binary gates.'
  },
  {
    id: 'temporal_motion',
    label: 'Temporal motion',
    description: 'Uses time, speed, callbacks, or oscillator velocity for ongoing motion.'
  },
  {
    id: 'kaleid_symmetry',
    label: 'Kaleid symmetry',
    description: 'Uses kaleid/modulateKaleid for mirrored radial structure.'
  },
  {
    id: 'stochastic_authoring',
    label: 'Stochastic authoring',
    description: 'Uses helper-randomized values as a composition method.'
  },
  {
    id: 'recursive_hue_drift',
    label: 'Recursive hue drift',
    description: 'Feeds hue/color changes through feedback buffers.'
  },
  {
    id: 'shape_lattice',
    label: 'Shape lattice',
    description: 'Repeats shape primitives into cell/grid/lattice structures.'
  },
  {
    id: 'capture_or_render_control',
    label: 'Capture/render control',
    description: 'Includes render(), screencap(), hush(), or runtime control calls.'
  }
]

const inferMotifs = (pattern) => {
  const code = pattern.cleanCode
  const motifs = new Set()
  const methodCounts = pattern.methodCounts
  const rootCounts = pattern.rootCounts
  const helperCounts = pattern.helperCounts
  const writeTargets = new Set(pattern.chains.flatMap((chain) => chain.writeTarget ? [chain.writeTarget] : []))
  const readTargets = new Set(pattern.chains.flatMap((chain) => chain.readBuffers))

  if (readTargets.has('o0') || [...writeTargets].some((target) => readTargets.has(target))) {
    motifs.add('feedback_memory')
  }
  if (writeTargets.size > 1 || readTargets.size > 1 || countRegex(code, /\bo[1-4]\b/gu) > 2) {
    motifs.add('multi_buffer_pipeline')
  }
  if ((rootCounts.noise ?? 0) + (rootCounts.noiseloop ?? 0) + (rootCounts.ns ?? 0) + (rootCounts.nsloop ?? 0) > 0 || /\bnoise(loop)?\s*\(/u.test(code)) {
    motifs.add('noise_vector_field')
  }
  if ((methodCounts.mask ?? 0) + (methodCounts.luma ?? 0) + (methodCounts.thresh ?? 0) >= 3) {
    motifs.add('mask_stack')
  }
  if ((methodCounts.pixelate ?? 0) > 0 || (methodCounts.repeat ?? 0) > 0 || /\bwidth\s*\/|\bheight\s*\//u.test(code)) {
    motifs.add('pixel_grid_sampling')
  }
  if (/pixelate\s*\(\s*(?:width|1)\s*,\s*(?:height|1)\s*\)/u.test(code) || /pixelate\s*\(\s*width\s*,\s*1\s*\)/u.test(code) || /pixelate\s*\(\s*1\s*,\s*height\s*\)/u.test(code)) {
    motifs.add('scanline_axis_logic')
  }
  if (/\b1\s*\/\s*width\b|\b1\s*\/\s*height\b|\b2\s*\/\s*width\b|\b2\s*\/\s*height\b/u.test(code)) {
    motifs.add('subpixel_displacement')
  }
  if (/\bA\b|\bB\b/u.test(code)) {
    motifs.add('aspect_safe_geometry')
  }
  if (/\.(?:r|g|b)\s*\(/u.test(code) || /color\s*\(\s*1\s*,\s*0\s*,?\s*0?\s*\)/u.test(code) || /color\s*\(\s*0\s*,\s*1\s*,?\s*0?\s*\)/u.test(code) || /color\s*\(\s*0\s*,\s*0\s*,\s*1\s*\)/u.test(code)) {
    motifs.add('rgb_channel_logic')
  }
  if ((methodCounts.thresh ?? 0) > 0 || (methodCounts.luma ?? 0) > 0) {
    motifs.add('threshold_gate')
  }
  if (/\btime\b|\bspeed\s*=|=>|function\b/u.test(code) || /\bosc\s*\([^)]*,\s*[-+]?(?:\d|\.)/u.test(code)) {
    motifs.add('temporal_motion')
  }
  if ((methodCounts.kaleid ?? 0) > 0 || (methodCounts.modulateKaleid ?? 0) > 0) {
    motifs.add('kaleid_symmetry')
  }
  if (Object.entries(helperCounts).some(([helper, count]) => count > 0 && !['A', 'B', 'TAU'].includes(helper))) {
    motifs.add('stochastic_authoring')
  }
  if ((methodCounts.modulateHue ?? 0) > 0 && (readTargets.has('o0') || /\bo0\b/u.test(code))) {
    motifs.add('recursive_hue_drift')
  }
  if ((rootCounts.shape ?? 0) > 0 && ((methodCounts.repeat ?? 0) > 0 || /\bwidth\s*\/|\bheight\s*\//u.test(code))) {
    motifs.add('shape_lattice')
  }
  if (pattern.controlCalls.length > 0) {
    motifs.add('capture_or_render_control')
  }

  return [...motifs].sort()
}

const buildFeatureVector = (pattern) => {
  const vector = new Map()
  for (const motif of pattern.motifs) increment(vector, `motif:${motif}`, 3)
  for (const [root, count] of Object.entries(pattern.rootCounts)) increment(vector, `root:${root}`, Math.min(count, 6) * 1.5)
  for (const [method, count] of Object.entries(pattern.methodCounts)) increment(vector, `op:${method}`, Math.min(count, 8))
  for (const chain of pattern.chains) {
    increment(vector, `chain-root:${chain.root}`, 2)
    increment(vector, `chain-prefix:${chain.methods.slice(0, 4).map((method) => method.name).join('>')}`, 2)
  }
  return vector
}

const cosineSimilarity = (a, b) => {
  let dot = 0
  let normA = 0
  let normB = 0
  for (const value of a.values()) normA += value * value
  for (const value of b.values()) normB += value * value
  for (const [key, value] of a.entries()) {
    dot += value * (b.get(key) ?? 0)
  }
  return dot === 0 ? 0 : dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

const mergeFeatureVectors = (vectors) => {
  const merged = new Map()
  for (const vector of vectors) {
    for (const [key, value] of vector.entries()) increment(merged, key, value)
  }
  return merged
}

const nameFamily = (patterns) => {
  const motifCounts = new Map()
  const rootCounts = new Map()
  const methodCounts = new Map()
  for (const pattern of patterns) {
    for (const motif of pattern.motifs) increment(motifCounts, motif)
    for (const [root, count] of Object.entries(pattern.rootCounts)) increment(rootCounts, root, count)
    for (const [method, count] of Object.entries(pattern.methodCounts)) increment(methodCounts, method, count)
  }

  const motifs = [...motifCounts.keys()]
  if (motifs.includes('shape_lattice') && motifs.includes('mask_stack')) return 'shape-mask-lattice'
  if (motifs.includes('shape_lattice')) return 'shape-lattice'
  if (motifs.includes('kaleid_symmetry') && motifs.includes('feedback_memory')) return 'feedback-kaleid'
  if (motifs.includes('kaleid_symmetry')) return 'kaleid-symmetry'
  if (motifs.includes('rgb_channel_logic') && motifs.includes('scanline_axis_logic')) return 'rgb-scanline'
  if (motifs.includes('rgb_channel_logic')) return 'rgb-channel-composite'
  if (motifs.includes('multi_buffer_pipeline') && motifs.includes('mask_stack')) return 'buffer-mask-pipeline'
  if (motifs.includes('recursive_hue_drift')) return 'recursive-hue-drift'
  if (motifs.includes('noise_vector_field') && motifs.includes('mask_stack')) return 'noise-mask-field'
  if (motifs.includes('subpixel_displacement') && motifs.includes('scanline_axis_logic')) return 'subpixel-scanline'
  if (motifs.includes('feedback_memory') && motifs.includes('mask_stack')) return 'feedback-mask-erosion'
  if (motifs.includes('feedback_memory') && motifs.includes('pixel_grid_sampling')) return 'feedback-pixel-grid'
  if (motifs.includes('noise_vector_field')) return 'noise-field-composition'
  const root = topEntries(rootCounts, 1)[0]?.[0] ?? 'mixed'
  const op = topEntries(methodCounts, 1)[0]?.[0] ?? 'chain'
  return `${root}-${op}`
}

const clusterPatterns = (patterns) => {
  const threshold = Number(readArg('clusterThreshold', '0.75'))
  const families = []

  for (const pattern of patterns) {
    let bestFamily = null
    let bestScore = 0
    for (const family of families) {
      const score = cosineSimilarity(pattern.featureVector, family.centroid)
      if (score > bestScore) {
        bestScore = score
        bestFamily = family
      }
    }
    if (!bestFamily || bestScore < threshold) {
      families.push({
        id: `family_${String(families.length + 1).padStart(2, '0')}`,
        patterns: [pattern],
        centroid: pattern.featureVector,
        maxJoinSimilarity: 1
      })
      continue
    }
    bestFamily.patterns.push(pattern)
    bestFamily.maxJoinSimilarity = Math.max(bestFamily.maxJoinSimilarity, bestScore)
    bestFamily.centroid = mergeFeatureVectors(bestFamily.patterns.map((item) => item.featureVector))
  }

  return families
    .map((family, index) => {
      const name = nameFamily(family.patterns)
      return {
        ...family,
        id: `family_${String(index + 1).padStart(2, '0')}_${name}`,
        name,
        size: family.patterns.length
      }
    })
    .sort((a, b) => b.size - a.size || a.id.localeCompare(b.id))
}

const detectVariationSeries = (patterns) => {
  const threshold = Number(readArg('seriesThreshold', '0.82'))
  const series = []
  let current = null

  for (let index = 1; index < patterns.length; index += 1) {
    const previous = patterns[index - 1]
    const pattern = patterns[index]
    const similarity = cosineSimilarity(previous.featureVector, pattern.featureVector)
    if (similarity >= threshold) {
      if (!current) {
        current = {
          id: `series_${String(series.length + 1).padStart(2, '0')}`,
          members: [previous],
          links: []
        }
      }
      if (current.members.at(-1)?.id !== previous.id) current.members.push(previous)
      current.members.push(pattern)
      current.links.push({
        from: previous.id,
        to: pattern.id,
        similarity: Number(similarity.toFixed(4))
      })
      continue
    }
    if (current) {
      series.push(current)
      current = null
    }
  }

  if (current) series.push(current)

  return series.map((item, index) => {
    const motifCounts = new Map()
    const methodCounts = new Map()
    for (const pattern of item.members) {
      for (const motif of pattern.motifs) increment(motifCounts, motif)
      for (const [method, count] of Object.entries(pattern.methodCounts)) increment(methodCounts, method, count)
    }
    return {
      ...item,
      id: `series_${String(index + 1).padStart(2, '0')}_${nameFamily(item.members)}`,
      topMotifs: Object.fromEntries(topEntries(motifCounts, 8)),
      topMethods: Object.fromEntries(topEntries(methodCounts, 12)),
      minSimilarity: Number(Math.min(...item.links.map((link) => link.similarity)).toFixed(4)),
      maxSimilarity: Number(Math.max(...item.links.map((link) => link.similarity)).toFixed(4))
    }
  })
}

const parseMarkdownInput = (inputPath) => {
  const text = readFileSync(inputPath, 'utf8')
  const sourceLine = /^Source:\s*(.+)$/mu.exec(text)?.[1]?.trim() ?? null
  const helperBlock = /## Global Helpers\s*\n\n```js\n([\s\S]*?)\n```/u.exec(text)?.[1] ?? ''
  const patternRegex = /^###\s+(pattern_\d+)[^\n]*\n\n```js\n([\s\S]*?)\n```/gmu
  const patterns = [...text.matchAll(patternRegex)].map((match, index) => ({
    id: match[1],
    title: match[0].split('\n', 1)[0].replace(/^###\s*/u, ''),
    order: index + 1,
    source: inputPath,
    code: match[2]
  }))
  return {
    sourceLine,
    helperBlock,
    patterns
  }
}

const parseDirectoryInput = (inputPath) => {
  const files = readdirSync(inputPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b))

  return {
    sourceLine: inputPath,
    helperBlock: '',
    patterns: files.map((fileName, index) => ({
      id: path.basename(fileName, '.js').replace(/[^A-Za-z0-9_-]+/gu, '_'),
      title: fileName,
      order: index + 1,
      source: path.join(inputPath, fileName),
      code: readFileSync(path.join(inputPath, fileName), 'utf8')
    }))
  }
}

const resolveInput = () => {
  const explicit = readArg('input')
  if (explicit) return path.resolve(explicit)

  const local = path.join(repoRoot, 'curated_hydra_patterns_no_external_media.md')
  if (existsSync(local)) return local

  const downloads = path.resolve(process.env.USERPROFILE ?? '', 'Downloads', 'curated_hydra_patterns_no_external_media.md')
  if (existsSync(downloads)) return downloads

  throw new Error('Missing input. Pass --input=<markdown-file-or-js-directory>.')
}

const analyzePattern = (entry) => {
  const cleanCode = stripComments(entry.code)
  const statements = splitStatements(entry.code)
  const chains = []
  const controlCalls = []
  const callCounts = new Map()
  const methodCounts = new Map()
  const rootCounts = new Map()
  const helperCounts = new Map()
  const primitiveAccumulator = createPrimitiveAccumulator()

  for (const name of extractAllCallNames(cleanCode)) increment(callCounts, name)
  for (const name of extractAllMethodNames(cleanCode)) increment(methodCounts, name)
  for (const helper of HELPERS) {
    const count = countRegex(cleanCode, new RegExp(`\\b${helper}\\b`, 'gu'))
    if (count > 0) helperCounts.set(helper, count)
  }

  for (const statement of statements) {
    const control = extractControlCall(statement)
    if (control) {
      controlCalls.push(control)
      continue
    }

    const rootCall = extractRootCall(statement)
    if (!rootCall) continue

    const methods = extractTopLevelMethods(statement, rootCall.rootEnd)
    increment(rootCounts, rootCall.root)
    const outMethod = [...methods].reverse().find((method) => method.name === 'out')
    const buffers = collectBuffers(statement)
    const writeTarget = outMethod ? normalizeOutputTarget(outMethod.args) : null
    const chain = {
      id: `${entry.id}_chain_${String(chains.length + 1).padStart(2, '0')}`,
      root: rootCall.root,
      rootArgs: compactExpression(rootCall.rootArgs),
      methodCount: methods.length,
      methods,
      topLevelOps: methods.map((method) => method.name),
      writeTarget,
      readBuffers: buffers.reads,
      referencedBuffers: buffers.references,
      signature: null,
      code: compactExpression(statement, 420)
    }
    chain.constructionMethod = analyzeConstructionMethod(chain)
    chain.flow = analyzeFlow(chain)
    chain.signalFlow = analyzeSignalFlowGraph(chain)
    chains.push(chain)
    recordPrimitiveVocabulary({ accumulator: primitiveAccumulator, chain })
  }

  for (const chain of chains) chain.signature = chainSignature(chain)

  const readBuffers = [...new Set(chains.flatMap((chain) => chain.readBuffers))].sort()
  const writeBuffers = [...new Set(chains.flatMap((chain) => chain.writeTarget ? [chain.writeTarget] : []))].sort()
  const numberLiterals = extractNumberLiterals(cleanCode)
  const pattern = {
    id: entry.id,
    title: entry.title,
    order: entry.order,
    source: entry.source,
    statementCount: statements.length,
    chainCount: chains.length,
    chains,
    controlCalls,
    readBuffers,
    writeBuffers,
    bufferEdges: chains
      .filter((chain) => chain.writeTarget)
      .flatMap((chain) => chain.readBuffers.map((read) => ({ from: read, to: chain.writeTarget, chain: chain.id }))),
    rootCounts: objectFromMap(rootCounts),
    callCounts: objectFromMap(callCounts),
    methodCounts: objectFromMap(methodCounts),
    helperCounts: objectFromMap(helperCounts),
    primitiveVocabulary: finalizePrimitiveAccumulator(primitiveAccumulator),
    numericSummary: summarizeNumbers(numberLiterals),
    randomRanges: {
      btw: extractCallRanges(cleanCode, 'btw'),
      intgr: extractCallRanges(cleanCode, 'intgr')
    },
    cleanCode
  }

  pattern.motifs = inferMotifs(pattern)
  pattern.featureVector = buildFeatureVector(pattern)
  return pattern
}

const aggregate = (patterns) => {
  const rootCounts = new Map()
  const methodCounts = new Map()
  const callCounts = new Map()
  const helperCounts = new Map()
  const motifCounts = new Map()
  const outputCounts = new Map()
  const chainSignatureCounts = new Map()
  const controlCounts = new Map()
  const bufferEdges = new Map()
  const primitiveVocabulary = createPrimitiveAccumulator()
  const mergeCounts = (target, source) => {
    for (const [key, value] of Object.entries(source ?? {})) increment(target, key, value)
  }
  const mergeNestedCounts = (target, source) => {
    for (const [outer, innerCounts] of Object.entries(source ?? {})) {
      for (const [inner, value] of Object.entries(innerCounts)) incrementNestedMap(target, outer, inner, value)
    }
  }

  for (const pattern of patterns) {
    for (const [key, value] of Object.entries(pattern.rootCounts)) increment(rootCounts, key, value)
    for (const [key, value] of Object.entries(pattern.methodCounts)) increment(methodCounts, key, value)
    for (const [key, value] of Object.entries(pattern.callCounts)) increment(callCounts, key, value)
    for (const [key, value] of Object.entries(pattern.helperCounts)) increment(helperCounts, key, value)
    for (const motif of pattern.motifs) increment(motifCounts, motif)
    for (const control of pattern.controlCalls) increment(controlCounts, control.name)
    for (const chain of pattern.chains) {
      if (chain.writeTarget) increment(outputCounts, chain.writeTarget)
      increment(chainSignatureCounts, chain.signature)
    }
    for (const edge of pattern.bufferEdges) increment(bufferEdges, `${edge.from}->${edge.to}`)
    const vocabulary = pattern.primitiveVocabulary
    mergeCounts(primitiveVocabulary.initialGenerators, vocabulary.initialGenerators)
    mergeCounts(primitiveVocabulary.nestedGenerators, vocabulary.nestedGenerators)
    mergeCounts(primitiveVocabulary.modulatorGenerators, vocabulary.modulatorGenerators)
    mergeCounts(primitiveVocabulary.maskGenerators, vocabulary.maskGenerators)
    mergeCounts(primitiveVocabulary.compositeGenerators, vocabulary.compositeGenerators)
    mergeCounts(primitiveVocabulary.geometryGenerators, vocabulary.geometryGenerators)
    mergeCounts(primitiveVocabulary.colorGenerators, vocabulary.colorGenerators)
    mergeCounts(primitiveVocabulary.helperCalls, vocabulary.helperCalls)
    mergeCounts(primitiveVocabulary.symbolUsage, vocabulary.symbolUsage)
    mergeCounts(primitiveVocabulary.operationBigrams, vocabulary.operationBigrams)
    mergeCounts(primitiveVocabulary.operationTrigrams, vocabulary.operationTrigrams)
    mergeCounts(primitiveVocabulary.chainPrefixes, vocabulary.chainPrefixes)
    mergeCounts(primitiveVocabulary.categoryTransitions, vocabulary.categoryTransitions)
    mergeCounts(primitiveVocabulary.rootToFirstOp, vocabulary.rootToFirstOp)
    mergeNestedCounts(primitiveVocabulary.methodArgumentGenerators, vocabulary.methodArgumentGenerators)
    mergeNestedCounts(primitiveVocabulary.methodArgumentHelpers, vocabulary.methodArgumentHelpers)
  }

  return {
    rootCounts: objectFromMap(rootCounts),
    methodCounts: objectFromMap(methodCounts),
    callCounts: objectFromMap(callCounts),
    helperCounts: objectFromMap(helperCounts),
    motifCounts: objectFromMap(motifCounts),
    outputCounts: objectFromMap(outputCounts),
    chainSignatureCounts: objectFromMap(chainSignatureCounts),
    controlCounts: objectFromMap(controlCounts),
    bufferEdges: objectFromMap(bufferEdges),
    primitiveVocabulary: finalizePrimitiveAccumulator(primitiveVocabulary)
  }
}

const familyCommonCounts = (family, key) => {
  const counts = new Map()
  for (const pattern of family.patterns) {
    const source = key === 'motifs'
      ? Object.fromEntries(pattern.motifs.map((motif) => [motif, 1]))
      : pattern[key]
    for (const [item, value] of Object.entries(source)) increment(counts, item, value)
  }
  return counts
}

const renderFamiliesMarkdown = ({ inputPath, summary, families }) => {
  const sections = [
    '# Hydra Style Families',
    '',
    `Input: \`${inputPath.replaceAll('\\', '/')}\``,
    `Patterns analyzed: ${summary.patternCount}`,
    `Chains extracted: ${summary.chainCount}`,
    '',
    'Families are clustered from motif tags, root generators, method vocabulary, and chain prefixes. Treat names as editable labels; membership and counts are the evidence.',
    '',
    '## Family Index',
    '',
    markdownTable(
      ['Family', 'Members', 'Primary motifs', 'Top roots', 'Top ops'],
      families.map((family) => {
        const motifCounts = familyCommonCounts(family, 'motifs')
        const rootCounts = familyCommonCounts(family, 'rootCounts')
        const methodCounts = familyCommonCounts(family, 'methodCounts')
        return [
          family.id,
          family.patterns.map((pattern) => pattern.id).join(', '),
          topEntries(motifCounts, 4).map(([key]) => key).join(', '),
          topEntries(rootCounts, 3).map(([key, value]) => `${key} ${value}`).join(', '),
          topEntries(methodCounts, 5).map(([key, value]) => `${key} ${value}`).join(', ')
        ]
      })
    ),
    ''
  ]

  for (const family of families) {
    const motifCounts = familyCommonCounts(family, 'motifs')
    const rootCounts = familyCommonCounts(family, 'rootCounts')
    const methodCounts = familyCommonCounts(family, 'methodCounts')
    const signatures = new Map()
    for (const pattern of family.patterns) {
      for (const chain of pattern.chains) increment(signatures, chain.signature)
    }

    sections.push(
      `## ${family.id}`,
      '',
      `Members: ${family.patterns.map((pattern) => pattern.id).join(', ')}`,
      '',
      'Primary motifs:',
      formatCountList(topEntries(motifCounts, 8)),
      '',
      'Top roots:',
      formatCountList(topEntries(rootCounts, 6)),
      '',
      'Top operations:',
      formatCountList(topEntries(methodCounts, 12)),
      '',
      'Representative chain skeletons:',
      formatCountList(topEntries(signatures, 6)),
      ''
    )
  }

  return sections.join('\n')
}

const renderSeriesMarkdown = ({ inputPath, summary, series }) => {
  const sections = [
    '# Hydra Variation Series',
    '',
    `Input: \`${inputPath.replaceAll('\\', '/')}\``,
    `Patterns analyzed: ${summary.patternCount}`,
    `Series detected: ${series.length}`,
    '',
    'A series is a run of neighboring curated patterns with high structural similarity. This is the closest report to "how the patch evolved" because it preserves sequence.',
    ''
  ]

  if (series.length === 0) {
    sections.push('No variation series crossed the configured similarity threshold.', '')
    return sections.join('\n')
  }

  sections.push(
    markdownTable(
      ['Series', 'Members', 'Similarity', 'Top motifs', 'Top ops'],
      series.map((item) => [
        item.id,
        item.members.map((pattern) => pattern.id).join(', '),
        `${item.minSimilarity}-${item.maxSimilarity}`,
        Object.entries(item.topMotifs).slice(0, 5).map(([key, value]) => `${key} ${value}`).join(', '),
        Object.entries(item.topMethods).slice(0, 6).map(([key, value]) => `${key} ${value}`).join(', ')
      ])
    ),
    ''
  )

  for (const item of series) {
    sections.push(
      `## ${item.id}`,
      '',
      `Members: ${item.members.map((pattern) => pattern.id).join(', ')}`,
      `Similarity range: ${item.minSimilarity}-${item.maxSimilarity}`,
      '',
      'Pair links:',
      item.links.map((link) => `- ${link.from} -> ${link.to}: ${link.similarity}`).join('\n'),
      '',
      'Dominant motifs:',
      formatCountList(Object.entries(item.topMotifs).slice(0, 8)),
      '',
      'Dominant operations:',
      formatCountList(Object.entries(item.topMethods).slice(0, 12)),
      ''
    )
  }

  return sections.join('\n')
}

const rowsWithExamples = (counts, examples, limit = 20) =>
  topEntries(counts, limit).map(([key, count]) => [
    key,
    count,
    (examples[key] ?? []).join(', ')
  ])

const renderMethodMapMarkdown = ({ inputPath, summary, methodMap }) => {
  const closedFeedbackRows = topEntries(methodMap.topologyCounts, 20)
    .filter(([topology]) => topology.startsWith('closed-feedback'))
    .map(([topology, count]) => [
      topology,
      count,
      (methodMap.topologyExamples[topology] ?? []).join(', ')
    ])

  const sections = [
    '# Hydra Method Map',
    '',
    `Input: \`${inputPath.replaceAll('\\', '/')}\``,
    `Patterns analyzed: ${summary.patternCount}`,
    `Chains extracted: ${summary.chainCount}`,
    '',
    'This report sits between the primitive vocabulary and any family names. Counts are evidence, but the useful object is the construction method: buffer topology, source role, operation-role sequence, and what material each operation receives.',
    '',
    '## 0. Method Role Vocabulary',
    '',
    'These are the current primitive verbs. They are intentionally editable; the point is to expose the grammar layer before generating more patches.',
    '',
    markdownTable(
      ['Role', 'Computer-science reading', 'Graphics reading'],
      methodMap.roleVocabulary.map((item) => [item.role, item.computerScience, item.graphics])
    ),
    '',
    '### Topology Vocabulary',
    '',
    markdownTable(
      ['Topology form', 'Computer-science reading', 'Graphics reading'],
      methodMap.topologyVocabulary
    ),
    '',
    '## 1. Buffer Topologies',
    '',
    'A topology describes how a chain reads and writes memory. This is where feedback becomes a method rather than just a `src` call.',
    '',
    markdownTable(['Topology', 'Chains', 'Examples'], rowsWithExamples(
      methodMap.topologyCounts,
      methodMap.topologyExamples,
      24
    )),
    '',
    '### Closed Feedback',
    '',
    closedFeedbackRows.length > 0
      ? markdownTable(['Topology', 'Chains', 'Examples'], closedFeedbackRows)
      : 'No closed feedback chains were detected.',
    '',
    '## 2. Construction Signatures',
    '',
    'A construction signature combines topology with the compressed visual-role sequence. This is the closest current representation of "how a patch is made."',
    '',
    markdownTable(['Signature', 'Chains', 'Examples'], rowsWithExamples(
      methodMap.methodSignatureCounts,
      methodMap.signatureExamples,
      30
    )),
    '',
    '## 3. Role Sequences',
    '',
    'These remove exact Hydra method names and keep only the procedural roles: accumulate, gate, displace, quantize, chroma, write, and related moves.',
    '',
    markdownTable(['Role sequence', 'Chains'], topEntries(methodMap.roleSequenceCounts, 30)),
    '',
    '## 4. Operation Moves',
    '',
    'A move is an operation role plus its argument material. This is intended to capture habits like layering a geometry seed, masking with a noise field, then displacing by normalized width/height fields.',
    '',
    markdownTable(['Move', 'Uses', 'Examples'], rowsWithExamples(
      methodMap.moveCounts,
      methodMap.moveExamples,
      40
    )),
    '',
    '## Reading Notes',
    '',
    '- Start with topology: closed feedback means the chain edits the same memory it reads.',
    '- Then read the construction signature: the key question is whether memory is accumulated, gated, displaced, quantized, or color-treated before writeback.',
    '- Treat exact operation names as surface syntax. `layer`, `add`, and `blend` are different Hydra calls, but they share an accumulation role.',
    '- Treat embedded sources as material roles. `noise`, `ns`, and `osc` inside arguments are often the actual generator layer even when the statement root is `src(o0)`.',
    '- Family names and generated archetypes should wait until this method map feels faithful.',
    ''
  ]

  return sections.join('\n')
}

const renderTextureOperationMapMarkdown = ({ inputPath, summary, textureOperationMap }) => [
  '# Hydra Texture / Operation Space Map',
  '',
  `Input: \`${inputPath.replaceAll('\\', '/')}\``,
  `Patterns analyzed: ${summary.patternCount}`,
  `Chains extracted: ${summary.chainCount}`,
  '',
  'This report separates the outer chain program from texture programs embedded inside operation arguments. The most important split is `modulate(...)`: the outer chain is the image being displaced, while the argument texture is the field that supplies displacement, usually through red/green channel values.',
  '',
  '## 1. Outside Chain Operations',
  '',
  'These are top-level methods in extracted chains: the operations applied to the current image or buffer memory.',
  '',
  markdownTable(['Outer operation', 'Uses'], topEntries(textureOperationMap.outerOperationCounts, 40)),
  '',
  markdownTable(['Outer role', 'Uses'], topEntries(textureOperationMap.outerRoleCounts, 24)),
  '',
  '## 2. Argument Spaces',
  '',
  'Each embedded texture program is assigned to the host operation that receives it.',
  '',
  markdownTable(['Argument space', 'Embedded programs'], topEntries(textureOperationMap.argumentSpaceCounts, 16)),
  '',
  '## 3. Inside Modulation',
  '',
  '`modulate` is treated as a UV-displacement host. `modulateScale`, `modulateRotate`, and related calls are treated as geometry-parameter modulation. `modulateHue` is kept separate as chroma modulation.',
  '',
  markdownTable(['Modulation host', 'Uses'], topEntries(textureOperationMap.modulationHostCounts, 16)),
  '',
  '### Modulation Field Cues',
  '',
  'These cues mark how the displacement or modulation field is encoded. `rg-width-height-vector` means the extractor found width/height-shaped values in the first two color channels, which is the strongest current signal for R/G UV-vector thinking.',
  '',
  markdownTable(['Cue', 'Uses', 'Examples'], rowsWithExamples(
    textureOperationMap.modulationFieldCueCounts,
    textureOperationMap.modulationCueExamples,
    24
  )),
  '',
  '### Modulation Texture Roots',
  '',
  markdownTable(['Root generator inside modulation', 'Uses'], topEntries(textureOperationMap.modulationRootCounts, 24)),
  '',
  '### Operations Inside Modulation Textures',
  '',
  markdownTable(['Inner operation', 'Uses'], topEntries(textureOperationMap.modulationInnerOperationCounts, 40)),
  '',
  markdownTable(['Inner role', 'Uses'], topEntries(textureOperationMap.modulationInnerRoleCounts, 24)),
  '',
  '### Modulation Texture Programs',
  '',
  markdownTable(['Texture program signature', 'Uses', 'Examples'], rowsWithExamples(
    textureOperationMap.modulationProgramCounts,
    textureOperationMap.modulationProgramExamples,
    30
  )),
  '',
  '## 4. Inside Non-Modulation Materials',
  '',
  'These are embedded texture programs used by masks, composites, layouts, colors, and other hosts. They may generate visible material or gates, not UV displacement.',
  '',
  markdownTable(['Inner operation outside modulation', 'Uses'], topEntries(
    textureOperationMap.nonModulationInnerOperationCounts,
    40
  )),
  '',
  '### Operation Space -> Inner Operations',
  '',
  markdownTable(['Argument space', 'Total', 'Top inner operations'], topNestedRows(
    textureOperationMap.spaceInnerOperationCounts,
    16
  )),
  '',
  '### Host Operation -> Inner Operations',
  '',
  markdownTable(['Host operation', 'Total', 'Top inner operations'], topNestedRows(
    textureOperationMap.hostInnerOperationCounts,
    24
  )),
  '',
  '## Reading Notes',
  '',
  '- Do not flatten `.modulate(textureProgram)` into a generic chain. The outer image and the inner texture field have different jobs.',
  '- For plain `modulate`, the argument texture should be read as a UV displacement field; red and green are the important channels for x/y-like displacement.',
  '- Width/height-normalized color encodings are stronger evidence of R/G vector-field construction than raw `modulate` frequency.',
  '- Masks and layers also contain texture programs, but those programs create gates or material to accumulate rather than coordinate displacement.',
  '- Generation should preserve both layers: the outside construction signature and the inside texture-field program.',
  ''
].join('\n')

const renderContextualOperationMapMarkdown = ({ inputPath, summary, contextualOperationMap }) => [
  '# Hydra Contextual Operation Map',
  '',
  `Input: \`${inputPath.replaceAll('\\', '/')}\``,
  `Patterns analyzed: ${summary.patternCount}`,
  `Chains extracted: ${summary.chainCount}`,
  '',
  'This report treats an operation as context-dependent. `color()`, `brightness()`, `pixelate()`, `scale()`, `mask()`, and related calls do different work when they are inside a modulation texture, inside material feeding `layer`/`add`/`blend`, or on the live feedback path.',
  '',
  '## 1. Semantic Spaces',
  '',
  markdownTable(
    ['Space', 'Computer-science reading', 'Graphics reading'],
    contextualOperationMap.vocabulary.map((item) => [item.space, item.computerScience, item.graphics])
  ),
  '',
  '## 2. Context Counts',
  '',
  'Counts are supporting evidence only. The key value is the separation of meaning by space.',
  '',
  markdownTable(['Context', 'Operation uses'], topEntries(contextualOperationMap.contextCounts, 24)),
  '',
  '### Top-Level Host Path Contexts',
  '',
  markdownTable(['Host path context', 'Uses'], topEntries(contextualOperationMap.hostPathContextCounts, 24)),
  '',
  '### Embedded Argument Contexts',
  '',
  markdownTable(['Argument semantic space', 'Embedded programs'], topEntries(
    contextualOperationMap.argumentSemanticSpaceCounts,
    24
  )),
  '',
  '## 3. All Operations By Context',
  '',
  'Every extracted Hydra method operation is mapped to semantic contexts. The selected examples below are not special cases; they are just expanded views of this complete matrix.',
  '',
  markdownTable(['Operation', 'Total', 'Top contexts'], topNestedRows(
    contextualOperationMap.operationContextCounts,
    80
  )),
  '',
  '## 4. Selected Operation Expansions',
  '',
  'These tables make the context split easier to inspect for common ambiguous operations. The complete operation matrix is above.',
  '',
  ...['color', 'brightness', 'pixelate', 'scale', 'mask', 'thresh', 'modulate'].flatMap((op) => [
    `### ${op}()`,
    '',
    contextualOperationMap.focusedOperationContextCounts[op]
      ? markdownTable(['Context', 'Uses'], topEntries(contextualOperationMap.focusedOperationContextCounts[op], 20))
      : 'No uses detected in the focused context map.',
    ''
  ]),
  '## 5. Context -> Operations',
  '',
  markdownTable(['Context', 'Total', 'Top operations'], topNestedRows(
    contextualOperationMap.contextOperationCounts,
    24
  )),
  '',
  '## 6. Semantic Operation Signatures',
  '',
  'Each row is an operation plus the semantic space where it happened.',
  '',
  markdownTable(['Semantic operation', 'Uses', 'Examples'], rowsWithExamples(
    contextualOperationMap.semanticOperationCounts,
    contextualOperationMap.semanticExamples,
    50
  )),
  '',
  '## 7. Contextual Meaning Notes',
  '',
  markdownTable(['Interpretation', 'Uses'], topEntries(contextualOperationMap.operationMeaningCounts, 40)),
  '',
  '## Reading Notes',
  '',
  '- `color()` inside `modulate(...)` is not primarily visible color; it often encodes the displacement field, especially when width/height appear in the first channels.',
  '- `brightness()` inside a modulation texture biases the field; on the feedback path it biases or decays memory.',
  '- `pixelate()` inside a modulation texture quantizes displacement; inside an accumulation input it makes injected material blocky; on the feedback path it quantizes memory.',
  '- `layer`, `add`, and `blend` are host operations. Their argument programs are outside the memory path but feed the accumulation.',
  '- Generated patches should preserve these spaces separately: an outer feedback method, one or more accumulation input materials, and modulation fields with their own texture programs.',
  ''
].join('\n')

const renderFlowGrammarMarkdown = ({ inputPath, summary, flowGrammar }) => [
  '# Hydra Flow Grammar',
  '',
  `Input: \`${inputPath.replaceAll('\\', '/')}\``,
  `Patterns analyzed: ${summary.patternCount}`,
  `Chains extracted: ${summary.chainCount}`,
  '',
  'This report articulates flows rather than individual examples. A flow is a relation between paths: base memory/source path, accumulation host, injected material path, mask/gate path, modulation field, subtractive comparison, and writeback.',
  '',
  '## 1. Flow Vocabulary',
  '',
  markdownTable(
    ['Flow', 'Computer-science reading', 'Graphics reading'],
    flowGrammar.vocabulary.map((item) => [item.flow, item.computerScience, item.graphics])
  ),
  '',
  '## 2. Topology Families',
  '',
  markdownTable(['Topology family', 'Chains'], topEntries(flowGrammar.topologyFamilyCounts, 16)),
  '',
  '## 3. Flow Tags',
  '',
  'Tags are composable. A chain can be closed feedback accumulation, masked-source injection, UV-displaced feedback, and post-accumulation treatment at the same time.',
  '',
  markdownTable(['Flow tag', 'Chains', 'Examples'], rowsWithExamples(
    flowGrammar.tagCounts,
    flowGrammar.tagExamples,
    32
  )),
  '',
  '## 4. Flow Signatures',
  '',
  'A signature is a compressed path recipe. It reads left to right: topology family, source role, major path actions, and write target.',
  '',
  markdownTable(['Flow signature', 'Chains', 'Examples'], rowsWithExamples(
    flowGrammar.signatureCounts,
    flowGrammar.signatureExamples,
    40
  )),
  '',
  '## 5. Flow Co-occurrences',
  '',
  'These pairs reveal common compound flows, such as masked-source feedback accumulation plus UV displacement.',
  '',
  markdownTable(['Flow pair', 'Chains'], topEntries(flowGrammar.tagCooccurrences, 32)),
  '',
  '## 6. Path Materials',
  '',
  'Materials and cues are grouped by path, not by raw operation frequency.',
  '',
  markdownTable(['Path', 'Total', 'Material roles / cues'], topNestedRows(
    flowGrammar.pathMaterialCounts,
    16
  )),
  '',
  '## Core Flow Readings',
  '',
  '- Accumulation is not just `.layer()` or `.add()`. In this grammar it is a base memory/source path plus an accumulation host plus an injected material path.',
  '- Feedback accumulation becomes the dominant closed-loop form when `src(oN)` reads memory, `layer/add/blend` injects material, and `.out(oN)` writes back.',
  '- Masked-source feedback accumulation means the injected material path is shaped by `mask/luma/thresh` before entering the feedback host.',
  '- UV-displaced feedback means the base or accumulated memory is modified by a separate texture field passed into `modulate(...)`.',
  '- Source construction and cross-buffer staging are not weaker feedback; they are setup flows that build memory for later loops.',
  ''
].join('\n')

const renderSignalFlowGraphMarkdown = ({ inputPath, summary, signalFlowGraph }) => [
  '# Hydra Typed Modular Signal-Flow Graph',
  '',
  `Input: \`${inputPath.replaceAll('\\', '/')}\``,
  `Patterns analyzed: ${summary.patternCount}`,
  `Chains extracted: ${summary.chainCount}`,
  '',
  'This is the modular video-synth grammar layer. It treats a Hydra patch as a typed signal graph: modules have responsibilities, ports carry signal types, and operation meaning follows the module/port context rather than the method name alone.',
  '',
  '## 1. Signal Types',
  '',
  markdownTable(
    ['Signal type', 'Computer-science reading', 'Graphics/synth reading'],
    signalFlowGraph.signalTypes.map((item) => [item.type, item.computerScience, item.graphics])
  ),
  '',
  '## 2. Module Types',
  '',
  markdownTable(
    ['Module', 'Responsibility', 'Graphics/synth reading'],
    signalFlowGraph.modules.map((item) => [item.module, item.computerScience, item.graphics])
  ),
  '',
  '## 3. Observed Modules And Signals',
  '',
  markdownTable(['Module', 'Nodes'], topEntries(signalFlowGraph.moduleCounts, 32)),
  '',
  markdownTable(['Signal type', 'Nodes'], topEntries(signalFlowGraph.signalTypeCounts, 32)),
  '',
  '## 4. Circuit Tags',
  '',
  'Circuit tags are modular synth circuits derived from the graph. They are not patch families; they are reusable responsibilities.',
  '',
  markdownTable(['Circuit', 'Chains', 'Examples'], rowsWithExamples(
    signalFlowGraph.circuitCounts,
    signalFlowGraph.circuitExamples,
    24
  )),
  '',
  '## 5. Module Connections',
  '',
  'These are typed module-to-module edges observed in the extracted graphs.',
  '',
  markdownTable(['Module connection', 'Edges'], topEntries(signalFlowGraph.moduleConnectionCounts, 40)),
  '',
  '## 6. Signal Connections',
  '',
  'These show what signal type is carried between module classes.',
  '',
  markdownTable(['Typed connection', 'Edges'], topEntries(signalFlowGraph.signalConnectionCounts, 40)),
  '',
  '## 7. Port Usage',
  '',
  'Ports are the important grammar interface: base path, material injection, UV field, mask, comparison field, transform field, controls, and write target.',
  '',
  markdownTable(['Signal -> port', 'Edges'], topEntries(signalFlowGraph.edgeCounts, 32)),
  '',
  '## 8. Graph Signatures',
  '',
  'A graph signature is the compressed module path for a chain, including embedded field/material builders where they feed host modules.',
  '',
  markdownTable(['Graph signature', 'Chains', 'Examples'], rowsWithExamples(
    signalFlowGraph.graphSignatureCounts,
    signalFlowGraph.graphSignatureExamples,
    32
  )),
  '',
  '## 9. Control Signals',
  '',
  markdownTable(['Control', 'Chains'], topEntries(signalFlowGraph.controlCounts, 24)),
  '',
  '## Core Modular Readings',
  '',
  '- `GeneratorSource` does not mean visible image by default; its output becomes material, mask, UV field, comparison field, or transform field depending on the port it feeds.',
  '- `AccumulatorMixer` is the module responsibility behind `layer/add/blend`: combine a base memory/source path with an injected material signal.',
  '- `MaskBuilder` can build standalone masks or masked material for accumulation. A masked source is a material path plus a gate path before the accumulator.',
  '- `VectorFieldBuilder` is separate from `Displacer`: one builds the R/G-like field, the other applies it to the base signal.',
  '- `FeedbackConditioner` captures operations that treat live memory before, between, or after accumulation.',
  '- `BufferRead` and `BufferWrite` are first-class modules because feedback and staging are routing decisions, not just syntax.',
  ''
].join('\n')

const withObservedCounts = (items, counts, key) => items.map((item) => ({
  ...item,
  observedCount: counts[item[key]] ?? 0
}))

const buildHydraDslModuleSpec = (signalFlowGraph) => ({
  grounding: {
    source: 'curated corpus only',
    note: 'Hydra DSL possibilities are emergent and intentionally non-exhaustive. Observed forms are supported by the curated corpus; possible forms are constrained extrapolations from observed module responsibilities.'
  },
  evidenceLevels: {
    observed: 'Directly supported by the curated patches and extracted graph.',
    inferred: 'Reasonable module-level abstraction from observed operations and contexts.',
    candidate: 'Possible extension that should not guide generation until curated evidence is added.',
    out_of_scope: 'Hydra-wide capability not present in the current curated corpus.'
  },
  signals: withObservedCounts(HYDRA_DSL_SIGNAL_SPEC, signalFlowGraph.signalTypeCounts, 'signal'),
  modules: withObservedCounts(HYDRA_DSL_MODULE_SPEC, signalFlowGraph.moduleCounts, 'module'),
  circuits: withObservedCounts(HYDRA_DSL_CIRCUIT_SPEC, signalFlowGraph.circuitCounts, 'circuit'),
  observedConnections: signalFlowGraph.moduleConnectionCounts,
  observedTypedConnections: signalFlowGraph.signalConnectionCounts
})

const renderHydraDslModuleSpecMarkdown = ({ inputPath, summary, hydraDslModuleSpec }) => [
  '# Hydra DSL Module Specification',
  '',
  `Input: \`${inputPath.replaceAll('\\', '/')}\``,
  `Patterns analyzed: ${summary.patternCount}`,
  `Chains extracted: ${summary.chainCount}`,
  '',
  'This file articulates the typed modular graph back into Hydra DSL. It is not an exhaustive Hydra reference. It is a grounded vocabulary for the curated corpus, with possible forms described as emergent module behavior rather than permission to use every Hydra feature.',
  '',
  '## 1. Grounding',
  '',
  `Source: ${hydraDslModuleSpec.grounding.source}`,
  '',
  hydraDslModuleSpec.grounding.note,
  '',
  '### Evidence Levels',
  '',
  markdownTable(['Level', 'Meaning'], Object.entries(hydraDslModuleSpec.evidenceLevels)),
  '',
  '## 2. Signal Types In Hydra DSL',
  '',
  markdownTable(
    ['Signal', 'Evidence', 'Observed nodes', 'Hydra DSL carriers', 'Use'],
    hydraDslModuleSpec.signals.map((item) => [
      item.signal,
      item.evidenceLevel,
      item.observedCount,
      item.hydraDsl.join(', '),
      item.use
    ])
  ),
  '',
  '## 3. Module Specs',
  '',
  'Each module has a responsibility, observed DSL forms, and possible non-exhaustive forms. Generation should prefer observed forms unless a new curated reference supports an extension.',
  '',
  ...hydraDslModuleSpec.modules.flatMap((item) => [
    `### ${item.module}`,
    '',
    `Evidence: ${item.evidenceLevel}`,
    `Observed nodes: ${item.observedCount}`,
    '',
    `Responsibility: ${item.responsibility}`,
    '',
    'Observed Hydra DSL:',
    formatCountList(item.observedDsl.map((entry) => [entry, ''])).replace(/: $/gmu, ''),
    '',
    'Possible DSL forms:',
    formatCountList(item.possibleHydraForms.map((entry) => [entry, ''])).replace(/: $/gmu, ''),
    '',
    `Generation use: ${item.generationUse}`,
    ''
  ]),
  '## 4. Circuit Specs',
  '',
  markdownTable(
    ['Circuit', 'Evidence', 'Chains', 'Hydra DSL sketch', 'Typed template', 'Possibility'],
    hydraDslModuleSpec.circuits.map((item) => [
      item.circuit,
      item.evidenceLevel,
      item.observedCount,
      item.hydraDsl,
      item.template,
      item.possibility
    ])
  ),
  '',
  '## 5. Observed Module Connections',
  '',
  markdownTable(['Connection', 'Edges'], topEntries(hydraDslModuleSpec.observedConnections, 40)),
  '',
  '## 6. Observed Typed Connections',
  '',
  markdownTable(['Typed connection', 'Edges'], topEntries(hydraDslModuleSpec.observedTypedConnections, 40)),
  '',
  '## Generation Guardrails',
  '',
  '- Start from a typed module graph, then emit Hydra DSL.',
  '- Keep `VectorFieldBuilder` separate from `Displacer`: one builds the field, the other applies it.',
  '- Keep `MaskBuilder` separate from `AccumulatorMixer`: one shapes material, the other injects it.',
  '- Treat `FieldShaper` methods as context-dependent; `pixelate` on a UV field is not the same module behavior as `pixelate` on material.',
  '- Do not import Hydra-wide APIs or external media unless the curated corpus is extended with those references.',
  ''
].join('\n')

const topNestedRows = (nested, limit = 16) => Object.entries(nested)
  .map(([outer, inner]) => ({
    outer,
    total: Object.values(inner).reduce((sum, value) => sum + value, 0),
    top: topEntries(inner, 6).map(([key, value]) => `${key} ${value}`).join(', ')
  }))
  .sort((a, b) => b.total - a.total || a.outer.localeCompare(b.outer))
  .slice(0, limit)
  .map((row) => [row.outer, row.total, row.top])

const renderPrimitiveVocabularyMarkdown = ({ inputPath, summary, aggregateResult }) => {
  const vocabulary = aggregateResult.primitiveVocabulary
  const categoryCounts = new Map()
  for (const [method, count] of Object.entries(aggregateResult.methodCounts)) {
    increment(categoryCounts, CATEGORY_BY_OP.get(method) ?? 'other', count)
  }

  return [
    '# Hydra Primitive Vocabulary',
    '',
    `Input: \`${inputPath.replaceAll('\\', '/')}\``,
    `Patterns analyzed: ${summary.patternCount}`,
    `Chains extracted: ${summary.chainCount}`,
    '',
    'This is the base layer. It intentionally avoids family naming and asks what the patch corpus is made from: generators, embedded sources, operation roles, symbolic parameters, buffer references, and chain habits.',
    '',
    '## 1. Statement Generators',
    '',
    'Hydra roots used to begin top-level chains.',
    '',
    markdownTable(['Generator', 'Count'], topEntries(vocabulary.initialGenerators, 24)),
    '',
    '## 2. Embedded Generators',
    '',
    'Hydra roots used inside method arguments. These are often the true material sources for modulation, masks, composites, and fields.',
    '',
    markdownTable(['Generator', 'Count'], topEntries(vocabulary.nestedGenerators, 24)),
    '',
    '## 3. Generator Roles',
    '',
    'Same primitives grouped by how they are used.',
    '',
    '### As Modulators',
    '',
    markdownTable(['Generator', 'Count'], topEntries(vocabulary.modulatorGenerators, 16)),
    '',
    '### As Masks / Gates',
    '',
    markdownTable(['Generator', 'Count'], topEntries(vocabulary.maskGenerators, 16)),
    '',
    '### As Composite Inputs',
    '',
    markdownTable(['Generator', 'Count'], topEntries(vocabulary.compositeGenerators, 16)),
    '',
    '### As Geometry / Sampling Inputs',
    '',
    markdownTable(['Generator', 'Count'], topEntries(vocabulary.geometryGenerators, 16)),
    '',
    '## 4. Operation Vocabulary',
    '',
    'Method calls grouped by visual role.',
    '',
    markdownTable(['Role', 'Count'], topEntries(categoryCounts, 20)),
    '',
    markdownTable(['Operation', 'Count'], topEntries(aggregateResult.methodCounts, 48)),
    '',
    '## 5. What Gets Chained',
    '',
    'Top operation transitions and chain prefixes.',
    '',
    '### Operation Bigrams',
    '',
    markdownTable(['Transition', 'Count'], topEntries(vocabulary.operationBigrams, 30)),
    '',
    '### Operation Trigrams',
    '',
    markdownTable(['Transition', 'Count'], topEntries(vocabulary.operationTrigrams, 24)),
    '',
    '### Root To First Operation',
    '',
    markdownTable(['Start', 'Count'], topEntries(vocabulary.rootToFirstOp, 24)),
    '',
    '### Chain Prefixes',
    '',
    markdownTable(['Prefix', 'Count'], topEntries(vocabulary.chainPrefixes, 24)),
    '',
    '## 6. Method Argument Vocabulary',
    '',
    'Which generators appear inside which methods.',
    '',
    markdownTable(['Method', 'Total', 'Top embedded generators'], topNestedRows(vocabulary.methodArgumentGenerators, 24)),
    '',
    'Which stochastic helpers appear inside which methods.',
    '',
    markdownTable(['Method', 'Total', 'Top helpers'], topNestedRows(vocabulary.methodArgumentHelpers, 20)),
    '',
    '## 7. Symbolic / Thinking Vocabulary',
    '',
    'These tokens show how the author thinks about space, time, feedback, and normalization.',
    '',
    markdownTable(['Symbol', 'Count'], topEntries(vocabulary.symbolUsage, 24)),
    '',
    '## 8. Helper Vocabulary',
    '',
    markdownTable(['Helper', 'Count'], topEntries(vocabulary.helperCalls, 24)),
    '',
    '## Reading Notes',
    '',
    '- `src` as a statement root means feedback memory starts the chain.',
    '- `src`, `noise`, `ns`, `osc`, and `gradient` inside arguments usually define fields or materials.',
    '- `1/width`, `1/height`, `A`, and `B` are not mere constants; they are spatial-normalization habits.',
    '- Operation transitions are closer to grammar than raw operation counts.',
    '- Families should be derived only after this vocabulary layer is accepted.',
    ''
  ].join('\n')
}

const renderVocabularyMarkdown = ({ inputPath, summary, aggregateResult, motifCounts }) => [
  '# Hydra Style Vocabulary',
  '',
  `Input: \`${inputPath.replaceAll('\\', '/')}\``,
  `Patterns analyzed: ${summary.patternCount}`,
  '',
  '## Root Generators',
  '',
  markdownTable(['Root', 'Count'], topEntries(aggregateResult.rootCounts, 20)),
  '',
  '## Method Vocabulary',
  '',
  markdownTable(['Method', 'Count'], topEntries(aggregateResult.methodCounts, 40)),
  '',
  '## Helper Vocabulary',
  '',
  markdownTable(['Helper', 'Count'], topEntries(aggregateResult.helperCounts, 20)),
  '',
  '## Output Buffers',
  '',
  markdownTable(['Target', 'Writes'], topEntries(aggregateResult.outputCounts, 10)),
  '',
  '## Buffer Edges',
  '',
  markdownTable(['Read -> Write', 'Count'], topEntries(aggregateResult.bufferEdges, 20)),
  '',
  '## Motif Frequencies',
  '',
  markdownTable(['Motif', 'Patterns'], topEntries(motifCounts, 20)),
  ''
].join('\n')

const renderStyleGrammarMarkdown = ({ inputPath, summary, aggregateResult, families, series }) => {
  const motifEntries = topEntries(aggregateResult.motifCounts, 20)
  const rootEntries = topEntries(aggregateResult.rootCounts, 10)
  const methodEntries = topEntries(aggregateResult.methodCounts, 20)
  const helperEntries = topEntries(aggregateResult.helperCounts, 15)

  return [
    '# Hydra Style Grammar',
    '',
    `Input: \`${inputPath.replaceAll('\\', '/')}\``,
    `Patterns: ${summary.patternCount}`,
    `Chains: ${summary.chainCount}`,
    '',
    'Read `primitive-vocabulary.md`, `method-map.md`, `texture-operation-map.md`, `contextual-operation-map.md`, `flow-grammar.md`, `signal-flow-graph.md`, and `hydra-dsl-module-spec.md` before interpreting families. This file summarizes the grammar after those evidence layers exist; it should not be treated as the primary evidence layer.',
    '',
    '## Objective Vocabulary',
    '',
    'Dominant roots:',
    formatCountList(rootEntries),
    '',
    'Dominant operations:',
    formatCountList(methodEntries),
    '',
    'Dominant helpers:',
    formatCountList(helperEntries),
    '',
    '## Motif Layer',
    '',
    formatCountList(motifEntries),
    '',
    '## Working Grammar',
    '',
    'A valid first-pass patch in this style should usually combine several of these moves:',
    '',
    '- Start from feedback memory with `src(o0)` or route work through `o1`/`o2` before render.',
    '- Use noise/noiseloop/ns fields as displacement, mask terrain, or sparse gates rather than as plain texture.',
    '- Normalize small motion through `1/width`, `1/height`, `A`, or `B` when the patch depends on canvas scale.',
    '- Build visual pressure with `mask`, `thresh`, `pixelate`, `repeat`, and `diff` before color polish.',
    '- Treat buffers as working memory: write an intermediate field, then layer/mask/modulate it back into feedback.',
    '- Prefer family-level mutation: change thresholds, pixel grids, blend amounts, scroll drift, and output routing inside a known skeleton.',
    '',
    '## Family Mutation Map',
    '',
    markdownTable(
      ['Family', 'Members', 'Mutation knobs'],
      families.map((family) => {
        const motifs = new Set(family.patterns.flatMap((pattern) => pattern.motifs))
        const knobs = []
        if (motifs.has('pixel_grid_sampling')) knobs.push('pixelate/repeat grid size')
        if (motifs.has('threshold_gate')) knobs.push('threshold ladder')
        if (motifs.has('feedback_memory')) knobs.push('feedback blend/decay')
        if (motifs.has('noise_vector_field')) knobs.push('noise frequency/velocity/radius')
        if (motifs.has('subpixel_displacement')) knobs.push('width/height displacement amount')
        if (motifs.has('rgb_channel_logic')) knobs.push('channel offset/color recombination')
        if (motifs.has('kaleid_symmetry')) knobs.push('symmetry count/rotation phase')
        return [
          family.id,
          family.patterns.map((pattern) => pattern.id).join(', '),
          knobs.join(', ') || 'root/op substitution inside skeleton'
        ]
      })
    ),
    '',
    '## Detected Iterative Series',
    '',
    series.length > 0
      ? markdownTable(
        ['Series', 'Members', 'Similarity'],
        series.map((item) => [
          item.id,
          item.members.map((pattern) => pattern.id).join(', '),
          `${item.minSimilarity}-${item.maxSimilarity}`
        ])
      )
      : 'No neighboring variation series crossed the configured similarity threshold.',
    '',
    '## Guardrails',
    '',
    '- Do not treat JavaScript syntax similarity as style by itself.',
    '- Keep external media out unless explicitly allowed.',
    '- Separate measured facts from interpretive motif names.',
    '- Render-check generated variants before claiming visual success.',
    ''
  ].join('\n')
}

const writeJson = (filePath, value) => {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

const main = () => {
  const inputPath = resolveInput()
  if (!existsSync(inputPath)) throw new Error(`Input does not exist: ${inputPath}`)
  const outDir = path.resolve(readArg('outDir', path.join(repoRoot, '.tmp', 'hydra-style')))
  mkdirSync(outDir, { recursive: true })

  const parsed = statSync(inputPath).isDirectory()
    ? parseDirectoryInput(inputPath)
    : parseMarkdownInput(inputPath)

  if (parsed.patterns.length === 0) {
    throw new Error(`No Hydra patterns found in ${inputPath}`)
  }

  const patterns = parsed.patterns.map(analyzePattern)
  for (const pattern of patterns) {
    delete pattern.cleanCode
  }

  const aggregateResult = aggregate(patterns)
  const families = clusterPatterns(patterns)
  const series = detectVariationSeries(patterns)
  const methodMap = summarizeMethodMap(patterns)
  const textureOperationMap = summarizeTextureOperationMap(patterns)
  const contextualOperationMap = summarizeContextualOperationMap(patterns)
  const flowGrammar = summarizeFlowGrammar(patterns)
  const signalFlowGraph = summarizeSignalFlowGraph(patterns)
  const hydraDslModuleSpec = buildHydraDslModuleSpec(signalFlowGraph)
  const chainCount = patterns.reduce((total, pattern) => total + pattern.chainCount, 0)
  const summary = {
    inputPath,
    sourceLine: parsed.sourceLine,
    patternCount: patterns.length,
    chainCount,
    familyCount: families.length,
    seriesCount: series.length,
    helperBlockDetected: parsed.helperBlock.trim().length > 0,
    topRoots: Object.fromEntries(topEntries(aggregateResult.rootCounts, 12)),
    topMethods: Object.fromEntries(topEntries(aggregateResult.methodCounts, 20)),
    topHelpers: Object.fromEntries(topEntries(aggregateResult.helperCounts, 15)),
    topInitialGenerators: Object.fromEntries(topEntries(aggregateResult.primitiveVocabulary.initialGenerators, 12)),
    topNestedGenerators: Object.fromEntries(topEntries(aggregateResult.primitiveVocabulary.nestedGenerators, 12)),
    topOperationTransitions: Object.fromEntries(topEntries(aggregateResult.primitiveVocabulary.operationBigrams, 12)),
    topMethodTopologies: Object.fromEntries(topEntries(methodMap.topologyCounts, 12)),
    topConstructionMethods: Object.fromEntries(topEntries(methodMap.methodSignatureCounts, 12)),
    topMethodMoves: Object.fromEntries(topEntries(methodMap.moveCounts, 16)),
    topOuterOperations: Object.fromEntries(topEntries(textureOperationMap.outerOperationCounts, 16)),
    topModulationFieldCues: Object.fromEntries(topEntries(textureOperationMap.modulationFieldCueCounts, 12)),
    topModulationInnerOperations: Object.fromEntries(topEntries(textureOperationMap.modulationInnerOperationCounts, 16)),
    topContextualOperationSpaces: Object.fromEntries(topEntries(contextualOperationMap.contextCounts, 16)),
    topContextualOperations: Object.fromEntries(topEntries(contextualOperationMap.semanticOperationCounts, 16)),
    topFlowTags: Object.fromEntries(topEntries(flowGrammar.tagCounts, 16)),
    topFlowSignatures: Object.fromEntries(topEntries(flowGrammar.signatureCounts, 12)),
    topSignalFlowModules: Object.fromEntries(topEntries(signalFlowGraph.moduleCounts, 16)),
    topSignalFlowCircuits: Object.fromEntries(topEntries(signalFlowGraph.circuitCounts, 16)),
    topSignalFlowConnections: Object.fromEntries(topEntries(signalFlowGraph.moduleConnectionCounts, 16)),
    topHydraDslModules: Object.fromEntries(topEntries(
      Object.fromEntries(hydraDslModuleSpec.modules.map((item) => [item.module, item.observedCount])),
      16
    )),
    topMotifs: Object.fromEntries(topEntries(aggregateResult.motifCounts, 20)),
    outputTargets: aggregateResult.outputCounts
  }

  const familiesForJson = families.map((family) => ({
    id: family.id,
    name: family.name,
    size: family.size,
    members: family.patterns.map((pattern) => pattern.id),
    topMotifs: Object.fromEntries(topEntries(familyCommonCounts(family, 'motifs'), 10)),
    topRoots: Object.fromEntries(topEntries(familyCommonCounts(family, 'rootCounts'), 10)),
    topMethods: Object.fromEntries(topEntries(familyCommonCounts(family, 'methodCounts'), 20)),
    representativeChains: Object.fromEntries(topEntries(
      family.patterns.reduce((map, pattern) => {
        for (const chain of pattern.chains) increment(map, chain.signature)
        return map
      }, new Map()),
      10
    ))
  }))

  const seriesForJson = series.map((item) => ({
    id: item.id,
    members: item.members.map((pattern) => pattern.id),
    links: item.links,
    minSimilarity: item.minSimilarity,
    maxSimilarity: item.maxSimilarity,
    topMotifs: item.topMotifs,
    topMethods: item.topMethods
  }))

  const patternsForJson = patterns.map((pattern) => ({
    ...pattern,
    featureVector: objectFromMap(pattern.featureVector)
  }))

  writeJson(path.join(outDir, 'summary.json'), summary)
  writeJson(path.join(outDir, 'patterns.json'), patternsForJson)
  writeJson(path.join(outDir, 'chains.json'), patternsForJson.flatMap((pattern) =>
    pattern.chains.map((chain) => ({
      patternId: pattern.id,
      ...chain
    }))
  ))
  writeJson(path.join(outDir, 'motifs.json'), {
    taxonomy: motifTaxonomy,
    byPattern: Object.fromEntries(patterns.map((pattern) => [pattern.id, pattern.motifs])),
    counts: aggregateResult.motifCounts
  })
  writeJson(path.join(outDir, 'families.json'), familiesForJson)
  writeJson(path.join(outDir, 'series.json'), seriesForJson)
  writeJson(path.join(outDir, 'primitives.json'), aggregateResult.primitiveVocabulary)
  writeJson(path.join(outDir, 'method-map.json'), methodMap)
  writeJson(path.join(outDir, 'texture-operation-map.json'), textureOperationMap)
  writeJson(path.join(outDir, 'contextual-operation-map.json'), contextualOperationMap)
  writeJson(path.join(outDir, 'flow-grammar.json'), flowGrammar)
  writeJson(path.join(outDir, 'signal-flow-graph.json'), signalFlowGraph)
  writeJson(path.join(outDir, 'hydra-dsl-module-spec.json'), hydraDslModuleSpec)
  writeJson(path.join(outDir, 'aggregate.json'), aggregateResult)

  writeFileSync(
    path.join(outDir, 'families.md'),
    renderFamiliesMarkdown({ inputPath, summary, families })
  )
  writeFileSync(
    path.join(outDir, 'series.md'),
    renderSeriesMarkdown({ inputPath, summary, series })
  )
  writeFileSync(
    path.join(outDir, 'primitive-vocabulary.md'),
    renderPrimitiveVocabularyMarkdown({ inputPath, summary, aggregateResult })
  )
  writeFileSync(
    path.join(outDir, 'method-map.md'),
    renderMethodMapMarkdown({ inputPath, summary, methodMap })
  )
  writeFileSync(
    path.join(outDir, 'texture-operation-map.md'),
    renderTextureOperationMapMarkdown({ inputPath, summary, textureOperationMap })
  )
  writeFileSync(
    path.join(outDir, 'contextual-operation-map.md'),
    renderContextualOperationMapMarkdown({ inputPath, summary, contextualOperationMap })
  )
  writeFileSync(
    path.join(outDir, 'flow-grammar.md'),
    renderFlowGrammarMarkdown({ inputPath, summary, flowGrammar })
  )
  writeFileSync(
    path.join(outDir, 'signal-flow-graph.md'),
    renderSignalFlowGraphMarkdown({ inputPath, summary, signalFlowGraph })
  )
  writeFileSync(
    path.join(outDir, 'hydra-dsl-module-spec.md'),
    renderHydraDslModuleSpecMarkdown({ inputPath, summary, hydraDslModuleSpec })
  )
  writeFileSync(
    path.join(outDir, 'vocabulary.md'),
    renderVocabularyMarkdown({
      inputPath,
      summary,
      aggregateResult,
      motifCounts: aggregateResult.motifCounts
    })
  )
  writeFileSync(
    path.join(outDir, 'style-grammar.md'),
    renderStyleGrammarMarkdown({ inputPath, summary, aggregateResult, families, series })
  )

  if (!hasFlag('quiet')) {
    console.log(`Hydra style extraction complete.`)
    console.log(`Input: ${inputPath}`)
    console.log(`Patterns: ${summary.patternCount}`)
    console.log(`Chains: ${summary.chainCount}`)
    console.log(`Families: ${summary.familyCount}`)
    console.log(`Series: ${summary.seriesCount}`)
    console.log(`Output: ${outDir}`)
  }
}

main()
