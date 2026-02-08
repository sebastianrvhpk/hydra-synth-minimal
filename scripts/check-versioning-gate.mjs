import { execFileSync } from 'node:child_process'

const baseRef = process.env.GITHUB_BASE_REF

if (!baseRef) {
  console.log('No GITHUB_BASE_REF provided; skipping changeset gate.')
  process.exit(0)
}

const diffOutput = execFileSync('git', ['diff', '--name-only', `origin/${baseRef}...HEAD`], {
  encoding: 'utf8'
})

const changedFiles = diffOutput
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)

const affectsPackages = changedFiles.some((filePath) =>
  filePath.startsWith('packages/') ||
  filePath === 'package.json' ||
  filePath === 'pnpm-workspace.yaml'
)

if (!affectsPackages) {
  console.log('No package surface changes detected; changeset gate passed.')
  process.exit(0)
}

const hasChangeset = changedFiles.some((filePath) =>
  filePath.startsWith('.changeset/') &&
  filePath.endsWith('.md') &&
  !filePath.endsWith('README.md')
)

if (!hasChangeset) {
  console.error('Package changes detected but no changeset file was added under .changeset/*.md')
  process.exit(1)
}

console.log('Changeset gate passed.')
