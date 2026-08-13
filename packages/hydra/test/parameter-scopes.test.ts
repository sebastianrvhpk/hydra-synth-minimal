import { parser } from '@lezer/javascript'
import { describe, expect, it } from 'vitest'
import { findParameterScopes } from '../parameter-scopes.js'

const patch = `osc(Math.PI,osc(Math.PI*2/3,.125).rotate(.5).mult(.0125),ns(1,.25).add(.5).mult(1))
  .blend(o0,ns(1,.25).posterize(8).pixelate(5,5).add(.25).mult(1.5).blend(o0,ns(.5,.25).thresh(0,0)))
  .modulateHue(prevN(o0,25),35)
  .hue(.001)
  .out()`

const scopesAt = (needle: string) => findParameterScopes(parser.parse(patch), patch.indexOf(needle))
const sourceFor = (scope: { from: number; to: number }) => patch.slice(scope.from, scope.to)

describe('Hydra parameter scopes', () => {
  it('highlights a complete texture chain used as an argument', () => {
    const scopes = scopesAt('pixelate')

    expect(scopes).toHaveLength(1)
    expect(scopes[0]).toMatchObject({ kind: 'chain', role: 'focus' })
    expect(sourceFor(scopes[0]!)).toBe(
      'ns(1,.25).posterize(8).pixelate(5,5).add(.25).mult(1.5).blend(o0,ns(.5,.25).thresh(0,0))'
    )
  })

  it('keeps the local scalar visible while focusing its enclosing texture chain', () => {
    const scopes = scopesAt('8')

    expect(scopes.map(({ kind, role }) => ({ kind, role }))).toEqual([
      { kind: 'value', role: 'value' },
      { kind: 'chain', role: 'focus' }
    ])
    expect(sourceFor(scopes[0]!)).toBe('8')
    expect(sourceFor(scopes[1]!)).toMatch(/^ns\(1,.25\).*\.blend\(/u)
  })

  it('shows both the focused nested texture and its parent texture chain', () => {
    const scopes = scopesAt('thresh')

    expect(scopes.map(({ kind, role }) => ({ kind, role }))).toEqual([
      { kind: 'chain', role: 'focus' },
      { kind: 'chain', role: 'parent' }
    ])
    expect(sourceFor(scopes[0]!)).toBe('ns(.5,.25).thresh(0,0)')
    expect(sourceFor(scopes[1]!)).toMatch(/^ns\(1,.25\).*\.blend\(/u)
  })

  it('focuses ordinary scalar and expression parameters when no texture encloses them', () => {
    const scalarScopes = scopesAt('35')
    const expressionScopes = scopesAt('Math.PI,')

    expect(sourceFor(scalarScopes[0]!)).toBe('35')
    expect(scalarScopes[0]).toMatchObject({ kind: 'value', role: 'focus' })
    expect(sourceFor(expressionScopes[0]!)).toBe('Math.PI')
    expect(expressionScopes[0]).toMatchObject({ kind: 'value', role: 'focus' })
  })

  it('returns no parameter scope for the top-level output chain', () => {
    expect(scopesAt('.out')).toEqual([])
  })
})
