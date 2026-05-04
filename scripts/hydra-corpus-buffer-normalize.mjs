#!/usr/bin/env node

import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const usage = `Usage:
  node scripts/hydra-corpus-buffer-normalize.mjs --inputDir=docs/hydra-curated-corpus-ported-candidates-v3 --outDir=docs/hydra-curated-corpus-ported-candidates-v4

Creates a conservative buffer-normalized corpus pass.
Only collapses display alias buffers when the alias buffer is not read anywhere else.
`

const parseArgs = (argv) => {
  const args = {
    inputDir: 'docs/hydra-curated-corpus-ported-candidates-v3',
    outDir: 'docs/hydra-curated-corpus-ported-candidates-v4',
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

const stripComments = (source) =>
  source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/(^|[^:])\/\/.*$/gmu, '$1')

const countToken = (source, token) => [...source.matchAll(new RegExp(`\\b${token}\\b`, 'gu'))].length

const aliasForms = [
  {
    kind: 'display-alias:solid-layer-src',
    regex: /solid\s*\(\s*\)\s*\.layer\s*\(\s*src\s*\(\s*(o\d+)\s*\)\s*\)\s*\.out\s*\(\s*(o\d+)\s*\)\s*;?\s*render\s*\(\s*\2\s*\)\s*;?/gu,
    replacement: (sourceBuffer) => `render(${sourceBuffer});`
  },
  {
    kind: 'display-alias:solid-layer-buffer',
    regex: /solid\s*\(\s*\)\s*\.layer\s*\(\s*(o\d+)\s*\)\s*\.out\s*\(\s*(o\d+)\s*\)\s*;?\s*render\s*\(\s*\2\s*\)\s*;?/gu,
    replacement: (sourceBuffer) => `render(${sourceBuffer});`
  },
  {
    kind: 'display-alias:src-copy',
    regex: /src\s*\(\s*(o\d+)\s*\)\s*\.out\s*\(\s*(o\d+)\s*\)\s*;?\s*render\s*\(\s*\2\s*\)\s*;?/gu,
    replacement: (sourceBuffer) => `render(${sourceBuffer});`
  }
]

const normalizeCode = (code, file) => {
  let output = code
    .replace(/Final v3 pass:/u, 'Final v3 pass + v4 buffer-normalized pass:')
    .replace(/\/\/ Run shared-v3\.js once before this patch\./u, '// Run shared-v4.js once before this patch.')
  const audit = []

  for (const form of aliasForms) {
    output = output.replace(form.regex, (match, sourceBuffer, aliasBuffer) => {
      const stripped = stripComments(output)
      const aliasUseCount = countToken(stripped, aliasBuffer)
      if (aliasUseCount !== 2) {
        audit.push({
          file,
          kind: `${form.kind}:skipped`,
          sourceBuffer,
          aliasBuffer,
          reason: `alias buffer has ${aliasUseCount} token uses, so it may be read or written elsewhere`
        })
        return match
      }

      audit.push({
        file,
        kind: form.kind,
        sourceBuffer,
        aliasBuffer,
        reason: 'alias buffer only appears in out(alias) and render(alias); render source directly'
      })
      return form.replacement(sourceBuffer)
    })
  }

  return { code: output, audit }
}

const renderIndex = ({ files, audit }) => `# Hydra Curated Corpus Ported Candidates V4

This directory is a conservative buffer-normalized pass over the v3 port candidates.

Use:

\`\`\`js
// run this once
shared-v4.js

// then evaluate individual pattern files
pattern_002.v4.js
\`\`\`

Normalization rule:

- collapse display-only alias buffers such as \`solid().layer(src(o0)).out(o1); render(o1)\` into \`render(o0)\`
- only apply when the alias buffer is not read anywhere else
- do not inline feedback memory, staging buffers, display postprocess buffers, or source-construction buffers

Applied changes: ${audit.filter((entry) => !entry.kind.endsWith(':skipped')).length}

## Files

${files.map((file) => `- [${file}](./${file})`).join('\n')}
`

const renderAudit = ({ audit }) => {
  const applied = audit.filter((entry) => !entry.kind.endsWith(':skipped'))
  const skipped = audit.filter((entry) => entry.kind.endsWith(':skipped'))
  const lines = [
    '# Hydra V4 Buffer Normalization Audit',
    '',
    'This pass only collapses display-only aliases. It intentionally does not inline buffers that may carry feedback memory, temporal staging, postprocessed display state, or source construction.',
    '',
    `Applied changes: ${applied.length}`,
    `Skipped candidates: ${skipped.length}`,
    '',
    '## Applied',
    ''
  ]

  if (!applied.length) lines.push('- none')
  for (const entry of applied) {
    lines.push(`- ${entry.file}: ${entry.kind} ${entry.sourceBuffer} -> ${entry.aliasBuffer}; ${entry.reason}`)
  }

  lines.push('', '## Skipped', '')
  if (!skipped.length) lines.push('- none')
  for (const entry of skipped) {
    lines.push(`- ${entry.file}: ${entry.kind} ${entry.sourceBuffer} -> ${entry.aliasBuffer}; ${entry.reason}`)
  }

  lines.push(
    '',
    '## Math Policy',
    '',
    'Safe:',
    '',
    '```js',
    'solid().layer(src(o0)).out(o1)',
    'render(o1)',
    '```',
    '',
    'when `o1` is not read anywhere else. This is only a display alias, so it becomes:',
    '',
    '```js',
    'render(o0)',
    '```',
    '',
    'Not collapsed:',
    '',
    '- buffers that are read by `src(oN)` in another chain',
    '- buffers that receive their own feedback loop',
    '- buffers that apply display-only transforms before render',
    '- buffers that stage material, masks, fields, or artifact branches',
    ''
  )

  return `${lines.join('\n')}\n`
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    console.log(usage)
    return
  }

  await mkdir(args.outDir, { recursive: true })
  await copyFile(path.join(args.inputDir, 'shared-v3.js'), path.join(args.outDir, 'shared-v4.js'))

  const entries = (await readdir(args.inputDir))
    .filter((file) => file.endsWith('.v3.js'))
    .sort()

  const outputFiles = []
  const audit = []

  for (const file of entries) {
    const source = await readFile(path.join(args.inputDir, file), 'utf8')
    const normalized = normalizeCode(source, file)
    const outName = file.replace(/\.v3\.js$/u, '.v4.js')
    await writeFile(path.join(args.outDir, outName), normalized.code)
    outputFiles.push(outName)
    audit.push(...normalized.audit)
  }

  await writeFile(path.join(args.outDir, 'buffer-normalization-audit.json'), `${JSON.stringify(audit, null, 2)}\n`)
  await writeFile(path.join(args.outDir, 'buffer-normalization-audit.md'), renderAudit({ audit }))
  await writeFile(path.join(args.outDir, 'index.md'), renderIndex({ files: outputFiles, audit }))

  console.log(`Wrote ${outputFiles.length} v4 candidates to ${args.outDir}`)
  console.log(`Applied buffer normalizations: ${audit.filter((entry) => !entry.kind.endsWith(':skipped')).length}`)
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exit(1)
})
