import { parser } from '@lezer/javascript'
import { describe, expect, it } from 'vitest'
import { findCallScope } from '../call-scopes.js'

const patch = `osc(1)
  .blend(o0,ns(1).mult(.5))
  .modulateHue(o0,5)
  .out()`

const scopeAt = (needle: string, offset = 0) =>
  findCallScope(parser.parse(patch), patch.indexOf(needle) + offset)
const sourceFor = (scope: { from: number; to: number } | null) =>
  scope ? patch.slice(scope.from, scope.to) : null
const nameFor = (scope: { nameFrom: number; nameTo: number } | null) =>
  scope ? patch.slice(scope.nameFrom, scope.nameTo) : null

describe('Hydra call scopes', () => {
  it('frames a chain through the clicked method and stops at its closing parenthesis', () => {
    const scope = scopeAt('blend')

    expect(scope).toMatchObject({ kind: 'call', nodeName: 'CallExpression' })
    expect(nameFor(scope)).toBe('blend')
    expect(sourceFor(scope)).toBe('osc(1)\n  .blend(o0,ns(1).mult(.5))')
  })

  it('uses the enclosing call when the cursor is on a direct argument', () => {
    const scope = scopeAt('o0')

    expect(nameFor(scope)).toBe('blend')
    expect(sourceFor(scope)).toMatch(/\.blend\(o0,/u)
  })

  it('prefers the nearest nested call', () => {
    const scope = scopeAt('mult')

    expect(nameFor(scope)).toBe('mult')
    expect(sourceFor(scope)).toBe('ns(1).mult(.5)')
  })

  it('includes prior chain stages but excludes later stages', () => {
    const scope = scopeAt('modulateHue')

    expect(nameFor(scope)).toBe('modulateHue')
    expect(sourceFor(scope)).toMatch(/^osc\(1\)[\s\S]*\.modulateHue\(o0,5\)$/u)
    expect(sourceFor(scope)).not.toContain('.out()')
  })

  it('returns no scope between expressions', () => {
    const tree = parser.parse('osc(1)\n\nnoise(2)')
    expect(findCallScope(tree, 7)).toBeNull()
  })
})
