const argumentContainerName = 'ArgList'
const ignoredArgumentNodeNames = new Set(['(', ')', ','])
const chainNodeNames = new Set([
  'CallExpression',
  'NewExpression'
])

const clampPosition = (value, length) => {
  const position = Number(value)
  if (!Number.isFinite(position)) return 0
  return Math.max(0, Math.min(length, Math.floor(position)))
}

const isArgumentNode = (node) =>
  node?.parent?.name === argumentContainerName &&
  !ignoredArgumentNodeNames.has(node.name) &&
  node.to > node.from

export const findParameterScopes = (tree, position = 0) => {
  if (!tree || typeof tree.resolveInner !== 'function') return []

  const scopes = []
  const seenRanges = new Set()
  const resolvedPosition = clampPosition(position, tree.length)
  let node = tree.resolveInner(resolvedPosition, resolvedPosition === tree.length ? -1 : 1)

  while (node) {
    if (isArgumentNode(node)) {
      const key = `${node.from}:${node.to}`
      if (!seenRanges.has(key)) {
        seenRanges.add(key)
        scopes.push({
          from: node.from,
          to: node.to,
          kind: chainNodeNames.has(node.name) ? 'chain' : 'value',
          nodeName: node.name
        })
      }
    }
    node = node.parent
  }

  const focusedChainIndex = scopes.findIndex((scope) => scope.kind === 'chain')
  const focusedIndex = focusedChainIndex >= 0 ? focusedChainIndex : 0

  return scopes.map((scope, index) => ({
    ...scope,
    role: index === focusedIndex
      ? 'focus'
      : index < focusedIndex
        ? 'value'
        : 'parent'
  }))
}
