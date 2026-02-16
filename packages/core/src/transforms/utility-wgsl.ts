const utilityWgsl = {
  hydraMod: {
    wgsl: `
fn hydraMod(x: f32, y: f32) -> f32 {
  return x - y * floor(x / y);
}
`
  },
  hydraLuminance: {
    wgsl: `
fn hydraLuminance(rgb: vec3f) -> f32 {
  let w = vec3f(0.2125, 0.7154, 0.0721);
  return dot(rgb, w);
}
`
  },
  hydraRgbToHsv: {
    wgsl: `
fn hydraRgbToHsv(c: vec3f) -> vec3f {
  let k = vec4f(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  let p = mix(vec4f(c.bg, k.wz), vec4f(c.gb, k.xy), step(c.b, c.g));
  let q = mix(vec4f(p.xyw, c.r), vec4f(c.r, p.yzx), step(p.x, c.r));
  let d = q.x - min(q.w, q.y);
  let e = 1.0e-10;
  return vec3f(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
`
  },
  hydraHsvToRgb: {
    wgsl: `
fn hydraHsvToRgb(c: vec3f) -> vec3f {
  let k = vec4f(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  let p = abs(fract(c.xxx + k.xyz) * 6.0 - k.www);
  return c.z * mix(k.xxx, clamp(p - k.xxx, vec3f(0.0), vec3f(1.0)), c.y);
}
`
  },
  hydraMod289Vec3: {
    wgsl: `
fn hydraMod289Vec3(x: vec3f) -> vec3f {
  return x - floor(x / 289.0) * 289.0;
}
`
  },
  hydraMod289Vec4: {
    wgsl: `
fn hydraMod289Vec4(x: vec4f) -> vec4f {
  return x - floor(x / 289.0) * 289.0;
}
`
  },
  hydraPermute: {
    dependencies: ['hydraMod289Vec4'],
    wgsl: `
fn hydraPermute(x: vec4f) -> vec4f {
  return hydraMod289Vec4(((x * 34.0) + 1.0) * x);
}
`
  },
  hydraTaylorInvSqrt: {
    wgsl: `
fn hydraTaylorInvSqrt(r: vec4f) -> vec4f {
  return vec4f(1.79284291400159) - 0.85373472095314 * r;
}
`
  },
  hydraNoise: {
    dependencies: ['hydraMod289Vec3', 'hydraPermute', 'hydraTaylorInvSqrt'],
    wgsl: `
fn hydraNoise(v: vec3f) -> f32 {
  let c = vec2f(1.0 / 6.0, 1.0 / 3.0);
  let d = vec4f(0.0, 0.5, 1.0, 2.0);

  var i = floor(v + dot(v, c.yyy));
  let x0 = v - i + dot(i, c.xxx);

  let g = step(x0.yzx, x0.xyz);
  let l = vec3f(1.0) - g;
  let i1 = min(g.xyz, l.zxy);
  let i2 = max(g.xyz, l.zxy);

  let x1 = x0 - i1 + c.xxx;
  let x2 = x0 - i2 + c.yyy;
  let x3 = x0 - d.yyy;

  i = hydraMod289Vec3(i);
  let p = hydraPermute(
    hydraPermute(
      hydraPermute(i.z + vec4f(0.0, i1.z, i2.z, 1.0)) +
      i.y + vec4f(0.0, i1.y, i2.y, 1.0)
    ) + i.x + vec4f(0.0, i1.x, i2.x, 1.0)
  );

  let n = 1.0 / 7.0;
  let ns = n * d.wyz - d.xzx;

  let j = p - 49.0 * floor(p * ns.z * ns.z);
  let x_ = floor(j * ns.z);
  let y_ = floor(j - 7.0 * x_);

  let x = x_ * ns.x + ns.yyyy;
  let y = y_ * ns.x + ns.yyyy;
  let h = vec4f(1.0) - abs(x) - abs(y);

  let b0 = vec4f(x.xy, y.xy);
  let b1 = vec4f(x.zw, y.zw);

  let s0 = floor(b0) * 2.0 + 1.0;
  let s1 = floor(b1) * 2.0 + 1.0;
  let sh = -step(h, vec4f(0.0));

  let a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  let a1 = b1.xzyw + s1.xzyw * sh.zzww;

  let p0 = vec3f(a0.xy, h.x);
  let p1 = vec3f(a0.zw, h.y);
  let p2 = vec3f(a1.xy, h.z);
  let p3 = vec3f(a1.zw, h.w);

  let norm = hydraTaylorInvSqrt(vec4f(
    dot(p0, p0),
    dot(p1, p1),
    dot(p2, p2),
    dot(p3, p3)
  ));

  let p0n = p0 * norm.x;
  let p1n = p1 * norm.y;
  let p2n = p2 * norm.z;
  let p3n = p3 * norm.w;

  var m = max(
    vec4f(0.6) - vec4f(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)),
    vec4f(0.0)
  );
  m = m * m;
  return 42.0 * dot(
    m * m,
    vec4f(dot(p0n, x0), dot(p1n, x1), dot(p2n, x2), dot(p3n, x3))
  );
}
`
  },
  hydraSampleTextureWrapped: {
    wgsl: `
fn hydraSampleTextureWrapped(tex: texture_2d<f32>, uv: vec2f) -> vec4f {
  return textureSampleLevel(tex, hydraSampler, fract(uv), 0.0);
}
`
  },
  hydraSampleTextureClamped: {
    wgsl: `
fn hydraSampleTextureClamped(tex: texture_2d<f32>, uv: vec2f) -> vec4f {
  return textureSampleLevel(tex, hydraSampler, clamp(uv, vec2f(0.0), vec2f(1.0)), 0.0);
}
`
  },
  hydraUvFromLinearCoord: {
    wgsl: `
fn hydraUvFromLinearCoord(coord: vec2u, dims: vec2u) -> vec2f {
  let safeDims = max(vec2u(1u), dims);
  return (vec2f(f32(coord.x), f32(coord.y)) + vec2f(0.5, 0.5)) / vec2f(f32(safeDims.x), f32(safeDims.y));
}
`
  },
  hydraUvFromLinearIndex: {
    dependencies: ['hydraUvFromLinearCoord'],
    wgsl: `
fn hydraUvFromLinearIndex(index: u32, dims: vec2u) -> vec2f {
  let safeDims = max(vec2u(1u), dims);
  let x = index % safeDims.x;
  let y = index / safeDims.x;
  return hydraUvFromLinearCoord(vec2u(x, y), safeDims);
}
`
  },
  hydraSampleTexture: {
    dependencies: ['hydraSampleTextureWrapped'],
    wgsl: `
fn hydraSampleTexture(tex: texture_2d<f32>, uv: vec2f) -> vec4f {
  return hydraSampleTextureWrapped(tex, uv);
}
`
  }
}

