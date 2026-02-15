import { BRIDGE_WGSL_V3 } from './bridge.js'
import { COMPACT_WGSL_V3 } from './compact.js'
import { PYRAMID_WGSL_V3 } from './pyramid.js'
import { QUEUE_WGSL_V3 } from './queue.js'
import { REDUCTION_WGSL_V3 } from './reduction.js'
import { SCAN_WGSL_V3 } from './scan.js'
import { SORT_WGSL_V3 } from './sort.js'

export const PRIMITIVE_WGSL_MODULES_V3: Record<string, string> = {
  reduction: REDUCTION_WGSL_V3,
  scan: SCAN_WGSL_V3,
  compact: COMPACT_WGSL_V3,
  sort: SORT_WGSL_V3,
  queue: QUEUE_WGSL_V3,
  bridge: BRIDGE_WGSL_V3,
  pyramid: PYRAMID_WGSL_V3
}

