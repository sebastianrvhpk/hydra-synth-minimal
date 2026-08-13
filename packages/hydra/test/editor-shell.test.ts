import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

const codePaletteNames = [
  'text',
  'number',
  'string',
  'keyword',
  'atom',
  'definition',
  'property',
  'type',
  'comment',
  'meta',
  'punctuation',
  'invalid'
]

const relativeLuminance = (hex: string) => {
  const channels = hex.match(/[a-f\d]{2}/giu)?.map((channel) => Number.parseInt(channel, 16) / 255) ?? []
  const linear = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

describe('live editor shell', () => {
  it('lets fullscreen code span the viewport', () => {
    expect(indexHtml).toMatch(/#live-editor \.cm-content\s*\{[^}]*max-width:\s*none;/u)
    expect(indexHtml).not.toContain('max-width: min(900px, calc(100vw - 380px));')
  })

  it('keeps hidden toolbar controls out of layout', () => {
    expect(indexHtml).toMatch(/\.live-tool\[hidden\]\s*\{\s*display:\s*none;/u)
  })

  it('loads the canonical Hydra example collection instead of generated recipes', () => {
    expect(indexHtml).toContain("import { createHydraExamplePicker } from './hydra-examples.js'")
    expect(indexHtml).toContain('const pickHydraExample = createHydraExamplePicker()')
    expect(indexHtml).toContain('runtime.hush()')
    expect(indexHtml).not.toContain('randomSketchFactories')
    expect(indexHtml).not.toContain("name: 'gpu bloom'")
  })

  it('uses a syntax palette with WCAG contrast against its local black keyline', () => {
    for (const name of codePaletteNames) {
      const color = indexHtml.match(new RegExp(`--code-${name}:\\s*(#[a-f\\d]{6});`, 'iu'))?.[1]
      expect(color, `missing --code-${name}`).toBeDefined()
      const contrastAgainstBlack = (relativeLuminance(color ?? '#000000') + 0.05) / 0.05
      expect(contrastAgainstBlack, `--code-${name} contrast`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('backs livecode indicators with balanced contrast surfaces', () => {
    expect(indexHtml).toMatch(/\.cm-activeLine,\s*#live-editor \.cm-activeLineGutter\s*\{[^}]*background:\s*rgba\(3, 6, 8, 0\.1\);/u)
    expect(indexHtml).toMatch(/#live-editor \.cm-activeLine\s*\{\s*box-shadow:\s*inset 3px 0 0 var\(--magenta\);/u)
    expect(indexHtml).toMatch(/\.cm-parameter-chain-focus\s*\{[^}]*background:\s*var\(--scope-surface\);/u)
    expect(indexHtml).toMatch(/\.cm-parameter-value-focus\s*\{[^}]*background:\s*rgba\(255, 220, 130, 0\.98\);/u)
    expect(indexHtml).toMatch(/\.cm-call-scope\s*\{[^}]*background:\s*var\(--call-surface\);/u)
    expect(indexHtml).toMatch(/\.cm-cursor-primary\s*\{[^}]*border-left:\s*3px solid var\(--magenta\);/u)
    expect(indexHtml).toMatch(/\.cm-selectionLayer\s*\{[^}]*z-index:\s*120 !important;[^}]*pointer-events:\s*none;/u)
    expect(indexHtml).toMatch(/\.cm-focused \.cm-selectionBackground\s*\{[^}]*background:\s*rgba\(117, 247, 255, 0\.18\);[^}]*rgba\(255, 255, 255, 0\.96\)[^}]*rgba\(3, 6, 8, 0\.98\)/u)
    expect(indexHtml).toMatch(/\.cm-readable-selection\s*\{[^}]*background:\s*var\(--selection-surface\) !important;[^}]*color:\s*var\(--selection-ink\) !important;/u)
    expect(indexHtml).toMatch(/\.cm-content\s*\{[^}]*-webkit-text-stroke:\s*0\.5px var\(--code-keyline\);/u)
    expect(indexHtml).toContain('syntaxHighlighting(classHighlighter)')
    expect(indexHtml).toContain("const readableSelectionMark = Decoration.mark({ class: 'cm-readable-selection' })")
    expect(indexHtml).toContain('if (!selection.empty) return Decoration.none')
    expect(indexHtml).toContain("boundary: Decoration.mark({ class: 'cm-call-scope' })")
    expect(indexHtml).toContain("name: Decoration.mark({ class: 'cm-call-scope-name' })")
    expect(indexHtml).toContain('const scope = findCallScope(syntaxTree(state), selection.head)')
    expect(indexHtml).toContain('if (!selection.empty) return Decoration.none')
    expect(indexHtml).toContain('ranges.push(callScopeMarks.name.range(scope.nameFrom, scope.nameTo))')
    expect(indexHtml).toContain("const selectionRects = snapshot.chromeRects.filter((rect) => rect.kind === 'selection')")
    expect(indexHtml).toContain('selectionRects.forEach((rect) => paintCodeMaterialChromeRect(context, rect))')
    expect(indexHtml).toMatch(/const codeMaterialChromeSelector = \[[\s\S]*'\.cm-typed-flash',[\s\S]*'\.cm-readable-selection',[\s\S]*'\.cm-parameter-scope',[\s\S]*'\.cm-call-scope'/u)
    expect(indexHtml).toContain('}, 420)')
  })
})
