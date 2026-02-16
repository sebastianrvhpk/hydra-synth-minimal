import type { HydraKernelGraph } from './types.js'

export interface HydraGraphDumpOptions {
  pretty?: boolean
}

export const dumpKernelGraph = (
  graph: HydraKernelGraph,
  { pretty = true }: HydraGraphDumpOptions = {}
): string => {
  if (pretty) return JSON.stringify(graph, null, 2)
  return JSON.stringify(graph)
}

