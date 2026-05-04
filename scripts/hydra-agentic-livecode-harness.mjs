#!/usr/bin/env node

import { chromium } from '@playwright/test'
import { existsSync, mkdirSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { spawn } from 'node:child_process'

const defaultUrl = 'http://localhost:8000/packages/hydra/index.html?livecoding=1'
const defaultCdp = 'http://127.0.0.1:9223'
const defaultChromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

const usage = `Usage:
  node scripts/hydra-agentic-livecode-harness.mjs [--execute] [--launch-chrome] [--url ${defaultUrl}]

Options:
  --execute             Run the typed livecoding sequence in a visible browser.
  --loop                Keep performing mutation phrases until stopped.
  --evolve              In loop mode, accumulate slow code-state evolution instead of phrase resets.
  --launch-chrome       Launch Chrome with remote debugging if CDP is not available.
  --url <url>           Hydra app URL.
  --cdp <url>           Chrome DevTools endpoint. Default: ${defaultCdp}
  --chrome <path>       Chrome executable path.
  --profile <dir>       Temporary Chrome profile dir.
  --out <file>          Write the compiled plan JSON.
  --screenshot-dir <d>  Save screenshots after each step.
  --delay <ms>          Default typing delay.
  --chunk <n>           Default typed chunk size.
  --hold <ms>           Default hold after each runnable mutation.
  --phrase-hold <ms>    Hold after each loop phrase.
  --max-steps <n>       Loop phrase limit. 0 means unlimited.
  --stop-file <file>    Stop loop when this file exists.
  --help                Show this help.

The harness bridges:
  grammar-aware mutation plan -> hydraAgentLivecoder typed edit sequence
`

const parseArgs = (argv) => {
  const args = {
    execute: false,
    loop: false,
    evolve: false,
    launchChrome: false,
    url: defaultUrl,
    cdp: defaultCdp,
    chrome: defaultChromePath,
    profile: path.resolve('.tmp', 'chrome-live-mutator-profile'),
    out: path.resolve('.tmp', 'agentic-livecode-plan.json'),
    screenshotDir: path.resolve('.tmp', 'agentic-livecode-harness'),
    delay: 24,
    chunk: 2,
    hold: 3000,
    phraseHold: 5000,
    maxSteps: 0,
    stopFile: path.resolve('.tmp', 'stop-agentic-livecode'),
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
    if (raw === '--loop') {
      args.loop = true
      continue
    }
    if (raw === '--evolve') {
      args.evolve = true
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
    args[normalizedKey] = ['delay', 'chunk', 'hold', 'phraseHold', 'maxSteps'].includes(normalizedKey) ? Number(value) : value
  }

  return args
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)))

const originalPatch = `rn=()=>Math.random(),A=height/width
fps=60
ns=(f=1,v=.5,x=rn(),y=rn())=>noise(f,v).scale(1,A).modulate(solid(width*x,height*y),1)
speed=.5
src(o0)
.modulate(solid()
.add(osc(Math.PI*width/4,1/width).brightness(-.5).color(0,1/height),2)
.add(osc(Math.PI*width,1/width).thresh(.5,0).color(1/width,0).mask(ns(1,.1)),2)
,1)
.layer(ns(width/8,.25).rotate(.375).thresh(.75,0).pixelate(width/8,height/8).mult(osc(Math.PI*2,.25,1).color(1.25,.66,1.12).hue(.1).kaleid(width))
.mask(shape(4,1,0).scale(.125,1,1,0,0).repeat(width/8,height/8,.5))
)
.modulate(osc(Math.PI*2,.25).brightness(-.25).color(1,0),2/height)
.out()`

const fieldOriginal = `.modulate(solid()
.add(osc(Math.PI*width/4,1/width).brightness(-.5).color(0,1/height),2)
.add(osc(Math.PI*width,1/width).thresh(.5,0).color(1/width,0).mask(ns(1,.1)),2)
,1)`

