export type HydraPrimitiveKind =
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
