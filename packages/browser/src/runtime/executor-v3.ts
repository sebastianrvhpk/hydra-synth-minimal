import type { HydraCompiledPass, HydraExecutionPlanV3, HydraExecutionStepV3, HydraFrameState } from 'hydra-synth-core'
import type { WebGPUOutputNode } from './output-node.js'
import type { HydraResourceManagerV3, HydraResourceResidencySnapshotV3 } from './resource-manager-v3.js'
import { decideQueueDispatchV3, toQueueIndirectArgsV3 } from './queue-v3.js'

const DEFAULT_RESOURCE_TEXTURE_FORMAT: GPUTextureFormat = 'rgba16float'
const getStorageElementStride = (elementType: string): number => {
  if (elementType === 'f32' || elementType === 'u32' || elementType === 'i32') return 4
  if (elementType === 'vec2f') return 8
  if (elementType === 'vec3f') return 16
  return 16
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const sanitizeResourceToken = (value: string): string => value.replace(/[^a-zA-Z0-9:_-]/g, '_')

const sourceRefToken = (sourceRef: unknown): string | null => {
  if (!sourceRef || typeof sourceRef !== 'object') return null
  const candidate = sourceRef as Record<string, unknown>

  const outputId = candidate.id
  if (typeof outputId === 'number' && Number.isFinite(outputId)) {
    return `output:${Math.max(0, Math.floor(outputId))}`
  }

  const historyOffset = candidate.historyOffset
  if (typeof historyOffset === 'number' && Number.isFinite(historyOffset)) {
    return `history:${Math.max(1, Math.floor(historyOffset))}`
  }

  const stateKey = candidate.stateKey
  if (typeof stateKey === 'string' && stateKey.length > 0) {
    return `state:${sanitizeResourceToken(stateKey)}`
  }

  const slot = candidate.slot
  if (typeof slot === 'string' && slot.length > 0) {
    return `slot:${sanitizeResourceToken(slot)}`
  }

  return null
}

const bindingToken = ({
  name,
  variableName,
  sourceRef
}: {
  name: string
  variableName: string
  sourceRef?: unknown
}): string => {
  const sourceToken = sourceRefToken(sourceRef)
  if (sourceToken) return sourceToken
  if (variableName) return `binding:${sanitizeResourceToken(variableName)}`
  return `name:${sanitizeResourceToken(name)}`
}

const getStorageBufferResourceId = (buffer: {
  name: string
  variableName: string
  sourceRef?: unknown
  lifetime: string
  elementType: string
}): string => `buffer:${bindingToken(buffer)}:${sanitizeResourceToken(buffer.elementType)}:${sanitizeResourceToken(buffer.lifetime)}`

const getStorageTextureResourceId = (texture: {
  name: string
  variableName: string
  sourceRef?: unknown
  lifetime: string
  format: string
  dimension: string
}): string =>
  `storageTexture:${bindingToken(texture)}:${sanitizeResourceToken(texture.format)}:${sanitizeResourceToken(texture.dimension)}:${sanitizeResourceToken(texture.lifetime)}`

const clonePassWithLinearItemCount = (
  pass: HydraCompiledPass,
  itemCount: number,
  {
    mode = 'direct',
    indirectBuffer = null,
    indirectOffset = 0,
    queueCounterBuffer = null,
    onQueueCounterReadback = null
  }: {
    mode?: 'direct' | 'indirect'
    indirectBuffer?: GPUBuffer | null
    indirectOffset?: number
    queueCounterBuffer?: GPUBuffer | null
    onQueueCounterReadback?: ((activeCount: number, overflowCount: number) => void) | null
  } = {}
): HydraCompiledPass => ({
  ...pass,
  dispatch: {
    mode,
    domain: 'linear1d',
    workgroupSize: pass.dispatch?.workgroupSize ?? [64, 1, 1],
    itemCount: Math.max(1, Math.floor(itemCount)),
    getIndirectBuffer: mode === 'indirect'
      ? (() => indirectBuffer)
      : (pass.dispatch?.getIndirectBuffer ?? null),
    indirectOffset: mode === 'indirect' ? indirectOffset : pass.dispatch?.indirectOffset,
    getQueueCounterBuffer: queueCounterBuffer
      ? (() => queueCounterBuffer)
      : (pass.dispatch?.getQueueCounterBuffer ?? null),
    onQueueCounterReadback: onQueueCounterReadback ?? pass.dispatch?.onQueueCounterReadback ?? null,
    requiredFeatures: pass.dispatch?.requiredFeatures,
    requiredWorkgroupStorageBytes: pass.dispatch?.requiredWorkgroupStorageBytes
  }
})

export interface ExecutePlanV3Result {
  submittedPasses: number
  scheduledBarriers: number
  queueIterations: number
  queueOverflowCount: number
  queueIndirectDispatches: number
  queueConvergenceChecks: number
  allocatedResourceCount: number
}

export interface HydraExecutorQueueHooksV3 {
  getQueueState?: (
    step: HydraExecutionStepV3,
    iteration: number,
    previousActiveCount: number
  ) => { activeCount: number, capacity: number } | null
  readQueueCount?: (
    step: HydraExecutionStepV3,
    iteration: number
  ) => number | null
}

export interface HydraExecutePlanV3Options {
  queueHooks?: HydraExecutorQueueHooksV3
  forceQueueIndirect?: boolean
  queueMode?: 'cpu' | 'gpu_hybrid'
  queueConvergenceCheckInterval?: number
}

export class HydraExecutorV3 {
  private readonly resourceManager: HydraResourceManagerV3 | null

  constructor ({ resourceManager = null }: { resourceManager?: HydraResourceManagerV3 | null } = {}) {
    this.resourceManager = resourceManager
  }

  private ensurePlanResources (
    plan: HydraExecutionPlanV3,
    frame: HydraFrameState
  ): number {
    if (!this.resourceManager) return 0

    const specById = new Map(plan.sourceGraph.resources.map((resource) => [resource.id, resource]))
    const allocatedSlots = new Set<string>()

    plan.resources.forEach((allocation) => {
      const spec = specById.get(allocation.resourceId)
      if (!spec) return
      this.resourceManager.registerResourceSlot(allocation.resourceId, allocation.slot)
      if (spec.lifetime === 'external') return

      if (spec.kind === 'Buffer' || spec.kind === 'IndirectArgs' || spec.kind === 'QueueBuffer') {
        this.resourceManager.getOrCreateStorageBuffer(allocation.slot, allocation.plannedBytes)
        allocatedSlots.add(allocation.slot)
        return
      }

      if (spec.kind === 'Texture2D' || spec.kind === 'Texture2DArray' || spec.kind === 'HistoryRing') {
        const width = Math.max(1, Math.floor(spec.shape?.width ?? frame.resolution[0]))
        const height = Math.max(1, Math.floor(spec.shape?.height ?? frame.resolution[1]))
        const depthOrArrayLayers = Math.max(1, Math.floor(spec.shape?.depthOrArrayLayers ?? 1))
        this.resourceManager.getOrCreateStorageTexture(allocation.slot, {
          width,
          height,
          depthOrArrayLayers,
          format: (spec.format as GPUTextureFormat | undefined) ?? DEFAULT_RESOURCE_TEXTURE_FORMAT
        })
        allocatedSlots.add(allocation.slot)
      }
    })

    return allocatedSlots.size
  }

  private materializeStorageBufferBinding (
    pass: HydraCompiledPass,
    frame: HydraFrameState,
    allocationByResourceId: Map<string, HydraExecutionPlanV3['resources'][number]>,
    resourceById: Map<string, HydraExecutionPlanV3['sourceGraph']['resources'][number]>
  ): HydraCompiledPass['storageBuffers'] {
    if (!this.resourceManager || !pass.storageBuffers || pass.storageBuffers.length === 0) {
      return pass.storageBuffers
    }

    return pass.storageBuffers.map((binding) => {
      const candidates = [
        getStorageBufferResourceId(binding),
        `buffer:${binding.name}`,
        `virtual:${binding.name}`
      ]
      const resourceId = candidates.find((candidate) => allocationByResourceId.has(candidate))
      if (!resourceId) return binding

      const allocation = allocationByResourceId.get(resourceId)
      const spec = resourceById.get(resourceId)
      if (!allocation || !spec || spec.lifetime === 'external') return binding

      const minLength = Math.max(1, Math.floor(binding.minLength || 1))
      const requiredBytes = Math.max(
        allocation.plannedBytes,
        minLength * getStorageElementStride(binding.elementType)
      )
      const sourceRef = isPlainObject(binding.sourceRef) ? { ...binding.sourceRef } : {}
      sourceRef.slot = allocation.slot
      sourceRef.resourceId = resourceId

      return {
        ...binding,
        sourceRef,
        getBuffer: () => this.resourceManager?.allocateStorageBufferForResource?.(resourceId, requiredBytes) ??
          this.resourceManager?.getOrCreateStorageBuffer(allocation.slot, requiredBytes) ??
          null
      }
    })
  }

  private materializeStorageTextureBinding (
    pass: HydraCompiledPass,
    frame: HydraFrameState,
    allocationByResourceId: Map<string, HydraExecutionPlanV3['resources'][number]>,
    resourceById: Map<string, HydraExecutionPlanV3['sourceGraph']['resources'][number]>
  ): HydraCompiledPass['storageTextures'] {
    if (!this.resourceManager || !pass.storageTextures || pass.storageTextures.length === 0) {
      return pass.storageTextures
    }

    return pass.storageTextures.map((binding) => {
      const candidates = [
        getStorageTextureResourceId(binding),
        `storageTexture:${binding.name}`,
        `virtual:${binding.name}`
      ]
      const resourceId = candidates.find((candidate) => allocationByResourceId.has(candidate))
      if (!resourceId) return binding

      const allocation = allocationByResourceId.get(resourceId)
      const spec = resourceById.get(resourceId)
      if (!allocation || !spec || spec.lifetime === 'external') return binding

      const widthScale = Number(binding.widthScale ?? 1)
      const heightScale = Number(binding.heightScale ?? 1)
      const width = Math.max(
        1,
        Math.floor(spec.shape?.width ?? (frame.resolution[0] * (Number.isFinite(widthScale) && widthScale > 0 ? widthScale : 1)))
      )
      const height = Math.max(
        1,
        Math.floor(spec.shape?.height ?? (frame.resolution[1] * (Number.isFinite(heightScale) && heightScale > 0 ? heightScale : 1)))
      )
      const depthOrArrayLayers = Math.max(1, Math.floor(spec.shape?.depthOrArrayLayers ?? binding.depthOrArrayLayers ?? 1))
      const format = (spec.format as GPUTextureFormat | undefined) ?? (binding.format as GPUTextureFormat)
      const sourceRef = isPlainObject(binding.sourceRef) ? { ...binding.sourceRef } : {}
      sourceRef.slot = allocation.slot
      sourceRef.resourceId = resourceId

      return {
        ...binding,
        sourceRef,
        getTexture: () => this.resourceManager?.allocateStorageTextureForResource?.(resourceId, {
          width,
          height,
          depthOrArrayLayers,
          format
        }) ?? this.resourceManager?.getOrCreateStorageTexture(allocation.slot, {
          width,
          height,
          depthOrArrayLayers,
          format
        }) ??
          null
      }
    })
  }

  private materializePassResources (
    pass: HydraCompiledPass,
    frame: HydraFrameState,
    allocationByResourceId: Map<string, HydraExecutionPlanV3['resources'][number]>,
    resourceById: Map<string, HydraExecutionPlanV3['sourceGraph']['resources'][number]>,
    cache: Map<string, HydraCompiledPass>
  ): HydraCompiledPass {
    const cached = cache.get(pass.signature)
    if (cached) return cached

    const fallbackPass = pass.fallbackPass
      ? this.materializePassResources(pass.fallbackPass, frame, allocationByResourceId, resourceById, cache)
      : undefined
    const storageBuffers = this.materializeStorageBufferBinding(pass, frame, allocationByResourceId, resourceById)
    const storageTextures = this.materializeStorageTextureBinding(pass, frame, allocationByResourceId, resourceById)

    const materialized: HydraCompiledPass = {
      ...pass,
      ...(storageBuffers ? { storageBuffers } : {}),
      ...(storageTextures ? { storageTextures } : {}),
      ...(fallbackPass ? { fallbackPass } : {})
    }
    cache.set(pass.signature, materialized)
    return materialized
  }

  private expandQueueStepPasses (
    step: HydraExecutionStepV3,
    iteration: number,
    {
      activeCount,
      overflowCount,
      mode,
      forceQueueIndirect
    }: {
      activeCount: number
      overflowCount: number
      mode: 'cpu' | 'gpu_hybrid'
      forceQueueIndirect: boolean
    }
  ): { pass: HydraCompiledPass, usesIndirect: boolean } {
    if (mode === 'gpu_hybrid' && forceQueueIndirect && this.resourceManager) {
      const decision = decideQueueDispatchV3({
        activeCount,
        capacity: Math.max(1, activeCount),
        iteration,
        maxIterations: Math.max(1, iteration + 1),
        workgroupSizeX: Math.max(1, Math.floor(step.compiledPass.dispatch?.workgroupSize?.[0] ?? 64))
      })
      const args = toQueueIndirectArgsV3(decision)
      const indirectSlot = `queue-indirect:${step.nodeId}:${iteration}`
      const queueCounterSlot = `queue-counter:${step.nodeId}`
      this.resourceManager.writeIndirectArgs(indirectSlot, Math.max(1, args.x), Math.max(1, args.y), Math.max(1, args.z))
      this.resourceManager.writeQueueCount(queueCounterSlot, activeCount, overflowCount)
      const indirectBuffer = this.resourceManager.getOrCreateIndirectArgsBuffer(indirectSlot)
      const queueCounterBuffer = this.resourceManager.getOrCreateQueueCounterBuffer(queueCounterSlot)

      return {
        pass: clonePassWithLinearItemCount(step.compiledPass, activeCount, {
          mode: 'indirect',
          indirectBuffer,
          indirectOffset: 0,
          queueCounterBuffer,
          onQueueCounterReadback: (nextActiveCount, nextOverflowCount) => {
            this.resourceManager?.writeQueueCount(queueCounterSlot, nextActiveCount, nextOverflowCount)
          }
        }),
        usesIndirect: true
      }
    }

    return {
      pass: clonePassWithLinearItemCount(step.compiledPass, activeCount),
      usesIndirect: false
    }
  }

  private expandQueueSegmentPasses (
    steps: HydraExecutionStepV3[],
    frame: HydraFrameState,
    hooks?: HydraExecutorQueueHooksV3,
    {
      forceQueueIndirect = true,
      queueMode = steps[0]?.queueControl?.modeHint ?? 'cpu',
      queueConvergenceCheckInterval = steps[0]?.queueControl?.convergenceCheckInterval ?? 4
    }: HydraExecutePlanV3Options = {}
  ): {
    passes: HydraCompiledPass[]
    iterations: number
    overflowCount: number
    indirectDispatches: number
    convergenceChecks: number
  } {
    if (steps.length === 0) {
      return {
        passes: [],
        iterations: 0,
        overflowCount: 0,
        indirectDispatches: 0,
        convergenceChecks: 0
      }
    }

    const maxIterations = steps.reduce((max, step) => Math.max(max, planStepMaxIterations(step, frame)), 1)
    const checkInterval = Math.max(1, Math.floor(queueConvergenceCheckInterval))
    const firstStep = steps[0] as HydraExecutionStepV3
    const defaultActive = Math.max(1, Math.floor(firstStep.compiledPass.dispatch?.itemCount ?? (frame.resolution[0] * frame.resolution[1])))
    const defaultCapacity = Math.max(defaultActive, 1)

    const outPasses: HydraCompiledPass[] = []
    let iteration = 0
    let previousActiveCount = defaultActive
    let overflowCount = 0
    let indirectDispatches = 0
    let convergenceChecks = 0

    while (iteration < maxIterations) {
      let emittedInIteration = 0
      let latestActiveCount = 0
      let convergenceStep = steps[steps.length - 1] ?? firstStep

      steps.forEach((step) => {
        const stepMaxIterations = planStepMaxIterations(step, frame)
        if (iteration >= stepMaxIterations) return

        const workgroupSizeX = Math.max(1, Math.floor(step.compiledPass.dispatch?.workgroupSize?.[0] ?? 64))
        const providedState = hooks?.getQueueState?.(step, iteration, previousActiveCount)
        const activeCount = Math.max(0, Math.floor(providedState?.activeCount ?? previousActiveCount))
        const capacity = Math.max(1, Math.floor(providedState?.capacity ?? defaultCapacity))
        const decision = decideQueueDispatchV3({
          activeCount,
          capacity,
          iteration,
          maxIterations: stepMaxIterations,
          workgroupSizeX
        })

        overflowCount += decision.diagnostics.overflowCount
        if (!decision.shouldContinue) {
          latestActiveCount = 0
          return
        }

        const materialized = this.expandQueueStepPasses(step, iteration, {
          activeCount: decision.diagnostics.activeCount,
          overflowCount: decision.diagnostics.overflowCount,
          mode: queueMode,
          forceQueueIndirect
        })
        outPasses.push(materialized.pass)
        emittedInIteration += 1
        if (materialized.usesIndirect) indirectDispatches += 1
        latestActiveCount = decision.diagnostics.activeCount
        convergenceStep = step
      })

      if (emittedInIteration === 0) break
      iteration += 1

      if (hooks?.getQueueState) {
        previousActiveCount = Math.max(0, Math.floor(latestActiveCount))
        continue
      }

      if (queueMode === 'gpu_hybrid') {
        const shouldCheck = iteration % checkInterval === 0 || iteration === maxIterations
        if (shouldCheck) {
          convergenceChecks += 1
          const fromHook = hooks?.readQueueCount?.(convergenceStep, iteration)
          const fromManager = this.resourceManager?.readQueueCount(`queue-counter:${convergenceStep.nodeId}`) ?? null
          if (typeof fromHook === 'number' && Number.isFinite(fromHook)) {
            previousActiveCount = Math.max(0, Math.floor(fromHook))
          } else if (typeof fromManager === 'number' && Number.isFinite(fromManager)) {
            previousActiveCount = Math.max(0, Math.floor(fromManager))
          } else {
            previousActiveCount = Math.max(0, Math.floor(previousActiveCount * 0.5))
          }
        }
      } else {
        // CPU mode without external queue feed executes one deterministic iteration.
        previousActiveCount = 0
      }
    }

    return {
      passes: outPasses,
      iterations: iteration,
      overflowCount,
      indirectDispatches,
      convergenceChecks
    }
  }

  executePlan (
    output: WebGPUOutputNode,
    plan: HydraExecutionPlanV3,
    frame: HydraFrameState,
    options: HydraExecutePlanV3Options = {}
  ): ExecutePlanV3Result {
    const allocatedResourceCount = this.ensurePlanResources(plan, frame)
    const allocationByResourceId = new Map(plan.resources.map((allocation) => [allocation.resourceId, allocation]))
    const resourceById = new Map(plan.sourceGraph.resources.map((resource) => [resource.id, resource]))
    const passMaterializationCache = new Map<string, HydraCompiledPass>()
    const passes: HydraCompiledPass[] = []
    let queueIterations = 0
    let queueOverflowCount = 0
    let queueIndirectDispatches = 0
    let queueConvergenceChecks = 0

    let stepIndex = 0
    while (stepIndex < plan.steps.length) {
      const step = plan.steps[stepIndex]
      if (!step) break

      if (step.dispatchDomain !== 'queue1d') {
        passes.push(this.materializePassResources(
          step.compiledPass,
          frame,
          allocationByResourceId,
          resourceById,
          passMaterializationCache
        ))
        stepIndex += 1
        continue
      }

      const groupId = step.queueControl?.groupId ?? `queue-step:${step.nodeId}`
      const segment: HydraExecutionStepV3[] = [step]
      stepIndex += 1

      while (stepIndex < plan.steps.length) {
        const candidate = plan.steps[stepIndex]
        if (!candidate || candidate.dispatchDomain !== 'queue1d') break
        const candidateGroupId = candidate.queueControl?.groupId ?? `queue-step:${candidate.nodeId}`
        if (candidateGroupId !== groupId) break
        segment.push(candidate)
        stepIndex += 1
      }

      const materializedSegment = segment.map((segmentStep) => ({
        ...segmentStep,
        compiledPass: this.materializePassResources(
          segmentStep.compiledPass,
          frame,
          allocationByResourceId,
          resourceById,
          passMaterializationCache
        )
      }))
      const queuePasses = this.expandQueueSegmentPasses(materializedSegment, frame, options.queueHooks, options)
      passes.push(...queuePasses.passes)
      queueIterations += queuePasses.iterations
      queueOverflowCount += queuePasses.overflowCount
      queueIndirectDispatches += queuePasses.indirectDispatches
      queueConvergenceChecks += queuePasses.convergenceChecks
    }

    output.render(passes)

    return {
      submittedPasses: passes.length,
      scheduledBarriers: plan.barriers.length,
      queueIterations,
      queueOverflowCount,
      queueIndirectDispatches,
      queueConvergenceChecks,
      allocatedResourceCount
    }
  }

  getResidentByteEstimate (): number {
    if (!this.resourceManager) return 0
    return this.resourceManager.getResidentByteEstimate()
  }

  getResidencySnapshot (): HydraResourceResidencySnapshotV3 | null {
    if (!this.resourceManager) return null
    return this.resourceManager.getResidencySnapshot()
  }

  dispose (): void {
    this.resourceManager?.dispose()
  }
}

const planStepMaxIterations = (step: HydraExecutionStepV3, frame: HydraFrameState): number => {
  if (typeof step.maxIterations === 'number' && Number.isFinite(step.maxIterations)) {
    return Math.max(1, Math.floor(step.maxIterations))
  }
  const byDomainDefault = step.dispatchDomain === 'queue1d' ? 64 : 1
  const frameAreaBound = Math.max(1, Math.floor((frame.resolution[0] * frame.resolution[1]) / 1024))
  return Math.min(512, Math.max(byDomainDefault, frameAreaBound))
}
