export const MAX_DYNAMIC_UNIFORMS = 256
export const OUTPUT_TEXTURE_FORMAT = 'rgba16float'

export const createOutputTextureUsage = ({ includeRenderAttachment = true }: { includeRenderAttachment?: boolean } = {}): number => {
  let usage =
    GPUTextureUsage.TEXTURE_BINDING |
    GPUTextureUsage.COPY_DST |
    GPUTextureUsage.COPY_SRC
  if (includeRenderAttachment) usage |= GPUTextureUsage.RENDER_ATTACHMENT
  return usage
}