const UTILITY_ORDER = [
  'hydraMod',
  'hydraLuminance',
  'hydraRgbToHsv',
  'hydraHsvToRgb',
  'hydraMod289Vec3',
  'hydraMod289Vec4',
  'hydraPermute',
  'hydraTaylorInvSqrt',
  'hydraNoise',
  'hydraSampleTextureWrapped',
  'hydraSampleTextureClamped',
  'hydraUvFromLinearCoord',
  'hydraUvFromLinearIndex',
  'hydraSampleTexture'
]

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const selectUtility = (utilityName: string, selected: Set<string>): void => {
  if (selected.has(utilityName)) return

  const utility = utilityWgsl[utilityName as keyof typeof utilityWgsl]
  if (!utility) return

  const dependencies = utility.dependencies ?? []
  for (const dependencyName of dependencies) selectUtility(dependencyName, selected)
  selected.add(utilityName)
}

export const collectUtilityDeclarations = (wgslFunctions: Array<{ transform: { wgsl: string } }> = []): string => {
  const functionBodies = wgslFunctions.map((transform) => transform.transform.wgsl).join('\n')
  const selectedUtilities = new Set<string>()

  for (const utilityName of UTILITY_ORDER) {
    const pattern = new RegExp(`\\b${escapeRegExp(utilityName)}\\s*\\(`)
    if (pattern.test(functionBodies)) selectUtility(utilityName, selectedUtilities)
  }

  return UTILITY_ORDER
    .filter((utilityName) => selectedUtilities.has(utilityName))
    .map((utilityName) => utilityWgsl[utilityName as keyof typeof utilityWgsl].wgsl)
    .join('\n')
}