const fieldSplit = `.modulate(solid()
.add(osc(Math.PI*width/4,1/width).brightness(-.5).color(0,1/height),1)
.add(osc(Math.PI*width,1/width).thresh(.5,0).color(1/width,0).mask(ns(1,.1)),1)
.add(ns(2,.05).posterize(6,1).pixelate(8,8).color(0,1/height),1)
.add(ns(2,.07).posterize(8,1).pixelate(8,8).color(1/width,0),1)
,1)`

const mutationPlan = {
  id: 'original-feedback-agentic-demo-v1',
  source: 'original authored feedback patch',
  purpose: 'Demonstrate grammar-aware agentic livecoding through visible CodeMirror text edits.',
  preservationContract: [
    'closed o0 feedback',
    'pre-ingress memory drift',
    'hard 1/8 tiled ingress via layer(material.mask(gate))',
    'material mixing before mask',
    'authored energy calibration unless a mutation explicitly says otherwise',
    'no external media',
    'no ()=>time param motion'
  ],
  initialPatch: originalPatch,
  mutations: [
    {
      id: 'normalize-post-drift',
      scope: 'micro',
      target: 'post-ingress drift',
      intent: 'Rewrite post x drift into explicit pixel-normalized field form.',
      math: 'color(1,0) * 2/height is equivalent to color(1/width,0) * 2*width/height in x displacement product.',
      edit: {
        type: 'replace',
        find: '.color(1,0),2/height',
        replacement: '.color(1/width,0),2*width/height'
      }
    },
    {
      id: 'nudge-ingress-density',
      scope: 'micro',
      target: 'material gate density',
      intent: 'Tighten the threshold while keeping the same material and gate structure.',
      math: 'Changes binary material density before pixelate/mult; this is an explicit density mutation, not a field-energy mutation.',
      edit: {
        type: 'replace',
        find: '.thresh(.75,0)',
        replacement: '.thresh(.675,0)'
      }
    },
    {
      id: 'insert-material-local-warp',
      scope: 'module',
      target: 'material',
      intent: 'Add a local material-space x/y warp before thresholding.',
      math: 'Material-space modulate does not need pixel feedback normalization; .5 + .5 preserves balanced x/y internal force.',
      edit: {
        type: 'replace',
        find: '.rotate(.375).thresh(.675,0)',
        replacement: '.rotate(.375)\n.modulate(solid().add(ns(2,.04).color(1,0),.5).add(ns(2,.06).color(0,1),.5),.25)\n.thresh(.675,0)',
        chunkSize: 2,
        delayMs: 14
      }
    },
    {
      id: 'remove-material-rotation',
      scope: 'micro',
      target: 'material topology',
      intent: 'Remove the explicit rotation to reveal how much structure is coming from local warp and tiled gate.',
      math: 'Deletes a material-space affine without changing feedback field energy or gate density.',
      edit: {
        type: 'delete',
        find: '.rotate(.375)\n'
      }
    },
    {
      id: 'energy-conserving-field-split',
      scope: 'module',
      target: 'pre-ingress UV field',
      intent: 'Split original x/y field energy into raster/wave plus independent quantized noise responsibilities.',
      math: 'Original y=2 becomes 1+1; original x=2 becomes 1+1; host modulate amount stays 1.',
      edit: {
        type: 'replace',
        find: fieldOriginal,
        replacement: fieldSplit,
        chunkSize: 3,
        delayMs: 8
      }
    },
    {
      id: 'compose-raster-gate',
      scope: 'module',
      target: 'hard ingress gate',
      intent: 'Compose the existing 1/8 shape tile gate with a pixel-perfect raster gate.',
      math: 'Gate stays hard; raster threshold uses the cosine edge formula for the 1/8 pixel gate.',
      edit: {
        type: 'replace',
        find: '.repeat(width/8,height/8,.5))',
        replacement: '.repeat(width/8,height/8,.5)\n.mask(osc(Math.PI*width/8,1/8/width).thresh((1+Math.cos(Math.PI/16))/2,0)))',
        chunkSize: 2,
        delayMs: 10
      }
    }
  ]
}

