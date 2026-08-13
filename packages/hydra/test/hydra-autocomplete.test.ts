import { CompletionContext } from '@codemirror/autocomplete'
import { javascript } from '@codemirror/lang-javascript'
import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { getHydraTransformDescriptors } from '../../synth/src/core/transforms/default-transforms.ts'
import {
  createHydraCompletionCatalog,
  createHydraCompletionSource
} from '../hydra-autocomplete.js'

const grammarUtilityNames = ['A', 'B', 'rn', 'btw', 'ns', 'nsloop']
const transformDescriptors = getHydraTransformDescriptors()
const catalog = createHydraCompletionCatalog({ transformDescriptors, grammarUtilityNames })
const completionSource = createHydraCompletionSource(catalog)

const complete = (code: string, explicit = true) => {
  const state = EditorState.create({ doc: code, extensions: [javascript()] })
  return completionSource(new CompletionContext(state, code.length, explicit))
}

const labels = (result: ReturnType<typeof complete>): string[] => (
  result?.options.map(({ label }: { label: string }) => label) ?? []
)

const interfaceOnlyNames = [
  'captureFrames',
  'captureAndSaveVideo',
  'saveCanvasFrame',
  'setCanvasFullscreen',
  'fitCanvasToWindow',
  'resetCanvasDisplay',
  'getCanvasDisplay',
  'setResolution',
  'startInterfaceRecording',
  'stopInterfaceRecording',
  'toggleInterfaceRecording',
  'playInterfacePerformance',
  'loadInterfacePerformance',
  'loadInterfacePerformanceFile',
  'saveSketchToUrl',
  'copySketchUrl',
  'loadSketchFromUrl',
  'loadRandomSketch',
  'randomize',
  'mutateEditorCode',
  'hydraAgentLivecoder',
  'clearEditor',
  'codeCanvas',
  'renderCodeToCanvas',
  'attachCodeMaterial',
  'syncCodeMaterial',
  'detachCodeMaterial',
  'fitEditorPanel',
  'showCode',
  'hideCode',
  'toggleCode',
  'toggleRecordPanel',
  'toggleOptionsPanel',
  'toggleDatastreamPanel',
  'datastreamControls',
  'datastreamVideos',
  'datastreamPatch',
  'media',
  'mediaBuffers',
  'pickMediaFiles',
  'loadMediaFiles',
  'hostMediaFiles',
  'loadVideoFile',
  'loadVideoFiles',
  'restartVideos'
]

describe('Hydra autocomplete', () => {
  it('keeps app and engine infrastructure out of every suggestion context', () => {
    const everyLabel = Object.values(catalog)
      .filter(Array.isArray)
      .flatMap((options) => options.map(({ label }: { label: string }) => label))

    expect(everyLabel).not.toEqual(expect.arrayContaining(interfaceOnlyNames))
  })

  it('derives all visual operations from the synth transform registry', () => {
    const expectedSources = transformDescriptors
      .filter(({ type }) => type === 'src')
      .map(({ name }) => name)
    const expectedChainOperations = transformDescriptors
      .filter(({ type }) => type !== 'src' && type !== 'passBoundary')
      .map(({ name }) => name)

    expect(catalog.globals.map(({ label }: { label: string }) => label)).toEqual(expect.arrayContaining(expectedSources))
    expect(catalog.graph.map(({ label }: { label: string }) => label)).toEqual(expect.arrayContaining(expectedChainOperations))
    expect(catalog.graph.map(({ label }: { label: string }) => label)).not.toContain('renderpass')
  })

  it('offers only global Hydra sources, signals, buffers, and utilities at top level', () => {
    const options = labels(complete('os'))

    expect(options).toEqual(expect.arrayContaining([
      'osc',
      'ns',
      'time',
      'a0',
      's0',
      'o0',
      'render',
      'hush',
      'setCanvasDisplay'
    ]))
    expect(options).not.toEqual(expect.arrayContaining(['rotate', 'blend', 'fast', 'initVideo']))
    expect(catalog.globals.find(({ label }: { label: string }) => label === 'setCanvasDisplay')?.detail)
      .toBe('(width = viewportWidth, height = viewportHeight, { nativeSize = true })')
  })

  it('offers visual chain operations after a texture graph', () => {
    const options = labels(complete('osc(10).ro'))

    expect(options).toEqual(expect.arrayContaining(['rotate', 'blend', 'blur', 'exposure', 'out']))
    expect(options).not.toEqual(expect.arrayContaining(['osc', 'fast', 'initVideo']))
    expect(catalog.graph.find(({ label }: { label: string }) => label === 'blend')?.detail).toBe('(texture, amount = 0.5)')
  })

  it('keeps sequence, media-source, audio, and pointer utilities contextual', () => {
    expect(labels(complete('[1, 2, 4].sm'))).toEqual(expect.arrayContaining(['fast', 'smooth', 'ease', 'offset', 'fit']))
    expect(labels(complete('s0.init'))).toEqual(expect.arrayContaining(['initVideo', 'initImage', 'initCam', 'initScreen', 'clear']))
    expect(labels(complete('a.set'))).toEqual(expect.arrayContaining(['setBins', 'setSmooth', 'setCutoff', 'setScale']))
    expect(labels(complete('mouse.sp'))).toEqual(expect.arrayContaining(['speed', 'speedSmooth']))
  })

  it('does not leak Hydra completions into arbitrary JavaScript members, comments, or strings', () => {
    expect(complete('Math.si')).toBeNull()
    expect(complete('// osc')).toBeNull()
    expect(complete('"osc"')).toBeNull()
  })
})
