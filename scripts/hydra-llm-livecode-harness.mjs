#!/usr/bin/env node

import { chromium } from '@playwright/test'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'

const defaultUrl = 'http://localhost:8000/packages/hydra/index.html?livecoding=1'
const defaultCdp = 'http://127.0.0.1:9223'
const defaultChromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

const usage = `Usage:
  node scripts/hydra-llm-livecode-harness.mjs --once --provider mock --input patch.js
  node scripts/hydra-llm-livecode-harness.mjs --execute --loop --provider command --command "hermes chat ..."
  node scripts/hydra-llm-livecode-harness.mjs --execute --once --provider openai --model gpt-5.2

Options:
  --execute             Connect to Hydra and visibly apply accepted edit decisions.
  --once                Run one observe -> decide -> optionally perform turn.
  --loop                Keep asking for one move until stopped.
  --provider <name>     mock | command | openai. Default: mock.
  --command <cmd>       Command provider. Receives packet JSON on stdin, returns decision JSON on stdout.
  --model <id>          OpenAI model. Default: gpt-5.2.
  --base-url <url>      OpenAI-compatible base URL. Default: https://api.openai.com/v1.
  --api-key-env <name>  Env var for provider API key. Default: OPENAI_API_KEY.
  --input <file>        Patch source for dry runs or initial browser setup.
  --stdin               Read patch source from stdin.
  --load-input          In execute mode, load --input/--stdin patch into the editor before deciding.
  --include-screenshot  Include screenshot path in the decision packet.
  --send-screenshot     Send screenshot bytes to OpenAI. Off by default.
  --allow-set           Allow whole-buffer set decisions. Off by default.
  --url <url>           Hydra app URL.
  --cdp <url>           Chrome DevTools endpoint. Default: ${defaultCdp}
  --launch-chrome       Launch Chrome with remote debugging if CDP is not available.
  --chrome <path>       Chrome executable path.
  --profile <dir>       Temporary Chrome profile dir.
  --out-dir <dir>       Session output directory. Default: .tmp/hydra-llm-livecode
  --delay <ms>          Default typing delay. Default: 18.
  --chunk <n>           Default typed chunk size. Default: 2.
  --hold <ms>           Hold after each accepted move. Default: 3500.
  --max-steps <n>       Loop limit. 0 means unlimited.
  --stop-file <file>    Stop loop when this file exists.
  --help                Show this help.

The harness is intentionally one-move-at-a-time:
  observe current code/render -> build grammar context -> LLM proposes one bounded edit -> validate -> type/run -> observe again.
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

const forbiddenGeneratedCodePatterns = [
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  /\bEventSource\b/,
  /\bimport\s*\(/,
  /\brequire\s*\(/,
  /\beval\s*\(/,
  /\bFunction\s*\(/,
  /\bdocument\s*\./,
  /\bwindow\s*\./,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
  /\bnavigator\s*\./,
  /\blocation\s*\./,
  /\bpostMessage\s*\(/,
  /\bsetInterval\s*\(/,
  /\bsetTimeout\s*\(/,
  /=>\s*time\b/,
  /\(\s*\)\s*=>\s*time\b/,
  /\binit(?:Image|Video|Cam|Screen)\s*\(/,
  /\bload(?:Image|Video|Script)\s*\(/
]

const parseArgs = (argv) => {
  const args = {
    execute: false,
    once: false,
    loop: false,
    provider: 'mock',
    command: '',
    model: 'gpt-5.2',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyEnv: 'OPENAI_API_KEY',
    input: '',
    stdin: false,
    loadInput: false,
    includeScreenshot: false,
    sendScreenshot: false,
    allowSet: false,
    url: defaultUrl,
    cdp: defaultCdp,
    launchChrome: false,
    chrome: defaultChromePath,
    profile: path.resolve('.tmp', 'chrome-live-mutator-profile'),
    outDir: path.resolve('.tmp', 'hydra-llm-livecode'),
    delay: 18,
    chunk: 2,
    hold: 3500,
    maxSteps: 0,
    stopFile: path.resolve('.tmp', 'stop-hydra-llm-livecode'),
    help: false
  }

  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index]
    if (raw === '--') continue
    if (raw === '--help' || raw === '-h') {
      args.help = true
      continue
    }
    if (raw === '--execute') {
      args.execute = true
      continue
    }
    if (raw === '--once') {
      args.once = true
      continue
    }
    if (raw === '--loop') {
      args.loop = true
      continue
    }
    if (raw === '--stdin') {
      args.stdin = true
      continue
    }
    if (raw === '--load-input') {
      args.loadInput = true
      continue
    }
    if (raw === '--include-screenshot') {
      args.includeScreenshot = true
      continue
    }
    if (raw === '--send-screenshot') {
      args.sendScreenshot = true
      continue
    }
    if (raw === '--allow-set') {
      args.allowSet = true
      continue
    }
    if (raw === '--launch-chrome') {
      args.launchChrome = true
      continue
    }
    if (!raw.startsWith('--')) throw new Error(`Unexpected positional argument: ${raw}`)
    const [key, inlineValue] = raw.slice(2).split('=', 2)
    const value = inlineValue ?? argv[index + 1]
    if (inlineValue === undefined) index += 1
    if (value === undefined) throw new Error(`Missing value for --${key}`)
    const normalizedKey = key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
    if (!(normalizedKey in args)) throw new Error(`Unknown option --${key}`)
    args[normalizedKey] = ['delay', 'chunk', 'hold', 'maxSteps'].includes(normalizedKey) ? Number(value) : value
  }

  if (!args.once && !args.loop) args.once = true
  if (args.loop) args.execute = true
  return args
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)))

const readStdin = async () => {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8')
}

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

const analyzePatch = (code) => {
  const assignments = extractAssignments(code)
  const chains = extractOutputChains(code)
  return {
    helpers: unique(matchAll(code, /^\s*(?:const|let|var)?\s*([A-Za-z_$][\w$]*)\s*=/gm)),
    outputTargets: unique(matchAll(code, /\.out\s*\(\s*(o\d)?\s*\)/g).map((target) => target || 'o0')),
    sourceReads: unique(matchAll(code, /src\s*\(\s*(o\d|s\d)\s*\)/g)),
    previousReads: unique(matchAll(code, /prevN\s*\(\s*(o\d)\s*,\s*([^)]+)\)/g, 0)),
    generators: ROOT_GENERATORS
      .map((name) => [name, countRegex(code, new RegExp(`\\b${name}\\s*\\(`, 'g'))])
      .filter(([, count]) => count > 0),
    methods: unique(matchAll(code, /\.([A-Za-z_$][\w$]*)\s*\(/g)).sort(),
    assignments: assignments.map((assignment) => ({
      name: assignment.name,
      startLine: assignment.startLine,
      cues: cueForCode(assignment.code)
    })),
    chains: chains.map((chain, index) => ({
      index: index + 1,
      cues: cueForCode(chain),
      preview: chain.split(/\r?\n/).slice(0, 5).join(' / ')
    })),
    globalCues: cueForCode(code)
  }
}

const readReference = (file, markers = []) => {
  if (!existsSync(file)) return ''
  const content = readFileSync(file, 'utf8')
  if (!markers.length) return content.slice(0, 6000)
  const chunks = []
  for (const marker of markers) {
    const index = content.indexOf(marker)
    if (index >= 0) chunks.push(content.slice(index, index + 3200))
  }
  return chunks.join('\n\n---\n\n')
}

const buildGrammarContext = () => {
  const root = process.cwd()
  const promptGrammar = readReference(path.join(root, 'docs', 'hydra-feedback-prompt-grammar.md'), [
    '## Self-Critique Before Output',
    '## Current Direction',
    'Start with authored decisions:'
  ])
  const signalGrammar = readReference(path.join(root, 'docs', 'hydra-feedback-signal-grammar.md'), [
    '## Current Goal',
    '## Extension Vs Divergence Read'
  ])
  const mutatorProtocol = readReference(path.join(root, 'docs', 'hydra-grammar-aware-livecoding-mutator.md'), [
    '## 9. LLM Prompt Template',
    '## 10. Review Loop'
  ])
  return [signalGrammar, mutatorProtocol, promptGrammar].filter(Boolean).join('\n\n====\n\n').slice(0, 16000)
}

const buildDeveloperPrompt = () => `You are a Hydra grammar-aware livecoding decision engine.

You are not a free patch generator. You make exactly one local livecoding move.

You must think in the user's modular video-synth grammar:
- memory path
- pre-ingress UV field
- material
- hard ingress gate
- ingress layer
- post-ingress drift
- memory conditioner
- parameter/control fields
- buffer routing

Core constraints:
- Start from the current authored patch.
- Prefer local edits over whole-patch replacement.
- Ingress should usually stay layer(material.mask(hardGate)).
- Hard ingress gates should avoid soft gray masks.
- Feedback UV fields should usually use color(1 / width, 1 / height), with power in host k.
- If splitting field energy, redistribute existing amounts rather than stacking extra force.
- Noise displacement should usually separate x and y unless diagonal coupling is intentional.
- Material mixing should usually happen before masking.
- Transform-delta fields use gradient().coordOp(...).sub(gradient()).
- Do not use ()=>time motion.
- Do not claim visual success; state what to review.

Return only JSON matching the requested decision shape.`

const decisionJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['reading', 'move', 'review'],
  properties: {
    reading: {
      type: 'object',
      additionalProperties: false,
      required: ['summary', 'moduleMap', 'dominantBehavior', 'concerns'],
      properties: {
        summary: { type: 'string' },
        moduleMap: {
          type: 'object',
          additionalProperties: false,
          required: ['memory', 'field', 'material', 'gate', 'ingress', 'postDrift', 'conditioner', 'routing'],
          properties: {
            memory: { type: 'string' },
            field: { type: 'string' },
            material: { type: 'string' },
            gate: { type: 'string' },
            ingress: { type: 'string' },
            postDrift: { type: 'string' },
            conditioner: { type: 'string' },
            routing: { type: 'string' }
          }
        },
        dominantBehavior: { type: 'string' },
        concerns: { type: 'array', items: { type: 'string' } }
      }
    },
    move: {
      type: 'object',
      additionalProperties: false,
      required: ['action', 'target', 'intent', 'math', 'expectedEffect', 'risk', 'confidence', 'edit'],
      properties: {
        action: { type: 'string', enum: ['replace', 'insert', 'delete', 'run', 'wait', 'none', 'set'] },
        target: { type: 'string', enum: ['memory', 'field', 'material', 'gate', 'ingress', 'postDrift', 'conditioner', 'parameter', 'routing', 'wholePatch', 'none'] },
        intent: { type: 'string' },
        math: { type: 'string' },
        expectedEffect: { type: 'string' },
        risk: { type: 'string' },
        confidence: { type: 'number' },
        edit: {
          type: 'object',
          additionalProperties: false,
          required: ['type', 'find', 'replacement', 'text', 'at', 'from', 'to', 'run', 'ms'],
          properties: {
            type: { type: 'string', enum: ['replace', 'insert', 'delete', 'run', 'wait', 'none', 'set'] },
            find: { type: 'string' },
            replacement: { type: 'string' },
            text: { type: 'string' },
            at: { type: 'integer' },
            from: { type: 'integer' },
            to: { type: 'integer' },
            run: { type: 'boolean' },
            ms: { type: 'integer' }
          }
        }
      }
    },
    review: {
      type: 'object',
      additionalProperties: false,
      required: ['questions', 'keepIf', 'retreatIf'],
      properties: {
        questions: { type: 'array', items: { type: 'string' } },
        keepIf: { type: 'string' },
        retreatIf: { type: 'string' }
      }
    }
  }
}

const buildDecisionPacket = ({ code, analysis, render, history, args }) => ({
  task: 'Make exactly one grammar-aware Hydra livecoding move.',
  responseShape: 'Return JSON with reading, move, and review. move.edit must be a bounded editor operation.',
  allowedActions: args.allowSet
    ? ['replace', 'insert', 'delete', 'run', 'wait', 'none', 'set']
    : ['replace', 'insert', 'delete', 'run', 'wait', 'none'],
  currentCode: code,
  currentAnalysis: analysis,
  render,
  recentHistory: history.slice(-8),
  grammarContext: buildGrammarContext()
})

const launchChrome = ({ chrome, profile, url, cdp }) => {
  if (!existsSync(chrome)) throw new Error(`Chrome executable not found: ${chrome}`)
  mkdirSync(profile, { recursive: true })
  const port = new URL(cdp).port || '9223'
  const child = spawn(chrome, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    '--new-window',
    url
  ], {
    detached: true,
    stdio: 'ignore'
  })
  child.unref()
  return child.pid
}

const fetchOk = async (url) => {
  try {
    const response = await fetch(url)
    return response.ok
  } catch {
    return false
  }
}

const connectToHydraPage = async ({ cdp, url, launchChrome: shouldLaunchChrome, chrome, profile }) => {
  if (!(await fetchOk(`${cdp}/json/version`))) {
    if (!shouldLaunchChrome) {
      throw new Error(`CDP endpoint is not available at ${cdp}. Re-run with --launch-chrome.`)
    }
    launchChrome({ chrome, profile, url, cdp })
    for (let attempt = 0; attempt < 30; attempt += 1) {
      if (await fetchOk(`${cdp}/json/version`)) break
      await delay(500)
    }
  }

  const browser = await chromium.connectOverCDP(cdp)
  const context = browser.contexts()[0] ?? await browser.newContext()
  let page = context.pages().find((candidate) => candidate.url().includes('/packages/hydra/index.html'))
  if (!page) page = await context.newPage()
  if (!page.url().includes('/packages/hydra/index.html')) {
    await page.goto(url, { waitUntil: 'domcontentloaded' })
  } else {
    await page.bringToFront()
  }
  await page.waitForFunction(() => window.livecoding?.run && window.hydraAgentLivecoder && window.hydraEditor?.setCode, null, {
    timeout: 60000
  })
  await page.evaluate(() => {
    document.querySelector('#welcome-modal')?.setAttribute('hidden', '')
    document.querySelector('#record-popover')?.setAttribute('hidden', '')
    document.querySelector('#options-panel')?.setAttribute('hidden', '')
    window.hydraEditor?.show?.()
  })
  return { browser, page }
}

const observeBrowser = async ({ page, args, outDir, turn }) => {
  const code = await page.evaluate(() => window.hydraAgentLivecoder.getCode())
  const status = await page.evaluate(() => {
    const liveStatus = document.querySelector('#live-status')
    return {
      text: liveStatus?.textContent ?? '',
      state: liveStatus?.getAttribute('data-state') ?? ''
    }
  })
  let screenshotPath = ''
  if (args.includeScreenshot || args.sendScreenshot) {
    screenshotPath = path.join(outDir, `turn-${String(turn).padStart(3, '0')}-observe.png`)
    await page.screenshot({ path: screenshotPath, fullPage: false })
  }
  return {
    code,
    render: {
      status,
      screenshotPath: args.includeScreenshot || args.sendScreenshot ? screenshotPath : ''
    }
  }
}

const mockDecision = (packet) => {
  const code = packet.currentCode
  const replace = (find, replacement, target, intent, math, expectedEffect) => ({
    reading: {
      summary: 'Mock provider read the patch as a closed feedback circuit and selected a bounded local edit.',
      moduleMap: {
        memory: 'src(o0)',
        field: packet.currentAnalysis.globalCues.includes('UV displacement') ? 'modulate field present' : 'not explicit',
        material: 'material inside layer/mask path when present',
        gate: 'hard gate inferred from mask/thresh/shape',
        ingress: 'layer(material.mask(gate)) when present',
        postDrift: 'post-layer modulate if present',
        conditioner: packet.currentAnalysis.globalCues.includes('Renderpass conditioner') ? 'renderpass conditioner present' : 'none obvious',
        routing: packet.currentAnalysis.outputTargets.join(', ') || 'o0'
      },
      dominantBehavior: 'Feedback memory displacement plus hard-gated material ingress.',
      concerns: ['mock decision is structural only; visual taste still needs review']
    },
    move: {
      action: 'replace',
      target,
      intent,
      math,
      expectedEffect,
      risk: 'Could be visually too subtle or too strong depending on current accumulated memory.',
      confidence: 0.55,
      edit: {
        type: 'replace',
        find,
        replacement,
        text: '',
        at: -1,
        from: -1,
        to: -1,
        run: true,
        ms: 0
      }
    },
    review: {
      questions: ['Did the edit preserve the authored feedback identity?', 'Did the motion become more legible?'],
      keepIf: 'Keep if the feedback energy remains stable and the edit creates a readable new responsibility.',
      retreatIf: 'Retreat if it collapses the patch into generic noise or washes out the material gate.'
    }
  })

  if (code.includes('.color(1,0),2/height')) {
    return replace(
      '.color(1,0),2/height',
      '.color(1/width,0),2*width/height',
      'postDrift',
      'Make the post-ingress x drift explicitly pixel-normalized without changing the displacement product.',
      'color(1,0) * 2/height equals color(1/width,0) * 2*width/height in the modulate displacement product.',
      'The code reads the unit logic more clearly while leaving visual force nearly unchanged.'
    )
  }
  if (code.includes('.thresh(.75,0)')) {
    return replace(
      '.thresh(.75,0)',
      '.thresh(.725,0)',
      'material',
      'Slightly open the binary material density before adding any larger module change.',
      'This changes comparator admission density only; it does not alter feedback field force.',
      'More material can enter the existing hard gate without changing buffer routing.'
    )
  }
  return {
    reading: {
      summary: 'Mock provider found no safe canned local move for this exact buffer.',
      moduleMap: {
        memory: 'unknown',
        field: 'unknown',
        material: 'unknown',
        gate: 'unknown',
        ingress: 'unknown',
        postDrift: 'unknown',
        conditioner: 'unknown',
        routing: packet.currentAnalysis.outputTargets.join(', ') || 'unknown'
      },
      dominantBehavior: 'Needs a real LLM decision.',
      concerns: ['mock provider is exhausted']
    },
    move: {
      action: 'none',
      target: 'none',
      intent: 'No mock edit available.',
      math: 'No change.',
      expectedEffect: 'No change.',
      risk: 'No exploration.',
      confidence: 0.1,
      edit: {
        type: 'none',
        find: '',
        replacement: '',
        text: '',
        at: -1,
        from: -1,
        to: -1,
        run: false,
        ms: 0
      }
    },
    review: {
      questions: ['Should a real LLM provider be connected for the next move?'],
      keepIf: 'N/A',
      retreatIf: 'N/A'
    }
  }
}

const extractJson = (text) => {
  const trimmed = String(text ?? '').trim()
  if (!trimmed) throw new Error('Provider returned empty output.')
  try {
    return JSON.parse(trimmed)
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/)
    if (!match) throw new Error(`Provider did not return JSON: ${trimmed.slice(0, 240)}`)
    return JSON.parse(match[0])
  }
}

const commandDecision = async ({ packet, args }) => {
  if (!args.command) throw new Error('--command is required for provider=command')
  const child = spawn(args.command, {
    shell: true,
    stdio: ['pipe', 'pipe', 'pipe']
  })
  const stdout = []
  const stderr = []
  child.stdout.on('data', (chunk) => stdout.push(Buffer.from(chunk)))
  child.stderr.on('data', (chunk) => stderr.push(Buffer.from(chunk)))
  child.stdin.end(`${JSON.stringify(packet, null, 2)}\n`)
  const code = await new Promise((resolve) => child.on('close', resolve))
  if (code !== 0) {
    throw new Error(`Command provider exited ${code}: ${Buffer.concat(stderr).toString('utf8').slice(0, 1000)}`)
  }
  return extractJson(Buffer.concat(stdout).toString('utf8'))
}

const openAiDecision = async ({ packet, args }) => {
  const apiKey = process.env[args.apiKeyEnv]
  if (!apiKey) throw new Error(`${args.apiKeyEnv} is not set; refusing to call provider=openai.`)
  const inputContent = [
    {
      type: 'input_text',
      text: JSON.stringify(packet, null, 2)
    }
  ]
  if (args.sendScreenshot && packet.render?.screenshotPath) {
    const image = readFileSync(packet.render.screenshotPath)
    inputContent.push({
      type: 'input_image',
      image_url: `data:image/png;base64,${image.toString('base64')}`
    })
  }

  const response = await fetch(`${String(args.baseUrl).replace(/\/$/u, '')}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: args.model,
      instructions: buildDeveloperPrompt(),
      input: [
        {
          role: 'user',
          content: inputContent
        }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'hydra_livecode_decision',
          strict: true,
          schema: decisionJsonSchema
        },
        verbosity: 'medium'
      }
    })
  })
  const bodyText = await response.text()
  if (!response.ok) throw new Error(`OpenAI provider failed ${response.status}: ${bodyText.slice(0, 1000)}`)
  const body = JSON.parse(bodyText)
  const outputText = body.output_text
    ?? body.output?.flatMap((item) => item.content ?? [])
      .filter((item) => item.type === 'output_text')
      .map((item) => item.text)
      .join('\n')
  return extractJson(outputText)
}

