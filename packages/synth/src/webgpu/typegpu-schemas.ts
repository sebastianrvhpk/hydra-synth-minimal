import tgpu, {
  d,
  type TgpuBindGroupLayout,
  type TgpuLayoutEntry
} from 'typegpu'
import type { HydraCompiledPass } from '../core/types.js'
import { MAX_DYNAMIC_UNIFORMS } from './constants.js'

export const GlobalUniformsSchema = d.struct({
  time: d.f32,
  bpm: d.f32,
  width: d.f32,
  height: d.f32
})

export const DynamicUniformsSchema = d.struct({
  values: d.arrayOf(d.vec4f, Math.ceil(MAX_DYNAMIC_UNIFORMS / 4))
})

export type HydraTypeGPUBindGroupLayout = TgpuBindGroupLayout<Record<string, TgpuLayoutEntry | null>>

export const createPassBindGroupLayout = (pass: HydraCompiledPass): HydraTypeGPUBindGroupLayout => {
  const entries: Record<string, TgpuLayoutEntry | null> = {
    globals: {
      uniform: GlobalUniformsSchema,
      visibility: [pass.variant === 'compute' ? 'compute' : 'fragment']
    },
    dynamicUniforms: pass.uniforms.length > 0
      ? {
          uniform: DynamicUniformsSchema,
          visibility: [pass.variant === 'compute' ? 'compute' : 'fragment']
        }
      : null,
    hydraSampler: pass.textures.length > 0
      ? {
          sampler: 'filtering',
          visibility: [pass.variant === 'compute' ? 'compute' : 'fragment']
        }
      : null
  }

  for (const texture of pass.textures) {
    entries[texture.variableName] = {
      texture: d.texture2d(d.f32),
      visibility: [pass.variant === 'compute' ? 'compute' : 'fragment']
    }
  }

  if (pass.variant === 'compute' && pass.output) {
    entries[pass.output.variableName] = {
      storageTexture: d.textureStorage2d(pass.output.format),
      visibility: ['compute']
    }
  }

  return tgpu.bindGroupLayout(entries).$idx(0)
}