const buildAgentSteps = (plan, options = {}) => {
  const defaultDelayMs = Math.max(0, Number(options.delayMs) || 24)
  const defaultChunkSize = Math.max(1, Math.floor(Number(options.chunkSize) || 2))
  const defaultPauseAfterMs = Math.max(0, Number(options.pauseAfterMs) || 3000)

  const setupStep = {
    label: 'load original authored patch',
    type: 'set',
    code: plan.initialPatch,
    animate: false,
    run: true,
    pauseAfterMs: defaultPauseAfterMs
  }

  const mutationSteps = plan.mutations.map((mutation) => ({
    label: `${mutation.id}: ${mutation.intent}`,
    run: true,
    pauseAfterMs: defaultPauseAfterMs,
    delayMs: defaultDelayMs,
    chunkSize: defaultChunkSize,
    ...mutation.edit
  }))

  return [setupStep, ...mutationSteps]
}

const compiledHarness = (options = {}) => ({
  kind: 'hydra-agentic-livecoding-harness',
  version: 1,
  plan: mutationPlan,
  agentSteps: buildAgentSteps(mutationPlan, options),
  loopPhrases: buildLoopPhrases(mutationPlan, options),
  evolutionPhrases: buildEvolutionPhrases(mutationPlan, options)
})

const buildLoopPhrases = (plan, options = {}) => {
  const defaultDelayMs = Math.max(0, Number(options.delayMs) || 24)
  const defaultChunkSize = Math.max(1, Math.floor(Number(options.chunkSize) || 2))
  const defaultPauseAfterMs = Math.max(0, Number(options.pauseAfterMs) || 3000)
  const setupStep = {
    label: 'reset to original authored patch',
    type: 'set',
    code: plan.initialPatch,
    animate: false,
    run: true,
    pauseAfterMs: Math.max(1000, Math.floor(defaultPauseAfterMs / 2))
  }
  const byId = Object.fromEntries(plan.mutations.map((mutation) => [mutation.id, mutation]))
  const mutationStep = (id) => ({
    label: `${byId[id].id}: ${byId[id].intent}`,
    run: true,
    pauseAfterMs: defaultPauseAfterMs,
    delayMs: defaultDelayMs,
    chunkSize: defaultChunkSize,
    ...byId[id].edit
  })

  const phrase = (id, mutationIds) => ({
    id,
    steps: [
      setupStep,
      ...mutationIds.map(mutationStep)
    ]
  })

  return [
    phrase('micro-normalized-post-drift', ['normalize-post-drift']),
    phrase('density-and-material-warp', ['nudge-ingress-density', 'insert-material-local-warp']),
    phrase('material-warp-minus-rotation', ['nudge-ingress-density', 'insert-material-local-warp', 'remove-material-rotation']),
    phrase('field-responsibility-split', ['energy-conserving-field-split']),
    phrase('field-split-raster-gate', ['energy-conserving-field-split', 'compose-raster-gate']),
    phrase('full-current-phrase', [
      'normalize-post-drift',
      'nudge-ingress-density',
      'insert-material-local-warp',
      'remove-material-rotation',
      'energy-conserving-field-split',
      'compose-raster-gate'
    ])
  ]
}

const replaceOnce = (source, find, replacement, label = find) => {
  const index = source.indexOf(find)
  if (index < 0) throw new Error(`Could not build evolution state; missing ${label}`)
  return `${source.slice(0, index)}${replacement}${source.slice(index + find.length)}`
}

const pushEvolutionState = (states, id, code, intent) => {
  states.push({
    id,
    code,
    intent
  })
  return code
}

