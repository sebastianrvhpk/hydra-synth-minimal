import { BRIDGE_WGSL } from './bridge.js'
import { COMPACT_WGSL } from './compact.js'
import { PYRAMID_WGSL } from './pyramid.js'
import { QUEUE_WGSL } from './queue.js'
import { REDUCTION_WGSL } from './reduction.js'
import { SCAN_WGSL } from './scan.js'
import { SORT_WGSL } from './sort.js'

export const PRIMITIVE_WGSL_MODULES: Record<string, string> = {
  reduction: REDUCTION_WGSL,
  scan: SCAN_WGSL,
  compact: COMPACT_WGSL,
  sort: SORT_WGSL,
  queue: QUEUE_WGSL,
  bridge: BRIDGE_WGSL,
  pyramid: PYRAMID_WGSL
}

