import type { HydraFrameState, HydraGraphNode as HydraGraphNodeShape } from '../types.js'
import {
  callNodeMethod,
  createEmitOnce,
  createHeadlessNode,
  requireBindingFunction,
  resolveBoolean,
  resolveGraphNode,
  resolveNumber,
  resolvePulse,
  resolveTint,
  type HydraBindings
} from './shared.js'

export type HydraSystemInputKind =
  | 'texture'
  | 'scalar'
  | 'vec2'
  | 'vec3'
  | 'vec4'
  | 'color'
  | 'boolean'
  | 'callback'
  | 'enum'

export interface HydraSystemInputSpec {
  name: string
  kind: HydraSystemInputKind
  description: string
  default?: unknown
  range?: [number, number]
}

export interface HydraSystemDefinition<Options = Record<string, unknown>> {
  name: string
  description: string
  inputs: HydraSystemInputSpec[]
  build: (bindings: HydraBindings, options?: Options, context?: HydraSystemContext) => HydraGraphNodeShape
}

export interface HydraSystemContext {
  emitEvent?: (name: string) => void
  emitOnce?: (name: string) => void
}

export interface AttachSystemsOptions {
  emitEvent?: (name: string) => void
  namespace?: string
  attachNamespace?: boolean
  attachLegacyTopLevel?: boolean
  attachAnalysisHelper?: boolean
}

export interface ParticlesOptions {
  seed?: number
  speed?: number
  drift?: number
  decay?: number
  amount?: number
  radius?: number
  tint?: [number, number, number] | [number, number, number, number]
  gain?: number
  gamma?: number
  reset?: boolean
}

export interface ReactionDiffusionOptions {
  seed?: unknown
  seedAmount?: number | ((props: HydraFrameState) => number)
  seedDuration?: number
  feed?: number
  kill?: number
  diffA?: number
  diffB?: number
  dt?: number
}

export interface FluidOptions {
  force?: unknown
  forceAmount?: number
  source?: unknown
  sourceAmount?: number | ((props: HydraFrameState) => number)
  sourceDuration?: number
  velocity?: number
  diffuse?: number
  dissipation?: number
}

export interface FeedbackOptions {
  source?: unknown
  feedback?: unknown
  mix?: number
  modulate?: number
  scale?: number
  rotate?: number
  blur?: number
  brightness?: number
  contrast?: number
}

export interface DisplaceOptions {
  source?: unknown
  driver?: unknown
  detail?: unknown
  amount?: number
  detailAmount?: number
  driverScale?: number
  driverSpeed?: number
  driverRadius?: number
  detailScale?: number
  detailSpeed?: number
  detailRadius?: number
}

export type ProbeName = 'luma' | 'histogram' | 'edge' | 'motion'

export interface ProbeOptions {
  source?: unknown
  probes?: ProbeName[]
  lumaRadius?: number
  edgeAmount?: number
  motionSensitivity?: number
}

const DEFAULT_SYSTEM_NAMESPACE = 'systems'
const LEGACY_TOP_LEVEL_SYSTEMS = new Set(['particles', 'reactionDiffusion', 'fluid'])

const createAnalysisHelper = () => {
  return (name: string, fallback: number | number[] = 0) => {
    return (props: HydraFrameState): number | number[] => {
      const value = props.analysis?.[name]
      if (typeof value === 'number' || Array.isArray(value)) return value
      return fallback
    }
  }
}

const buildParticlesSystem = (
  bindings: HydraBindings,
  opts: ParticlesOptions = {},
  context: HydraSystemContext = {}
): HydraGraphNodeShape => {
  const seed = resolveNumber(opts.seed, 0)
  const speed = resolveNumber(opts.speed, 0.35)
  const drift = resolveNumber(opts.drift, 0.2)
  const decay = resolveNumber(opts.decay, 0.985)
  const amount = resolveNumber(opts.amount, 0.8)
  const radius = resolveNumber(opts.radius, 1.0)
  const tint = resolveTint(opts.tint)
  const gain = resolveNumber(opts.gain, 1.0)
  const gamma = resolveNumber(opts.gamma, 1.0)

  const node = createHeadlessNode(bindings, 'particleReset', [seed])
  callNodeMethod(node, 'particleStep', [speed, drift])
  callNodeMethod(node, 'particleFieldDecay', [decay])
  callNodeMethod(node, 'particleScatter', [amount, radius])
  callNodeMethod(node, 'particleFieldRender', [tint, gain, gamma])

  if (resolveBoolean(opts.reset, true)) {
    context.emitOnce?.('particles-reset')
  }

  return node
}

