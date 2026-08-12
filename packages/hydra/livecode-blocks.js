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

const lineIndexAt = (lines, position) => {
  for (let index = 0; index < lines.length - 1; index += 1) {
    if (position < lines[index + 1].from) return index
  }
  return lines.length - 1
}

export const findLiveCodeBlock = (code, cursor = 0) => {
  const source = String(code ?? '')
  const lines = readLines(source)
  const currentIndex = lineIndexAt(lines, clampPosition(cursor, source.length))
  if (isBlankLine(lines[currentIndex])) return null

  let firstIndex = currentIndex
  let lastIndex = currentIndex
  while (firstIndex > 0 && !isBlankLine(lines[firstIndex - 1])) firstIndex -= 1
  while (lastIndex < lines.length - 1 && !isBlankLine(lines[lastIndex + 1])) lastIndex += 1

  const from = lines[firstIndex].from
  const to = lines[lastIndex].to
  return {
    code: source.slice(from, to),
    range: { from, to }
  }
}

export const splitLiveExecutionBlocks = (code) => {
  const source = String(code ?? '')
  const lines = readLines(source)
  const blocks = []
  let firstIndex = null

  const flush = (lastIndex) => {
    if (firstIndex === null) return
    const block = source.slice(lines[firstIndex].from, lines[lastIndex].to).trim()
    if (block) blocks.push(block)
    firstIndex = null
  }

  for (let index = 0; index < lines.length; index += 1) {
    if (isBlankLine(lines[index])) flush(index - 1)
    else if (firstIndex === null) firstIndex = index
  }
  flush(lines.length - 1)
  return blocks
}
