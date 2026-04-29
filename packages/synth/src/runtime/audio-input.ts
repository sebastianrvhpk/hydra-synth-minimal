export interface HydraAudioBandSettings {
  cutoff: number
  scale: number
  smooth: number
}

export interface HydraAudioBeatState {
  holdFrames: number
  threshold: number
  _cutoff: number
  decay: number
  _framesSinceBeat: number
}

export type HydraAudioSource = MediaStream | HTMLMediaElement | AudioNode

export interface HydraAudioAnalyzerOptions {
  numBins?: number
  cutoff?: number
  smooth?: number
  max?: number
  scale?: number
  fftSize?: number
  minDecibels?: number
  maxDecibels?: number
  smoothingTimeConstant?: number
  context?: AudioContext
  source?: HydraAudioSource
  isDrawing?: boolean
  parentEl?: HTMLElement
  autostart?: boolean
}

type AudioContextConstructor = new () => AudioContext

const DEFAULT_NUM_BINS = 4
const DEFAULT_CUTOFF = 2
const DEFAULT_SCALE = 10
const DEFAULT_SMOOTH = 0.4
const DEFAULT_MAX = 15
const DEFAULT_FFT_SIZE = 1024

const clamp = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return min
  if (value < min) return min
  if (value > max) return max
  return value
}

const toPositiveInteger = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return fallback
  return Math.max(1, Math.floor(value))
}

const toFinite = (value: unknown, fallback: number): number => (
  typeof value === 'number' && Number.isFinite(value) ? value : fallback
)

const getAudioContextConstructor = (): AudioContextConstructor | null => {
  if (typeof window === 'undefined') return null
  const audioWindow = window as unknown as {
    AudioContext?: AudioContextConstructor
    webkitAudioContext?: AudioContextConstructor
  }
  return audioWindow.AudioContext ?? audioWindow.webkitAudioContext ?? null
}

const isMediaStream = (value: unknown): value is MediaStream => (
  typeof MediaStream !== 'undefined' && value instanceof MediaStream
)

const isHtmlMediaElement = (value: unknown): value is HTMLMediaElement => (
  typeof HTMLMediaElement !== 'undefined' && value instanceof HTMLMediaElement
)

const isAudioNode = (value: unknown): value is AudioNode => (
  typeof AudioNode !== 'undefined' && value instanceof AudioNode
)

export class HydraAudioAnalyzer {
  vol = 0
  rms = 0
  peak = 0
  centroid = 0
  low = 0
  mid = 0
  high = 0
  fft: number[] = []
  bins: number[] = []
  prevBins: number[] = []
  waveform: number[] = []
  settings: HydraAudioBandSettings[] = []
  beat: HydraAudioBeatState = {
    holdFrames: 20,
    threshold: 0.35,
    _cutoff: 0,
    decay: 0.98,
    _framesSinceBeat: 0
  }
  onBeat: () => void = () => {}
  isDrawing: boolean

  canvas: HTMLCanvasElement | null = null

  private readonly parentEl: HTMLElement | null
  private readonly bindingTargets = new Set<Record<string, unknown>>()
  private context: AudioContext | null
  private ownsContext = false
  private analyser: AnalyserNode | null = null
  private sourceNode: AudioNode | null = null
  private stream: MediaStream | null = null
  private mediaElement: HTMLMediaElement | null = null
  private frequencyData: Uint8Array | null = null
  private timeDomainData: Float32Array | null = null
  private readonly helperNamesByTarget = new Map<Record<string, unknown>, string[]>()
  private cutoff: number
  private smooth: number
  private scale: number
  private max: number
  private fftSize: number
  private minDecibels: number
  private maxDecibels: number
  private smoothingTimeConstant: number
  private ctx: CanvasRenderingContext2D | null = null

