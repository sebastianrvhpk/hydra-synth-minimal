const callableNodeNames = new Set([
  'CallExpression',
  'NewExpression'
])

const clampPosition = (value, length) => {
  const position = Number(value)
  if (!Number.isFinite(position)) return 0
  return Math.max(0, Math.min(length, Math.floor(position)))
}

const findCallNameNode = (callNode) => {
  const member = callNode.getChild?.('MemberExpression')
  if (member) {
    return member.getChild?.('PropertyName') ?? member.getChild?.('PrivateProperty') ?? null
  }
  return callNode.getChild?.('VariableName') ?? callNode.getChild?.('PropertyName') ?? null
}

const findCallSegmentStart = (callNode, nameNode) => {
  const member = callNode.getChild?.('MemberExpression')
  if (!member || !nameNode) return callNode.from
  const accessOperator = nameNode.prevSibling
  return accessOperator && ['.', '?.'].includes(accessOperator.name)
    ? accessOperator.from
    : nameNode.from
}

export const findCallScope = (tree, position = 0) => {
  if (!tree || typeof tree.resolveInner !== 'function') return null

  const resolvedPosition = clampPosition(position, tree.length)
  const candidates = new Map()

  for (const bias of [-1, 1]) {
    let node = tree.resolveInner(resolvedPosition, bias)
    while (node) {
      if (
        callableNodeNames.has(node.name) &&
        node.from <= resolvedPosition &&
        resolvedPosition <= node.to
      ) {
        candidates.set(`${node.from}:${node.to}`, node)
      }
      node = node.parent
    }
  }

  const callNode = [...candidates.values()].sort((left, right) => {
    const spanDifference = (left.to - left.from) - (right.to - right.from)
    return spanDifference || right.from - left.from
  })[0]
  if (!callNode) return null

  const nameNode = findCallNameNode(callNode)
  return {
    from: findCallSegmentStart(callNode, nameNode),
    to: callNode.to,
    kind: 'call',
    nodeName: callNode.name,
    nameFrom: nameNode?.from ?? callNode.from,
    nameTo: nameNode?.to ?? callNode.from
  }
}
