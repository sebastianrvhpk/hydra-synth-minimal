const clamp01 = (value, fallback = 0) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(1, Math.max(0, number))
}

const formatNumber = (value) => {
  const absolute = Math.abs(value)
  if (absolute >= 10) return value.toFixed(1).replace(/\.0$/u, '')
  if (absolute >= 1) return value.toFixed(2).replace(/0+$/u, '').replace(/\.$/u, '')
  return value.toFixed(3).replace(/0+$/u, '').replace(/\.$/u, '')
}

export const datastreamControlDefinitions = Object.freeze([
  {
    id: 'cc19',
    cc: 19,
    label: 'grid scale',
    initial: 0.5,
    mappings: [[1, 0.25], [1, 0.5]]
  },
  {
    id: 'cc23',
    cc: 23,
    label: 'line noise cut',
    initial: 0.5,
    mappings: [[2, 0]]
  },
  {
    id: 'cc26',
    cc: 26,
    label: 'feedback displacement',
    initial: 0,
    mappings: [[0, 10]]
  },
  {
    id: 'cc27',
    cc: 27,
    label: 'video threshold',
    initial: 0.67,
    mappings: [[1.5, 0.75]]
  },
  {
    id: 'cc31',
    cc: 31,
    label: 'colour / field cut',
    initial: 0.5,
    mappings: [[0, 4], [1.5, 0.5]]
  },
  {
    id: 'cc48',
    cc: 48,
    label: 'difference band',
    initial: 0.75,
    mappings: [[1.5, 0.525], [1.5, 0.475]]
  },
  {
    id: 'cc49',
    cc: 49,
    label: 'green / field x',
    initial: 0.5,
    mappings: [[0, 4], [0, 1]]
  },
  {
    id: 'cc53',
    cc: 53,
    label: 'field y',
    initial: 0.5,
    mappings: [[0, 1]]
  },
  {
    id: 'cc57',
    cc: 57,
    label: 'video modulation',
    initial: 0,
    mappings: [[0, 10]]
  },
  {
    id: 'cc61',
    cc: 61,
    label: 'line position',
    initial: 0.5,
    mappings: [[0, 1]]
  }
])

const definitionMap = new Map(datastreamControlDefinitions.map((definition) => [definition.id, definition]))

