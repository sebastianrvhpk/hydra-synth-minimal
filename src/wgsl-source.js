import generateWgsl from './generate-wgsl.js'
import { collectUtilityDeclarations } from './wgsl/utility-functions.js'
import { MAX_DYNAMIC_UNIFORMS } from './webgpu/constants.js'

const hashString = (value = '') => {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

class WgslSource {
  constructor (obj) {
    this.transforms = []
    this.transforms.push(obj)
    this.defaultOutput = obj.defaultOutput
    this.synth = obj.synth
    this.type = 'WgslSource'
  }

  out (_output) {
    const output = _output || this.defaultOutput
    if (!output) return
    try {
      const passes = this.wgsl()
      output.render(passes)
    } catch (error) {
      console.warn('shader could not compile', error)
    }
  }

  wgsl () {
    const passes = []
    const transforms = []

    this.transforms.forEach((transform) => {
      if (transform.transform.type === 'renderpass') {
        console.warn('renderpass transforms are not supported in the WebGPU backend')
      } else {
        transforms.push(transform)
      }
    })

    if (transforms.length > 0) passes.push(this.compile(transforms))
    return passes
  }

  compile (transforms) {
    const shaderInfo = generateWgsl(transforms, this.synth)
    const dynamicUniformVec4Count = Math.ceil(MAX_DYNAMIC_UNIFORMS / 4)

    if (shaderInfo.uniforms.length > MAX_DYNAMIC_UNIFORMS) {
      throw new Error(`Shader uses ${shaderInfo.uniforms.length} dynamic uniforms, but max is ${MAX_DYNAMIC_UNIFORMS}.`)
    }

    const textureBindings = shaderInfo.textures.map((texture, index) => ({
      ...texture,
      binding: 3 + index
    }))

    const textureDeclarations = textureBindings.map((texture) =>
      `@group(0) @binding(${texture.binding}) var ${texture.variableName}: texture_2d<f32>;`
    ).join('\n')

    const functionDeclarations = shaderInfo.wgslFunctions.map((transform) => transform.transform.wgsl).join('\n')
    const utilityDeclarations = collectUtilityDeclarations(shaderInfo.wgslFunctions)
    const functionSignature = shaderInfo.wgslFunctions
      .map((transform) => `${transform.name}:${transform.transform.wgsl.length}`)
      .join(',')
    const signatureBase = `${shaderInfo.structureSignature}|u${shaderInfo.uniforms.length}|t${textureBindings.length}|f${functionSignature}`

    const wgsl = `
struct GlobalUniforms {
  time: f32,
  bpm: f32,
  width: f32,
  height: f32,
};

struct DynamicUniforms {
  values: array<vec4f, ${dynamicUniformVec4Count}>,
};

@group(0) @binding(0) var<uniform> globals: GlobalUniforms;
@group(0) @binding(1) var<uniform> dynamicUniforms: DynamicUniforms;
@group(0) @binding(2) var hydraSampler: sampler;
${textureDeclarations}

fn hydraDynamicUniform(index: u32) -> f32 {
  let vecIndex = index / 4u;
  let lane = index % 4u;
  let packed = dynamicUniforms.values[vecIndex];
  if (lane == 0u) { return packed.x; }
  if (lane == 1u) { return packed.y; }
  if (lane == 2u) { return packed.z; }
  return packed.w;
}

${utilityDeclarations}
${functionDeclarations}

@vertex
fn vsMain(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
  let positions = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );
  let p = positions[vertexIndex];
  return vec4f(p, 0.0, 1.0);
}

@fragment
fn fsMain(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
  var st = fragCoord.xy / vec2f(globals.width, globals.height);
  var c = vec4f(0.0);
  ${shaderInfo.fragColor}
  return c;
}
`
    const pipelineSignature = `${signatureBase}|h${hashString(wgsl)}`

    return {
      signature: pipelineSignature,
      wgsl,
      uniforms: shaderInfo.uniforms,
      textures: textureBindings
    }
  }
}

export default WgslSource
