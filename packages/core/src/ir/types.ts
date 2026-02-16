import type {
  HydraPassUpdateRate,
  HydraResourceAccess,
  HydraResourceElementType,
  HydraResourceFormat,
  HydraResourceLifetime,
  HydraStorageBufferBinding,
  HydraStorageTextureBinding,
  HydraTextureBinding,
  HydraTransformCall,
  HydraUniformBinding
} from '../types.js'

export type HydraKernelNodeKind =
  | 'ImageKernel'
  | 'DataKernel'
  | 'ReductionKernel'
  | 'QueueProducer'
  | 'QueueConsumer'
  | 'Present'

export type HydraResourceKind =
  | 'Texture2D'
  | 'Texture2DArray'
  | 'Buffer'
  | 'IndirectArgs'
  | 'QueueBuffer'
  | 'HistoryRing'

export type HydraDependencyEdgeKind = 'RAW' | 'WAR' | 'WAW' | 'Event' | 'QueueFlow'

export type HydraDispatchDomain =
  | 'pixel2d'
  | 'linear1d'
  | 'indirect2d'
  | 'indirect1d'
  | 'queue1d'

export interface HydraKernelSchedule {
  resolutionScale: number
  updateRate: HydraPassUpdateRate
  sparse: boolean
  dispatchDomain: HydraDispatchDomain
  variantPolicy: 'compat' | 'balanced' | 'aggressive'
  maxIterations?: number
}

export interface HydraKernelResourceShape {
  width?: number
  height?: number
  depthOrArrayLayers?: number
  minLength?: number
}

export interface HydraKernelResourceSpec {
  id: string
  kind: HydraResourceKind
  access: HydraResourceAccess
  format?: HydraResourceFormat
  elementType?: HydraResourceElementType
  lifetime: HydraResourceLifetime | 'history' | 'external' | 'transient'
  historyDepth?: number
  shape?: HydraKernelResourceShape
  aliasClass?: string
  externalBinding?: string
}

export interface HydraKernelDebugMetadata {
  sourceTransformNames: string[]
  loweringNotes: string[]
  compatibilityFlags: string[]
}

export interface HydraKernelNode {
  id: string
  kind: HydraKernelNodeKind
  signature: string
  transforms: HydraTransformCall[]
  uniforms: HydraUniformBinding[]
  textures: HydraTextureBinding[]
  storageBuffers: HydraStorageBufferBinding[]
  storageTextures: HydraStorageTextureBinding[]
  schedule: HydraKernelSchedule
  resources: string[]
  reads: string[]
  writes: string[]
  debug: HydraKernelDebugMetadata
}

export interface HydraDependencyEdge {
  id: string
  from: string
  to: string
  kind: HydraDependencyEdgeKind
  resource?: string
}

export interface HydraKernelGraph {
  id: string
  source: 'hydra-dsl'
  compatibilityMode: 'dsl-v2'
  nodes: HydraKernelNode[]
  resources: HydraKernelResourceSpec[]
  edges: HydraDependencyEdge[]
}