export const createDatastreamControlBank = (definitions = datastreamControlDefinitions) => {
  const normalizedDefinitions = definitions.map((definition) => ({ ...definition }))
  const values = new Map(normalizedDefinitions.map((definition) => [
    definition.id,
    clamp01(definition.initial, 0)
  ]))
  const listeners = new Set()

  const definitionFor = (id) => {
    const definition = normalizedDefinitions.find((candidate) => candidate.id === id)
    if (!definition) throw new RangeError(`DATASTREAM: unknown control ${JSON.stringify(id)}.`)
    return definition
  }

  const get = (id) => {
    definitionFor(id)
    return values.get(id) ?? 0
  }

  const range = (id, min = 0, max = 1) => {
    const value = get(id)
    const lower = Number(min)
    const upper = Number(max)
    return lower + (upper - lower) * value
  }

  const snapshot = () => normalizedDefinitions.map((definition) => ({
    ...definition,
    normalized: get(definition.id),
    mapped: definition.mappings.map(([min, max]) => range(definition.id, min, max))
  }))

  const notify = (event) => {
    const state = snapshot()
    for (const listener of listeners) listener(state, event)
  }

  const set = (id, value, options = {}) => {
    const definition = definitionFor(id)
    const previous = get(id)
    const normalized = clamp01(value, previous)
    values.set(id, normalized)
    if (options.silent !== true && normalized !== previous) {
      notify({ type: 'set', id, definition, previous, value: normalized })
    }
    return normalized
  }

  const reset = (options = {}) => {
    for (const definition of normalizedDefinitions) {
      values.set(definition.id, clamp01(definition.initial, 0))
    }
    if (options.silent !== true) notify({ type: 'reset' })
    return snapshot()
  }

  const subscribe = (listener) => {
    if (typeof listener !== 'function') {
      throw new TypeError('DATASTREAM control listener must be a function.')
    }
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  return Object.freeze({
    definitions: normalizedDefinitions,
    get,
    range,
    set,
    reset,
    snapshot,
    subscribe,
    format(id) {
      const definition = definitionFor(id)
      return definition.mappings
        .map(([min, max]) => formatNumber(range(id, min, max)))
        .join(' / ')
    }
  })
}

const isVideoSource = (file) => {
  const type = String(file?.type ?? '').toLowerCase()
  const name = String(file?.name ?? file?.url ?? '').toLowerCase()
  return type.startsWith('video/') || /\.(?:m4v|mkv|mov|mp4|mpeg|mpg|ogg|ogv|webm)$/u.test(name)
}

const naturalVideoOrder = (left, right) => String(left?.name ?? '').localeCompare(
  String(right?.name ?? ''),
  undefined,
  { numeric: true, sensitivity: 'base' }
)

export const createDatastreamVideoPlaylist = ({
  source,
  sources = [],
  library,
  buffers,
  bufferName = 's0',
  maxFiles = 3
} = {}) => {
  const directSourceMode = Boolean(
    source && typeof source.initVideo === 'function' && typeof source.clear === 'function'
  )
  const managedLibraryMode = Boolean(
    library &&
    typeof library.add === 'function' &&
    typeof library.remove === 'function' &&
    buffers &&
    typeof buffers.assign === 'function' &&
    typeof buffers.release === 'function'
  )
  if (!directSourceMode && !managedLibraryMode) {
    throw new TypeError(
      'DATASTREAM videos require either a Hydra source or managed media buffers.'
    )
  }

  const listeners = new Set()
  let files = []
  let activeIndex = -1
  let activeEntry = null

  const snapshot = () => ({
    bufferName,
    files: files.slice(),
    activeIndex,
    activeFile: activeIndex >= 0 ? files[activeIndex] ?? null : null,
    activeEntry
  })

  const notify = (event) => {
    const state = snapshot()
    for (const listener of listeners) listener(state, event)
  }

  const releaseActive = () => {
    if (activeIndex < 0 && !activeEntry) return null
    const released = activeEntry
    if (directSourceMode) source.clear()
    else buffers.release(bufferName)
    activeIndex = -1
    activeEntry = null
    return released
  }

  const setFiles = (nextFiles) => {
    const supported = Array.from(nextFiles ?? []).filter(isVideoSource).sort(naturalVideoOrder)
    if (supported.length === 0) {
      throw new TypeError('DATASTREAM: provide at least one video source.')
    }
    const released = releaseActive()
    files = supported.slice(0, Math.max(1, Number(maxFiles) || 3))
    notify({
      type: 'set-files',
      files: files.slice(),
      ignored: supported.slice(files.length),
      released
    })
    return snapshot()
  }

  const activate = (index) => {
    if (files.length === 0) throw new Error('DATASTREAM: choose the video files first.')
    const normalizedIndex = ((Math.trunc(Number(index)) % files.length) + files.length) % files.length
    const file = files[normalizedIndex]

    if (directSourceMode) {
      const previous = activeEntry
      // HydraSourceNode.initVideo() synchronously clears the prior video element,
      // its listeners and decoder-facing src before the replacement is created.
      source.initVideo(file.url ?? file, file.params ?? {})
      activeEntry = file
      activeIndex = normalizedIndex
      notify({
        type: 'activate',
        index: activeIndex,
        file,
        entry: activeEntry,
        released: previous
      })
      return snapshot()
    }

    const entry = library.add(file)
    try {
      const assignment = buffers.assign(entry, bufferName)
      activeEntry = assignment.entry
      activeIndex = normalizedIndex
      notify({
        type: 'activate',
        index: activeIndex,
        file,
        entry: activeEntry,
        released: assignment.previous ?? null
      })
      return snapshot()
    } catch (error) {
      if (library.get(entry)) library.remove(entry)
      throw error
    }
  }

  const next = () => activate(activeIndex < 0 ? 0 : activeIndex + 1)
  const previous = () => activate(activeIndex < 0 ? files.length - 1 : activeIndex - 1)

  const release = ({ forgetFiles = false } = {}) => {
    const released = releaseActive()
    if (forgetFiles) files = []
    notify({ type: 'release', entry: released, forgetFiles })
    return released
  }

  const subscribe = (listener) => {
    if (typeof listener !== 'function') {
      throw new TypeError('DATASTREAM video listener must be a function.')
    }
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  if (Array.from(sources ?? []).length > 0) setFiles(sources)

  return Object.freeze({
    setFiles,
    setSources: setFiles,
    activate,
    next,
    previous,
    release,
    snapshot,
    subscribe
  })
}

// DATASTREAM is a toured work by Hypereikon. MIDI input is deliberately
// replaced by the browser controls installed on its dedicated route.
export const datastreamPatch = `// Hypereikon — DATASTREAM
// The three source videos are hosted with this page.
// Only the active video is attached to s0; the previous one is released.

fps = 60
speed = .25

src(o2)
  .scrollX(-1 / width)
  .modulate(
    osc(Math.PI / 2, 2).brightness(-.5).color(0, 1 / height),
    () => datastreamControls.range('cc26', 0, 10)
  )
  .modulate(
    src(s0)
      .scale(1, 4 / 3)
      .brightness(-.5)
      .color(
        () => datastreamControls.range('cc31', 0, 4),
        () => datastreamControls.range('cc49', 0, 4)
      )
      .color(1 / width, 1 / height),
    1
  )
  .layer(
    src(s0)
      .scale(1, 4 / 3)
      .diff(solid(1, 1, 1).mask(ns(.4, .875).pixelate(width, 1).thresh(0, 0)))
      .mask(
        solid()
          .add(
            ns(.5, .5)
              .modulate(solid(1, 0), () => time * .5)
              .thresh(0, 0)
              .pixelate(width, 1)
              .mask(
                shape(4, 1, 0)
                  .scale(() => datastreamControls.range('cc19', 1, .25), 1, 1, 1, 1)
                  .repeat(width / 4, height / 4, 0, .5)
              )
          )
          .add(
            ns(.5, .5)
              .modulate(solid(1, 0), () => time * .25)
              .thresh(0, 0)
              .mask(
                shape(4, 1, 0)
                  .scale(() => datastreamControls.range('cc19', 1, .25), 1, 1, 0, 0)
                  .repeat(width / 4, height / 4, 0, .5)
              )
          )
          .add(shape(4, 1, 0).scale(1, 50 / width, 1, () => datastreamControls.get('cc61')))
          .thresh(.5, 0)
      )
  )
  .layer(
    src(s0)
      .scale(1, 4 / 3)
      .mask(
        noise(1, .25)
          .thresh(() => datastreamControls.range('cc31', 1.5, .5), 0)
          .modulate(
            solid(
              () => datastreamControls.range('cc49', 0, 1),
              () => datastreamControls.range('cc53', 0, 1)
            ),
            1
          )
      )
  )
  .layer(
    src(s0)
      .mask(src(s0).thresh(() => datastreamControls.range('cc27', 1.5, .75), 0))
      .scale(1, 4 / 3)
  )
  .out(o2)

src(o0)
  .scrollX(-1 / width)
  .modulate(
    osc(Math.PI / 2, 2).brightness(-.5).color(0, 1 / height),
    () => datastreamControls.range('cc26', 0, 10)
  )
  .layer(
    src(s0)
      .scale(1, 4 / 3)
      .mask(
        osc(Math.PI * height, 1 / height)
          .rotate(Math.PI / 2)
          .mask(
            osc(Math.PI * 2, -1)
              .thresh(.25, 0)
              .mask(noise(1, 1).thresh(() => datastreamControls.range('cc23', 2, 0), 0))
          )
          .thresh(.5, 0)
      )
      .mask(
        shape(4, 1, 0)
          .scale(() => datastreamControls.range('cc19', 1, .5), 1, 1, 0, 0)
          .repeat(width / 2, height / 2, .5, 1)
      )
  )
  .modulate(
    src(o2)
      .color(1 / width, 1 / height)
      .mask(noise(100, 1).pixelate(1, 1).thresh(.5, 0)),
    1
  )
  .layer(
    src(s0)
      .scale(1, 4 / 3)
      .mask(
        noise(1, 1)
          .thresh(() => datastreamControls.range('cc48', 1.5, .525), 0)
          .diff(noise(1, 1).thresh(() => datastreamControls.range('cc48', 1.5, .475), 0))
          .scale(1, A)
          .modulate(
            solid(
              () => datastreamControls.range('cc49', 0, 1),
              () => datastreamControls.range('cc53', 0, 1)
            ),
            1
          )
      )
  )
  .layer(
    src(s0)
      .scale(1, 4 / 3)
      .mask(noise(1, .25).thresh(() => datastreamControls.range('cc31', 1.5, .5), 0))
  )
  .layer(
    src(s0)
      .mask(src(s0).thresh(() => datastreamControls.range('cc27', 1.5, .75), 0))
      .scale(1, 4 / 3)
  )
  .out(o0)

src(o1)
  .scrollX(1 / width)
  .layer(
    src(s0)
      .scale(1, 4 / 3)
      .mask(shape(4, 1, 0).scale(1, 50 / width, 1, () => datastreamControls.get('cc61')))
  )
  .modulate(
    src(s0).color(1 / width, 0),
    () => datastreamControls.range('cc57', 0, 10)
  )
  .out(o1)

render(o1)`

export const datastreamControlDefinitionFor = (id) => definitionMap.get(id) ?? null