  constructor ({
    numBins = DEFAULT_NUM_BINS,
    cutoff = DEFAULT_CUTOFF,
    smooth = DEFAULT_SMOOTH,
    max = DEFAULT_MAX,
    scale = DEFAULT_SCALE,
    fftSize = DEFAULT_FFT_SIZE,
    minDecibels = -90,
    maxDecibels = -10,
    smoothingTimeConstant = 0.65,
    context,
    source,
    isDrawing = false,
    parentEl,
    autostart = false
  }: HydraAudioAnalyzerOptions = {}) {
    this.cutoff = toFinite(cutoff, DEFAULT_CUTOFF)
    this.smooth = clamp(toFinite(smooth, DEFAULT_SMOOTH), 0, 0.999)
    this.max = toFinite(max, DEFAULT_MAX)
    this.scale = Math.max(0.0001, toFinite(scale, DEFAULT_SCALE))
    this.fftSize = Math.max(32, toPositiveInteger(fftSize, DEFAULT_FFT_SIZE))
    this.minDecibels = toFinite(minDecibels, -90)
    this.maxDecibels = toFinite(maxDecibels, -10)
    this.smoothingTimeConstant = clamp(toFinite(smoothingTimeConstant, 0.65), 0, 1)
    this.context = context ?? null
    this.parentEl = parentEl ?? (typeof document !== 'undefined' ? document.body : null)
    this.isDrawing = isDrawing
    this.setBins(numBins)

    if (isDrawing) this.ensureCanvas()

    if (source) {
      void this.connect(source).catch(() => {})
    } else if (autostart) {
      void this.start().catch(() => {})
    }
  }

  get ready(): boolean {
    return Boolean(this.analyser)
  }

