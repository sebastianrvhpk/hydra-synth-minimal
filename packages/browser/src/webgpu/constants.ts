export const MAX_DYNAMIC_UNIFORMS = 256
export const OUTPUT_TEXTURE_FORMAT = 'rgba8unorm'

export const createOutputTextureUsage = (): number =>
  GPUTextureUsage.TEXTURE_BINDING |
  GPUTextureUsage.COPY_DST |
  GPUTextureUsage.COPY_SRC |
  GPUTextureUsage.RENDER_ATTACHMENT |
  GPUTextureUsage.STORAGE_BINDING
