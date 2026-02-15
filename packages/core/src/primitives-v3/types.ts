export type HydraPrimitiveKindV3 =
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

export interface HydraPrimitiveCapabilityConstraintV3 {
  requiredFeatures?: string[]
  maxWorkgroupStorageBytes?: number
  minSubgroupSize?: number
}

export interface HydraPrimitiveDescriptorV3 {
  id: string
  kind: HydraPrimitiveKindV3
  entryPoint: string
  wgslModuleId: string
  capability: HydraPrimitiveCapabilityConstraintV3
}

