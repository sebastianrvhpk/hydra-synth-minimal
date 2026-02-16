import {
  getPrimitiveDescriptorByKind
} from '../primitives/descriptors.js'
import { PRIMITIVE_WGSL_MODULES } from '../primitives/wgsl/index.js'
import type { HydraKernelNode } from '../ir/types.js'
import type { HydraCompiledPass } from '../types.js'
import type { HydraExecutionPrimitiveSelection } from './types.js'

const hashString = (value = ''): string => {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

const inferPrimitiveKindForNode = (node: HydraKernelNode): HydraExecutionPrimitiveSelection['kind'] | null => {
  const names = new Set(node.transforms.map((transform) => transform.name))
  if (names.has('bloomDownsample')) return 'pyramid.downsample'
  if (names.has('bloomUpsample')) return 'pyramid.upsample'
  if (names.has('lumaProbe')) return 'reduction.meanLuma'
  return null
}

const canSubstitutePyramidPass = (pass: HydraCompiledPass): boolean => {
  if (!pass.output) return false
  if ((pass.storageBuffers?.length ?? 0) > 0) return false
  if ((pass.storageTextures?.length ?? 0) > 0) return false
  if (pass.textures.length !== 1) return false
  return pass.textures[0]?.isPrev === true
}

const dynamicUniformDeclarations = (maxDynamicUniforms: number): string => `
struct DynamicUniforms {
  values: array<vec4f, ${Math.max(1, Math.ceil(maxDynamicUniforms / 4))}>,
};

@group(0) @binding(1) var<uniform> dynamicUniforms: DynamicUniforms;

fn hydraDynamicUniform(index: u32) -> f32 {
  let vecIndex = index / 4u;
  let lane = index % 4u;
  let packed = dynamicUniforms.values[vecIndex];
  if (lane == 0u) { return packed.x; }
  if (lane == 1u) { return packed.y; }
  if (lane == 2u) { return packed.z; }
  return packed.w;
}
`

const buildPrimitivePyramidWgsl = (
  kind: 'pyramid.downsample' | 'pyramid.upsample',
  pass: HydraCompiledPass,
  maxDynamicUniforms: number
): string | null => {
  const texture = pass.textures[0]
  const output = pass.output
  if (!texture || !output) return null
  const workgroup = pass.dispatch?.workgroupSize ?? [16, 16, 1]
  const includeUniforms = pass.uniforms.length > 0
  const radiusUniformIndex = pass.uniforms[0]?.index ?? 0
  const boostUniformIndex = pass.uniforms[1]?.index ?? pass.uniforms[0]?.index ?? 0
  const radiusExpression = includeUniforms ? `max(hydraDynamicUniform(${radiusUniformIndex}u), 0.0001)` : '1.0'
  const boostExpression = pass.uniforms.length > 1 ? `max(hydraDynamicUniform(${boostUniformIndex}u), 0.0)` : '1.0'
  const outputFormat = output.format ?? 'rgba16float'

  const body = kind === 'pyramid.downsample'
    ? `
  let texel = vec2f(
    ${radiusExpression} / max(globals.width, 1.0),
    ${radiusExpression} / max(globals.height, 1.0)
  );
  let center = hydraSampleTexture(${texture.variableName}, fract(st));
  let d0 = hydraSampleTexture(${texture.variableName}, fract(st + vec2f(-texel.x, -texel.y)));
  let d1 = hydraSampleTexture(${texture.variableName}, fract(st + vec2f(texel.x, -texel.y)));
  let d2 = hydraSampleTexture(${texture.variableName}, fract(st + vec2f(-texel.x, texel.y)));
  let d3 = hydraSampleTexture(${texture.variableName}, fract(st + vec2f(texel.x, texel.y)));
  let outColor = center * 0.3 + (d0 + d1 + d2 + d3) * 0.175;
  textureStore(${output.variableName}, vec2i(i32(invocationId.x), i32(invocationId.y)), outColor);
`
    : `
  let texel = vec2f(
    ${radiusExpression} / max(globals.width, 1.0),
    ${radiusExpression} / max(globals.height, 1.0)
  );
  let center = hydraSampleTexture(${texture.variableName}, fract(st));
  let a0 = hydraSampleTexture(${texture.variableName}, fract(st + vec2f(-texel.x, 0.0)));
  let a1 = hydraSampleTexture(${texture.variableName}, fract(st + vec2f(texel.x, 0.0)));
  let a2 = hydraSampleTexture(${texture.variableName}, fract(st + vec2f(0.0, -texel.y)));
  let a3 = hydraSampleTexture(${texture.variableName}, fract(st + vec2f(0.0, texel.y)));
  let d0 = hydraSampleTexture(${texture.variableName}, fract(st + vec2f(-texel.x, -texel.y)));
  let d1 = hydraSampleTexture(${texture.variableName}, fract(st + vec2f(texel.x, -texel.y)));
  let d2 = hydraSampleTexture(${texture.variableName}, fract(st + vec2f(-texel.x, texel.y)));
  let d3 = hydraSampleTexture(${texture.variableName}, fract(st + vec2f(texel.x, texel.y)));
  let upsampled =
    center * 0.22 +
    (a0 + a1 + a2 + a3) * 0.12 +
    (d0 + d1 + d2 + d3) * 0.075;
  let outColor = vec4f(upsampled.xyz * ${boostExpression}, upsampled.w);
  textureStore(${output.variableName}, vec2i(i32(invocationId.x), i32(invocationId.y)), outColor);
`

  return `
struct GlobalUniforms {
  time: f32,
  bpm: f32,
  width: f32,
  height: f32,
};

@group(0) @binding(0) var<uniform> globals: GlobalUniforms;
${includeUniforms ? dynamicUniformDeclarations(maxDynamicUniforms) : ''}
@group(0) @binding(2) var hydraSampler: sampler;
@group(0) @binding(${texture.binding}) var ${texture.variableName}: texture_2d<f32>;
@group(0) @binding(${output.binding}) var ${output.variableName}: texture_storage_2d<${outputFormat}, write>;

fn hydraSampleTexture(tex: texture_2d<f32>, uv: vec2f) -> vec4f {
  return textureSampleLevel(tex, hydraSampler, fract(uv), 0.0);
}

@compute @workgroup_size(${workgroup[0]}, ${workgroup[1]}, ${workgroup[2]})
fn csMain(@builtin(global_invocation_id) invocationId: vec3u) {
  let width = max(1u, u32(globals.width));
  let height = max(1u, u32(globals.height));
  if (invocationId.x >= width || invocationId.y >= height) {
    return;
  }
  let st = (vec2f(invocationId.xy) + vec2f(0.5, 0.5)) / vec2f(max(globals.width, 1.0), max(globals.height, 1.0));
${body}
}
`
}

const buildPrimitiveSubstitutedPass = (
  pass: HydraCompiledPass,
  primitiveKind: 'pyramid.downsample' | 'pyramid.upsample',
  maxDynamicUniforms: number
): HydraCompiledPass | null => {
  const wgsl = buildPrimitivePyramidWgsl(primitiveKind, pass, maxDynamicUniforms)
  if (!wgsl) return null
  const signature = `${pass.signature}|primitive:${primitiveKind}|h${hashString(wgsl)}`
  return {
    ...pass,
    signature,
    wgsl,
    ir: pass.ir ? { ...pass.ir, signature } : pass.ir,
    fallbackPass: pass
  }
}

const createPrimitiveSelection = (
  kind: HydraExecutionPrimitiveSelection['kind'],
  substituted: boolean,
  note?: string
): HydraExecutionPrimitiveSelection | null => {
  const descriptor = getPrimitiveDescriptorByKind(kind)
  if (!descriptor) return null
  const module = PRIMITIVE_WGSL_MODULES[descriptor.wgslModuleId]
  if (typeof module !== 'string' || module.length === 0) return null
  return {
    kind,
    descriptorId: descriptor.id,
    wgslModuleId: descriptor.wgslModuleId,
    entryPoint: descriptor.entryPoint,
    substituted,
    note
  }
}

export const applyPrimitiveSubstitutions = (
  orderedNodes: HydraKernelNode[],
  compiledPassByNodeId: Map<string, HydraCompiledPass>,
  maxDynamicUniforms: number
): Map<string, HydraExecutionPrimitiveSelection> => {
  const primitiveByNodeId = new Map<string, HydraExecutionPrimitiveSelection>()

  orderedNodes.forEach((node) => {
    const primitiveKind = inferPrimitiveKindForNode(node)
    if (!primitiveKind) return

    const basePass = compiledPassByNodeId.get(node.id)
    if (!basePass) return

    if (primitiveKind === 'pyramid.downsample' || primitiveKind === 'pyramid.upsample') {
      if (!canSubstitutePyramidPass(basePass)) {
        const metadata = createPrimitiveSelection(
          primitiveKind,
          false,
          'primitive-known-but-pass-shape-not-substitutable'
        )
        if (metadata) primitiveByNodeId.set(node.id, metadata)
        return
      }
      const primitivePass = buildPrimitiveSubstitutedPass(basePass, primitiveKind, maxDynamicUniforms)
      if (!primitivePass) {
        const metadata = createPrimitiveSelection(
          primitiveKind,
          false,
          'primitive-substitution-failed'
        )
        if (metadata) primitiveByNodeId.set(node.id, metadata)
        return
      }
      compiledPassByNodeId.set(node.id, primitivePass)
      const metadata = createPrimitiveSelection(primitiveKind, true)
      if (metadata) primitiveByNodeId.set(node.id, metadata)
      return
    }

    const metadata = createPrimitiveSelection(primitiveKind, false, 'metadata-only-primitive-selection')
    if (metadata) primitiveByNodeId.set(node.id, metadata)
  })

  return primitiveByNodeId
}
