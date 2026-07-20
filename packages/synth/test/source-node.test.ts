import { afterEach, describe, expect, it, vi } from 'vitest'
import { HydraSourceNode } from '../src/runtime/source-node.ts'

class FakeVideoElement extends EventTarget {
  crossOrigin = ''
  autoplay = false
  loop = false
  muted = false
  playsInline = false
  src = ''
  srcObject: MediaStream | null = null
  pause = vi.fn()
  play = vi.fn(() => Promise.resolve())
  load = vi.fn()
}

class FakeImageElement extends EventTarget {
  crossOrigin = ''
  src = ''
}

describe('HydraSourceNode media sources', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('loads video Blob inputs through revocable object URLs', () => {
    const videos: FakeVideoElement[] = []
    vi.stubGlobal('document', {
      createElement: (tagName: string) => {
        if (tagName === 'video') {
          const video = new FakeVideoElement()
          videos.push(video)
          return video
        }
        if (tagName === 'img') return new FakeImageElement()
        throw new Error(`Unexpected element: ${tagName}`)
      }
    })

    const createObjectURL = vi.fn(() => 'blob:hydra-video')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })

    const source = new HydraSourceNode({ renderer: null, label: 's-test' })
    const file = new Blob(['video'], { type: 'video/mp4' })

    source.initVideo(file)

    expect(createObjectURL).toHaveBeenCalledWith(file)
    expect(videos[0]?.src).toBe('blob:hydra-video')

    source.clear()

    expect(videos[0]?.pause).toHaveBeenCalled()
    expect(videos[0]?.load).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:hydra-video')
  })

  it('initializes screen capture sources through getDisplayMedia and stops tracks on clear', async () => {
    const videos: FakeVideoElement[] = []
    vi.stubGlobal('document', {
      createElement: (tagName: string) => {
        if (tagName === 'video') {
          const video = new FakeVideoElement()
          videos.push(video)
          return video
        }
        if (tagName === 'img') return new FakeImageElement()
        throw new Error(`Unexpected element: ${tagName}`)
      }
    })

    const stop = vi.fn()
    const stream = {
      getTracks: () => [{ stop }]
    } as unknown as MediaStream
    const getDisplayMedia = vi.fn(() => Promise.resolve(stream))
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getDisplayMedia
      }
    })

    const source = new HydraSourceNode({ renderer: null, label: 's-screen' })
    const ready = source.initScreen({ video: true, audio: false }, { flipY: true })
    await Promise.resolve()
    videos[0]?.dispatchEvent(new Event('loadedmetadata'))
    await ready

    expect(getDisplayMedia).toHaveBeenCalledWith({ video: true, audio: false })
    expect(videos[0]?.srcObject).toBe(stream)
    expect(videos[0]?.play).toHaveBeenCalled()

    source.clear()

    expect(stop).toHaveBeenCalled()
    expect(videos[0]?.pause).toHaveBeenCalled()
    expect(videos[0]?.srcObject).toBeNull()
  })

  it('discards an older async media request when a newer source is selected', async () => {
    const videos: FakeVideoElement[] = []
    vi.stubGlobal('document', {
      createElement: (tagName: string) => {
        if (tagName === 'video') {
          const video = new FakeVideoElement()
          videos.push(video)
          return video
        }
        if (tagName === 'img') return new FakeImageElement()
        throw new Error(`Unexpected element: ${tagName}`)
      }
    })

    const stop = vi.fn()
    const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream
    let resolveDisplayMedia: ((stream: MediaStream) => void) | null = null
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getDisplayMedia: () => new Promise<MediaStream>((resolve) => { resolveDisplayMedia = resolve })
      }
    })

    const source = new HydraSourceNode({ renderer: null, label: 's-race' })
    const olderRequest = source.initScreen()
    source.initImage('newer-image.png')
    resolveDisplayMedia?.(stream)
    await olderRequest

    expect(stop).toHaveBeenCalledOnce()
    expect(videos).toHaveLength(0)
  })
})
