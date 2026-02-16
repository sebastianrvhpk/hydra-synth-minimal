import type { HydraPrimitiveDescriptor } from './types.js'

export const PRIMITIVE_DESCRIPTORS: HydraPrimitiveDescriptor[] = [
  {
    id: 'primitive-reduce-mean-luma',
    kind: 'reduction.meanLuma',
    entryPoint: 'reduceMeanLumaMain',
    wgslModuleId: 'reduction',
    capability: {}
  },
  {
    id: 'primitive-reduce-histogram-luma',
    kind: 'reduction.histogramLuma',
    entryPoint: 'histogramLumaMain',
    wgslModuleId: 'reduction',
    capability: {}
  },
  {
    id: 'primitive-scan-exclusive-u32',
    kind: 'scan.exclusiveU32',
    entryPoint: 'scanExclusiveU32Main',
    wgslModuleId: 'scan',
    capability: {}
  },
  {
    id: 'primitive-compact-predicate',
    kind: 'compact.predicate',
    entryPoint: 'compactPredicateMain',
    wgslModuleId: 'compact',
    capability: {}
  },
  {
    id: 'primitive-sort-radix-keyvalue-u32',
    kind: 'sort.radixKeyValueU32',
    entryPoint: 'radixSortKeyValueU32Main',
    wgslModuleId: 'sort',
    capability: {}
  },
  {
    id: 'primitive-queue-append-consume-count',
    kind: 'queue.appendConsumeCount',
    entryPoint: 'queueAppendConsumeMain',
    wgslModuleId: 'queue',
    capability: {}
  },
  {
    id: 'primitive-scatter-to-texture2d',
    kind: 'bridge.scatterToTexture2D',
    entryPoint: 'scatterToTexture2DMain',
    wgslModuleId: 'bridge',
    capability: {}
  },
  {
    id: 'primitive-gather-from-texture2d',
    kind: 'bridge.gatherFromTexture2D',
    entryPoint: 'gatherFromTexture2DMain',
    wgslModuleId: 'bridge',
    capability: {}
  },
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