  async start (source?: HydraAudioSource): Promise<void> {
    if (source) {
      await this.connect(source)
      return
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Hydra audio input requires navigator.mediaDevices.getUserMedia support.')
    }

    const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true })
    this.stream = stream
    await this.connect(stream)
  }

  async connect (source: HydraAudioSource): Promise<void> {
    this.disconnectSource(false)
    const context = this.resolveContext(source)
    if (context.state === 'suspended' && typeof context.resume === 'function') {
      await context.resume()
    }

    const analyser = context.createAnalyser()
    analyser.fftSize = this.fftSize
    analyser.minDecibels = this.minDecibels
    analyser.maxDecibels = this.maxDecibels
    analyser.smoothingTimeConstant = this.smoothingTimeConstant

    if (isMediaStream(source)) {
      this.stream = source
      this.sourceNode = context.createMediaStreamSource(source)
    } else if (isHtmlMediaElement(source)) {
      this.mediaElement = source
      this.sourceNode = context.createMediaElementSource(source)
      analyser.connect(context.destination)
    } else if (isAudioNode(source)) {
      this.sourceNode = source
    } else {
      throw new Error('Unsupported Hydra audio source.')
    }

    this.sourceNode.connect(analyser)
    this.analyser = analyser
    this.frequencyData = new Uint8Array(analyser.frequencyBinCount)
    this.timeDomainData = new Float32Array(analyser.fftSize)
  }

  stop (): void {
    this.disconnectSource(true)
    this.reset()
  }

  tick (): void {
    if (!this.analyser || !this.frequencyData) return
    this.analyser.getByteFrequencyData(this.frequencyData)
    if (this.timeDomainData && typeof this.analyser.getFloatTimeDomainData === 'function') {
      this.analyser.getFloatTimeDomainData(this.timeDomainData)
    }
    this.updateFromFrequencyData(this.frequencyData, this.timeDomainData ?? undefined)
  }

  updateFromFrequencyData (frequencyData: ArrayLike<number>, timeDomainData?: ArrayLike<number>): void {
    const sourceLength = Math.max(1, frequencyData.length)
    const binCount = Math.max(1, this.bins.length)
    const nextBins = new Array(binCount).fill(0)
    let weightedFrequency = 0
    let totalMagnitude = 0
    let peak = 0

    for (let index = 0; index < binCount; index += 1) {
      const start = Math.floor((index / binCount) * sourceLength)
      const end = Math.max(start + 1, Math.floor(((index + 1) / binCount) * sourceLength))
      let sum = 0
      for (let sampleIndex = start; sampleIndex < end && sampleIndex < sourceLength; sampleIndex += 1) {
        const magnitude = clamp(Number(frequencyData[sampleIndex] ?? 0), 0, 255) / 255
        sum += magnitude
        totalMagnitude += magnitude
        weightedFrequency += magnitude * sampleIndex
        peak = Math.max(peak, magnitude)
      }

      const normalized = sum / Math.max(1, end - start)
      const setting = this.settings[index] ?? { cutoff: this.cutoff, scale: this.scale, smooth: this.smooth }
      const compatibilityValue = normalized * setting.scale + setting.cutoff
      const previous = this.bins[index] ?? 0
      nextBins[index] = compatibilityValue * (1 - setting.smooth) + previous * setting.smooth
    }

    this.prevBins = this.bins.slice()
    this.bins = nextBins
    this.fft = this.bins.map((bin, index) => {
      const setting = this.settings[index] ?? { cutoff: this.cutoff, scale: this.scale, smooth: this.smooth }
      return Math.max(0, (bin - setting.cutoff) / Math.max(0.0001, setting.scale))
    })

    this.low = this.averageFftRange(0, Math.max(1, Math.ceil(binCount / 3)))
    this.mid = this.averageFftRange(Math.floor(binCount / 3), Math.max(1, Math.ceil((binCount * 2) / 3)))
    this.high = this.averageFftRange(Math.floor((binCount * 2) / 3), binCount)
    this.vol = this.fft.reduce((sum, value) => sum + value, 0) / binCount
    this.peak = peak
    this.centroid = totalMagnitude > 0 ? weightedFrequency / totalMagnitude / sourceLength : 0

    if (timeDomainData && timeDomainData.length > 0) {
      let squareSum = 0
      const waveform = new Array(timeDomainData.length)
      for (let index = 0; index < timeDomainData.length; index += 1) {
        const sample = clamp(Number(timeDomainData[index] ?? 0), -1, 1)
        waveform[index] = sample
        squareSum += sample * sample
      }
      this.waveform = waveform
      this.rms = Math.sqrt(squareSum / timeDomainData.length)
    } else {
      this.waveform = []
      this.rms = this.vol
    }

    this.detectBeat(this.vol)
    if (this.isDrawing) this.draw()
  }

  detectBeat (level: number): void {
    if (level > this.beat._cutoff && level > this.beat.threshold) {
      this.onBeat()
      this.beat._cutoff = level * 1.2
      this.beat._framesSinceBeat = 0
      return
    }

    if (this.beat._framesSinceBeat <= this.beat.holdFrames) {
      this.beat._framesSinceBeat += 1
    } else {
      this.beat._cutoff *= this.beat.decay
      this.beat._cutoff = Math.max(this.beat._cutoff, this.beat.threshold)
    }
  }

  setCutoff (cutoff: number): void {
    this.cutoff = toFinite(cutoff, this.cutoff)
    this.settings = this.settings.map((setting) => ({ ...setting, cutoff: this.cutoff }))
  }

  setSmooth (smooth: number): void {
    this.smooth = clamp(toFinite(smooth, this.smooth), 0, 0.999)
    this.settings = this.settings.map((setting) => ({ ...setting, smooth: this.smooth }))
  }

  setScale (scale: number): void {
    this.scale = Math.max(0.0001, toFinite(scale, this.scale))
    this.settings = this.settings.map((setting) => ({ ...setting, scale: this.scale }))
  }

  setMax (max: number): void {
    this.max = toFinite(max, this.max)
  }

  setBins (numBins: number): void {
    const count = toPositiveInteger(numBins, DEFAULT_NUM_BINS)
    this.bins = Array(count).fill(0)
    this.prevBins = Array(count).fill(0)
    this.fft = Array(count).fill(0)
    this.settings = Array(count).fill(0).map(() => ({
      cutoff: this.cutoff,
      scale: this.scale,
      smooth: this.smooth
    }))
    this.refreshBindings()
  }

  getBand (index: number, scale = 1, offset = 0): () => number {
    return () => ((this.fft[index] ?? 0) * scale) + offset
  }

  attachBindings (bindings: Record<string, unknown>): void {
    this.bindingTargets.add(bindings)
    this.refreshTargetBindings(bindings)
  }

  detachBindings (bindings: Record<string, unknown>): void {
    this.bindingTargets.delete(bindings)
    for (const name of this.helperNamesByTarget.get(bindings) ?? []) delete bindings[name]
    this.helperNamesByTarget.delete(bindings)
    if (bindings.a === this) delete bindings.a
  }

  show (): void {
    this.isDrawing = true
    this.ensureCanvas()
    if (this.canvas) this.canvas.style.display = 'block'
  }

  hide (): void {
    this.isDrawing = false
    if (this.canvas) this.canvas.style.display = 'none'
  }

  dispose (): void {
    this.stop()
    for (const bindings of Array.from(this.bindingTargets)) this.detachBindings(bindings)
    this.bindingTargets.clear()
    if (this.canvas?.parentElement) this.canvas.parentElement.removeChild(this.canvas)
  }

  private resolveContext (source: HydraAudioSource): AudioContext {
    if (isAudioNode(source)) {
      this.context = source.context as AudioContext
      return this.context
    }
    if (this.context) return this.context
    const Context = getAudioContextConstructor()
    if (!Context) throw new Error('Hydra audio input requires AudioContext support.')
    this.context = new Context()
    this.ownsContext = true
    return this.context
  }

  private disconnectSource (stopStream: boolean): void {
    try { this.sourceNode?.disconnect() } catch { /* ignore */ }
    try { this.analyser?.disconnect() } catch { /* ignore */ }
    this.sourceNode = null
    this.analyser = null
    this.frequencyData = null
    this.timeDomainData = null

    if (stopStream && this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
    }
    this.stream = null
    this.mediaElement = null

    if (stopStream && this.ownsContext && this.context && this.context.state !== 'closed') {
      void this.context.close().catch(() => {})
      this.context = null
      this.ownsContext = false
    }
  }

  private reset (): void {
    this.vol = 0
    this.rms = 0
    this.peak = 0
    this.centroid = 0
    this.low = 0
    this.mid = 0
    this.high = 0
    this.bins.fill(0)
    this.prevBins.fill(0)
    this.fft.fill(0)
    this.waveform = []
    this.beat._cutoff = 0
    this.beat._framesSinceBeat = 0
  }

  private averageFftRange (start: number, end: number): number {
    const slice = this.fft.slice(start, end)
    if (slice.length === 0) return 0
    return slice.reduce((sum, value) => sum + value, 0) / slice.length
  }

  private ensureCanvas (): void {
    if (this.canvas || !this.parentEl || typeof document === 'undefined') return
    const canvas = document.createElement('canvas')
    canvas.width = 100
    canvas.height = 80
    canvas.style.width = '100px'
    canvas.style.height = '80px'
    canvas.style.position = 'absolute'
    canvas.style.right = '0px'
    canvas.style.bottom = '0px'
    canvas.style.display = this.isDrawing ? 'block' : 'none'
    this.parentEl.appendChild(canvas)
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
  }

  private refreshBindings (): void {
    for (const bindings of this.bindingTargets) this.refreshTargetBindings(bindings)
  }

  private refreshTargetBindings (bindings: Record<string, unknown>): void {
    for (const name of this.helperNamesByTarget.get(bindings) ?? []) delete bindings[name]
    bindings.a = this
    const helperNames = this.fft.map((_, index) => `a${index}`)
    this.helperNamesByTarget.set(bindings, helperNames)
    helperNames.forEach((name, index) => {
      bindings[name] = (scale = 1, offset = 0) => this.getBand(index, Number(scale), Number(offset))
    })
  }

  private draw (): void {
    if (!this.ctx || !this.canvas) return
    const spacing = this.canvas.width / Math.max(1, this.bins.length)
    const scale = this.canvas.height / Math.max(1, this.max * 2)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.fillStyle = '#dfffff'
    this.ctx.strokeStyle = '#00ffff'
    this.ctx.lineWidth = 0.5
    this.bins.forEach((bin, index) => {
      const height = bin * scale
      this.ctx?.fillRect(index * spacing, this.canvas!.height - height, spacing, height)
      const setting = this.settings[index]
      if (!setting || !this.ctx) return
      const cutoffY = this.canvas!.height - scale * setting.cutoff
      this.ctx.beginPath()
      this.ctx.moveTo(index * spacing, cutoffY)
      this.ctx.lineTo((index + 1) * spacing, cutoffY)
      this.ctx.stroke()
    })
  }
}