const buildEvolutionPhrases = (plan) => {
  const states = []
  let code = pushEvolutionState(
    states,
    'authored-source',
    plan.initialPatch,
    'Original authored feedback circuit.'
  )

  code = pushEvolutionState(
    states,
    'normalize-post-drift',
    replaceOnce(code, '.color(1,0),2/height', '.color(1/width,0),2*width/height', 'post drift normalizer'),
    'Make post-ingress drift explicitly pixel-normalized without changing the authored force product.'
  )

  code = pushEvolutionState(
    states,
    'thin-ingress-density',
    replaceOnce(code, '.thresh(.75,0)', '.thresh(.725,0)', 'material density threshold'),
    'Slightly open the material ingress density while preserving the hard gate structure.'
  )

  code = pushEvolutionState(
    states,
    'open-ingress-density',
    replaceOnce(code, '.thresh(.725,0)', '.thresh(.675,0)', 'material density threshold'),
    'Open the material threshold one more step before adding material-space motion.'
  )

  code = pushEvolutionState(
    states,
    'material-local-warp-low',
    replaceOnce(
      code,
      '.rotate(.375).thresh(.675,0)',
      '.rotate(.375)\n.modulate(solid().add(ns(2,.04).color(1,0),.5).add(ns(2,.06).color(0,1),.5),.16)\n.thresh(.675,0)',
      'material local warp insertion'
    ),
    'Introduce balanced x/y local material displacement before the threshold.'
  )

  code = pushEvolutionState(
    states,
    'material-local-warp-medium',
    replaceOnce(code, '),.16)\n.thresh(.675,0)', '),.25)\n.thresh(.675,0)', 'material local warp amount'),
    'Increase only the material-space warp host amount; feedback field energy stays fixed.'
  )

  code = pushEvolutionState(
    states,
    'split-pre-ingress-field',
    replaceOnce(code, fieldOriginal, fieldSplit, 'pre-ingress field split'),
    'Split the pre-ingress drift into explicit raster/wave and independent quantized noise responsibilities.'
  )

  code = pushEvolutionState(
    states,
    'compose-raster-hard-gate',
    replaceOnce(
      code,
      '.repeat(width/8,height/8,.5))',
      '.repeat(width/8,height/8,.5)\n.mask(osc(Math.PI*width/8,1/8/width).thresh((1+Math.cos(Math.PI/16))/2,0)))',
      'raster hard gate composition'
    ),
    'Compose the tiled shape gate with a pixel-perfect raster gate; ingress remains binary.'
  )

  code = pushEvolutionState(
    states,
    'phase-tile-gate',
    replaceOnce(
      code,
      '.repeat(width/8,height/8,.5)',
      '.repeat(width/8,height/8,ns(1,.03).posterize(4,1).pixelate(1,1).r(.5,0))',
      'dynamic tile phase'
    ),
    'Move the tile phase through a spatially uniform, dynamically quantized signal parameter.'
  )

  code = pushEvolutionState(
    states,
    'memory-soften',
    replaceOnce(code, 'src(o0)\n.modulate', 'src(o0).blur(.15)\n.modulate', 'memory blur conditioner'),
    'Add a small memory-path blur so the closed feedback state starts carrying a gentler previous-frame trace.'
  )

  code = pushEvolutionState(
    states,
    'memory-blur-sharpen-tension',
    replaceOnce(code, 'src(o0).blur(.15)\n.modulate', 'src(o0).blur(.25).sharpen(1.08)\n.modulate', 'memory blur/sharpen tension'),
    'Create a restrained blur/sharpen tension on the memory path, still before ingress.'
  )

  const forward = states.slice(1)
  const retreat = states
    .slice(0, -1)
    .reverse()
    .map((state) => ({
      ...state,
      id: `return-${state.id}`,
      intent: `Back off toward ${state.id} without resetting the performer.`
    }))

  return [...forward, ...retreat]
}

