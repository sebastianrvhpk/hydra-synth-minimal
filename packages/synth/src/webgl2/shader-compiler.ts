import tgpu, { d } from 'typegpu'
import type { HydraCompiledPass } from '../core/types.js'
import { createTypeGPUShaderExternals } from '../webgpu/typegpu-functions.js'
import { createPassBindGroupLayout } from '../webgpu/typegpu-schemas.js'

export type WebNagaModule = typeof import('web-naga')

/** Resolve the same TypeGPU fragment graph used by WebGPU into canonical WGSL. */
export const resolveWebGLFragmentWGSL = (pass: HydraCompiledPass): string => {
  const layout = createPassBindGroupLayout(pass)
  const bound = layout.bound as Record<string, unknown>
  const resourceExternals = Object.fromEntries(
    Object.keys(layout.entries)
      .map((name) => [name, bound[name]] as const)
      .filter((entry): entry is readonly [string, object] => Boolean(entry[1]))
  )
  const externals = createTypeGPUShaderExternals(pass.program, resourceExternals)
  const fragment = tgpu.fragmentFn({
    in: { position: d.builtin.position },
    out: d.vec4f
  })(pass.program.entryBody).$uses(externals).$name('main')
  return tgpu.resolve([fragment], { names: 'strict' })
}

/** Translate canonical TypeGPU WGSL to a WebGL 2 / GLSL ES 3.00 fragment shader. */
export const translateWebGLFragment = (naga: WebNagaModule, wgsl: string): string => {
  const frontend = naga.WgslFrontend.new()
  try {
    const module = frontend.parse(wgsl)
    try {
      const options = naga.GlslBackendOptions.new()
      options.version = naga.GlslVersion.embedded(300)
      options.stage = naga.ShaderStage.Fragment
      return module.to_glsl('main', options)
    } finally {
      module.free()
    }
  } finally {
    frontend.free()
  }
}
