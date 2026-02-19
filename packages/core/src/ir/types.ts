import type {
  HydraPassUpdateRate,
  HydraResourceFormat,
  HydraTextureBinding,
  HydraTransformCall,
  HydraUniformBinding
} from '../types.js'

export type HydraKernelNodeKind = 'ImageKernel'

export type HydraResourceKind =
  | 'Texture2D'
  | 'HistoryRing'

export type HydraDependencyEdgeKind = 'RAW' | 'WAR' | 'WAW' | 'Event'

export type HydraDispatchDomain = 'pixel2d'

export interface HydraKernelSchedule {
  resolutionScale: number
  updateRate: HydraPassUpdateRate
  sparse: boolean
  dispatchDomain: HydraDispatchDomain
  variantPolicy: 'compat' | 'balanced' | 'aggressive'
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
  format?: HydraResourceFormat
  lifetime: 'history' | 'external' | 'transient'
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
