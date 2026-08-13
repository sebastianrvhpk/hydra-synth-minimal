import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(repoRoot, 'dist')
const hydraOutDir = path.join(outDir, 'hydra')
const workshopOutDir = path.join(outDir, 'workshop')

const copyRecursive = (source, target) => {
  if (!existsSync(source)) throw new Error(`Missing build input: ${source}`)
  const stats = statSync(source)
  if (stats.isDirectory()) {
    mkdirSync(target, { recursive: true })
    for (const entry of readdirSync(source)) {
      copyRecursive(path.join(source, entry), path.join(target, entry))
    }
    return
  }
  mkdirSync(path.dirname(target), { recursive: true })
  copyFileSync(source, target)
}

const resolvePackagePath = (packagePath) => {
  const packageNodeModules = path.join(repoRoot, 'packages', 'hydra', 'node_modules', packagePath)
  if (existsSync(packageNodeModules)) return packageNodeModules
  const rootNodeModules = path.join(repoRoot, 'node_modules', packagePath)
  if (existsSync(rootNodeModules)) return rootNodeModules
  throw new Error(`Missing package dependency: ${packagePath}`)
}

const copyVendorPackage = (packagePath) => {
  copyRecursive(resolvePackagePath(packagePath), path.join(hydraOutDir, 'vendor', packagePath))
}

rmSync(outDir, { recursive: true, force: true })
mkdirSync(hydraOutDir, { recursive: true })

const synthDistDir = path.join(repoRoot, 'packages', 'synth', 'dist')
for (const fileName of readdirSync(synthDistDir).filter((name) => name.endsWith('.js'))) {
  copyRecursive(
    path.join(synthDistDir, fileName),
    path.join(hydraOutDir, 'synth', fileName)
  )
}

for (const packageName of [
  'codemirror',
  '@codemirror/autocomplete',
  '@codemirror/commands',
  '@codemirror/lang-javascript',
  '@codemirror/language',
  '@codemirror/lint',
  '@codemirror/search',
  '@codemirror/state',
  '@codemirror/view',
  '@lezer/common',
  '@lezer/highlight',
  '@lezer/javascript',
  '@lezer/lr',
  '@marijn/find-cluster-break',
  'crelt',
  'style-mod',
  'w3c-keyname'
]) {
  copyVendorPackage(packageName)
}

const importMap = `{
        "imports": {
          "hydra-synth": "./synth/index.js",
          "hydra-synth/livecoding": "./synth/livecoding.js",
          "codemirror": "./vendor/codemirror/dist/index.js",
          "@codemirror/autocomplete": "./vendor/@codemirror/autocomplete/dist/index.js",
          "@codemirror/commands": "./vendor/@codemirror/commands/dist/index.js",
          "@codemirror/lang-javascript": "./vendor/@codemirror/lang-javascript/dist/index.js",
          "@codemirror/language": "./vendor/@codemirror/language/dist/index.js",
          "@codemirror/lint": "./vendor/@codemirror/lint/dist/index.js",
          "@codemirror/search": "./vendor/@codemirror/search/dist/index.js",
          "@codemirror/state": "./vendor/@codemirror/state/dist/index.js",
          "@codemirror/view": "./vendor/@codemirror/view/dist/index.js",
          "@lezer/common": "./vendor/@lezer/common/dist/index.js",
          "@lezer/highlight": "./vendor/@lezer/highlight/dist/index.js",
          "@lezer/javascript": "./vendor/@lezer/javascript/dist/index.js",
          "@lezer/lr": "./vendor/@lezer/lr/dist/index.js",
          "@marijn/find-cluster-break": "./vendor/@marijn/find-cluster-break/src/index.js",
          "crelt": "./vendor/crelt/index.js",
          "style-mod": "./vendor/style-mod/src/style-mod.js",
          "w3c-keyname": "./vendor/w3c-keyname/index.js"
        }
      }`

const workshopImportMap = JSON.stringify({
  imports: {
    'hydra-synth': '../hydra/synth/index.js'
  }
}, null, 2)

let html = readFileSync(path.join(repoRoot, 'packages', 'hydra', 'index.html'), 'utf8')
html = html.replace(/<script type="importmap">[\s\S]*?<\/script>/u, `<script type="importmap">\n      ${importMap}\n    </script>`)
copyFileSync(path.join(repoRoot, 'LICENSE'), path.join(outDir, 'LICENSE'))
mkdirSync(hydraOutDir, { recursive: true })
copyFileSync(
  path.join(repoRoot, 'packages', 'hydra', 'media-library.js'),
  path.join(hydraOutDir, 'media-library.js')
)
copyFileSync(
  path.join(repoRoot, 'packages', 'hydra', 'grammar-utilities.js'),
  path.join(hydraOutDir, 'grammar-utilities.js')
)
copyFileSync(
  path.join(repoRoot, 'packages', 'hydra', 'livecode-blocks.js'),
  path.join(hydraOutDir, 'livecode-blocks.js')
)
copyFileSync(
  path.join(repoRoot, 'packages', 'hydra', 'parameter-scopes.js'),
  path.join(hydraOutDir, 'parameter-scopes.js')
)
copyFileSync(
  path.join(repoRoot, 'packages', 'hydra', 'datastream-system.js'),
  path.join(hydraOutDir, 'datastream-system.js')
)
copyFileSync(
  path.join(repoRoot, 'packages', 'hydra', 'og.png'),
  path.join(hydraOutDir, 'og.png')
)
copyRecursive(
  path.join(repoRoot, 'packages', 'hydra', 'media'),
  path.join(hydraOutDir, 'media')
)
writeFileSync(path.join(hydraOutDir, 'index.html'), html, 'utf8')
mkdirSync(workshopOutDir, { recursive: true })
let workshopHtml = readFileSync(path.join(repoRoot, 'packages', 'workshop', 'index.html'), 'utf8')
workshopHtml = workshopHtml.replace(
  /<script type="importmap">[\s\S]*?<\/script>/u,
  '<script type="importmap">\n      ' + workshopImportMap + '\n    </script>'
)
writeFileSync(path.join(workshopOutDir, 'index.html'), workshopHtml, 'utf8')
for (const fileName of ['app.js', 'content.js', 'patches.js', 'styles.css', 'og.png']) {
  copyFileSync(
    path.join(repoRoot, 'packages', 'workshop', fileName),
    path.join(workshopOutDir, fileName)
  )
}
writeFileSync(path.join(outDir, 'index.html'), `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Hydra</title>
  <meta http-equiv="refresh" content="0; url=/hydra/" />
</head>
<body>
  <script>window.location.replace('/hydra/' + window.location.search + window.location.hash)</script>
  <p><a href="/hydra/">Open Hydra</a></p>
</body>
</html>
`, 'utf8')

console.log(`Built Vercel static app into ${outDir}`)
