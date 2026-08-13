import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

describe('live editor shell', () => {
  it('lets fullscreen code span the viewport', () => {
    expect(indexHtml).toMatch(/#live-editor \.cm-content\s*\{[^}]*max-width:\s*none;/u)
    expect(indexHtml).not.toContain('max-width: min(900px, calc(100vw - 380px));')
  })

  it('keeps hidden toolbar controls out of layout', () => {
    expect(indexHtml).toMatch(/\.live-tool\[hidden\]\s*\{\s*display:\s*none;/u)
  })

  it('backs livecode indicators with balanced contrast surfaces', () => {
    expect(indexHtml).toMatch(/\.cm-activeLine,\s*#live-editor \.cm-activeLineGutter\s*\{[^}]*background-color:\s*rgba\(3, 6, 8, 0\.22\);/u)
    expect(indexHtml).toMatch(/\.cm-parameter-chain-focus\s*\{[^}]*background:\s*rgba\(3, 28, 32, 0\.9\);/u)
    expect(indexHtml).toMatch(/\.cm-parameter-value-focus\s*\{[^}]*background:\s*rgba\(255, 204, 102, 0\.96\);/u)
    expect(indexHtml).toMatch(/const codeMaterialChromeSelector = \[[\s\S]*'\.cm-typed-flash',[\s\S]*'\.cm-parameter-scope'/u)
    expect(indexHtml).toContain('}, 420)')
  })
})