const buildReactionDiffusionSystem = (
  bindings: HydraBindings,
  opts: ReactionDiffusionOptions = {}
): HydraGraphNodeShape => {
  const feed = resolveNumber(opts.feed, 0.0367)
  const kill = resolveNumber(opts.kill, 0.0649)
  const diffA = resolveNumber(opts.diffA, 1.0)
  const diffB = resolveNumber(opts.diffB, 0.5)
  const dt = resolveNumber(opts.dt, 1.0)
  const seedDuration = resolveNumber(opts.seedDuration, 0.6)

  let seed = opts.seed
  if (typeof seed === 'undefined') {
    try {
      seed = requireBindingFunction(bindings, 'noise')(4.0, 0.1)
    } catch {
      seed = [0, 0, 0, 0]
    }
  }

  const seedAmount = resolvePulse(opts.seedAmount, seedDuration)
  return createHeadlessNode(bindings, 'rdStepSeeded', [seed, seedAmount, feed, kill, diffA, diffB, dt])
}

const buildFluidSystem = (
  bindings: HydraBindings,
  opts: FluidOptions = {}
): HydraGraphNodeShape => {
  const forceAmount = resolveNumber(opts.forceAmount, 0.25)
  const velocity = resolveNumber(opts.velocity, 1.0)
  const diffuse = resolveNumber(opts.diffuse, 0.18)
  const dissipation = resolveNumber(opts.dissipation, 0.985)
  const sourceDuration = resolveNumber(opts.sourceDuration, 0.4)

  let force = opts.force
  if (typeof force === 'undefined') {
    try {
      force = requireBindingFunction(bindings, 'noise')(3.0, 0.08)
    } catch {
      force = [0, 0]
    }
  }

  let source = opts.source
  if (typeof source === 'undefined') {
    if (typeof bindings.osc === 'function') {
      source = requireBindingFunction(bindings, 'osc')(10.0, 0.12, 0.0)
    } else {
      source = [0, 0, 0, 0]
    }
  }

  const sourceAmount = resolvePulse(opts.sourceAmount, sourceDuration)
  return createHeadlessNode(bindings, 'fluidStep', [
    force,
    forceAmount,
    source,
    sourceAmount,
    velocity,
    diffuse,
    dissipation
  ])
}

const buildFeedbackSystem = (
  bindings: HydraBindings,
  opts: FeedbackOptions = {}
): HydraGraphNodeShape => {
  const mix = resolveNumber(opts.mix, 0.8)
  const modulateAmount = resolveNumber(opts.modulate, 0.06)
  const scale = resolveNumber(opts.scale, 1.01)
  const rotate = resolveNumber(opts.rotate, 0.02)
  const blur = resolveNumber(opts.blur, 0.0)
  const brightness = resolveNumber(opts.brightness, 0.0)
  const contrast = resolveNumber(opts.contrast, 1.0)

  const source = resolveGraphNode(bindings, opts.source, () =>
    requireBindingFunction(bindings, 'osc')(8.0, 0.1, 0.0)
  )
  const feedback = resolveGraphNode(bindings, opts.feedback, () =>
    requireBindingFunction(bindings, 'prev')()
  )

  let node = source.blend(feedback, mix)
  if (Math.abs(modulateAmount) > 0.0001) {
    node = node.modulate(feedback, modulateAmount)
  }
  if (Math.abs(scale - 1.0) > 0.0001) {
    node = node.scale(scale)
  }
  if (Math.abs(rotate) > 0.0001) {
    node = node.rotate(rotate, 0.0)
  }
  if (blur > 0) {
    node = node.blur(blur)
  }
  if (Math.abs(brightness) > 0.0001) {
    node = node.brightness(brightness)
  }
  if (Math.abs(contrast - 1.0) > 0.0001) {
    node = node.contrast(contrast)
  }

  return node
}

const buildDisplaceSystem = (
  bindings: HydraBindings,
  opts: DisplaceOptions = {}
): HydraGraphNodeShape => {
  const amount = resolveNumber(opts.amount, 0.12)
  const detailAmount = resolveNumber(opts.detailAmount, amount * 0.5)
  const driverScale = resolveNumber(opts.driverScale, 3.0)
  const driverSpeed = resolveNumber(opts.driverSpeed, 0.12)
  const driverRadius = resolveNumber(opts.driverRadius, 0.9)
  const detailScale = resolveNumber(opts.detailScale, 7.0)
  const detailSpeed = resolveNumber(opts.detailSpeed, 0.18)
  const detailRadius = resolveNumber(opts.detailRadius, 0.7)

  const source = resolveGraphNode(bindings, opts.source, () =>
    requireBindingFunction(bindings, 'osc')(10.0, 0.1, 0.0)
  )

  const driver = resolveGraphNode(bindings, opts.driver, () =>
    requireBindingFunction(bindings, 'noiseLoop')(driverScale, driverSpeed, driverRadius)
  )

  const detail = resolveGraphNode(bindings, opts.detail, () =>
    requireBindingFunction(bindings, 'noiseLoop')(detailScale, detailSpeed, detailRadius)
  )

  let node = source.modulate(driver, amount)
  if (Math.abs(detailAmount) > 0.0001) {
    node = node.modulate(detail, detailAmount)
  }
  return node
}

