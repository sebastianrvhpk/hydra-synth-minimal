import type {
  HydraCompiledPass,
  HydraFrameState,
  HydraOutputAdapter,
  HydraPortableClock,
  HydraPortablePass,
  HydraPortableRenderPlan,
  HydraPortableTextureBinding,
  HydraPortableTextureSource
} from './core/types.js'
import { HydraTransformRegistry } from './core/transforms/registry.js'
import {
  resolveWebGLFragmentWGSL,
  translateWebGLFragment,
  type WebNagaModule
} from './webgl2/shader-compiler.js'

export const HYDRA_PORTABLE_RENDER_PLAN_SCHEMA = 'hydra.portable-render-plan/1' as const
export const HYDRA_SYNTH_COMPILER_VERSION = '2.0.0-alpha.0'

export interface CompileTrustedHydraProgramOptions extends Partial<HydraPortableClock> {
  code: string
  naga?: WebNagaModule
  runCode?: (code: string, scope: Record<string, unknown>) => unknown
}

interface PortableTextureMarker {
  kind: 'input' | 'output'
  index: number
}

interface MarkedTextureProvider {
  id?: number
  __hydraPortableTexture: PortableTextureMarker
  getTexture(): null
}

class CaptureOutput implements HydraOutputAdapter, MarkedTextureProvider {
  readonly id: number
  readonly __hydraPortableTexture: PortableTextureMarker
  passes: HydraCompiledPass[] = []

  constructor (index: number) {
    this.id = index
    this.__hydraPortableTexture = { kind: 'output', index }
  }

  render (passes: HydraCompiledPass[]): void {
    this.passes = passes.slice()
  }

  getTexture (): null {
    return null
  }
}

class CaptureInput implements MarkedTextureProvider {
  readonly __hydraPortableTexture: PortableTextureMarker

  constructor (index: number) {
    this.__hydraPortableTexture = { kind: 'input', index }
  }

  getTexture (): null {
    return null
  }
}

const finite = (value: unknown, fallback: number): number => (
  typeof value === 'number' && Number.isFinite(value) ? value : fallback
)

const positiveInteger = (value: unknown, fallback: number): number => {
  const normalized = Math.floor(finite(value, fallback))
  return normalized > 0 ? normalized : fallback
}

const positive = (value: unknown, fallback: number): number => {
  const normalized = finite(value, fallback)
  return normalized > 0 ? normalized : fallback
}

