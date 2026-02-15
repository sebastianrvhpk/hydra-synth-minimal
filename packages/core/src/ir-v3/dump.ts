import type { HydraKernelGraphV3 } from './types.js'

export interface HydraGraphDumpOptions {
  pretty?: boolean
}

export const dumpKernelGraphV3 = (
  graph: HydraKernelGraphV3,
  { pretty = true }: HydraGraphDumpOptions = {}
): string => {
  if (pretty) return JSON.stringify(graph, null, 2)
  return JSON.stringify(graph)
}

