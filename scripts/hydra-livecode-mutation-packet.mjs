#!/usr/bin/env node

import { readFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const usage = `Usage:
  node scripts/hydra-livecode-mutation-packet.mjs --input patch.js [--out packet.md] [--label name] [--count 5] [--scope module]
  Get-Content patch.js | node scripts/hydra-livecode-mutation-packet.mjs --stdin --out packet.md

Builds a prompt-ready packet for LLM-based grammar-aware Hydra mutation.
It does not generate or mutate patches by itself.
`

const ROOT_GENERATORS = ['src', 'shape', 'solid', 'osc', 'noise', 'noiseloop', 'gradient', 'voronoi']
const RENDERPASS_METHODS = [
  'blur',
  'blurX',
  'blurY',
  'blurFast',
  'dualKawaseBlur',
  'dualKawaseBloom',
  'bloom',
  'bloomUpsample',
  'sharpen',
  'edgeDetect',
  'edgeLaplacian',
  'toneMap'
]

const parseArgs = (argv) => {
  const args = {
    count: '5',
    scope: 'module',
    label: '',
    input: '',
    out: '',
    stdin: false,
    help: false
  }

  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index]
    if (raw === '--help' || raw === '-h') {
      args.help = true
      continue
    }
    if (raw === '--stdin') {
      args.stdin = true
      continue
    }
    if (!raw.startsWith('--')) {
      throw new Error(`Unexpected positional argument: ${raw}`)
    }
    const [key, inlineValue] = raw.slice(2).split('=', 2)
    const value = inlineValue ?? argv[index + 1]
    if (inlineValue === undefined) index += 1
    if (value === undefined) throw new Error(`Missing value for --${key}`)
    if (!(key in args)) throw new Error(`Unknown option --${key}`)
    args[key] = value
  }

  return args
}

const readStdin = async () => {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8')
}

const fence = (code, lang = '') => `\`\`\`${lang}
${code.trimEnd()}
\`\`\``

const unique = (values) => [...new Set(values)].filter(Boolean)

const matchAll = (code, regex, group = 1) => [...code.matchAll(regex)].map((match) => match[group] ?? '')

const countRegex = (code, regex) => (code.match(regex) ?? []).length

const extractAssignments = (code) => {
  const lines = code.split(/\r?\n/)
  const assignments = []
  let current = null

  const startAssignment = (line, index) => {
    const match = line.match(/^\s*(?:const|let|var)?\s*([A-Za-z_$][\w$]*)\s*=\s*(.+)$/)
    if (!match) return null
    return {
      name: match[1],
      startLine: index + 1,
      lines: [line]
    }
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const next = startAssignment(line, index)
    if (next) {
      if (current) assignments.push(current)
      current = next
      continue
    }
    if (current) {
      if (!line.trim()) {
        assignments.push(current)
        current = null
      } else {
        current.lines.push(line)
      }
    }
  }

  if (current) assignments.push(current)

  return assignments
    .map((assignment) => ({
      ...assignment,
      code: assignment.lines.join('\n')
    }))
    .filter((assignment) => /(?:src|shape|solid|osc|noise|noiseloop|gradient|voronoi|ns|prevN)\s*\(/.test(assignment.code))
}

const extractOutputChains = (code) => {
  const lines = code.split(/\r?\n/)
  const chains = []
  let current = []

  for (const line of lines) {
    const startsHydraLine = new RegExp(`^\\s*(?:${ROOT_GENERATORS.join('|')}|ns|prevN)\\s*\\(`).test(line)
      || /^\s*[A-Za-z_$][\w$]*\s*\./.test(line)

    if (!current.length && !startsHydraLine) continue
    current.push(line)

    if (/\.out\s*\([^)]*\)/.test(line)) {
      chains.push(current.join('\n'))
      current = []
    }
  }

  return chains
}

