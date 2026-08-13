import { parser } from '@lezer/javascript'
import { describe, expect, it } from 'vitest'
import { findCallScope } from '../call-scopes.js'
import { datastreamPatch } from '../datastream-system.js'

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
  it('frames only the clicked pipeline stage and its arguments', () => {
    const scope = scopeAt('blend')

    expect(scope).toMatchObject({ kind: 'call', nodeName: 'CallExpression' })
    expect(nameFor(scope)).toBe('blend')
    expect(sourceFor(scope)).toBe('.blend(o0,ns(1).mult(.5))')
  })

  it('uses the enclosing call when the cursor is on a direct argument', () => {
    const scope = scopeAt('o0')

    expect(nameFor(scope)).toBe('blend')
    expect(sourceFor(scope)).toMatch(/\.blend\(o0,/u)
  })

  it('prefers the nearest nested call', () => {
    const scope = scopeAt('mult')

    expect(nameFor(scope)).toBe('mult')
    expect(sourceFor(scope)).toBe('.mult(.5)')
  })

  it('excludes both prior and later chain stages', () => {
    const scope = scopeAt('modulateHue')

    expect(nameFor(scope)).toBe('modulateHue')
    expect(sourceFor(scope)).toBe('.modulateHue(o0,5)')
    expect(sourceFor(scope)).not.toContain('.blend(')
    expect(sourceFor(scope)).not.toContain('.out()')
  })

  it('keeps a root generator call intact', () => {
    const scope = scopeAt('osc')

    expect(nameFor(scope)).toBe('osc')
    expect(sourceFor(scope)).toBe('osc(1)')
  })

  it('isolates a DATASTREAM modulate stage from its upstream pipeline', () => {
    const position = datastreamPatch.indexOf('.modulate(') + 2
    const scope = findCallScope(parser.parse(datastreamPatch), position)
    const source = scope ? datastreamPatch.slice(scope.from, scope.to) : ''

    expect(source).toMatch(/^\.modulate\([\s\S]*cc26[\s\S]*\)$/u)
    expect(source).not.toContain('src(o2)')
    expect(source).not.toContain('.scrollX(')
    expect(source.match(/\.modulate\(/gu)).toHaveLength(1)
  })

  it('returns no scope between expressions', () => {
    const tree = parser.parse('osc(1)\n\nnoise(2)')
    expect(findCallScope(tree, 7)).toBeNull()
  })
})
