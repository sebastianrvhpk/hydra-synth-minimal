import { parser as javascriptParser } from '@lezer/javascript'

const clampPosition = (value, length) => {
  const position = Number(value)
  if (!Number.isFinite(position)) return 0
  return Math.max(0, Math.min(length, Math.floor(position)))
}

const readLines = (source) => {
  const lines = []
  let from = 0
  let index = 0

  while (index < source.length) {
    const character = source[index]
    if (character !== '\n' && character !== '\r') {
      index += 1
      continue
    }

    lines.push({ from, to: index, text: source.slice(from, index) })
    if (character === '\r' && source[index + 1] === '\n') index += 1
    index += 1
    from = index
  }

  lines.push({ from, to: source.length, text: source.slice(from) })
  return lines
}

const isBlankLine = (line) => line.text.trim().length === 0

const preambleNodeNames = new Set([
  'BlockComment',
  'ClassDeclaration',
  'EmptyStatement',
  'FunctionDeclaration',
  'LineComment',
  'VariableDeclaration'
])

const lineIndexAt = (lines, position) => {
  for (let index = 0; index < lines.length - 1; index += 1) {
    if (position < lines[index + 1].from) return index
  }
  return lines.length - 1
}

const readTopLevelNodes = (source) => {
  const nodes = []
  const cursor = javascriptParser.parse(source).cursor()
  if (!cursor.firstChild()) return nodes

  do {
    nodes.push({ name: cursor.name, from: cursor.from, to: cursor.to })
  } while (cursor.nextSibling())
  return nodes
}

const readRawBlocks = (lines) => {
  const blocks = []
  let firstIndex = null

  const flush = (lastIndex) => {
    if (firstIndex === null) return
    blocks.push({
      firstIndex,
      lastIndex,
      from: lines[firstIndex].from,
      to: lines[lastIndex].to
    })
    firstIndex = null
  }

  for (let index = 0; index < lines.length; index += 1) {
    if (isBlankLine(lines[index])) flush(index - 1)
    else if (firstIndex === null) firstIndex = index
  }
  flush(lines.length - 1)
  return blocks
}

const syntaxCrossesGap = (nodes, current, next) => nodes.some((node) =>
  node.from < next.from && node.to > current.to
)

const isDeclarationPreamble = (nodes, block) => {
  const containedNodes = nodes.filter((node) => node.from >= block.from && node.to <= block.to)
  return containedNodes.every((node) => preambleNodeNames.has(node.name))
}

const readLiveCodeBlocks = (source, lines = readLines(source)) => {
  const rawBlocks = readRawBlocks(lines)
  if (rawBlocks.length < 2) return rawBlocks

  const nodes = readTopLevelNodes(source)
  const blocks = []
  let current = { ...rawBlocks[0] }

  for (const next of rawBlocks.slice(1)) {
    const shouldJoin = syntaxCrossesGap(nodes, current, next)
      || isDeclarationPreamble(nodes, current)

    if (shouldJoin) {
      current.lastIndex = next.lastIndex
      current.to = next.to
    } else {
      blocks.push(current)
      current = { ...next }
    }
  }
  blocks.push(current)
  return blocks
}

export const findLiveCodeBlock = (code, cursor = 0) => {
  const source = String(code ?? '')
  const lines = readLines(source)
  const currentIndex = lineIndexAt(lines, clampPosition(cursor, source.length))
  const block = readLiveCodeBlocks(source, lines).find(({ firstIndex, lastIndex }) =>
    currentIndex >= firstIndex && currentIndex <= lastIndex
  )
  if (!block) return null

  const { from, to } = block
  return {
    code: source.slice(from, to),
    range: { from, to }
  }
}

export const splitLiveExecutionBlocks = (code) => {
  const source = String(code ?? '')
  const lines = readLines(source)
  return readLiveCodeBlocks(source, lines)
    .map(({ from, to }) => source.slice(from, to).trim())
    .filter(Boolean)
}