const cueForCode = (code) => {
  const cues = []

  if (/src\s*\(\s*o\d/.test(code)) cues.push('Memory read')
  if (/\.out\s*\(\s*o?\d?\s*\)/.test(code)) cues.push('Buffer write')
  if (/\.layer\s*\(/.test(code)) cues.push('Ingress / accumulator layer')
  if (/\.mask\s*\(/.test(code)) cues.push('Gate application')
  if (/\.thresh\s*\(/.test(code)) cues.push('Hard cutoff / comparator')
  if (/\.modulate\s*\(/.test(code)) cues.push('UV displacement')
  if (/\.modulate(?:Scale|Rotate|Hue|Repeat|Kaleid)\s*\(/.test(code)) cues.push('Specialized modulation')
  if (/gradient\s*\(\s*\)[\s\S]*\.sub\s*\(\s*gradient\s*\(\s*\)\s*\)/.test(code)) cues.push('Transform-delta field')
  if (/color\s*\(\s*1\s*\/\s*width\s*,\s*1\s*\/\s*height/.test(code)) cues.push('Pixel-normalized xy field')
  if (/color\s*\(\s*1\s*\/\s*width\s*,\s*0/.test(code)) cues.push('Pixel-normalized x field')
  if (/color\s*\(\s*0\s*,\s*1\s*\/\s*height/.test(code)) cues.push('Pixel-normalized y field')
  if (/pixelate\s*\(\s*1\s*,\s*1\s*\)/.test(code)) cues.push('Uniform/global scalar texture')
  if (/posterize\s*\(/.test(code)) cues.push('Dynamic quantization')
  if (/pixelate\s*\(/.test(code)) cues.push('Spatial quantization')
  if (/\.repeat\s*\(/.test(code)) cues.push('Tiling / repeated topology')
  if (/\.scale\s*\(\s*1\s*\//.test(code)) cues.push('Scale-to-tile idiom')
  if (/\.r\s*\(|\.g\s*\(|\.b\s*\(|\.a\s*\(/.test(code)) cues.push('Channel range remap')
  if (/\.diff\s*\(|\.sub\s*\(|\.add\s*\(|\.blend\s*\(|\.mult\s*\(/.test(code)) cues.push('Blend/composite math')
  if (RENDERPASS_METHODS.some((name) => new RegExp(`\\.${name}\\s*\\(`).test(code))) cues.push('Renderpass conditioner')
  if (/prevN\s*\(/.test(code)) cues.push('Temporal history read')

  return cues
}

const analyze = (code) => {
  const helpers = unique(matchAll(code, /^\s*(?:const|let|var)?\s*([A-Za-z_$][\w$]*)\s*=/gm))
  const outputTargets = unique(matchAll(code, /\.out\s*\(\s*(o\d)?\s*\)/g).map((target) => target || 'o0'))
  const sourceReads = unique(matchAll(code, /src\s*\(\s*(o\d|s\d)\s*\)/g))
  const previousReads = unique(matchAll(code, /prevN\s*\(\s*(o\d)\s*,\s*([^)]+)\)/g, 0))
  const generators = ROOT_GENERATORS
    .map((name) => [name, countRegex(code, new RegExp(`\\b${name}\\s*\\(`, 'g'))])
    .filter(([, count]) => count > 0)
  const methods = unique(matchAll(code, /\.([A-Za-z_$][\w$]*)\s*\(/g)).sort()
  const assignments = extractAssignments(code)
  const outputChains = extractOutputChains(code)
  const globalCues = cueForCode(code)

  const assignmentSummary = assignments.map((assignment) => ({
    name: assignment.name,
    startLine: assignment.startLine,
    cues: cueForCode(assignment.code)
  }))

  const chainSummary = outputChains.map((chain, index) => ({
    index: index + 1,
    cues: cueForCode(chain),
    preview: chain.split(/\r?\n/).slice(0, 4).join(' / ')
  }))

  return {
    helpers,
    outputTargets,
    sourceReads,
    previousReads,
    generators,
    methods,
    assignments: assignmentSummary,
    chains: chainSummary,
    globalCues
  }
}

const renderList = (values, empty = 'none detected') => {
  if (!values.length) return `- ${empty}`
  return values.map((value) => `- ${value}`).join('\n')
}

const renderAnalysis = (analysis) => {
  const generators = analysis.generators.map(([name, count]) => `${name}: ${count}`)
  const assignments = analysis.assignments.map((assignment) => (
    `- ${assignment.name} at line ${assignment.startLine}: ${assignment.cues.join(', ') || 'no strong role cue'}`
  ))
  const chains = analysis.chains.map((chain) => (
    `- chain ${chain.index}: ${chain.cues.join(', ') || 'no strong role cue'}\n  preview: ${chain.preview}`
  ))

  return `## Lightweight Cue Extraction

This is heuristic context only. The LLM must still read the actual patch.

### Helpers / Named Values
${renderList(analysis.helpers)}

### Output Targets
${renderList(analysis.outputTargets)}

### Source Reads
${renderList(analysis.sourceReads)}

### History Reads
${renderList(analysis.previousReads)}

### Root Generators
${renderList(generators)}

### Methods
${renderList(analysis.methods)}

### Named Subgraphs
${renderList(assignments)}

### Output Chains
${renderList(chains)}

### Global Cues
${renderList(analysis.globalCues)}
`
}

const renderPacket = ({ code, label, count, scope, analysis }) => {
  const packetLabel = label || 'untitled-hydra-patch'
  return `# Hydra Grammar-Aware Mutation Packet: ${packetLabel}

Use this packet with an LLM. The goal is to mutate the input patch, not to
generate a new sketch from scratch.

## Mutator Task

You are a Hydra grammar-aware livecoding mutator.

Read the input patch as an authored signal-flow circuit. Propose localized
mutations that preserve its identity. Do not invent a new composition unless a
candidate explicitly marks itself as a circuit-level departure.

Requested mutation scope: ${scope}
Requested candidate count: ${count}

## Required Response Shape

1. Reading
   - map the current patch into memory path, ingress, hard gate, material,
     UV/transform fields, conditioners, parameters, and buffer routing

2. Preservation Contract
   - state what must remain true for the patch to still be this patch

3. Mutation Candidates
   - provide ${count} candidates
   - each candidate must include scope, target module, intent,
     math/signal reason, Hydra code, and visual review risk
   - prefer complete replacement code when local replacement would be ambiguous

4. Review Questions
   - ask only short questions that help critique the rendered result

## Grammar Constraints

- Start from the authored patch.
- Preserve helper vocabulary and buffer routing unless a candidate explicitly
  changes them.
- Prefer ingress as \`.layer(material.mask(hardGate))\`.
- Hard ingress gates should avoid smooth gray masks.
- Feedback \`.modulate(...)\` fields should usually use
  \`.color(1 / width, 1 / height)\` and put force in the host amount.
- Preserve authored energy calibration by default; do not casually change
  \`.add(..., amount)\`, \`.modulate(..., amount)\`, blend/sub amounts, or
  thresholds. If splitting one component into several, divide the original
  contribution proportionally instead of stacking extra power.
- Noise UV fields should default to independent x/y components unless same-field
  diagonal motion is intended.
- Material mixing should usually happen before the ingress mask.
- Transform-delta fields use \`gradient().coordOp(...).sub(gradient())\`.
- Renderpass methods inside fields/material/gates are allowed as signal
  conditioners, but should have a routing reason.
- Do not use \`()=>time\` motion.
- Do not claim candidates are visually successful before render/user review.

${renderAnalysis(analysis)}

## Input Patch

${fence(code, 'js')}
`
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    process.stdout.write(usage)
    return
  }

  if (!args.stdin && !args.input) {
    throw new Error('Provide --input <file> or --stdin.')
  }

  const inputPath = args.input ? path.resolve(args.input) : ''
  const code = args.stdin ? await readStdin() : await readFile(inputPath, 'utf8')
  const count = Number.isFinite(Number(args.count)) && Number(args.count) > 0
    ? String(Math.floor(Number(args.count)))
    : '5'
  const label = args.label || (inputPath ? path.basename(inputPath) : 'stdin')
  const analysis = analyze(code)
  const packet = renderPacket({
    code,
    label,
    count,
    scope: args.scope,
    analysis
  })

  if (args.out) {
    const outPath = path.resolve(args.out)
    await mkdir(path.dirname(outPath), { recursive: true })
    await writeFile(outPath, packet)
    process.stdout.write(`${outPath}\n`)
  } else {
    process.stdout.write(packet)
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n\n${usage}`)
  process.exitCode = 1
})
