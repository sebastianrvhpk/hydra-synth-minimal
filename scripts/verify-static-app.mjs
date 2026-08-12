import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

const target = path.resolve(process.cwd(), process.argv[2] ?? 'index.html')
const verifyImports = !process.argv.includes('--structure-only')
const failures = []

const requiredAppMarkers = [
  'createHydraBrowserRuntime',
  'live-panel',
  'saveSketchToUrl',
  'loadRandomSketch',
  'ResizeObserver',
  'welcome-modal',
  'record-popover',
  'options-panel',
  'code-material-canvas',
  'attachCodeMaterial'
]

const stripQuery = (value) => value.split(/[?#]/u, 1)[0] ?? value

const resolveFile = (fromDirectory, specifier) => {
  const resolved = path.resolve(fromDirectory, stripQuery(specifier))
  return existsSync(resolved) && statSync(resolved).isFile() ? resolved : null
}

const verifyModuleGraph = (entryFiles, imports, htmlDirectory) => {
  const visited = new Set()
  const queue = entryFiles.slice()

  while (queue.length > 0) {
    const modulePath = queue.pop()
    if (!modulePath || visited.has(modulePath)) continue
    visited.add(modulePath)

    const code = readFileSync(modulePath, 'utf8')
    const source = ts.createSourceFile(modulePath, code, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS)
    const specifiers = []
    const visit = (node) => {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        specifiers.push(node.moduleSpecifier.text)
      }
      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments.length === 1 &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        specifiers.push(node.arguments[0].text)
      }
      ts.forEachChild(node, visit)
    }
    visit(source)

    for (const specifier of specifiers) {
      if (!specifier || /^(?:data:|https?:|node:)/u.test(specifier)) continue

      let resolved = null
      if (specifier.startsWith('.')) {
        resolved = resolveFile(path.dirname(modulePath), specifier)
      } else if (specifier.startsWith('/')) {
        resolved = resolveFile(htmlDirectory, `.${specifier}`)
      } else {
        const mapped = imports[specifier]
        if (typeof mapped === 'string') resolved = resolveFile(htmlDirectory, mapped)
      }

      if (!resolved) {
        failures.push(`unresolved module "${specifier}" imported by ${path.relative(process.cwd(), modulePath)}`)
        continue
      }
      if (/\.(?:js|mjs)$/u.test(resolved)) queue.push(resolved)
    }
  }
}

const verifyInlineModuleBindings = (html) => {
  const modulePattern = /<script\s+type="module">([\s\S]*?)<\/script>/gu
  for (const match of html.matchAll(modulePattern)) {
    const code = match[1] ?? ''
    const virtualPath = `${target}.inline-${match.index ?? 0}.mjs`
    const options = {
      allowJs: true,
      checkJs: true,
      noEmit: true,
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      skipLibCheck: true,
      strict: false,
      lib: ['lib.esnext.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts']
    }
    const defaultHost = ts.createCompilerHost(options)
    const sourceFile = ts.createSourceFile(virtualPath, code, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS)
    const host = {
      ...defaultHost,
      fileExists: (fileName) => fileName === virtualPath || defaultHost.fileExists(fileName),
      readFile: (fileName) => fileName === virtualPath ? code : defaultHost.readFile(fileName),
      getSourceFile: (fileName, languageVersion, onError, shouldCreateNewSourceFile) => (
        fileName === virtualPath
          ? sourceFile
          : defaultHost.getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile)
      )
    }
    const program = ts.createProgram([virtualPath], options, host)
    const htmlLineOffset = html.slice(0, match.index ?? 0).split('\n').length
    for (const diagnostic of ts.getPreEmitDiagnostics(program)) {
      if (diagnostic.code !== 2304 && diagnostic.code !== 2552) continue
      const position = diagnostic.file && typeof diagnostic.start === 'number'
        ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
        : null
      const line = position ? htmlLineOffset + position.line : htmlLineOffset
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')
      failures.push(`inline app module has an unresolved identifier at ${path.relative(process.cwd(), target)}:${line}: ${message}`)
    }
  }
}

if (!existsSync(target)) {
  failures.push(`missing app entry: ${target}`)
} else {
  const html = readFileSync(target, 'utf8')
  verifyInlineModuleBindings(html)
  for (const marker of requiredAppMarkers) {
    if (!html.includes(marker)) failures.push(`app entry is missing required feature marker: ${marker}`)
  }

  const importMapMatch = /<script\s+type="importmap">([\s\S]*?)<\/script>/u.exec(html)
  if (!importMapMatch?.[1]) {
    failures.push('app entry must contain an import map')
  } else {
    try {
      const parsed = JSON.parse(importMapMatch[1])
      const imports = parsed?.imports && typeof parsed.imports === 'object' ? parsed.imports : {}
      const htmlDirectory = path.dirname(target)
      const entryFiles = []
      for (const [specifier, mapped] of Object.entries(imports)) {
        if (typeof mapped !== 'string') {
          failures.push(`import map target for "${specifier}" must be a string`)
          continue
        }
        if (!verifyImports) continue
        const resolved = resolveFile(htmlDirectory, mapped)
        if (!resolved) {
          failures.push(`import map target for "${specifier}" does not exist: ${mapped}`)
          continue
        }
        if (/\.(?:js|mjs)$/u.test(resolved)) entryFiles.push(resolved)
      }
      if (verifyImports) verifyModuleGraph(entryFiles, imports, htmlDirectory)
    } catch (error) {
      failures.push(`invalid import map: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

if (failures.length > 0) {
  console.error('Static app verification failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`Static app verified: ${path.relative(process.cwd(), target)}`)
