const imageExtensions = new Set([
  'avif',
  'bmp',
  'gif',
  'heic',
  'heif',
  'jpeg',
  'jpg',
  'png',
  'svg',
  'webp'
])

const videoExtensions = new Set([
  'm4v',
  'mkv',
  'mov',
  'mp4',
  'mpeg',
  'mpg',
  'ogg',
  'ogv',
  'webm'
])

const extensionOf = (name = '') => {
  const match = /\.([^.]+)$/u.exec(String(name).trim())
  return match?.[1]?.toLowerCase() ?? ''
}

export const classifyMediaFile = (file) => {
  const type = String(file?.type ?? '').trim().toLowerCase().split(';', 1)[0]
  if (type.startsWith('image/')) return 'image'
  if (type.startsWith('video/')) return 'video'

  const extension = extensionOf(file?.name)
  if (imageExtensions.has(extension)) return 'image'
  if (videoExtensions.has(extension)) return 'video'
  return null
}

export const isSupportedMediaFile = (file) => classifyMediaFile(file) !== null

const splitFileName = (name) => {
  const normalized = String(name ?? '').trim()
  const match = /^(.*?)(\.[^.]*)?$/u.exec(normalized)
  return {
    stem: match?.[1] || 'media',
    extension: match?.[2] ?? ''
  }
}

const describeUnknownEntry = (key, entries) => {
  const requested = key === undefined ? 'the latest file' : JSON.stringify(key)
  const available = entries.length > 0
    ? ` Available: ${entries.map((entry) => JSON.stringify(entry.name)).join(', ')}.`
    : ' Drop an image or video onto Hydra first.'
  return `Hydra media: could not find ${requested}.${available}`
}

