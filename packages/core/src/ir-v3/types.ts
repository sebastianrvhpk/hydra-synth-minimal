import type {
  HydraDispatchDomain,
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

export type HydraKernelNodeKindV3 =
  | 'ImageKernel'
  | 'DataKernel'
  | 'ReductionKernel'
  | 'QueueProducer'
  | 'QueueConsumer'
  | 'Present'

export type HydraResourceKindV3 =
  | 'Texture2D'
  | 'Texture2DArray'
  | 'Buffer'
  | 'IndirectArgs'
  | 'QueueBuffer'
  | 'HistoryRing'

export type HydraDependencyEdgeKindV3 = 'RAW' | 'WAR' | 'WAW' | 'Event' | 'QueueFlow'

export type HydraDispatchDomainV3 =
  | HydraDispatchDomain
  | 'indirect2d'
  | 'indirect1d'
  | 'queue1d'

export interface HydraKernelScheduleV3 {
  resolutionScale: number
  updateRate: HydraPassUpdateRate
  sparse: boolean
  dispatchDomain: HydraDispatchDomainV3
  variantPolicy: 'compat' | 'balanced' | 'aggressive'
  maxIterations?: number
}

export interface HydraKernelResourceShapeV3 {
  width?: number
  height?: number
  depthOrArrayLayers?: number
  minLength?: number
}

export interface HydraKernelResourceSpecV3 {
  id: string
  kind: HydraResourceKindV3
  access: HydraResourceAccess
  format?: HydraResourceFormat
  elementType?: HydraResourceElementType
  lifetime: HydraResourceLifetime | 'history' | 'external' | 'transient'
  historyDepth?: number
  shape?: HydraKernelResourceShapeV3
  aliasClass?: string
  externalBinding?: string
}

export interface HydraKernelDebugMetadataV3 {
  sourceTransformNames: string[]
  loweringNotes: string[]
  compatibilityFlags: string[]
}

export interface HydraKernelNodeV3 {
  id: string
  kind: HydraKernelNodeKindV3
  signature: string
  transforms: HydraTransformCall[]
  uniforms: HydraUniformBinding[]
  textures: HydraTextureBinding[]
  storageBuffers: HydraStorageBufferBinding[]
  storageTextures: HydraStorageTextureBinding[]
  schedule: HydraKernelScheduleV3
  resources: string[]
  reads: string[]
  writes: string[]
  debug: HydraKernelDebugMetadataV3
}

export interface HydraDependencyEdgeV3 {
  id: string
  from: string
  to: string
  kind: HydraDependencyEdgeKindV3
  resource?: string
}

export interface HydraKernelGraphV3 {
  id: string
  source: 'hydra-dsl'
  compatibilityMode: 'dsl-v2'
  nodes: HydraKernelNodeV3[]
  resources: HydraKernelResourceSpecV3[]
  edges: HydraDependencyEdgeV3[]
}