const requestDecision = async ({ packet, args }) => {
  if (args.provider === 'mock') return mockDecision(packet)
  if (args.provider === 'command') return commandDecision({ packet, args })
  if (args.provider === 'openai') return openAiDecision({ packet, args })
  throw new Error(`Unsupported provider: ${args.provider}`)
}

const normalizeEdit = (decision) => {
  const move = decision?.move ?? {}
  const edit = move.edit ?? {}
  const type = String(edit.type || move.action || 'none')
  return {
    type,
    find: String(edit.find ?? ''),
    replacement: String(edit.replacement ?? ''),
    text: String(edit.text ?? ''),
    at: Number.isFinite(Number(edit.at)) ? Number(edit.at) : -1,
    from: Number.isFinite(Number(edit.from)) ? Number(edit.from) : -1,
    to: Number.isFinite(Number(edit.to)) ? Number(edit.to) : -1,
    run: Boolean(edit.run ?? true),
    ms: Math.max(0, Number(edit.ms) || 0)
  }
}

const applyEditToCode = (code, edit, args) => {
  if (edit.type === 'none' || edit.type === 'run' || edit.type === 'wait') return code
  if (edit.type === 'set') {
    if (!args.allowSet) throw new Error('Provider returned set, but --allow-set is not enabled.')
    return edit.text || edit.replacement
  }
  if (edit.type === 'replace') {
    if (edit.find) {
      const index = code.indexOf(edit.find)
      if (index < 0) throw new Error(`Edit find text does not exist: ${edit.find}`)
      return `${code.slice(0, index)}${edit.replacement}${code.slice(index + edit.find.length)}`
    }
    if (edit.from >= 0 && edit.to >= edit.from) {
      return `${code.slice(0, edit.from)}${edit.replacement}${code.slice(edit.to)}`
    }
    throw new Error('Replace edit requires find or from/to.')
  }
  if (edit.type === 'delete') {
    if (edit.find) {
      const index = code.indexOf(edit.find)
      if (index < 0) throw new Error(`Delete find text does not exist: ${edit.find}`)
      return `${code.slice(0, index)}${code.slice(index + edit.find.length)}`
    }
    if (edit.from >= 0 && edit.to >= edit.from) {
      return `${code.slice(0, edit.from)}${code.slice(edit.to)}`
    }
    throw new Error('Delete edit requires find or from/to.')
  }
  if (edit.type === 'insert') {
    const at = edit.at >= 0 ? edit.at : edit.from
    if (at < 0 || at > code.length) throw new Error('Insert edit requires valid at/from.')
    return `${code.slice(0, at)}${edit.text || edit.replacement}${code.slice(at)}`
  }
  throw new Error(`Unsupported edit type: ${edit.type}`)
}

