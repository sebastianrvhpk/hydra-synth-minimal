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
  let r = sin((_st.x - offset / frequency + globals.time * sync) * frequency) * 0.5 + 0.5;
  let g = sin((_st.x + globals.time * sync) * frequency) * 0.5 + 0.5;
  let b = sin((_st.x + offset / frequency + globals.time * sync) * frequency) * 0.5 + 0.5;
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
  let r = (2.0 * 3.1416) / sides;
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
  xy *= vec2f(1.0) / vec2f(amount * xMult, amount * yMult);
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
  let xy = vec2f(pixelX, pixelY);
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
  var c2 = pow(_c0, vec4f(gamma));
  c2 *= vec4f(bins);
  c2 = floor(c2);
  c2 /= vec4f(bins);
  c2 = pow(c2, vec4f(1.0 / gamma));
  return vec4f(c2.xyz, _c0.w);
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
  st.x += step(1.0, hydraMod(st.y, 2.0)) + _c0.x * offsetX;
  st.y += step(1.0, hydraMod(st.x, 2.0)) + _c0.y * offsetY;
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
  st.y += step(1.0, hydraMod(st.x, 2.0)) + _c0.x * offset;
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
  st.x += step(1.0, hydraMod(st.y, 2.0)) + _c0.x * offset;
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
  a = hydraMod(a, pi / nSides);
  a = abs(a - pi / nSides / 2.0);
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
  a = hydraMod(a, pi / nSides);
  a = abs(a - pi / nSides / 2.0);
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
  xy *= vec2f(1.0) / vec2f(offset + multiple * _c0.x, offset + multiple * _c0.y);
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
  let xy = vec2f(offset + _c0.x * multiple, offset + _c0.y * multiple);
  return (floor(_st * xy) + 0.5) / xy;
`
  },
  {
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
    name: 'modulateHue',
    type: 'combineCoord',
    inputs: [
      { type: 'float', name: 'amount', default: 1 }
    ],
    wgsl: `
  let resolution = vec2f(globals.width, globals.height);
  return _st + (vec2f(_c0.y - _c0.x, _c0.z - _c0.y) * amount * (1.0 / resolution));
`
  },
  {
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
  let c0 = hydraSampleTexture(prevBuffer, fract(_st - offset));
  let c1 = hydraSampleTexture(prevBuffer, fract(_st));
  let c2 = hydraSampleTexture(prevBuffer, fract(_st + offset));
  return c0 * 0.25 + c1 * 0.5 + c2 * 0.25;
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
  let c0 = hydraSampleTexture(prevBuffer, fract(_st - offset));
  let c1 = hydraSampleTexture(prevBuffer, fract(_st));
  let c2 = hydraSampleTexture(prevBuffer, fract(_st + offset));
  return c0 * 0.25 + c1 * 0.5 + c2 * 0.25;
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

  let c00 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(-stepX, -stepY)));
  let c10 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(0.0, -stepY)));
  let c20 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(stepX, -stepY)));
  let c01 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(-stepX, 0.0)));
  let c11 = hydraSampleTexture(prevBuffer, fract(_st));
  let c21 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(stepX, 0.0)));
  let c02 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(-stepX, stepY)));
  let c12 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(0.0, stepY)));
  let c22 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(stepX, stepY)));

  return (
    c00 + c20 + c02 + c22 +
    (c10 + c01 + c21 + c12) * 2.0 +
    c11 * 4.0
  ) / 16.0;
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
  let knee = max(softness, 0.0001);

  let s00 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(-stepSize.x, -stepSize.y)));
  let s10 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(0.0, -stepSize.y)));
  let s20 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(stepSize.x, -stepSize.y)));
  let s01 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(-stepSize.x, 0.0)));
  let s11 = center;
  let s21 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(stepSize.x, 0.0)));
  let s02 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(-stepSize.x, stepSize.y)));
  let s12 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(0.0, stepSize.y)));
  let s22 = hydraSampleTexture(prevBuffer, fract(_st + vec2f(stepSize.x, stepSize.y)));

  let b00 = s00.xyz * smoothstep(threshold - knee, threshold + knee, hydraLuminance(s00.xyz));
  let b10 = s10.xyz * smoothstep(threshold - knee, threshold + knee, hydraLuminance(s10.xyz));
  let b20 = s20.xyz * smoothstep(threshold - knee, threshold + knee, hydraLuminance(s20.xyz));
  let b01 = s01.xyz * smoothstep(threshold - knee, threshold + knee, hydraLuminance(s01.xyz));
  let b11 = s11.xyz * smoothstep(threshold - knee, threshold + knee, hydraLuminance(s11.xyz));
  let b21 = s21.xyz * smoothstep(threshold - knee, threshold + knee, hydraLuminance(s21.xyz));
  let b02 = s02.xyz * smoothstep(threshold - knee, threshold + knee, hydraLuminance(s02.xyz));
  let b12 = s12.xyz * smoothstep(threshold - knee, threshold + knee, hydraLuminance(s12.xyz));
  let b22 = s22.xyz * smoothstep(threshold - knee, threshold + knee, hydraLuminance(s22.xyz));

  let glow = (
    b00 + b20 + b02 + b22 +
    (b10 + b01 + b21 + b12) * 2.0 +
    b11 * 4.0
  ) / 16.0;

  return vec4f(center.xyz + glow * amount, center.w);
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

  let gx = (l20 + 2.0 * l21 + l22) - (l00 + 2.0 * l01 + l02);
  let gy = (l02 + 2.0 * l12 + l22) - (l00 + 2.0 * l10 + l20);
  let edge = clamp(length(vec2f(gx, gy)) * amount, 0.0, 1.0);
  let edgeColor = vec3f(edge);
  let blend = clamp(mixAmount, 0.0, 1.0);

  return vec4f(center.xyz * (1.0 - blend) + edgeColor * blend, center.w);
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