const fetchOk = async (url) => {
  try {
    const response = await fetch(url)
    return response.ok
  } catch {
    return false
  }
}

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
  const context = browser.contexts()[0]
  let page = context.pages().find((candidate) => candidate.url().includes('/packages/hydra/index.html'))
  if (!page) page = await context.newPage()
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.bringToFront()
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

const executeHarness = async (harness, args) => {
  mkdirSync(args.screenshotDir, { recursive: true })
  const { browser, page } = await connectToHydraPage(args)
  const summary = []
  try {
    const steps = harness.agentSteps
    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index]
      await page.evaluate(async (agentStep) => {
        await window.hydraAgentLivecoder.step(agentStep)
      }, step)
      await page.screenshot({
        path: path.join(args.screenshotDir, `${String(index + 1).padStart(2, '0')}-${slug(step.label)}.png`),
        fullPage: false
      })
      summary.push({ index: index + 1, label: step.label, type: step.type })
      if (step.pauseAfterMs) await delay(step.pauseAfterMs)
    }
    return summary
  } finally {
    await browser.close()
  }
}

const codeTransitionStep = ({ currentCode, targetState, delayMs, chunkSize, pauseAfterMs }) => {
  const current = String(currentCode ?? '').replace(/\r\n?/g, '\n')
  const target = String(targetState.code ?? '').replace(/\r\n?/g, '\n')
  if (current === target) {
    return {
      type: 'run',
      label: `evolve: ${targetState.id}`,
      pauseAfterMs
    }
  }

  let prefixLength = 0
  const minLength = Math.min(current.length, target.length)
  while (prefixLength < minLength && current[prefixLength] === target[prefixLength]) {
    prefixLength += 1
  }

  let suffixLength = 0
  while (
    suffixLength < current.length - prefixLength &&
    suffixLength < target.length - prefixLength &&
    current[current.length - 1 - suffixLength] === target[target.length - 1 - suffixLength]
  ) {
    suffixLength += 1
  }

  return {
    type: 'replace',
    label: `evolve: ${targetState.id}`,
    range: {
      from: prefixLength,
      to: current.length - suffixLength
    },
    replacement: target.slice(prefixLength, target.length - suffixLength),
    run: true,
    delayMs,
    chunkSize,
    pauseAfterMs
  }
}

const executeLoopHarness = async (harness, args) => {
  mkdirSync(args.screenshotDir, { recursive: true })
  mkdirSync(path.dirname(path.resolve(args.stopFile)), { recursive: true })
  const { browser, page } = await connectToHydraPage(args)
  const phrases = harness.loopPhrases
  const maxSteps = Math.max(0, Math.floor(Number(args.maxSteps) || 0))
  const phraseHold = Math.max(0, Number(args.phraseHold) || 0)
  let phraseIndex = 0
  const executed = []

  try {
    while (!existsSync(args.stopFile) && (maxSteps === 0 || phraseIndex < maxSteps)) {
      const phrase = phrases[phraseIndex % phrases.length]
      const startedAt = new Date().toISOString()
      const phraseNumber = phraseIndex + 1
      for (let stepIndex = 0; stepIndex < phrase.steps.length; stepIndex += 1) {
        const step = phrase.steps[stepIndex]
        await page.evaluate(async (agentStep) => {
          await window.hydraAgentLivecoder.step(agentStep)
        }, step)
        if (step.pauseAfterMs) await delay(step.pauseAfterMs)
        if (existsSync(args.stopFile)) break
      }

      const latestScreenshot = path.join(args.screenshotDir, 'loop-latest.png')
      await page.screenshot({ path: latestScreenshot, fullPage: false })
      const entry = {
        phraseNumber,
        phrase: phrase.id,
        startedAt,
        endedAt: new Date().toISOString(),
        stopFile: args.stopFile,
        latestScreenshot
      }
      executed.push(entry)
      await writeFile(
        path.join(args.screenshotDir, 'loop-state.json'),
        `${JSON.stringify({ running: !existsSync(args.stopFile), latest: entry, executed }, null, 2)}\n`
      )

      phraseIndex += 1
      if (phraseHold > 0 && !existsSync(args.stopFile)) await delay(phraseHold)
    }

    return executed
  } finally {
    await browser.close()
  }
}

