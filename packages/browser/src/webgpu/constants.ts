export const MAX_DYNAMIC_UNIFORMS = 256
export const OUTPUT_TEXTURE_FORMAT = 'rgba8unorm'

export const createOutputTextureUsage = ({ includeRenderAttachment = true }: { includeRenderAttachment?: boolean } = {}): number => {
  let usage =
    GPUTextureUsage.TEXTURE_BINDING |
    GPUTextureUsage.COPY_DST |
    GPUTextureUsage.COPY_SRC |
    GPUTextureUsage.STORAGE_BINDING
  if (includeRenderAttachment) usage |= GPUTextureUsage.RENDER_ATTACHMENT
  return usage
}
