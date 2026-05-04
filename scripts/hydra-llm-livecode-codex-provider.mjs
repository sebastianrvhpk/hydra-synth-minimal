#!/usr/bin/env node

import { mkdirSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'

const usage = `Usage:
  node scripts/hydra-llm-livecode-codex-provider.mjs [--model MODEL] [--reasoning-effort low] [--codex codex] [--out-dir DIR]

Reads one Hydra livecoding decision packet as JSON on stdin.
Calls codex exec in read-only, ephemeral mode.
Prints one decision JSON object on stdout.
`

const parseArgs = (argv) => {
  const args = {
    model: '',
    reasoningEffort: '',
    codex: 'codex',
    outDir: path.resolve('.tmp', 'hydra-llm-livecode-codex-provider'),
    help: false
  }

  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index]
    if (raw === '--') continue
    if (raw === '--help' || raw === '-h') {
      args.help = true
      continue
    }
    if (!raw.startsWith('--')) throw new Error(`Unexpected positional argument: ${raw}`)
    const [key, inlineValue] = raw.slice(2).split('=', 2)
    const value = inlineValue ?? argv[index + 1]
    if (inlineValue === undefined) index += 1
    if (value === undefined) throw new Error(`Missing value for --${key}`)
    const normalizedKey = key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
    if (!(normalizedKey in args)) throw new Error(`Unknown option --${key}`)
    args[normalizedKey] = value
  }

  return args
}

const readStdin = async () => {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8')
}

const buildPrompt = (packet) => `You are the LLM decision provider for a Hydra/WebGPU livecoding harness.

You receive a JSON packet containing:
- current Hydra code
- heuristic module/cue extraction
- current render status
- recent move history
- the user's Hydra feedback grammar context

Return exactly one JSON object matching the provided output schema.
Do not write Markdown. Do not include commentary outside JSON.

Task:
Make one bounded livecoding decision. Prefer one local edit:
- replace
- insert
- delete
- run
- wait
- none

Avoid whole-buffer "set" unless the packet explicitly allows it. If no precise local move is justified, return action "none".

Reasoning requirements:
- Read the patch as a modular video-synth circuit.
- Name memory, field, material, gate, ingress, post-drift, conditioner, routing.
- Explain the math/signal reason for the edit.
- Keep feedback displacement fields pixel-normalized unless explicitly changing energy.
- Preserve hard ingress gating and material-before-mask logic by default.
- Do not use ()=>time.
- Do not introduce network, DOM, external media, eval, dynamic imports, or browser APIs.

Decision packet:
${JSON.stringify(packet, null, 2)}
`

const extractJson = (text) => {
  const trimmed = String(text ?? '').trim()
  if (!trimmed) throw new Error('codex exec produced an empty final message.')
  try {
    return JSON.parse(trimmed)
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/)
    if (!match) throw new Error(`codex exec final message was not JSON: ${trimmed.slice(0, 500)}`)
    return JSON.parse(match[0])
  }
}

const quotePowerShellLiteral = (value) => `'${String(value).replace(/'/gu, "''")}'`

const codexArguments = ({ args, lastMessageFile }) => {
  const commandArgs = [
    'exec',
    '--sandbox',
    'read-only',
    '--ephemeral',
    '--skip-git-repo-check',
    '--output-schema',
    path.resolve('scripts', 'hydra-llm-livecode-decision-schema.json'),
    '--output-last-message',
    lastMessageFile,
    '-'
  ]
  if (args.model) commandArgs.splice(1, 0, '--model', args.model)
  if (args.reasoningEffort) {
    commandArgs.splice(1, 0, '-c', `model_reasoning_effort="${args.reasoningEffort}"`)
  }
  return commandArgs
}

const runCodex = async ({ args, prompt, promptFile, lastMessageFile }) => {
  const commandArgs = codexArguments({ args, lastMessageFile })

  if (process.platform === 'win32') {
    const psCommand = [
      '$ErrorActionPreference = "Stop"',
      `Get-Content -LiteralPath ${quotePowerShellLiteral(promptFile)} -Raw | & ${quotePowerShellLiteral(args.codex)} ${commandArgs.map(quotePowerShellLiteral).join(' ')}`
    ].join('; ')
    const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psCommand], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe']
    })

    const stdout = []
    const stderr = []
    child.stdout.on('data', (chunk) => stdout.push(Buffer.from(chunk)))
    child.stderr.on('data', (chunk) => stderr.push(Buffer.from(chunk)))
    const code = await new Promise((resolve) => child.on('close', resolve))
    if (code !== 0) {
      throw new Error([
        `codex exec exited ${code}`,
        Buffer.concat(stderr).toString('utf8').slice(0, 3000),
        Buffer.concat(stdout).toString('utf8').slice(0, 3000)
      ].filter(Boolean).join('\n'))
    }
    return
  }

  const child = spawn(args.codex, commandArgs, {
    cwd: process.cwd(),
    shell: false,
    stdio: ['pipe', 'pipe', 'pipe']
  })

  const stdout = []
  const stderr = []
  child.stdout.on('data', (chunk) => stdout.push(Buffer.from(chunk)))
  child.stderr.on('data', (chunk) => stderr.push(Buffer.from(chunk)))
  child.stdin.end(prompt)

  const code = await new Promise((resolve) => child.on('close', resolve))
  if (code !== 0) {
    throw new Error([
      `codex exec exited ${code}`,
      Buffer.concat(stderr).toString('utf8').slice(0, 3000),
      Buffer.concat(stdout).toString('utf8').slice(0, 3000)
    ].filter(Boolean).join('\n'))
  }
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    process.stdout.write(usage)
    return
  }

  mkdirSync(args.outDir, { recursive: true })
  const raw = await readStdin()
  const packet = JSON.parse(raw)
  const prompt = buildPrompt(packet)
  const stamp = new Date().toISOString().replace(/[:.]/gu, '-')
  const promptFile = path.join(args.outDir, `codex-provider-${stamp}.prompt.txt`)
  const lastMessageFile = path.join(args.outDir, `codex-provider-${stamp}.json`)
  await writeFile(promptFile, prompt)

  await runCodex({ args, prompt, promptFile, lastMessageFile })
  const finalText = await readFile(lastMessageFile, 'utf8')
  const decision = extractJson(finalText)
  process.stdout.write(`${JSON.stringify(decision, null, 2)}\n`)
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n\n${usage}`)
  process.exitCode = 1
})
