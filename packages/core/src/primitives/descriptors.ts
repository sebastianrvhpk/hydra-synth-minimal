import type { HydraPrimitiveDescriptor } from './types.js'

export const PRIMITIVE_DESCRIPTORS: HydraPrimitiveDescriptor[] = [
  {
    id: 'primitive-pyramid-downsample',
    kind: 'pyramid.downsample',
    entryPoint: 'pyramidDownsampleMain',
    wgslModuleId: 'pyramid',
    capability: {}
  },
  {
    id: 'primitive-pyramid-upsample',
    kind: 'pyramid.upsample',
    entryPoint: 'pyramidUpsampleMain',
    wgslModuleId: 'pyramid',
    capability: {}
  }
]

export const getPrimitiveDescriptorByKind = (
  kind: HydraPrimitiveDescriptor['kind']
): HydraPrimitiveDescriptor | undefined => PRIMITIVE_DESCRIPTORS.find((descriptor) => descriptor.kind === kind)
