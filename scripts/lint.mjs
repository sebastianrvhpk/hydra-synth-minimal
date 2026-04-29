import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const failures = []

const fail = (message) => failures.push(message)

const packageDirs = ['packages/synth', 'packages/hydra']
for (const dir of packageDirs) {
  if (!existsSync(path.join(rootDir, dir))) {
    fail(`Missing required package directory: ${dir}`)
  }
}

for (const deprecatedDir of ['src', 'dev', 'assets']) {
  if (existsSync(path.join(rootDir, deprecatedDir))) {
    fail(`Deprecated directory must be removed: ${deprecatedDir}`)
  }
}

for (const pkgDir of packageDirs) {
  const packageJsonPath = path.join(rootDir, pkgDir, 'package.json')
  if (!existsSync(packageJsonPath)) continue
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
  if (packageJson.exports?.['./src']) {
    fail(`${pkgDir}/package.json exposes forbidden deep src export`)
  }
}

const forbiddenPatterns = [
  {
    pattern: /\bmakeGlobal\b/u,
    allow: new Set([
      'packages/synth/README.md',
      'packages/synth/src/index.d.ts',
      'packages/synth/src/legacy-hydra.ts',
      'packages/synth/test/legacy-hydra.test.ts'
    ])
  },
  {
    pattern: /\bloadScript\s*\(/u,
    allow: new Set([
      'packages/synth/src/index.d.ts',
      'packages/synth/src/legacy-hydra.ts'
    ])
  }
]
const skippedDirectories = new Set(['node_modules', 'dist', '.npm-cache', '.vite', '.vite-temp'])

const scan = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!skippedDirectories.has(entry.name)) scan(fullPath)
      continue
    }
    if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js') || entry.name.endsWith('.md'))) {
      const relative = path.relative(rootDir, fullPath).replaceAll('\\', '/')
      const content = readFileSync(fullPath, 'utf8')
      for (const { pattern, allow } of forbiddenPatterns) {
        if (pattern.test(content) && !allow.has(relative)) {
          fail(`Forbidden deprecated API reference (${pattern}) found in ${relative}`)
        }
      }
      if (relative.startsWith('packages/synth/src/core/') && /\beval\s*\(/u.test(content)) {
        fail(`Synth core cannot include eval() usage: ${relative}`)
      }
    }
  }
}

scan(path.join(rootDir, 'packages'))

if (failures.length > 0) {
  console.error('Lint checks failed:\n')
  for (const message of failures) console.error(`- ${message}`)
  process.exit(1)
}

console.log('Lint checks passed.')
