import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packagesDir = path.join(rootDir, 'packages')

const requiredFilesFieldEntries = ['dist', 'README.md', 'LICENSE']
const allowedFilesFieldEntries = new Set(requiredFilesFieldEntries)
const reservedNamePattern = /^(nul|con|prn|aux|clock\$|com[1-9]|lpt[1-9])(\..*)?$/i
const forbiddenPathPattern = /(^|\/)(src|dev|assets|node_modules|\.tmp-packages)(\/|$)/i
const forbiddenFilePattern = /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?)$/i

const failures = []

const addFailure = (packageName, reason) => {
  failures.push(`[${packageName}] ${reason}`)
}

const normalizePath = (filePath) => filePath.replaceAll('\\', '/')

const walk = (dirPath) => {
  const entries = []
  for (const dirent of readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, dirent.name)
    if (dirent.isDirectory()) entries.push(...walk(fullPath))
    if (dirent.isFile()) entries.push(fullPath)
  }
  return entries
}

if (!existsSync(packagesDir)) {
  console.error('No packages directory found at ./packages')
  process.exit(1)
}

const packageDirs = readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(packagesDir, entry.name))

for (const packageDir of packageDirs) {
  const packageJsonPath = path.join(packageDir, 'package.json')
  if (!existsSync(packageJsonPath)) continue

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
  const packageName = packageJson.name ?? path.basename(packageDir)
  const filesField = Array.isArray(packageJson.files) ? packageJson.files : []
  const normalizedFilesField = filesField.map((entry) => normalizePath(entry))

  for (const required of requiredFilesFieldEntries) {
    if (!normalizedFilesField.includes(required)) {
      addFailure(packageName, `missing package.json files entry: ${required}`)
    }
  }

  for (const entry of normalizedFilesField) {
    if (!allowedFilesFieldEntries.has(entry)) {
      addFailure(packageName, `unexpected package.json files entry: ${entry}`)
    }
    if (forbiddenPathPattern.test(entry) || forbiddenFilePattern.test(entry) || reservedNamePattern.test(path.basename(entry))) {
      addFailure(packageName, `forbidden package.json files entry: ${entry}`)
    }
  }

  const distDir = path.join(packageDir, 'dist')
  const indexJs = path.join(distDir, 'index.js')
  const indexDts = path.join(distDir, 'index.d.ts')
  const readme = path.join(packageDir, 'README.md')
  const license = path.join(packageDir, 'LICENSE')

  if (!existsSync(distDir) || !statSync(distDir).isDirectory()) addFailure(packageName, 'missing dist directory')
  if (!existsSync(indexJs)) addFailure(packageName, 'missing dist/index.js')
  if (!existsSync(indexDts)) addFailure(packageName, 'missing dist/index.d.ts')
  if (!existsSync(readme)) addFailure(packageName, 'missing README.md')
  if (!existsSync(license)) addFailure(packageName, 'missing LICENSE')

  const exportEntry = packageJson.exports?.['.']
  const importTarget = typeof exportEntry === 'string' ? exportEntry : exportEntry?.import
  const typeTarget = typeof exportEntry === 'object' ? exportEntry?.types : undefined
  if (importTarget !== './dist/index.js') addFailure(packageName, 'exports["."].import must be ./dist/index.js')
  if (typeTarget !== './dist/index.d.ts') addFailure(packageName, 'exports["."].types must be ./dist/index.d.ts')

  const packageFiles = walk(packageDir).map((filePath) => normalizePath(path.relative(packageDir, filePath)))
  for (const relativePath of packageFiles) {
    if (reservedNamePattern.test(path.basename(relativePath))) {
      addFailure(packageName, `reserved filename detected: ${relativePath}`)
    }

    if (relativePath.startsWith('dist/')) {
      if (forbiddenPathPattern.test(relativePath) || forbiddenFilePattern.test(relativePath)) {
        addFailure(packageName, `forbidden file in dist: ${relativePath}`)
      }
    }
  }
}

if (failures.length > 0) {
  console.error('Package verification failed:\n')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('Package verification passed for all workspace packages.')
