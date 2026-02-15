import type { HydraDependencyEdgeV3, HydraKernelGraphV3 } from './types.js'

export interface HydraKernelGraphValidationIssue {
  type: 'error' | 'warning'
  code: string
  message: string
}

export const validateKernelGraphV3 = (graph: HydraKernelGraphV3): HydraKernelGraphValidationIssue[] => {
  const issues: HydraKernelGraphValidationIssue[] = []
  const nodeIds = new Set(graph.nodes.map((node) => node.id))
  const resourceIds = new Set(graph.resources.map((resource) => resource.id))

  const seenEdges = new Set<string>()
  graph.edges.forEach((edge) => {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      issues.push({
        type: 'error',
        code: 'EDGE_NODE_NOT_FOUND',
        message: `Edge "${edge.id}" references missing node(s): from=${edge.from}, to=${edge.to}.`
      })
    }
    const signature = `${edge.from}|${edge.to}|${edge.kind}|${edge.resource ?? ''}`
    if (seenEdges.has(signature)) {
      issues.push({
        type: 'warning',
        code: 'DUPLICATE_EDGE',
        message: `Duplicate edge detected for ${signature}.`
      })
    } else {
      seenEdges.add(signature)
    }
    if (edge.resource && !resourceIds.has(edge.resource)) {
      issues.push({
        type: 'warning',
        code: 'EDGE_RESOURCE_NOT_DECLARED',
        message: `Edge "${edge.id}" references undeclared resource "${edge.resource}".`
      })
    }
  })

  graph.nodes.forEach((node) => {
    node.resources.forEach((resourceId) => {
      if (resourceIds.has(resourceId)) return
      issues.push({
        type: 'warning',
        code: 'NODE_RESOURCE_NOT_DECLARED',
        message: `Node "${node.id}" references undeclared resource "${resourceId}".`
      })
    })
  })

  return issues
}

export const throwOnKernelGraphV3Errors = (
  issues: HydraKernelGraphValidationIssue[],
  label = 'HydraKernelGraphV3'
): void => {
  const errors = issues.filter((issue) => issue.type === 'error')
  if (errors.length === 0) return
  const details = errors.map((issue) => `${issue.code}: ${issue.message}`).join('\n')
  throw new Error(`${label} validation failed:\n${details}`)
}

export const createEdgeId = (
  from: string,
  to: string,
  kind: HydraDependencyEdgeV3['kind'],
  resource?: string
): string => `${from}->${to}:${kind}${resource ? `:${resource}` : ''}`