const validateGeneratedCode = (code) => {
  if (code.length > 16000) throw new Error('Generated code exceeds safety limit.')
  for (const pattern of forbiddenGeneratedCodePatterns) {
    if (pattern.test(code)) throw new Error(`Generated code failed safety validation: ${pattern}`)
  }
  try {
    // Parse only. Do not execute provider-generated code in Node.
    // eslint-disable-next-line no-new-func
    new Function(code)
  } catch (error) {
    throw new Error(`Generated code is not valid JavaScript syntax: ${error instanceof Error ? error.message : String(error)}`)
  }
}

const validateDecision = ({ decision, code, args }) => {
  const edit = normalizeEdit(decision)
  if (!['replace', 'insert', 'delete', 'run', 'wait', 'none', 'set'].includes(edit.type)) {
    throw new Error(`Invalid edit type: ${edit.type}`)
  }
  if (edit.type === 'set' && !args.allowSet) throw new Error('Whole-buffer set decisions require --allow-set.')
  const nextCode = applyEditToCode(code, edit, args)
  validateGeneratedCode(nextCode)
  return { edit, nextCode }
}

const toAgentStep = ({ decision, edit, args }) => {
  const common = {
    label: `${decision.move?.target ?? 'move'}: ${decision.move?.intent ?? edit.type}`,
    delayMs: Math.max(0, Number(args.delay) || 0),
    chunkSize: Math.max(1, Math.floor(Number(args.chunk) || 1)),
    run: edit.run
  }
  if (edit.type === 'none') return { ...common, type: 'wait', ms: Math.max(500, Number(args.hold) || 500), run: false }
  if (edit.type === 'wait') return { ...common, type: 'wait', ms: edit.ms || args.hold, run: false }
  if (edit.type === 'run') return { ...common, type: 'run' }
  if (edit.type === 'set') return { ...common, type: 'set', code: edit.text || edit.replacement, animate: true }
  if (edit.find) return { ...common, type: edit.type, find: edit.find, replacement: edit.replacement, text: edit.text }
  if (edit.type === 'insert') return { ...common, type: 'insert', at: edit.at >= 0 ? edit.at : edit.from, text: edit.text || edit.replacement }
  return {
    ...common,
    type: edit.type,
    range: {
      from: edit.from,
      to: edit.to
    },
    replacement: edit.replacement,
    text: edit.text
  }
}

