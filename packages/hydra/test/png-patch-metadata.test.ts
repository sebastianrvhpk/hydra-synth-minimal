import { describe, expect, it } from 'vitest'
import {
  embedHydraPatchInPng,
  hydraPngPatchKind,
  hydraPngPatchVersion,
  readHydraPatchFromPng
} from '../png-patch-metadata.js'

const transparentPixelPng = Uint8Array.from(Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
))

describe('Hydra patch PNG metadata', () => {
  it('round-trips the exact editor code through a standard PNG iTXt chunk', async () => {
    const code = `// señal portátil ☀️\nosc(Math.PI, 0.125, 0)\n  .rotate(() => time)\n  .out()`
    const embedded = await embedHydraPatchInPng(new Blob([transparentPixelPng], { type: 'image/png' }), code)

    expect(embedded.type).toBe('image/png')
    expect(embedded.size).toBeGreaterThan(transparentPixelPng.length)
    expect(Buffer.from(await embedded.arrayBuffer()).includes(Buffer.from('hydra-patch'))).toBe(true)
    await expect(readHydraPatchFromPng(embedded)).resolves.toEqual({
      kind: hydraPngPatchKind,
      version: hydraPngPatchVersion,
      language: 'javascript',
      generator: 'hydra-webgpu-live',
      code
    })
  })

  it('uses the newest Hydra patch when metadata is embedded more than once', async () => {
    const first = await embedHydraPatchInPng(transparentPixelPng, 'solid(1, 0, 0).out()')
    const second = await embedHydraPatchInPng(first, 'noise(3, .1).out()')

    await expect(readHydraPatchFromPng(second)).resolves.toMatchObject({
      code: 'noise(3, .1).out()'
    })
  })

  it('ignores ordinary images without Hydra metadata', async () => {
    await expect(readHydraPatchFromPng(transparentPixelPng)).resolves.toBeNull()
    await expect(readHydraPatchFromPng(new Uint8Array([0, 1, 2, 3]))).resolves.toBeNull()
  })

  it('refuses to write metadata into a non-PNG file', async () => {
    await expect(embedHydraPatchInPng(new Blob(['not a png']), 'osc().out()')).rejects.toThrow(
      /only be embedded in PNG/u
    )
  })
})
