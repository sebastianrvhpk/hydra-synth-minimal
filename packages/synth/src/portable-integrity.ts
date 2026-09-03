const textEncoder = new TextEncoder()

const bytesToHex = (bytes: Uint8Array): string => (
  Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
)

const numberBits = (value: number): string => {
  if (!Number.isFinite(value)) throw new Error('Portable Hydra artifacts cannot contain non-finite numbers.')
  const buffer = new ArrayBuffer(8)
  const view = new DataView(buffer)
  view.setFloat64(0, Object.is(value, -0) ? 0 : value, false)
  return bytesToHex(new Uint8Array(buffer))
}

/**
 * Encode JSON-compatible data without relying on engine-specific float
 * formatting. Numbers are represented by their IEEE-754 binary64 bits and
 * object keys are sorted, so Python can reproduce the same byte stream.
 */
export const encodePortableHashTree = (value: unknown): string => {
  if (value === null) return 'N'
  if (typeof value === 'boolean') return value ? 'T' : 'F'
  if (typeof value === 'number') return `D${numberBits(value)}`
  if (typeof value === 'string') {
    const byteLength = textEncoder.encode(value).byteLength
    return `S${byteLength}:${value}`
  }
  if (Array.isArray(value)) {
    return `A${value.length}[${value.map(encodePortableHashTree).join('')}]`
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const keys = Object.keys(record).sort()
    return `O${keys.length}{${keys.map((key) => (
      `${encodePortableHashTree(key)}${encodePortableHashTree(record[key])}`
    )).join('')}}`
  }
  throw new Error(`Unsupported portable artifact value: ${typeof value}`)
}

const sha256 = async (bytes: Uint8Array): Promise<string> => {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) {
    throw new Error('Hydra compilation requires the standard Web Crypto SHA-256 API.')
  }
  const digest = await subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>)
  return bytesToHex(new Uint8Array(digest))
}

export const hashPortableText = async (value: string): Promise<string> => (
  await sha256(textEncoder.encode(value))
)

export const hashPortableValue = async (value: unknown): Promise<string> => (
  await sha256(textEncoder.encode(encodePortableHashTree(value)))
)
