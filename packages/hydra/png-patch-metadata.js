export const hydraPngPatchKeyword = 'hydra-patch'
export const hydraPngPatchKind = 'hydra-live-patch'
export const hydraPngPatchVersion = 1

const pngSignature = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10)
const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()
const latin1Decoder = new TextDecoder('iso-8859-1')
const maxMetadataBytes = 2 * 1024 * 1024

const readUint32 = (bytes, offset) => (
  ((bytes[offset] << 24) >>> 0) |
  (bytes[offset + 1] << 16) |
  (bytes[offset + 2] << 8) |
  bytes[offset + 3]
) >>> 0

const writeUint32 = (bytes, offset, value) => {
  const normalized = Number(value) >>> 0
  bytes[offset] = normalized >>> 24
  bytes[offset + 1] = normalized >>> 16
  bytes[offset + 2] = normalized >>> 8
  bytes[offset + 3] = normalized
}

const crc32 = (bytes) => {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

const chunkType = (bytes, offset) => String.fromCharCode(
  bytes[offset],
  bytes[offset + 1],
  bytes[offset + 2],
  bytes[offset + 3]
)

const indexOfNull = (bytes, from = 0) => {
  for (let index = from; index < bytes.length; index += 1) {
    if (bytes[index] === 0) return index
  }
  return -1
}

const isPngBytes = (bytes) => {
  if (bytes.length < pngSignature.length) return false
  return pngSignature.every((value, index) => bytes[index] === value)
}

const toBytes = async (source) => {
  if (source instanceof Uint8Array) return source
  if (source instanceof ArrayBuffer) return new Uint8Array(source)
  if (ArrayBuffer.isView(source)) {
    return new Uint8Array(source.buffer, source.byteOffset, source.byteLength)
  }
  if (source && typeof source.arrayBuffer === 'function') {
    return new Uint8Array(await source.arrayBuffer())
  }
  throw new TypeError('Hydra PNG metadata requires a Blob, ArrayBuffer, or Uint8Array.')
}

const createChunk = (type, data) => {
  const typeBytes = textEncoder.encode(type)
  if (typeBytes.length !== 4) throw new TypeError('PNG chunk types must contain four bytes.')
  const chunk = new Uint8Array(12 + data.length)
  writeUint32(chunk, 0, data.length)
  chunk.set(typeBytes, 4)
  chunk.set(data, 8)
  writeUint32(chunk, 8 + data.length, crc32(chunk.subarray(4, 8 + data.length)))
  return chunk
}

const createHydraPatchChunk = (payload) => {
  const keyword = textEncoder.encode(hydraPngPatchKeyword)
  const text = textEncoder.encode(JSON.stringify(payload))
  if (text.length > maxMetadataBytes) {
    throw new RangeError('Hydra patch metadata is too large to embed in a PNG.')
  }

  // PNG iTXt: keyword, compression flag/method, language, translated keyword, UTF-8 text.
  const data = new Uint8Array(keyword.length + 5 + text.length)
  data.set(keyword, 0)
  let offset = keyword.length
  data[offset] = 0
  data[offset + 1] = 0
  data[offset + 2] = 0
  data[offset + 3] = 0
  data[offset + 4] = 0
  data.set(text, offset + 5)
  return createChunk('iTXt', data)
}

const decodeTextChunk = (type, data) => {
  if (data.length > maxMetadataBytes) return null
  const keywordEnd = indexOfNull(data)
  if (keywordEnd < 1) return null
  const keyword = latin1Decoder.decode(data.subarray(0, keywordEnd))
  if (keyword !== hydraPngPatchKeyword) return null

  if (type === 'tEXt') {
    return latin1Decoder.decode(data.subarray(keywordEnd + 1))
  }

  if (type !== 'iTXt') return null
  const compressionFlagOffset = keywordEnd + 1
  const compressionMethodOffset = compressionFlagOffset + 1
  if (compressionMethodOffset >= data.length) return null
  if (data[compressionFlagOffset] !== 0 || data[compressionMethodOffset] !== 0) return null
  const languageEnd = indexOfNull(data, compressionMethodOffset + 1)
  if (languageEnd < 0) return null
  const translatedKeywordEnd = indexOfNull(data, languageEnd + 1)
  if (translatedKeywordEnd < 0) return null
  return textDecoder.decode(data.subarray(translatedKeywordEnd + 1))
}

const parseHydraPatchPayload = (text) => {
  if (!text) return null
  try {
    const payload = JSON.parse(text)
    if (
      !payload ||
      payload.kind !== hydraPngPatchKind ||
      !Number.isInteger(payload.version) ||
      payload.version < 1 ||
      typeof payload.code !== 'string'
    ) {
      return null
    }
    return Object.freeze({
      kind: payload.kind,
      version: payload.version,
      language: typeof payload.language === 'string' ? payload.language : 'javascript',
      generator: typeof payload.generator === 'string' ? payload.generator : '',
      code: payload.code
    })
  } catch {
    return null
  }
}

export const createHydraPngPatchPayload = (code) => Object.freeze({
  kind: hydraPngPatchKind,
  version: hydraPngPatchVersion,
  language: 'javascript',
  generator: 'hydra-webgpu-live',
  code: String(code ?? '')
})

export const embedHydraPatchInPng = async (png, code) => {
  const bytes = await toBytes(png)
  if (!isPngBytes(bytes)) throw new TypeError('Hydra patch metadata can only be embedded in PNG files.')

  let offset = pngSignature.length
  let iendOffset = -1
  while (offset + 12 <= bytes.length) {
    const dataLength = readUint32(bytes, offset)
    const dataEnd = offset + 8 + dataLength
    const chunkEnd = dataEnd + 4
    if (dataEnd < offset || chunkEnd > bytes.length) break
    if (chunkType(bytes, offset + 4) === 'IEND') {
      iendOffset = offset
      break
    }
    offset = chunkEnd
  }
  if (iendOffset < 0) throw new TypeError('PNG file is missing its IEND chunk.')

  const patchChunk = createHydraPatchChunk(createHydraPngPatchPayload(code))
  const output = new Uint8Array(bytes.length + patchChunk.length)
  output.set(bytes.subarray(0, iendOffset), 0)
  output.set(patchChunk, iendOffset)
  output.set(bytes.subarray(iendOffset), iendOffset + patchChunk.length)
  return new Blob([output], { type: 'image/png' })
}

const readHydraPatchFromBlob = async (png) => {
  if (png.size < pngSignature.length) return null
  const signature = new Uint8Array(await png.slice(0, pngSignature.length).arrayBuffer())
  if (!isPngBytes(signature)) return null

  let offset = pngSignature.length
  let patch = null
  while (offset + 12 <= png.size) {
    const header = new Uint8Array(await png.slice(offset, offset + 8).arrayBuffer())
    if (header.length < 8) return patch
    const dataLength = readUint32(header, 0)
    const dataStart = offset + 8
    const dataEnd = dataStart + dataLength
    const chunkEnd = dataEnd + 4
    if (dataEnd < dataStart || chunkEnd > png.size) return patch
    const type = chunkType(header, 4)
    if ((type === 'iTXt' || type === 'tEXt') && dataLength <= maxMetadataBytes) {
      const data = new Uint8Array(await png.slice(dataStart, dataEnd).arrayBuffer())
      const candidate = parseHydraPatchPayload(decodeTextChunk(type, data))
      if (candidate) patch = candidate
    }
    if (type === 'IEND') return patch
    offset = chunkEnd
  }
  return patch
}

export const readHydraPatchFromPng = async (png) => {
  if (
    png &&
    typeof png.size === 'number' &&
    typeof png.slice === 'function' &&
    typeof png.arrayBuffer === 'function'
  ) {
    return readHydraPatchFromBlob(png)
  }

  const bytes = await toBytes(png)
  if (!isPngBytes(bytes)) return null

  let offset = pngSignature.length
  let patch = null
  while (offset + 12 <= bytes.length) {
    const dataLength = readUint32(bytes, offset)
    const dataStart = offset + 8
    const dataEnd = dataStart + dataLength
    const chunkEnd = dataEnd + 4
    if (dataEnd < dataStart || chunkEnd > bytes.length) return patch
    const type = chunkType(bytes, offset + 4)
    if (type === 'iTXt' || type === 'tEXt') {
      const candidate = parseHydraPatchPayload(decodeTextChunk(type, bytes.subarray(dataStart, dataEnd)))
      if (candidate) patch = candidate
    }
    if (type === 'IEND') return patch
    offset = chunkEnd
  }
  return patch
}