const buildProbeSystem = (
  bindings: HydraBindings,
  opts: ProbeOptions = {}
): HydraGraphNodeShape => {
  const probes = Array.isArray(opts.probes) && opts.probes.length > 0
    ? opts.probes
    : ['luma']

  const lumaRadius = resolveNumber(opts.lumaRadius, 1.0)
  const edgeAmount = resolveNumber(opts.edgeAmount, 1.0)
  const motionSensitivity = resolveNumber(opts.motionSensitivity, 1.0)

  const source = resolveGraphNode(bindings, opts.source, () =>
    requireBindingFunction(bindings, 'solid')(0, 0, 0, 1)
  )

  let node = source
  if (probes.includes('luma')) {
    node = node.lumaProbe(lumaRadius)
  }
  if (probes.includes('histogram')) {
    node = node.histogramProbe()
  }
  if (probes.includes('edge')) {
    node = node.edgeDensityProbe(edgeAmount)
  }
  if (probes.includes('motion')) {
    node = node.motionProbe(motionSensitivity)
  }

  return node
}

export const SYSTEM_DEFINITIONS: HydraSystemDefinition<any>[] = [
  {
    name: 'particles',
    description: 'Particle buffer + scatter + render with persistent field storage.',
    inputs: [
      { name: 'seed', kind: 'scalar', description: 'Seed for particle initialization.', default: 0 },
      { name: 'speed', kind: 'scalar', description: 'Noise field speed (units/sec).', default: 0.35 },
      { name: 'drift', kind: 'scalar', description: 'Velocity scale in pixel space.', default: 0.2 },
      { name: 'decay', kind: 'scalar', description: 'Field decay (0.95 - 0.999).', default: 0.985 },
      { name: 'amount', kind: 'scalar', description: 'Scatter intensity.', default: 0.8 },
      { name: 'radius', kind: 'scalar', description: 'Scatter radius in pixels.', default: 1.0 },
      { name: 'tint', kind: 'color', description: 'RGB tint for render.', default: [1, 1, 1] },
      { name: 'gain', kind: 'scalar', description: 'Output gain.', default: 1.0 },
      { name: 'gamma', kind: 'scalar', description: 'Output gamma.', default: 1.0 },
      { name: 'reset', kind: 'boolean', description: 'Emit the particles-reset event once.', default: true }
    ],
    build: buildParticlesSystem
  },
  {
    name: 'reactionDiffusion',
    description: 'Reaction-diffusion simulation with seeded injection.',
    inputs: [
      { name: 'seed', kind: 'texture', description: 'Seed texture or color input.' },
      { name: 'seedAmount', kind: 'scalar', description: 'Seed injection strength.', default: 0.0 },
      { name: 'seedDuration', kind: 'scalar', description: 'Seconds to pulse seed.', default: 0.6 },
      { name: 'feed', kind: 'scalar', description: 'Feed rate.', default: 0.0367 },
      { name: 'kill', kind: 'scalar', description: 'Kill rate.', default: 0.0649 },
      { name: 'diffA', kind: 'scalar', description: 'Diffusion A.', default: 1.0 },
      { name: 'diffB', kind: 'scalar', description: 'Diffusion B.', default: 0.5 },
      { name: 'dt', kind: 'scalar', description: 'Time step.', default: 1.0 }
    ],
    build: buildReactionDiffusionSystem
  },
  {
    name: 'fluid',
    description: 'Velocity + dye advection with force and source injection.',
    inputs: [
      { name: 'force', kind: 'vec2', description: 'Vector field force input.' },
      { name: 'forceAmount', kind: 'scalar', description: 'Force strength.', default: 0.25 },
      { name: 'source', kind: 'texture', description: 'Source/dye input.' },
      { name: 'sourceAmount', kind: 'scalar', description: 'Injection amount.', default: 0.0 },
      { name: 'sourceDuration', kind: 'scalar', description: 'Seconds to pulse source.', default: 0.4 },
      { name: 'velocity', kind: 'scalar', description: 'Velocity scale.', default: 1.0 },
      { name: 'diffuse', kind: 'scalar', description: 'Diffusion amount.', default: 0.18 },
      { name: 'dissipation', kind: 'scalar', description: 'Dissipation (0.95 - 0.999).', default: 0.985 }
    ],
    build: buildFluidSystem
  },
  {
    name: 'feedback',
    description: 'Opinionated feedback loop with blend + modulate.',
    inputs: [
      { name: 'source', kind: 'texture', description: 'Base source texture.' },
      { name: 'feedback', kind: 'texture', description: 'Feedback input (defaults to prev()).' },
      { name: 'mix', kind: 'scalar', description: 'Blend amount.', default: 0.8 },
      { name: 'modulate', kind: 'scalar', description: 'Displacement strength.', default: 0.06 },
      { name: 'scale', kind: 'scalar', description: 'Global scale.', default: 1.01 },
      { name: 'rotate', kind: 'scalar', description: 'Rotation angle.', default: 0.02 },
      { name: 'blur', kind: 'scalar', description: 'Blur radius.', default: 0.0 },
      { name: 'brightness', kind: 'scalar', description: 'Brightness offset.', default: 0.0 },
      { name: 'contrast', kind: 'scalar', description: 'Contrast multiplier.', default: 1.0 }
    ],
    build: buildFeedbackSystem
  },
  {
    name: 'displace',
    description: 'Multi-layer domain displacement driven by procedural fields.',
    inputs: [
      { name: 'source', kind: 'texture', description: 'Base source texture.' },
      { name: 'driver', kind: 'texture', description: 'Primary displacement field.' },
      { name: 'detail', kind: 'texture', description: 'Secondary displacement field.' },
      { name: 'amount', kind: 'scalar', description: 'Primary displacement.', default: 0.12 },
      { name: 'detailAmount', kind: 'scalar', description: 'Secondary displacement.', default: 0.06 },
      { name: 'driverScale', kind: 'scalar', description: 'Primary noise scale.', default: 3.0 },
      { name: 'driverSpeed', kind: 'scalar', description: 'Primary noise speed.', default: 0.12 },
      { name: 'driverRadius', kind: 'scalar', description: 'Primary loop radius.', default: 0.9 },
      { name: 'detailScale', kind: 'scalar', description: 'Detail noise scale.', default: 7.0 },
      { name: 'detailSpeed', kind: 'scalar', description: 'Detail noise speed.', default: 0.18 },
      { name: 'detailRadius', kind: 'scalar', description: 'Detail loop radius.', default: 0.7 }
    ],
    build: buildDisplaceSystem
  },
  {
    name: 'probe',
    description: 'Convenience wrapper for analysis probes.',
    inputs: [
      { name: 'source', kind: 'texture', description: 'Source texture to analyze.' },
      { name: 'probes', kind: 'enum', description: 'Probe list: luma, histogram, edge, motion.' },
      { name: 'lumaRadius', kind: 'scalar', description: 'Luma probe radius.', default: 1.0 },
      { name: 'edgeAmount', kind: 'scalar', description: 'Edge probe amount.', default: 1.0 },
      { name: 'motionSensitivity', kind: 'scalar', description: 'Motion probe sensitivity.', default: 1.0 }
    ],
    build: buildProbeSystem
  }
]