export const createMediaLibrary = ({ urlApi = globalThis.URL } = {}) => {
  if (!urlApi || typeof urlApi.createObjectURL !== 'function') {
    throw new Error('Hydra media requires URL.createObjectURL support.')
  }

  const entries = []
  const listeners = new Set()
  let nextId = 1

  const notify = (event) => {
    const snapshot = entries.slice()
    for (const listener of listeners) listener(snapshot, event)
  }

  const uniqueName = (preferredName) => {
    const existingNames = new Set(entries.map((entry) => entry.name))
    const initial = String(preferredName ?? '').trim() || 'media'
    if (!existingNames.has(initial)) return initial

    const { stem, extension } = splitFileName(initial)
    let suffix = 2
    while (existingNames.has(`${stem}-${suffix}${extension}`)) suffix += 1
    return `${stem}-${suffix}${extension}`
  }

  const resolve = (key) => {
    if (entries.length === 0) return null
    if (key === undefined || key === null || key === '') return entries.at(-1) ?? null
    if (typeof key === 'number' && Number.isInteger(key)) return entries.at(key) ?? null
    if (typeof key === 'object') {
      if (entries.includes(key)) return key
      if ('id' in key) return entries.find((entry) => entry.id === key.id) ?? null
      if ('name' in key) return entries.find((entry) => entry.name === key.name) ?? null
    }
    const requested = String(key)
    return entries.find((entry) => entry.name === requested || entry.id === requested) ?? null
  }

  const addOne = (file) => {
    const kind = classifyMediaFile(file)
    if (!kind) {
      const name = String(file?.name ?? 'unnamed file')
      throw new TypeError(`Hydra media: ${name} is not a supported image or video.`)
    }

    const id = `media-${nextId}`
    nextId += 1
    const originalName = String(file?.name ?? '').trim() || `${kind}-${id}`
    const entry = Object.freeze({
      id,
      name: uniqueName(originalName),
      originalName,
      kind,
      type: String(file?.type ?? ''),
      size: Number(file?.size ?? 0) || 0,
      lastModified: Number(file?.lastModified ?? 0) || 0,
      file,
      url: urlApi.createObjectURL(file)
    })
    entries.push(entry)
    return entry
  }

  const add = (file) => {
    const entry = addOne(file)
    notify({ type: 'add', entries: [entry] })
    return entry
  }

  const addAll = (files) => {
    const accepted = []
    const rejected = []
    for (const file of Array.from(files ?? [])) {
      try {
        accepted.push(addOne(file))
      } catch (error) {
        rejected.push({ file, error })
      }
    }
    if (accepted.length > 0 || rejected.length > 0) {
      notify({ type: 'add-all', entries: accepted.slice(), rejected: rejected.slice() })
    }
    return { accepted, rejected }
  }

  const get = (key) => resolve(key)

  const url = (key) => {
    const entry = resolve(key)
    if (!entry) throw new Error(describeUnknownEntry(key, entries))
    return entry.url
  }

  const remove = (key) => {
    const entry = resolve(key)
    if (!entry) return false
    const index = entries.indexOf(entry)
    entries.splice(index, 1)
    if (typeof urlApi.revokeObjectURL === 'function') urlApi.revokeObjectURL(entry.url)
    notify({ type: 'remove', entries: [entry] })
    return true
  }

  const clear = () => {
    if (entries.length === 0) return 0
    const removed = entries.splice(0)
    if (typeof urlApi.revokeObjectURL === 'function') {
      for (const entry of removed) urlApi.revokeObjectURL(entry.url)
    }
    notify({ type: 'clear', entries: removed })
    return removed.length
  }

  const subscribe = (listener) => {
    if (typeof listener !== 'function') throw new TypeError('Hydra media listener must be a function.')
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  const media = (key) => url(key)
  Object.assign(media, {
    add,
    addAll,
    host: add,
    hostAll: addAll,
    get,
    url,
    list: () => entries.slice(),
    remove,
    clear,
    subscribe,
    supports: isSupportedMediaFile
  })

  return media
}

export const createMediaBufferManager = ({
  library,
  bufferNames = ['s0', 's1', 's2', 's3'],
  resolveSource
} = {}) => {
  if (
    !library ||
    typeof library.get !== 'function' ||
    typeof library.url !== 'function' ||
    typeof library.remove !== 'function' ||
    typeof library.clear !== 'function' ||
    typeof library.subscribe !== 'function'
  ) {
    throw new TypeError('Hydra media buffers require a media library.')
  }
  if (typeof resolveSource !== 'function') {
    throw new TypeError('Hydra media buffers require a source resolver.')
  }

  const names = Array.from(new Set(bufferNames.map((name) => String(name))))
  if (names.length === 0) throw new TypeError('Hydra media buffers require at least one buffer name.')

  const assignments = new Map()
  const listeners = new Set()
  let disposed = false

  const normalizeBufferName = (name = names[0]) => {
    const normalized = String(name)
    if (!names.includes(normalized)) {
      throw new RangeError(`Hydra media: unknown buffer ${JSON.stringify(normalized)}.`)
    }
    return normalized
  }

  const entryFor = (bufferName) => {
    const entryId = assignments.get(normalizeBufferName(bufferName))
    return entryId ? library.get(entryId) : null
  }

  const buffersFor = (entryOrKey) => {
    const entry = library.get(entryOrKey)
    if (!entry) return []
    return names.filter((name) => assignments.get(name) === entry.id)
  }

  const notify = (event) => {
    const snapshot = names.map((name) => ({ name, entry: entryFor(name) }))
    for (const listener of listeners) listener(snapshot, event)
  }

  const clearSource = (bufferName) => {
    const source = resolveSource(bufferName)
    if (source && typeof source.clear === 'function') source.clear()
  }

  const releaseRemovedEntries = (_entries, event) => {
    if (!event || (event.type !== 'remove' && event.type !== 'clear')) return
    const removedIds = new Set(event.entries.map((entry) => entry.id))
    const releasedBuffers = []
    for (const [bufferName, entryId] of assignments) {
      if (!removedIds.has(entryId)) continue
      clearSource(bufferName)
      assignments.delete(bufferName)
      releasedBuffers.push(bufferName)
    }
    if (releasedBuffers.length > 0) {
      notify({ type: 'library-release', buffers: releasedBuffers, entries: event.entries })
    }
  }

  const unsubscribeLibrary = library.subscribe(releaseRemovedEntries)

  const assign = (entryOrKey, bufferName = names[0]) => {
    if (disposed) throw new Error('Hydra media buffers have been disposed.')
    const normalizedBuffer = normalizeBufferName(bufferName)
    const entry = library.get(entryOrKey)
    if (!entry) throw new Error(`Hydra media: cannot assign missing entry to ${normalizedBuffer}.`)

    const source = resolveSource(normalizedBuffer)
    const method = entry.kind === 'video' ? 'initVideo' : 'initImage'
    if (!source || typeof source[method] !== 'function') {
      throw new Error(`Hydra media: ${normalizedBuffer}.${method} is unavailable.`)
    }

    const previous = entryFor(normalizedBuffer)
    // Reinitialize the source before revoking the previous library URL. The
    // source node pauses and detaches the old media element synchronously.
    source[method](library.url(entry))
    assignments.set(normalizedBuffer, entry.id)
    notify({ type: 'assign', buffer: normalizedBuffer, entry, previous })

    if (previous && previous.id !== entry.id && buffersFor(previous).length === 0) {
      library.remove(previous)
    }

    return { buffer: normalizedBuffer, entry, previous }
  }

  const release = (bufferName = names[0], { remove = true } = {}) => {
    if (disposed) return null
    const normalizedBuffer = normalizeBufferName(bufferName)
    const entry = entryFor(normalizedBuffer)
    clearSource(normalizedBuffer)
    assignments.delete(normalizedBuffer)
    notify({ type: 'release', buffer: normalizedBuffer, entry })
    if (remove && entry && buffersFor(entry).length === 0) library.remove(entry)
    return entry
  }

  const clear = ({ clearLibrary = true } = {}) => {
    if (disposed) return 0
    const activeBuffers = Array.from(assignments.keys())
    for (const bufferName of activeBuffers) clearSource(bufferName)
    assignments.clear()
    notify({ type: 'clear-buffers', buffers: activeBuffers })
    return clearLibrary ? library.clear() : activeBuffers.length
  }

  const subscribe = (listener) => {
    if (typeof listener !== 'function') throw new TypeError('Hydra media buffer listener must be a function.')
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  const dispose = () => {
    if (disposed) return
    disposed = true
    unsubscribeLibrary()
    assignments.clear()
    listeners.clear()
  }

  return {
    names: names.slice(),
    assign,
    release,
    clear,
    get: entryFor,
    buffersFor,
    list: () => names.map((name) => ({ name, entry: entryFor(name) })),
    subscribe,
    dispose
  }
}
