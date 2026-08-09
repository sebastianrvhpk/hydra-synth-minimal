import { describe, expect, it, vi } from 'vitest'
import {
  classifyMediaFile,
  createMediaBufferManager,
  createMediaLibrary,
  isSupportedMediaFile
} from '../media-library.js'

const fakeFile = (name: string, type = '', size = 10) => ({
  name,
  type,
  size,
  lastModified: 123
})

describe('Hydra browser media library', () => {
  it('recognizes image and video files by MIME type or extension', () => {
    expect(classifyMediaFile(fakeFile('capture.bin', 'image/png'))).toBe('image')
    expect(classifyMediaFile(fakeFile('clip.bin', 'video/mp4'))).toBe('video')
    expect(classifyMediaFile(fakeFile('poster.WEBP'))).toBe('image')
    expect(classifyMediaFile(fakeFile('loop.MOV'))).toBe('video')
    expect(classifyMediaFile(fakeFile('archive.ogg'))).toBe('video')
    expect(classifyMediaFile(fakeFile('notes.txt', 'text/plain'))).toBeNull()
    expect(isSupportedMediaFile(fakeFile('sketch.svg'))).toBe(true)
  })

  it('hosts files behind revocable object URLs addressable by name, id, index, or latest', () => {
    const createObjectURL = vi.fn((file: { name: string }) => `blob:hydra/${file.name}`)
    const revokeObjectURL = vi.fn()
    const media = createMediaLibrary({ urlApi: { createObjectURL, revokeObjectURL } })

    const image = media.add(fakeFile('still.png', 'image/png'))
    const video = media.add(fakeFile('loop.mp4', 'video/mp4'))

    expect(media('still.png')).toBe('blob:hydra/still.png')
    expect(media(video.id)).toBe('blob:hydra/loop.mp4')
    expect(media(0)).toBe(image.url)
    expect(media()).toBe(video.url)
    expect(media.get('loop.mp4')).toBe(video)
    expect(media.list()).toEqual([image, video])
    expect(createObjectURL).toHaveBeenCalledTimes(2)

    expect(media.remove(image)).toBe(true)
    expect(revokeObjectURL).toHaveBeenCalledWith(image.url)
    expect(media.clear()).toBe(1)
    expect(revokeObjectURL).toHaveBeenCalledWith(video.url)
  })

  it('keeps duplicate names addressable and reports unsupported files without aborting a batch', () => {
    let nextUrl = 0
    const media = createMediaLibrary({
      urlApi: {
        createObjectURL: () => `blob:hydra/${nextUrl += 1}`,
        revokeObjectURL: vi.fn()
      }
    })

    const result = media.addAll([
      fakeFile('same.png', 'image/png'),
      fakeFile('same.png', 'image/png'),
      fakeFile('readme.txt', 'text/plain')
    ])

    expect(result.accepted.map((entry) => entry.name)).toEqual(['same.png', 'same-2.png'])
    expect(result.rejected).toHaveLength(1)
    expect(media('same-2.png')).toBe('blob:hydra/2')
    expect(() => media('missing.mov')).toThrow(/Available: "same.png", "same-2.png"/u)
  })

  it('notifies subscribers once for a batch and on removal', () => {
    const media = createMediaLibrary({
      urlApi: {
        createObjectURL: (file: { name: string }) => `blob:${file.name}`,
        revokeObjectURL: vi.fn()
      }
    })
    const listener = vi.fn()
    const unsubscribe = media.subscribe(listener)

    media.addAll([fakeFile('a.jpg'), fakeFile('b.webm')])
    media.remove('a.jpg')
    unsubscribe()
    media.clear()

    expect(listener).toHaveBeenCalledTimes(2)
    expect(listener.mock.calls[0]?.[1]).toMatchObject({ type: 'add-all' })
    expect(listener.mock.calls[1]?.[1]).toMatchObject({ type: 'remove' })
  })
})

describe('Hydra media buffer manager', () => {
  const setup = () => {
    let nextUrl = 0
    const revokeObjectURL = vi.fn()
    const library = createMediaLibrary({
      urlApi: {
        createObjectURL: () => `blob:buffer/${nextUrl += 1}`,
        revokeObjectURL
      }
    })
    const sources = {
      s0: {
        initImage: vi.fn(),
        initVideo: vi.fn(),
        clear: vi.fn()
      },
      s1: {
        initImage: vi.fn(),
        initVideo: vi.fn(),
        clear: vi.fn()
      }
    }
    const buffers = createMediaBufferManager({
      library,
      bufferNames: ['s0', 's1'],
      resolveSource: (name: 's0' | 's1') => sources[name]
    })
    return { buffers, library, revokeObjectURL, sources }
  }

  it('replaces and releases the previous file in the same buffer', () => {
    const { buffers, library, revokeObjectURL, sources } = setup()
    const first = library.add(fakeFile('first.mp4', 'video/mp4'))
    const second = library.add(fakeFile('second.mp4', 'video/mp4'))

    buffers.assign(first, 's0')
    const replacement = buffers.assign(second, 's0')

    expect(sources.s0.initVideo).toHaveBeenNthCalledWith(1, first.url)
    expect(sources.s0.initVideo).toHaveBeenNthCalledWith(2, second.url)
    expect(replacement.previous).toBe(first)
    expect(buffers.get('s0')).toBe(second)
    expect(library.get(first.id)).toBeNull()
    expect(revokeObjectURL).toHaveBeenCalledWith(first.url)
  })

  it('keeps files assigned to different buffers', () => {
    const { buffers, library, revokeObjectURL } = setup()
    const first = library.add(fakeFile('first.png', 'image/png'))
    const second = library.add(fakeFile('second.mp4', 'video/mp4'))

    buffers.assign(first, 's0')
    buffers.assign(second, 's1')

    expect(buffers.get('s0')).toBe(first)
    expect(buffers.get('s1')).toBe(second)
    expect(library.list()).toEqual([first, second])
    expect(revokeObjectURL).not.toHaveBeenCalled()
  })

  it('clears a source when its active library entry is removed directly', () => {
    const { buffers, library, sources } = setup()
    const entry = library.add(fakeFile('active.webm', 'video/webm'))
    buffers.assign(entry, 's1')

    library.remove(entry)

    expect(sources.s1.clear).toHaveBeenCalledOnce()
    expect(buffers.get('s1')).toBeNull()
  })

  it('releases all active sources before clearing the library', () => {
    const { buffers, library, sources } = setup()
    buffers.assign(library.add(fakeFile('a.jpg', 'image/jpeg')), 's0')
    buffers.assign(library.add(fakeFile('b.mov', 'video/quicktime')), 's1')

    expect(buffers.clear()).toBe(2)

    expect(sources.s0.clear).toHaveBeenCalledOnce()
    expect(sources.s1.clear).toHaveBeenCalledOnce()
    expect(library.list()).toEqual([])
  })
})
