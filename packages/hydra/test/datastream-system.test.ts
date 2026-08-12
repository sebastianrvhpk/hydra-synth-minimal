import { describe, expect, it, vi } from 'vitest'
import {
  createDatastreamControlBank,
  createDatastreamVideoPlaylist,
  datastreamControlDefinitions,
  datastreamPatch
} from '../datastream-system.js'

const video = (name: string, lastModified = 1) => ({
  name,
  type: 'video/mp4',
  size: 10,
  lastModified
})

describe('DATASTREAM controls', () => {
  it('preserves the MIDI mappings as normalized browser controls', () => {
    const controls = createDatastreamControlBank()

    controls.set('cc26', 0.25)
    controls.set('cc19', 1)

    expect(controls.range('cc26', 0, 10)).toBe(2.5)
    expect(controls.range('cc19', 1, 0.25)).toBe(0.25)
    expect(controls.snapshot()).toHaveLength(datastreamControlDefinitions.length)
    expect(controls.format('cc48')).toContain('/')
  })

  it('keeps dynamic control callbacks in the adapted patch', () => {
    expect(datastreamPatch).toContain("performanceControls.range('cc26', 0, 10)")
    expect(datastreamPatch).toContain("performanceControls.range('cc48', 1.5, .475)")
    expect(datastreamPatch).toContain('render(o1)')
    expect(datastreamPatch).not.toContain('hydra-midi')
  })
})

describe('DATASTREAM exclusive video playlist', () => {
  const setup = () => {
    let nextId = 0
    const entries = new Map<string, any>()
    const removed: any[] = []
    const library = {
      add: vi.fn((file: any) => {
        const entry = { id: `entry-${nextId += 1}`, file, name: file.name, kind: 'video' }
        entries.set(entry.id, entry)
        return entry
      }),
      get: vi.fn((entry: any) => entries.get(entry?.id ?? entry) ?? null),
      remove: vi.fn((entry: any) => {
        const resolved = entries.get(entry?.id ?? entry)
        if (!resolved) return false
        entries.delete(resolved.id)
        removed.push(resolved)
        return true
      })
    }
    let active: any = null
    const buffers = {
      assign: vi.fn((entry: any, buffer: string) => {
        const previous = active
        active = entry
        if (previous) library.remove(previous)
        return { entry, previous, buffer }
      }),
      release: vi.fn(() => {
        const previous = active
        active = null
        if (previous) library.remove(previous)
        return previous
      })
    }
    return { buffers, entries, library, removed }
  }

  it('keeps only three references and materializes one video at a time', () => {
    const { buffers, entries, library, removed } = setup()
    const playlist = createDatastreamVideoPlaylist({ library, buffers, maxFiles: 3 })

    const selected = playlist.setFiles([
      video('331815120922316809_3.mp4'),
      video('331053620855083009_1.mp4'),
      video('331815120922316809_2.mp4'),
      video('ignored_4.mp4')
    ])
    expect(selected.files.map((file: any) => file.name)).toEqual([
      '331053620855083009_1.mp4',
      '331815120922316809_2.mp4',
      '331815120922316809_3.mp4'
    ])

    playlist.activate(0)
    expect(entries.size).toBe(1)
    playlist.next()

    expect(entries.size).toBe(1)
    expect(removed).toHaveLength(1)
    expect(playlist.snapshot().activeIndex).toBe(1)
    expect(library.add).toHaveBeenCalledTimes(2)
  })

  it('switches hosted sources directly and clears the active source on release', () => {
    const source = {
      initVideo: vi.fn(),
      clear: vi.fn()
    }
    const sources = [
      { name: 'video-1.mp4', url: './media/video-1.mp4' },
      { name: 'video-2.mp4', url: './media/video-2.mp4' },
      { name: 'video-3.mp4', url: './media/video-3.mp4' }
    ]
    const playlist = createDatastreamVideoPlaylist({ source, sources })

    playlist.activate(0)
    playlist.next()

    expect(source.initVideo).toHaveBeenNthCalledWith(1, './media/video-1.mp4', {})
    expect(source.initVideo).toHaveBeenNthCalledWith(2, './media/video-2.mp4', {})
    expect(playlist.snapshot().activeIndex).toBe(1)

    playlist.release()
    expect(source.clear).toHaveBeenCalledTimes(1)
    expect(playlist.snapshot().activeIndex).toBe(-1)
  })
})
