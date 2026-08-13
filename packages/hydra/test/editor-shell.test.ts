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
})
