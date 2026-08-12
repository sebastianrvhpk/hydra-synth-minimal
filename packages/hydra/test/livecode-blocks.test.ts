import { describe, expect, it } from 'vitest'
import { findLiveCodeBlock, splitLiveExecutionBlocks } from '../livecode-blocks.js'

const patch = `osc(10)
  .rotate(.2)
  .out()

noise(3)
  .color(1, 0, 0)
  .out()

speed = .5`

describe('Hydra livecode blocks', () => {
  it('finds the complete contiguous block from any line under the cursor', () => {
    const expected = `osc(10)
  .rotate(.2)
  .out()`

    for (const cursor of [0, patch.indexOf('.rotate'), patch.indexOf('.out()')]) {
      expect(findLiveCodeBlock(patch, cursor)).toEqual({
        code: expected,
        range: { from: 0, to: expected.length }
      })
    }
  })

  it('uses blank or whitespace-only lines as block separators', () => {
    const code = 'osc().out()\n   \n\nnoise().out()'
    const noiseFrom = code.indexOf('noise')

    expect(findLiveCodeBlock(code, noiseFrom)).toEqual({
      code: 'noise().out()',
      range: { from: noiseFrom, to: code.length }
    })
    expect(findLiveCodeBlock(code, code.indexOf('   ') + 1)).toBeNull()
  })

  it('supports the final block and clamps a cursor beyond the document', () => {
    const expected = 'speed = .5'
    const from = patch.lastIndexOf(expected)

    expect(findLiveCodeBlock(patch, patch.length + 100)).toEqual({
      code: expected,
      range: { from, to: patch.length }
    })
  })

  it('preserves ranges with CRLF line endings', () => {
    const code = 'osc()\r\n  .out()\r\n\r\nnoise().out()'
    const from = code.indexOf('noise')

    expect(findLiveCodeBlock(code, from)).toEqual({
      code: 'noise().out()',
      range: { from, to: code.length }
    })
  })

  it('splits full-buffer execution with the same blank-line rule', () => {
    expect(splitLiveExecutionBlocks(patch)).toEqual([
      'osc(10)\n  .rotate(.2)\n  .out()',
      'noise(3)\n  .color(1, 0, 0)\n  .out()',
      'speed = .5'
    ])
  })
})
