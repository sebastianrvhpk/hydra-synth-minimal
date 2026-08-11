import tgpu, { d } from 'typegpu'
import { describe, expect, it } from 'vitest'
import type { HydraCompiledPass, HydraOutputAdapter } from '../../src/core/types.ts'
import { getDefaultTransforms } from '../../src/core/transforms/default-transforms.ts'
import { HydraTransformRegistry } from '../../src/core/transforms/registry.ts'
import { createPassBindGroupLayout } from '../../src/webgpu/typegpu-schemas.ts'
import { createTypeGPUShaderExternals } from '../../src/webgpu/typegpu-functions.ts'

class CaptureOutput implements HydraOutputAdapter {
  passes: HydraCompiledPass[] = []
  render (passes: HydraCompiledPass[]): void { this.passes = passes }
}

const resourceExternalsForPass = (pass: HydraCompiledPass): Record<string, unknown> => {
  const layout = createPassBindGroupLayout(pass)
  const bound = layout.bound as Record<string, unknown>
  return Object.fromEntries(
    Object.keys(layout.entries)
      .map((name) => [name, bound[name]] as const)
      .filter((entry): entry is readonly [string, object] => Boolean(entry[1]))
  )
}

const resolvePass = (pass: HydraCompiledPass): string => {
  const externals = createTypeGPUShaderExternals(
    pass.program,
    resourceExternalsForPass(pass)
  )

  const entry = tgpu.fragmentFn({
    in: { position: d.builtin.position },
    out: d.vec4f
  })(pass.program.entryBody).$uses(externals)
  return tgpu.resolve([entry])
}

describe('TypeGPU shader-function linking', () => {
  it('links the packed-uniform helper used by dynamic callbacks', () => {
    const output = new CaptureOutput()
    const registry = new HydraTransformRegistry({ defaultOutput: output })

    registry.generators.osc(18, 0.05, 0).rotate(({ time }) => time).out()

    const pass = output.passes[0]
    expect(pass).toBeDefined()
    const linkedSource = resolvePass(pass!)
    expect(linkedSource).toContain('hydraDynamicUniform')
    expect(linkedSource).toContain('dynamicUniforms')
  })

  it('links every built-in and all of its passes without raw declarations', () => {
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
        let linkedSource = ''
        try {
          linkedSource = resolvePass(pass)
        } catch (cause) {
          throw new Error(`TypeGPU failed to link built-in "${definition.name}".`, { cause })
        }
        expect(linkedSource).toContain('@fragment')
      }
    }
  })
})
