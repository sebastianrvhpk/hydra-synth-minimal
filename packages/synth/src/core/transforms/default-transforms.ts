import type { HydraTransformDefinition } from '../types.js'

export const getDefaultTransforms = (): HydraTransformDefinition[] => [
  {
    name: 'noise',
    type: 'src',
    inputs: [
      { type: 'float', name: 'scale', default: 10 },
      { type: 'float', name: 'offset', default: 0.1 }
    ],
    wgsl: `
  return vec4f(vec3f(hydraNoise(vec3f(_st * scale, offset * globals.time))), 1.0);
`
  },
  {
    name: 'noiseLoop',
    type: 'src',
    inputs: [
      { type: 'float', name: 'scale', default: 10.0 },
      { type: 'float', name: 'speed', default: 0.1 },
      { type: 'float', name: 'radius', default: 1.0 }
    ],
    wgsl: `
  let loopRadius = max(radius, 0.0001);
  let phase = globals.time * speed * 6.28318530718;
  let p = vec4f(_st * scale, cos(phase) * loopRadius, sin(phase) * loopRadius);
  let value = hydraNoise4(p);
  return vec4f(vec3f(value), 1.0);
`
  },
  {
    name: 'fbm',
    type: 'src',
    inputs: [
      { type: 'float', name: 'scale', default: 4.0 },
      { type: 'float', name: 'speed', default: 0.1 },
      { type: 'float', name: 'octaves', default: 5.0 },
      { type: 'float', name: 'lacunarity', default: 2.0 },
      { type: 'float', name: 'gain', default: 0.5 }
    ],
    wgsl: `
  let octaveCount = clamp(i32(round(max(octaves, 1.0))), 1, 8);
  var frequency = max(scale, 0.0001);
  var amplitude = 0.5;
  var sum = 0.0;
  var norm = 0.0;
  let t = globals.time * speed;

  for (var i: i32 = 0; i < 8; i = i + 1) {
    if (i >= octaveCount) { break; }
    let fi = f32(i);
    let p = vec3f(_st * frequency + vec2f(fi * 13.17, fi * 7.31), t * frequency);
    sum += hydraNoise(p) * amplitude;
    norm += amplitude;
    frequency *= max(lacunarity, 1.0);
    amplitude *= clamp(gain, 0.0, 1.0);
  }

  let value = sum / max(norm, 0.0001);
  return vec4f(vec3f(value * 0.5 + 0.5), 1.0);
`
  },
  {
    name: 'ridged',
    type: 'src',
    inputs: [
      { type: 'float', name: 'scale', default: 4.0 },
      { type: 'float', name: 'speed', default: 0.1 },
      { type: 'float', name: 'octaves', default: 5.0 },
      { type: 'float', name: 'lacunarity', default: 2.0 },
      { type: 'float', name: 'gain', default: 0.55 }
    ],
    wgsl: `
  let octaveCount = clamp(i32(round(max(octaves, 1.0))), 1, 8);
  var frequency = max(scale, 0.0001);
  var amplitude = 0.5;
  var sum = 0.0;
  var norm = 0.0;
  let t = globals.time * speed;

  for (var i: i32 = 0; i < 8; i = i + 1) {
    if (i >= octaveCount) { break; }
    let fi = f32(i);
    let p = vec3f(_st * frequency + vec2f(fi * 19.31, fi * 5.73), t * frequency);
    let ridge = 1.0 - abs(hydraNoise(p));
    sum += ridge * ridge * amplitude;
    norm += amplitude;
    frequency *= max(lacunarity, 1.0);
    amplitude *= clamp(gain, 0.0, 1.0);
  }

  let value = sum / max(norm, 0.0001);
  return vec4f(vec3f(clamp(value, 0.0, 1.0)), 1.0);
`
  },
  {
    name: 'turbulence',
    type: 'src',
    inputs: [
      { type: 'float', name: 'scale', default: 4.0 },
      { type: 'float', name: 'speed', default: 0.1 },
      { type: 'float', name: 'octaves', default: 5.0 },
      { type: 'float', name: 'lacunarity', default: 2.0 },
      { type: 'float', name: 'gain', default: 0.5 }
    ],
    wgsl: `
  let octaveCount = clamp(i32(round(max(octaves, 1.0))), 1, 8);
  var frequency = max(scale, 0.0001);
  var amplitude = 0.5;
  var sum = 0.0;
  var norm = 0.0;
  let t = globals.time * speed;

  for (var i: i32 = 0; i < 8; i = i + 1) {
    if (i >= octaveCount) { break; }
    let fi = f32(i);
    let p = vec3f(_st * frequency + vec2f(fi * 11.19, fi * 23.47), t * frequency);
    sum += abs(hydraNoise(p)) * amplitude;
    norm += amplitude;
    frequency *= max(lacunarity, 1.0);
    amplitude *= clamp(gain, 0.0, 1.0);
  }

  let value = sum / max(norm, 0.0001);
  return vec4f(vec3f(clamp(value, 0.0, 1.0)), 1.0);
`
  },
  {
    name: 'voronoi',
    type: 'src',
    inputs: [
      { type: 'float', name: 'scale', default: 5 },
      { type: 'float', name: 'speed', default: 0.3 },
      { type: 'float', name: 'blending', default: 0.3 }
    ],
    wgsl: `
  var color = vec3f(0.0);
  let stScaled = _st * scale;
  let i_st = floor(stScaled);
  let f_st = fract(stScaled);
  var m_dist = 10.0;
  var m_point = vec2f(0.0);

  for (var j: i32 = -1; j <= 1; j = j + 1) {
    for (var i: i32 = -1; i <= 1; i = i + 1) {
      let neighbor = vec2f(f32(i), f32(j));
      let p = i_st + neighbor;
      var point = fract(sin(vec2f(
        dot(p, vec2f(127.1, 311.7)),
        dot(p, vec2f(269.5, 183.3))
      )) * 43758.5453);
      point = vec2f(0.5) + vec2f(0.5) * sin(globals.time * speed + 6.2831 * point);
      let diff = neighbor + point - f_st;
      let dist = length(diff);
      if (dist < m_dist) {
        m_dist = dist;
        m_point = point;
      }
    }
  }

  color += vec3f(dot(m_point, vec2f(0.3, 0.6)));
  color *= 1.0 - blending * m_dist;
  return vec4f(color, 1.0);
`
  },
  {
    name: 'osc',
    type: 'src',
    inputs: [
      { type: 'float', name: 'frequency', default: 60 },
      { type: 'float', name: 'sync', default: 0.1 },
      { type: 'float', name: 'offset', default: 0 }
    ],
    wgsl: `
  let safeFrequency = select(frequency, 0.0001, abs(frequency) < 0.0001);
  let phase = globals.time * sync;
  let r = sin((_st.x - offset / safeFrequency + phase) * safeFrequency) * 0.5 + 0.5;
  let g = sin((_st.x + phase) * safeFrequency) * 0.5 + 0.5;
  let b = sin((_st.x + offset / safeFrequency + phase) * safeFrequency) * 0.5 + 0.5;
  return vec4f(r, g, b, 1.0);
`
  },
  {
    name: 'shape',
    type: 'src',
    inputs: [
      { type: 'float', name: 'sides', default: 3 },
      { type: 'float', name: 'radius', default: 0.3 },
      { type: 'float', name: 'smoothing', default: 0.01 }
    ],
    wgsl: `
  let st = _st * 2.0 - 1.0;
  let a = atan2(st.x, st.y) + 3.1416;
  let safeSides = max(abs(sides), 1.0);
  let r = (2.0 * 3.1416) / safeSides;
  let d = cos(floor(0.5 + a / r) * r - a) * length(st);
  let v = 1.0 - smoothstep(radius, radius + smoothing + 0.0000001, d);
  return vec4f(vec3f(v), 1.0);
`
  },
  {
    name: 'gradient',
    type: 'src',
    inputs: [
      { type: 'float', name: 'speed', default: 0 }
    ],
    wgsl: `
  return vec4f(_st, sin(globals.time * speed), 1.0);
`
  },
  {
    name: 'src',
    type: 'src',
    inputs: [
      { type: 'sampler2D', name: 'tex', default: NaN }
    ],
    wgsl: `
  return hydraSampleTexture(tex, fract(_st));
`
  },
  {
    name: 'solid',
    type: 'src',
    inputs: [
      { type: 'float', name: 'r', default: 0 },
      { type: 'float', name: 'g', default: 0 },
      { type: 'float', name: 'b', default: 0 },
      { type: 'float', name: 'a', default: 1 }
    ],
    wgsl: `
  return vec4f(r, g, b, a);
`
  },
  {
    name: 'rotate',
    type: 'coord',
    inputs: [
      { type: 'float', name: 'angle', default: 10 },
      { type: 'float', name: 'speed', default: 0 }
    ],
    wgsl: `
  let xy = _st - vec2f(0.5);
  let ang = angle + speed * globals.time;
  let cs = cos(ang);
  let sn = sin(ang);
  let rotated = vec2f(cs * xy.x - sn * xy.y, sn * xy.x + cs * xy.y);
  return rotated + vec2f(0.5);
`
  },
  {
    name: 'scale',
    type: 'coord',
    inputs: [
      { type: 'float', name: 'amount', default: 1.5 },
      { type: 'float', name: 'xMult', default: 1 },
      { type: 'float', name: 'yMult', default: 1 },
      { type: 'float', name: 'offsetX', default: 0.5 },
      { type: 'float', name: 'offsetY', default: 0.5 }
    ],
    wgsl: `
  var xy = _st - vec2f(offsetX, offsetY);
  let safeScale = vec2f(
    max(abs(amount * xMult), 0.0001),
    max(abs(amount * yMult), 0.0001)
  );
  xy *= vec2f(1.0) / safeScale;
  xy += vec2f(offsetX, offsetY);
  return xy;
`
  },
  {
    name: 'pixelate',
    type: 'coord',
    inputs: [
      { type: 'float', name: 'pixelX', default: 20 },
      { type: 'float', name: 'pixelY', default: 20 }
    ],
    wgsl: `
  let xy = vec2f(
    max(abs(pixelX), 1.0),
    max(abs(pixelY), 1.0)
  );
  return (floor(_st * xy) + 0.5) / xy;
`
  },
  {
    name: 'posterize',
    type: 'color',
    inputs: [
      { type: 'float', name: 'bins', default: 3 },
      { type: 'float', name: 'gamma', default: 0.6 }
    ],
    wgsl: `
  let safeGamma = max(abs(gamma), 0.0001);
  let safeBins = max(abs(bins), 1.0);
  let signalSign = sign(_c0.xyz);
  var magnitude = pow(abs(_c0.xyz), vec3f(safeGamma));
  magnitude = floor(magnitude * safeBins) / safeBins;
  let quantized = signalSign * pow(magnitude, vec3f(1.0 / safeGamma));
  return vec4f(quantized, _c0.w);
`
  },
  {
    name: 'shift',
    type: 'color',
    inputs: [
      { type: 'float', name: 'r', default: 0.5 },
      { type: 'float', name: 'g', default: 0 },
      { type: 'float', name: 'b', default: 0 },
      { type: 'float', name: 'a', default: 0 }
    ],
    wgsl: `
  var c2 = _c0;
  c2.x += fract(r);
  c2.y += fract(g);
  c2.z += fract(b);
  c2.w += fract(a);
  return c2;
`
  },
  {
    name: 'repeat',
    type: 'coord',
    inputs: [
      { type: 'float', name: 'repeatX', default: 3 },
      { type: 'float', name: 'repeatY', default: 3 },
      { type: 'float', name: 'offsetX', default: 0 },
      { type: 'float', name: 'offsetY', default: 0 }
    ],
    wgsl: `
  var st = _st * vec2f(repeatX, repeatY);
  st.x += step(1.0, hydraMod(st.y, 2.0)) * offsetX;
  st.y += step(1.0, hydraMod(st.x, 2.0)) * offsetY;
  return fract(st);
`
  },
  {
    name: 'modulateRepeat',
    type: 'combineCoord',
    inputs: [
      { type: 'float', name: 'repeatX', default: 3 },
      { type: 'float', name: 'repeatY', default: 3 },
      { type: 'float', name: 'offsetX', default: 0.5 },
      { type: 'float', name: 'offsetY', default: 0.5 }
    ],
    wgsl: `
  var st = _st * vec2f(repeatX, repeatY);
  st.x += step(1.0, hydraMod(st.y, 2.0)) * offsetX + _c0.x * offsetX;
  st.y += step(1.0, hydraMod(st.x, 2.0)) * offsetY + _c0.y * offsetY;
  return fract(st);
`
  },
  {
    name: 'repeatX',
    type: 'coord',
    inputs: [
      { type: 'float', name: 'reps', default: 3 },
      { type: 'float', name: 'offset', default: 0 }
    ],
    wgsl: `
  var st = _st * vec2f(reps, 1.0);
  st.y += step(1.0, hydraMod(st.x, 2.0)) * offset;
  return fract(st);
`
  },
  {
    name: 'modulateRepeatX',
    type: 'combineCoord',
    inputs: [
      { type: 'float', name: 'reps', default: 3 },
      { type: 'float', name: 'offset', default: 0.5 }
    ],
    wgsl: `
  var st = _st * vec2f(reps, 1.0);
  st.y += step(1.0, hydraMod(st.x, 2.0)) * offset + _c0.x * offset;
  return fract(st);
`
  },
  {
    name: 'repeatY',
    type: 'coord',
    inputs: [
      { type: 'float', name: 'reps', default: 3 },
      { type: 'float', name: 'offset', default: 0 }
    ],
    wgsl: `
  var st = _st * vec2f(1.0, reps);
  st.x += step(1.0, hydraMod(st.y, 2.0)) * offset;
  return fract(st);
`
  },
  {
    name: 'modulateRepeatY',
    type: 'combineCoord',
    inputs: [
      { type: 'float', name: 'reps', default: 3 },
      { type: 'float', name: 'offset', default: 0.5 }
    ],
    wgsl: `
  var st = _st * vec2f(1.0, reps);
  st.x += step(1.0, hydraMod(st.y, 2.0)) * offset + _c0.x * offset;
  return fract(st);
`
  },
  {
    name: 'kaleid',
    type: 'coord',
    inputs: [
      { type: 'float', name: 'nSides', default: 4 }
    ],
    wgsl: `
  var st = _st;
  st -= vec2f(0.5);
  let r = length(st);
  var a = atan2(st.y, st.x);
  let pi = 2.0 * 3.1416;
  let safeSides = max(abs(nSides), 1.0);
  let wedge = pi / safeSides;
  a = hydraMod(a, wedge);
  a = abs(a - wedge / 2.0);
  return r * vec2f(cos(a), sin(a));
`
  },
  {
    name: 'modulateKaleid',
    type: 'combineCoord',
    inputs: [
      { type: 'float', name: 'nSides', default: 4 }
    ],
    wgsl: `
  let st = _st - vec2f(0.5);
  let r = length(st);
  var a = atan2(st.y, st.x);
  let pi = 2.0 * 3.1416;
  let safeSides = max(abs(nSides), 1.0);
  let wedge = pi / safeSides;
  a = hydraMod(a, wedge);
  a = abs(a - wedge / 2.0);
  return (_c0.x + r) * vec2f(cos(a), sin(a));
`
  },
  {
    name: 'scroll',
    type: 'coord',
    inputs: [
      { type: 'float', name: 'scrollX', default: 0.5 },
      { type: 'float', name: 'scrollY', default: 0.5 },
      { type: 'float', name: 'speedX', default: 0 },
      { type: 'float', name: 'speedY', default: 0 }
    ],
    wgsl: `
  var st = _st;
  st.x += scrollX + globals.time * speedX;
  st.y += scrollY + globals.time * speedY;
  return fract(st);
`
  },
  {
    name: 'scrollX',
    type: 'coord',
    inputs: [
      { type: 'float', name: 'scrollX', default: 0.5 },
      { type: 'float', name: 'speed', default: 0 }
    ],
    wgsl: `
  var st = _st;
  st.x += scrollX + globals.time * speed;
  return fract(st);
`
  },
  {
    name: 'scrollY',
    type: 'coord',
    inputs: [
      { type: 'float', name: 'scrollY', default: 0.5 },
      { type: 'float', name: 'speed', default: 0 }
    ],
    wgsl: `
  var st = _st;
  st.y += scrollY + globals.time * speed;
  return fract(st);
`
  },
  {
    // Syntactic sugar: modulate(tex.mask(tex.color(1,0)), scrollX).scrollX(0, speed)
    name: 'modulateScrollX',
    type: 'combineCoord',
    inputs: [
      { type: 'float', name: 'scrollX', default: 0.5 },
      { type: 'float', name: 'speed', default: 0 }
    ],
    wgsl: `
  var st = _st;
  st.x += _c0.x * scrollX + globals.time * speed;
  return fract(st);
`
  },
  {
    // Syntactic sugar: modulate(tex.mask(tex.color(1,0)), scrollX).scrollX(0, speed)
    name: 'modulateScrollY',
    type: 'combineCoord',
    inputs: [
      { type: 'float', name: 'scrollY', default: 0.5 },
      { type: 'float', name: 'speed', default: 0 }
    ],
    wgsl: `
  var st = _st;
  st.y += _c0.x * scrollY + globals.time * speed;
  return fract(st);
`
  },
  {
    name: 'add',
    type: 'combine',
    inputs: [
      { type: 'float', name: 'amount', default: 1 }
    ],
    wgsl: `
  return (_c0 + _c1) * amount + _c0 * (1.0 - amount);
`
  },
  {
    name: 'sub',
    type: 'combine',
    inputs: [
      { type: 'float', name: 'amount', default: 1 }
    ],
    wgsl: `
  return (_c0 - _c1) * amount + _c0 * (1.0 - amount);
`
  },
  {
    name: 'layer',
    type: 'combine',
    inputs: [],
    wgsl: `
  return vec4f(mix(_c0.xyz, _c1.xyz, _c1.w), clamp(_c0.w + _c1.w, 0.0, 1.0));
`
  },
  {
    name: 'blend',
    type: 'combine',
    inputs: [
      { type: 'float', name: 'amount', default: 0.5 }
    ],
    wgsl: `
  return _c0 * (1.0 - amount) + _c1 * amount;
`
  },
  {
    name: 'screen',
    type: 'combine',
    inputs: [
      { type: 'float', name: 'amount', default: 1.0 }
    ],
    wgsl: `
  let blended = vec3f(1.0) - (vec3f(1.0) - _c0.xyz) * (vec3f(1.0) - _c1.xyz);
  let mixed = mix(_c0.xyz, blended, vec3f(clamp(amount, 0.0, 1.0)));
  return vec4f(mixed, max(_c0.w, _c1.w));
`
  },
  {
    name: 'overlay',
    type: 'combine',
    inputs: [
      { type: 'float', name: 'amount', default: 1.0 }
    ],
    wgsl: `
  let low = 2.0 * _c0.xyz * _c1.xyz;
  let high = vec3f(1.0) - 2.0 * (vec3f(1.0) - _c0.xyz) * (vec3f(1.0) - _c1.xyz);
  let mask = step(vec3f(0.5), _c0.xyz);
  let blended = low * (vec3f(1.0) - mask) + high * mask;
  let mixed = mix(_c0.xyz, blended, vec3f(clamp(amount, 0.0, 1.0)));
  return vec4f(clamp(mixed, vec3f(0.0), vec3f(1.0)), max(_c0.w, _c1.w));
`
  },
  {
    name: 'softLight',
    type: 'combine',
    inputs: [
      { type: 'float', name: 'amount', default: 1.0 }
    ],
    wgsl: `
  let blended = (vec3f(1.0) - 2.0 * _c1.xyz) * (_c0.xyz * _c0.xyz) + 2.0 * _c1.xyz * _c0.xyz;
  let mixed = mix(_c0.xyz, blended, vec3f(clamp(amount, 0.0, 1.0)));
  return vec4f(clamp(mixed, vec3f(0.0), vec3f(1.0)), max(_c0.w, _c1.w));
`
  },
  {
    name: 'hardLight',
    type: 'combine',
    inputs: [
      { type: 'float', name: 'amount', default: 1.0 }
    ],
    wgsl: `
  let low = 2.0 * _c0.xyz * _c1.xyz;
  let high = vec3f(1.0) - 2.0 * (vec3f(1.0) - _c0.xyz) * (vec3f(1.0) - _c1.xyz);
  let mask = step(vec3f(0.5), _c1.xyz);
  let blended = low * (vec3f(1.0) - mask) + high * mask;
  let mixed = mix(_c0.xyz, blended, vec3f(clamp(amount, 0.0, 1.0)));
  return vec4f(clamp(mixed, vec3f(0.0), vec3f(1.0)), max(_c0.w, _c1.w));
`
  },
  {
    name: 'colorDodge',
    type: 'combine',
    inputs: [
      { type: 'float', name: 'amount', default: 1.0 }
    ],
    wgsl: `
  let denom = max(vec3f(0.0001), vec3f(1.0) - _c1.xyz);
  let blended = clamp(_c0.xyz / denom, vec3f(0.0), vec3f(1.0));
  let mixed = mix(_c0.xyz, blended, vec3f(clamp(amount, 0.0, 1.0)));
  return vec4f(mixed, max(_c0.w, _c1.w));
`
  },
  {
    name: 'colorBurn',
    type: 'combine',
    inputs: [
      { type: 'float', name: 'amount', default: 1.0 }
    ],
    wgsl: `
  let denom = max(vec3f(0.0001), _c1.xyz);
  let blended = vec3f(1.0) - clamp((vec3f(1.0) - _c0.xyz) / denom, vec3f(0.0), vec3f(1.0));
  let mixed = mix(_c0.xyz, blended, vec3f(clamp(amount, 0.0, 1.0)));
  return vec4f(clamp(mixed, vec3f(0.0), vec3f(1.0)), max(_c0.w, _c1.w));
`
  },
  {
    name: 'bloomMix',
    type: 'combine',
    inputs: [
      { type: 'float', name: 'amount', default: 0.8 }
    ],
    wgsl: `
  let mixAmount = max(amount, 0.0);
  return vec4f(_c1.xyz + _c0.xyz * mixAmount, _c1.w);
`
  },
  {
    name: 'mult',
    type: 'combine',
    inputs: [
      { type: 'float', name: 'amount', default: 1 }
    ],
    wgsl: `
  return _c0 * (1.0 - amount) + (_c0 * _c1) * amount;
`
  },
  {
    name: 'diff',
    type: 'combine',
    inputs: [],
    wgsl: `
  return vec4f(abs(_c0.xyz - _c1.xyz), max(_c0.w, _c1.w));
`
  },
  {
    name: 'modulate',
    type: 'combineCoord',
    inputs: [
      { type: 'float', name: 'amount', default: 0.1 }
    ],
    wgsl: `
  return _st + _c0.xy * amount;
`
  },


  {
    name: 'modulateScale',
    type: 'combineCoord',
    inputs: [
      { type: 'float', name: 'multiple', default: 1 },
      { type: 'float', name: 'offset', default: 1 }
    ],
    wgsl: `
  var xy = _st - vec2f(0.5);
  let safeScale = vec2f(
    max(abs(offset + multiple * _c0.x), 0.0001),
    max(abs(offset + multiple * _c0.y), 0.0001)
  );
  xy *= vec2f(1.0) / safeScale;
  xy += vec2f(0.5);
  return xy;
`
  },
  {
    name: 'modulatePixelate',
    type: 'combineCoord',
    inputs: [
      { type: 'float', name: 'multiple', default: 10 },
      { type: 'float', name: 'offset', default: 3 }
    ],
    wgsl: `
  let xy = vec2f(
    max(abs(offset + _c0.x * multiple), 1.0),
    max(abs(offset + _c0.y * multiple), 1.0)
  );
  return (floor(_st * xy) + 0.5) / xy;
`
  },
  {
    // Syntactic sugar: rotate(tex.mult(multiple).add(offset))
    name: 'modulateRotate',
    type: 'combineCoord',
    inputs: [
      { type: 'float', name: 'multiple', default: 1 },
      { type: 'float', name: 'offset', default: 0 }
    ],
    wgsl: `
  let xy = _st - vec2f(0.5);
  let angle = offset + _c0.x * multiple;
  let cs = cos(angle);
  let sn = sin(angle);
  let rotated = vec2f(cs * xy.x - sn * xy.y, sn * xy.x + cs * xy.y);
  return rotated + vec2f(0.5);
`
  },
  {
    // Syntactic sugar: modulate(tex.sub(tex.r, tex.g).color(1,0,0), amount) ... roughly
    name: 'modulateHue',
    type: 'combineCoord',
    inputs: [
      { type: 'float', name: 'amount', default: 1 }
    ],
    wgsl: `
  let resolution = vec2f(globals.width, globals.height);
  let safeResolution = max(resolution, vec2f(1.0));
  return _st + (vec2f(_c0.y - _c0.x, _c0.z - _c0.y) * amount * (1.0 / safeResolution));
`
  },
  {
    // Syntactic sugar: mult(-1).add(1)
    name: 'invert',
    type: 'color',
    inputs: [
      { type: 'float', name: 'amount', default: 1 }
    ],
    wgsl: `
  return vec4f((vec3f(1.0) - _c0.xyz) * amount + _c0.xyz * (1.0 - amount), _c0.w);
`
  },
  {
    // Syntactic sugar: sub(0.5).mult(amount).add(0.5)
    name: 'contrast',
    type: 'color',
    inputs: [
      { type: 'float', name: 'amount', default: 1.6 }
    ],
    wgsl: `
  let c = (_c0 - vec4f(0.5)) * vec4f(amount) + vec4f(0.5);
  return vec4f(c.xyz, _c0.w);
`
  },
  {
    // Syntactic sugar: add(amount)
    name: 'brightness',
    type: 'color',
    inputs: [
      { type: 'float', name: 'amount', default: 0.4 }
    ],
    wgsl: `
  return vec4f(_c0.xyz + vec3f(amount), _c0.w);
`
  },
  {
    name: 'mask',
    type: 'combine',
    inputs: [],
    wgsl: `
  let a = hydraLuminance(_c1.xyz);
  return vec4f(_c0.xyz * a, a * _c0.w);
`
  },
  {
    name: 'luma',
    type: 'color',
    inputs: [
      { type: 'float', name: 'threshold', default: 0.5 },
      { type: 'float', name: 'tolerance', default: 0.1 }
    ],
    wgsl: `
  let a = smoothstep(
    threshold - (tolerance + 0.0000001),
    threshold + (tolerance + 0.0000001),
    hydraLuminance(_c0.xyz)
  );
  return vec4f(_c0.xyz * a, a);
`
  },
  {
    name: 'thresh',
    type: 'color',
    inputs: [
      { type: 'float', name: 'threshold', default: 0.5 },
      { type: 'float', name: 'tolerance', default: 0.04 }
    ],
    wgsl: `
  let t = smoothstep(
    threshold - (tolerance + 0.0000001),
    threshold + (tolerance + 0.0000001),
    hydraLuminance(_c0.xyz)
  );
  return vec4f(vec3f(t), _c0.w);
`
  },
  {
    name: 'color',
    type: 'color',
    inputs: [
      { type: 'float', name: 'r', default: 1 },
      { type: 'float', name: 'g', default: 1 },
      { type: 'float', name: 'b', default: 1 },
      { type: 'float', name: 'a', default: 1 }
    ],
    wgsl: `
  let c = vec4f(r, g, b, a);
  let pos = step(vec4f(0.0), c);
  return mix((vec4f(1.0) - _c0) * abs(c), c * _c0, pos);
`
  },
  {
    name: 'saturate',
    type: 'color',
    inputs: [
      { type: 'float', name: 'amount', default: 2 }
    ],
    wgsl: `
  let w = vec3f(0.2125, 0.7154, 0.0721);
  let intensity = vec3f(dot(_c0.xyz, w));
  return vec4f(mix(intensity, _c0.xyz, amount), _c0.w);
`
  },
  {
    name: 'hue',
    type: 'color',
    inputs: [
      { type: 'float', name: 'hue', default: 0.4 }
    ],
    wgsl: `
  var c = hydraRgbToHsv(_c0.xyz);
  c.x += hue;
  return vec4f(hydraHsvToRgb(c), _c0.w);
`
  },
  {
    name: 'colorama',
    type: 'color',
    inputs: [
      { type: 'float', name: 'amount', default: 0.005 }
    ],
    wgsl: `
  var c = hydraRgbToHsv(_c0.xyz);
  c += vec3f(amount);
  c = hydraHsvToRgb(c);
  c = fract(c);
  return vec4f(c, _c0.w);
`
  },
  {
    name: 'renderpass',
    type: 'renderpass',
    inputs: [],
    wgsl: `
  return hydraSampleTexture(prevBuffer, fract(_st));
`
  },
  {
    name: 'blurX',
    type: 'renderpass',
    inputs: [
      { type: 'float', name: 'amount', default: 1 }
    ],
    wgsl: `
  let stepX = amount / max(globals.width, 1.0);
  let offset = vec2f(stepX, 0.0);
  let center = hydraSampleTexture(prevBuffer, fract(_st));
  let s1 = hydraSampleTexture(prevBuffer, fract(_st + offset));
  let s2 = hydraSampleTexture(prevBuffer, fract(_st - offset));
  let s3 = hydraSampleTexture(prevBuffer, fract(_st + offset * 2.0));
  let s4 = hydraSampleTexture(prevBuffer, fract(_st - offset * 2.0));
  let s5 = hydraSampleTexture(prevBuffer, fract(_st + offset * 3.0));
  let s6 = hydraSampleTexture(prevBuffer, fract(_st - offset * 3.0));
  let s7 = hydraSampleTexture(prevBuffer, fract(_st + offset * 4.0));
  let s8 = hydraSampleTexture(prevBuffer, fract(_st - offset * 4.0));
  return
    center * 0.227027027 +
    (s1 + s2) * 0.194594595 +
    (s3 + s4) * 0.121621622 +
    (s5 + s6) * 0.054054054 +
    (s7 + s8) * 0.016216216;
`
  },
  {
    name: 'blurY',
    type: 'renderpass',
    inputs: [
      { type: 'float', name: 'amount', default: 1 }
    ],
    wgsl: `
  let stepY = amount / max(globals.height, 1.0);
  let offset = vec2f(0.0, stepY);
  let center = hydraSampleTexture(prevBuffer, fract(_st));
  let s1 = hydraSampleTexture(prevBuffer, fract(_st + offset));
  let s2 = hydraSampleTexture(prevBuffer, fract(_st - offset));
  let s3 = hydraSampleTexture(prevBuffer, fract(_st + offset * 2.0));
  let s4 = hydraSampleTexture(prevBuffer, fract(_st - offset * 2.0));
  let s5 = hydraSampleTexture(prevBuffer, fract(_st + offset * 3.0));
  let s6 = hydraSampleTexture(prevBuffer, fract(_st - offset * 3.0));
  let s7 = hydraSampleTexture(prevBuffer, fract(_st + offset * 4.0));
  let s8 = hydraSampleTexture(prevBuffer, fract(_st - offset * 4.0));
  return
    center * 0.227027027 +
    (s1 + s2) * 0.194594595 +
    (s3 + s4) * 0.121621622 +
    (s5 + s6) * 0.054054054 +
    (s7 + s8) * 0.016216216;
`
  },
  {
    name: 'blur',
    type: 'renderpass',
    inputs: [
      { type: 'float', name: 'amount', default: 1 }
    ],
    wgsl: `
  let stepX = amount / max(globals.width, 1.0);
  let stepY = amount / max(globals.height, 1.0);

  let axisX = vec2f(stepX, 0.0);
  let axisY = vec2f(0.0, stepY);
  let diag = vec2f(stepX, stepY);

  let center = hydraSampleTexture(prevBuffer, fract(_st));

  let xPos1 = hydraSampleTexture(prevBuffer, fract(_st + axisX));
  let xNeg1 = hydraSampleTexture(prevBuffer, fract(_st - axisX));
  let yPos1 = hydraSampleTexture(prevBuffer, fract(_st + axisY));
  let yNeg1 = hydraSampleTexture(prevBuffer, fract(_st - axisY));

  let dPosPos = hydraSampleTexture(prevBuffer, fract(_st + diag));
  let dNegPos = hydraSampleTexture(prevBuffer, fract(_st + vec2f(-diag.x, diag.y)));
  let dPosNeg = hydraSampleTexture(prevBuffer, fract(_st + vec2f(diag.x, -diag.y)));
  let dNegNeg = hydraSampleTexture(prevBuffer, fract(_st - diag));

  let xPos2 = hydraSampleTexture(prevBuffer, fract(_st + axisX * 2.0));
  let xNeg2 = hydraSampleTexture(prevBuffer, fract(_st - axisX * 2.0));
  let yPos2 = hydraSampleTexture(prevBuffer, fract(_st + axisY * 2.0));
  let yNeg2 = hydraSampleTexture(prevBuffer, fract(_st - axisY * 2.0));

  return
    center * 0.2 +
    (xPos1 + xNeg1 + yPos1 + yNeg1) * 0.1 +
    (dPosPos + dNegPos + dPosNeg + dNegNeg) * 0.06 +
    (xPos2 + xNeg2 + yPos2 + yNeg2) * 0.04;
`
  },
  {
    name: 'blurFast',
    type: 'renderpass',
    inputs: [
      { type: 'float', name: 'amount', default: 1.0 }
    ],
    wgsl: `
  let texel = vec2f(
    amount / max(globals.width, 1.0),
    amount / max(globals.height, 1.0)
  );
  let center = hydraSampleTexture(prevBuffer, fract(_st));
  let n = hydraSampleTexture(prevBuffer, fract(_st + vec2f(0.0, texel.y)));
  let s = hydraSampleTexture(prevBuffer, fract(_st - vec2f(0.0, texel.y)));
  let e = hydraSampleTexture(prevBuffer, fract(_st + vec2f(texel.x, 0.0)));
  let w = hydraSampleTexture(prevBuffer, fract(_st - vec2f(texel.x, 0.0)));
  return center * 0.5 + (n + s + e + w) * 0.125;
`
  },
  {
    name: 'blurBilateral',
    type: 'renderpass',
    inputs: [
      { type: 'float', name: 'radius', default: 1.0 },
      { type: 'float', name: 'sigmaColor', default: 18.0 }
    ],
    wgsl: `
  let texel = vec2f(
    radius / max(globals.width, 1.0),
    radius / max(globals.height, 1.0)
  );
  let center = hydraSampleTexture(prevBuffer, fract(_st));
  let centerLuma = hydraLuminance(center.xyz);
  let invSigma = 1.0 / max(sigmaColor, 0.0001);

  let s0 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(0.0, texel.y)));
  let s1 = hydraSampleTexture(prevBuffer, fract(_st - vec2f(0.0, texel.y)));
  let s2 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(texel.x, 0.0)));
  let s3 = hydraSampleTexture(prevBuffer, fract(_st - vec2f(texel.x, 0.0)));
  let s4 = hydraSampleTexture(prevBuffer, fract(_st + texel));
  let s5 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(-texel.x, texel.y)));
  let s6 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(texel.x, -texel.y)));
  let s7 = hydraSampleTexture(prevBuffer, fract(_st - texel));

  let w0 = exp(-abs(hydraLuminance(s0.xyz) - centerLuma) * invSigma) * 0.12;
  let w1 = exp(-abs(hydraLuminance(s1.xyz) - centerLuma) * invSigma) * 0.12;
  let w2 = exp(-abs(hydraLuminance(s2.xyz) - centerLuma) * invSigma) * 0.12;
  let w3 = exp(-abs(hydraLuminance(s3.xyz) - centerLuma) * invSigma) * 0.12;
  let w4 = exp(-abs(hydraLuminance(s4.xyz) - centerLuma) * invSigma) * 0.07;
  let w5 = exp(-abs(hydraLuminance(s5.xyz) - centerLuma) * invSigma) * 0.07;
  let w6 = exp(-abs(hydraLuminance(s6.xyz) - centerLuma) * invSigma) * 0.07;
  let w7 = exp(-abs(hydraLuminance(s7.xyz) - centerLuma) * invSigma) * 0.07;

  let centerWeight = 0.24;
  let sumWeight = centerWeight + w0 + w1 + w2 + w3 + w4 + w5 + w6 + w7;
  let sumColor =
    center.xyz * centerWeight +
    s0.xyz * w0 + s1.xyz * w1 + s2.xyz * w2 + s3.xyz * w3 +
    s4.xyz * w4 + s5.xyz * w5 + s6.xyz * w6 + s7.xyz * w7;

  return vec4f(sumColor / max(sumWeight, 0.0001), center.w);
`
  },
  {
    name: 'bloom',
    type: 'renderpass',
    inputs: [
      { type: 'float', name: 'amount', default: 0.8 },
      { type: 'float', name: 'radius', default: 1.0 },
      { type: 'float', name: 'threshold', default: 0.6 },
      { type: 'float', name: 'softness', default: 0.1 }
    ],
    wgsl: `
  let center = hydraSampleTexture(prevBuffer, fract(_st));
  let stepSize = vec2f(
    radius / max(globals.width, 1.0),
    radius / max(globals.height, 1.0)
  );
  let axisX = vec2f(stepSize.x, 0.0);
  let axisY = vec2f(0.0, stepSize.y);
  let diag = vec2f(stepSize.x, stepSize.y);
  let knee = max(softness, 0.0001);

  let s0 = center;
  let s1 = hydraSampleTexture(prevBuffer, fract(_st + axisX));
  let s2 = hydraSampleTexture(prevBuffer, fract(_st - axisX));
  let s3 = hydraSampleTexture(prevBuffer, fract(_st + axisY));
  let s4 = hydraSampleTexture(prevBuffer, fract(_st - axisY));
  let s5 = hydraSampleTexture(prevBuffer, fract(_st + diag));
  let s6 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(-diag.x, diag.y)));
  let s7 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(diag.x, -diag.y)));
  let s8 = hydraSampleTexture(prevBuffer, fract(_st - diag));
  let s9 = hydraSampleTexture(prevBuffer, fract(_st + axisX * 2.0));
  let s10 = hydraSampleTexture(prevBuffer, fract(_st - axisX * 2.0));
  let s11 = hydraSampleTexture(prevBuffer, fract(_st + axisY * 2.0));
  let s12 = hydraSampleTexture(prevBuffer, fract(_st - axisY * 2.0));

  let b0 = s0.xyz * smoothstep(threshold - knee, threshold + knee, hydraLuminance(s0.xyz));
  let b1 = s1.xyz * smoothstep(threshold - knee, threshold + knee, hydraLuminance(s1.xyz));
  let b2 = s2.xyz * smoothstep(threshold - knee, threshold + knee, hydraLuminance(s2.xyz));
  let b3 = s3.xyz * smoothstep(threshold - knee, threshold + knee, hydraLuminance(s3.xyz));
  let b4 = s4.xyz * smoothstep(threshold - knee, threshold + knee, hydraLuminance(s4.xyz));
  let b5 = s5.xyz * smoothstep(threshold - knee, threshold + knee, hydraLuminance(s5.xyz));
  let b6 = s6.xyz * smoothstep(threshold - knee, threshold + knee, hydraLuminance(s6.xyz));
  let b7 = s7.xyz * smoothstep(threshold - knee, threshold + knee, hydraLuminance(s7.xyz));
  let b8 = s8.xyz * smoothstep(threshold - knee, threshold + knee, hydraLuminance(s8.xyz));
  let b9 = s9.xyz * smoothstep(threshold - knee, threshold + knee, hydraLuminance(s9.xyz));
  let b10 = s10.xyz * smoothstep(threshold - knee, threshold + knee, hydraLuminance(s10.xyz));
  let b11 = s11.xyz * smoothstep(threshold - knee, threshold + knee, hydraLuminance(s11.xyz));
  let b12 = s12.xyz * smoothstep(threshold - knee, threshold + knee, hydraLuminance(s12.xyz));

  let glow =
    b0 * 0.2 +
    (b1 + b2 + b3 + b4) * 0.1 +
    (b5 + b6 + b7 + b8) * 0.06 +
    (b9 + b10 + b11 + b12) * 0.04;

  return vec4f(center.xyz + glow * amount, center.w);
`
  },
  {
    name: 'bloomThreshold',
    type: 'renderpass',
    inputs: [
      { type: 'float', name: 'threshold', default: 0.6 },
      { type: 'float', name: 'softness', default: 0.1 }
    ],
    wgsl: `
  let src = hydraSampleTexture(prevBuffer, fract(_st));
  let knee = max(softness, 0.0001);
  let luma = hydraLuminance(src.xyz);
  let bright = smoothstep(threshold - knee, threshold + knee, luma);
  return vec4f(src.xyz * bright, src.w);
`
  },
  {
    name: 'bloomDownsample',
    type: 'renderpass',
    inputs: [
      { type: 'float', name: 'radius', default: 1.0 }
    ],
    resolutionScale: 0.5,
    wgsl: `
  let texel = vec2f(
    radius / max(globals.width, 1.0),
    radius / max(globals.height, 1.0)
  );
  let center = hydraSampleTexture(prevBuffer, fract(_st));
  let d0 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(-texel.x, -texel.y)));
  let d1 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(texel.x, -texel.y)));
  let d2 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(-texel.x, texel.y)));
  let d3 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(texel.x, texel.y)));
  return center * 0.3 + (d0 + d1 + d2 + d3) * 0.175;
`
  },
  {
    name: 'bloomUpsample',
    type: 'renderpass',
    inputs: [
      { type: 'float', name: 'radius', default: 1.0 },
      { type: 'float', name: 'boost', default: 1.0 }
    ],
    resolutionScale: 1,
    wgsl: `
  let texel = vec2f(
    radius / max(globals.width, 1.0),
    radius / max(globals.height, 1.0)
  );
  let center = hydraSampleTexture(prevBuffer, fract(_st));
  let a0 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(-texel.x, 0.0)));
  let a1 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(texel.x, 0.0)));
  let a2 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(0.0, -texel.y)));
  let a3 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(0.0, texel.y)));
  let d0 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(-texel.x, -texel.y)));
  let d1 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(texel.x, -texel.y)));
  let d2 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(-texel.x, texel.y)));
  let d3 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(texel.x, texel.y)));
  let upsampled =
    center * 0.22 +
    (a0 + a1 + a2 + a3) * 0.12 +
    (d0 + d1 + d2 + d3) * 0.075;
  return vec4f(upsampled.xyz * max(boost, 0.0), upsampled.w);
`
  },
  {
    name: 'sharpen',
    type: 'renderpass',
    inputs: [
      { type: 'float', name: 'amount', default: 1.0 },
      { type: 'float', name: 'radius', default: 1.0 }
    ],
    wgsl: `
  let center = hydraSampleTexture(prevBuffer, fract(_st));
  let stepSize = vec2f(
    radius / max(globals.width, 1.0),
    radius / max(globals.height, 1.0)
  );

  let c00 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(-stepSize.x, -stepSize.y)));
  let c10 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(0.0, -stepSize.y)));
  let c20 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(stepSize.x, -stepSize.y)));
  let c01 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(-stepSize.x, 0.0)));
  let c11 = center;
  let c21 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(stepSize.x, 0.0)));
  let c02 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(-stepSize.x, stepSize.y)));
  let c12 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(0.0, stepSize.y)));
  let c22 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(stepSize.x, stepSize.y)));

  let blurred = (
    c00 + c20 + c02 + c22 +
    (c10 + c01 + c21 + c12) * 2.0 +
    c11 * 4.0
  ) / 16.0;

  let sharpened = center.xyz + (center.xyz - blurred.xyz) * amount;
  return vec4f(clamp(sharpened, vec3f(0.0), vec3f(1.0)), center.w);
`
  },
  {
    name: 'chromaticAberration',
    type: 'renderpass',
    inputs: [
      { type: 'float', name: 'amount', default: 1.5 },
      { type: 'float', name: 'radial', default: 1.0 }
    ],
    wgsl: `
  let center = hydraSampleTexture(prevBuffer, fract(_st));
  let offsetPerAxis = vec2f(
    amount / max(globals.width, 1.0),
    amount / max(globals.height, 1.0)
  );
  let centerOffset = _st - vec2f(0.5);
  let dir = centerOffset / max(length(centerOffset), 0.0001);
  let radialMix = clamp(radial, 0.0, 1.0);
  let offset = vec2f(offsetPerAxis.x, 0.0) * (1.0 - radialMix) + (dir * offsetPerAxis) * radialMix;

  let r = hydraSampleTexture(prevBuffer, fract(_st + offset)).x;
  let b = hydraSampleTexture(prevBuffer, fract(_st - offset)).z;
  return vec4f(r, center.y, b, center.w);
`
  },
  {
    name: 'rgbSplit',
    type: 'renderpass',
    inputs: [
      { type: 'float', name: 'amount', default: 1.0 },
      { type: 'float', name: 'angle', default: 0.0 }
    ],
    wgsl: `
  let center = hydraSampleTexture(prevBuffer, fract(_st));
  let direction = vec2f(cos(angle), sin(angle));
  let offset = direction * vec2f(
    amount / max(globals.width, 1.0),
    amount / max(globals.height, 1.0)
  );

  let r = hydraSampleTexture(prevBuffer, fract(_st + offset)).x;
  let b = hydraSampleTexture(prevBuffer, fract(_st - offset)).z;
  return vec4f(r, center.y, b, center.w);
`
  },
  {
    name: 'vignette',
    type: 'renderpass',
    inputs: [
      { type: 'float', name: 'amount', default: 0.6 },
      { type: 'float', name: 'radius', default: 0.9 },
      { type: 'float', name: 'softness', default: 0.35 }
    ],
    wgsl: `
  let center = hydraSampleTexture(prevBuffer, fract(_st));
  let aspect = max(globals.width / max(globals.height, 1.0), 0.0001);
  let p = (_st - vec2f(0.5)) * vec2f(aspect, 1.0);
  let dist = length(p);
  let inner = max(radius - softness, 0.0);
  let outer = max(radius, inner + 0.0001);
  let mask = 1.0 - clamp(amount, 0.0, 1.0) * smoothstep(inner, outer, dist);
  return vec4f(center.xyz * mask, center.w);
`
  },
  {
    name: 'filmGrain',
    type: 'renderpass',
    inputs: [
      { type: 'float', name: 'amount', default: 0.06 },
      { type: 'float', name: 'speed', default: 24.0 },
      { type: 'float', name: 'colored', default: 0.0 }
    ],
    wgsl: `
  let center = hydraSampleTexture(prevBuffer, fract(_st));
  let noiseUv = _st * vec2f(globals.width, globals.height);
  let t = globals.time * speed;

  let n0 = hydraNoise(vec3f(noiseUv, t));
  let n1 = hydraNoise(vec3f(noiseUv + vec2f(19.19, 73.73), t + 11.0));
  let n2 = hydraNoise(vec3f(noiseUv + vec2f(41.41, 29.29), t + 23.0));

  let mono = vec3f(n0);
  let chroma = vec3f(n0, n1, n2);
  let chromaMix = clamp(colored, 0.0, 1.0);
  let grain = mono * (1.0 - chromaMix) + chroma * chromaMix;

  let c = center.xyz + grain * amount;
  return vec4f(clamp(c, vec3f(0.0), vec3f(1.0)), center.w);
`
  },
  {
    name: 'dither',
    type: 'renderpass',
    inputs: [
      { type: 'float', name: 'amount', default: 0.75 },
      { type: 'float', name: 'levels', default: 8.0 }
    ],
    wgsl: `
  let center = hydraSampleTexture(prevBuffer, fract(_st));
  let px = vec2i(
    i32(floor(_st.x * globals.width)),
    i32(floor(_st.y * globals.height))
  );
  let x = i32(hydraMod(f32(px.x), 4.0));
  let y = i32(hydraMod(f32(px.y), 4.0));

  var bayer = 0.0;
  if (y == 0) {
    if (x == 0) { bayer = 0.0; }
    if (x == 1) { bayer = 8.0; }
    if (x == 2) { bayer = 2.0; }
    if (x == 3) { bayer = 10.0; }
  }
  if (y == 1) {
    if (x == 0) { bayer = 12.0; }
    if (x == 1) { bayer = 4.0; }
    if (x == 2) { bayer = 14.0; }
    if (x == 3) { bayer = 6.0; }
  }
  if (y == 2) {
    if (x == 0) { bayer = 3.0; }
    if (x == 1) { bayer = 11.0; }
    if (x == 2) { bayer = 1.0; }
    if (x == 3) { bayer = 9.0; }
  }
  if (y == 3) {
    if (x == 0) { bayer = 15.0; }
    if (x == 1) { bayer = 7.0; }
    if (x == 2) { bayer = 13.0; }
    if (x == 3) { bayer = 5.0; }
  }

  let levelCount = max(levels, 2.0);
  let threshold = ((bayer + 0.5) / 16.0 - 0.5) * amount;
  let scaled = center.xyz * (levelCount - 1.0) + vec3f(threshold);
  let quantized = floor(scaled + vec3f(0.5)) / (levelCount - 1.0);
  return vec4f(clamp(quantized, vec3f(0.0), vec3f(1.0)), center.w);
`
  },
  {
    name: 'edgeDetect',
    type: 'renderpass',
    inputs: [
      { type: 'float', name: 'amount', default: 1.0 },
      { type: 'float', name: 'mixAmount', default: 1.0 }
    ],
    wgsl: `
  let center = hydraSampleTexture(prevBuffer, fract(_st));
  let texel = vec2f(
    1.0 / max(globals.width, 1.0),
    1.0 / max(globals.height, 1.0)
  );

  let s00 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(-texel.x, -texel.y)));
  let s10 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(0.0, -texel.y)));
  let s20 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(texel.x, -texel.y)));
  let s01 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(-texel.x, 0.0)));
  let s21 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(texel.x, 0.0)));
  let s02 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(-texel.x, texel.y)));
  let s12 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(0.0, texel.y)));
  let s22 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(texel.x, texel.y)));

  let l00 = hydraLuminance(s00.xyz);
  let l10 = hydraLuminance(s10.xyz);
  let l20 = hydraLuminance(s20.xyz);
  let l01 = hydraLuminance(s01.xyz);
  let l21 = hydraLuminance(s21.xyz);
  let l02 = hydraLuminance(s02.xyz);
  let l12 = hydraLuminance(s12.xyz);
  let l22 = hydraLuminance(s22.xyz);

  let gx = (3.0 * (l20 + l22 - l00 - l02) + 10.0 * (l21 - l01)) / 16.0;
  let gy = (3.0 * (l02 + l22 - l00 - l20) + 10.0 * (l12 - l10)) / 16.0;
  let edge = clamp(length(vec2f(gx, gy)) * amount * 1.25, 0.0, 1.0);
  let edgeColor = vec3f(edge);
  let blend = clamp(mixAmount, 0.0, 1.0);

  return vec4f(center.xyz * (1.0 - blend) + edgeColor * blend, center.w);
`
  },
  {
    name: 'edgeLaplacian',
    type: 'renderpass',
    inputs: [
      { type: 'float', name: 'amount', default: 1.0 },
      { type: 'float', name: 'mixAmount', default: 1.0 }
    ],
    wgsl: `
  let center = hydraSampleTexture(prevBuffer, fract(_st));
  let texel = vec2f(
    1.0 / max(globals.width, 1.0),
    1.0 / max(globals.height, 1.0)
  );

  let n = hydraSampleTexture(prevBuffer, fract(_st + vec2f(0.0, texel.y)));
  let s = hydraSampleTexture(prevBuffer, fract(_st - vec2f(0.0, texel.y)));
  let e = hydraSampleTexture(prevBuffer, fract(_st + vec2f(texel.x, 0.0)));
  let w = hydraSampleTexture(prevBuffer, fract(_st - vec2f(texel.x, 0.0)));

  let lap = abs((n.xyz + s.xyz + e.xyz + w.xyz) - center.xyz * vec3f(4.0));
  let edge = clamp(lap * vec3f(amount), vec3f(0.0), vec3f(1.0));
  let blend = clamp(mixAmount, 0.0, 1.0);
  return vec4f(mix(center.xyz, edge, vec3f(blend)), center.w);
`
  },
  {
    name: 'dilate',
    type: 'renderpass',
    inputs: [
      { type: 'float', name: 'radius', default: 1.0 }
    ],
    wgsl: `
  let texel = vec2f(
    radius / max(globals.width, 1.0),
    radius / max(globals.height, 1.0)
  );
  let c0 = hydraSampleTexture(prevBuffer, fract(_st));
  let c1 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(texel.x, 0.0)));
  let c2 = hydraSampleTexture(prevBuffer, fract(_st - vec2f(texel.x, 0.0)));
  let c3 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(0.0, texel.y)));
  let c4 = hydraSampleTexture(prevBuffer, fract(_st - vec2f(0.0, texel.y)));
  let c5 = hydraSampleTexture(prevBuffer, fract(_st + texel));
  let c6 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(-texel.x, texel.y)));
  let c7 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(texel.x, -texel.y)));
  let c8 = hydraSampleTexture(prevBuffer, fract(_st - texel));

  let maxColor = max(max(max(max(c0.xyz, c1.xyz), c2.xyz), max(c3.xyz, c4.xyz)), max(max(c5.xyz, c6.xyz), max(c7.xyz, c8.xyz)));
  let maxAlpha = max(max(max(max(c0.w, c1.w), c2.w), max(c3.w, c4.w)), max(max(c5.w, c6.w), max(c7.w, c8.w)));
  return vec4f(maxColor, maxAlpha);
`
  },
  {
    name: 'erode',
    type: 'renderpass',
    inputs: [
      { type: 'float', name: 'radius', default: 1.0 }
    ],
    wgsl: `
  let texel = vec2f(
    radius / max(globals.width, 1.0),
    radius / max(globals.height, 1.0)
  );
  let c0 = hydraSampleTexture(prevBuffer, fract(_st));
  let c1 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(texel.x, 0.0)));
  let c2 = hydraSampleTexture(prevBuffer, fract(_st - vec2f(texel.x, 0.0)));
  let c3 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(0.0, texel.y)));
  let c4 = hydraSampleTexture(prevBuffer, fract(_st - vec2f(0.0, texel.y)));
  let c5 = hydraSampleTexture(prevBuffer, fract(_st + texel));
  let c6 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(-texel.x, texel.y)));
  let c7 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(texel.x, -texel.y)));
  let c8 = hydraSampleTexture(prevBuffer, fract(_st - texel));

  let minColor = min(min(min(min(c0.xyz, c1.xyz), c2.xyz), min(c3.xyz, c4.xyz)), min(min(c5.xyz, c6.xyz), min(c7.xyz, c8.xyz)));
  let minAlpha = min(min(min(min(c0.w, c1.w), c2.w), min(c3.w, c4.w)), min(min(c5.w, c6.w), min(c7.w, c8.w)));
  return vec4f(minColor, minAlpha);
`
  },
  {
    name: 'radialBlur',
    type: 'renderpass',
    inputs: [
      { type: 'float', name: 'amount', default: 1.0 },
      { type: 'float', name: 'radius', default: 0.8 }
    ],
    wgsl: `
  let centerUv = vec2f(0.5);
  let p = _st - centerUv;
  let blurAmount = amount * smoothstep(0.0, max(radius, 0.0001), length(p));
  let theta1 = blurAmount * 0.02;
  let theta2 = theta1 * 2.0;

  let cs1 = cos(theta1);
  let sn1 = sin(theta1);
  let cs2 = cos(theta2);
  let sn2 = sin(theta2);

  let pPos1 = vec2f(cs1 * p.x - sn1 * p.y, sn1 * p.x + cs1 * p.y);
  let pNeg1 = vec2f(cs1 * p.x + sn1 * p.y, -sn1 * p.x + cs1 * p.y);
  let pPos2 = vec2f(cs2 * p.x - sn2 * p.y, sn2 * p.x + cs2 * p.y);
  let pNeg2 = vec2f(cs2 * p.x + sn2 * p.y, -sn2 * p.x + cs2 * p.y);

  let s0 = hydraSampleTexture(prevBuffer, fract(_st));
  let s1 = hydraSampleTexture(prevBuffer, fract(centerUv + pPos1));
  let s2 = hydraSampleTexture(prevBuffer, fract(centerUv + pNeg1));
  let s3 = hydraSampleTexture(prevBuffer, fract(centerUv + pPos2));
  let s4 = hydraSampleTexture(prevBuffer, fract(centerUv + pNeg2));

  return s0 * 0.3 + s1 * 0.2 + s2 * 0.2 + s3 * 0.15 + s4 * 0.15;
`
  },
  {
    name: 'zoomBlur',
    type: 'renderpass',
    inputs: [
      { type: 'float', name: 'amount', default: 0.8 },
      { type: 'float', name: 'centerX', default: 0.5 },
      { type: 'float', name: 'centerY', default: 0.5 }
    ],
    wgsl: `
  let centerUv = vec2f(centerX, centerY);
  let dir = centerUv - _st;
  let stepVec = dir * amount * 0.2;

  let s0 = hydraSampleTexture(prevBuffer, fract(_st));
  let s1 = hydraSampleTexture(prevBuffer, fract(_st + stepVec * 0.25));
  let s2 = hydraSampleTexture(prevBuffer, fract(_st + stepVec * 0.5));
  let s3 = hydraSampleTexture(prevBuffer, fract(_st + stepVec * 0.75));
  let s4 = hydraSampleTexture(prevBuffer, fract(_st + stepVec * 1.0));
  let s5 = hydraSampleTexture(prevBuffer, fract(_st + stepVec * 1.25));

  return (s0 * 0.25) + (s1 * 0.2) + (s2 * 0.18) + (s3 * 0.15) + (s4 * 0.12) + (s5 * 0.1);
`
  },
  {
    name: 'dualKawaseBlur',
    type: 'renderpass',
    inputs: [
      { type: 'float', name: 'radius', default: 1.5 },
      { type: 'float', name: 'mixAmount', default: 1.0 }
    ],
    wgsl: `
  let center = hydraSampleTexture(prevBuffer, fract(_st));
  let texel = vec2f(
    radius / max(globals.width, 1.0),
    radius / max(globals.height, 1.0)
  );
  let halfTexel = texel * 0.5;

  let d0 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(-halfTexel.x, -halfTexel.y)));
  let d1 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(halfTexel.x, -halfTexel.y)));
  let d2 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(-halfTexel.x, halfTexel.y)));
  let d3 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(halfTexel.x, halfTexel.y)));

  let a0 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(-texel.x, 0.0)));
  let a1 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(texel.x, 0.0)));
  let a2 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(0.0, -texel.y)));
  let a3 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(0.0, texel.y)));

  let blur = center * 0.2 + (d0 + d1 + d2 + d3) * 0.15 + (a0 + a1 + a2 + a3) * 0.05;
  let blend = clamp(mixAmount, 0.0, 1.0);
  return vec4f(center.xyz * (1.0 - blend) + blur.xyz * blend, center.w);
`
  },
  {
    name: 'dualKawaseBloom',
    type: 'renderpass',
    inputs: [
      { type: 'float', name: 'amount', default: 0.8 },
      { type: 'float', name: 'radius', default: 1.0 },
      { type: 'float', name: 'threshold', default: 0.6 },
      { type: 'float', name: 'softness', default: 0.1 }
    ],
    wgsl: `
  let center = hydraSampleTexture(prevBuffer, fract(_st));
  let texel = vec2f(
    radius / max(globals.width, 1.0),
    radius / max(globals.height, 1.0)
  );
  let halfTexel = texel * 0.5;
  let knee = max(softness, 0.0001);

  let d0 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(-halfTexel.x, -halfTexel.y)));
  let d1 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(halfTexel.x, -halfTexel.y)));
  let d2 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(-halfTexel.x, halfTexel.y)));
  let d3 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(halfTexel.x, halfTexel.y)));

  let a0 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(-texel.x, 0.0)));
  let a1 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(texel.x, 0.0)));
  let a2 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(0.0, -texel.y)));
  let a3 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(0.0, texel.y)));

  let g0 = d0.xyz * smoothstep(threshold - knee, threshold + knee, hydraLuminance(d0.xyz));
  let g1 = d1.xyz * smoothstep(threshold - knee, threshold + knee, hydraLuminance(d1.xyz));
  let g2 = d2.xyz * smoothstep(threshold - knee, threshold + knee, hydraLuminance(d2.xyz));
  let g3 = d3.xyz * smoothstep(threshold - knee, threshold + knee, hydraLuminance(d3.xyz));
  let g4 = a0.xyz * smoothstep(threshold - knee, threshold + knee, hydraLuminance(a0.xyz));
  let g5 = a1.xyz * smoothstep(threshold - knee, threshold + knee, hydraLuminance(a1.xyz));
  let g6 = a2.xyz * smoothstep(threshold - knee, threshold + knee, hydraLuminance(a2.xyz));
  let g7 = a3.xyz * smoothstep(threshold - knee, threshold + knee, hydraLuminance(a3.xyz));
  let gCenter = center.xyz * smoothstep(threshold - knee, threshold + knee, hydraLuminance(center.xyz));

  let glow = gCenter * 0.2 + (g0 + g1 + g2 + g3) * 0.15 + (g4 + g5 + g6 + g7) * 0.05;
  return vec4f(center.xyz + glow * amount, center.w);
`
  },
  {
    name: 'toneMap',
    type: 'color',
    inputs: [
      { type: 'float', name: 'whitePoint', default: 1.0 },
      { type: 'float', name: 'gamma', default: 2.2 }
    ],
    wgsl: `
  let wp = max(whitePoint, 0.0001);
  let mapped = (_c0.xyz * (vec3f(1.0) + _c0.xyz / vec3f(wp * wp))) / (vec3f(1.0) + _c0.xyz);
  let corrected = pow(max(mapped, vec3f(0.0)), vec3f(1.0 / max(gamma, 0.0001)));
  return vec4f(clamp(corrected, vec3f(0.0), vec3f(1.0)), _c0.w);
`
  },
  {
    name: 'exposure',
    type: 'color',
    inputs: [
      { type: 'float', name: 'amount', default: 0.0 }
    ],
    wgsl: `
  let scale = exp2(amount);
  return vec4f(_c0.xyz * scale, _c0.w);
`
  },
  {
    name: 'prev',
    type: 'src',
    inputs: [],
    wgsl: `
  return hydraSampleTexture(prevBuffer, fract(_st));
`
  },
  {
    name: 'prevN',
    type: 'src',
    inputs: [
      { type: 'sampler2D', name: 'historyTex', default: { historyOffset: 1 } }
    ],
    wgsl: `
  return hydraSampleTexture(historyTex, fract(_st));
`
  },
  {
    name: 'r',
    type: 'color',
    inputs: [
      { type: 'float', name: 'scale', default: 1 },
      { type: 'float', name: 'offset', default: 0 }
    ],
    wgsl: `
  return vec4f(_c0.x * scale + offset);
`
  },
  {
    name: 'g',
    type: 'color',
    inputs: [
      { type: 'float', name: 'scale', default: 1 },
      { type: 'float', name: 'offset', default: 0 }
    ],
    wgsl: `
  return vec4f(_c0.y * scale + offset);
`
  },
  {
    name: 'b',
    type: 'color',
    inputs: [
      { type: 'float', name: 'scale', default: 1 },
      { type: 'float', name: 'offset', default: 0 }
    ],
    wgsl: `
  return vec4f(_c0.z * scale + offset);
`
  },
  {
    name: 'a',
    type: 'color',
    inputs: [
      { type: 'float', name: 'scale', default: 1 },
      { type: 'float', name: 'offset', default: 0 }
    ],
    wgsl: `
  return vec4f(_c0.w * scale + offset);
`
  }
]

