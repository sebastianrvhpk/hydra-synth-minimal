import { stripTypeScriptTypes } from 'node:module'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from 'node:fs'
import path from 'node:path'

const packageDir = process.cwd()
const srcDir = path.join(packageDir, 'src')
const distDir = path.join(packageDir, 'dist')
const checkOnly = process.argv.includes('--check')

if (!existsSync(srcDir)) {
  console.error(`Missing src directory: ${srcDir}`)
  process.exit(1)
}

const walk = (dir) => {
  const files = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walk(fullPath))
    if (entry.isFile()) files.push(fullPath)
  }
  return files
}

const sourceFiles = walk(srcDir).filter((filePath) => filePath.endsWith('.ts') && !filePath.endsWith('.d.ts'))
const declarationFiles = walk(srcDir).filter((filePath) => filePath.endsWith('.d.ts'))
const transformedFiles = []

try {
  for (const sourceFile of sourceFiles) {
    const code = readFileSync(sourceFile, 'utf8')
    const transformed = stripTypeScriptTypes(code, { mode: 'transform' })
    const relativePath = path.relative(srcDir, sourceFile).replace(/\.ts$/u, '.js')
    transformedFiles.push({ relativePath, transformed })
  }
} catch (error) {
  console.error(`TypeScript transform failed in ${packageDir}:`)
  console.error(error)
  process.exit(1)
}

if (checkOnly) {
  console.log(`Typecheck passed for ${path.basename(packageDir)} (syntax + transform check).`)
  process.exit(0)
}

rmSync(distDir, { recursive: true, force: true })
mkdirSync(distDir, { recursive: true })

for (const { relativePath, transformed } of transformedFiles) {
  const outputPath = path.join(distDir, relativePath)
  mkdirSync(path.dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, transformed, 'utf8')
}

if (!declarationFiles.some((filePath) => path.relative(srcDir, filePath) === 'index.d.ts')) {
  console.error(`Missing declaration source: ${path.join(srcDir, 'index.d.ts')}`)
  process.exit(1)
}

for (const declarationSource of declarationFiles) {
  const relativePath = path.relative(srcDir, declarationSource)
  const declarationTarget = path.join(distDir, relativePath)
  mkdirSync(path.dirname(declarationTarget), { recursive: true })
  copyFileSync(declarationSource, declarationTarget)
}

console.log(`Built ${path.basename(packageDir)} into dist/`)
