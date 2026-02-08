class PipelineCache {
  constructor ({ device, targetFormat, maxEntries = 256 }) {
    this.device = device
    this.targetFormat = targetFormat
    this.maxEntries = Math.max(1, Math.floor(maxEntries))
    this.entries = new Map()
  }

  _hashString (value = '') {
    let hash = 2166136261
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i)
      hash = Math.imul(hash, 16777619)
    }
    return (hash >>> 0).toString(16).padStart(8, '0')
  }

  _buildEntryKey (signature, code, collisionIndex = 0) {
    const base = `${signature}|h${this._hashString(code)}|l${code.length}`
    if (collisionIndex <= 0) return base
    return `${base}|c${collisionIndex}`
  }

  _findEntry (signature, code) {
    let collisionIndex = 0
    while (true) {
      const cacheKey = this._buildEntryKey(signature, code, collisionIndex)
      const existing = this.entries.get(cacheKey)
      if (!existing) {
        return { cacheKey, entry: null }
      }
      if (existing.code === code) {
        return { cacheKey, entry: existing }
      }
      collisionIndex += 1
    }
  }

  _touch (cacheKey, entry) {
    this.entries.delete(cacheKey)
    this.entries.set(cacheKey, entry)
  }

  _evictIfNeeded () {
    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value
      if (typeof oldestKey === 'undefined') return
      this.entries.delete(oldestKey)
    }
  }

  requestPipeline (signature, code) {
    const { cacheKey, entry: cachedEntry } = this._findEntry(signature, code)
    if (cachedEntry) {
      this._touch(cacheKey, cachedEntry)
      return cachedEntry
    }

    const labelSuffix = this._hashString(cacheKey)
    const module = this.device.createShaderModule({
      label: `hydra-shader-${labelSuffix}`,
      code
    })

    const entry = {
      cacheKey,
      signature,
      code,
      module,
      pipeline: null,
      error: null,
      promise: null
    }

    entry.promise = this.device.createRenderPipelineAsync({
      label: `hydra-pipeline-${labelSuffix}`,
      layout: 'auto',
      vertex: {
        module,
        entryPoint: 'vsMain'
      },
      fragment: {
        module,
        entryPoint: 'fsMain',
        targets: [{ format: this.targetFormat }]
      },
      primitive: {
        topology: 'triangle-list',
        cullMode: 'none'
      }
    }).then((pipeline) => {
      entry.pipeline = pipeline
      return pipeline
    }).catch((error) => {
      entry.error = error
      throw error
    })

    this.entries.set(cacheKey, entry)
    this._evictIfNeeded()
    return entry
  }

  clear () {
    this.entries.clear()
  }
}

export default PipelineCache