export const attachSystems = (
  bindings: HydraBindings,
  options: AttachSystemsOptions = {}
): void => {
  const namespaceKey = options.namespace ?? DEFAULT_SYSTEM_NAMESPACE
  const attachNamespace = options.attachNamespace !== false
  const attachLegacyTopLevel = options.attachLegacyTopLevel !== false
  const attachAnalysisHelper = options.attachAnalysisHelper !== false

  const emitOnce = createEmitOnce(options.emitEvent)
  const context: HydraSystemContext = {
    emitEvent: options.emitEvent,
    emitOnce
  }

  const namespace = attachNamespace
    ? (() => {
        const existing = bindings[namespaceKey]
        if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
          return existing as Record<string, unknown>
        }
        const created: Record<string, unknown> = {}
        bindings[namespaceKey] = created
        return created
      })()
    : null

  for (const definition of SYSTEM_DEFINITIONS) {
    const systemFn = (opts?: unknown) =>
      definition.build(bindings, opts as any, context)

    if (namespace) {
      namespace[definition.name] = systemFn
    }

    if (attachLegacyTopLevel && LEGACY_TOP_LEVEL_SYSTEMS.has(definition.name)) {
      bindings[definition.name] = systemFn
    }
  }

  if (attachAnalysisHelper) {
    const analysis = createAnalysisHelper()
    bindings.analysis = analysis
    if (namespace) {
      namespace.analysis = analysis
    }
  }
}