const executeEvolvingLoopHarness = async (harness, args) => {
  mkdirSync(args.screenshotDir, { recursive: true })
  mkdirSync(path.dirname(path.resolve(args.stopFile)), { recursive: true })
  const { browser, page } = await connectToHydraPage(args)
  const states = harness.evolutionPhrases
  const maxSteps = Math.max(0, Math.floor(Number(args.maxSteps) || 0))
  const phraseHold = Math.max(0, Number(args.phraseHold) || 0)
  const delayMs = Math.max(0, Number(args.delay) || 0)
  const chunkSize = Math.max(1, Math.floor(Number(args.chunk) || 1))
  const pauseAfterMs = Math.max(0, Number(args.hold) || 0)
  let stateIndex = 0
  const executed = []

  try {
    await page.evaluate(async (code) => {
      await window.hydraAgentLivecoder.step({
        label: 'load original authored patch',
        type: 'set',
        code,
        animate: false,
        run: true
      })
    }, harness.plan.initialPatch)
    if (pauseAfterMs > 0) await delay(pauseAfterMs)

    while (!existsSync(args.stopFile) && (maxSteps === 0 || stateIndex < maxSteps)) {
      const targetState = states[stateIndex % states.length]
      const startedAt = new Date().toISOString()
      const stateNumber = stateIndex + 1
      const currentCode = await page.evaluate(() => window.hydraAgentLivecoder.getCode())
      const step = codeTransitionStep({
        currentCode,
        targetState,
        delayMs,
        chunkSize,
        pauseAfterMs
      })

      await page.evaluate(async (agentStep) => {
        await window.hydraAgentLivecoder.step(agentStep)
      }, step)
      if (step.pauseAfterMs) await delay(step.pauseAfterMs)

      const latestScreenshot = path.join(args.screenshotDir, 'loop-latest.png')
      await page.screenshot({ path: latestScreenshot, fullPage: false })
      const entry = {
        stateNumber,
        phrase: targetState.id,
        intent: targetState.intent,
        mode: 'evolve',
        startedAt,
        endedAt: new Date().toISOString(),
        stopFile: args.stopFile,
        latestScreenshot
      }
      executed.push(entry)
      await writeFile(
        path.join(args.screenshotDir, 'loop-state.json'),
        `${JSON.stringify({ running: !existsSync(args.stopFile), latest: entry, executed }, null, 2)}\n`
      )

      stateIndex += 1
      if (phraseHold > 0 && !existsSync(args.stopFile)) await delay(phraseHold)
    }

    return executed
  } finally {
    await browser.close()
  }
}

const slug = (value) => String(value ?? 'step')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 80) || 'step'

const main = async () => {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    process.stdout.write(usage)
    return
  }
  if (args.loop) args.execute = true

  const harness = compiledHarness({
    delayMs: args.delay,
    chunkSize: args.chunk,
    pauseAfterMs: args.hold
  })
  mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true })
  await writeFile(args.out, `${JSON.stringify(harness, null, 2)}\n`)

  if (!args.execute) {
    process.stdout.write(`${args.out}\n`)
    return
  }

  const summary = args.loop
    ? (args.evolve ? await executeEvolvingLoopHarness(harness, args) : await executeLoopHarness(harness, args))
    : await executeHarness(harness, args)
  process.stdout.write(`${JSON.stringify({
    out: args.out,
    screenshotDir: args.screenshotDir,
    stopFile: args.loop ? args.stopFile : undefined,
    loop: args.loop,
    evolve: args.evolve,
    executed: summary
  }, null, 2)}\n`)
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n\n${usage}`)
  process.exitCode = 1
})