const readInputCode = async (args) => {
  if (args.stdin) return readStdin()
  if (args.input) return readFile(path.resolve(args.input), 'utf8')
  return ''
}

const runTurn = async ({ args, page, outDir, turn, history, inputCode }) => {
  const observed = page
    ? await observeBrowser({ page, args, outDir, turn })
    : {
        code: inputCode,
        render: {
          status: { text: 'dry-run input', state: '' },
          screenshotPath: ''
        }
      }
  const analysis = analyzePatch(observed.code)
  const packet = buildDecisionPacket({
    code: observed.code,
    analysis,
    render: observed.render,
    history,
    args
  })
  await writeFile(path.join(outDir, `turn-${String(turn).padStart(3, '0')}-packet.json`), `${JSON.stringify(packet, null, 2)}\n`)

  const decision = await requestDecision({ packet, args })
  const validation = validateDecision({ decision, code: observed.code, args })
  const agentStep = toAgentStep({ decision, edit: validation.edit, args })
  const entry = {
    turn,
    at: new Date().toISOString(),
    provider: args.provider,
    decision,
    edit: validation.edit,
    accepted: true,
    agentStep,
    renderBefore: observed.render
  }

  if (args.execute && page) {
    await page.evaluate(async (step) => {
      await window.hydraAgentLivecoder.step(step)
    }, agentStep)
    if (args.hold > 0) await delay(args.hold)
    const renderAfter = await observeBrowser({ page, args, outDir, turn: `${turn}-after` })
    entry.renderAfter = renderAfter.render
    entry.codeAfter = renderAfter.code
  } else {
    entry.codeAfter = validation.nextCode
  }

  await writeFile(path.join(outDir, `turn-${String(turn).padStart(3, '0')}-decision.json`), `${JSON.stringify(entry, null, 2)}\n`)
  return entry
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    process.stdout.write(usage)
    return
  }

  mkdirSync(args.outDir, { recursive: true })
  const inputCode = await readInputCode(args)
  let browser = null
  let page = null
  const history = []

  try {
    if (args.execute) {
      const connected = await connectToHydraPage(args)
      browser = connected.browser
      page = connected.page
      if (args.loadInput && inputCode) {
        await page.evaluate(async (code) => {
          await window.hydraAgentLivecoder.step({
            label: 'load input patch',
            type: 'set',
            code,
            animate: false,
            run: true
          })
        }, inputCode)
        if (args.hold > 0) await delay(args.hold)
      }
    } else if (!inputCode) {
      throw new Error('Dry run requires --input or --stdin. Use --execute to observe the browser editor.')
    }

    const maxSteps = args.loop ? Math.max(0, Math.floor(Number(args.maxSteps) || 0)) : 1
    let turn = 1
    while (!existsSync(args.stopFile) && (maxSteps === 0 || turn <= maxSteps)) {
      const entry = await runTurn({ args, page, outDir: args.outDir, turn, history, inputCode: turn === 1 ? inputCode : history.at(-1)?.codeAfter ?? inputCode })
      history.push({
        turn,
        provider: args.provider,
        target: entry.decision.move?.target ?? '',
        action: entry.edit.type,
        intent: entry.decision.move?.intent ?? '',
        math: entry.decision.move?.math ?? '',
        risk: entry.decision.move?.risk ?? '',
        status: entry.renderAfter?.status ?? entry.renderBefore?.status ?? null,
        codeAfter: entry.codeAfter
      })
      await writeFile(path.join(args.outDir, 'session.json'), `${JSON.stringify({
        running: args.loop && !existsSync(args.stopFile),
        latest: history.at(-1),
        history
      }, null, 2)}\n`)
      turn += 1
      if (!args.loop) break
      if (args.hold > 0 && !existsSync(args.stopFile)) await delay(args.hold)
    }

    process.stdout.write(`${JSON.stringify({
      outDir: args.outDir,
      provider: args.provider,
      execute: args.execute,
      loop: args.loop,
      turns: history.length,
      stopFile: args.loop ? args.stopFile : undefined,
      latest: history.at(-1) ?? null
    }, null, 2)}\n`)
  } finally {
    if (browser) await browser.close()
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n\n${usage}`)
  process.exitCode = 1
})