const hashString = (value: string): string => {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

const createSeededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6D2B79F5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

const installPortableHelpers = (
  scope: Record<string, unknown>,
  registry: HydraTransformRegistry,
  clock: HydraPortableClock
): void => {
  type PortableHelperGraph = {
    scale: (...args: unknown[]) => PortableHelperGraph
    modulate: (...args: unknown[]) => PortableHelperGraph
  }

  const solid = registry.generators.solid
  const noise = registry.generators.noise
  const noiseLoop = registry.generators.noiseLoop
  if (!solid || !noise || !noiseLoop) {
    throw new Error('Portable Hydra helpers require solid, noise, and noiseLoop transforms.')
  }

  const aspectX = Math.min(1, clock.height / clock.width)
  const aspectY = Math.min(1, clock.width / clock.height)
  const random = createSeededRandom(clock.seed)
  const rn = (max = 1): number => random() * finite(max, 1)
  const btw = (min = 0, max = 1): number => {
    const lower = finite(min, 0)
    const upper = finite(max, 1)
    return lower + random() * (upper - lower)
  }
  const seedTexture = (texture: unknown, seedX: number, seedY: number): unknown => {
    const graph = texture as PortableHelperGraph
    return graph.scale(1, aspectX, aspectY).modulate(solid(seedX, seedY), 1)
  }
  const ns = (scale = 10, speed = 0.1, seedX = rn(), seedY = rn()): unknown => (
    seedTexture(noise(scale, speed), seedX, seedY)
  )
  const nsloop = (scale = 10, speed = 0.1, radius = 1, seedX = rn(), seedY = rn()): unknown => (
    seedTexture(noiseLoop(scale, speed, radius), seedX, seedY)
  )

  Object.assign(scope, {
    A: aspectX,
    B: aspectY,
    rn,
    btw,
    ns,
    nsloop,
    render: () => undefined
  })
}

const markerFor = (value: unknown): PortableTextureMarker | null => {
  if (!value || typeof value !== 'object' || !('__hydraPortableTexture' in value)) return null
  const marker = (value as { __hydraPortableTexture?: unknown }).__hydraPortableTexture
  if (!marker || typeof marker !== 'object') return null
  const kind = (marker as { kind?: unknown }).kind
  const index = (marker as { index?: unknown }).index
  if ((kind !== 'input' && kind !== 'output') || typeof index !== 'number' || !Number.isInteger(index)) return null
  return { kind, index }
}

const textureSourceFor = (
  pass: HydraCompiledPass,
  bindingIndex: number,
  outputIndex: number,
  passIndex: number
): HydraPortableTextureSource => {
  const binding = pass.textures[bindingIndex]
  if (!binding) throw new Error(`Missing texture binding ${bindingIndex}.`)
  if (binding.isPrev) {
    return passIndex > 0
      ? { kind: 'internal-pass', index: passIndex - 1 }
      : { kind: 'previous', output: outputIndex, offset: 1 }
  }

  const source = binding.sourceRef
  if (source && typeof source === 'object' && 'internalPassIndex' in source) {
    const index = (source as { internalPassIndex?: unknown }).internalPassIndex
    if (typeof index === 'number' && Number.isInteger(index) && index >= 0) {
      return { kind: 'internal-pass', index }
    }
  }

  if (source && typeof source === 'object' && 'historyOffset' in source) {
    const rawOffset = (source as { historyOffset?: unknown }).historyOffset
    const offset = positiveInteger(rawOffset, 1)
    const target = (source as { target?: unknown }).target
    const marker = markerFor(target)
    if (marker?.kind === 'output') return { kind: 'previous', output: marker.index, offset }
    return { kind: 'previous', output: outputIndex, offset }
  }

  const marker = markerFor(source)
  if (marker?.kind === 'input') return { kind: 'input', index: marker.index }
  if (marker?.kind === 'output') return { kind: 'output', output: marker.index }

  throw new Error(`Texture binding "${binding.variableName}" cannot be represented by a portable Hydra plan.`)
}

const uniformFrameFor = (pass: HydraCompiledPass, frame: HydraFrameState): number[] => {
  let scalarCount = 0
  for (const uniform of pass.uniforms) scalarCount = Math.max(scalarCount, uniform.index + uniform.size)
  if (scalarCount === 0) return []

  const values = new Array<number>(scalarCount).fill(0)
  for (const uniform of pass.uniforms) {
    const size = Math.max(1, Math.min(4, Math.floor(uniform.size || 1)))
    const evaluated = uniform.value(frame)
    const lanes = Array.isArray(evaluated)
      ? evaluated
      : ArrayBuffer.isView(evaluated)
        ? Array.from(evaluated as unknown as ArrayLike<number>)
        : [evaluated]
    for (let lane = 0; lane < size; lane += 1) {
      values[uniform.index + lane] = finite(lanes[lane] ?? lanes[0], 0)
    }
  }
  return values
}

const defaultTrustedRunner = (code: string, scope: Record<string, unknown>): unknown => {
  // This boundary is intentionally explicit. Callers must never compile code
  // automatically merely because a workflow was loaded.
  const TrustedCodeCompiler = globalThis.Function
  const runTrustedPatch = TrustedCodeCompiler('scope', `with (scope) {\n${code}\n}`)
  return runTrustedPatch(scope)
}

let nagaPromise: Promise<WebNagaModule> | null = null

const loadNaga = async (): Promise<WebNagaModule> => {
  if (!nagaPromise) {
    nagaPromise = import('web-naga').then(async (naga) => {
      await naga.default()
      return naga
    }).catch((error) => {
      nagaPromise = null
      throw error
    })
  }
  return nagaPromise
}

const normalizeClock = (options: CompileTrustedHydraProgramOptions): HydraPortableClock => ({
  width: positiveInteger(options.width, 512),
  height: positiveInteger(options.height, 512),
  frameCount: positiveInteger(options.frameCount, 1),
  fps: positive(options.fps, 24),
  startTime: finite(options.startTime, 0),
  bpm: positive(options.bpm, 60),
  seed: Math.floor(finite(options.seed, 0))
})

const portablePass = (
  pass: HydraCompiledPass,
  outputIndex: number,
  passIndex: number,
  clock: HydraPortableClock,
  scope: Record<string, unknown>,
  naga: WebNagaModule
): HydraPortablePass => {
  const wgsl = resolveWebGLFragmentWGSL(pass)
  const glsl = translateWebGLFragment(naga, wgsl)
  const uniformFrames: number[][] = []
  for (let frameIndex = 0; frameIndex < clock.frameCount; frameIndex += 1) {
    const time = clock.startTime + frameIndex / clock.fps
    const frame: HydraFrameState = {
      time,
      bpm: clock.bpm,
      resolution: [clock.width, clock.height],
      deltaMs: 1000 / clock.fps
    }
    scope.time = time
    scope.bpm = clock.bpm
    scope.width = clock.width
    scope.height = clock.height
    uniformFrames.push(uniformFrameFor(pass, frame))
  }

  const textures: HydraPortableTextureBinding[] = pass.textures.map((binding, index) => ({
    variableName: binding.variableName,
    source: textureSourceFor(pass, index, outputIndex, passIndex)
  }))

  return {
    signature: pass.signature,
    glsl,
    resolutionScale: pass.resolutionScale,
    uniformFrames,
    textures
  }
}

/**
 * Compile a trusted, explicitly executed Hydra patch into a JSON-safe render
 * plan. The plan contains no callbacks, browser objects, or executable JS.
 */
export const compileTrustedHydraProgram = async (
  options: CompileTrustedHydraProgramOptions
): Promise<HydraPortableRenderPlan> => {
  const code = String(options.code ?? '').trim()
  if (!code) throw new Error('Hydra code is empty.')
  const clock = normalizeClock(options)
  const outputs = [0, 1, 2, 3].map((index) => new CaptureOutput(index))
  const inputs = [0, 1, 2, 3].map((index) => new CaptureInput(index))
  const registry = new HydraTransformRegistry({ defaultOutput: outputs[0]! })
  const scope: Record<string, unknown> = {
    time: clock.startTime,
    bpm: clock.bpm,
    width: clock.width,
    height: clock.height,
    fps: clock.fps,
    speed: 1,
    seed: clock.seed
  }
  registry.attachToBindings(scope)
  outputs.forEach((output, index) => { scope[`o${index}`] = output })
  inputs.forEach((input, index) => { scope[`s${index}`] = input })
  installPortableHelpers(scope, registry, clock)

  const runCode = options.runCode ?? defaultTrustedRunner
  runCode(code, scope)
  const activeOutputs = outputs.filter((output) => output.passes.length > 0)
  if (activeOutputs.length === 0) {
    throw new Error('Hydra patch did not render an output. End a chain with .out() or .out(oN).')
  }

  const naga = options.naga ?? await loadNaga()
  return {
    schema: HYDRA_PORTABLE_RENDER_PLAN_SCHEMA,
    compiler: {
      name: 'hydra-synth',
      version: HYDRA_SYNTH_COMPILER_VERSION
    },
    source: { code, hash: hashString(code) },
    clock,
    outputs: activeOutputs.map((output) => ({
      index: output.id,
      passes: output.passes.map((pass, passIndex) => portablePass(pass, output.id, passIndex, clock, scope, naga))
    }))
  }
}
