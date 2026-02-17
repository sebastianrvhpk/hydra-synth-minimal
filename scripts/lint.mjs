import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const failures = []

const fail = (message) => failures.push(message)

const packageDirs = ['packages/core', 'packages/browser', 'packages/livecoding']
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
  /\bmakeGlobal\b/u,
  /\bloadScript\s*\(/u
]

const scan = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) scan(fullPath)
    if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js') || entry.name.endsWith('.md'))) {
      const relative = path.relative(rootDir, fullPath).replaceAll('\\', '/')
      const content = readFileSync(fullPath, 'utf8')
      for (const pattern of forbiddenPatterns) {
        if (pattern.test(content)) fail(`Forbidden deprecated API reference (${pattern}) found in ${relative}`)
      }
      if (relative.startsWith('packages/core/') && /\beval\s*\(/u.test(content)) {
        fail(`Core package cannot include eval() usage: ${relative}`)
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
