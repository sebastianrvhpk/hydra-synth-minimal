import { describe, expect, it } from 'vitest'
import { findLiveCodeBlock, splitLiveExecutionBlocks } from '../livecode-blocks.js'

const patch = `osc(10)
  .rotate(.2)
  .out()

noise(3)
  .color(1, 0, 0)
  .out()

speed = .5`

const trypophobiaPatch = `// licensed with CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/

//random trypophobia - changes everytime you load it!
//by Ritchse
//instagram.com/ritchse

function r(min=0,max=1) { return Math.random()*(max-min)+min; }

solid(1,1,1)
  .diff(shape([4,4,4,24].smooth().fast(.5),r(0.6,0.93),.09).repeat(20,10))
  .modulateScale(osc(8).rotate(r(-.5,.5)),.52)
  .out()`

const phoenixPatch = `// "egg of the phoenix"

speed=1.2
shape(99,.15,.5).color(0,1,2)

.diff( shape(240,.5,0).scrollX(.05).rotate( ()=>time/10 ).color(1,0,.75) )
.diff( shape(99,.4,.002).scrollX(.10).rotate( ()=>time/20 ).color(1,0,.75) )

.modulateScale(
  shape(240,.5,0).scrollX(.05).rotate( ()=>time/10 )
  , ()=>(Math.sin(time/3)*.2)+.2 )

.scale(1.6,.6,1)
.out()`

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

  it('keeps a declaration preamble with the patch that consumes it', () => {
    expect(splitLiveExecutionBlocks(trypophobiaPatch)).toEqual([trypophobiaPatch])

    for (const cursor of [trypophobiaPatch.indexOf('function r'), trypophobiaPatch.indexOf('solid')]) {
      expect(findLiveCodeBlock(trypophobiaPatch, cursor)).toEqual({
        code: trypophobiaPatch,
        range: { from: 0, to: trypophobiaPatch.length }
      })
    }
  })

  it('ignores blank lines inside one continued JavaScript expression', () => {
    expect(splitLiveExecutionBlocks(phoenixPatch)).toEqual([phoenixPatch])
    expect(findLiveCodeBlock(phoenixPatch, phoenixPatch.indexOf('.modulateScale'))).toEqual({
      code: phoenixPatch,
      range: { from: 0, to: phoenixPatch.length }
    })
  })
})
