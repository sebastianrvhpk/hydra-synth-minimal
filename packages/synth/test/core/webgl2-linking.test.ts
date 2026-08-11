import { readFileSync } from 'node:fs'
import * as naga from 'web-naga'
import { beforeAll, describe, expect, it } from 'vitest'
import type { HydraCompiledPass, HydraOutputAdapter } from '../../src/core/types.ts'
import { getDefaultTransforms } from '../../src/core/transforms/default-transforms.ts'
import { HydraTransformRegistry } from '../../src/core/transforms/registry.ts'
import {
  resolveWebGLFragmentWGSL,
  translateWebGLFragment
} from '../../src/webgl2/shader-compiler.ts'

class CaptureOutput implements HydraOutputAdapter {
  passes: HydraCompiledPass[] = []
  render (passes: HydraCompiledPass[]): void { this.passes = passes }
}

beforeAll(() => {
  const wasm = readFileSync(new URL('../../node_modules/web-naga/web_naga_bg.wasm', import.meta.url))
  naga.initSync({ module: wasm })
})

describe('WebGL2 shader translation', () => {
  it('translates every built-in pass from its canonical TypeGPU WGSL', () => {
    for (const definition of getDefaultTransforms()) {
      const output = new CaptureOutput()
      const registry = new HydraTransformRegistry({ defaultOutput: output })
      const args = (definition.inputs ?? []).map((input) => (
        input.type === 'sampler2D' ? { id: 2, getTexture: () => null } : undefined
      ))

      if (definition.type === 'src') {
        registry.generators[definition.name]?.(...args).out()
      } else {
        const graph = registry.generators.solid(0.25, 0.5, 0.75, 1) as unknown as Record<string, (...args: unknown[]) => unknown>
        const transformed = graph[definition.name]?.call(graph, ...args) as { out: () => void }
        transformed.out()
      }

      for (const pass of output.passes) {
        try {
          const wgsl = resolveWebGLFragmentWGSL(pass)
          const glsl = translateWebGLFragment(naga, wgsl)
          expect(wgsl).toContain('@fragment fn main')
          expect(glsl).toContain('#version 300 es')
          expect(glsl).toContain('void main()')
        } catch (cause) {
          throw new Error(`WebGL2 failed to translate built-in "${definition.name}".`, { cause })
        }
      }
    }
  })
})
