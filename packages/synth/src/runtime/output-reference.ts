const OUTPUT_IDENTIFIER_PATTERN = /\bo(\d+)\b/g

const stripStringsAndComments = (code: string): string => {
  let output = ''
  let index = 0
  let state: 'code' | 'lineComment' | 'blockComment' | 'singleQuote' | 'doubleQuote' | 'template' = 'code'

  while (index < code.length) {
    const current = code[index] ?? ''
    const next = code[index + 1] ?? ''

    if (state === 'lineComment') {
      if (current === '\n' || current === '\r') {
        state = 'code'
        output += current
      } else {
        output += ' '
      }
      index += 1
      continue
    }

    if (state === 'blockComment') {
      if (current === '*' && next === '/') {
        output += '  '
        index += 2
        state = 'code'
      } else {
        output += current === '\n' || current === '\r' ? current : ' '
        index += 1
      }
      continue
    }

    if (state === 'singleQuote' || state === 'doubleQuote' || state === 'template') {
      const terminator = state === 'singleQuote' ? '\'' : state === 'doubleQuote' ? '"' : '`'
      if (current === '\\') {
        output += '  '
        index += 2
        continue
      }
      if (current === terminator) {
        output += ' '
        index += 1
        state = 'code'
        continue
      }
      output += current === '\n' || current === '\r' ? current : ' '
      index += 1
      continue
    }

    if (current === '/' && next === '/') {
      output += '  '
      index += 2
      state = 'lineComment'
      continue
    }
    if (current === '/' && next === '*') {
      output += '  '
      index += 2
      state = 'blockComment'
      continue
    }
    if (current === '\'') {
      output += ' '
      index += 1
      state = 'singleQuote'
      continue
    }
    if (current === '"') {
      output += ' '
      index += 1
      state = 'doubleQuote'
      continue
    }
    if (current === '`') {
      output += ' '
      index += 1
      state = 'template'
      continue
    }

    output += current
    index += 1
  }

  return output
}

export const findReferencedOutputIndices = (code: string): number[] => {
  const stripped = stripStringsAndComments(code)
  const indices = new Set<number>()
  let match: RegExpExecArray | null

  OUTPUT_IDENTIFIER_PATTERN.lastIndex = 0
  while ((match = OUTPUT_IDENTIFIER_PATTERN.exec(stripped))) {
    const rawIndex = match[1]
    if (!rawIndex) continue
    const index = Number(rawIndex)
    if (Number.isSafeInteger(index) && index >= 0) indices.add(index)
  }

  return Array.from(indices).sort((left, right) => left - right)
}
