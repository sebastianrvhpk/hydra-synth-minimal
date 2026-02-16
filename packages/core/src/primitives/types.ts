export type HydraPrimitiveKind =
  | 'reduction.meanLuma'
  | 'reduction.histogramLuma'
  | 'scan.exclusiveU32'
  | 'compact.predicate'
  | 'sort.radixKeyValueU32'
  | 'queue.appendConsumeCount'
  | 'bridge.scatterToTexture2D'
  | 'bridge.gatherFromTexture2D'
  | 'pyramid.downsample'
  | 'pyramid.upsample'

export interface HydraPrimitiveCapabilityConstraint {
  requiredFeatures?: string[]
  maxWorkgroupStorageBytes?: number
  minSubgroupSize?: number
}

export interface HydraPrimitiveDescriptor {
  id: string
  kind: HydraPrimitiveKind
  entryPoint: string
  wgslModuleId: string
  capability: HydraPrimitiveCapabilityConstraint
}

