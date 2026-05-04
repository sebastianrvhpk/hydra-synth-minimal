/*
 * hydra-webgpu-v0.js
 * Portable one-file snapshot of the current hydra-synth WebGPU backend.
 * Generated from packages/synth/src/index.ts.
 * License: AGPL-3.0-or-later
 */
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var __DataStream_instances, isTupleType_fn, _a, _type, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _A, _B, _C, _D, _E, _F, _G, _H, _I, _J, _K, _L, _M, _N, _O, _P, _Q, _R, _S, _T, _U, _V, _W, _X, _Y, _Z, __, _$, _aa, _ba, _ca, _da, _ea, _fa, _ga, _ha, _ia, _ja, _ka, _la, _ma, _na, _oa, _pa, _qa, _ra, _sa, _ta, _ua, _va, _wa, _xa, _ya, _za, _Aa, _Ba, _Ca, _Da, _Ea, _Fa, _Ga, _Ha, _Ia, _Ja, _Ka, _La, _Ma, _Na, _Oa, _Pa, _Qa, _Ra, _Sa, _Ta, _Ua, _Va, _Wa, _Xa, _Ya, _Za, __a, _$a, _ab, _bb, _cb, _db, _eb, _fb, _gb, _hb, _ib, _jb, _kb, _lb, _mb, _nb, _ob, _pb, _qb, _rb, _sb, _tb, _ub, _vb, _wb, _xb, _yb, _zb, _Ab, _Bb, _Cb, _Db, _Eb, _Fb, _Gb, _Hb, _Ib, _Jb, _Kb, _Lb, _Mb, _Nb, _Ob, _Pb, _Qb, _Rb, _Sb, _Tb, _Ub, _Vb, _Wb, _Xb, _Yb, _Zb, __b, _$b, _ac, _bc, _cc, _dc, _ec, _fc, _gc, _hc, _ic, _jc, _kc, _lc, _mc, _nc, _oc, _pc, _qc, _rc, _sc, _tc, _uc, _vc, _wc, _xc, _yc, _zc, _Ac, _Bc, _Cc, _Dc, _Ec, _Fc, _Gc, _Hc, _Ic, _Jc, _Kc, _Lc, _Mc, _Nc, _Oc, _Pc, _Qc, _Rc, _Sc, _Tc, _Uc, _Vc, _Wc, _Xc, _Yc, _Zc, __c, _$c, _ad, _bd, _cd, _dd, _ed, _fd, _gd, _hd, _id, _jd, _kd, _ld, _md, _nd, _od, _pd, _qd, _rd, _sd, _td, _ud, _vd, _wd, _xd, _yd, _zd, _Ad, _Bd, _Cd, _Dd, _Ed, _Fd, _Gd, _Hd, _Id, _Jd, _Kd, _Ld, _Md, _Nd, _Od, _Pd, _Qd, _Rd, _Sd, _Td, _Ud, _Vd, _Wd, _Xd, _Yd, _Zd, __d, _$d, _ae, _be, _ce, _de, _ee, _fe, _ge, _he, _ie, _je, _ke;
const createHydraEngineError = (type, message, context, cause) => ({
  type,
  message,
  context,
  cause,
  timestamp: Date.now()
});
class HydraEngineFailure extends Error {
  envelope;
  constructor(envelope) {
    super(envelope.message);
    this.name = "HydraEngineFailure";
    this.envelope = envelope;
  }
}
const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 720;
const DEFAULT_BPM = 30;
const DEFAULT_SPEED = 1;
const DEFAULT_DELTA_MS = 16;
const normalizeFiniteNumber = (value, fallback, label) => {
  if (typeof value !== "number") return fallback;
  if (!Number.isFinite(value)) {
    throw new Error(`HydraEngine: ${label} must be a finite number.`);
  }
  return value;
};
const normalizePositiveFiniteNumber = (value, fallback, label) => {
  if (typeof value !== "number") return fallback;
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`HydraEngine: ${label} must be a finite number greater than 0.`);
  }
  return value;
};
const normalizeOptionalPositiveFiniteNumber = (value, label) => {
  if (typeof value === "undefined" || value === null) return void 0;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`HydraEngine: ${label} must be undefined or a finite number greater than 0.`);
  }
  return value;
};
const normalizePositiveInteger = (value, fallback, label) => {
  if (typeof value !== "number") return fallback;
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`HydraEngine: ${label} must be a finite number greater than 0.`);
  }
  return Math.max(1, Math.floor(value));
};
const coerceFiniteNumber = (value, fallback) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const coercePositiveFiniteNumber = (value, fallback) => typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
const coerceOptionalPositiveFiniteNumber = (value, fallback) => {
  if (typeof value === "undefined" || value === null) return void 0;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  return fallback;
};
const coercePositiveInteger = (value, fallback) => typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.max(1, Math.floor(value)) : fallback;
class HydraEngine {
  renderer;
  sources;
  updateCallback;
  afterUpdateCallback;
  onErrorCallback;
  errorPolicy;
  bindings;
  errorListeners = /* @__PURE__ */ new Set();
  disposables = /* @__PURE__ */ new Set();
  plugins = /* @__PURE__ */ new Set();
  frameState;
  initPromise = null;
  initError = null;
  initialized = false;
  disposed = false;
  timeSinceLastUpdate = 0;
  speed;
  fps;
  constructor(options) {
    this.renderer = options.renderer;
    this.sources = options.sources ?? [];
    this.updateCallback = options.update ?? (() => {
    });
    this.afterUpdateCallback = options.afterUpdate ?? (() => {
    });
    this.onErrorCallback = options.onError;
    this.errorPolicy = options.errorPolicy ?? "emit";
    const width = normalizePositiveInteger(options.width, DEFAULT_WIDTH, "width");
    const height = normalizePositiveInteger(options.height, DEFAULT_HEIGHT, "height");
    const bpm = normalizePositiveFiniteNumber(options.bpm, DEFAULT_BPM, "bpm");
    this.speed = normalizeFiniteNumber(options.speed, DEFAULT_SPEED, "speed");
    this.fps = normalizeOptionalPositiveFiniteNumber(options.fps, "fps");
    this.frameState = {
      time: 0,
      bpm,
      resolution: [width, height],
      deltaMs: 0
    };
    this.bindings = {
      time: 0,
      bpm,
      width,
      height,
      speed: this.speed,
      fps: this.fps,
      update: this.updateCallback,
      afterUpdate: this.afterUpdateCallback,
      ...options.initialBindings
    };
    if (typeof this.bindings.update === "function") {
      this.updateCallback = this.bindings.update;
    }
    if (typeof this.bindings.afterUpdate === "function") {
      this.afterUpdateCallback = this.bindings.afterUpdate;
    }
    this.addDisposable(this.renderer);
    for (const source of this.sources) this.addDisposable(source);
  }
  get isDisposed() {
    return this.disposed;
  }
  get isInitialized() {
    return this.initialized;
  }
  init() {
    if (this.disposed) return;
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.renderer.init().then(() => {
      this.initialized = true;
    }).catch((error) => {
      try {
        const envelope = this.handleError("init", "Renderer init failed", { stage: "renderer.init" }, error);
        this.initError = envelope;
        throw new HydraEngineFailure(envelope);
      } catch (raised) {
        if (raised instanceof HydraEngineFailure) this.initError = raised.envelope;
        throw raised;
      }
    });
    return this.initPromise;
  }
  reportCompileError(transformName, cause) {
    this.handleError(
      "compile",
      `Transform compile failed: ${transformName}`,
      { stage: "transform.compile", transformName },
      cause
    );
  }
  tick(deltaMs = DEFAULT_DELTA_MS) {
    if (this.disposed || !this.initialized || this.initError) return 0;
    this.pullBindingOverrides();
    const safeDeltaMs = typeof deltaMs === "number" && Number.isFinite(deltaMs) && deltaMs >= 0 ? deltaMs : DEFAULT_DELTA_MS;
    this.frameState.time += safeDeltaMs * 1e-3 * this.speed;
    this.timeSinceLastUpdate += safeDeltaMs;
    const fps = this.fps;
    const framePeriod = fps ? 1e3 / fps : 0;
    if (fps && this.timeSinceLastUpdate < framePeriod) return 0;
    const elapsed = this.timeSinceLastUpdate || safeDeltaMs;
    this.timeSinceLastUpdate = fps ? this.timeSinceLastUpdate % framePeriod : 0;
    this.frameState.deltaMs = elapsed;
    this.syncBindings();
    this.callRuntimeCallback("update", this.updateCallback, elapsed);
    for (let index = 0; index < this.sources.length; index += 1) {
      const source = this.sources[index];
      try {
        source.tick(this.frameState);
      } catch (error) {
        this.handleError("runtime", "Source tick failed", { stage: "source.tick", sourceIndex: index }, error);
      }
    }
    try {
      const frameHandle = this.renderer.beginFrame(this.frameState);
      this.renderer.renderFrame(frameHandle, this.frameState);
      this.renderer.submitFrame(frameHandle);
    } catch (error) {
      this.handleError("runtime", "Renderer frame failed", { stage: "renderer.frame" }, error);
    }
    this.callRuntimeCallback("afterUpdate", this.afterUpdateCallback, elapsed);
    return elapsed;
  }
  getBindings() {
    return this.bindings;
  }
  setBinding(name, value) {
    if (this.disposed) return;
    if (name === "speed") {
      this.speed = coerceFiniteNumber(value, this.speed);
      this.bindings.speed = this.speed;
      return;
    }
    if (name === "fps") {
      this.fps = coerceOptionalPositiveFiniteNumber(value, this.fps);
      this.bindings.fps = this.fps;
      return;
    }
    if (name === "update") {
      this.updateCallback = typeof value === "function" ? value : () => {
      };
      this.bindings.update = this.updateCallback;
      return;
    }
    if (name === "afterUpdate") {
      this.afterUpdateCallback = typeof value === "function" ? value : () => {
      };
      this.bindings.afterUpdate = this.afterUpdateCallback;
      return;
    }
    if (name === "bpm") {
      this.frameState.bpm = coercePositiveFiniteNumber(value, this.frameState.bpm);
      this.bindings.bpm = this.frameState.bpm;
      return;
    }
    if (name === "width") {
      const nextWidth = coercePositiveInteger(value, this.frameState.resolution[0]);
      this.frameState.resolution[0] = nextWidth;
      this.bindings.width = nextWidth;
      return;
    }
    if (name === "height") {
      const nextHeight = coercePositiveInteger(value, this.frameState.resolution[1]);
      this.frameState.resolution[1] = nextHeight;
      this.bindings.height = nextHeight;
      return;
    }
    this.bindings[name] = value;
  }
  setResolution(width, height) {
    if (this.disposed) return;
    const nextWidth = coercePositiveInteger(width, this.frameState.resolution[0]);
    const nextHeight = coercePositiveInteger(height, this.frameState.resolution[1]);
    this.frameState.resolution[0] = nextWidth;
    this.frameState.resolution[1] = nextHeight;
    this.bindings.width = nextWidth;
    this.bindings.height = nextHeight;
    this.renderer.setResolution?.(nextWidth, nextHeight);
  }
  addSource(source) {
    if (this.disposed) return () => {
    };
    this.sources.push(source);
    const removeDisposable = this.addDisposable(source);
    let removed = false;
    return () => {
      if (removed) return;
      removed = true;
      const index = this.sources.indexOf(source);
      if (index >= 0) this.sources.splice(index, 1);
      removeDisposable();
    };
  }
  attachPlugin(plugin) {
    if (this.disposed) return () => {
    };
    this.plugins.add(plugin);
    plugin.attach(this);
    let detached = false;
    const detach = () => {
      if (detached) return;
      detached = true;
      if (this.plugins.delete(plugin)) {
        plugin.dispose();
      }
    };
    this.disposables.add({ dispose: detach });
    return detach;
  }
  onError(listener) {
    this.errorListeners.add(listener);
    return () => {
      this.errorListeners.delete(listener);
    };
  }
  addDisposable(candidate) {
    if (this.disposed) return () => {
    };
    let done = false;
    const disposable = {
      dispose: () => {
        if (done) return;
        done = true;
        if (typeof candidate === "function") candidate();
        else candidate.dispose();
      }
    };
    this.disposables.add(disposable);
    return () => {
      if (!this.disposables.has(disposable)) return;
      this.disposables.delete(disposable);
      disposable.dispose();
    };
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    const disposables = Array.from(this.disposables);
    this.disposables.clear();
    for (const disposable of disposables.reverse()) {
      try {
        disposable.dispose();
      } catch (error) {
        this.handleError("runtime", "Dispose failed", { stage: "dispose" }, error);
      }
    }
  }
  callRuntimeCallback(stage, callback, elapsed) {
    try {
      callback(elapsed);
    } catch (error) {
      this.handleError("runtime", `Runtime callback failed: ${stage}`, { stage }, error);
    }
  }
  syncBindings() {
    this.bindings.time = this.frameState.time;
    this.bindings.bpm = this.frameState.bpm;
    this.bindings.width = this.frameState.resolution[0];
    this.bindings.height = this.frameState.resolution[1];
    this.bindings.speed = this.speed;
    this.bindings.fps = this.fps;
  }
  pullBindingOverrides() {
    this.speed = coerceFiniteNumber(this.bindings.speed, this.speed);
    this.bindings.speed = this.speed;
    this.fps = coerceOptionalPositiveFiniteNumber(this.bindings.fps, this.fps);
    this.bindings.fps = this.fps;
    this.frameState.bpm = coercePositiveFiniteNumber(this.bindings.bpm, this.frameState.bpm);
    this.bindings.bpm = this.frameState.bpm;
    if (typeof this.bindings.update === "function") {
      this.updateCallback = this.bindings.update;
    }
    if (typeof this.bindings.afterUpdate === "function") {
      this.afterUpdateCallback = this.bindings.afterUpdate;
    }
  }
  handleError(type, message, context, cause) {
    const envelope = createHydraEngineError(type, message, context, cause);
    if (this.onErrorCallback) this.onErrorCallback(envelope);
    for (const listener of this.errorListeners) listener(envelope);
    if (this.errorPolicy === "throw") throw new HydraEngineFailure(envelope);
    return envelope;
  }
}
const getDefaultTransforms = () => [
  {
    name: "noise",
    type: "src",
    inputs: [
      { type: "float", name: "scale", default: 10 },
      { type: "float", name: "offset", default: 0.1 }
    ],
    wgsl: `
  return vec4f(vec3f(hydraNoise(vec3f(_st * scale, offset * globals.time))), 1.0);
`
  },
  {
    name: "noiseLoop",
    type: "src",
    inputs: [
      { type: "float", name: "scale", default: 10 },
      { type: "float", name: "speed", default: 0.1 },
      { type: "float", name: "radius", default: 1 }
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
    name: "fbm",
    type: "src",
    inputs: [
      { type: "float", name: "scale", default: 4 },
      { type: "float", name: "speed", default: 0.1 },
      { type: "float", name: "octaves", default: 5 },
      { type: "float", name: "lacunarity", default: 2 },
      { type: "float", name: "gain", default: 0.5 }
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
    name: "ridged",
    type: "src",
    inputs: [
      { type: "float", name: "scale", default: 4 },
      { type: "float", name: "speed", default: 0.1 },
      { type: "float", name: "octaves", default: 5 },
      { type: "float", name: "lacunarity", default: 2 },
      { type: "float", name: "gain", default: 0.55 }
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
    name: "turbulence",
    type: "src",
    inputs: [
      { type: "float", name: "scale", default: 4 },
      { type: "float", name: "speed", default: 0.1 },
      { type: "float", name: "octaves", default: 5 },
      { type: "float", name: "lacunarity", default: 2 },
      { type: "float", name: "gain", default: 0.5 }
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
    name: "voronoi",
    type: "src",
    inputs: [
      { type: "float", name: "scale", default: 5 },
      { type: "float", name: "speed", default: 0.3 },
      { type: "float", name: "blending", default: 0.3 }
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
    name: "osc",
    type: "src",
    inputs: [
      { type: "float", name: "frequency", default: 60 },
      { type: "float", name: "sync", default: 0.1 },
      { type: "float", name: "offset", default: 0 }
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
    name: "shape",
    type: "src",
    inputs: [
      { type: "float", name: "sides", default: 3 },
      { type: "float", name: "radius", default: 0.3 },
      { type: "float", name: "smoothing", default: 0.01 }
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
    name: "gradient",
    type: "src",
    inputs: [
      { type: "float", name: "speed", default: 0 }
    ],
    wgsl: `
  return vec4f(_st, sin(globals.time * speed), 1.0);
`
  },
  {
    name: "src",
    type: "src",
    inputs: [
      { type: "sampler2D", name: "tex", default: NaN }
    ],
    wgsl: `
  return hydraSampleTexture(tex, fract(_st));
`
  },
  {
    name: "solid",
    type: "src",
    inputs: [
      { type: "float", name: "r", default: 0 },
      { type: "float", name: "g", default: 0 },
      { type: "float", name: "b", default: 0 },
      { type: "float", name: "a", default: 1 }
    ],
    wgsl: `
  return vec4f(r, g, b, a);
`
  },
  {
    name: "rotate",
    type: "coord",
    inputs: [
      { type: "float", name: "angle", default: 10 },
      { type: "float", name: "speed", default: 0 }
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
    name: "scale",
    type: "coord",
    inputs: [
      { type: "float", name: "amount", default: 1.5 },
      { type: "float", name: "xMult", default: 1 },
      { type: "float", name: "yMult", default: 1 },
      { type: "float", name: "offsetX", default: 0.5 },
      { type: "float", name: "offsetY", default: 0.5 }
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
    name: "pixelate",
    type: "coord",
    inputs: [
      { type: "float", name: "pixelX", default: 20 },
      { type: "float", name: "pixelY", default: 20 }
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
    name: "posterize",
    type: "color",
    inputs: [
      { type: "float", name: "bins", default: 3 },
      { type: "float", name: "gamma", default: 0.6 }
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
    name: "shift",
    type: "color",
    inputs: [
      { type: "float", name: "r", default: 0.5 },
      { type: "float", name: "g", default: 0 },
      { type: "float", name: "b", default: 0 },
      { type: "float", name: "a", default: 0 }
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
    name: "repeat",
    type: "coord",
    inputs: [
      { type: "float", name: "repeatX", default: 3 },
      { type: "float", name: "repeatY", default: 3 },
      { type: "float", name: "offsetX", default: 0 },
      { type: "float", name: "offsetY", default: 0 }
    ],
    wgsl: `
  var st = _st * vec2f(repeatX, repeatY);
  st.x += step(1.0, hydraMod(st.y, 2.0)) * offsetX;
  st.y += step(1.0, hydraMod(st.x, 2.0)) * offsetY;
  return fract(st);
`
  },
  {
    name: "modulateRepeat",
    type: "combineCoord",
    inputs: [
      { type: "float", name: "repeatX", default: 3 },
      { type: "float", name: "repeatY", default: 3 },
      { type: "float", name: "offsetX", default: 0.5 },
      { type: "float", name: "offsetY", default: 0.5 }
    ],
    wgsl: `
  var st = _st * vec2f(repeatX, repeatY);
  st.x += step(1.0, hydraMod(st.y, 2.0)) * offsetX + _c0.x * offsetX;
  st.y += step(1.0, hydraMod(st.x, 2.0)) * offsetY + _c0.y * offsetY;
  return fract(st);
`
  },
  {
    name: "repeatX",
    type: "coord",
    inputs: [
      { type: "float", name: "reps", default: 3 },
      { type: "float", name: "offset", default: 0 }
    ],
    wgsl: `
  var st = _st * vec2f(reps, 1.0);
  st.y += step(1.0, hydraMod(st.x, 2.0)) * offset;
  return fract(st);
`
  },
  {
    name: "modulateRepeatX",
    type: "combineCoord",
    inputs: [
      { type: "float", name: "reps", default: 3 },
      { type: "float", name: "offset", default: 0.5 }
    ],
    wgsl: `
  var st = _st * vec2f(reps, 1.0);
  st.y += step(1.0, hydraMod(st.x, 2.0)) * offset + _c0.x * offset;
  return fract(st);
`
  },
  {
    name: "repeatY",
    type: "coord",
    inputs: [
      { type: "float", name: "reps", default: 3 },
      { type: "float", name: "offset", default: 0 }
    ],
    wgsl: `
  var st = _st * vec2f(1.0, reps);
  st.x += step(1.0, hydraMod(st.y, 2.0)) * offset;
  return fract(st);
`
  },
  {
    name: "modulateRepeatY",
    type: "combineCoord",
    inputs: [
      { type: "float", name: "reps", default: 3 },
      { type: "float", name: "offset", default: 0.5 }
    ],
    wgsl: `
  var st = _st * vec2f(1.0, reps);
  st.x += step(1.0, hydraMod(st.y, 2.0)) * offset + _c0.x * offset;
  return fract(st);
`
  },
  {
    name: "kaleid",
    type: "coord",
    inputs: [
      { type: "float", name: "nSides", default: 4 }
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
    name: "modulateKaleid",
    type: "combineCoord",
    inputs: [
      { type: "float", name: "nSides", default: 4 }
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
    name: "scroll",
    type: "coord",
    inputs: [
      { type: "float", name: "scrollX", default: 0.5 },
      { type: "float", name: "scrollY", default: 0.5 },
      { type: "float", name: "speedX", default: 0 },
      { type: "float", name: "speedY", default: 0 }
    ],
    wgsl: `
  var st = _st;
  st.x += scrollX + globals.time * speedX;
  st.y += scrollY + globals.time * speedY;
  return fract(st);
`
  },
  {
    name: "scrollX",
    type: "coord",
    inputs: [
      { type: "float", name: "scrollX", default: 0.5 },
      { type: "float", name: "speed", default: 0 }
    ],
    wgsl: `
  var st = _st;
  st.x += scrollX + globals.time * speed;
  return fract(st);
`
  },
  {
    name: "scrollY",
    type: "coord",
    inputs: [
      { type: "float", name: "scrollY", default: 0.5 },
      { type: "float", name: "speed", default: 0 }
    ],
    wgsl: `
  var st = _st;
  st.y += scrollY + globals.time * speed;
  return fract(st);
`
  },
  {
    // Syntactic sugar: modulate(tex.mask(tex.color(1,0)), scrollX).scrollX(0, speed)
    name: "modulateScrollX",
    type: "combineCoord",
    inputs: [
      { type: "float", name: "scrollX", default: 0.5 },
      { type: "float", name: "speed", default: 0 }
    ],
    wgsl: `
  var st = _st;
  st.x += _c0.x * scrollX + globals.time * speed;
  return fract(st);
`
  },
  {
    // Syntactic sugar: modulate(tex.mask(tex.color(1,0)), scrollX).scrollX(0, speed)
    name: "modulateScrollY",
    type: "combineCoord",
    inputs: [
      { type: "float", name: "scrollY", default: 0.5 },
      { type: "float", name: "speed", default: 0 }
    ],
    wgsl: `
  var st = _st;
  st.y += _c0.x * scrollY + globals.time * speed;
  return fract(st);
`
  },
  {
    name: "add",
    type: "combine",
    inputs: [
      { type: "float", name: "amount", default: 1 }
    ],
    wgsl: `
  return (_c0 + _c1) * amount + _c0 * (1.0 - amount);
`
  },
  {
    name: "sub",
    type: "combine",
    inputs: [
      { type: "float", name: "amount", default: 1 }
    ],
    wgsl: `
  return (_c0 - _c1) * amount + _c0 * (1.0 - amount);
`
  },
  {
    name: "layer",
    type: "combine",
    inputs: [],
    wgsl: `
  return vec4f(mix(_c0.xyz, _c1.xyz, _c1.w), clamp(_c0.w + _c1.w, 0.0, 1.0));
`
  },
  {
    name: "blend",
    type: "combine",
    inputs: [
      { type: "float", name: "amount", default: 0.5 }
    ],
    wgsl: `
  return _c0 * (1.0 - amount) + _c1 * amount;
`
  },
  {
    name: "screen",
    type: "combine",
    inputs: [
      { type: "float", name: "amount", default: 1 }
    ],
    wgsl: `
  let blended = vec3f(1.0) - (vec3f(1.0) - _c0.xyz) * (vec3f(1.0) - _c1.xyz);
  let mixed = mix(_c0.xyz, blended, vec3f(clamp(amount, 0.0, 1.0)));
  return vec4f(mixed, max(_c0.w, _c1.w));
`
  },
  {
    name: "overlay",
    type: "combine",
    inputs: [
      { type: "float", name: "amount", default: 1 }
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
    name: "softLight",
    type: "combine",
    inputs: [
      { type: "float", name: "amount", default: 1 }
    ],
    wgsl: `
  let blended = (vec3f(1.0) - 2.0 * _c1.xyz) * (_c0.xyz * _c0.xyz) + 2.0 * _c1.xyz * _c0.xyz;
  let mixed = mix(_c0.xyz, blended, vec3f(clamp(amount, 0.0, 1.0)));
  return vec4f(clamp(mixed, vec3f(0.0), vec3f(1.0)), max(_c0.w, _c1.w));
`
  },
  {
    name: "hardLight",
    type: "combine",
    inputs: [
      { type: "float", name: "amount", default: 1 }
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
    name: "colorDodge",
    type: "combine",
    inputs: [
      { type: "float", name: "amount", default: 1 }
    ],
    wgsl: `
  let denom = max(vec3f(0.0001), vec3f(1.0) - _c1.xyz);
  let blended = clamp(_c0.xyz / denom, vec3f(0.0), vec3f(1.0));
  let mixed = mix(_c0.xyz, blended, vec3f(clamp(amount, 0.0, 1.0)));
  return vec4f(mixed, max(_c0.w, _c1.w));
`
  },
  {
    name: "colorBurn",
    type: "combine",
    inputs: [
      { type: "float", name: "amount", default: 1 }
    ],
    wgsl: `
  let denom = max(vec3f(0.0001), _c1.xyz);
  let blended = vec3f(1.0) - clamp((vec3f(1.0) - _c0.xyz) / denom, vec3f(0.0), vec3f(1.0));
  let mixed = mix(_c0.xyz, blended, vec3f(clamp(amount, 0.0, 1.0)));
  return vec4f(clamp(mixed, vec3f(0.0), vec3f(1.0)), max(_c0.w, _c1.w));
`
  },
  {
    name: "bloomMix",
    type: "combine",
    inputs: [
      { type: "float", name: "amount", default: 0.8 }
    ],
    wgsl: `
  let mixAmount = max(amount, 0.0);
  return vec4f(_c1.xyz + _c0.xyz * mixAmount, _c1.w);
`
  },
  {
    name: "mult",
    type: "combine",
    inputs: [
      { type: "float", name: "amount", default: 1 }
    ],
    wgsl: `
  return _c0 * (1.0 - amount) + (_c0 * _c1) * amount;
`
  },
  {
    name: "diff",
    type: "combine",
    inputs: [],
    wgsl: `
  return vec4f(abs(_c0.xyz - _c1.xyz), max(_c0.w, _c1.w));
`
  },
  {
    name: "modulate",
    type: "combineCoord",
    inputs: [
      { type: "float", name: "amount", default: 0.1 }
    ],
    wgsl: `
  return _st + _c0.xy * amount;
`
  },
  {
    name: "modulateScale",
    type: "combineCoord",
    inputs: [
      { type: "float", name: "multiple", default: 1 },
      { type: "float", name: "offset", default: 1 }
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
    name: "modulatePixelate",
    type: "combineCoord",
    inputs: [
      { type: "float", name: "multiple", default: 10 },
      { type: "float", name: "offset", default: 3 }
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
    name: "modulateRotate",
    type: "combineCoord",
    inputs: [
      { type: "float", name: "multiple", default: 1 },
      { type: "float", name: "offset", default: 0 }
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
    name: "modulateHue",
    type: "combineCoord",
    inputs: [
      { type: "float", name: "amount", default: 1 }
    ],
    wgsl: `
  let resolution = vec2f(globals.width, globals.height);
  let safeResolution = max(resolution, vec2f(1.0));
  return _st + (vec2f(_c0.y - _c0.x, _c0.z - _c0.y) * amount * (1.0 / safeResolution));
`
  },
  {
    // Syntactic sugar: mult(-1).add(1)
    name: "invert",
    type: "color",
    inputs: [
      { type: "float", name: "amount", default: 1 }
    ],
    wgsl: `
  return vec4f((vec3f(1.0) - _c0.xyz) * amount + _c0.xyz * (1.0 - amount), _c0.w);
`
  },
  {
    // Syntactic sugar: sub(0.5).mult(amount).add(0.5)
    name: "contrast",
    type: "color",
    inputs: [
      { type: "float", name: "amount", default: 1.6 }
    ],
    wgsl: `
  let c = (_c0 - vec4f(0.5)) * vec4f(amount) + vec4f(0.5);
  return vec4f(c.xyz, _c0.w);
`
  },
  {
    // Syntactic sugar: add(amount)
    name: "brightness",
    type: "color",
    inputs: [
      { type: "float", name: "amount", default: 0.4 }
    ],
    wgsl: `
  return vec4f(_c0.xyz + vec3f(amount), _c0.w);
`
  },
  {
    name: "mask",
    type: "combine",
    inputs: [],
    wgsl: `
  let a = hydraLuminance(_c1.xyz);
  return vec4f(_c0.xyz * a, a * _c0.w);
`
  },
  {
    name: "luma",
    type: "color",
    inputs: [
      { type: "float", name: "threshold", default: 0.5 },
      { type: "float", name: "tolerance", default: 0.1 }
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
    name: "thresh",
    type: "color",
    inputs: [
      { type: "float", name: "threshold", default: 0.5 },
      { type: "float", name: "tolerance", default: 0.04 }
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
    name: "color",
    type: "color",
    inputs: [
      { type: "float", name: "r", default: 1 },
      { type: "float", name: "g", default: 1 },
      { type: "float", name: "b", default: 1 },
      { type: "float", name: "a", default: 1 }
    ],
    wgsl: `
  let c = vec4f(r, g, b, a);
  let pos = step(vec4f(0.0), c);
  return mix((vec4f(1.0) - _c0) * abs(c), c * _c0, pos);
`
  },
  {
    name: "saturate",
    type: "color",
    inputs: [
      { type: "float", name: "amount", default: 2 }
    ],
    wgsl: `
  let w = vec3f(0.2125, 0.7154, 0.0721);
  let intensity = vec3f(dot(_c0.xyz, w));
  return vec4f(mix(intensity, _c0.xyz, amount), _c0.w);
`
  },
  {
    name: "hue",
    type: "color",
    inputs: [
      { type: "float", name: "hue", default: 0.4 }
    ],
    wgsl: `
  var c = hydraRgbToHsv(_c0.xyz);
  c.x += hue;
  return vec4f(hydraHsvToRgb(c), _c0.w);
`
  },
  {
    name: "colorama",
    type: "color",
    inputs: [
      { type: "float", name: "amount", default: 5e-3 }
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
    name: "renderpass",
    type: "renderpass",
    inputs: [],
    wgsl: `
  return hydraSampleTexture(prevBuffer, fract(_st));
`
  },
  {
    name: "blurX",
    type: "renderpass",
    inputs: [
      { type: "float", name: "amount", default: 1 }
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
    name: "blurY",
    type: "renderpass",
    inputs: [
      { type: "float", name: "amount", default: 1 }
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
    name: "blur",
    type: "renderpass",
    inputs: [
      { type: "float", name: "amount", default: 1 }
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
    name: "blurFast",
    type: "renderpass",
    inputs: [
      { type: "float", name: "amount", default: 1 }
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
    name: "blurBilateral",
    type: "renderpass",
    inputs: [
      { type: "float", name: "radius", default: 1 },
      { type: "float", name: "sigmaColor", default: 18 }
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
    name: "bloom",
    type: "renderpass",
    inputs: [
      { type: "float", name: "amount", default: 0.8 },
      { type: "float", name: "radius", default: 1 },
      { type: "float", name: "threshold", default: 0.6 },
      { type: "float", name: "softness", default: 0.1 }
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
    name: "bloomThreshold",
    type: "renderpass",
    inputs: [
      { type: "float", name: "threshold", default: 0.6 },
      { type: "float", name: "softness", default: 0.1 }
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
    name: "bloomDownsample",
    type: "renderpass",
    inputs: [
      { type: "float", name: "radius", default: 1 }
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
    name: "bloomUpsample",
    type: "renderpass",
    inputs: [
      { type: "float", name: "radius", default: 1 },
      { type: "float", name: "boost", default: 1 }
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
    name: "sharpen",
    type: "renderpass",
    inputs: [
      { type: "float", name: "amount", default: 1 },
      { type: "float", name: "radius", default: 1 }
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
    name: "chromaticAberration",
    type: "renderpass",
    inputs: [
      { type: "float", name: "amount", default: 1.5 },
      { type: "float", name: "radial", default: 1 }
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
    name: "rgbSplit",
    type: "renderpass",
    inputs: [
      { type: "float", name: "amount", default: 1 },
      { type: "float", name: "angle", default: 0 }
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
    name: "vignette",
    type: "renderpass",
    inputs: [
      { type: "float", name: "amount", default: 0.6 },
      { type: "float", name: "radius", default: 0.9 },
      { type: "float", name: "softness", default: 0.35 }
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
    name: "filmGrain",
    type: "renderpass",
    inputs: [
      { type: "float", name: "amount", default: 0.06 },
      { type: "float", name: "speed", default: 24 },
      { type: "float", name: "colored", default: 0 }
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
    name: "dither",
    type: "renderpass",
    inputs: [
      { type: "float", name: "amount", default: 0.75 },
      { type: "float", name: "levels", default: 8 }
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
    name: "edgeDetect",
    type: "renderpass",
    inputs: [
      { type: "float", name: "amount", default: 1 },
      { type: "float", name: "mixAmount", default: 1 }
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
    name: "edgeLaplacian",
    type: "renderpass",
    inputs: [
      { type: "float", name: "amount", default: 1 },
      { type: "float", name: "mixAmount", default: 1 }
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
    name: "dilate",
    type: "renderpass",
    inputs: [
      { type: "float", name: "radius", default: 1 }
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
    name: "erode",
    type: "renderpass",
    inputs: [
      { type: "float", name: "radius", default: 1 }
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
    name: "radialBlur",
    type: "renderpass",
    inputs: [
      { type: "float", name: "amount", default: 1 },
      { type: "float", name: "radius", default: 0.8 }
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
    name: "zoomBlur",
    type: "renderpass",
    inputs: [
      { type: "float", name: "amount", default: 0.8 },
      { type: "float", name: "centerX", default: 0.5 },
      { type: "float", name: "centerY", default: 0.5 }
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
    name: "dualKawaseBlur",
    type: "renderpass",
    inputs: [
      { type: "float", name: "radius", default: 1.5 },
      { type: "float", name: "mixAmount", default: 1 }
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
    name: "dualKawaseBloom",
    type: "renderpass",
    inputs: [
      { type: "float", name: "amount", default: 0.8 },
      { type: "float", name: "radius", default: 1 },
      { type: "float", name: "threshold", default: 0.6 },
      { type: "float", name: "softness", default: 0.1 }
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
    name: "toneMap",
    type: "color",
    inputs: [
      { type: "float", name: "whitePoint", default: 1 },
      { type: "float", name: "gamma", default: 2.2 }
    ],
    wgsl: `
  let wp = max(whitePoint, 0.0001);
  let mapped = (_c0.xyz * (vec3f(1.0) + _c0.xyz / vec3f(wp * wp))) / (vec3f(1.0) + _c0.xyz);
  let corrected = pow(max(mapped, vec3f(0.0)), vec3f(1.0 / max(gamma, 0.0001)));
  return vec4f(clamp(corrected, vec3f(0.0), vec3f(1.0)), _c0.w);
`
  },
  {
    name: "exposure",
    type: "color",
    inputs: [
      { type: "float", name: "amount", default: 0 }
    ],
    wgsl: `
  let scale = exp2(amount);
  return vec4f(_c0.xyz * scale, _c0.w);
`
  },
  {
    name: "prev",
    type: "src",
    inputs: [],
    wgsl: `
  return hydraSampleTexture(prevBuffer, fract(_st));
`
  },
  {
    name: "prevN",
    type: "src",
    inputs: [
      { type: "sampler2D", name: "historyTex", default: { historyOffset: 1 } }
    ],
    wgsl: `
  return hydraSampleTexture(historyTex, fract(_st));
`
  },
  {
    name: "r",
    type: "color",
    inputs: [
      { type: "float", name: "scale", default: 1 },
      { type: "float", name: "offset", default: 0 }
    ],
    wgsl: `
  return vec4f(_c0.x * scale + offset);
`
  },
  {
    name: "g",
    type: "color",
    inputs: [
      { type: "float", name: "scale", default: 1 },
      { type: "float", name: "offset", default: 0 }
    ],
    wgsl: `
  return vec4f(_c0.y * scale + offset);
`
  },
  {
    name: "b",
    type: "color",
    inputs: [
      { type: "float", name: "scale", default: 1 },
      { type: "float", name: "offset", default: 0 }
    ],
    wgsl: `
  return vec4f(_c0.z * scale + offset);
`
  },
  {
    name: "a",
    type: "color",
    inputs: [
      { type: "float", name: "scale", default: 1 },
      { type: "float", name: "offset", default: 0 }
    ],
    wgsl: `
  return vec4f(_c0.w * scale + offset);
`
  }
];
const EASING_FUNCTIONS$1 = {
  linear: (value) => value,
  easeInQuad: (value) => value * value,
  easeOutQuad: (value) => value * (2 - value),
  easeInOutQuad: (value) => value < 0.5 ? 2 * value * value : -1 + (4 - 2 * value) * value,
  easeInCubic: (value) => value * value * value,
  easeOutCubic: (value) => {
    const t = value - 1;
    return t * t * t + 1;
  },
  easeInOutCubic: (value) => value < 0.5 ? 4 * value * value * value : (value - 1) * (2 * value - 2) * (2 * value - 2) + 1,
  easeInQuart: (value) => value * value * value * value,
  easeOutQuart: (value) => {
    const t = value - 1;
    return 1 - t * t * t * t;
  },
  easeInOutQuart: (value) => value < 0.5 ? 8 * value * value * value * value : 1 - 8 * Math.pow(value - 1, 4),
  easeInQuint: (value) => value * value * value * value * value,
  easeOutQuint: (value) => {
    const t = value - 1;
    return 1 + t * t * t * t * t;
  },
  easeInOutQuint: (value) => value < 0.5 ? 16 * Math.pow(value, 5) : 1 + 16 * Math.pow(value - 1, 5),
  sin: (value) => (1 + Math.sin(Math.PI * value - Math.PI / 2)) * 0.5
};
const modulo$1 = (value, divisor) => {
  if (!Number.isFinite(divisor) || divisor === 0) return 0;
  return (value % divisor + divisor) % divisor;
};
const toFiniteNumber$3 = (value, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return fallback;
};
const getSequenceLength = (value) => {
  const length = Number(value.length);
  if (!Number.isFinite(length) || length <= 0) return 0;
  return Math.floor(length);
};
const readSequenceValue = (sequence, index, fallback) => {
  const candidate = sequence[index];
  return toFiniteNumber$3(candidate, fallback);
};
const resolveEase = (value) => {
  if (typeof value === "function") return value;
  if (typeof value === "string" && value in EASING_FUNCTIONS$1) return EASING_FUNCTIONS$1[value];
  return EASING_FUNCTIONS$1.linear;
};
const sequenceFrameCache = /* @__PURE__ */ new WeakMap();
const refreshSequenceFrameCache = (cacheEntry, sequence, time, bpm) => {
  cacheEntry.lastTime = time;
  cacheEntry.lastBpm = bpm;
  const length = getSequenceLength(sequence);
  cacheEntry.length = length;
  if (length <= 0) {
    cacheEntry.mode = "empty";
    cacheEntry.position = 0;
    cacheEntry.currentIndex = 0;
    cacheEntry.nextIndex = 0;
    cacheEntry.amount = 0;
    return;
  }
  const speed = toFiniteNumber$3(sequence._speed, 1);
  const smooth = Math.max(0, toFiniteNumber$3(sequence._smooth, 0));
  const offset = toFiniteNumber$3(sequence._offset, 0);
  const index = time * speed * (bpm / 60) + offset;
  if (smooth > 0) {
    const eased = resolveEase(sequence._ease);
    const shifted = index - smooth * 0.5;
    const currentIndex = Math.floor(modulo$1(shifted, length));
    const nextIndex = Math.floor(modulo$1(shifted + 1, length));
    const interpolation = Math.min(modulo$1(shifted, 1) / smooth, 1);
    cacheEntry.mode = "smooth";
    cacheEntry.currentIndex = currentIndex;
    cacheEntry.nextIndex = nextIndex;
    cacheEntry.amount = eased(Math.max(0, Math.min(1, interpolation)));
    return;
  }
  cacheEntry.mode = "step";
  cacheEntry.position = Math.floor(modulo$1(index, length));
};
const isArrayLikeSequenceInput = (value) => Array.isArray(value) || ArrayBuffer.isView(value);
const createArraySequenceUniformEvaluator = (sequenceValue, fallback) => {
  const fallbackNumber = toFiniteNumber$3(fallback, 0);
  if (!isArrayLikeSequenceInput(sequenceValue)) {
    return () => fallbackNumber;
  }
  const sequence = sequenceValue;
  return (props) => {
    const sequenceObject = sequence;
    let cacheEntry = sequenceFrameCache.get(sequenceObject);
    if (!cacheEntry) {
      cacheEntry = {
        lastTime: Number.NaN,
        lastBpm: Number.NaN,
        mode: "empty",
        position: 0,
        currentIndex: 0,
        nextIndex: 0,
        amount: 0,
        length: 0
      };
      sequenceFrameCache.set(sequenceObject, cacheEntry);
    }
    const time = toFiniteNumber$3(props.time, 0);
    const bpm = toFiniteNumber$3(props.bpm, 30);
    if (time !== cacheEntry.lastTime || bpm !== cacheEntry.lastBpm) {
      refreshSequenceFrameCache(cacheEntry, sequence, time, bpm);
    }
    if (cacheEntry.mode === "empty") return fallbackNumber;
    if (cacheEntry.mode === "step") {
      return readSequenceValue(sequence, cacheEntry.position, fallbackNumber);
    }
    const currentValue = readSequenceValue(sequence, cacheEntry.currentIndex, fallbackNumber);
    const nextValue = readSequenceValue(sequence, cacheEntry.nextIndex, fallbackNumber);
    return currentValue + (nextValue - currentValue) * cacheEntry.amount;
  };
};
const WGSL_TYPES = {
  float: "f32",
  vec2: "vec2f",
  vec3: "vec3f",
  vec4: "vec4f",
  sampler2D: "texture_2d<f32>"
};
const ensureFloatLiteral = (value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "0.0";
  const asString = value.toString();
  if (asString.includes(".") || asString.includes("e") || asString.includes("E")) return asString;
  return `${asString}.0`;
};
const vecLiteral = (value, len) => {
  const vector = Array.isArray(value) ? value.slice(0, len) : Array(len).fill(value);
  while (vector.length < len) {
    vector.push(vector.length === 3 ? 1 : 0);
  }
  return `vec${len}f(${vector.map(ensureFloatLiteral).join(", ")})`;
};
const sanitizeName = (name) => name.replace(/[^a-zA-Z0-9_]/g, "_");
const toFiniteNumber$2 = (value, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return fallback;
};
const toNumberArray = (value) => {
  if (Array.isArray(value)) return value.map((entry) => Number(entry));
  if (ArrayBuffer.isView(value)) return Array.from(value).map((entry) => Number(entry));
  return null;
};
const buildDefaultVector = (value, len) => {
  const fallback = toNumberArray(value);
  const defaults = fallback ? fallback.slice(0, len) : [];
  while (defaults.length < len) {
    defaults.push(defaults.length === 3 ? 1 : 0);
  }
  return defaults.map((entry, index) => toFiniteNumber$2(entry, index === 3 ? 1 : 0));
};
const normalizeUniformValue = (value, type, fallback) => {
  if (type === "float") return toFiniteNumber$2(value, toFiniteNumber$2(fallback, 0));
  if (type === "vec2" || type === "vec3" || type === "vec4") {
    const len = Number.parseInt(type.slice(3), 10);
    const fallbackVector = buildDefaultVector(fallback, len);
    const maybeVector = toNumberArray(value);
    const source = maybeVector ?? (typeof value === "number" ? Array(len).fill(value) : fallbackVector);
    const normalized = [];
    for (let index = 0; index < len; index += 1) {
      normalized.push(toFiniteNumber$2(source[index], fallbackVector[index]));
    }
    return normalized;
  }
  return 0;
};
const isTextureLike = (value) => Boolean(value) && typeof value === "object" && "getTexture" in value && typeof value.getTexture === "function";
const normalizeHistoryOffset = (value, fallback = 1) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return Math.max(1, Math.floor(fallback));
  return Math.max(1, Math.floor(value));
};
const normalizeOutputId = (value) => {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) return null;
  return value;
};
const parsePrevNBinding = (userArgs, fallbackValue) => {
  const first = userArgs.length > 0 ? userArgs[0] : fallbackValue;
  const second = userArgs.length > 1 ? userArgs[1] : void 0;
  let historyOffset = 1;
  let targetId = null;
  let getTexture = null;
  if (typeof first === "number" && Number.isFinite(first)) {
    historyOffset = normalizeHistoryOffset(first);
    return { historyOffset, targetId, getTexture };
  }
  if (first && typeof first === "object") {
    const candidate = first;
    if (isTextureLike(first)) {
      getTexture = () => first.getTexture();
      targetId = normalizeOutputId(first.id);
    }
    if ("source" in candidate && isTextureLike(candidate.source)) {
      const source = candidate.source;
      getTexture = () => source.getTexture();
      targetId = normalizeOutputId(source.id);
    }
    if ("id" in candidate && targetId === null) {
      targetId = normalizeOutputId(candidate.id);
    }
    if ("historyOffset" in candidate) {
      historyOffset = normalizeHistoryOffset(candidate.historyOffset, historyOffset);
      return { historyOffset, targetId, getTexture };
    }
  }
  if (typeof second !== "undefined") {
    historyOffset = normalizeHistoryOffset(second, historyOffset);
  }
  return { historyOffset, targetId, getTexture };
};
const formatArguments = (transform, startIndex = 0) => {
  const defaultArgs = transform.transform.inputs ?? [];
  const userArgs = transform.userArgs ?? [];
  const srcGenerator = transform.synth.generators.src;
  return defaultArgs.map((input, index) => {
    const typedArg = {
      name: input.name,
      type: input.type,
      wgslType: WGSL_TYPES[input.type] ?? "f32",
      default: input.default,
      value: input.default,
      isUniform: false,
      isTexture: false
    };
    if (userArgs.length > index) typedArg.value = userArgs[index];
    if (typedArg.value && typeof typedArg.value === "object" && "transforms" in typedArg.value) {
      return typedArg;
    }
    if (input.type === "sampler2D") {
      if (transform.name === "prevN") {
        const parsed = parsePrevNBinding(userArgs, typedArg.value);
        typedArg.isTexture = true;
        typedArg.textureName = `${sanitizeName(input.name)}_${startIndex + index}`;
        typedArg.value = parsed.getTexture ?? (() => null);
        typedArg.textureSource = parsed.targetId === null ? { historyOffset: parsed.historyOffset } : { id: parsed.targetId, historyOffset: parsed.historyOffset };
        return typedArg;
      }
      if (!typedArg.value || typeof typedArg.value !== "object" || !("getTexture" in typedArg.value) || typeof typedArg.value.getTexture !== "function") {
        throw new Error(`Expected texture-like argument for sampler input "${input.name}" in "${transform.name}"`);
      }
      const textureLike = typedArg.value;
      typedArg.isTexture = true;
      typedArg.textureName = `${sanitizeName(input.name)}_${startIndex + index}`;
      typedArg.value = () => textureLike.getTexture();
      typedArg.textureSource = textureLike;
      return typedArg;
    }
    if (typedArg.type === "vec4" && typedArg.value && typeof typedArg.value === "object" && "getTexture" in typedArg.value && typeof typedArg.value.getTexture === "function") {
      if (!srcGenerator) {
        throw new Error("Texture-to-vec4 conversion requires `src()` to be registered.");
      }
      typedArg.value = srcGenerator(typedArg.value);
      return typedArg;
    }
    if (typeof typedArg.value === "function") {
      typedArg.isUniform = true;
      const fn = typedArg.value;
      typedArg.uniformName = `${sanitizeName(input.name)}_${startIndex + index}`;
      typedArg.value = (props) => {
        try {
          return normalizeUniformValue(fn(props), typedArg.type, input.default);
        } catch {
        }
        return normalizeUniformValue(void 0, typedArg.type, input.default);
      };
      return typedArg;
    }
    if (typedArg.type === "float") {
      if (isArrayLikeSequenceInput(typedArg.value)) {
        typedArg.isUniform = true;
        typedArg.uniformName = `${sanitizeName(input.name)}_${startIndex + index}`;
        typedArg.value = createArraySequenceUniformEvaluator(typedArg.value, input.default);
        return typedArg;
      }
      typedArg.literal = ensureFloatLiteral(Number(typedArg.value));
      return typedArg;
    }
    if (typedArg.type.startsWith("vec")) {
      const len = Number.parseInt(typedArg.type.slice(3), 10);
      typedArg.literal = vecLiteral(typedArg.value, len);
      return typedArg;
    }
    typedArg.literal = `${typedArg.value ?? 0}`;
    return typedArg;
  });
};
const readSetFrom = (values) => {
  const reads = /* @__PURE__ */ new Set();
  values.forEach((entry) => {
    if (entry.kind === "outputTexture") return;
    reads.add(entry.name);
  });
  return Array.from(reads);
};
const writeSetFrom = (values) => {
  const writes = /* @__PURE__ */ new Set();
  values.forEach((entry) => {
    if (entry.kind === "outputTexture") writes.add(entry.name);
  });
  return Array.from(writes);
};
const normalizeSet = (values) => Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
const resourceKey = (resource) => `${resource.kind}|${resource.name}|${resource.binding}|${resource.intent ?? ""}|${resource.format ?? ""}`;
const normalizeResources = (resources) => {
  const deduped = /* @__PURE__ */ new Map();
  resources.forEach((resource) => {
    deduped.set(resourceKey(resource), resource);
  });
  return Array.from(deduped.values()).sort((left, right) => {
    if (left.binding !== right.binding) return left.binding - right.binding;
    if (left.kind !== right.kind) return left.kind.localeCompare(right.kind);
    return left.name.localeCompare(right.name);
  });
};
const buildPassIR = ({
  signature,
  schedule,
  uniforms,
  textures,
  output
}) => {
  const resources = [];
  uniforms.forEach((uniform) => {
    resources.push({
      name: uniform.name,
      kind: "uniform",
      binding: -1,
      intent: "input"
    });
  });
  textures.forEach((texture) => {
    resources.push({
      name: texture.name,
      kind: "texture",
      binding: texture.binding,
      intent: "input"
    });
  });
  if (output) {
    resources.push({
      name: output.name,
      kind: "outputTexture",
      binding: output.binding,
      intent: "output",
      format: output.format
    });
  }
  return {
    id: signature,
    signature,
    kind: "image",
    schedule,
    resources,
    reads: readSetFrom(resources),
    writes: writeSetFrom(resources)
  };
};
const optimizePassIR = (pass) => {
  if (!pass.ir) return pass;
  const resources = normalizeResources(pass.ir.resources);
  const reads = normalizeSet(readSetFrom(resources));
  const writes = normalizeSet(writeSetFrom(resources));
  return {
    ...pass,
    ir: {
      ...pass.ir,
      resources,
      reads,
      writes
    }
  };
};
const utilityWgsl = {
  hydraMod: {
    wgsl: `
fn hydraMod(x: f32, y: f32) -> f32 {
  let safeY = select(y, 1.0e-6, abs(y) < 1.0e-6);
  return x - safeY * floor(x / safeY);
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
  hydraMod289Scalar: {
    wgsl: `
fn hydraMod289Scalar(x: f32) -> f32 {
  return x - floor(x / 289.0) * 289.0;
}
`
  },
  hydraPermute: {
    dependencies: ["hydraMod289Vec4"],
    wgsl: `
fn hydraPermute(x: vec4f) -> vec4f {
  return hydraMod289Vec4(((x * 34.0) + 1.0) * x);
}
`
  },
  hydraPermuteScalar: {
    dependencies: ["hydraMod289Scalar"],
    wgsl: `
fn hydraPermuteScalar(x: f32) -> f32 {
  return hydraMod289Scalar(((x * 34.0) + 1.0) * x);
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
    dependencies: ["hydraMod289Vec3", "hydraPermute", "hydraTaylorInvSqrt"],
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
  hydraGrad4: {
    wgsl: `
fn hydraGrad4(j: f32, ip: vec4f) -> vec4f {
  let ones = vec4f(1.0, 1.0, 1.0, -1.0);
  var pxyz = floor(fract(vec3f(j, j, j) * ip.xyz) * 7.0) * ip.z - vec3f(1.0);
  let pw = 1.5 - dot(abs(pxyz), ones.xyz);
  let sxyz = vec3f(1.0) - step(vec3f(0.0), pxyz);
  let sw = 1.0 - step(0.0, pw);
  pxyz = pxyz + (sxyz * 2.0 - vec3f(1.0)) * vec3f(sw);
  return vec4f(pxyz, pw);
}
`
  },
  hydraNoise4: {
    dependencies: ["hydraPermute", "hydraPermuteScalar", "hydraTaylorInvSqrt", "hydraGrad4"],
    wgsl: `
fn hydraNoise4(v: vec4f) -> f32 {
  let C = vec4f(0.138196601125011, 0.276393202250021, 0.414589803375032, -0.447213595499958);
  var i = floor(v + vec4f(dot(v, vec4f(0.30901699437494745))));
  let x0 = v - i + vec4f(dot(i, vec4f(C.x)));

  // Break exact rank ties deterministically to avoid directional simplex seams.
  let rankInput = x0 + vec4f(1.0e-7, 2.0e-7, 3.0e-7, 4.0e-7);
  let isX = step(rankInput.yzw, rankInput.xxx);
  let isYZ = step(rankInput.zww, rankInput.yyz);

  var i0 = vec4f(0.0);
  i0.x = isX.x + isX.y + isX.z;
  i0.y = 1.0 - isX.x;
  i0.z = 1.0 - isX.y;
  i0.w = 1.0 - isX.z;
  i0.y += isYZ.x + isYZ.y;
  i0.z += 1.0 - isYZ.x;
  i0.w += 1.0 - isYZ.y;
  i0.z += isYZ.z;
  i0.w += 1.0 - isYZ.z;

  let i3 = clamp(i0, vec4f(0.0), vec4f(1.0));
  let i2 = clamp(i0 - vec4f(1.0), vec4f(0.0), vec4f(1.0));
  let i1 = clamp(i0 - vec4f(2.0), vec4f(0.0), vec4f(1.0));

  let x1 = x0 - i1 + vec4f(C.x);
  let x2 = x0 - i2 + vec4f(C.y);
  let x3 = x0 - i3 + vec4f(C.z);
  let x4 = x0 + vec4f(C.w);

  i = hydraMod289Vec4(i);
  let j0 = hydraPermuteScalar(
    hydraPermuteScalar(
      hydraPermuteScalar(
        hydraPermuteScalar(i.w) + i.z
      ) + i.y
    ) + i.x
  );

  let j1 = hydraPermute(
    hydraPermute(
      hydraPermute(
        hydraPermute(i.w + vec4f(i1.w, i2.w, i3.w, 1.0)) + i.z + vec4f(i1.z, i2.z, i3.z, 1.0)
      ) + i.y + vec4f(i1.y, i2.y, i3.y, 1.0)
    ) + i.x + vec4f(i1.x, i2.x, i3.x, 1.0)
  );

  let ip = vec4f(1.0 / 294.0, 1.0 / 49.0, 1.0 / 7.0, 0.0);
  var p0 = hydraGrad4(j0, ip);
  var p1 = hydraGrad4(j1.x, ip);
  var p2 = hydraGrad4(j1.y, ip);
  var p3 = hydraGrad4(j1.z, ip);
  var p4 = hydraGrad4(j1.w, ip);

  let norm = hydraTaylorInvSqrt(vec4f(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  p4 *= hydraTaylorInvSqrt(vec4f(dot(p4, p4))).x;

  var m0 = max(
    vec3f(0.6) - vec3f(dot(x0, x0), dot(x1, x1), dot(x2, x2)),
    vec3f(0.0)
  );
  var m1 = max(
    vec2f(0.6) - vec2f(dot(x3, x3), dot(x4, x4)),
    vec2f(0.0)
  );
  m0 = m0 * m0;
  m1 = m1 * m1;

  return 49.0 * (
    dot(m0 * m0, vec3f(dot(p0, x0), dot(p1, x1), dot(p2, x2))) +
    dot(m1 * m1, vec2f(dot(p3, x3), dot(p4, x4)))
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
    dependencies: ["hydraUvFromLinearCoord"],
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
    dependencies: ["hydraSampleTextureWrapped"],
    wgsl: `
fn hydraSampleTexture(tex: texture_2d<f32>, uv: vec2f) -> vec4f {
  return hydraSampleTextureWrapped(tex, uv);
}
`
  }
};
const UTILITY_ORDER = [
  "hydraMod",
  "hydraLuminance",
  "hydraRgbToHsv",
  "hydraHsvToRgb",
  "hydraMod289Vec3",
  "hydraMod289Vec4",
  "hydraMod289Scalar",
  "hydraPermute",
  "hydraPermuteScalar",
  "hydraTaylorInvSqrt",
  "hydraNoise",
  "hydraGrad4",
  "hydraNoise4",
  "hydraSampleTextureWrapped",
  "hydraSampleTextureClamped",
  "hydraUvFromLinearCoord",
  "hydraUvFromLinearIndex",
  "hydraSampleTexture"
];
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const selectUtility = (utilityName, selected) => {
  if (selected.has(utilityName)) return;
  const utility = utilityWgsl[utilityName];
  if (!utility) return;
  const dependencies = utility.dependencies ?? [];
  for (const dependencyName of dependencies) selectUtility(dependencyName, selected);
  selected.add(utilityName);
};
const collectUtilityDeclarations = (wgslFunctions = []) => {
  const functionBodies = wgslFunctions.map((transform) => transform.transform.wgsl).join("\n");
  const selectedUtilities = /* @__PURE__ */ new Set();
  for (const utilityName of UTILITY_ORDER) {
    const pattern = new RegExp(`\\b${escapeRegExp(utilityName)}\\s*\\(`);
    if (pattern.test(functionBodies)) selectUtility(utilityName, selectedUtilities);
  }
  return UTILITY_ORDER.filter((utilityName) => selectedUtilities.has(utilityName)).map((utilityName) => utilityWgsl[utilityName].wgsl).join("\n");
};
const DEFAULT_PASS_OUTPUT_FORMAT = "rgba16float";
const normalizeResolutionScale = (value) => {
  if (!Number.isFinite(value) || value <= 0) return 1;
  return value;
};
const updateRatePriority = (value) => {
  if (value === "everyFrame") return 0;
  if ("everyNFrames" in value) return 1;
  return 2;
};
const mergeUpdateRates = (values) => {
  if (values.length === 0) return "everyFrame";
  let selected = "everyFrame";
  let selectedPriority = -1;
  for (const candidate of values) {
    const priority = updateRatePriority(candidate);
    if (priority > selectedPriority) {
      selected = candidate;
      selectedPriority = priority;
      continue;
    }
    if (priority < selectedPriority) continue;
    if (candidate !== "everyFrame" && "everyNFrames" in candidate && selected !== "everyFrame" && "everyNFrames" in selected) {
      const next = Math.max(1, Math.floor(candidate.everyNFrames || 1));
      const current = Math.max(1, Math.floor(selected.everyNFrames || 1));
      if (next > current) selected = { everyNFrames: next };
      continue;
    }
    if (candidate !== "everyFrame" && "onEvent" in candidate && selected !== "everyFrame" && "onEvent" in selected) {
      const next = `${candidate.onEvent}`;
      const current = `${selected.onEvent}`;
      if (next.localeCompare(current) < 0) selected = { onEvent: next };
    }
  }
  return selected;
};
const mergePassSchedule = (transforms) => {
  const schedule = {
    resolutionScale: 1,
    updateRate: "everyFrame",
    sparse: false
  };
  transforms.forEach((transform) => {
    const transformSchedule = transform.transform.schedule;
    if (!transformSchedule) return;
    schedule.resolutionScale = Math.min(
      schedule.resolutionScale,
      normalizeResolutionScale(transformSchedule.resolutionScale)
    );
    if (transformSchedule.sparse) schedule.sparse = true;
  });
  schedule.updateRate = mergeUpdateRates(transforms.map((transform) => transform.transform.schedule?.updateRate ?? "everyFrame"));
  return schedule;
};
const hashString$1 = (value = "") => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};
const coerceExpression = (expression, fromType, toType) => {
  if (fromType === toType) return expression;
  if (toType === "f32") {
    return `${expression}.x`;
  }
  if (toType === "vec2f") {
    return `${expression}.xy`;
  }
  if (toType === "vec3f") {
    return `${expression}.xyz`;
  }
  return expression;
};
const containsTransform = (transform, list) => {
  for (let index = 0; index < list.length; index += 1) {
    if (transform.name === list[index].name) return true;
  }
  return false;
};
const registerWgslFunction = (shaderParams, name, wgsl) => {
  const entry = {
    name,
    transform: { wgsl }
  };
  if (containsTransform(entry, shaderParams.wgslFunctions)) return;
  shaderParams.wgslFunctions.push(entry);
};
const structureSignatureForArg = (arg) => {
  if (arg && typeof arg === "object" && "transforms" in arg) {
    return `graph(${buildStructureSignature(arg.transforms)})`;
  }
  if (typeof arg === "function") return "uniform";
  if (arg && typeof arg === "object" && "getTexture" in arg && typeof arg.getTexture === "function") return "texture";
  if (Array.isArray(arg)) return `vec${arg.length}`;
  if (typeof arg === "number") return "number";
  if (typeof arg === "string") return "string";
  if (typeof arg === "boolean") return "boolean";
  if (typeof arg === "undefined") return "undefined";
  return "value";
};
const buildStructureSignature = (transforms = []) => transforms.map((transform) => {
  const args = (transform.userArgs ?? []).map((arg) => structureSignatureForArg(arg)).join(",");
  return `${transform.name}(${args})`;
}).join(">");
const uniformSlotCount = (wgslType) => {
  if (wgslType === "vec2f") return 2;
  if (wgslType === "vec3f") return 3;
  if (wgslType === "vec4f") return 4;
  return 1;
};
const registerUniform = (shaderParams, arg) => {
  if (!arg.uniformName || typeof arg.value !== "function") return null;
  const existing = shaderParams.uniforms.find((uniform) => uniform.name === arg.uniformName);
  if (existing) return existing;
  const entry = {
    name: arg.uniformName,
    index: shaderParams.uniformScalarCount,
    size: uniformSlotCount(arg.wgslType),
    value: arg.value,
    type: arg.type
  };
  shaderParams.uniforms.push(entry);
  shaderParams.uniformScalarCount += entry.size;
  return entry;
};
const uniformExpressionForArg = (arg, uniform) => {
  if (arg.wgslType === "vec2f") return `hydraDynamicUniformVec2(${uniform.index}u)`;
  if (arg.wgslType === "vec3f") return `hydraDynamicUniformVec3(${uniform.index}u)`;
  if (arg.wgslType === "vec4f") return `hydraDynamicUniformVec4(${uniform.index}u)`;
  return `hydraDynamicUniform(${uniform.index}u)`;
};
const registerTexture = (shaderParams, arg) => {
  if (!arg.textureName || typeof arg.value !== "function") return "hydraTexture0";
  const existing = shaderParams.textures.find((texture) => texture.name === arg.textureName);
  if (existing) return existing.variableName;
  const index = shaderParams.textures.length;
  const variableName = `hydraTexture${index}`;
  shaderParams.textures.push({
    name: arg.textureName,
    variableName,
    getTexture: arg.value,
    isPrev: false,
    sourceRef: arg.textureSource
  });
  return variableName;
};
const ensurePrevTexture = (shaderParams) => {
  const existing = shaderParams.textures.find((texture) => texture.isPrev);
  if (existing) return;
  shaderParams.textures.push({
    name: "prevBuffer",
    variableName: "prevBuffer",
    getTexture: null,
    isPrev: true
  });
};
const generateInputName = (base, index) => `${base}_i${index}`;
const resolveInputExpression = (arg, argIndex, contextVar, shaderParams) => {
  if (arg.value && typeof arg.value === "object" && "transforms" in arg.value) {
    return coerceExpression(generateInputName(contextVar, argIndex), "vec4f", arg.wgslType);
  }
  if (arg.isUniform) {
    const uniform = registerUniform(shaderParams, arg);
    if (!uniform) return "0.0";
    return uniformExpressionForArg(arg, uniform);
  }
  if (arg.isTexture) {
    return registerTexture(shaderParams, arg);
  }
  if (typeof arg.literal !== "undefined") return arg.literal;
  if (arg.wgslType === "f32") return "0.0";
  if (arg.wgslType === "vec2f") return "vec2f(0.0)";
  if (arg.wgslType === "vec3f") return "vec3f(0.0)";
  if (arg.wgslType === "vec4f") return "vec4f(0.0)";
  return "0.0";
};
const buildTransformCall = (method, callSeed, args, contextVar, shaderParams) => {
  const inputExpressions = args.map((arg, argIndex) => resolveInputExpression(arg, argIndex, contextVar, shaderParams));
  return `${method}(${[callSeed].concat(inputExpressions).join(", ")})`;
};
const buildNestedInputs = (inputs, shaderParams) => {
  let generator = (_cVar, _stVar) => "";
  inputs.forEach((input, index) => {
    if (input.value && typeof input.value === "object" && "transforms" in input.value) {
      const currentPrevious = generator;
      generator = (cVar, stVar) => {
        const nestedColorVar = generateInputName(cVar, index);
        const nestedUvVar = generateInputName(`${stVar}_${cVar}`, index);
        const nestedGenerator = generateWgslTransforms(
          input.value.transforms,
          shaderParams,
          { renderpassMode: "expression" }
        );
        return `var ${nestedUvVar}: vec2f = ${stVar};
var ${nestedColorVar}: vec4f = vec4f(0.0);
${currentPrevious(cVar, stVar)}
${nestedGenerator(nestedColorVar, nestedUvVar)}`;
      };
    }
  });
  return generator;
};
const sanitizeWgslIdentifier = (value) => value.replace(/[^a-zA-Z0-9_]/g, "_").replace(/^[^a-zA-Z_]/, "_");
const registerExpressionEvaluator = (shaderParams, previousGenerator) => {
  const name = `hydraExprInput_${shaderParams.expressionFunctionSeed}`;
  shaderParams.expressionFunctionSeed += 1;
  const wgsl = `
fn ${name}(hydraExprSt: vec2f) -> vec4f {
  var st = hydraExprSt;
  var c = vec4f(0.0);
  ${previousGenerator("c", "st")}
  return c;
}
`;
  registerWgslFunction(shaderParams, name, wgsl);
  return name;
};
const registerExpressionRenderpass = (shaderParams, transform, sampleFunctionName) => {
  const name = `hydraExpr_${sanitizeWgslIdentifier(transform.name)}_${shaderParams.expressionFunctionSeed}`;
  shaderParams.expressionFunctionSeed += 1;
  const renamed = transform.transform.wgsl.replace(
    new RegExp(`fn\\s+${sanitizeWgslIdentifier(transform.name)}\\s*\\(`),
    `fn ${name}(`
  );
  const wgsl = renamed.replace(/\bhydraSampleTexture\s*\(\s*prevBuffer\s*,\s*/g, `${sampleFunctionName}(`);
  registerWgslFunction(shaderParams, name, wgsl);
  return name;
};
const transformUsesPrevBuffer = (transform, mode) => {
  if (transform.name === "prev") return true;
  if (transform.transform.type === "renderpass" && mode === "expression") return false;
  return /\bprevBuffer\b/.test(transform.transform.wgsl);
};
const generateWgslTransforms = (transforms, shaderParams, options = { renderpassMode: "framebuffer" }) => {
  let generator = (_cVar, _stVar) => "";
  transforms.forEach((transform, index) => {
    const namespaceSeed = shaderParams.argumentNamespaceSeed;
    const slotCount = transform.transform.inputs?.length ?? 0;
    shaderParams.argumentNamespaceSeed += Math.max(1, slotCount);
    const args = formatArguments(transform, namespaceSeed);
    const previous = generator;
    if (transformUsesPrevBuffer(transform, options.renderpassMode)) {
      shaderParams.usesPrev = true;
    }
    if (transform.transform.type === "renderpass" && options.renderpassMode === "expression") {
      const sampleFunctionName = registerExpressionEvaluator(shaderParams, previous);
      const renderpassFunctionName = registerExpressionRenderpass(shaderParams, transform, sampleFunctionName);
      generator = (cVar, stVar) => {
        const contextVar = `${cVar}${index}`;
        const nested = buildNestedInputs(args, shaderParams)(contextVar, stVar);
        const call = buildTransformCall(renderpassFunctionName, stVar, args, contextVar, shaderParams);
        return `${nested}
${cVar} = ${call};`;
      };
      return;
    }
    registerWgslFunction(shaderParams, transform.name, transform.transform.wgsl);
    if (transform.transform.type === "src" || transform.transform.type === "renderpass") {
      generator = (cVar, stVar) => {
        const contextVar = `${cVar}${index}`;
        const nested = buildNestedInputs(args, shaderParams)(contextVar, stVar);
        const call = buildTransformCall(transform.name, stVar, args, contextVar, shaderParams);
        return `${nested}
${cVar} = ${call};`;
      };
      return;
    }
    if (transform.transform.type === "color" || transform.transform.type === "combine") {
      generator = (cVar, stVar) => {
        const contextVar = `${cVar}${index}`;
        const nested = buildNestedInputs(args, shaderParams)(contextVar, stVar);
        const call = buildTransformCall(transform.name, cVar, args, contextVar, shaderParams);
        return `${nested}
${previous(cVar, stVar)}
${cVar} = ${call};`;
      };
      return;
    }
    if (transform.transform.type === "coord" || transform.transform.type === "combineCoord") {
      generator = (cVar, stVar) => {
        const contextVar = `${cVar}${index}`;
        const nested = buildNestedInputs(args, shaderParams)(contextVar, stVar);
        const call = buildTransformCall(transform.name, stVar, args, contextVar, shaderParams);
        return `${nested}
${stVar} = ${call};
${previous(cVar, stVar)}`;
      };
    }
  });
  return generator;
};
const generateWgsl = (transforms) => {
  const shaderParams = {
    uniforms: [],
    textures: [],
    wgslFunctions: [],
    fragColor: "",
    usesPrev: false,
    uniformScalarCount: 0,
    argumentNamespaceSeed: 0,
    expressionFunctionSeed: 0,
    structureSignature: buildStructureSignature(transforms),
    schedule: mergePassSchedule(transforms)
  };
  const generator = generateWgslTransforms(transforms, shaderParams, { renderpassMode: "framebuffer" });
  shaderParams.fragColor = generator("c", "st");
  if (shaderParams.usesPrev) ensurePrevTexture(shaderParams);
  return shaderParams;
};
const compileFragmentWgslPass = (transforms, maxDynamicUniforms = 256) => {
  const shaderInfo = generateWgsl(transforms);
  const dynamicUniformVec4Count = Math.ceil(maxDynamicUniforms / 4);
  const includeDynamicUniforms = shaderInfo.uniforms.length > 0;
  if (shaderInfo.uniformScalarCount > maxDynamicUniforms) {
    throw new Error(`Shader uses ${shaderInfo.uniformScalarCount} dynamic uniform scalars, but max is ${maxDynamicUniforms}.`);
  }
  const textureBindings = shaderInfo.textures.map((texture, index) => ({
    ...texture,
    binding: 3 + index
  }));
  const textureDeclarations = textureBindings.map(
    (texture) => `@group(0) @binding(${texture.binding}) var ${texture.variableName}: texture_2d<f32>;`
  ).join("\n");
  const samplerDeclaration = textureBindings.length > 0 ? "@group(0) @binding(2) var hydraSampler: sampler;" : "";
  const dynamicUniformDeclarations = includeDynamicUniforms ? `
struct DynamicUniforms {
  values: array<vec4f, ${dynamicUniformVec4Count}>,
};

@group(0) @binding(1) var<uniform> dynamicUniforms: DynamicUniforms;
` : "";
  const dynamicUniformHelpers = includeDynamicUniforms ? `
fn hydraDynamicUniform(index: u32) -> f32 {
  let vecIndex = index / 4u;
  let lane = index % 4u;
  let packed = dynamicUniforms.values[vecIndex];
  if (lane == 0u) { return packed.x; }
  if (lane == 1u) { return packed.y; }
  if (lane == 2u) { return packed.z; }
  return packed.w;
}

fn hydraDynamicUniformVec2(index: u32) -> vec2f {
  return vec2f(
    hydraDynamicUniform(index),
    hydraDynamicUniform(index + 1u)
  );
}

fn hydraDynamicUniformVec3(index: u32) -> vec3f {
  return vec3f(
    hydraDynamicUniform(index),
    hydraDynamicUniform(index + 1u),
    hydraDynamicUniform(index + 2u)
  );
}

fn hydraDynamicUniformVec4(index: u32) -> vec4f {
  return vec4f(
    hydraDynamicUniform(index),
    hydraDynamicUniform(index + 1u),
    hydraDynamicUniform(index + 2u),
    hydraDynamicUniform(index + 3u)
  );
}
` : "";
  const functionDeclarations = shaderInfo.wgslFunctions.map((transform) => transform.transform.wgsl).join("\n");
  const utilityDeclarations = collectUtilityDeclarations(shaderInfo.wgslFunctions);
  const functionSignature = shaderInfo.wgslFunctions.map((transform) => `${transform.name}:${transform.transform.wgsl.length}`).join(",");
  const signatureBase = `${shaderInfo.structureSignature}|u${shaderInfo.uniforms.length}|us${shaderInfo.uniformScalarCount}|t${textureBindings.length}|rs${shaderInfo.schedule.resolutionScale}|sp${shaderInfo.schedule.sparse ? 1 : 0}|f${functionSignature}`;
  const wgsl = `
struct GlobalUniforms {
  time: f32,
  bpm: f32,
  width: f32,
  height: f32,
};

struct FragmentInput {
  @builtin(position) position: vec4f,
};

@group(0) @binding(0) var<uniform> globals: GlobalUniforms;
${dynamicUniformDeclarations}
${samplerDeclaration}
${textureDeclarations}
${dynamicUniformHelpers}

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
fn fsMain(in: FragmentInput) -> @location(0) vec4f {
  let safeWidth = max(globals.width, 1.0);
  let safeHeight = max(globals.height, 1.0);
  var st = vec2f(in.position.x / safeWidth, in.position.y / safeHeight);
  var c = vec4f(0.0);
  ${shaderInfo.fragColor}
  return c;
}
`;
  const pipelineSignature = `${signatureBase}|fs|h${hashString$1(wgsl)}`;
  const output = {
    name: "outImage",
    variableName: "outImage",
    format: DEFAULT_PASS_OUTPUT_FORMAT,
    binding: 0
  };
  const compiled = {
    signature: pipelineSignature,
    wgsl,
    uniforms: shaderInfo.uniforms,
    textures: textureBindings,
    output,
    schedule: shaderInfo.schedule,
    ir: buildPassIR({
      signature: pipelineSignature,
      schedule: shaderInfo.schedule,
      uniforms: shaderInfo.uniforms,
      textures: textureBindings,
      output
    })
  };
  return optimizePassIR(compiled);
};
const compileWgslPass = (transforms, maxDynamicUniforms = 256) => {
  return compileFragmentWgslPass(transforms, maxDynamicUniforms);
};
const STANDALONE_PASS_TYPES = /* @__PURE__ */ new Set(["renderpass"]);
const isGraphNodeLike = (value) => Boolean(value) && typeof value === "object" && "transforms" in value && Array.isArray(value.transforms);
const containsRenderpassDeep = (transforms) => transforms.some((transform) => STANDALONE_PASS_TYPES.has(transform.transform.type) || (transform.userArgs ?? []).some((arg) => isGraphNodeLike(arg) && containsRenderpassDeep(arg.transforms)));
const createInternalPassTextureProvider = (internalPassIndex) => ({
  internalPassIndex,
  getTexture: () => null
});
const cloneTransformWithArgs = (transform, userArgs) => ({
  ...transform,
  userArgs
});
const createPrevTransform = (anchor) => {
  const prevGenerator = anchor.synth.generators.prev;
  if (typeof prevGenerator !== "function") return null;
  try {
    const prevNode = prevGenerator();
    if (!prevNode || !Array.isArray(prevNode.transforms) || prevNode.transforms.length === 0) return null;
    const transform = prevNode.transforms[0];
    transform.__hydraInjectedPrev = true;
    return transform;
  } catch {
    return null;
  }
};
const createInternalSrcTransform = (anchor, internalPassIndex) => {
  const srcGenerator = anchor.synth.generators.src;
  if (typeof srcGenerator !== "function") return null;
  try {
    const srcNode = srcGenerator(createInternalPassTextureProvider(internalPassIndex));
    if (!srcNode || !Array.isArray(srcNode.transforms) || srcNode.transforms.length === 0) return null;
    return srcNode.transforms[0];
  } catch {
    return null;
  }
};
const splitLinearPasses = (transforms) => {
  const passes = [];
  let currentPass = [];
  let shouldInjectPrev = false;
  const pushCurrentPass = () => {
    if (currentPass.length === 0) return;
    passes.push(currentPass);
    currentPass = [];
  };
  for (const transform of transforms) {
    if (STANDALONE_PASS_TYPES.has(transform.transform.type)) {
      pushCurrentPass();
      const isIdentityRenderpass = transform.transform.type === "renderpass" && transform.name === "renderpass";
      if (!isIdentityRenderpass) passes.push([transform]);
      shouldInjectPrev = true;
      continue;
    }
    if (currentPass.length === 0 && shouldInjectPrev && transform.transform.type !== "src") {
      const prevTransform = createPrevTransform(transform);
      if (prevTransform) currentPass.push(prevTransform);
    }
    currentPass.push(transform);
    shouldInjectPrev = false;
  }
  pushCurrentPass();
  return passes;
};
const stageNestedRenderpassArgs = (transforms, startPassIndex) => {
  const linearPasses = splitLinearPasses(transforms);
  const stagedPasses = [];
  const stageArg = (arg) => {
    if (!isGraphNodeLike(arg) || !containsRenderpassDeep(arg.transforms)) return arg;
    const nestedPasses = stageNestedRenderpassArgs(
      arg.transforms,
      startPassIndex + stagedPasses.length
    );
    stagedPasses.push(...nestedPasses);
    return createInternalPassTextureProvider(startPassIndex + stagedPasses.length - 1);
  };
  for (const pass of linearPasses) {
    const previousPassIndex = stagedPasses.length > 0 ? startPassIndex + stagedPasses.length - 1 : null;
    let insertedNestedPass = false;
    const processedPass = pass.map((transform) => {
      const beforeCount = stagedPasses.length;
      const userArgs = (transform.userArgs ?? []).map(stageArg);
      if (stagedPasses.length > beforeCount) insertedNestedPass = true;
      return cloneTransformWithArgs(transform, userArgs);
    });
    const firstTransform = processedPass[0];
    if (insertedNestedPass && previousPassIndex !== null && firstTransform?.__hydraInjectedPrev) {
      const replacement = createInternalSrcTransform(firstTransform, previousPassIndex);
      if (replacement) processedPass[0] = replacement;
    }
    stagedPasses.push(processedPass);
  }
  return stagedPasses;
};
const splitPasses = (transforms) => stageNestedRenderpassArgs(transforms, 0);
const validateKernelGraph = (graph) => {
  const issues = [];
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const resourceIds = new Set(graph.resources.map((resource) => resource.id));
  const seenEdges = /* @__PURE__ */ new Set();
  graph.edges.forEach((edge) => {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      issues.push({
        type: "error",
        code: "EDGE_NODE_NOT_FOUND",
        message: `Edge "${edge.id}" references missing node(s): from=${edge.from}, to=${edge.to}.`
      });
    }
    const signature = `${edge.from}|${edge.to}|${edge.kind}|${edge.resource ?? ""}`;
    if (seenEdges.has(signature)) {
      issues.push({
        type: "warning",
        code: "DUPLICATE_EDGE",
        message: `Duplicate edge detected for ${signature}.`
      });
    } else {
      seenEdges.add(signature);
    }
    if (edge.resource && !resourceIds.has(edge.resource)) {
      issues.push({
        type: "warning",
        code: "EDGE_RESOURCE_NOT_DECLARED",
        message: `Edge "${edge.id}" references undeclared resource "${edge.resource}".`
      });
    }
  });
  graph.nodes.forEach((node) => {
    node.resources.forEach((resourceId) => {
      if (resourceIds.has(resourceId)) return;
      issues.push({
        type: "warning",
        code: "NODE_RESOURCE_NOT_DECLARED",
        message: `Node "${node.id}" references undeclared resource "${resourceId}".`
      });
    });
  });
  return issues;
};
const throwOnKernelGraphErrors = (issues, label = "HydraKernelGraph") => {
  const errors = issues.filter((issue) => issue.type === "error");
  if (errors.length === 0) return;
  const details = errors.map((issue) => `${issue.code}: ${issue.message}`).join("\n");
  throw new Error(`${label} validation failed:
${details}`);
};
const createEdgeId = (from, to, kind, resource) => `${from}->${to}:${kind}${resource ? `:${resource}` : ""}`;
const sanitizeResourceToken = (value) => value.replace(/[^a-zA-Z0-9:_-]/g, "_");
const sourceRefToken = (sourceRef) => {
  if (!sourceRef || typeof sourceRef !== "object") return null;
  const candidate = sourceRef;
  const outputId = candidate.id;
  if (typeof outputId === "number" && Number.isFinite(outputId)) {
    return `output:${Math.max(0, Math.floor(outputId))}`;
  }
  const historyOffset = candidate.historyOffset;
  if (typeof historyOffset === "number" && Number.isFinite(historyOffset)) {
    return `history:${Math.max(1, Math.floor(historyOffset))}`;
  }
  const stateKey = candidate.stateKey;
  if (typeof stateKey === "string" && stateKey.length > 0) {
    return `state:${sanitizeResourceToken(stateKey)}`;
  }
  const internalPassIndex = candidate.internalPassIndex;
  if (typeof internalPassIndex === "number" && Number.isInteger(internalPassIndex) && internalPassIndex >= 0) {
    return `internal-pass:${internalPassIndex}`;
  }
  const slot = candidate.slot;
  if (typeof slot === "string" && slot.length > 0) {
    return `slot:${sanitizeResourceToken(slot)}`;
  }
  return null;
};
const bindingToken = ({
  name,
  variableName,
  sourceRef
}) => {
  const sourceToken = sourceRefToken(sourceRef);
  if (sourceToken) return sourceToken;
  if (variableName) return `binding:${sanitizeResourceToken(variableName)}`;
  return `name:${sanitizeResourceToken(name)}`;
};
const getTextureResourceId = (texture) => `texture:${bindingToken(texture)}`;
const normalizeUpdateRate = (value) => value ?? "everyFrame";
const isNodeUniformRef = (node, resource) => node.uniforms.some((uniform) => uniform.name === resource);
const resolveNodeResourceRef = (node, resource) => {
  if (isNodeUniformRef(node, resource)) return null;
  if (resource === "outImage") return "virtual:outImage";
  const texture = node.textures.find((entry) => entry.name === resource);
  if (texture) return getTextureResourceId(texture);
  return `virtual:${resource}`;
};
const collectResourceSpecs = (nodes) => {
  const resources = /* @__PURE__ */ new Map();
  const ensure = (resource) => {
    if (resources.has(resource.id)) return;
    resources.set(resource.id, resource);
  };
  nodes.forEach((node) => {
    node.textures.forEach((texture) => {
      ensure({
        id: getTextureResourceId(texture),
        kind: "Texture2D",
        lifetime: "external",
        aliasClass: "texture-read",
        externalBinding: texture.variableName
      });
    });
    node.reads.forEach((read) => {
      const key = resolveNodeResourceRef(node, read);
      if (!key || key === "virtual:outImage" || !key.startsWith("virtual:")) return;
    });
    node.writes.forEach((write) => {
      const key = resolveNodeResourceRef(node, write);
      if (!key) return;
      if (key === "virtual:outImage") {
        ensure({
          id: "virtual:outImage",
          kind: "Texture2D",
          lifetime: "transient",
          format: passOutputFormat(node)
        });
        return;
      }
    });
  });
  return Array.from(resources.values()).sort((left, right) => left.id.localeCompare(right.id));
};
const passOutputFormat = (node) => {
  const outputWrite = node.writes.find((entry) => entry === "outImage");
  if (!outputWrite) return void 0;
  return "rgba16float";
};
const createKernelNode = (transforms, index, pass) => {
  const schedule = pass.schedule;
  const reads = pass.ir?.reads ? pass.ir.reads.slice() : [];
  const writes = pass.ir?.writes ? pass.ir.writes.slice() : [];
  const textureResources = pass.textures.map((texture) => getTextureResourceId(texture));
  const resources = Array.from(new Set(textureResources));
  const loweringNotes = [];
  if (transforms.some((transform) => transform.name === "prev")) loweringNotes.push("contains-prev-transform");
  if (transforms.some((transform) => transform.name === "prevN")) loweringNotes.push("contains-prevN-transform");
  return {
    id: `k${index}`,
    kind: "ImageKernel",
    signature: pass.signature,
    transforms,
    uniforms: pass.uniforms,
    textures: pass.textures,
    schedule: {
      // Scheduler metadata is backend-agnostic and maps directly to fragment execution cadence.
      resolutionScale: schedule?.resolutionScale ?? 1,
      updateRate: normalizeUpdateRate(schedule?.updateRate),
      sparse: Boolean(schedule?.sparse)
    },
    resources,
    reads,
    writes,
    debug: {
      sourceTransformNames: transforms.map((transform) => transform.name),
      loweringNotes,
      compatibilityFlags: ["dsl-v2-compat"]
    }
  };
};
const buildEdges = (nodes) => {
  const edges = /* @__PURE__ */ new Map();
  const add = (edge) => {
    if (edges.has(edge.id)) return;
    edges.set(edge.id, edge);
  };
  for (let index = 1; index < nodes.length; index += 1) {
    const previous = nodes[index - 1];
    const current = nodes[index];
    const seqId = createEdgeId(previous.id, current.id, "RAW", "virtual:outImage");
    add({
      id: seqId,
      from: previous.id,
      to: current.id,
      kind: "RAW",
      resource: "virtual:outImage"
    });
  }
  const lastWriterByResource = /* @__PURE__ */ new Map();
  nodes.forEach((node) => {
    node.reads.forEach((resource) => {
      const resolved = resolveNodeResourceRef(node, resource);
      if (!resolved) return;
      const writer = lastWriterByResource.get(resolved);
      if (!writer || writer === node.id) return;
      add({
        id: createEdgeId(writer, node.id, "RAW", resolved),
        from: writer,
        to: node.id,
        kind: "RAW",
        resource: resolved
      });
    });
    node.writes.forEach((resource) => {
      const resolved = resolveNodeResourceRef(node, resource);
      if (!resolved) return;
      const priorWriter = lastWriterByResource.get(resolved);
      if (priorWriter && priorWriter !== node.id) {
        add({
          id: createEdgeId(priorWriter, node.id, "WAW", resolved),
          from: priorWriter,
          to: node.id,
          kind: "WAW",
          resource: resolved
        });
      }
      lastWriterByResource.set(resolved, node.id);
    });
  });
  return Array.from(edges.values());
};
const lowerDslToIr = (transforms, { maxDynamicUniforms = 256, graphId = "hydra-dsl-graph", validate = true } = {}) => {
  const passGroups = splitPasses(transforms);
  const nodes = passGroups.map((group, index) => {
    const pass = compileWgslPass(group, maxDynamicUniforms);
    return createKernelNode(group, index, pass);
  });
  const resources = collectResourceSpecs(nodes);
  const edges = buildEdges(nodes);
  const graph = {
    id: graphId,
    source: "hydra-dsl",
    compatibilityMode: "dsl-v2",
    nodes,
    resources,
    edges
  };
  if (validate) {
    const issues = validateKernelGraph(graph);
    throwOnKernelGraphErrors(issues);
  }
  return graph;
};
const resourceByteEstimate = (resource) => {
  const width = Math.max(1, Math.floor(resource.shape?.width ?? 1));
  const height = Math.max(1, Math.floor(resource.shape?.height ?? 1));
  const depth = Math.max(1, Math.floor(resource.shape?.depthOrArrayLayers ?? 1));
  if (resource.format === "rgba16float") return width * height * depth * 8;
  if (resource.format === "rgba32float") return width * height * depth * 16;
  if (resource.format === "r32float" || resource.format === "r32uint") return width * height * depth * 4;
  if (resource.format === "rg32float") return width * height * depth * 8;
  return width * height * depth * 4;
};
const variantOfPass = (_pass) => "fragment";
const resolveResourceRef = (resourceIds, reference) => {
  if (resourceIds.has(reference)) return reference;
  if (!reference.startsWith("virtual:")) {
    const virtual = `virtual:${reference}`;
    if (resourceIds.has(virtual)) return virtual;
  }
  return null;
};
const aliasKeyForResource = (resource) => resource.aliasClass ?? `${resource.kind}:${resource.format ?? "default"}`;
const deriveResourceIntervals = (graph, orderedNodes) => {
  const resourceIds = new Set(graph.resources.map((resource) => resource.id));
  const intervals = /* @__PURE__ */ new Map();
  orderedNodes.forEach((node, index) => {
    const refs = /* @__PURE__ */ new Set();
    node.resources.forEach((id) => refs.add(id));
    node.reads.forEach((name) => refs.add(name));
    node.writes.forEach((name) => refs.add(name));
    refs.forEach((ref) => {
      const resourceId = resolveResourceRef(resourceIds, ref);
      if (!resourceId) return;
      const current = intervals.get(resourceId);
      if (!current) {
        intervals.set(resourceId, { start: index, end: index });
        return;
      }
      current.start = Math.min(current.start, index);
      current.end = Math.max(current.end, index);
    });
  });
  graph.resources.forEach((resource) => {
    if (intervals.has(resource.id)) return;
    intervals.set(resource.id, { start: 0, end: 0 });
  });
  return intervals;
};
const inferAndOrderNodes = (graph) => {
  const indegree = /* @__PURE__ */ new Map();
  const adjacency = /* @__PURE__ */ new Map();
  graph.nodes.forEach((node) => {
    indegree.set(node.id, 0);
    adjacency.set(node.id, []);
  });
  graph.edges.forEach((edge) => {
    const next = adjacency.get(edge.from);
    if (next) next.push(edge.to);
    indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
  });
  const queue = graph.nodes.filter((node) => (indegree.get(node.id) ?? 0) === 0).map((node) => node.id).sort((left, right) => left.localeCompare(right));
  const ordered = [];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    ordered.push(current);
    const next = adjacency.get(current) ?? [];
    next.sort((left, right) => left.localeCompare(right)).forEach((candidate) => {
      const degree = (indegree.get(candidate) ?? 0) - 1;
      indegree.set(candidate, degree);
      if (degree === 0) queue.push(candidate);
    });
    queue.sort((left, right) => left.localeCompare(right));
  }
  if (ordered.length === graph.nodes.length) {
    const byId = new Map(graph.nodes.map((node) => [node.id, node]));
    return ordered.map((id) => byId.get(id)).filter((entry) => Boolean(entry));
  }
  return graph.nodes.slice();
};
const buildExecutionBarriers = (edges, orderedNodeIds) => {
  const orderLookup = /* @__PURE__ */ new Map();
  orderedNodeIds.forEach((id, index) => orderLookup.set(id, index));
  return edges.filter((edge) => (orderLookup.get(edge.from) ?? -1) < (orderLookup.get(edge.to) ?? Number.MAX_SAFE_INTEGER)).map((edge) => ({
    fromNodeId: edge.from,
    toNodeId: edge.to,
    reason: edge.kind,
    resource: edge.resource
  }));
};
const planResourceAllocations = (graph, orderedNodes) => {
  const intervals = deriveResourceIntervals(graph, orderedNodes);
  const slotState = /* @__PURE__ */ new Map();
  const slotsByAlias = /* @__PURE__ */ new Map();
  let transientSlotCounter = 0;
  const resources = graph.resources.slice().sort((left, right) => {
    const intervalLeft = intervals.get(left.id);
    const intervalRight = intervals.get(right.id);
    const startDiff = (intervalLeft?.start ?? 0) - (intervalRight?.start ?? 0);
    if (startDiff !== 0) return startDiff;
    return left.id.localeCompare(right.id);
  });
  const allocations = resources.map((resource) => {
    const aliasGroup = aliasKeyForResource(resource);
    const interval = intervals.get(resource.id) ?? { start: 0, end: 0 };
    const plannedBytes = resourceByteEstimate(resource);
    const aliasable = resource.lifetime === "transient";
    let slotId = `slot:${resource.id}`;
    if (aliasable) {
      const candidates = (slotsByAlias.get(aliasGroup) ?? []).filter((slot) => slot.end < interval.start).sort((left, right) => left.bytes - right.bytes);
      const selected = candidates[0];
      if (selected) {
        slotId = selected.id;
        selected.end = interval.end;
        selected.bytes = Math.max(selected.bytes, plannedBytes);
      } else {
        slotId = `slot:transient:${aliasGroup}:${transientSlotCounter}`;
        transientSlotCounter += 1;
        const created = {
          id: slotId,
          aliasGroup,
          end: interval.end,
          bytes: plannedBytes
        };
        const bucket = slotsByAlias.get(aliasGroup);
        if (bucket) bucket.push(created);
        else slotsByAlias.set(aliasGroup, [created]);
        slotState.set(slotId, created);
      }
    }
    if (!slotState.has(slotId)) {
      slotState.set(slotId, {
        id: slotId,
        aliasGroup,
        end: interval.end,
        bytes: plannedBytes
      });
    } else {
      const state = slotState.get(slotId);
      if (state) {
        state.end = Math.max(state.end, interval.end);
        state.bytes = Math.max(state.bytes, plannedBytes);
      }
    }
    return {
      resourceId: resource.id,
      lifetime: resource.lifetime,
      aliasGroup,
      slot: slotId,
      interval,
      aliasable,
      plannedBytes
    };
  });
  const maxNodeIndex = Math.max(0, orderedNodes.length - 1);
  let peakTransientBytes = 0;
  for (let index = 0; index <= maxNodeIndex; index += 1) {
    const activeTransientSlots = /* @__PURE__ */ new Set();
    allocations.forEach((allocation) => {
      if (!allocation.aliasable) return;
      if (index < allocation.interval.start || index > allocation.interval.end) return;
      activeTransientSlots.add(allocation.slot);
    });
    let frameBytes = 0;
    activeTransientSlots.forEach((slotId) => {
      frameBytes += slotState.get(slotId)?.bytes ?? 0;
    });
    peakTransientBytes = Math.max(peakTransientBytes, frameBytes);
  }
  const totalPlannedBytes = Array.from(slotState.values()).reduce((sum, slot) => sum + slot.bytes, 0);
  return {
    allocations: allocations.sort((left, right) => left.resourceId.localeCompare(right.resourceId)),
    peakTransientBytes,
    totalPlannedBytes
  };
};
const buildExecutionSteps = (orderedNodes, compiledPassByNodeId, barriers) => {
  const barriersByNode = /* @__PURE__ */ new Map();
  barriers.forEach((barrier) => {
    const bucket = barriersByNode.get(barrier.toNodeId);
    if (bucket) bucket.push(barrier);
    else barriersByNode.set(barrier.toNodeId, [barrier]);
  });
  const steps = [];
  orderedNodes.forEach((node, index) => {
    const compiledPass = compiledPassByNodeId.get(node.id);
    if (!compiledPass) {
      throw new Error(`Missing compiled pass for node "${node.id}".`);
    }
    steps.push({
      id: `step${index}`,
      nodeId: node.id,
      signature: compiledPass.signature,
      variant: variantOfPass(),
      compiledPass,
      barriersBefore: barriersByNode.get(node.id) ?? []
    });
  });
  return steps;
};
const scoreExecutionPlan = (steps, _allocations, peakTransientBytes, totalPlannedBytes, barrierCount) => {
  const runCost = steps.length;
  const memoryCost = totalPlannedBytes / 1e6;
  const barrierCost = barrierCount / Math.max(steps.length, 1);
  const score = runCost * 0.55 + memoryCost * 0.35 + barrierCost * 0.1;
  return {
    score,
    scoreBreakdown: {
      runCost,
      memoryCost,
      barrierCost
    },
    peakTransientBytes,
    totalPlannedBytes,
    barrierCount,
    nodeOrder: steps.map((step) => step.nodeId)
  };
};
const validateExecutionPlan = (plan) => {
  const issues = [];
  const nodeIds = new Set(plan.sourceGraph.nodes.map((node) => node.id));
  const sourceResourceById = new Map(plan.sourceGraph.resources.map((resource) => [resource.id, resource]));
  const stepIds = /* @__PURE__ */ new Set();
  const stepNodeIds = /* @__PURE__ */ new Set();
  const nodeOrderIndex = /* @__PURE__ */ new Map();
  plan.steps.forEach((step, index) => {
    nodeOrderIndex.set(step.nodeId, index);
  });
  plan.steps.forEach((step) => {
    if (stepIds.has(step.id)) {
      issues.push({
        type: "error",
        code: "DUPLICATE_STEP_ID",
        message: `Execution step id "${step.id}" is duplicated.`
      });
    } else {
      stepIds.add(step.id);
    }
    if (!nodeIds.has(step.nodeId)) {
      issues.push({
        type: "error",
        code: "STEP_NODE_NOT_FOUND",
        message: `Execution step "${step.id}" references unknown node "${step.nodeId}".`
      });
    }
    stepNodeIds.add(step.nodeId);
  });
  plan.barriers.forEach((barrier) => {
    if (!stepNodeIds.has(barrier.fromNodeId) || !stepNodeIds.has(barrier.toNodeId)) {
      issues.push({
        type: "error",
        code: "BARRIER_STEP_NOT_FOUND",
        message: `Barrier ${barrier.fromNodeId} -> ${barrier.toNodeId} references non-executable step nodes.`
      });
      return;
    }
    const fromIndex = nodeOrderIndex.get(barrier.fromNodeId) ?? -1;
    const toIndex = nodeOrderIndex.get(barrier.toNodeId) ?? -1;
    if (fromIndex >= toIndex) {
      issues.push({
        type: "error",
        code: "BARRIER_ORDER_INVALID",
        message: `Barrier ${barrier.fromNodeId} -> ${barrier.toNodeId} violates execution order.`
      });
    }
  });
  const nonAliasableSlots = /* @__PURE__ */ new Map();
  const allocationSlotByResourceId = /* @__PURE__ */ new Map();
  const bySlot = /* @__PURE__ */ new Map();
  plan.resources.forEach((allocation) => {
    const spec = sourceResourceById.get(allocation.resourceId);
    if (!spec) {
      issues.push({
        type: "error",
        code: "ALLOCATION_RESOURCE_NOT_FOUND",
        message: `Resource allocation "${allocation.resourceId}" is not declared in sourceGraph.resources.`
      });
    }
    const existingSlot = allocationSlotByResourceId.get(allocation.resourceId);
    if (existingSlot) {
      issues.push({
        type: "error",
        code: "RESOURCE_SLOT_DUPLICATE",
        message: `Resource "${allocation.resourceId}" has multiple slot allocations ("${existingSlot}", "${allocation.slot}").`
      });
    } else {
      allocationSlotByResourceId.set(allocation.resourceId, allocation.slot);
    }
    if (allocation.interval.start > allocation.interval.end) {
      issues.push({
        type: "error",
        code: "RESOURCE_INTERVAL_INVALID",
        message: `Resource allocation "${allocation.resourceId}" has invalid interval ${allocation.interval.start}:${allocation.interval.end}.`
      });
    }
    if (!allocation.aliasable && allocation.slot.includes("transient")) {
      issues.push({
        type: "warning",
        code: "NON_ALIASABLE_TRANSIENT_SLOT",
        message: `Resource allocation "${allocation.resourceId}" is non-aliasable but uses transient slot "${allocation.slot}".`
      });
    }
    const items = bySlot.get(allocation.slot);
    const entry = {
      id: allocation.resourceId,
      start: allocation.interval.start,
      end: allocation.interval.end,
      aliasable: allocation.aliasable,
      aliasGroup: allocation.aliasGroup,
      lifetime: allocation.lifetime
    };
    if (items) items.push(entry);
    else bySlot.set(allocation.slot, [entry]);
    if (!allocation.aliasable) {
      const existing = nonAliasableSlots.get(allocation.slot);
      if (existing && existing !== allocation.resourceId) {
        issues.push({
          type: "error",
          code: "NON_ALIASABLE_SLOT_COLLISION",
          message: `Non-aliasable resources "${existing}" and "${allocation.resourceId}" share slot "${allocation.slot}".`
        });
      } else {
        nonAliasableSlots.set(allocation.slot, allocation.resourceId);
      }
    }
  });
  sourceResourceById.forEach((resource, resourceId) => {
    if (resource.lifetime === "external") return;
    if (allocationSlotByResourceId.has(resourceId)) return;
    issues.push({
      type: "error",
      code: "RESOURCE_SLOT_UNRESOLVED",
      message: `Resource "${resourceId}" has no slot allocation in plan.resources.`
    });
  });
  bySlot.forEach((entries, slot) => {
    if (entries.length <= 1) return;
    for (let index = 0; index < entries.length; index += 1) {
      const left = entries[index];
      if (!left) continue;
      for (let next = index + 1; next < entries.length; next += 1) {
        const right = entries[next];
        if (!right) continue;
        const overlap = left.start <= right.end && right.start <= left.end;
        if (!overlap) continue;
        if (left.aliasable && right.aliasable && left.aliasGroup === right.aliasGroup && left.lifetime === right.lifetime) {
          continue;
        }
        issues.push({
          type: "error",
          code: "SLOT_INTERVAL_COLLISION",
          message: `Slot "${slot}" overlaps for "${left.id}" and "${right.id}" with incompatible aliasing.`
        });
      }
    }
  });
  const expectedNodeOrder = plan.steps.map((step) => step.nodeId);
  if (plan.diagnostics.nodeOrder.length !== expectedNodeOrder.length || plan.diagnostics.nodeOrder.some((nodeId, index) => nodeId !== expectedNodeOrder[index])) {
    issues.push({
      type: "warning",
      code: "DIAGNOSTIC_NODE_ORDER_MISMATCH",
      message: "Plan diagnostics nodeOrder diverges from executable step order."
    });
  }
  return issues;
};
const throwOnExecutionPlanErrors = (issues, label = "HydraExecutionPlan") => {
  const errors = issues.filter((issue) => issue.type === "error");
  if (errors.length <= 0) return;
  const detail = errors.map((issue) => `${issue.code}: ${issue.message}`).join("\n");
  throw new Error(`${label} validation failed:
${detail}`);
};
const hashString = (value = "") => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};
const serializePlanShape = (input) => {
  const data = {
    nodeSignatures: input.nodeSignatures,
    resources: input.resources,
    variants: input.variants
  };
  return JSON.stringify(data);
};
const compileGraph = (transforms, {
  maxDynamicUniforms = 256,
  graphId = "hydra-dsl-graph",
  validate = true,
  shouldValidatePlan = true,
  onDebug
} = {}) => {
  const graph = lowerDslToIr(transforms, { maxDynamicUniforms, graphId, validate });
  const orderedNodes = inferAndOrderNodes(graph);
  const barriers = buildExecutionBarriers(graph.edges, orderedNodes.map((node) => node.id));
  const compiledPassByNodeId = /* @__PURE__ */ new Map();
  orderedNodes.forEach((node) => {
    const compiled = compileWgslPass(node.transforms, maxDynamicUniforms);
    compiledPassByNodeId.set(node.id, compiled);
    if (onDebug) {
      onDebug({
        type: "shader-generated",
        nodeId: node.id,
        signature: compiled.signature,
        wgsl: compiled.wgsl,
        timestamp: Date.now()
      });
    }
  });
  const steps = buildExecutionSteps(
    orderedNodes,
    compiledPassByNodeId,
    barriers
  );
  const resourcePlan = planResourceAllocations(graph, orderedNodes);
  const resources = resourcePlan.allocations;
  const diagnostics = scoreExecutionPlan(
    steps,
    resources,
    resourcePlan.peakTransientBytes,
    resourcePlan.totalPlannedBytes,
    barriers.length
  );
  const serializedShape = serializePlanShape({
    nodeSignatures: steps.map((step) => step.signature),
    resources: resources.map((resource) => ({
      id: resource.resourceId,
      slot: resource.slot,
      aliasGroup: resource.aliasGroup,
      bytes: resource.plannedBytes
    })),
    variants: steps.map((step) => step.variant)
  });
  const cacheKey = `plan|${hashString(serializedShape)}`;
  const plan = {
    version: "1.0",
    executionPolicy: {
      deterministic: true
    },
    id: `plan-${hashString(`${graph.id}:${cacheKey}`)}`,
    sourceGraph: graph,
    steps,
    barriers,
    resources,
    diagnostics,
    cacheKey
  };
  if (shouldValidatePlan) {
    const planIssues = validateExecutionPlan(plan);
    throwOnExecutionPlanErrors(planIssues);
  }
  return plan;
};
class HydraGraphNode {
  transforms;
  type = "HydraGraphNode";
  defaultOutput;
  maxDynamicUniforms;
  onCompileError;
  constructor({ initialTransform, defaultOutput, maxDynamicUniforms = 256, onCompileError }) {
    this.transforms = [initialTransform];
    this.defaultOutput = defaultOutput;
    this.maxDynamicUniforms = maxDynamicUniforms;
    this.onCompileError = onCompileError;
  }
  clone() {
    const SourceClass = this.constructor;
    const firstTransform = this.transforms[0];
    if (!firstTransform) throw new Error("Cannot clone an empty Hydra graph node.");
    const cloned = new SourceClass({
      initialTransform: firstTransform,
      defaultOutput: this.defaultOutput,
      maxDynamicUniforms: this.maxDynamicUniforms,
      onCompileError: this.onCompileError
    });
    cloned.transforms.splice(
      0,
      cloned.transforms.length,
      ...this.transforms.map((transform) => ({
        ...transform,
        userArgs: transform.userArgs.slice()
      }))
    );
    return cloned;
  }
  out(targetOutput) {
    const output = targetOutput ?? this.defaultOutput;
    if (!output) return;
    if (output.renderGraph) {
      output.renderGraph({
        transforms: this.transforms.slice(),
        compilePasses: () => this.wgsl(),
        compilePlan: () => this.plan()
      });
      return;
    }
    output.render(this.wgsl());
  }
  wgsl() {
    if (this.transforms.length === 0) return [];
    return splitPasses(this.transforms).map((pass) => this.compile(pass));
  }
  plan() {
    return compileGraph(this.transforms, {
      maxDynamicUniforms: this.maxDynamicUniforms
    });
  }
  compile(transforms) {
    try {
      return compileWgslPass(transforms, this.maxDynamicUniforms);
    } catch (error) {
      const transformName = transforms[transforms.length - 1]?.name ?? "unknown";
      if (this.onCompileError) this.onCompileError(transformName, error);
      throw error;
    }
  }
}
const typeLookup = {
  src: {
    returnType: "vec4f",
    args: [{ type: "vec2", name: "_st", default: void 0 }]
  },
  coord: {
    returnType: "vec2f",
    args: [{ type: "vec2", name: "_st", default: void 0 }]
  },
  color: {
    returnType: "vec4f",
    args: [{ type: "vec4", name: "_c0", default: void 0 }]
  },
  combine: {
    returnType: "vec4f",
    args: [
      { type: "vec4", name: "_c0", default: void 0 },
      { type: "vec4", name: "_c1", default: void 0 }
    ]
  },
  combineCoord: {
    returnType: "vec2f",
    args: [
      { type: "vec2", name: "_st", default: void 0 },
      { type: "vec4", name: "_c0", default: void 0 }
    ]
  },
  renderpass: {
    returnType: "vec4f",
    args: [{ type: "vec2", name: "_st", default: void 0 }]
  }
};
const typeToWgsl = (type) => {
  switch (type) {
    case "float":
      return "f32";
    case "vec2":
      return "vec2f";
    case "vec3":
      return "vec3f";
    case "vec4":
      return "vec4f";
    case "sampler2D":
      return "texture_2d<f32>";
    default:
      return "f32";
  }
};
const normalizeSchedule = (definition) => {
  const scale = Number(definition.resolutionScale ?? 1);
  const resolutionScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  return {
    resolutionScale,
    updateRate: definition.updateRate ?? "everyFrame",
    sparse: Boolean(definition.sparse)
  };
};
const processTransformDefinition = (definition) => {
  const typeConfig = typeLookup[definition.type];
  if (!typeConfig) {
    throw new Error(`Unsupported transform type: ${definition.type}`);
  }
  if (typeof definition.wgsl !== "string" || definition.wgsl.trim() === "") {
    throw new Error(`Transform "${definition.name}" must define a non-empty wgsl body.`);
  }
  const inputs = typeConfig.args.concat(definition.inputs ?? []);
  const args = inputs.map((input) => `${input.name}: ${typeToWgsl(input.type)}`).join(", ");
  const wgslFunction = `
fn ${definition.name}(${args}) -> ${typeConfig.returnType} {
${definition.wgsl}
}
`;
  return {
    ...definition,
    inputs: inputs.slice(1),
    wgsl: wgslFunction,
    wgsl_return_type: typeConfig.returnType,
    schedule: normalizeSchedule(definition)
  };
};
class HydraTransformRegistry {
  generators = {};
  defaultOutput;
  onChange;
  onCompileError;
  sourceClass;
  transforms = {};
  constructor(options) {
    this.defaultOutput = options.defaultOutput;
    this.onChange = options.onChange;
    this.onCompileError = options.onCompileError;
    this.sourceClass = class extends HydraGraphNode {
    };
    this.registerTransforms(getDefaultTransforms());
    const extensions = options.extendTransforms;
    if (Array.isArray(extensions)) this.registerTransforms(extensions);
    else if (extensions) this.registerTransform(extensions);
  }
  registerTransforms(definitions) {
    for (const definition of definitions) this.registerTransform(definition);
  }
  registerTransform(definition) {
    const processed = processTransformDefinition(definition);
    this.transforms[processed.name] = processed;
    this.addMethod(processed.name, processed);
  }
  getTransform(name) {
    return this.transforms[name];
  }
  listTransforms() {
    return Object.keys(this.transforms);
  }
  attachToBindings(bindings) {
    for (const [name, generator] of Object.entries(this.generators)) {
      bindings[name] = generator;
    }
    for (const name of Object.keys(this.transforms)) {
      if (typeof bindings[name] === "function") continue;
      bindings[name] = this.createBindingProxy(name);
    }
    bindings.registerFunction = (definition) => {
      this.registerTransform(definition);
      bindings[definition.name] = this.createBindingProxy(definition.name);
    };
  }
  createBindingProxy(name) {
    const directGenerator = this.generators[name];
    if (typeof directGenerator === "function") return directGenerator;
    return (...args) => {
      const solidGenerator = this.generators.solid;
      if (typeof solidGenerator !== "function") {
        throw new Error(`Transform "${name}" is chain-only and requires a source generator.`);
      }
      const node = solidGenerator(0, 0, 0, 0);
      const method = node[name];
      if (typeof method !== "function") {
        throw new Error(`Transform "${name}" is not available on Hydra graph nodes.`);
      }
      return method.apply(node, args);
    };
  }
  addMethod(method, transform) {
    const sourceClass = this.sourceClass;
    const registry = this;
    if (transform.type === "src") {
      this.generators[method] = (...args) => new sourceClass({
        initialTransform: {
          name: method,
          transform,
          userArgs: args,
          synth: registry
        },
        defaultOutput: this.defaultOutput,
        onCompileError: this.onCompileError
      });
    } else {
      Object.defineProperty(sourceClass.prototype, method, {
        configurable: true,
        enumerable: false,
        writable: true,
        value: function(...args) {
          const node = this;
          node.transforms.push({
            name: method,
            transform,
            userArgs: args,
            synth: registry
          });
          return node;
        }
      });
    }
    this.emitChange({ type: "add", method });
  }
  emitChange(event) {
    if (this.onChange) this.onChange(event);
  }
}
const normalizeEvenCanvasDimension = (value, fallback) => {
  const fallbackSource = typeof fallback === "number" && Number.isFinite(fallback) && fallback > 0 ? fallback : 2;
  const source = typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallbackSource;
  const integer = Math.floor(source);
  const evenInteger = integer % 2 === 0 ? integer : integer - 1;
  return Math.max(2, evenInteger);
};
class BrowserHost {
  canvas;
  ownsCanvas;
  requestFrame;
  cancelFrame;
  parent;
  rafHandle = null;
  lastFrameTime = null;
  disposed = false;
  attachedToDom = false;
  displayMode = "stretch";
  constructor({
    canvas,
    width = canvas?.width ?? 1280,
    height = canvas?.height ?? 720,
    parent = document.body,
    autoAppend = true
  } = {}) {
    this.requestFrame = window.requestAnimationFrame.bind(window);
    this.cancelFrame = window.cancelAnimationFrame.bind(window);
    this.parent = parent;
    if (canvas) {
      this.canvas = canvas;
      this.canvas.width = normalizeEvenCanvasDimension(width, 1280);
      this.canvas.height = normalizeEvenCanvasDimension(height, 720);
      this.ownsCanvas = false;
      this.attachedToDom = Boolean(canvas.parentElement);
    } else {
      this.canvas = document.createElement("canvas");
      this.canvas.width = normalizeEvenCanvasDimension(width, 1280);
      this.canvas.height = normalizeEvenCanvasDimension(height, 720);
      this.canvas.style.width = "100%";
      this.canvas.style.height = "100%";
      this.canvas.style.imageRendering = "pixelated";
      this.ownsCanvas = true;
      if (autoAppend) {
        this.parent.appendChild(this.canvas);
        this.attachedToDom = true;
      }
    }
  }
  append() {
    if (this.attachedToDom || !this.ownsCanvas) return;
    this.parent.appendChild(this.canvas);
    this.attachedToDom = true;
  }
  get isRunning() {
    return this.rafHandle !== null;
  }
  start(onFrame) {
    if (this.disposed || this.rafHandle !== null) return;
    const frame = (timestamp) => {
      if (this.disposed) return;
      if (this.lastFrameTime === null) this.lastFrameTime = timestamp;
      const delta = timestamp - this.lastFrameTime;
      this.lastFrameTime = timestamp;
      onFrame(delta);
      this.rafHandle = this.requestFrame(frame);
    };
    this.rafHandle = this.requestFrame(frame);
  }
  stop() {
    if (this.rafHandle === null) return;
    this.cancelFrame(this.rafHandle);
    this.rafHandle = null;
    this.lastFrameTime = null;
  }
  setResolution(width, height) {
    this.canvas.width = normalizeEvenCanvasDimension(width, this.canvas.width);
    this.canvas.height = normalizeEvenCanvasDimension(height, this.canvas.height);
  }
  setCanvasDisplay(width, height, options) {
    const nativeSize = options?.nativeSize !== false;
    this.canvas.width = normalizeEvenCanvasDimension(width, this.canvas.width);
    this.canvas.height = normalizeEvenCanvasDimension(height, this.canvas.height);
    const style = this.canvas.style;
    style.display = "block";
    style.position = "fixed";
    style.top = "50%";
    style.left = "50%";
    style.transform = "translate(-50%, -50%)";
    style.margin = "0";
    style.imageRendering = "pixelated";
    style.maxWidth = "100%";
    style.maxHeight = "100vh";
    style.objectFit = "contain";
    if (nativeSize) {
      style.width = `${this.canvas.width}px`;
      style.height = `${this.canvas.height}px`;
    } else {
      style.width = "";
      style.height = "";
    }
    this.displayMode = "fixed";
  }
  resetCanvasDisplay() {
    const style = this.canvas.style;
    style.width = "100%";
    style.height = "100%";
    style.position = "";
    style.top = "";
    style.left = "";
    style.transform = "";
    style.maxWidth = "";
    style.maxHeight = "";
    style.objectFit = "";
    style.display = "";
    style.margin = "";
    style.imageRendering = "pixelated";
    this.displayMode = "stretch";
  }
  getDisplayMode() {
    return this.displayMode;
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    if (this.ownsCanvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
    this.attachedToDom = false;
  }
}
const BYTES_PER_ROW_ALIGNMENT = 256;
const bytesPerPixel = (format) => format === "rgba16float" ? 8 : 4;
const alignTo = (value, alignment) => Math.ceil(value / alignment) * alignment;
const createReadbackBuffer = (device, width, height, format = "rgba16float") => {
  const bpp = bytesPerPixel(format);
  const bytesPerRow = width * bpp;
  const paddedBytesPerRow = alignTo(bytesPerRow, BYTES_PER_ROW_ALIGNMENT);
  const bufferSize = paddedBytesPerRow * height;
  const buffer = device.createBuffer({
    label: `hydra-capture-readback-${format}`,
    size: bufferSize,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
  });
  return { buffer, bytesPerRow, paddedBytesPerRow, bufferSize, width, height, format };
};
const readbackTexture = (encoder, texture, info) => {
  encoder.copyTextureToBuffer(
    { texture },
    {
      buffer: info.buffer,
      bytesPerRow: info.paddedBytesPerRow,
      rowsPerImage: info.height
    },
    {
      width: info.width,
      height: info.height,
      depthOrArrayLayers: 1
    }
  );
};
const FULLSCREEN_VERTEX_WGSL = `
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
`;
const CONVERSION_FRAGMENT_WGSL = `
@group(0) @binding(0) var tex0: texture_2d<f32>;

@fragment
fn fsMain(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
  // Direct sample followed by UNORM quantization in the render target.
  // Note: rgba8unorm does not apply sRGB transfer automatically.
  let color = textureLoad(tex0, vec2i(fragCoord.xy), 0);
  
  // Force opaque alpha for video capture (composites over black effectively)
  return vec4f(color.rgb, 1.0);
}
`;
const conversionContextByDevice = /* @__PURE__ */ new WeakMap();
const getConversionContext = (device) => {
  const cached = conversionContextByDevice.get(device);
  if (cached) return cached;
  const vertexModule = device.createShaderModule({
    label: "hydra-capture-vertex",
    code: FULLSCREEN_VERTEX_WGSL
  });
  const fragmentModule = device.createShaderModule({
    label: "hydra-capture-fragment",
    code: CONVERSION_FRAGMENT_WGSL
  });
  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } }
    ]
  });
  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout]
  });
  const pipeline = device.createRenderPipeline({
    label: "hydra-capture-conversion-pipeline",
    layout: pipelineLayout,
    vertex: {
      module: vertexModule,
      entryPoint: "vsMain"
    },
    fragment: {
      module: fragmentModule,
      entryPoint: "fsMain",
      targets: [{ format: "rgba8unorm" }]
    },
    primitive: {
      topology: "triangle-list"
    }
  });
  const created = { pipeline, bindGroupLayout };
  conversionContextByDevice.set(device, created);
  return created;
};
const readbackTextureWithConversion = (device, encoder, sourceTexture, activeInfo, intermediateTexture) => {
  const ctx = getConversionContext(device);
  const bindGroup = device.createBindGroup({
    layout: ctx.bindGroupLayout,
    entries: [
      { binding: 0, resource: sourceTexture.createView() }
    ]
  });
  const pass = encoder.beginRenderPass({
    label: "hydra-capture-conversion-pass",
    colorAttachments: [{
      view: intermediateTexture.createView(),
      loadOp: "clear",
      storeOp: "store",
      clearValue: { r: 0, g: 0, b: 0, a: 1 }
    }]
  });
  pass.setPipeline(ctx.pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.draw(3, 1, 0, 0);
  pass.end();
  encoder.copyTextureToBuffer(
    { texture: intermediateTexture },
    {
      buffer: activeInfo.buffer,
      bytesPerRow: activeInfo.paddedBytesPerRow,
      rowsPerImage: activeInfo.height
    },
    {
      width: activeInfo.width,
      height: activeInfo.height,
      depthOrArrayLayers: 1
    }
  );
};
const createintermediateConversionTexture = (device, width, height) => {
  return device.createTexture({
    label: "hydra-capture-intermediate-rgba8",
    size: [width, height],
    format: "rgba8unorm",
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING
  });
};
const mapReadbackBuffer = async (buffer, timeoutMs = 5e3) => {
  const mapPromise = buffer.mapAsync(GPUMapMode.READ);
  if (timeoutMs > 0 && timeoutMs < Infinity) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`GPU readback timeout after ${timeoutMs}ms`)), timeoutMs);
    });
    await Promise.race([mapPromise, timeoutPromise]);
  } else {
    await mapPromise;
  }
  const data = buffer.getMappedRange().slice(0);
  return {
    data,
    unmap: () => {
      try {
        buffer.unmap();
      } catch {
      }
    }
  };
};
const stripRowPadding = (source, width, height, paddedBytesPerRow) => {
  const bytesPerRow = width * 4;
  if (paddedBytesPerRow === bytesPerRow) {
    return new Uint8ClampedArray(source, 0, width * height * 4);
  }
  const output = new Uint8ClampedArray(width * height * 4);
  const sourceBytes = new Uint8Array(source);
  for (let y = 0; y < height; y += 1) {
    const srcOffset = y * paddedBytesPerRow;
    const dstOffset = y * bytesPerRow;
    output.set(sourceBytes.subarray(srcOffset, srcOffset + bytesPerRow), dstOffset);
  }
  return output;
};
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var MAX_SIZE = Math.pow(2, 32);
var MAX_UINT32 = Math.pow(2, 32) - 1;
var TKHD_FLAG_ENABLED = 1;
var TKHD_FLAG_IN_MOVIE = 2;
var TKHD_FLAG_IN_PREVIEW = 4;
var TFHD_FLAG_BASE_DATA_OFFSET = 1;
var TFHD_FLAG_SAMPLE_DESC = 2;
var TFHD_FLAG_SAMPLE_DUR = 8;
var TFHD_FLAG_SAMPLE_SIZE = 16;
var TFHD_FLAG_SAMPLE_FLAGS = 32;
var TFHD_FLAG_DEFAULT_BASE_IS_MOOF = 131072;
var TRUN_FLAGS_DATA_OFFSET = 1;
var TRUN_FLAGS_FIRST_FLAG = 4;
var TRUN_FLAGS_DURATION = 256;
var TRUN_FLAGS_SIZE = 512;
var TRUN_FLAGS_FLAGS = 1024;
var TRUN_FLAGS_CTS_OFFSET = 2048;
var ERR_INVALID_DATA = -1;
var ERR_NOT_ENOUGH_DATA = 0;
var OK = 1;
var MP4BoxBuffer = class _MP4BoxBuffer extends ArrayBuffer {
  constructor(byteLength) {
    super(byteLength);
    this.fileStart = 0;
    this.usedBytes = 0;
  }
  static fromArrayBuffer(buffer, fileStart) {
    const mp4BoxBuffer = new _MP4BoxBuffer(buffer.byteLength);
    const view = new Uint8Array(mp4BoxBuffer);
    view.set(new Uint8Array(buffer));
    mp4BoxBuffer.fileStart = fileStart;
    return mp4BoxBuffer;
  }
};
var DataStream = (_a = class {
  /**
   * DataStream reads scalars, arrays and structs of data from an ArrayBuffer.
   * It's like a file-like DataView on steroids.
   *
   * @param arrayBuffer ArrayBuffer to read from.
   * @param byteOffset Offset from arrayBuffer beginning for the DataStream.
   * @param endianness Endianness of the DataStream (default: BIG_ENDIAN).
   */
  constructor(arrayBuffer, byteOffset, endianness) {
    __privateAdd(this, __DataStream_instances);
    this._byteLength = 0;
    this.failurePosition = 0;
    this._dynamicSize = 1;
    this._byteOffset = byteOffset || 0;
    if (arrayBuffer instanceof ArrayBuffer) {
      this.buffer = MP4BoxBuffer.fromArrayBuffer(arrayBuffer, 0);
    } else if (arrayBuffer instanceof DataView) {
      this.dataView = arrayBuffer;
      if (byteOffset) this._byteOffset += byteOffset;
    } else {
      this.buffer = new MP4BoxBuffer(arrayBuffer || 0);
    }
    this.position = 0;
    this.endianness = endianness ? endianness : 1;
  }
  getPosition() {
    return this.position;
  }
  /**
   * Internal function to resize the DataStream buffer when required.
   * @param extra Number of bytes to add to the buffer allocation.
   */
  _realloc(extra) {
    if (!this._dynamicSize) {
      return;
    }
    const req = this._byteOffset + this.position + extra;
    let blen = this._buffer.byteLength;
    if (req <= blen) {
      if (req > this._byteLength) {
        this._byteLength = req;
      }
      return;
    }
    if (blen < 1) {
      blen = 1;
    }
    while (req > blen) {
      blen *= 2;
    }
    const buf = new MP4BoxBuffer(blen);
    const src = new Uint8Array(this._buffer);
    const dst = new Uint8Array(buf, 0, src.length);
    dst.set(src);
    this.buffer = buf;
    this._byteLength = req;
  }
  /**
   * Internal function to trim the DataStream buffer when required.
   * Used for stripping out the extra bytes from the backing buffer when
   * the virtual byteLength is smaller than the buffer byteLength (happens after
   * growing the buffer with writes and not filling the extra space completely).
   */
  _trimAlloc() {
    if (this._byteLength === this._buffer.byteLength) {
      return;
    }
    const buf = new MP4BoxBuffer(this._byteLength);
    const dst = new Uint8Array(buf);
    const src = new Uint8Array(this._buffer, 0, dst.length);
    dst.set(src);
    this.buffer = buf;
  }
  /**
   * Returns the byte length of the DataStream object.
   * @type {number}
   */
  get byteLength() {
    return this._byteLength - this._byteOffset;
  }
  /**
   * Set/get the backing ArrayBuffer of the DataStream object.
   * The setter updates the DataView to point to the new buffer.
   * @type {Object}
   */
  get buffer() {
    this._trimAlloc();
    return this._buffer;
  }
  set buffer(value) {
    this._buffer = value;
    this._dataView = new DataView(value, this._byteOffset);
    this._byteLength = value.byteLength;
  }
  /**
   * Set/get the byteOffset of the DataStream object.
   * The setter updates the DataView to point to the new byteOffset.
   * @type {number}
   */
  get byteOffset() {
    return this._byteOffset;
  }
  set byteOffset(value) {
    this._byteOffset = value;
    this._dataView = new DataView(this._buffer, this._byteOffset);
    this._byteLength = this._buffer.byteLength;
  }
  /**
   * Set/get the byteOffset of the DataStream object.
   * The setter updates the DataView to point to the new byteOffset.
   * @type {number}
   */
  get dataView() {
    return this._dataView;
  }
  set dataView(value) {
    this._byteOffset = value.byteOffset;
    this._buffer = MP4BoxBuffer.fromArrayBuffer(value.buffer, 0);
    this._dataView = new DataView(this._buffer, this._byteOffset);
    this._byteLength = this._byteOffset + value.byteLength;
  }
  /**
   *   Sets the DataStream read/write position to given position.
   *   Clamps between 0 and DataStream length.
   *
   *   @param pos Position to seek to.
   *   @return
   */
  seek(pos) {
    const npos = Math.max(0, Math.min(this.byteLength, pos));
    this.position = isNaN(npos) || !isFinite(npos) ? 0 : npos;
  }
  /**
   * Returns true if the DataStream seek pointer is at the end of buffer and
   * there's no more data to read.
   *
   * @return True if the seek pointer is at the end of the buffer.
   */
  isEof() {
    return this.position >= this._byteLength;
  }
  /**
   * Maps a Uint8Array into the DataStream buffer.
   *
   * Nice for quickly reading in data.
   *
   * @param length Number of elements to map.
   * @param e Endianness of the data to read.
   * @return Uint8Array to the DataStream backing buffer.
   */
  mapUint8Array(length) {
    this._realloc(length * 1);
    const arr = new Uint8Array(this._buffer, this.byteOffset + this.position, length);
    this.position += length * 1;
    return arr;
  }
  /**
   * Reads an Int32Array of desired length and endianness from the DataStream.
   *
   * @param length Number of elements to map.
   * @param endianness Endianness of the data to read.
   * @return The read Int32Array.
   */
  readInt32Array(length, endianness) {
    length = length === void 0 ? this.byteLength - this.position / 4 : length;
    const arr = new Int32Array(length);
    _a.memcpy(
      arr.buffer,
      0,
      this.buffer,
      this.byteOffset + this.position,
      length * arr.BYTES_PER_ELEMENT
    );
    _a.arrayToNative(arr, endianness ?? this.endianness);
    this.position += arr.byteLength;
    return arr;
  }
  /**
   * Reads an Int16Array of desired length and endianness from the DataStream.
   *
   * @param length Number of elements to map.
   * @param endianness Endianness of the data to read.
   * @return The read Int16Array.
   */
  readInt16Array(length, endianness) {
    length = length === void 0 ? this.byteLength - this.position / 2 : length;
    const arr = new Int16Array(length);
    _a.memcpy(
      arr.buffer,
      0,
      this.buffer,
      this.byteOffset + this.position,
      length * arr.BYTES_PER_ELEMENT
    );
    _a.arrayToNative(arr, endianness ?? this.endianness);
    this.position += arr.byteLength;
    return arr;
  }
  /**
   * Reads an Int8Array of desired length from the DataStream.
   *
   * @param length Number of elements to map.
   * @param e Endianness of the data to read.
   * @return The read Int8Array.
   */
  readInt8Array(length) {
    length = length === void 0 ? this.byteLength - this.position : length;
    const arr = new Int8Array(length);
    _a.memcpy(
      arr.buffer,
      0,
      this.buffer,
      this.byteOffset + this.position,
      length * arr.BYTES_PER_ELEMENT
    );
    this.position += arr.byteLength;
    return arr;
  }
  /**
   * Reads a Uint32Array of desired length and endianness from the DataStream.
   *
   *  @param length Number of elements to map.
   *  @param endianness Endianness of the data to read.
   *  @return The read Uint32Array.
   */
  readUint32Array(length, endianness) {
    length = length === void 0 ? this.byteLength - this.position / 4 : length;
    const arr = new Uint32Array(length);
    _a.memcpy(
      arr.buffer,
      0,
      this.buffer,
      this.byteOffset + this.position,
      length * arr.BYTES_PER_ELEMENT
    );
    _a.arrayToNative(arr, endianness ?? this.endianness);
    this.position += arr.byteLength;
    return arr;
  }
  /**
   * Reads a Uint16Array of desired length and endianness from the DataStream.
   *
   * @param length Number of elements to map.
   * @param endianness Endianness of the data to read.
   * @return The read Uint16Array.
   */
  readUint16Array(length, endianness) {
    length = length === void 0 ? this.byteLength - this.position / 2 : length;
    const arr = new Uint16Array(length);
    _a.memcpy(
      arr.buffer,
      0,
      this.buffer,
      this.byteOffset + this.position,
      length * arr.BYTES_PER_ELEMENT
    );
    _a.arrayToNative(arr, endianness ?? this.endianness);
    this.position += arr.byteLength;
    return arr;
  }
  /**
   * Reads a Uint8Array of desired length from the DataStream.
   *
   * @param length Number of elements to map.
   * @param e Endianness of the data to read.
   * @return The read Uint8Array.
   */
  readUint8Array(length) {
    length = length === void 0 ? this.byteLength - this.position : length;
    const arr = new Uint8Array(length);
    _a.memcpy(
      arr.buffer,
      0,
      this.buffer,
      this.byteOffset + this.position,
      length * arr.BYTES_PER_ELEMENT
    );
    this.position += arr.byteLength;
    return arr;
  }
  /**
   * Reads a Float64Array of desired length and endianness from the DataStream.
   *
   * @param length Number of elements to map.
   * @param endianness Endianness of the data to read.
   * @return The read Float64Array.
   */
  readFloat64Array(length, endianness) {
    length = length === void 0 ? this.byteLength - this.position / 8 : length;
    const arr = new Float64Array(length);
    _a.memcpy(
      arr.buffer,
      0,
      this.buffer,
      this.byteOffset + this.position,
      length * arr.BYTES_PER_ELEMENT
    );
    _a.arrayToNative(arr, endianness ?? this.endianness);
    this.position += arr.byteLength;
    return arr;
  }
  /**
   * Reads a Float32Array of desired length and endianness from the DataStream.
   *
   * @param length Number of elements to map.
   * @param endianness Endianness of the data to read.
   * @return The read Float32Array.
   */
  readFloat32Array(length, endianness) {
    length = length === void 0 ? this.byteLength - this.position / 4 : length;
    const arr = new Float32Array(length);
    _a.memcpy(
      arr.buffer,
      0,
      this.buffer,
      this.byteOffset + this.position,
      length * arr.BYTES_PER_ELEMENT
    );
    _a.arrayToNative(arr, endianness ?? this.endianness);
    this.position += arr.byteLength;
    return arr;
  }
  /**
   * Reads a 32-bit int from the DataStream with the desired endianness.
   *
   * @param endianness Endianness of the number.
   * @return The read number.
   */
  readInt32(endianness) {
    const v = this._dataView.getInt32(
      this.position,
      (endianness ?? this.endianness) === 2
      /* LITTLE_ENDIAN */
    );
    this.position += 4;
    return v;
  }
  /**
   * Reads a 16-bit int from the DataStream with the desired endianness.
   *
   * @param endianness Endianness of the number.
   * @return The read number.
   */
  readInt16(endianness) {
    const v = this._dataView.getInt16(
      this.position,
      (endianness ?? this.endianness) === 2
      /* LITTLE_ENDIAN */
    );
    this.position += 2;
    return v;
  }
  /**
   * Reads an 8-bit int from the DataStream.
   *
   * @return The read number.
   */
  readInt8() {
    const v = this._dataView.getInt8(this.position);
    this.position += 1;
    return v;
  }
  /**
   * Reads a 32-bit unsigned int from the DataStream with the desired endianness.
   *
   * @param endianness Endianness of the number.
   * @return The read number.
   */
  readUint32(endianness) {
    const v = this._dataView.getUint32(
      this.position,
      (endianness ?? this.endianness) === 2
      /* LITTLE_ENDIAN */
    );
    this.position += 4;
    return v;
  }
  /**
   * Reads a 16-bit unsigned int from the DataStream with the desired endianness.
   *
   * @param endianness Endianness of the number.
   * @return The read number.
   */
  readUint16(endianness) {
    const v = this._dataView.getUint16(
      this.position,
      (endianness ?? this.endianness) === 2
      /* LITTLE_ENDIAN */
    );
    this.position += 2;
    return v;
  }
  /**
   * Reads an 8-bit unsigned int from the DataStream.
   *
   * @return The read number.
   */
  readUint8() {
    const v = this._dataView.getUint8(this.position);
    this.position += 1;
    return v;
  }
  /**
   * Reads a 32-bit float from the DataStream with the desired endianness.
   *
   * @param endianness Endianness of the number.
   * @return The read number.
   */
  readFloat32(endianness) {
    const value = this._dataView.getFloat32(
      this.position,
      (endianness ?? this.endianness) === 2
      /* LITTLE_ENDIAN */
    );
    this.position += 4;
    return value;
  }
  /**
   * Reads a 64-bit float from the DataStream with the desired endianness.
   *
   * @param endianness Endianness of the number.
   * @return The read number.
   */
  readFloat64(endianness) {
    const value = this._dataView.getFloat64(
      this.position,
      (endianness ?? this.endianness) === 2
      /* LITTLE_ENDIAN */
    );
    this.position += 8;
    return value;
  }
  /**
   * Copies byteLength bytes from the src buffer at srcOffset to the
   * dst buffer at dstOffset.
   *
   * @param dst Destination ArrayBuffer to write to.
   * @param dstOffset Offset to the destination ArrayBuffer.
   * @param src Source ArrayBuffer to read from.
   * @param srcOffset Offset to the source ArrayBuffer.
   * @param byteLength Number of bytes to copy.
   */
  static memcpy(dst, dstOffset, src, srcOffset, byteLength) {
    const dstU8 = new Uint8Array(dst, dstOffset, byteLength);
    const srcU8 = new Uint8Array(src, srcOffset, byteLength);
    dstU8.set(srcU8);
  }
  /**
   * Converts array to native endianness in-place.
   *
   * @param typedArray Typed array to convert.
   * @param endianness True if the data in the array is
   *                                      little-endian. Set false for big-endian.
   * @return The converted typed array.
   */
  static arrayToNative(typedArray, endianness) {
    if (endianness === _a.ENDIANNESS) {
      return typedArray;
    } else {
      return this.flipArrayEndianness(typedArray);
    }
  }
  /**
   * Converts native endianness array to desired endianness in-place.
   *
   * @param typedArray Typed array to convert.
   * @param littleEndian True if the converted array should be
   *                               little-endian. Set false for big-endian.
   * @return The converted typed array.
   */
  static nativeToEndian(typedArray, littleEndian) {
    if (littleEndian && _a.ENDIANNESS === 2) {
      return typedArray;
    } else {
      return this.flipArrayEndianness(typedArray);
    }
  }
  /**
   * Flips typed array endianness in-place.
   *
   * @param typedArray Typed array to flip.
   * @return The converted typed array.
   */
  static flipArrayEndianness(typedArray) {
    const u8 = new Uint8Array(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
    for (let i = 0; i < typedArray.byteLength; i += typedArray.BYTES_PER_ELEMENT) {
      for (let j = i + typedArray.BYTES_PER_ELEMENT - 1, k = i; j > k; j--, k++) {
        const tmp = u8[k];
        u8[k] = u8[j];
        u8[j] = tmp;
      }
    }
    return typedArray;
  }
  /**
   * Read a string of desired length and encoding from the DataStream.
   *
   * @param length The length of the string to read in bytes.
   * @param encoding The encoding of the string data in the DataStream.
   *                           Defaults to ASCII.
   * @return The read string.
   */
  readString(length, encoding) {
    if (encoding === void 0 || encoding === "ASCII") {
      return fromCharCodeUint8(
        this.mapUint8Array(length === void 0 ? this.byteLength - this.position : length)
      );
    } else {
      return new TextDecoder(encoding).decode(this.mapUint8Array(length));
    }
  }
  /**
   * Read null-terminated string of desired length from the DataStream. Truncates
   * the returned string so that the null byte is not a part of it.
   *
   * @param length The length of the string to read.
   * @return The read string.
   */
  readCString(length) {
    let i = 0;
    const blen = this.byteLength - this.position;
    const u8 = new Uint8Array(this._buffer, this._byteOffset + this.position);
    const len = length !== void 0 ? Math.min(length, blen) : blen;
    for (; i < len && u8[i] !== 0; i++) ;
    const s = fromCharCodeUint8(this.mapUint8Array(i));
    if (length !== void 0) {
      this.position += len - i;
    } else if (i !== blen) {
      this.position += 1;
    }
    return s;
  }
  readInt64() {
    return this.readInt32() * MAX_SIZE + this.readUint32();
  }
  readUint64() {
    return this.readUint32() * MAX_SIZE + this.readUint32();
  }
  readUint24() {
    return (this.readUint8() << 16) + (this.readUint8() << 8) + this.readUint8();
  }
  /**
   * Saves the DataStream contents to the given filename.
   * Uses Chrome's anchor download property to initiate download.
   *
   * @param filename Filename to save as.
   * @return
   * @bundle DataStream-write.js
   */
  save(filename) {
    const blob = new Blob([this.buffer]);
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      if (window.URL && URL.createObjectURL) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        document.body.appendChild(a);
        a.setAttribute("href", url);
        a.setAttribute("download", filename);
        a.setAttribute("target", "_self");
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error("DataStream.save: Can't create object URL.");
      }
    }
    return blob;
  }
  /** @bundle DataStream-write.js */
  get dynamicSize() {
    return this._dynamicSize;
  }
  /** @bundle DataStream-write.js */
  set dynamicSize(v) {
    if (!v) {
      this._trimAlloc();
    }
    this._dynamicSize = v;
  }
  /**
   * Internal function to trim the DataStream buffer when required.
   * Used for stripping out the first bytes when not needed anymore.
   *
   * @return
   * @bundle DataStream-write.js
   */
  shift(offset) {
    const buf = new MP4BoxBuffer(this._byteLength - offset);
    const dst = new Uint8Array(buf);
    const src = new Uint8Array(this._buffer, offset, dst.length);
    dst.set(src);
    this.buffer = buf;
    this.position -= offset;
  }
  /**
   * Writes an Int32Array of specified endianness to the DataStream.
   *
   * @param array The array to write.
   * @param endianness Endianness of the data to write.
   * @bundle DataStream-write.js
   */
  writeInt32Array(array, endianness) {
    this._realloc(array.length * 4);
    if (array instanceof Int32Array && this.byteOffset + this.position % array.BYTES_PER_ELEMENT === 0) {
      _a.memcpy(
        this._buffer,
        this.byteOffset + this.position,
        array.buffer,
        0,
        array.byteLength
      );
      this.mapInt32Array(array.length, endianness);
    } else {
      for (let i = 0; i < array.length; i++) {
        this.writeInt32(array[i], endianness);
      }
    }
  }
  /**
   * Writes an Int16Array of specified endianness to the DataStream.
   *
   * @param array The array to write.
   * @param endianness Endianness of the data to write.
   * @bundle DataStream-write.js
   */
  writeInt16Array(array, endianness) {
    this._realloc(array.length * 2);
    if (array instanceof Int16Array && this.byteOffset + this.position % array.BYTES_PER_ELEMENT === 0) {
      _a.memcpy(
        this._buffer,
        this.byteOffset + this.position,
        array.buffer,
        0,
        array.byteLength
      );
      this.mapInt16Array(array.length, endianness);
    } else {
      for (let i = 0; i < array.length; i++) {
        this.writeInt16(array[i], endianness);
      }
    }
  }
  /**
   * Writes an Int8Array to the DataStream.
   *
   * @param array The array to write.
   * @bundle DataStream-write.js
   */
  writeInt8Array(array) {
    this._realloc(array.length * 1);
    if (array instanceof Int8Array && this.byteOffset + this.position % array.BYTES_PER_ELEMENT === 0) {
      _a.memcpy(
        this._buffer,
        this.byteOffset + this.position,
        array.buffer,
        0,
        array.byteLength
      );
      this.mapInt8Array(array.length);
    } else {
      for (let i = 0; i < array.length; i++) {
        this.writeInt8(array[i]);
      }
    }
  }
  /**
   * Writes a Uint32Array of specified endianness to the DataStream.
   *
   * @param array The array to write.
   * @param endianness Endianness of the data to write.
   * @bundle DataStream-write.js
   */
  writeUint32Array(array, endianness) {
    this._realloc(array.length * 4);
    if (array instanceof Uint32Array && this.byteOffset + this.position % array.BYTES_PER_ELEMENT === 0) {
      _a.memcpy(
        this._buffer,
        this.byteOffset + this.position,
        array.buffer,
        0,
        array.byteLength
      );
      this.mapUint32Array(array.length, endianness);
    } else {
      for (let i = 0; i < array.length; i++) {
        this.writeUint32(array[i], endianness);
      }
    }
  }
  /**
   * Writes a Uint16Array of specified endianness to the DataStream.
   *
   * @param array The array to write.
   * @param endianness Endianness of the data to write.
   * @bundle DataStream-write.js
   */
  writeUint16Array(array, endianness) {
    this._realloc(array.length * 2);
    if (array instanceof Uint16Array && this.byteOffset + this.position % array.BYTES_PER_ELEMENT === 0) {
      _a.memcpy(
        this._buffer,
        this.byteOffset + this.position,
        array.buffer,
        0,
        array.byteLength
      );
      this.mapUint16Array(array.length, endianness);
    } else {
      for (let i = 0; i < array.length; i++) {
        this.writeUint16(array[i], endianness);
      }
    }
  }
  /**
   * Writes a Uint8Array to the DataStream.
   *
   * @param array The array to write.
   * @bundle DataStream-write.js
   */
  writeUint8Array(array) {
    this._realloc(array.length * 1);
    if (array instanceof Uint8Array && this.byteOffset + this.position % array.BYTES_PER_ELEMENT === 0) {
      _a.memcpy(
        this._buffer,
        this.byteOffset + this.position,
        array.buffer,
        0,
        array.byteLength
      );
      this.mapUint8Array(array.length);
    } else {
      for (let i = 0; i < array.length; i++) {
        this.writeUint8(array[i]);
      }
    }
  }
  /**
   * Writes a Float64Array of specified endianness to the DataStream.
   *
   * @param array The array to write.
   * @param endianness Endianness of the data to write.
   * @bundle DataStream-write.js
   */
  writeFloat64Array(array, endianness) {
    this._realloc(array.length * 8);
    if (array instanceof Float64Array && this.byteOffset + this.position % array.BYTES_PER_ELEMENT === 0) {
      _a.memcpy(
        this._buffer,
        this.byteOffset + this.position,
        array.buffer,
        0,
        array.byteLength
      );
      this.mapFloat64Array(array.length, endianness);
    } else {
      for (let i = 0; i < array.length; i++) {
        this.writeFloat64(array[i], endianness);
      }
    }
  }
  /**
   * Writes a Float32Array of specified endianness to the DataStream.
   *
   * @param array The array to write.
   * @param endianness Endianness of the data to write.
   * @bundle DataStream-write.js
   */
  writeFloat32Array(array, endianness) {
    this._realloc(array.length * 4);
    if (array instanceof Float32Array && this.byteOffset + this.position % array.BYTES_PER_ELEMENT === 0) {
      _a.memcpy(
        this._buffer,
        this.byteOffset + this.position,
        array.buffer,
        0,
        array.byteLength
      );
      this.mapFloat32Array(array.length, endianness);
    } else {
      for (let i = 0; i < array.length; i++) {
        this.writeFloat32(array[i], endianness);
      }
    }
  }
  /**
   * Writes a 64-bit int to the DataStream with the desired endianness.
   *
   * @param value Number to write.
   * @param endianness Endianness of the number.
   * @bundle DataStream-write.js
   */
  writeInt64(value, endianness) {
    this._realloc(8);
    this._dataView.setBigInt64(
      this.position,
      BigInt(value),
      (endianness ?? this.endianness) === 2
      /* LITTLE_ENDIAN */
    );
    this.position += 8;
  }
  /**
   * Writes a 32-bit int to the DataStream with the desired endianness.
   *
   * @param value Number to write.
   * @param endianness Endianness of the number.
   * @bundle DataStream-write.js
   */
  writeInt32(value, endianness) {
    this._realloc(4);
    this._dataView.setInt32(
      this.position,
      value,
      (endianness ?? this.endianness) === 2
      /* LITTLE_ENDIAN */
    );
    this.position += 4;
  }
  /**
   * Writes a 16-bit int to the DataStream with the desired endianness.
   *
   * @param value Number to write.
   * @param endianness Endianness of the number.
   * @bundle DataStream-write.js
   */
  writeInt16(value, endianness) {
    this._realloc(2);
    this._dataView.setInt16(
      this.position,
      value,
      (endianness ?? this.endianness) === 2
      /* LITTLE_ENDIAN */
    );
    this.position += 2;
  }
  /**
   * Writes an 8-bit int to the DataStream.
   *
   * @param value Number to write.
   * @bundle DataStream-write.js
   */
  writeInt8(value) {
    this._realloc(1);
    this._dataView.setInt8(this.position, value);
    this.position += 1;
  }
  /**
   * Writes a 32-bit unsigned int to the DataStream with the desired endianness.
   *
   * @param value Number to write.
   * @param endianness Endianness of the number.
   * @bundle DataStream-write.js
   */
  writeUint32(value, endianness) {
    this._realloc(4);
    this._dataView.setUint32(
      this.position,
      value,
      (endianness ?? this.endianness) === 2
      /* LITTLE_ENDIAN */
    );
    this.position += 4;
  }
  /**
   * Writes a 16-bit unsigned int to the DataStream with the desired endianness.
   *
   * @param value Number to write.
   * @param endianness Endianness of the number.
   * @bundle DataStream-write.js
   */
  writeUint16(value, endianness) {
    this._realloc(2);
    this._dataView.setUint16(
      this.position,
      value,
      (endianness ?? this.endianness) === 2
      /* LITTLE_ENDIAN */
    );
    this.position += 2;
  }
  /**
   * Writes an 8-bit unsigned  int to the DataStream.
   *
   * @param value Number to write.
   * @bundle DataStream-write.js
   */
  writeUint8(value) {
    this._realloc(1);
    this._dataView.setUint8(this.position, value);
    this.position += 1;
  }
  /**
   * Writes a 32-bit float to the DataStream with the desired endianness.
   *
   * @param value Number to write.
   * @param endianness Endianness of the number.
   * @bundle DataStream-write.js
   */
  writeFloat32(value, endianness) {
    this._realloc(4);
    this._dataView.setFloat32(
      this.position,
      value,
      (endianness ?? this.endianness) === 2
      /* LITTLE_ENDIAN */
    );
    this.position += 4;
  }
  /**
   * Writes a 64-bit float to the DataStream with the desired endianness.
   *
   * @param value Number to write.
   * @param endianness Endianness of the number.
   * @bundle DataStream-write.js
   */
  writeFloat64(value, endianness) {
    this._realloc(8);
    this._dataView.setFloat64(
      this.position,
      value,
      (endianness ?? this.endianness) === 2
      /* LITTLE_ENDIAN */
    );
    this.position += 8;
  }
  /**
   * Write a UCS-2 string of desired endianness to the DataStream. The
   * lengthOverride argument lets you define the number of characters to write.
   * If the string is shorter than lengthOverride, the extra space is padded with
   * zeroes.
   *
   * @param value The string to write.
   * @param endianness The endianness to use for the written string data.
   * @param lengthOverride The number of characters to write.
   * @bundle DataStream-write.js
   */
  writeUCS2String(value, endianness, lengthOverride) {
    if (lengthOverride === void 0) {
      lengthOverride = value.length;
    }
    let i;
    for (i = 0; i < value.length && i < lengthOverride; i++) {
      this.writeUint16(value.charCodeAt(i), endianness);
    }
    for (; i < lengthOverride; i++) {
      this.writeUint16(0);
    }
  }
  /**
   * Writes a string of desired length and encoding to the DataStream.
   *
   * @param value The string to write.
   * @param encoding The encoding for the written string data.
   *                           Defaults to ASCII.
   * @param length The number of characters to write.
   * @bundle DataStream-write.js
   */
  writeString(value, encoding, length) {
    let i = 0;
    if (encoding === void 0 || encoding === "ASCII") {
      if (length !== void 0) {
        const len = Math.min(value.length, length);
        for (i = 0; i < len; i++) {
          this.writeUint8(value.charCodeAt(i));
        }
        for (; i < length; i++) {
          this.writeUint8(0);
        }
      } else {
        for (i = 0; i < value.length; i++) {
          this.writeUint8(value.charCodeAt(i));
        }
      }
    } else {
      this.writeUint8Array(new TextEncoder(encoding).encode(value.substring(0, length)));
    }
  }
  /**
   * Writes a null-terminated string to DataStream and zero-pads it to length
   * bytes. If length is not given, writes the string followed by a zero.
   * If string is longer than length, the written part of the string does not have
   * a trailing zero.
   *
   * @param value The string to write.
   * @param length The number of characters to write.
   * @bundle DataStream-write.js
   */
  writeCString(value, length) {
    let i = 0;
    if (length !== void 0) {
      const len = Math.min(value.length, length);
      for (i = 0; i < len; i++) {
        this.writeUint8(value.charCodeAt(i));
      }
      for (; i < length; i++) {
        this.writeUint8(0);
      }
    } else {
      for (i = 0; i < value.length; i++) {
        this.writeUint8(value.charCodeAt(i));
      }
      this.writeUint8(0);
    }
  }
  /**
   * Writes a struct to the DataStream. Takes a structDefinition that gives the
   * types and a struct object that gives the values. Refer to readStruct for the
   * structure of structDefinition.
   *
   * @param structDefinition Type definition of the struct.
   * @param struct The struct data object.
   * @bundle DataStream-write.js
   */
  writeStruct(structDefinition, struct) {
    for (let i = 0; i < structDefinition.length; i++) {
      const [structName, structType] = structDefinition[i];
      const structValue = struct[structName];
      this.writeType(structType, structValue, struct);
    }
  }
  /**
   * Writes object v of type t to the DataStream.
   *
   * @param type Type of data to write.
   * @param value Value of data to write.
   * @param struct Struct to pass to write callback functions.
   * @bundle DataStream-write.js
   */
  writeType(type, value, struct) {
    if (typeof type === "function") {
      return type(this, value);
    } else if (typeof type === "object" && !(type instanceof Array)) {
      return type.set(this, value, struct);
    }
    let lengthOverride;
    let charset = "ASCII";
    const pos = this.position;
    let parsedType = type;
    if (typeof type === "string" && /:/.test(type)) {
      const tp = type.split(":");
      parsedType = tp[0];
      lengthOverride = parseInt(tp[1]);
    }
    if (typeof parsedType === "string" && /,/.test(parsedType)) {
      const tp = parsedType.split(",");
      parsedType = tp[0];
      charset = tp[1];
    }
    switch (parsedType) {
      case "uint8":
        this.writeUint8(value);
        break;
      case "int8":
        this.writeInt8(value);
        break;
      case "uint16":
        this.writeUint16(value, this.endianness);
        break;
      case "int16":
        this.writeInt16(value, this.endianness);
        break;
      case "uint32":
        this.writeUint32(value, this.endianness);
        break;
      case "int32":
        this.writeInt32(value, this.endianness);
        break;
      case "float32":
        this.writeFloat32(value, this.endianness);
        break;
      case "float64":
        this.writeFloat64(value, this.endianness);
        break;
      case "uint16be":
        this.writeUint16(
          value,
          1
          /* BIG_ENDIAN */
        );
        break;
      case "int16be":
        this.writeInt16(
          value,
          1
          /* BIG_ENDIAN */
        );
        break;
      case "uint32be":
        this.writeUint32(
          value,
          1
          /* BIG_ENDIAN */
        );
        break;
      case "int32be":
        this.writeInt32(
          value,
          1
          /* BIG_ENDIAN */
        );
        break;
      case "float32be":
        this.writeFloat32(
          value,
          1
          /* BIG_ENDIAN */
        );
        break;
      case "float64be":
        this.writeFloat64(
          value,
          1
          /* BIG_ENDIAN */
        );
        break;
      case "uint16le":
        this.writeUint16(
          value,
          2
          /* LITTLE_ENDIAN */
        );
        break;
      case "int16le":
        this.writeInt16(
          value,
          2
          /* LITTLE_ENDIAN */
        );
        break;
      case "uint32le":
        this.writeUint32(
          value,
          2
          /* LITTLE_ENDIAN */
        );
        break;
      case "int32le":
        this.writeInt32(
          value,
          2
          /* LITTLE_ENDIAN */
        );
        break;
      case "float32le":
        this.writeFloat32(
          value,
          2
          /* LITTLE_ENDIAN */
        );
        break;
      case "float64le":
        this.writeFloat64(
          value,
          2
          /* LITTLE_ENDIAN */
        );
        break;
      case "cstring":
        this.writeCString(value, lengthOverride);
        break;
      case "string":
        this.writeString(value, charset, lengthOverride);
        break;
      case "u16string":
        this.writeUCS2String(value, this.endianness, lengthOverride);
        break;
      case "u16stringle":
        this.writeUCS2String(value, 2, lengthOverride);
        break;
      case "u16stringbe":
        this.writeUCS2String(value, 1, lengthOverride);
        break;
      default:
        if (__privateMethod(this, __DataStream_instances, isTupleType_fn).call(this, parsedType)) {
          const [, ta] = parsedType;
          for (let i = 0; i < value.length; i++) {
            this.writeType(ta, value[i]);
          }
          break;
        } else {
          this.writeStruct(parsedType, value);
          break;
        }
    }
    if (lengthOverride) {
      this.position = pos;
      this._realloc(lengthOverride);
      this.position = pos + lengthOverride;
    }
  }
  /** @bundle DataStream-write.js */
  writeUint64(value) {
    const h = Math.floor(value / MAX_SIZE);
    this.writeUint32(h);
    this.writeUint32(value & 4294967295);
  }
  /** @bundle DataStream-write.js */
  writeUint24(value) {
    this.writeUint8((value & 16711680) >> 16);
    this.writeUint8((value & 65280) >> 8);
    this.writeUint8(value & 255);
  }
  /** @bundle DataStream-write.js */
  adjustUint32(position, value) {
    const pos = this.position;
    this.seek(position);
    this.writeUint32(value);
    this.seek(pos);
  }
  /**
   * Reads a struct of data from the DataStream. The struct is defined as
   * an array of [name, type]-pairs. See the example below:
   *
   * ```ts
   * ds.readStruct([
   *   ['headerTag', 'uint32'], // Uint32 in DataStream endianness.
   *   ['headerTag2', 'uint32be'], // Big-endian Uint32.
   *   ['headerTag3', 'uint32le'], // Little-endian Uint32.
   *   ['array', ['[]', 'uint32', 16]], // Uint32Array of length 16.
   *   ['array2', ['[]', 'uint32', 'array2Length']] // Uint32Array of length array2Length
   * ]);
   * ```
   *
   * The possible values for the type are as follows:
   *
   * ## Number types
   *
   * Unsuffixed number types use DataStream endianness.
   * To explicitly specify endianness, suffix the type with
   * 'le' for little-endian or 'be' for big-endian,
   * e.g. 'int32be' for big-endian int32.
   *
   * - `uint8` -- 8-bit unsigned int
   * - `uint16` -- 16-bit unsigned int
   * - `uint32` -- 32-bit unsigned int
   * - `int8` -- 8-bit int
   * - `int16` -- 16-bit int
   * - `int32` -- 32-bit int
   * - `float32` -- 32-bit float
   * - `float64` -- 64-bit float
   *
   * ## String types
   *
   * - `cstring` -- ASCII string terminated by a zero byte.
   * - `string:N` -- ASCII string of length N.
   * - `string,CHARSET:N` -- String of byteLength N encoded with given CHARSET.
   * - `u16string:N` -- UCS-2 string of length N in DataStream endianness.
   * - `u16stringle:N` -- UCS-2 string of length N in little-endian.
   * - `u16stringbe:N` -- UCS-2 string of length N in big-endian.
   *
   * ## Complex types
   *
   * ### Struct
   * ```ts
   * [[name, type], [name_2, type_2], ..., [name_N, type_N]]
   * ```
   *
   * ### Callback function to read and return data
   * ```ts
   * function(dataStream, struct) {}
   * ```
   *
   * ###  Getter/setter functions
   * to read and return data, handy for using the same struct definition
   * for reading and writing structs.
   * ```ts
   * {
   *    get: function(dataStream, struct) {},
   *    set: function(dataStream, struct) {}
   * }
   * ```
   *
   * ### Array
   * Array of given type and length. The length can be either
   * - a number
   * - a string that references a previously-read field
   * - `*`
   * - a callback: `function(struct, dataStream, type){}`
   *
   * If length is `*`, reads in as many elements as it can.
   * ```ts
   * ['[]', type, length]
   * ```
   *
   * @param structDefinition Struct definition object.
   * @return The read struct. Null if failed to read struct.
   * @bundle DataStream-read-struct.js
   */
  readStruct(structDefinition) {
    const struct = {};
    const p = this.position;
    for (let i = 0; i < structDefinition.length; i += 1) {
      const t = structDefinition[i][1];
      const v = this.readType(t, struct);
      if (!v) {
        if (this.failurePosition === 0) {
          this.failurePosition = this.position;
        }
        this.position = p;
        return;
      }
      struct[structDefinition[i][0]] = v;
    }
    return struct;
  }
  /**
   * Read UCS-2 string of desired length and endianness from the DataStream.
   *
   * @param length The length of the string to read.
   * @param endianness The endianness of the string data in the DataStream.
   * @return The read string.
   * @bundle DataStream-read-struct.js
   */
  readUCS2String(length, endianness) {
    return String.fromCharCode.apply(void 0, this.readUint16Array(length, endianness));
  }
  /**
   * Reads an object of type t from the DataStream, passing struct as the thus-far
   * read struct to possible callbacks that refer to it. Used by readStruct for
   * reading in the values, so the type is one of the readStruct types.
   *
   * @param type Type of the object to read.
   * @param struct Struct to refer to when resolving length references
   *                         and for calling callbacks.
   * @return  Returns the object on successful read, null on unsuccessful.
   * @bundle DataStream-read-struct.js
   */
  readType(type, struct) {
    if (typeof type === "function") {
      return type(this, struct);
    }
    if (typeof type === "object" && !(type instanceof Array)) {
      return type.get(this, struct);
    }
    if (type instanceof Array && type.length !== 3) {
      return this.readStruct(type);
    }
    let value;
    let lengthOverride;
    let charset = "ASCII";
    const pos = this.position;
    let parsedType = type;
    if (typeof parsedType === "string" && /:/.test(parsedType)) {
      const tp = parsedType.split(":");
      parsedType = tp[0];
      lengthOverride = parseInt(tp[1]);
    }
    if (typeof parsedType === "string" && /,/.test(parsedType)) {
      const tp = parsedType.split(",");
      parsedType = tp[0];
      charset = tp[1];
    }
    switch (parsedType) {
      case "uint8":
        value = this.readUint8();
        break;
      case "int8":
        value = this.readInt8();
        break;
      case "uint16":
        value = this.readUint16(this.endianness);
        break;
      case "int16":
        value = this.readInt16(this.endianness);
        break;
      case "uint32":
        value = this.readUint32(this.endianness);
        break;
      case "int32":
        value = this.readInt32(this.endianness);
        break;
      case "float32":
        value = this.readFloat32(this.endianness);
        break;
      case "float64":
        value = this.readFloat64(this.endianness);
        break;
      case "uint16be":
        value = this.readUint16(
          1
          /* BIG_ENDIAN */
        );
        break;
      case "int16be":
        value = this.readInt16(
          1
          /* BIG_ENDIAN */
        );
        break;
      case "uint32be":
        value = this.readUint32(
          1
          /* BIG_ENDIAN */
        );
        break;
      case "int32be":
        value = this.readInt32(
          1
          /* BIG_ENDIAN */
        );
        break;
      case "float32be":
        value = this.readFloat32(
          1
          /* BIG_ENDIAN */
        );
        break;
      case "float64be":
        value = this.readFloat64(
          1
          /* BIG_ENDIAN */
        );
        break;
      case "uint16le":
        value = this.readUint16(
          2
          /* LITTLE_ENDIAN */
        );
        break;
      case "int16le":
        value = this.readInt16(
          2
          /* LITTLE_ENDIAN */
        );
        break;
      case "uint32le":
        value = this.readUint32(
          2
          /* LITTLE_ENDIAN */
        );
        break;
      case "int32le":
        value = this.readInt32(
          2
          /* LITTLE_ENDIAN */
        );
        break;
      case "float32le":
        value = this.readFloat32(
          2
          /* LITTLE_ENDIAN */
        );
        break;
      case "float64le":
        value = this.readFloat64(
          2
          /* LITTLE_ENDIAN */
        );
        break;
      case "cstring":
        value = this.readCString(lengthOverride);
        break;
      case "string":
        value = this.readString(lengthOverride, charset);
        break;
      case "u16string":
        value = this.readUCS2String(lengthOverride, this.endianness);
        break;
      case "u16stringle":
        value = this.readUCS2String(
          lengthOverride,
          2
          /* LITTLE_ENDIAN */
        );
        break;
      case "u16stringbe":
        value = this.readUCS2String(
          lengthOverride,
          1
          /* BIG_ENDIAN */
        );
        break;
      default:
        if (__privateMethod(this, __DataStream_instances, isTupleType_fn).call(this, parsedType)) {
          const [, ta, len] = parsedType;
          const length = typeof len === "function" ? len(struct, this, parsedType) : typeof len === "string" && struct[len] !== void 0 ? (
            // @ts-expect-error   FIXME: Struct[string] is currently of type Type
            parseInt(struct[len])
          ) : typeof len === "number" ? len : len === "*" ? void 0 : parseInt(len);
          if (typeof ta === "string") {
            const tap = ta.replace(/(le|be)$/, "");
            let endianness;
            if (/le$/.test(ta)) {
              endianness = 2;
            } else if (/be$/.test(ta)) {
              endianness = 1;
            }
            switch (tap) {
              case "uint8":
                value = this.readUint8Array(length);
                break;
              case "uint16":
                value = this.readUint16Array(length, endianness);
                break;
              case "uint32":
                value = this.readUint32Array(length, endianness);
                break;
              case "int8":
                value = this.readInt8Array(length);
                break;
              case "int16":
                value = this.readInt16Array(length, endianness);
                break;
              case "int32":
                value = this.readInt32Array(length, endianness);
                break;
              case "float32":
                value = this.readFloat32Array(length, endianness);
                break;
              case "float64":
                value = this.readFloat64Array(length, endianness);
                break;
              case "cstring":
              case "utf16string":
              case "string":
                if (!length) {
                  value = [];
                  while (!this.isEof()) {
                    const u = this.readType(ta, struct);
                    if (!u) break;
                    value.push(u);
                  }
                } else {
                  value = new Array(length);
                  for (let i = 0; i < length; i++) {
                    value[i] = this.readType(ta, struct);
                  }
                }
                break;
            }
          } else {
            if (!length) {
              value = [];
              while (true) {
                const pos2 = this.position;
                try {
                  const type2 = this.readType(ta, struct);
                  if (!type2) {
                    this.position = pos2;
                    break;
                  }
                  value.push(type2);
                } catch {
                  this.position = pos2;
                  break;
                }
              }
            } else {
              value = new Array(length);
              for (let i = 0; i < length; i++) {
                const type2 = this.readType(ta, struct);
                if (!type2) return;
                value[i] = type2;
              }
            }
          }
          break;
        }
    }
    if (lengthOverride) {
      this.position = pos + lengthOverride;
    }
    return value;
  }
  /**
   * Maps an Int32Array into the DataStream buffer, swizzling it to native
   * endianness in-place. The current offset from the start of the buffer needs to
   * be a multiple of element size, just like with typed array views.
   *
   * Nice for quickly reading in data. Warning: potentially modifies the buffer
   * contents.
   *
   * @param length Number of elements to map.
   * @param endianness Endianness of the data to read.
   * @return Int32Array to the DataStream backing buffer.
   * @bundle DataStream-map.js
   */
  mapInt32Array(length, endianness) {
    this._realloc(length * 4);
    const arr = new Int32Array(this._buffer, this.byteOffset + this.position, length);
    _a.arrayToNative(arr, endianness ?? this.endianness);
    this.position += length * 4;
    return arr;
  }
  /**
   * Maps an Int16Array into the DataStream buffer, swizzling it to native
   * endianness in-place. The current offset from the start of the buffer needs to
   * be a multiple of element size, just like with typed array views.
   *
   * Nice for quickly reading in data. Warning: potentially modifies the buffer
   * contents.
   *
   * @param length Number of elements to map.
   * @param endianness Endianness of the data to read.
   * @return Int16Array to the DataStream backing buffer.
   * @bundle DataStream-map.js
   */
  mapInt16Array(length, endianness) {
    this._realloc(length * 2);
    const arr = new Int16Array(this._buffer, this.byteOffset + this.position, length);
    _a.arrayToNative(arr, endianness ?? this.endianness);
    this.position += length * 2;
    return arr;
  }
  /**
   * Maps an Int8Array into the DataStream buffer.
   *
   * Nice for quickly reading in data.
   *
   * @param length Number of elements to map.
   * @param endianness Endianness of the data to read.
   * @return Int8Array to the DataStream backing buffer.
   * @bundle DataStream-map.js
   */
  mapInt8Array(length, _endianness) {
    this._realloc(length * 1);
    const arr = new Int8Array(this._buffer, this.byteOffset + this.position, length);
    this.position += length * 1;
    return arr;
  }
  /**
   * Maps a Uint32Array into the DataStream buffer, swizzling it to native
   * endianness in-place. The current offset from the start of the buffer needs to
   * be a multiple of element size, just like with typed array views.
   *
   * Nice for quickly reading in data. Warning: potentially modifies the buffer
   * contents.
   *
   * @param length Number of elements to map.
   * @param endianness Endianness of the data to read.
   * @return Uint32Array to the DataStream backing buffer.
   * @bundle DataStream-map.js
   */
  mapUint32Array(length, endianness) {
    this._realloc(length * 4);
    const arr = new Uint32Array(this._buffer, this.byteOffset + this.position, length);
    _a.arrayToNative(arr, endianness ?? this.endianness);
    this.position += length * 4;
    return arr;
  }
  /**
   * Maps a Uint16Array into the DataStream buffer, swizzling it to native
   * endianness in-place. The current offset from the start of the buffer needs to
   * be a multiple of element size, just like with typed array views.
   *
   * Nice for quickly reading in data. Warning: potentially modifies the buffer
   * contents.
   *
   * @param length Number of elements to map.
   * @param endianness Endianness of the data to read.
   * @return Uint16Array to the DataStream backing buffer.
   * @bundle DataStream-map.js
   */
  mapUint16Array(length, endianness) {
    this._realloc(length * 2);
    const arr = new Uint16Array(this._buffer, this.byteOffset + this.position, length);
    _a.arrayToNative(arr, endianness ?? this.endianness);
    this.position += length * 2;
    return arr;
  }
  /**
   * Maps a Float64Array into the DataStream buffer, swizzling it to native
   * endianness in-place. The current offset from the start of the buffer needs to
   * be a multiple of element size, just like with typed array views.
   *
   * Nice for quickly reading in data. Warning: potentially modifies the buffer
   * contents.
   *
   * @param length Number of elements to map.
   * @param endianness Endianness of the data to read.
   * @return Float64Array to the DataStream backing buffer.
   * @bundle DataStream-map.js
   */
  mapFloat64Array(length, endianness) {
    this._realloc(length * 8);
    const arr = new Float64Array(this._buffer, this.byteOffset + this.position, length);
    _a.arrayToNative(arr, endianness ?? this.endianness);
    this.position += length * 8;
    return arr;
  }
  /**
   * Maps a Float32Array into the DataStream buffer, swizzling it to native
   * endianness in-place. The current offset from the start of the buffer needs to
   * be a multiple of element size, just like with typed array views.
   *
   * Nice for quickly reading in data. Warning: potentially modifies the buffer
   * contents.
   *
   * @param length Number of elements to map.
   * @param endianness Endianness of the data to read.
   * @return Float32Array to the DataStream backing buffer.
   * @bundle DataStream-map.js
   */
  mapFloat32Array(length, endianness) {
    this._realloc(length * 4);
    const arr = new Float32Array(this._buffer, this.byteOffset + this.position, length);
    _a.arrayToNative(arr, endianness ?? this.endianness);
    this.position += length * 4;
    return arr;
  }
}, __DataStream_instances = new WeakSet(), isTupleType_fn = function(type) {
  return Array.isArray(type) && type.length === 3 && type[0] === "[]";
}, _a.ENDIANNESS = new Int8Array(new Int16Array([1]).buffer)[0] > 0 ? 2 : 1, _a);
function fromCharCodeUint8(uint8arr) {
  const arr = [];
  for (let i = 0; i < uint8arr.length; i++) {
    arr[i] = uint8arr[i];
  }
  return String.fromCharCode.apply(void 0, arr);
}
var start = /* @__PURE__ */ new Date();
var LOG_LEVEL_ERROR = 4;
var LOG_LEVEL_WARNING = 3;
var LOG_LEVEL_INFO = 2;
var LOG_LEVEL_DEBUG = 1;
var log_level = LOG_LEVEL_ERROR;
var Log = {
  setLogLevel(level) {
    if (level === this.debug) log_level = LOG_LEVEL_DEBUG;
    else if (level === this.info) log_level = LOG_LEVEL_INFO;
    else if (level === this.warn) log_level = LOG_LEVEL_WARNING;
    else if (level === this.error) log_level = LOG_LEVEL_ERROR;
    else log_level = LOG_LEVEL_ERROR;
  },
  debug(module, msg) {
    if (console.debug === void 0) {
      console.debug = console.log;
    }
    if (LOG_LEVEL_DEBUG >= log_level) {
      console.debug(
        "[" + Log.getDurationString((/* @__PURE__ */ new Date()).getTime() - start.getTime(), 1e3) + "]",
        "[" + module + "]",
        msg
      );
    }
  },
  log(module, _msg) {
    this.debug(module.msg);
  },
  info(module, msg) {
    if (LOG_LEVEL_INFO >= log_level) {
      console.info(
        "[" + Log.getDurationString((/* @__PURE__ */ new Date()).getTime() - start.getTime(), 1e3) + "]",
        "[" + module + "]",
        msg
      );
    }
  },
  warn(module, msg) {
    if (LOG_LEVEL_WARNING >= log_level) {
      console.warn(
        "[" + Log.getDurationString((/* @__PURE__ */ new Date()).getTime() - start.getTime(), 1e3) + "]",
        "[" + module + "]",
        msg
      );
    }
  },
  error(module, msg, isofile) {
    if (isofile?.onError) {
      isofile.onError(module, msg);
    } else if (LOG_LEVEL_ERROR >= log_level) {
      console.error(
        "[" + Log.getDurationString((/* @__PURE__ */ new Date()).getTime() - start.getTime(), 1e3) + "]",
        "[" + module + "]",
        msg
      );
    }
  },
  /* Helper function to print a duration value in the form H:MM:SS.MS */
  getDurationString(duration, _timescale) {
    let neg;
    function pad(number, length) {
      const str = "" + number;
      const a = str.split(".");
      while (a[0].length < length) {
        a[0] = "0" + a[0];
      }
      return a.join(".");
    }
    if (duration < 0) {
      neg = true;
      duration = -duration;
    } else {
      neg = false;
    }
    const timescale = _timescale || 1;
    let duration_sec = duration / timescale;
    const hours = Math.floor(duration_sec / 3600);
    duration_sec -= hours * 3600;
    const minutes = Math.floor(duration_sec / 60);
    duration_sec -= minutes * 60;
    let msec = duration_sec * 1e3;
    duration_sec = Math.floor(duration_sec);
    msec -= duration_sec * 1e3;
    msec = Math.floor(msec);
    return (neg ? "-" : "") + hours + ":" + pad(minutes, 2) + ":" + pad(duration_sec, 2) + "." + pad(msec, 3);
  },
  /* Helper function to stringify HTML5 TimeRanges objects */
  printRanges(ranges) {
    const length = ranges.length;
    if (length > 0) {
      let str = "";
      for (let i = 0; i < length; i++) {
        if (i > 0) str += ",";
        str += "[" + Log.getDurationString(ranges.start(i)) + "," + Log.getDurationString(ranges.end(i)) + "]";
      }
      return str;
    } else {
      return "(empty)";
    }
  }
};
function concatBuffers(buffer1, buffer2) {
  Log.debug(
    "ArrayBuffer",
    "Trying to create a new buffer of size: " + (buffer1.byteLength + buffer2.byteLength)
  );
  const tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  tmp.set(new Uint8Array(buffer1), 0);
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
  return tmp.buffer;
}
var MultiBufferStream = class extends DataStream {
  constructor(buffer) {
    super(new ArrayBuffer(), 0);
    this.buffers = [];
    this.bufferIndex = -1;
    if (buffer) {
      this.insertBuffer(buffer);
      this.bufferIndex = 0;
    }
  }
  /***********************************************************************************
   *                     Methods for the managnement of the buffers                  *
   *                     (insertion, removal, concatenation, ...)                    *
   ***********************************************************************************/
  initialized() {
    if (this.bufferIndex > -1) {
      return true;
    } else if (this.buffers.length > 0) {
      const firstBuffer = this.buffers[0];
      if (firstBuffer.fileStart === 0) {
        this.buffer = firstBuffer;
        this.bufferIndex = 0;
        Log.debug("MultiBufferStream", "Stream ready for parsing");
        return true;
      } else {
        Log.warn("MultiBufferStream", "The first buffer should have a fileStart of 0");
        this.logBufferLevel();
        return false;
      }
    } else {
      Log.warn("MultiBufferStream", "No buffer to start parsing from");
      this.logBufferLevel();
      return false;
    }
  }
  /**
   * Reduces the size of a given buffer, but taking the part between offset and offset+newlength
   * @param  {ArrayBuffer} buffer
   * @param  {Number}      offset    the start of new buffer
   * @param  {Number}      newLength the length of the new buffer
   * @return {ArrayBuffer}           the new buffer
   */
  reduceBuffer(buffer, offset, newLength) {
    const smallB = new Uint8Array(newLength);
    smallB.set(new Uint8Array(buffer, offset, newLength));
    smallB.buffer.fileStart = buffer.fileStart + offset;
    smallB.buffer.usedBytes = 0;
    return smallB.buffer;
  }
  /**
   * Inserts the new buffer in the sorted list of buffers,
   *  making sure, it is not overlapping with existing ones (possibly reducing its size).
   *  if the new buffer overrides/replaces the 0-th buffer (for instance because it is bigger),
   *  updates the DataStream buffer for parsing
   */
  insertBuffer(ab) {
    let to_add = true;
    let i = 0;
    for (; i < this.buffers.length; i++) {
      const b = this.buffers[i];
      if (ab.fileStart <= b.fileStart) {
        if (ab.fileStart === b.fileStart) {
          if (ab.byteLength > b.byteLength) {
            this.buffers.splice(i, 1);
            i--;
            continue;
          } else {
            Log.warn(
              "MultiBufferStream",
              "Buffer (fileStart: " + ab.fileStart + " - Length: " + ab.byteLength + ") already appended, ignoring"
            );
          }
        } else {
          if (ab.fileStart + ab.byteLength <= b.fileStart) ;
          else {
            ab = this.reduceBuffer(ab, 0, b.fileStart - ab.fileStart);
          }
          Log.debug(
            "MultiBufferStream",
            "Appending new buffer (fileStart: " + ab.fileStart + " - Length: " + ab.byteLength + ")"
          );
          this.buffers.splice(i, 0, ab);
          if (i === 0) {
            this.buffer = ab;
          }
        }
        to_add = false;
        break;
      } else if (ab.fileStart < b.fileStart + b.byteLength) {
        const offset = b.fileStart + b.byteLength - ab.fileStart;
        const newLength = ab.byteLength - offset;
        if (newLength > 0) {
          ab = this.reduceBuffer(ab, offset, newLength);
        } else {
          to_add = false;
          break;
        }
      }
    }
    if (to_add) {
      Log.debug(
        "MultiBufferStream",
        "Appending new buffer (fileStart: " + ab.fileStart + " - Length: " + ab.byteLength + ")"
      );
      this.buffers.push(ab);
      if (i === 0) {
        this.buffer = ab;
      }
    }
  }
  /**
   * Displays the status of the buffers (number and used bytes)
   * @param  {Object} info callback method for display
   */
  logBufferLevel(info) {
    const ranges = [];
    let bufferedString = "";
    let range;
    let used = 0;
    let total = 0;
    for (let i = 0; i < this.buffers.length; i++) {
      const buffer = this.buffers[i];
      if (i === 0) {
        range = {
          start: buffer.fileStart,
          end: buffer.fileStart + buffer.byteLength
        };
        ranges.push(range);
        bufferedString += "[" + range.start + "-";
      } else if (range.end === buffer.fileStart) {
        range.end = buffer.fileStart + buffer.byteLength;
      } else {
        range = {
          start: buffer.fileStart,
          end: buffer.fileStart + buffer.byteLength
        };
        bufferedString += ranges[ranges.length - 1].end - 1 + "], [" + range.start + "-";
        ranges.push(range);
      }
      used += buffer.usedBytes;
      total += buffer.byteLength;
    }
    if (ranges.length > 0) {
      bufferedString += range.end - 1 + "]";
    }
    const log = info ? Log.info : Log.debug;
    if (this.buffers.length === 0) {
      log("MultiBufferStream", "No more buffer in memory");
    } else {
      log(
        "MultiBufferStream",
        "" + this.buffers.length + " stored buffer(s) (" + used + "/" + total + " bytes), continuous ranges: " + bufferedString
      );
    }
  }
  cleanBuffers() {
    for (let i = 0; i < this.buffers.length; i++) {
      const buffer = this.buffers[i];
      if (buffer.usedBytes === buffer.byteLength) {
        Log.debug("MultiBufferStream", "Removing buffer #" + i);
        this.buffers.splice(i, 1);
        i--;
      }
    }
  }
  mergeNextBuffer() {
    if (this.bufferIndex + 1 < this.buffers.length) {
      const next_buffer = this.buffers[this.bufferIndex + 1];
      if (next_buffer.fileStart === this.buffer.fileStart + this.buffer.byteLength) {
        const oldLength = this.buffer.byteLength;
        const oldUsedBytes = this.buffer.usedBytes;
        const oldFileStart = this.buffer.fileStart;
        this.buffers[this.bufferIndex] = concatBuffers(this.buffer, next_buffer);
        this.buffer = this.buffers[this.bufferIndex];
        this.buffers.splice(this.bufferIndex + 1, 1);
        this.buffer.usedBytes = oldUsedBytes;
        this.buffer.fileStart = oldFileStart;
        Log.debug(
          "ISOFile",
          "Concatenating buffer for box parsing (length: " + oldLength + "->" + this.buffer.byteLength + ")"
        );
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }
  /*************************************************************************
   *                        Seek-related functions                         *
   *************************************************************************/
  /**
   * Finds the buffer that holds the given file position
   * @param  {Boolean} fromStart    indicates if the search should start from the current buffer (false)
   *                                or from the first buffer (true)
   * @param  {Number}  filePosition position in the file to seek to
   * @param  {Boolean} markAsUsed   indicates if the bytes in between the current position and the seek position
   *                                should be marked as used for garbage collection
   * @return {Number}               the index of the buffer holding the seeked file position, -1 if not found.
   */
  findPosition(fromStart, filePosition, markAsUsed) {
    let index = -1;
    let i = fromStart === true ? 0 : this.bufferIndex;
    while (i < this.buffers.length) {
      const abuffer2 = this.buffers[i];
      if (abuffer2 && abuffer2.fileStart <= filePosition) {
        index = i;
        if (markAsUsed) {
          if (abuffer2.fileStart + abuffer2.byteLength <= filePosition) {
            abuffer2.usedBytes = abuffer2.byteLength;
          } else {
            abuffer2.usedBytes = filePosition - abuffer2.fileStart;
          }
          this.logBufferLevel();
        }
      } else {
        break;
      }
      i++;
    }
    if (index === -1) {
      return -1;
    }
    const abuffer = this.buffers[index];
    if (abuffer.fileStart + abuffer.byteLength >= filePosition) {
      Log.debug("MultiBufferStream", "Found position in existing buffer #" + index);
      return index;
    } else {
      return -1;
    }
  }
  /**
   * Finds the largest file position contained in a buffer or in the next buffers if they are contiguous (no gap)
   * starting from the given buffer index or from the current buffer if the index is not given
   *
   * @param  {Number} inputindex Index of the buffer to start from
   * @return {Number}            The largest file position found in the buffers
   */
  findEndContiguousBuf(inputindex) {
    const index = inputindex !== void 0 ? inputindex : this.bufferIndex;
    let currentBuf = this.buffers[index];
    if (this.buffers.length > index + 1) {
      for (let i = index + 1; i < this.buffers.length; i++) {
        const nextBuf = this.buffers[i];
        if (nextBuf.fileStart === currentBuf.fileStart + currentBuf.byteLength) {
          currentBuf = nextBuf;
        } else {
          break;
        }
      }
    }
    return currentBuf.fileStart + currentBuf.byteLength;
  }
  /**
   * Returns the largest file position contained in the buffers, larger than the given position
   * @param  {Number} pos the file position to start from
   * @return {Number}     the largest position in the current buffer or in the buffer and the next contiguous
   *                      buffer that holds the given position
   */
  getEndFilePositionAfter(pos) {
    const index = this.findPosition(true, pos, false);
    if (index !== -1) {
      return this.findEndContiguousBuf(index);
    } else {
      return pos;
    }
  }
  /*************************************************************************
   *                  Garbage collection related functions                 *
   *************************************************************************/
  /**
   * Marks a given number of bytes as used in the current buffer for garbage collection
   * @param {Number} nbBytes
   */
  addUsedBytes(nbBytes) {
    this.buffer.usedBytes += nbBytes;
    this.logBufferLevel();
  }
  /**
   * Marks the entire current buffer as used, ready for garbage collection
   */
  setAllUsedBytes() {
    this.buffer.usedBytes = this.buffer.byteLength;
    this.logBufferLevel();
  }
  /*************************************************************************
   *          Common API between MultiBufferStream and SimpleStream        *
   *************************************************************************/
  /**
   * Tries to seek to a given file position
   * if possible, repositions the parsing from there and returns true
   * if not possible, does not change anything and returns false
   * @param  {Number}  filePosition position in the file to seek to
   * @param  {Boolean} fromStart    indicates if the search should start from the current buffer (false)
   *                                or from the first buffer (true)
   * @param  {Boolean} markAsUsed   indicates if the bytes in between the current position and the seek position
   *                                should be marked as used for garbage collection
   * @return {Boolean}              true if the seek succeeded, false otherwise
   */
  seek(filePosition, fromStart, markAsUsed) {
    const index = this.findPosition(fromStart, filePosition, markAsUsed);
    if (index !== -1) {
      this.buffer = this.buffers[index];
      this.bufferIndex = index;
      this.position = filePosition - this.buffer.fileStart;
      Log.debug("MultiBufferStream", "Repositioning parser at buffer position: " + this.position);
      return true;
    } else {
      Log.debug("MultiBufferStream", "Position " + filePosition + " not found in buffered data");
      return false;
    }
  }
  /**
   * Returns the current position in the file
   * @return {Number} the position in the file
   */
  getPosition() {
    if (this.bufferIndex === -1 || this.buffers[this.bufferIndex] === void 0) return 0;
    return this.buffers[this.bufferIndex].fileStart + this.position;
  }
  /**
   * Returns the length of the current buffer
   * @return {Number} the length of the current buffer
   */
  getLength() {
    return this.byteLength;
  }
  getEndPosition() {
    if (this.bufferIndex === -1 || this.buffers[this.bufferIndex] === void 0) return 0;
    return this.buffers[this.bufferIndex].fileStart + this.byteLength;
  }
  getAbsoluteEndPosition() {
    if (this.buffers.length === 0) return 0;
    const lastBuffer = this.buffers[this.buffers.length - 1];
    return lastBuffer.fileStart + lastBuffer.byteLength;
  }
};
var Box = (_b = class {
  constructor(size = 0) {
    // Handle box designation (4CC)
    // Instance-defined type (used for dynamic box types)
    __privateAdd(this, _type);
    this.size = size;
  }
  get type() {
    return this.constructor.fourcc ?? __privateGet(this, _type);
  }
  set type(value) {
    __privateSet(this, _type, value);
  }
  addBox(box) {
    if (!this.boxes) {
      this.boxes = [];
    }
    this.boxes.push(box);
    if (this[box.type + "s"]) {
      this[box.type + "s"].push(box);
    } else {
      this[box.type] = box;
    }
    return box;
  }
  set(prop, value) {
    this[prop] = value;
    return this;
  }
  addEntry(value, _prop) {
    const prop = _prop || "entries";
    if (!this[prop]) {
      this[prop] = [];
    }
    this[prop].push(value);
    return this;
  }
  /** @bundle box-write.js */
  writeHeader(stream, msg) {
    this.size += 8;
    if (this.size > MAX_UINT32 || this.original_size === 1) {
      this.size += 8;
    }
    if (this.type === "uuid") {
      this.size += 16;
    }
    Log.debug(
      "BoxWriter",
      "Writing box " + this.type + " of size: " + this.size + " at position " + stream.getPosition() + (msg || "")
    );
    if (this.original_size === 0) {
      stream.writeUint32(0);
    } else if (this.size > MAX_UINT32 || this.original_size === 1) {
      stream.writeUint32(1);
    } else {
      this.sizePosition = stream.getPosition();
      stream.writeUint32(this.size);
    }
    stream.writeString(this.type, void 0, 4);
    if (this.type === "uuid") {
      const uuidBytes = new Uint8Array(16);
      for (let i = 0; i < 16; i++) {
        uuidBytes[i] = parseInt(this.uuid.substring(i * 2, i * 2 + 2), 16);
      }
      stream.writeUint8Array(uuidBytes);
    }
    if (this.size > MAX_UINT32 || this.original_size === 1) {
      this.sizePosition = stream.getPosition();
      stream.writeUint64(this.size);
    }
  }
  /** @bundle box-write.js */
  write(stream) {
    if (this.type === "mdat") {
      const box = this;
      if (box.stream) {
        this.size = box.stream.getAbsoluteEndPosition();
        this.writeHeader(stream);
        for (const buffer of box.stream.buffers) {
          const u8 = new Uint8Array(buffer);
          stream.writeUint8Array(u8);
        }
      } else if (box.data) {
        this.size = box.data.length;
        this.writeHeader(stream);
        stream.writeUint8Array(box.data);
      }
    } else {
      this.size = this.data ? this.data.length : 0;
      this.writeHeader(stream);
      if (this.data) {
        stream.writeUint8Array(this.data);
      }
    }
  }
  /** @bundle box-print.js */
  printHeader(output) {
    this.size += 8;
    if (this.size > MAX_UINT32) {
      this.size += 8;
    }
    if (this.type === "uuid") {
      this.size += 16;
    }
    output.log(output.indent + "size:" + this.size);
    output.log(output.indent + "type:" + this.type);
  }
  /** @bundle box-print.js */
  print(output) {
    this.printHeader(output);
  }
  /** @bundle box-parse.js */
  parse(stream) {
    if (this.type !== "mdat") {
      this.data = stream.readUint8Array(this.size - this.hdr_size);
    } else {
      if (this.size === 0) {
        stream.seek(stream.getEndPosition());
      } else {
        stream.seek(this.start + this.size);
      }
    }
  }
  /** @bundle box-parse.js */
  parseDataAndRewind(stream) {
    this.data = stream.readUint8Array(this.size - this.hdr_size);
    stream.seek(this.start + this.hdr_size);
  }
  /** @bundle box-parse.js */
  parseLanguage(stream) {
    this.language = stream.readUint16();
    const chars = [];
    chars[0] = this.language >> 10 & 31;
    chars[1] = this.language >> 5 & 31;
    chars[2] = this.language & 31;
    this.languageString = String.fromCharCode(chars[0] + 96, chars[1] + 96, chars[2] + 96);
  }
  /** @bundle isofile-advanced-creation.js */
  computeSize(stream_) {
    const stream = stream_ || new MultiBufferStream();
    this.write(stream);
  }
  isEndOfBox(stream) {
    const pos = stream.getPosition();
    const end = this.start + this.size;
    return pos === end;
  }
}, _type = new WeakMap(), _b.registryId = /* @__PURE__ */ Symbol.for("BoxIdentifier"), _b);
var FullBox = class extends Box {
  constructor() {
    super(...arguments);
    this.flags = 0;
    this.version = 0;
  }
  /** @bundle box-write.js */
  writeHeader(stream) {
    this.size += 4;
    super.writeHeader(stream, " v=" + this.version + " f=" + this.flags);
    stream.writeUint8(this.version);
    stream.writeUint24(this.flags);
  }
  /** @bundle box-print.js */
  printHeader(output) {
    this.size += 4;
    super.printHeader(output);
    output.log(output.indent + "version:" + this.version);
    output.log(output.indent + "flags:" + this.flags);
  }
  /** @bundle box-parse.js */
  parseDataAndRewind(stream) {
    this.parseFullHeader(stream);
    this.data = stream.readUint8Array(this.size - this.hdr_size);
    this.hdr_size -= 4;
    stream.seek(this.start + this.hdr_size);
  }
  /** @bundle box-parse.js */
  parseFullHeader(stream) {
    this.version = stream.readUint8();
    this.flags = stream.readUint24();
    this.hdr_size += 4;
  }
  /** @bundle box-parse.js */
  parse(stream) {
    this.parseFullHeader(stream);
    this.data = stream.readUint8Array(this.size - this.hdr_size);
  }
};
var SampleGroupEntry = (_c = class {
  constructor(grouping_type) {
    this.grouping_type = grouping_type;
  }
  /** @bundle writing/samplegroups/samplegroup.js */
  write(stream) {
    stream.writeUint8Array(this.data);
  }
  /** @bundle parsing/samplegroups/samplegroup.js */
  parse(stream) {
    Log.warn("BoxParser", `Unknown sample group type: '${this.grouping_type}'`);
    this.data = stream.readUint8Array(this.description_length);
  }
}, _c.registryId = /* @__PURE__ */ Symbol.for("SampleGroupEntryIdentifier"), _c);
var TrackGroupTypeBox = class extends FullBox {
  /** @bundle parsing/TrackGroup.js */
  parse(stream) {
    this.parseFullHeader(stream);
    this.track_group_id = stream.readUint32();
  }
};
var SingleItemTypeReferenceBox = class extends Box {
  constructor(fourcc, size, box_name, hdr_size, start2) {
    super(size);
    this.box_name = box_name;
    this.hdr_size = hdr_size;
    this.start = start2;
    this.type = fourcc;
  }
  parse(stream) {
    this.from_item_ID = stream.readUint16();
    const count = stream.readUint16();
    this.references = [];
    for (let i = 0; i < count; i++) {
      this.references[i] = {
        to_item_ID: stream.readUint16()
      };
    }
  }
};
var SingleItemTypeReferenceBoxLarge = class extends Box {
  constructor(fourcc, size, box_name, hdr_size, start2) {
    super(size);
    this.box_name = box_name;
    this.hdr_size = hdr_size;
    this.start = start2;
    this.type = fourcc;
  }
  parse(stream) {
    this.from_item_ID = stream.readUint32();
    const count = stream.readUint16();
    this.references = [];
    for (let i = 0; i < count; i++) {
      this.references[i] = {
        to_item_ID: stream.readUint32()
      };
    }
  }
};
var TrackReferenceTypeBox = class extends Box {
  constructor(fourcc, size, hdr_size, start2) {
    super(size);
    this.hdr_size = hdr_size;
    this.start = start2;
    this.type = fourcc;
  }
  parse(stream) {
    this.track_ids = stream.readUint32Array((this.size - this.hdr_size) / 4);
  }
  /** @bundle box-write.js */
  write(stream) {
    this.size = this.track_ids.length * 4;
    this.writeHeader(stream);
    stream.writeUint32Array(this.track_ids);
  }
};
var DIFF_BOXES_PROP_NAMES = [
  "boxes",
  "entries",
  "references",
  "subsamples",
  "items",
  "item_infos",
  "extents",
  "associations",
  "subsegments",
  "ranges",
  "seekLists",
  "seekPoints",
  "esd",
  "levels"
];
var DIFF_PRIMITIVE_ARRAY_PROP_NAMES = [
  "compatible_brands",
  "matrix",
  "opcolor",
  "sample_counts",
  "sample_deltas",
  "first_chunk",
  "samples_per_chunk",
  "sample_sizes",
  "chunk_offsets",
  "sample_offsets",
  "sample_description_index",
  "sample_duration"
];
function boxEqualFields(box_a, box_b) {
  if (box_a && !box_b) return false;
  let prop;
  for (prop in box_a) {
    if (DIFF_BOXES_PROP_NAMES.find((name) => name === prop)) {
      continue;
    } else if (box_a[prop] instanceof Box || box_b[prop] instanceof Box) {
      continue;
    } else if (typeof box_a[prop] === "undefined" || typeof box_b[prop] === "undefined") {
      continue;
    } else if (typeof box_a[prop] === "function" || typeof box_b[prop] === "function") {
      continue;
    } else if ("subBoxNames" in box_a && box_a.subBoxNames.indexOf(prop.slice(0, 4)) > -1 || "subBoxNames" in box_b && box_b.subBoxNames.indexOf(prop.slice(0, 4)) > -1) {
      continue;
    } else {
      if (prop === "data" || prop === "start" || prop === "size" || prop === "creation_time" || prop === "modification_time") {
        continue;
      } else if (DIFF_PRIMITIVE_ARRAY_PROP_NAMES.find((name) => name === prop)) {
        continue;
      } else {
        if (box_a[prop] !== box_b[prop]) {
          return false;
        }
      }
    }
  }
  return true;
}
function boxEqual(box_a, box_b) {
  if (!boxEqualFields(box_a, box_b)) {
    return false;
  }
  for (let j = 0; j < DIFF_BOXES_PROP_NAMES.length; j++) {
    const name = DIFF_BOXES_PROP_NAMES[j];
    if (box_a[name] && box_b[name]) {
      if (!boxEqual(box_a[name], box_b[name])) {
        return false;
      }
    }
  }
  return true;
}
function getRegistryId(boxClass) {
  let current = boxClass;
  while (current) {
    if ("registryId" in current) {
      return current["registryId"];
    }
    current = Object.getPrototypeOf(current);
  }
}
var isSampleGroupEntry = (value) => {
  const symbol = /* @__PURE__ */ Symbol.for("SampleGroupEntryIdentifier");
  return getRegistryId(value) === symbol;
};
var isSampleEntry = (value) => {
  const symbol = /* @__PURE__ */ Symbol.for("SampleEntryIdentifier");
  return getRegistryId(value) === symbol;
};
var isBox = (value) => {
  const symbol = /* @__PURE__ */ Symbol.for("BoxIdentifier");
  return getRegistryId(value) === symbol;
};
var BoxRegistry = {
  uuid: {},
  sampleEntry: {},
  sampleGroupEntry: {},
  box: {}
};
function registerBoxes(registry) {
  const localRegistry = {
    uuid: {},
    sampleEntry: {},
    sampleGroupEntry: {},
    box: {}
  };
  for (const [key, value] of Object.entries(registry)) {
    if (isSampleGroupEntry(value)) {
      const groupingType = "grouping_type" in value ? value.grouping_type : void 0;
      if (!groupingType) {
        throw new Error(
          `SampleGroupEntry class ${key} does not have a valid static grouping_type. Please ensure it is defined correctly.`
        );
      }
      if (groupingType in localRegistry.sampleGroupEntry) {
        throw new Error(
          `SampleGroupEntry class ${key} has a grouping_type that is already registered. Please ensure it is unique.`
        );
      }
      localRegistry.sampleGroupEntry[groupingType] = value;
      continue;
    }
    if (isSampleEntry(value)) {
      const fourcc = "fourcc" in value ? value.fourcc : void 0;
      if (!fourcc) {
        throw new Error(
          `SampleEntry class ${key} does not have a valid static fourcc. Please ensure it is defined correctly.`
        );
      }
      if (fourcc in localRegistry.sampleEntry) {
        throw new Error(
          `SampleEntry class ${key} has a fourcc that is already registered. Please ensure it is unique.`
        );
      }
      localRegistry.sampleEntry[fourcc] = value;
      continue;
    }
    if (isBox(value)) {
      const fourcc = "fourcc" in value ? value.fourcc : void 0;
      const uuid = "uuid" in value ? value.uuid : void 0;
      if (fourcc === "uuid") {
        if (!uuid) {
          throw new Error(
            `Box class ${key} has a fourcc of 'uuid' but does not have a valid uuid. Please ensure it is defined correctly.`
          );
        }
        if (uuid in localRegistry.uuid) {
          throw new Error(
            `Box class ${key} has a uuid that is already registered. Please ensure it is unique.`
          );
        }
        localRegistry.uuid[uuid] = value;
        continue;
      }
      localRegistry.box[fourcc] = value;
      continue;
    }
    throw new Error(
      `Box class ${key} does not have a valid static fourcc, uuid, or grouping_type. Please ensure it is defined correctly.`
    );
  }
  BoxRegistry.uuid = { ...localRegistry.uuid };
  BoxRegistry.sampleEntry = { ...localRegistry.sampleEntry };
  BoxRegistry.sampleGroupEntry = { ...localRegistry.sampleGroupEntry };
  BoxRegistry.box = { ...localRegistry.box };
  return BoxRegistry;
}
var DescriptorRegistry = {};
function registerDescriptors(registry) {
  Object.entries(registry).forEach(([key, value]) => DescriptorRegistry[key] = value);
  return DescriptorRegistry;
}
function parseUUID(stream) {
  return parseHex16(stream);
}
function parseHex16(stream) {
  let hex16 = "";
  for (let i = 0; i < 16; i++) {
    const hex = stream.readUint8().toString(16);
    hex16 += hex.length === 1 ? "0" + hex : hex;
  }
  return hex16;
}
function parseOneBox(stream, headerOnly, parentSize) {
  let box;
  let originalSize;
  const start2 = stream.getPosition();
  let hdr_size = 0;
  let uuid;
  if (stream.getEndPosition() - start2 < 8) {
    Log.debug("BoxParser", "Not enough data in stream to parse the type and size of the box");
    return { code: ERR_NOT_ENOUGH_DATA };
  }
  if (parentSize && parentSize < 8) {
    Log.debug("BoxParser", "Not enough bytes left in the parent box to parse a new box");
    return { code: ERR_NOT_ENOUGH_DATA };
  }
  let size = stream.readUint32();
  const type = stream.readString(4);
  if (type.length !== 4 || !/^[\x20-\x7E]{4}$/.test(type)) {
    Log.error("BoxParser", `Invalid box type: '${type}'`);
    return { code: ERR_INVALID_DATA, start: start2, type };
  }
  let box_type = type;
  Log.debug(
    "BoxParser",
    "Found box of type '" + type + "' and size " + size + " at position " + start2
  );
  hdr_size = 8;
  if (type === "uuid") {
    if (stream.getEndPosition() - stream.getPosition() < 16 || parentSize - hdr_size < 16) {
      stream.seek(start2);
      Log.debug("BoxParser", "Not enough bytes left in the parent box to parse a UUID box");
      return { code: ERR_NOT_ENOUGH_DATA };
    }
    uuid = parseUUID(stream);
    hdr_size += 16;
    box_type = uuid;
  }
  if (size === 1) {
    if (stream.getEndPosition() - stream.getPosition() < 8 || parentSize && parentSize - hdr_size < 8) {
      stream.seek(start2);
      Log.warn(
        "BoxParser",
        'Not enough data in stream to parse the extended size of the "' + type + '" box'
      );
      return { code: ERR_NOT_ENOUGH_DATA };
    }
    originalSize = size;
    size = stream.readUint64();
    hdr_size += 8;
  } else if (size === 0) {
    if (parentSize) {
      size = parentSize;
    } else {
      if (type !== "mdat") {
        Log.error("BoxParser", "Unlimited box size not supported for type: '" + type + "'");
        box = new Box(size);
        box.type = type;
        return { code: OK, box, size: box.size };
      }
    }
  }
  if (size !== 0 && size < hdr_size) {
    Log.error(
      "BoxParser",
      "Box of type " + type + " has an invalid size " + size + " (too small to be a box)"
    );
    return {
      code: ERR_NOT_ENOUGH_DATA,
      type,
      size,
      hdr_size,
      start: start2
    };
  }
  if (size !== 0 && parentSize && size > parentSize) {
    Log.error(
      "BoxParser",
      "Box of type '" + type + "' has a size " + size + " greater than its container size " + parentSize
    );
    return {
      code: ERR_NOT_ENOUGH_DATA,
      type,
      size,
      hdr_size,
      start: start2
    };
  }
  if (size !== 0 && start2 + size > stream.getEndPosition()) {
    stream.seek(start2);
    Log.info("BoxParser", "Not enough data in stream to parse the entire '" + type + "' box");
    return {
      code: ERR_NOT_ENOUGH_DATA,
      type,
      size,
      hdr_size,
      start: start2,
      original_size: originalSize
    };
  }
  if (headerOnly) {
    return { code: OK, type, size, hdr_size, start: start2 };
  } else {
    if (type in BoxRegistry.box) {
      box = new BoxRegistry.box[type](size);
    } else {
      if (type !== "uuid") {
        Log.warn("BoxParser", `Unknown box type: '${type}'`);
        box = new Box(size);
        box.type = type;
        box.has_unparsed_data = true;
      } else {
        if (uuid in BoxRegistry.uuid) {
          box = new BoxRegistry.uuid[uuid](size);
        } else {
          Log.warn("BoxParser", `Unknown UUID box type: '${uuid}'`);
          box = new Box(size);
          box.type = type;
          box.uuid = uuid;
          box.has_unparsed_data = true;
        }
      }
    }
  }
  box.original_size = originalSize;
  box.hdr_size = hdr_size;
  box.start = start2;
  if (box.write === Box.prototype.write && box.type !== "mdat") {
    Log.info(
      "BoxParser",
      "'" + box_type + "' box writing not yet implemented, keeping unparsed data in memory for later write"
    );
    box.parseDataAndRewind(stream);
  }
  box.parse(stream);
  const diff = stream.getPosition() - (box.start + box.size);
  if (diff < 0) {
    Log.warn(
      "BoxParser",
      "Parsing of box '" + box_type + "' did not read the entire indicated box data size (missing " + -diff + " bytes), seeking forward"
    );
    stream.seek(box.start + box.size);
  } else if (diff > 0 && box.size !== 0) {
    Log.error(
      "BoxParser",
      "Parsing of box '" + box_type + "' read " + diff + " more bytes than the indicated box data size, seeking backwards"
    );
    stream.seek(box.start + box.size);
  }
  return { code: OK, box, size: box.size };
}
var ContainerBox = class extends Box {
  /** @bundle box-write.js */
  write(stream) {
    this.size = 0;
    this.writeHeader(stream);
    if (this.boxes) {
      for (let i = 0; i < this.boxes.length; i++) {
        if (this.boxes[i]) {
          this.boxes[i].write(stream);
          this.size += this.boxes[i].size;
        }
      }
    }
    Log.debug("BoxWriter", "Adjusting box " + this.type + " with new size " + this.size);
    stream.adjustUint32(this.sizePosition, this.size);
  }
  /** @bundle box-print.js */
  print(output) {
    this.printHeader(output);
    for (let i = 0; i < this.boxes.length; i++) {
      if (this.boxes[i]) {
        const prev_indent = output.indent;
        output.indent += " ";
        this.boxes[i].print(output);
        output.indent = prev_indent;
      }
    }
  }
  /** @bundle box-parse.js */
  parse(stream) {
    let ret;
    while (stream.getPosition() < this.start + this.size) {
      ret = parseOneBox(stream, false, this.size - (stream.getPosition() - this.start));
      if (ret.code === OK) {
        const box = ret.box;
        if (!this.boxes) {
          this.boxes = [];
        }
        this.boxes.push(box);
        if (this.subBoxNames && this.subBoxNames.indexOf(box.type) !== -1) {
          const fourcc = this.subBoxNames[this.subBoxNames.indexOf(box.type)] + "s";
          if (!this[fourcc]) this[fourcc] = [];
          this[fourcc].push(box);
        } else {
          const box_type = box.type !== "uuid" ? box.type : box.uuid;
          if (this[box_type]) {
            Log.warn(
              "ContainerBox",
              `Box of type ${box_type} already exists in container box ${this.type}.`
            );
          } else {
            this[box_type] = box;
          }
        }
      } else {
        return;
      }
    }
  }
};
var SampleEntry = (_d = class extends ContainerBox {
  constructor(size, hdr_size, start2) {
    super(size);
    this.hdr_size = hdr_size;
    this.start = start2;
  }
  /** @bundle box-codecs.js */
  isVideo() {
    return false;
  }
  /** @bundle box-codecs.js */
  isAudio() {
    return false;
  }
  /** @bundle box-codecs.js */
  isSubtitle() {
    return false;
  }
  /** @bundle box-codecs.js */
  isMetadata() {
    return false;
  }
  /** @bundle box-codecs.js */
  isHint() {
    return false;
  }
  /** @bundle box-codecs.js */
  getCodec() {
    return this.type.replace(".", "");
  }
  /** @bundle box-codecs.js */
  getWidth() {
    return "";
  }
  /** @bundle box-codecs.js */
  getHeight() {
    return "";
  }
  /** @bundle box-codecs.js */
  getChannelCount() {
    return "";
  }
  /** @bundle box-codecs.js */
  getSampleRate() {
    return "";
  }
  /** @bundle box-codecs.js */
  getSampleSize() {
    return "";
  }
  /** @bundle parsing/sampleentries/sampleentry.js */
  parseHeader(stream) {
    stream.readUint8Array(6);
    this.data_reference_index = stream.readUint16();
    this.hdr_size += 8;
  }
  /** @bundle parsing/sampleentries/sampleentry.js */
  parse(stream) {
    this.parseHeader(stream);
    this.data = stream.readUint8Array(this.size - this.hdr_size);
  }
  /** @bundle parsing/sampleentries/sampleentry.js */
  parseDataAndRewind(stream) {
    this.parseHeader(stream);
    this.data = stream.readUint8Array(this.size - this.hdr_size);
    this.hdr_size -= 8;
    stream.seek(this.start + this.hdr_size);
  }
  /** @bundle parsing/sampleentries/sampleentry.js */
  parseFooter(stream) {
    super.parse(stream);
  }
  /** @bundle writing/sampleentry.js */
  writeHeader(stream) {
    this.size = 8;
    super.writeHeader(stream);
    stream.writeUint8(0);
    stream.writeUint8(0);
    stream.writeUint8(0);
    stream.writeUint8(0);
    stream.writeUint8(0);
    stream.writeUint8(0);
    stream.writeUint16(this.data_reference_index);
  }
  /** @bundle writing/sampleentry.js */
  writeFooter(stream) {
    if (this.boxes) {
      for (let i = 0; i < this.boxes.length; i++) {
        this.boxes[i].write(stream);
        this.size += this.boxes[i].size;
      }
    }
    Log.debug("BoxWriter", "Adjusting box " + this.type + " with new size " + this.size);
    stream.adjustUint32(this.sizePosition, this.size);
  }
  /** @bundle writing/sampleentry.js */
  write(stream) {
    this.writeHeader(stream);
    stream.writeUint8Array(this.data);
    this.size += this.data.length;
    Log.debug("BoxWriter", "Adjusting box " + this.type + " with new size " + this.size);
    stream.adjustUint32(this.sizePosition, this.size);
  }
}, _d.registryId = /* @__PURE__ */ Symbol.for("SampleEntryIdentifier"), _d);
var HintSampleEntry = class extends SampleEntry {
};
var MetadataSampleEntry = class extends SampleEntry {
  /** @bundle box-codecs.js */
  isMetadata() {
    return true;
  }
};
var SubtitleSampleEntry = class extends SampleEntry {
  /** @bundle box-codecs.js */
  isSubtitle() {
    return true;
  }
};
var TextSampleEntry = class extends SampleEntry {
};
var VisualSampleEntry = class extends SampleEntry {
  parse(stream) {
    this.parseHeader(stream);
    stream.readUint16();
    stream.readUint16();
    stream.readUint32Array(3);
    this.width = stream.readUint16();
    this.height = stream.readUint16();
    this.horizresolution = stream.readUint32();
    this.vertresolution = stream.readUint32();
    stream.readUint32();
    this.frame_count = stream.readUint16();
    const compressorname_length = Math.min(31, stream.readUint8());
    this.compressorname = stream.readString(compressorname_length);
    if (compressorname_length < 31) {
      stream.readString(31 - compressorname_length);
    }
    this.depth = stream.readUint16();
    stream.readUint16();
    this.parseFooter(stream);
  }
  /** @bundle box-codecs.js */
  isVideo() {
    return true;
  }
  /** @bundle box-codecs.js */
  getWidth() {
    return this.width;
  }
  /** @bundle box-codecs.js */
  getHeight() {
    return this.height;
  }
  /** @bundle writing/sampleentries/sampleentry.js */
  write(stream) {
    this.writeHeader(stream);
    this.size += 2 * 7 + 6 * 4 + 32;
    stream.writeUint16(0);
    stream.writeUint16(0);
    stream.writeUint32(0);
    stream.writeUint32(0);
    stream.writeUint32(0);
    stream.writeUint16(this.width);
    stream.writeUint16(this.height);
    stream.writeUint32(this.horizresolution);
    stream.writeUint32(this.vertresolution);
    stream.writeUint32(0);
    stream.writeUint16(this.frame_count);
    stream.writeUint8(Math.min(31, this.compressorname.length));
    stream.writeString(this.compressorname, void 0, 31);
    stream.writeUint16(this.depth);
    stream.writeInt16(-1);
    this.writeFooter(stream);
  }
};
var AudioSampleEntry = class extends SampleEntry {
  parse(stream) {
    this.parseHeader(stream);
    this.version = stream.readUint16();
    stream.readUint16();
    stream.readUint32();
    this.channel_count = stream.readUint16();
    this.samplesize = stream.readUint16();
    stream.readUint16();
    stream.readUint16();
    this.samplerate = stream.readUint32() / (1 << 16);
    const isQT = stream.isofile?.ftyp?.major_brand.includes("qt");
    if (isQT) {
      if (this.version === 1) {
        this.extensions = stream.readUint8Array(16);
      } else if (this.version === 2) {
        this.extensions = stream.readUint8Array(36);
      }
    }
    this.parseFooter(stream);
  }
  /** @bundle box-codecs.js */
  isAudio() {
    return true;
  }
  /** @bundle box-codecs.js */
  getChannelCount() {
    return this.channel_count;
  }
  /** @bundle box-codecs.js */
  getSampleRate() {
    return this.samplerate;
  }
  /** @bundle box-codecs.js */
  getSampleSize() {
    return this.samplesize;
  }
  /** @bundle writing/sampleentry.js */
  write(stream) {
    this.writeHeader(stream);
    this.size += 2 * 4 + 3 * 4;
    stream.writeUint32(0);
    stream.writeUint32(0);
    stream.writeUint16(this.channel_count);
    stream.writeUint16(this.samplesize);
    stream.writeUint16(0);
    stream.writeUint16(0);
    stream.writeUint32(this.samplerate << 16);
    this.writeFooter(stream);
  }
};
var SystemSampleEntry = class extends SampleEntry {
  parse(stream) {
    this.parseHeader(stream);
    this.parseFooter(stream);
  }
  /** @bundle writing/sampleentry.js */
  write(stream) {
    this.writeHeader(stream);
    this.writeFooter(stream);
  }
};
var ParameterSetArray = class extends Array {
  toString() {
    let str = "<table class='inner-table'>";
    str += "<thead><tr><th>length</th><th>nalu_data</th></tr></thead>";
    str += "<tbody>";
    for (let i = 0; i < this.length; i++) {
      const nalu = this[i];
      str += "<tr>";
      str += "<td>" + nalu.length + "</td>";
      str += "<td>";
      str += nalu.data.reduce(function(str2, byte) {
        return str2 + byte.toString(16).padStart(2, "0");
      }, "0x");
      str += "</td></tr>";
    }
    str += "</tbody></table>";
    return str;
  }
};
var avcCBox = (_e = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "AVCConfigurationBox";
  }
  parse(stream) {
    this.configurationVersion = stream.readUint8();
    this.AVCProfileIndication = stream.readUint8();
    this.profile_compatibility = stream.readUint8();
    this.AVCLevelIndication = stream.readUint8();
    this.lengthSizeMinusOne = stream.readUint8() & 3;
    this.nb_SPS_nalus = stream.readUint8() & 31;
    let toparse = this.size - this.hdr_size - 6;
    this.SPS = new ParameterSetArray();
    for (let i = 0; i < this.nb_SPS_nalus; i++) {
      const length = stream.readUint16();
      this.SPS.push({ length, data: stream.readUint8Array(length) });
      toparse -= 2 + length;
    }
    this.nb_PPS_nalus = stream.readUint8();
    toparse--;
    this.PPS = new ParameterSetArray();
    for (let i = 0; i < this.nb_PPS_nalus; i++) {
      const length = stream.readUint16();
      this.PPS.push({ length, data: stream.readUint8Array(length) });
      toparse -= 2 + length;
    }
    if (toparse > 0) {
      this.ext = stream.readUint8Array(toparse);
    }
  }
  /** @bundle writing/avcC.js */
  write(stream) {
    this.size = 7;
    for (let i = 0; i < this.SPS.length; i++) {
      this.size += 2 + this.SPS[i].length;
    }
    for (let i = 0; i < this.PPS.length; i++) {
      this.size += 2 + this.PPS[i].length;
    }
    if (this.ext) {
      this.size += this.ext.length;
    }
    this.writeHeader(stream);
    stream.writeUint8(this.configurationVersion);
    stream.writeUint8(this.AVCProfileIndication);
    stream.writeUint8(this.profile_compatibility);
    stream.writeUint8(this.AVCLevelIndication);
    stream.writeUint8(this.lengthSizeMinusOne + (63 << 2));
    stream.writeUint8(this.SPS.length + (7 << 5));
    for (let i = 0; i < this.SPS.length; i++) {
      stream.writeUint16(this.SPS[i].length);
      stream.writeUint8Array(this.SPS[i].data);
    }
    stream.writeUint8(this.PPS.length);
    for (let i = 0; i < this.PPS.length; i++) {
      stream.writeUint16(this.PPS[i].length);
      stream.writeUint8Array(this.PPS[i].data);
    }
    if (this.ext) {
      stream.writeUint8Array(this.ext);
    }
  }
}, _e.fourcc = "avcC", _e);
var mdatBox = (_f = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "MediaDataBox";
  }
}, _f.fourcc = "mdat", _f);
var idatBox = (_g = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "ItemDataBox";
  }
}, _g.fourcc = "idat", _g);
var freeBox = (_h = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "FreeSpaceBox";
  }
}, _h.fourcc = "free", _h);
var skipBox = (_i = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "FreeSpaceBox";
  }
}, _i.fourcc = "skip", _i);
var hmhdBox = (_j = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "HintMediaHeaderBox";
  }
}, _j.fourcc = "hmhd", _j);
var nmhdBox = (_k = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "NullMediaHeaderBox";
  }
}, _k.fourcc = "nmhd", _k);
var iodsBox = (_l = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "ObjectDescriptorBox";
  }
}, _l.fourcc = "iods", _l);
var xmlBox = (_m = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "XMLBox";
  }
}, _m.fourcc = "xml ", _m);
var bxmlBox = (_n = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "BinaryXMLBox";
  }
}, _n.fourcc = "bxml", _n);
var iproBox = (_o = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "ItemProtectionBox";
    this.sinfs = [];
  }
  get protections() {
    return this.sinfs;
  }
}, _o.fourcc = "ipro", _o);
var moovBox = (_p = class extends ContainerBox {
  constructor() {
    super(...arguments);
    this.box_name = "MovieBox";
    this.traks = [];
    this.psshs = [];
    this.subBoxNames = ["trak", "pssh"];
  }
}, _p.fourcc = "moov", _p);
var trakBox = (_q = class extends ContainerBox {
  constructor() {
    super(...arguments);
    this.box_name = "TrackBox";
    this.samples = [];
  }
}, _q.fourcc = "trak", _q);
var edtsBox = (_r = class extends ContainerBox {
  constructor() {
    super(...arguments);
    this.box_name = "EditBox";
  }
}, _r.fourcc = "edts", _r);
var mdiaBox = (_s = class extends ContainerBox {
  constructor() {
    super(...arguments);
    this.box_name = "MediaBox";
  }
}, _s.fourcc = "mdia", _s);
var minfBox = (_t = class extends ContainerBox {
  constructor() {
    super(...arguments);
    this.box_name = "MediaInformationBox";
  }
}, _t.fourcc = "minf", _t);
var dinfBox = (_u = class extends ContainerBox {
  constructor() {
    super(...arguments);
    this.box_name = "DataInformationBox";
  }
}, _u.fourcc = "dinf", _u);
var stblBox = (_v = class extends ContainerBox {
  constructor() {
    super(...arguments);
    this.box_name = "SampleTableBox";
    this.sgpds = [];
    this.sbgps = [];
    this.subBoxNames = ["sgpd", "sbgp"];
  }
}, _v.fourcc = "stbl", _v);
var mvexBox = (_w = class extends ContainerBox {
  constructor() {
    super(...arguments);
    this.box_name = "MovieExtendsBox";
    this.trexs = [];
    this.subBoxNames = ["trex"];
  }
}, _w.fourcc = "mvex", _w);
var moofBox = (_x = class extends ContainerBox {
  constructor() {
    super(...arguments);
    this.box_name = "MovieFragmentBox";
    this.trafs = [];
    this.subBoxNames = ["traf"];
  }
}, _x.fourcc = "moof", _x);
var trafBox = (_y = class extends ContainerBox {
  constructor() {
    super(...arguments);
    this.box_name = "TrackFragmentBox";
    this.truns = [];
    this.sgpds = [];
    this.sbgps = [];
    this.subBoxNames = ["trun", "sgpd", "sbgp"];
  }
}, _y.fourcc = "traf", _y);
var vttcBox = (_z = class extends ContainerBox {
  constructor() {
    super(...arguments);
    this.box_name = "VTTCueBox";
  }
}, _z.fourcc = "vttc", _z);
var mfraBox = (_A = class extends ContainerBox {
  constructor() {
    super(...arguments);
    this.box_name = "MovieFragmentRandomAccessBox";
    this.tfras = [];
    this.subBoxNames = ["tfra"];
  }
}, _A.fourcc = "mfra", _A);
var mecoBox = (_B = class extends ContainerBox {
  constructor() {
    super(...arguments);
    this.box_name = "AdditionalMetadataContainerBox";
  }
}, _B.fourcc = "meco", _B);
var hntiBox = (_C = class extends ContainerBox {
  constructor() {
    super(...arguments);
    this.box_name = "trackhintinformation";
    this.subBoxNames = ["sdp ", "rtp "];
  }
}, _C.fourcc = "hnti", _C);
var hinfBox = (_D = class extends ContainerBox {
  constructor() {
    super(...arguments);
    this.box_name = "hintstatisticsbox";
    this.maxrs = [];
    this.subBoxNames = ["maxr"];
  }
}, _D.fourcc = "hinf", _D);
var strkBox = (_E = class extends ContainerBox {
  constructor() {
    super(...arguments);
    this.box_name = "SubTrackBox";
  }
}, _E.fourcc = "strk", _E);
var strdBox = (_F = class extends ContainerBox {
  constructor() {
    super(...arguments);
    this.box_name = "SubTrackDefinitionBox";
  }
}, _F.fourcc = "strd", _F);
var sinfBox = (_G = class extends ContainerBox {
  constructor() {
    super(...arguments);
    this.box_name = "ProtectionSchemeInfoBox";
  }
}, _G.fourcc = "sinf", _G);
var rinfBox = (_H = class extends ContainerBox {
  constructor() {
    super(...arguments);
    this.box_name = "RestrictedSchemeInfoBox";
  }
}, _H.fourcc = "rinf", _H);
var schiBox = (_I = class extends ContainerBox {
  constructor() {
    super(...arguments);
    this.box_name = "SchemeInformationBox";
  }
}, _I.fourcc = "schi", _I);
var trgrBox = (_J = class extends ContainerBox {
  constructor() {
    super(...arguments);
    this.box_name = "TrackGroupBox";
  }
}, _J.fourcc = "trgr", _J);
var udtaBox = (_K = class extends ContainerBox {
  constructor() {
    super(...arguments);
    this.box_name = "UserDataBox";
    this.kinds = [];
    this.strks = [];
    this.subBoxNames = ["kind", "strk"];
  }
}, _K.fourcc = "udta", _K);
var iprpBox = (_L = class extends ContainerBox {
  constructor() {
    super(...arguments);
    this.box_name = "ItemPropertiesBox";
    this.ipmas = [];
    this.subBoxNames = ["ipma"];
  }
}, _L.fourcc = "iprp", _L);
var ipcoBox = (_M = class extends ContainerBox {
  constructor() {
    super(...arguments);
    this.box_name = "ItemPropertyContainerBox";
    this.hvcCs = [];
    this.ispes = [];
    this.claps = [];
    this.irots = [];
    this.subBoxNames = ["hvcC", "ispe", "clap", "irot"];
  }
}, _M.fourcc = "ipco", _M);
var grplBox = (_N = class extends ContainerBox {
  constructor() {
    super(...arguments);
    this.box_name = "GroupsListBox";
  }
}, _N.fourcc = "grpl", _N);
var j2kHBox = (_O = class extends ContainerBox {
  constructor() {
    super(...arguments);
    this.box_name = "J2KHeaderInfoBox";
  }
}, _O.fourcc = "j2kH", _O);
var etypBox = (_P = class extends ContainerBox {
  constructor() {
    super(...arguments);
    this.box_name = "ExtendedTypeBox";
    this.tycos = [];
    this.subBoxNames = ["tyco"];
  }
}, _P.fourcc = "etyp", _P);
var povdBox = (_Q = class extends ContainerBox {
  constructor() {
    super(...arguments);
    this.box_name = "ProjectedOmniVideoBox";
    this.subBoxNames = ["prfr"];
  }
}, _Q.fourcc = "povd", _Q);
var drefBox = (_R = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "DataReferenceBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.entries = [];
    const entry_count = stream.readUint32();
    for (let i = 0; i < entry_count; i++) {
      const ret = parseOneBox(stream, false, this.size - (stream.getPosition() - this.start));
      if (ret.code === OK) {
        const box = ret.box;
        this.entries.push(box);
      } else {
        return;
      }
    }
  }
  /** @bundle writing/dref.js */
  write(stream) {
    this.version = 0;
    this.flags = 0;
    this.size = 4;
    this.writeHeader(stream);
    stream.writeUint32(this.entries.length);
    for (let i = 0; i < this.entries.length; i++) {
      this.entries[i].write(stream);
      this.size += this.entries[i].size;
    }
    Log.debug("BoxWriter", "Adjusting box " + this.type + " with new size " + this.size);
    stream.adjustUint32(this.sizePosition, this.size);
  }
}, _R.fourcc = "dref", _R);
var elngBox = (_S = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "ExtendedLanguageBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.extended_language = stream.readString(this.size - this.hdr_size);
  }
  /** @bundle writing/elng.js */
  write(stream) {
    this.version = 0;
    this.flags = 0;
    this.size = this.extended_language.length;
    this.writeHeader(stream);
    stream.writeString(this.extended_language);
  }
}, _S.fourcc = "elng", _S);
var ftypBox = (_T = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "FileTypeBox";
  }
  parse(stream) {
    let toparse = this.size - this.hdr_size;
    this.major_brand = stream.readString(4);
    this.minor_version = stream.readUint32();
    toparse -= 8;
    this.compatible_brands = [];
    let i = 0;
    while (toparse >= 4) {
      this.compatible_brands[i] = stream.readString(4);
      toparse -= 4;
      i++;
    }
  }
  /** @bundle writing/ftyp.js */
  write(stream) {
    this.size = 8 + 4 * this.compatible_brands.length;
    this.writeHeader(stream);
    stream.writeString(this.major_brand, void 0, 4);
    stream.writeUint32(this.minor_version);
    for (let i = 0; i < this.compatible_brands.length; i++) {
      stream.writeString(this.compatible_brands[i], void 0, 4);
    }
  }
}, _T.fourcc = "ftyp", _T);
var hdlrBox = (_U = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "HandlerBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    if (this.version === 0) {
      stream.readUint32();
      this.handler = stream.readString(4);
      stream.readUint32Array(3);
      if (!this.isEndOfBox(stream)) {
        const name_size = this.start + this.size - stream.getPosition();
        this.name = stream.readCString();
        const end = this.start + this.size - 1;
        stream.seek(end);
        const lastByte = stream.readUint8();
        if (lastByte !== 0 && name_size > 1) {
          Log.info(
            "BoxParser",
            "Warning: hdlr name is not null-terminated, possibly length-prefixed string. Trimming first byte."
          );
          this.name = this.name.slice(1);
        }
      }
    }
  }
  /** @bundle writing/hldr.js */
  write(stream) {
    this.size = 5 * 4 + this.name.length + 1;
    this.version = 0;
    this.flags = 0;
    this.writeHeader(stream);
    stream.writeUint32(0);
    stream.writeString(this.handler, void 0, 4);
    stream.writeUint32Array([0, 0, 0]);
    stream.writeCString(this.name);
  }
}, _U.fourcc = "hdlr", _U);
var hvcCBox = (_V = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "HEVCConfigurationBox";
  }
  parse(stream) {
    this.configurationVersion = stream.readUint8();
    let tmp_byte = stream.readUint8();
    this.general_profile_space = tmp_byte >> 6;
    this.general_tier_flag = (tmp_byte & 32) >> 5;
    this.general_profile_idc = tmp_byte & 31;
    this.general_profile_compatibility = stream.readUint32();
    this.general_constraint_indicator = stream.readUint8Array(6);
    this.general_level_idc = stream.readUint8();
    this.min_spatial_segmentation_idc = stream.readUint16() & 4095;
    this.parallelismType = stream.readUint8() & 3;
    this.chroma_format_idc = stream.readUint8() & 3;
    this.bit_depth_luma_minus8 = stream.readUint8() & 7;
    this.bit_depth_chroma_minus8 = stream.readUint8() & 7;
    this.avgFrameRate = stream.readUint16();
    tmp_byte = stream.readUint8();
    this.constantFrameRate = tmp_byte >> 6;
    this.numTemporalLayers = (tmp_byte & 13) >> 3;
    this.temporalIdNested = (tmp_byte & 4) >> 2;
    this.lengthSizeMinusOne = tmp_byte & 3;
    this.nalu_arrays = [];
    const numOfArrays = stream.readUint8();
    for (let i = 0; i < numOfArrays; i++) {
      const nalu_array = [];
      this.nalu_arrays.push(nalu_array);
      tmp_byte = stream.readUint8();
      nalu_array.completeness = (tmp_byte & 128) >> 7;
      nalu_array.nalu_type = tmp_byte & 63;
      const numNalus = stream.readUint16();
      for (let j = 0; j < numNalus; j++) {
        const length = stream.readUint16();
        nalu_array.push({
          data: stream.readUint8Array(length)
        });
      }
    }
  }
  /** @bundle writing/write.js */
  write(stream) {
    this.size = 23;
    for (let i = 0; i < this.nalu_arrays.length; i++) {
      this.size += 3;
      for (let j = 0; j < this.nalu_arrays[i].length; j++) {
        this.size += 2 + this.nalu_arrays[i][j].data.length;
      }
    }
    this.writeHeader(stream);
    stream.writeUint8(this.configurationVersion);
    stream.writeUint8(
      (this.general_profile_space << 6) + (this.general_tier_flag << 5) + this.general_profile_idc
    );
    stream.writeUint32(this.general_profile_compatibility);
    stream.writeUint8Array(this.general_constraint_indicator);
    stream.writeUint8(this.general_level_idc);
    stream.writeUint16(this.min_spatial_segmentation_idc + (15 << 24));
    stream.writeUint8(this.parallelismType + (63 << 2));
    stream.writeUint8(this.chroma_format_idc + (63 << 2));
    stream.writeUint8(this.bit_depth_luma_minus8 + (31 << 3));
    stream.writeUint8(this.bit_depth_chroma_minus8 + (31 << 3));
    stream.writeUint16(this.avgFrameRate);
    stream.writeUint8(
      (this.constantFrameRate << 6) + (this.numTemporalLayers << 3) + (this.temporalIdNested << 2) + this.lengthSizeMinusOne
    );
    stream.writeUint8(this.nalu_arrays.length);
    for (let i = 0; i < this.nalu_arrays.length; i++) {
      stream.writeUint8((this.nalu_arrays[i].completeness << 7) + this.nalu_arrays[i].nalu_type);
      stream.writeUint16(this.nalu_arrays[i].length);
      for (let j = 0; j < this.nalu_arrays[i].length; j++) {
        stream.writeUint16(this.nalu_arrays[i][j].data.length);
        stream.writeUint8Array(this.nalu_arrays[i][j].data);
      }
    }
  }
}, _V.fourcc = "hvcC", _V);
var mdhdBox = (_W = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "MediaHeaderBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    if (this.version === 1) {
      this.creation_time = stream.readUint64();
      this.modification_time = stream.readUint64();
      this.timescale = stream.readUint32();
      this.duration = stream.readUint64();
    } else {
      this.creation_time = stream.readUint32();
      this.modification_time = stream.readUint32();
      this.timescale = stream.readUint32();
      this.duration = stream.readUint32();
    }
    this.parseLanguage(stream);
    stream.readUint16();
  }
  /** @bundle writing/mdhd.js */
  write(stream) {
    const useVersion1 = this.modification_time > MAX_UINT32 || this.creation_time > MAX_UINT32 || this.duration > MAX_UINT32 || this.version === 1;
    this.version = useVersion1 ? 1 : 0;
    this.size = 4 * 4 + 2 * 2;
    this.size += useVersion1 ? 3 * 4 : 0;
    this.flags = 0;
    this.writeHeader(stream);
    if (useVersion1) {
      stream.writeUint64(this.creation_time);
      stream.writeUint64(this.modification_time);
      stream.writeUint32(this.timescale);
      stream.writeUint64(this.duration);
    } else {
      stream.writeUint32(this.creation_time);
      stream.writeUint32(this.modification_time);
      stream.writeUint32(this.timescale);
      stream.writeUint32(this.duration);
    }
    stream.writeUint16(this.language);
    stream.writeUint16(0);
  }
}, _W.fourcc = "mdhd", _W);
var mehdBox = (_X = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "MovieExtendsHeaderBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    if (this.flags & 1) {
      Log.warn("BoxParser", "mehd box incorrectly uses flags set to 1, converting version to 1");
      this.version = 1;
    }
    if (this.version === 1) {
      this.fragment_duration = stream.readUint64();
    } else {
      this.fragment_duration = stream.readUint32();
    }
  }
  /** @bundle writing/mehd.js */
  write(stream) {
    const useVersion1 = this.fragment_duration > MAX_UINT32 || this.version === 1;
    this.version = useVersion1 ? 1 : 0;
    this.size = 4;
    this.size += useVersion1 ? 4 : 0;
    this.flags = 0;
    this.writeHeader(stream);
    if (useVersion1) {
      stream.writeUint64(this.fragment_duration);
    } else {
      stream.writeUint32(this.fragment_duration);
    }
  }
}, _X.fourcc = "mehd", _X);
var infeBox = (_Y = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "ItemInfoEntry";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    if (this.version === 0 || this.version === 1) {
      this.item_ID = stream.readUint16();
      this.item_protection_index = stream.readUint16();
      this.item_name = stream.readCString();
      this.content_type = stream.readCString();
      if (!this.isEndOfBox(stream)) {
        this.content_encoding = stream.readCString();
      }
    }
    if (this.version === 1) {
      this.extension_type = stream.readString(4);
      Log.warn("BoxParser", "Cannot parse extension type");
      stream.seek(this.start + this.size);
      return;
    }
    if (this.version >= 2) {
      if (this.version === 2) {
        this.item_ID = stream.readUint16();
      } else if (this.version === 3) {
        this.item_ID = stream.readUint32();
      }
      this.item_protection_index = stream.readUint16();
      this.item_type = stream.readString(4);
      this.item_name = stream.readCString();
      if (this.item_type === "mime") {
        this.content_type = stream.readCString();
        this.content_encoding = stream.readCString();
      } else if (this.item_type === "uri ") {
        this.item_uri_type = stream.readCString();
      }
    }
  }
}, _Y.fourcc = "infe", _Y);
var iinfBox = (_Z = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "ItemInfoBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    if (this.version === 0) {
      this.entry_count = stream.readUint16();
    } else {
      this.entry_count = stream.readUint32();
    }
    this.item_infos = [];
    for (let i = 0; i < this.entry_count; i++) {
      const ret = parseOneBox(stream, false, this.size - (stream.getPosition() - this.start));
      if (ret.code === OK) {
        const box = ret.box;
        if (box.type === "infe") {
          this.item_infos[i] = box;
        } else {
          Log.error("BoxParser", "Expected 'infe' box, got " + ret.box.type, stream.isofile);
        }
      } else {
        return;
      }
    }
  }
}, _Z.fourcc = "iinf", _Z);
var ilocBox = (__ = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "ItemLocationBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    let byte;
    byte = stream.readUint8();
    this.offset_size = byte >> 4 & 15;
    this.length_size = byte & 15;
    byte = stream.readUint8();
    this.base_offset_size = byte >> 4 & 15;
    if (this.version === 1 || this.version === 2) {
      this.index_size = byte & 15;
    } else {
      this.index_size = 0;
    }
    this.items = [];
    let item_count = 0;
    if (this.version < 2) {
      item_count = stream.readUint16();
    } else if (this.version === 2) {
      item_count = stream.readUint32();
    } else {
      throw new Error("version of iloc box not supported");
    }
    for (let i = 0; i < item_count; i++) {
      let item_ID = 0;
      let construction_method = 0;
      let base_offset = 0;
      if (this.version < 2) {
        item_ID = stream.readUint16();
      } else if (this.version === 2) {
        item_ID = stream.readUint32();
      } else {
        throw new Error("version of iloc box not supported");
      }
      if (this.version === 1 || this.version === 2) {
        construction_method = stream.readUint16() & 15;
      } else {
        construction_method = 0;
      }
      const data_reference_index = stream.readUint16();
      switch (this.base_offset_size) {
        case 0:
          base_offset = 0;
          break;
        case 4:
          base_offset = stream.readUint32();
          break;
        case 8:
          base_offset = stream.readUint64();
          break;
        default:
          throw new Error("Error reading base offset size");
      }
      const extents = [];
      const extent_count = stream.readUint16();
      for (let j = 0; j < extent_count; j++) {
        let extent_index = 0;
        let extent_offset = 0;
        let extent_length = 0;
        if (this.version === 1 || this.version === 2) {
          switch (this.index_size) {
            case 0:
              extent_index = 0;
              break;
            case 4:
              extent_index = stream.readUint32();
              break;
            case 8:
              extent_index = stream.readUint64();
              break;
            default:
              throw new Error("Error reading extent index");
          }
        }
        switch (this.offset_size) {
          case 0:
            extent_offset = 0;
            break;
          case 4:
            extent_offset = stream.readUint32();
            break;
          case 8:
            extent_offset = stream.readUint64();
            break;
          default:
            throw new Error("Error reading extent index");
        }
        switch (this.length_size) {
          case 0:
            extent_length = 0;
            break;
          case 4:
            extent_length = stream.readUint32();
            break;
          case 8:
            extent_length = stream.readUint64();
            break;
          default:
            throw new Error("Error reading extent index");
        }
        extents.push({ extent_index, extent_length, extent_offset });
      }
      this.items.push({
        base_offset,
        construction_method,
        item_ID,
        data_reference_index,
        extents
      });
    }
  }
}, __.fourcc = "iloc", __);
var REFERENCE_TYPE_NAMES = {
  auxl: "Auxiliary image item",
  base: "Pre-derived image item base",
  cdsc: "Item describes referenced item",
  dimg: "Derived image item",
  dpnd: "Item coding dependency",
  eroi: "Region",
  evir: "EVC slice",
  exbl: "Scalable image item",
  "fdl ": "File delivery",
  font: "Font item",
  iloc: "Item data location",
  mask: "Region mask",
  mint: "Data integrity",
  pred: "Predictively coded item",
  prem: "Pre-multiplied item",
  tbas: "HEVC tile track base item",
  text: "Text item",
  thmb: "Thumbnail image item"
};
var irefBox = (_$ = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "ItemReferenceBox";
    this.references = [];
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.references = [];
    while (stream.getPosition() < this.start + this.size) {
      const ret = parseOneBox(stream, true, this.size - (stream.getPosition() - this.start));
      if (ret.code === OK) {
        let name = "Unknown item reference";
        if (!_$.allowed_types.includes(ret.type)) {
          Log.warn("BoxParser", `Unknown item reference type: '${ret.type}'`);
        } else name = REFERENCE_TYPE_NAMES[ret.type];
        const box = this.version === 0 ? new SingleItemTypeReferenceBox(ret.type, ret.size, name, ret.hdr_size, ret.start) : new SingleItemTypeReferenceBoxLarge(
          ret.type,
          ret.size,
          name,
          ret.hdr_size,
          ret.start
        );
        if (box.write === Box.prototype.write && box.type !== "mdat") {
          Log.warn(
            "BoxParser",
            box.type + " box writing not yet implemented, keeping unparsed data in memory for later write"
          );
          box.parseDataAndRewind(stream);
        }
        box.parse(stream);
        this.references.push(box);
      } else {
        return;
      }
    }
  }
}, _$.fourcc = "iref", _$.allowed_types = [
  "auxl",
  "base",
  "cdsc",
  "dimg",
  "dpnd",
  "eroi",
  "evir",
  "exbl",
  "fdl ",
  "font",
  "iloc",
  "mask",
  "mint",
  "pred",
  "prem",
  "tbas",
  "text",
  "thmb"
], _$);
var pitmBox = (_aa = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "PrimaryItemBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    if (this.version === 0) {
      this.item_id = stream.readUint16();
    } else {
      this.item_id = stream.readUint32();
    }
  }
}, _aa.fourcc = "pitm", _aa);
var metaBox = (_ba = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "MetaBox";
    this.isQT = false;
  }
  parse(stream) {
    const pos = stream.getPosition();
    if (this.size > 8) {
      stream.readUint32();
      const qtType = stream.readString(4);
      switch (qtType) {
        case "hdlr":
        case "mhdr":
        case "keys":
        case "ilst":
        case "ctry":
        case "lang":
          this.isQT = true;
          break;
      }
      stream.seek(pos);
    }
    if (!this.isQT) this.parseFullHeader(stream);
    ContainerBox.prototype.parse.call(this, stream);
  }
}, _ba.fourcc = "meta", _ba);
var mfhdBox = (_ca = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "MovieFragmentHeaderBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.sequence_number = stream.readUint32();
  }
  /** @bundle writing/mfhd.js */
  write(stream) {
    this.version = 0;
    this.flags = 0;
    this.size = 4;
    this.writeHeader(stream);
    stream.writeUint32(this.sequence_number);
  }
}, _ca.fourcc = "mfhd", _ca);
var mvhdBox = (_da = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "MovieHeaderBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    if (this.version === 1) {
      this.creation_time = stream.readUint64();
      this.modification_time = stream.readUint64();
      this.timescale = stream.readUint32();
      this.duration = stream.readUint64();
    } else {
      this.creation_time = stream.readUint32();
      this.modification_time = stream.readUint32();
      this.timescale = stream.readUint32();
      this.duration = stream.readUint32();
    }
    this.rate = stream.readUint32();
    this.volume = stream.readUint16() >> 8;
    stream.readUint16();
    stream.readUint32Array(2);
    this.matrix = stream.readInt32Array(9);
    stream.readUint32Array(6);
    this.next_track_id = stream.readUint32();
  }
  /** @bundle writing/mvhd.js */
  write(stream) {
    const useVersion1 = this.modification_time > MAX_UINT32 || this.creation_time > MAX_UINT32 || this.duration > MAX_UINT32 || this.version === 1;
    this.version = useVersion1 ? 1 : 0;
    this.size = 4 * 4 + 20 * 4;
    this.size += useVersion1 ? 3 * 4 : 0;
    this.flags = 0;
    this.writeHeader(stream);
    if (useVersion1) {
      stream.writeUint64(this.creation_time);
      stream.writeUint64(this.modification_time);
      stream.writeUint32(this.timescale);
      stream.writeUint64(this.duration);
    } else {
      stream.writeUint32(this.creation_time);
      stream.writeUint32(this.modification_time);
      stream.writeUint32(this.timescale);
      stream.writeUint32(this.duration);
    }
    stream.writeUint32(this.rate);
    stream.writeUint16(this.volume << 8);
    stream.writeUint16(0);
    stream.writeUint32(0);
    stream.writeUint32(0);
    stream.writeInt32Array(this.matrix);
    stream.writeUint32(0);
    stream.writeUint32(0);
    stream.writeUint32(0);
    stream.writeUint32(0);
    stream.writeUint32(0);
    stream.writeUint32(0);
    stream.writeUint32(this.next_track_id);
  }
  /** @bundle box-print.js */
  print(output) {
    super.printHeader(output);
    output.log(output.indent + "creation_time: " + this.creation_time);
    output.log(output.indent + "modification_time: " + this.modification_time);
    output.log(output.indent + "timescale: " + this.timescale);
    output.log(output.indent + "duration: " + this.duration);
    output.log(output.indent + "rate: " + this.rate);
    output.log(output.indent + "volume: " + (this.volume >> 8));
    output.log(output.indent + "matrix: " + this.matrix.join(", "));
    output.log(output.indent + "next_track_id: " + this.next_track_id);
  }
}, _da.fourcc = "mvhd", _da);
var mettSampleEntry = (_ea = class extends MetadataSampleEntry {
  parse(stream) {
    this.parseHeader(stream);
    this.content_encoding = stream.readCString();
    this.mime_format = stream.readCString();
    this.parseFooter(stream);
  }
}, _ea.fourcc = "mett", _ea);
var metxSampleEntry = (_fa = class extends MetadataSampleEntry {
  parse(stream) {
    this.parseHeader(stream);
    this.content_encoding = stream.readCString();
    this.namespace = stream.readCString();
    this.schema_location = stream.readCString();
    this.parseFooter(stream);
  }
}, _fa.fourcc = "metx", _fa);
var av1CBox = (_ga = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "AV1CodecConfigurationBox";
  }
  parse(stream) {
    let tmp = stream.readUint8();
    if ((tmp >> 7 & 1) !== 1) {
      Log.error("BoxParser", "av1C marker problem", stream.isofile);
      return;
    }
    this.version = tmp & 127;
    if (this.version !== 1) {
      Log.error("BoxParser", "av1C version " + this.version + " not supported", stream.isofile);
      return;
    }
    tmp = stream.readUint8();
    this.seq_profile = tmp >> 5 & 7;
    this.seq_level_idx_0 = tmp & 31;
    tmp = stream.readUint8();
    this.seq_tier_0 = tmp >> 7 & 1;
    this.high_bitdepth = tmp >> 6 & 1;
    this.twelve_bit = tmp >> 5 & 1;
    this.monochrome = tmp >> 4 & 1;
    this.chroma_subsampling_x = tmp >> 3 & 1;
    this.chroma_subsampling_y = tmp >> 2 & 1;
    this.chroma_sample_position = tmp & 3;
    tmp = stream.readUint8();
    this.reserved_1 = tmp >> 5 & 7;
    if (this.reserved_1 !== 0) {
      Log.error("BoxParser", "av1C reserved_1 parsing problem", stream.isofile);
      return;
    }
    this.initial_presentation_delay_present = tmp >> 4 & 1;
    if (this.initial_presentation_delay_present === 1) {
      this.initial_presentation_delay_minus_one = tmp & 15;
    } else {
      this.reserved_2 = tmp & 15;
      if (this.reserved_2 !== 0) {
        Log.error("BoxParser", "av1C reserved_2 parsing problem", stream.isofile);
        return;
      }
    }
    const configOBUs_length = this.size - this.hdr_size - 4;
    this.configOBUs = stream.readUint8Array(configOBUs_length);
  }
}, _ga.fourcc = "av1C", _ga);
var esdsBox = (_ha = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "ElementaryStreamDescriptorBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    const esd_data = stream.readUint8Array(this.size - this.hdr_size);
    if ("MPEG4DescriptorParser" in DescriptorRegistry) {
      const esd_parser = new DescriptorRegistry.MPEG4DescriptorParser();
      this.esd = esd_parser.parseOneDescriptor(new DataStream(esd_data.buffer, 0));
    }
  }
}, _ha.fourcc = "esds", _ha);
var vpcCBox = (_ia = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "VPCodecConfigurationRecord";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    if (this.version === 1) {
      this.profile = stream.readUint8();
      this.level = stream.readUint8();
      const tmp = stream.readUint8();
      this.bitDepth = tmp >> 4;
      this.chromaSubsampling = tmp >> 1 & 7;
      this.videoFullRangeFlag = tmp & 1;
      this.colourPrimaries = stream.readUint8();
      this.transferCharacteristics = stream.readUint8();
      this.matrixCoefficients = stream.readUint8();
      this.codecIntializationDataSize = stream.readUint16();
      this.codecIntializationData = stream.readUint8Array(this.codecIntializationDataSize);
    } else {
      this.profile = stream.readUint8();
      this.level = stream.readUint8();
      let tmp = stream.readUint8();
      this.bitDepth = tmp >> 4 & 15;
      this.colorSpace = tmp & 15;
      tmp = stream.readUint8();
      this.chromaSubsampling = tmp >> 4 & 15;
      this.transferFunction = tmp >> 1 & 7;
      this.videoFullRangeFlag = tmp & 1;
      this.codecIntializationDataSize = stream.readUint16();
      this.codecIntializationData = stream.readUint8Array(this.codecIntializationDataSize);
    }
  }
}, _ia.fourcc = "vpcC", _ia);
var vvcCBox = (_ja = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "VvcConfigurationBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    const bitReader = {
      held_bits: void 0,
      num_held_bits: 0,
      stream_read_1_bytes: function(strm) {
        this.held_bits = strm.readUint8();
        this.num_held_bits = 1 * 8;
      },
      stream_read_2_bytes: function(strm) {
        this.held_bits = strm.readUint16();
        this.num_held_bits = 2 * 8;
      },
      extract_bits: function(num_bits) {
        const ret = this.held_bits >> this.num_held_bits - num_bits & (1 << num_bits) - 1;
        this.num_held_bits -= num_bits;
        return ret;
      }
    };
    bitReader.stream_read_1_bytes(stream);
    bitReader.extract_bits(5);
    this.lengthSizeMinusOne = bitReader.extract_bits(2);
    this.ptl_present_flag = bitReader.extract_bits(1);
    if (this.ptl_present_flag) {
      bitReader.stream_read_2_bytes(stream);
      this.ols_idx = bitReader.extract_bits(9);
      this.num_sublayers = bitReader.extract_bits(3);
      this.constant_frame_rate = bitReader.extract_bits(2);
      this.chroma_format_idc = bitReader.extract_bits(2);
      bitReader.stream_read_1_bytes(stream);
      this.bit_depth_minus8 = bitReader.extract_bits(3);
      bitReader.extract_bits(5);
      {
        bitReader.stream_read_2_bytes(stream);
        bitReader.extract_bits(2);
        this.num_bytes_constraint_info = bitReader.extract_bits(6);
        this.general_profile_idc = bitReader.extract_bits(7);
        this.general_tier_flag = bitReader.extract_bits(1);
        this.general_level_idc = stream.readUint8();
        bitReader.stream_read_1_bytes(stream);
        this.ptl_frame_only_constraint_flag = bitReader.extract_bits(1);
        this.ptl_multilayer_enabled_flag = bitReader.extract_bits(1);
        this.general_constraint_info = new Uint8Array(this.num_bytes_constraint_info);
        if (this.num_bytes_constraint_info) {
          for (let i = 0; i < this.num_bytes_constraint_info - 1; i++) {
            const cnstr1 = bitReader.extract_bits(6);
            bitReader.stream_read_1_bytes(stream);
            const cnstr2 = bitReader.extract_bits(2);
            this.general_constraint_info[i] = cnstr1 << 2 | cnstr2;
          }
          this.general_constraint_info[this.num_bytes_constraint_info - 1] = bitReader.extract_bits(6);
        } else {
          bitReader.extract_bits(6);
        }
        if (this.num_sublayers > 1) {
          bitReader.stream_read_1_bytes(stream);
          this.ptl_sublayer_present_mask = 0;
          for (let j = this.num_sublayers - 2; j >= 0; --j) {
            const val = bitReader.extract_bits(1);
            this.ptl_sublayer_present_mask |= val << j;
          }
          for (let j = this.num_sublayers; j <= 8 && this.num_sublayers > 1; ++j) {
            bitReader.extract_bits(1);
          }
          this.sublayer_level_idc = [];
          for (let j = this.num_sublayers - 2; j >= 0; --j) {
            if (this.ptl_sublayer_present_mask & 1 << j) {
              this.sublayer_level_idc[j] = stream.readUint8();
            }
          }
        }
        this.ptl_num_sub_profiles = stream.readUint8();
        this.general_sub_profile_idc = [];
        if (this.ptl_num_sub_profiles) {
          for (let i = 0; i < this.ptl_num_sub_profiles; i++) {
            this.general_sub_profile_idc.push(stream.readUint32());
          }
        }
      }
      this.max_picture_width = stream.readUint16();
      this.max_picture_height = stream.readUint16();
      this.avg_frame_rate = stream.readUint16();
    }
    const VVC_NALU_OPI = 12;
    const VVC_NALU_DEC_PARAM = 13;
    this.nalu_arrays = [];
    const num_of_arrays = stream.readUint8();
    for (let i = 0; i < num_of_arrays; i++) {
      const nalu_array = [];
      this.nalu_arrays.push(nalu_array);
      bitReader.stream_read_1_bytes(stream);
      nalu_array.completeness = bitReader.extract_bits(1);
      bitReader.extract_bits(2);
      nalu_array.nalu_type = bitReader.extract_bits(5);
      let numNalus = 1;
      if (nalu_array.nalu_type !== VVC_NALU_DEC_PARAM && nalu_array.nalu_type !== VVC_NALU_OPI) {
        numNalus = stream.readUint16();
      }
      for (let j = 0; j < numNalus; j++) {
        const len = stream.readUint16();
        nalu_array.push({
          data: stream.readUint8Array(len),
          length: len
        });
      }
    }
  }
}, _ja.fourcc = "vvcC", _ja);
var colrBox = (_ka = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "ColourInformationBox";
  }
  parse(stream) {
    this.colour_type = stream.readString(4);
    if (this.colour_type === "nclx") {
      this.colour_primaries = stream.readUint16();
      this.transfer_characteristics = stream.readUint16();
      this.matrix_coefficients = stream.readUint16();
      const tmp = stream.readUint8();
      this.full_range_flag = tmp >> 7;
    } else if (this.colour_type === "rICC") {
      this.ICC_profile = stream.readUint8Array(this.size - 4);
    } else if (this.colour_type === "prof") {
      this.ICC_profile = stream.readUint8Array(this.size - 4);
    }
  }
}, _ka.fourcc = "colr", _ka);
function decimalToHex(d, padding) {
  let hex = Number(d).toString(16);
  padding = typeof padding === "undefined" ? 2 : padding;
  while (hex.length < padding) {
    hex = "0" + hex;
  }
  return hex;
}
var avcCSampleEntryBase = class extends VisualSampleEntry {
  /** @bundle box-codecs.js */
  getCodec() {
    const baseCodec = super.getCodec();
    if (this.avcC) {
      return `${baseCodec}.${decimalToHex(this.avcC.AVCProfileIndication)}${decimalToHex(
        this.avcC.profile_compatibility
      )}${decimalToHex(this.avcC.AVCLevelIndication)}`;
    } else {
      return baseCodec;
    }
  }
};
var avc1SampleEntry = (_la = class extends avcCSampleEntryBase {
  constructor() {
    super(...arguments);
    this.box_name = "AVCSampleEntry";
  }
}, _la.fourcc = "avc1", _la);
var avc2SampleEntry = (_ma = class extends avcCSampleEntryBase {
  constructor() {
    super(...arguments);
    this.box_name = "AVC2SampleEntry";
  }
}, _ma.fourcc = "avc2", _ma);
var avc3SampleEntry = (_na = class extends avcCSampleEntryBase {
  constructor() {
    super(...arguments);
    this.box_name = "AVCSampleEntry";
  }
}, _na.fourcc = "avc3", _na);
var avc4SampleEntry = (_oa = class extends avcCSampleEntryBase {
  constructor() {
    super(...arguments);
    this.box_name = "AVC2SampleEntry";
  }
}, _oa.fourcc = "avc4", _oa);
var av01SampleEntry = (_pa = class extends VisualSampleEntry {
  constructor() {
    super(...arguments);
    this.box_name = "AV1SampleEntry";
  }
  /** @bundle box-codecs.js */
  getCodec() {
    const baseCodec = super.getCodec();
    const level_idx_0 = this.av1C.seq_level_idx_0;
    const level = level_idx_0 < 10 ? "0" + level_idx_0 : level_idx_0;
    let bitdepth;
    if (this.av1C.seq_profile === 2 && this.av1C.high_bitdepth === 1) {
      bitdepth = this.av1C.twelve_bit === 1 ? "12" : "10";
    } else if (this.av1C.seq_profile <= 2) {
      bitdepth = this.av1C.high_bitdepth === 1 ? "10" : "08";
    }
    return baseCodec + "." + this.av1C.seq_profile + "." + level + (this.av1C.seq_tier_0 ? "H" : "M") + "." + bitdepth;
  }
}, _pa.fourcc = "av01", _pa);
var dav1SampleEntry = (_qa = class extends VisualSampleEntry {
}, _qa.fourcc = "dav1", _qa);
var hvcCSampleEntryBase = class extends VisualSampleEntry {
  /** @bundle box-codecs.js */
  getCodec() {
    let baseCodec = super.getCodec();
    if (this.hvcC) {
      baseCodec += ".";
      switch (this.hvcC.general_profile_space) {
        case 0:
          baseCodec += "";
          break;
        case 1:
          baseCodec += "A";
          break;
        case 2:
          baseCodec += "B";
          break;
        case 3:
          baseCodec += "C";
          break;
      }
      baseCodec += this.hvcC.general_profile_idc;
      baseCodec += ".";
      let val = this.hvcC.general_profile_compatibility;
      let reversed = 0;
      for (let i = 0; i < 32; i++) {
        reversed |= val & 1;
        if (i === 31) break;
        reversed <<= 1;
        val >>= 1;
      }
      baseCodec += decimalToHex(reversed, 0);
      baseCodec += ".";
      if (this.hvcC.general_tier_flag === 0) {
        baseCodec += "L";
      } else {
        baseCodec += "H";
      }
      baseCodec += this.hvcC.general_level_idc;
      let hasByte = false;
      let constraint_string = "";
      for (let i = 5; i >= 0; i--) {
        if (this.hvcC.general_constraint_indicator[i] || hasByte) {
          constraint_string = "." + decimalToHex(this.hvcC.general_constraint_indicator[i], 0) + constraint_string;
          hasByte = true;
        }
      }
      baseCodec += constraint_string;
    }
    return baseCodec;
  }
};
var hvc1SampleEntry = (_ra = class extends hvcCSampleEntryBase {
  constructor() {
    super(...arguments);
    this.box_name = "HEVCSampleEntry";
  }
}, _ra.fourcc = "hvc1", _ra);
var hvc2SampleEntry = (_sa = class extends hvcCSampleEntryBase {
}, _sa.fourcc = "hvc2", _sa);
var hev1SampleEntry = (_ta = class extends hvcCSampleEntryBase {
  constructor() {
    super(...arguments);
    this.box_name = "HEVCSampleEntry";
    this.colrs = [];
    this.subBoxNames = ["colr"];
  }
}, _ta.fourcc = "hev1", _ta);
var hev2SampleEntry = (_ua = class extends hvcCSampleEntryBase {
}, _ua.fourcc = "hev2", _ua);
var hvt1SampleEntry = (_va = class extends VisualSampleEntry {
  constructor() {
    super(...arguments);
    this.box_name = "HEVCTileSampleSampleEntry";
  }
}, _va.fourcc = "hvt1", _va);
var lhe1SampleEntry = (_wa = class extends VisualSampleEntry {
  constructor() {
    super(...arguments);
    this.box_name = "LHEVCSampleEntry";
  }
}, _wa.fourcc = "lhe1", _wa);
var lhv1SampleEntry = (_xa = class extends VisualSampleEntry {
  constructor() {
    super(...arguments);
    this.box_name = "LHEVCSampleEntry";
  }
}, _xa.fourcc = "lhv1", _xa);
var dvh1SampleEntry = (_ya = class extends VisualSampleEntry {
}, _ya.fourcc = "dvh1", _ya);
var dvheSampleEntry = (_za = class extends VisualSampleEntry {
}, _za.fourcc = "dvhe", _za);
var vvcCSampleEntryBase = class extends VisualSampleEntry {
  getCodec() {
    let baseCodec = super.getCodec();
    if (this.vvcC) {
      baseCodec += "." + this.vvcC.general_profile_idc;
      if (this.vvcC.general_tier_flag) {
        baseCodec += ".H";
      } else {
        baseCodec += ".L";
      }
      baseCodec += this.vvcC.general_level_idc;
      let constraint_string = "";
      if (this.vvcC.general_constraint_info) {
        const bytes = [];
        let byte = 0;
        byte |= this.vvcC.ptl_frame_only_constraint_flag << 7;
        byte |= this.vvcC.ptl_multilayer_enabled_flag << 6;
        let last_nonzero;
        for (let i = 0; i < this.vvcC.general_constraint_info.length; ++i) {
          byte |= this.vvcC.general_constraint_info[i] >> 2 & 63;
          bytes.push(byte);
          if (byte) {
            last_nonzero = i;
          }
          byte = this.vvcC.general_constraint_info[i] >> 2 & 3;
        }
        if (last_nonzero === void 0) {
          constraint_string = ".CA";
        } else {
          constraint_string = ".C";
          const base32_chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
          let held_bits = 0;
          let num_held_bits = 0;
          for (let i = 0; i <= last_nonzero; ++i) {
            held_bits = held_bits << 8 | bytes[i];
            num_held_bits += 8;
            while (num_held_bits >= 5) {
              const val = held_bits >> num_held_bits - 5 & 31;
              constraint_string += base32_chars[val];
              num_held_bits -= 5;
              held_bits &= (1 << num_held_bits) - 1;
            }
          }
          if (num_held_bits) {
            held_bits <<= 5 - num_held_bits;
            constraint_string += base32_chars[held_bits & 31];
          }
        }
      }
      baseCodec += constraint_string;
    }
    return baseCodec;
  }
};
var vvc1SampleEntry = (_Aa = class extends vvcCSampleEntryBase {
  constructor() {
    super(...arguments);
    this.box_name = "VvcSampleEntry";
  }
}, _Aa.fourcc = "vvc1", _Aa);
var vvi1SampleEntry = (_Ba = class extends vvcCSampleEntryBase {
  constructor() {
    super(...arguments);
    this.box_name = "VvcSampleEntry";
  }
}, _Ba.fourcc = "vvi1", _Ba);
var vvs1SampleEntry = (_Ca = class extends VisualSampleEntry {
  constructor() {
    super(...arguments);
    this.box_name = "VvcSampleEntry";
  }
}, _Ca.fourcc = "vvs1", _Ca);
var vvcNSampleEntry = (_Da = class extends VisualSampleEntry {
  constructor() {
    super(...arguments);
    this.box_name = "VvcNonVCLSampleEntry";
  }
}, _Da.fourcc = "vvcN", _Da);
var vpcCSampleEntryBase = class extends VisualSampleEntry {
  getCodec() {
    const baseCodec = super.getCodec();
    let level = this.vpcC.level;
    if (level === 0) {
      level = "00";
    }
    let bitDepth = this.vpcC.bitDepth;
    if (bitDepth === 8) {
      bitDepth = "08";
    }
    return `${baseCodec}.0${this.vpcC.profile}.${level}.${bitDepth}`;
  }
};
var vp08SampleEntry = (_Ea = class extends vpcCSampleEntryBase {
}, _Ea.fourcc = "vp08", _Ea);
var vp09SampleEntry = (_Fa = class extends vpcCSampleEntryBase {
}, _Fa.fourcc = "vp09", _Fa);
var avs3SampleEntry = (_Ga = class extends VisualSampleEntry {
}, _Ga.fourcc = "avs3", _Ga);
var j2kiSampleEntry = (_Ha = class extends VisualSampleEntry {
  constructor() {
    super(...arguments);
    this.box_name = "J2KSampleEntry";
  }
}, _Ha.fourcc = "j2ki", _Ha);
var mjp2SampleEntry = (_Ia = class extends VisualSampleEntry {
}, _Ia.fourcc = "mjp2", _Ia);
var mjpgSampleEntry = (_Ja = class extends VisualSampleEntry {
}, _Ja.fourcc = "mjpg", _Ja);
var uncvSampleEntry = (_Ka = class extends VisualSampleEntry {
  constructor() {
    super(...arguments);
    this.box_name = "UncompressedVideoSampleEntry";
  }
}, _Ka.fourcc = "uncv", _Ka);
var mp4vSampleEntry = (_La = class extends VisualSampleEntry {
  constructor() {
    super(...arguments);
    this.box_name = "MP4VisualSampleEntry";
  }
}, _La.fourcc = "mp4v", _La);
var mp4aSampleEntry = (_Ma = class extends AudioSampleEntry {
  constructor() {
    super(...arguments);
    this.box_name = "MP4AudioSampleEntry";
  }
  getCodec() {
    const baseCodec = super.getCodec();
    if (this.esds && this.esds.esd) {
      const oti = this.esds.esd.getOTI();
      const dsi = this.esds.esd.getAudioConfig();
      return baseCodec + "." + decimalToHex(oti) + (dsi ? "." + dsi : "");
    } else {
      return baseCodec;
    }
  }
}, _Ma.fourcc = "mp4a", _Ma);
var m4aeSampleEntry = (_Na = class extends AudioSampleEntry {
}, _Na.fourcc = "m4ae", _Na);
var ac_3SampleEntry = (_Oa = class extends AudioSampleEntry {
}, _Oa.fourcc = "ac-3", _Oa);
var ac_4SampleEntry = (_Pa = class extends AudioSampleEntry {
}, _Pa.fourcc = "ac-4", _Pa);
var ec_3SampleEntry = (_Qa = class extends AudioSampleEntry {
}, _Qa.fourcc = "ec-3", _Qa);
var OpusSampleEntry = (_Ra = class extends AudioSampleEntry {
}, _Ra.fourcc = "Opus", _Ra);
var mha1SampleEntry = (_Sa = class extends AudioSampleEntry {
}, _Sa.fourcc = "mha1", _Sa);
var mha2SampleEntry = (_Ta = class extends AudioSampleEntry {
}, _Ta.fourcc = "mha2", _Ta);
var mhm1SampleEntry = (_Ua = class extends AudioSampleEntry {
}, _Ua.fourcc = "mhm1", _Ua);
var mhm2SampleEntry = (_Va = class extends AudioSampleEntry {
}, _Va.fourcc = "mhm2", _Va);
var fLaCSampleEntry = (_Wa = class extends AudioSampleEntry {
}, _Wa.fourcc = "fLaC", _Wa);
var encvSampleEntry = (_Xa = class extends VisualSampleEntry {
}, _Xa.fourcc = "encv", _Xa);
var encaSampleEntry = (_Ya = class extends AudioSampleEntry {
}, _Ya.fourcc = "enca", _Ya);
var encuSampleEntry = (_Za = class extends SubtitleSampleEntry {
  constructor() {
    super(...arguments);
    this.subBoxNames = ["sinf"];
    this.sinfs = [];
  }
}, _Za.fourcc = "encu", _Za);
var encsSampleEntry = (__a = class extends SystemSampleEntry {
  constructor() {
    super(...arguments);
    this.subBoxNames = ["sinf"];
    this.sinfs = [];
  }
}, __a.fourcc = "encs", __a);
var mp4sSampleEntry = (_$a = class extends SystemSampleEntry {
}, _$a.fourcc = "mp4s", _$a);
var enctSampleEntry = (_ab = class extends TextSampleEntry {
  constructor() {
    super(...arguments);
    this.subBoxNames = ["sinf"];
    this.sinfs = [];
  }
}, _ab.fourcc = "enct", _ab);
var encmSampleEntry = (_bb = class extends MetadataSampleEntry {
  constructor() {
    super(...arguments);
    this.subBoxNames = ["sinf"];
    this.sinfs = [];
  }
}, _bb.fourcc = "encm", _bb);
var resvSampleEntry = (_cb = class extends VisualSampleEntry {
  constructor() {
    super(...arguments);
    this.box_name = "RestrictedVideoSampleEntry";
  }
}, _cb.fourcc = "resv", _cb);
var sbttSampleEntry = (_db = class extends SubtitleSampleEntry {
  parse(stream) {
    this.parseHeader(stream);
    this.content_encoding = stream.readCString();
    this.mime_format = stream.readCString();
    this.parseFooter(stream);
  }
}, _db.fourcc = "sbtt", _db);
var stppSampleEntry = (_eb = class extends SubtitleSampleEntry {
  parse(stream) {
    this.parseHeader(stream);
    this.namespace = stream.readCString();
    this.schema_location = stream.readCString();
    this.auxiliary_mime_types = stream.readCString();
    this.parseFooter(stream);
  }
  /** @bundle writing/sampleentry.js */
  write(stream) {
    this.writeHeader(stream);
    this.size += this.namespace.length + 1 + this.schema_location.length + 1 + this.auxiliary_mime_types.length + 1;
    stream.writeCString(this.namespace);
    stream.writeCString(this.schema_location);
    stream.writeCString(this.auxiliary_mime_types);
    this.writeFooter(stream);
  }
}, _eb.fourcc = "stpp", _eb);
var stxtSampleEntry = (_fb = class extends SubtitleSampleEntry {
  parse(stream) {
    this.parseHeader(stream);
    this.content_encoding = stream.readCString();
    this.mime_format = stream.readCString();
    this.parseFooter(stream);
  }
  getCodec() {
    const baseCodec = super.getCodec();
    if (this.mime_format) {
      return baseCodec + "." + this.mime_format;
    } else {
      return baseCodec;
    }
  }
}, _fb.fourcc = "stxt", _fb);
var tx3gSampleEntry = (_gb = class extends SubtitleSampleEntry {
  parse(stream) {
    this.parseHeader(stream);
    this.displayFlags = stream.readUint32();
    this.horizontal_justification = stream.readInt8();
    this.vertical_justification = stream.readInt8();
    this.bg_color_rgba = stream.readUint8Array(4);
    this.box_record = stream.readInt16Array(4);
    this.style_record = stream.readUint8Array(12);
    this.parseFooter(stream);
  }
}, _gb.fourcc = "tx3g", _gb);
var wvttSampleEntry = (_hb = class extends MetadataSampleEntry {
  parse(stream) {
    this.parseHeader(stream);
    this.parseFooter(stream);
  }
}, _hb.fourcc = "wvtt", _hb);
var sbgpBox = (_ib = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "SampleToGroupBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.grouping_type = stream.readString(4);
    if (this.version === 1) {
      this.grouping_type_parameter = stream.readUint32();
    } else {
      this.grouping_type_parameter = 0;
    }
    this.entries = [];
    const entry_count = stream.readUint32();
    for (let i = 0; i < entry_count; i++) {
      this.entries.push({
        sample_count: stream.readInt32(),
        group_description_index: stream.readInt32()
      });
    }
  }
  /** @bundle writing/sbgp.js */
  write(stream) {
    if (this.grouping_type_parameter) this.version = 1;
    else this.version = 0;
    this.flags = 0;
    this.size = 8 + 8 * this.entries.length + (this.version === 1 ? 4 : 0);
    this.writeHeader(stream);
    stream.writeString(this.grouping_type, void 0, 4);
    if (this.version === 1) {
      stream.writeUint32(this.grouping_type_parameter);
    }
    stream.writeUint32(this.entries.length);
    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      stream.writeInt32(entry.sample_count);
      stream.writeInt32(entry.group_description_index);
    }
  }
}, _ib.fourcc = "sbgp", _ib);
var sdtpBox = (_jb = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "SampleDependencyTypeBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    const count = this.size - this.hdr_size;
    this.is_leading = [];
    this.sample_depends_on = [];
    this.sample_is_depended_on = [];
    this.sample_has_redundancy = [];
    for (let i = 0; i < count; i++) {
      const tmp_byte = stream.readUint8();
      this.is_leading[i] = tmp_byte >> 6;
      this.sample_depends_on[i] = tmp_byte >> 4 & 3;
      this.sample_is_depended_on[i] = tmp_byte >> 2 & 3;
      this.sample_has_redundancy[i] = tmp_byte & 3;
    }
  }
}, _jb.fourcc = "sdtp", _jb);
var sgpdBox = (_kb = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "SampleGroupDescriptionBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.grouping_type = stream.readString(4);
    Log.debug("BoxParser", "Found Sample Groups of type " + this.grouping_type);
    if (this.version === 1) {
      this.default_length = stream.readUint32();
    } else {
      this.default_length = 0;
    }
    if (this.version >= 2) {
      this.default_group_description_index = stream.readUint32();
    }
    this.entries = [];
    const entry_count = stream.readUint32();
    for (let i = 0; i < entry_count; i++) {
      let entry;
      if (this.grouping_type in BoxRegistry.sampleGroupEntry) {
        entry = new BoxRegistry.sampleGroupEntry[this.grouping_type](this.grouping_type);
      } else {
        entry = new SampleGroupEntry(this.grouping_type);
      }
      this.entries.push(entry);
      if (this.version === 1) {
        if (this.default_length === 0) {
          entry.description_length = stream.readUint32();
        } else {
          entry.description_length = this.default_length;
        }
      } else {
        entry.description_length = this.default_length;
      }
      if (entry.write === SampleGroupEntry.prototype.write) {
        Log.info(
          "BoxParser",
          "SampleGroup for type " + this.grouping_type + " writing not yet implemented, keeping unparsed data in memory for later write"
        );
        entry.data = stream.readUint8Array(entry.description_length);
        stream.seek(stream.getPosition() - entry.description_length);
      }
      entry.parse(stream);
    }
  }
  /** @bundle writing/sgpd.js */
  write(stream) {
    this.flags = 0;
    this.size = 12;
    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      if (this.version === 1) {
        if (this.default_length === 0) {
          this.size += 4;
        }
        this.size += entry.data.length;
      }
    }
    this.writeHeader(stream);
    stream.writeString(this.grouping_type, void 0, 4);
    if (this.version === 1) {
      stream.writeUint32(this.default_length);
    }
    if (this.version >= 2) {
      stream.writeUint32(this.default_sample_description_index);
    }
    stream.writeUint32(this.entries.length);
    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      if (this.version === 1) {
        if (this.default_length === 0) {
          stream.writeUint32(entry.description_length);
        }
      }
      entry.write(stream);
    }
  }
}, _kb.fourcc = "sgpd", _kb);
var sidxBox = (_lb = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "CompressedSegmentIndexBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.reference_ID = stream.readUint32();
    this.timescale = stream.readUint32();
    if (this.version === 0) {
      this.earliest_presentation_time = stream.readUint32();
      this.first_offset = stream.readUint32();
    } else {
      this.earliest_presentation_time = stream.readUint64();
      this.first_offset = stream.readUint64();
    }
    stream.readUint16();
    this.references = [];
    const count = stream.readUint16();
    for (let i = 0; i < count; i++) {
      const type = stream.readUint32();
      const subsegment_duration = stream.readUint32();
      const sap = stream.readUint32();
      this.references.push({
        reference_type: type >> 31 & 1,
        referenced_size: type & 2147483647,
        subsegment_duration,
        starts_with_SAP: sap >> 31 & 1,
        SAP_type: sap >> 28 & 7,
        SAP_delta_time: sap & 268435455
      });
    }
  }
  /** @bundle writing/sidx.js */
  write(stream) {
    const useVersion1 = this.earliest_presentation_time > MAX_UINT32 || this.first_offset > MAX_UINT32 || this.version === 1;
    this.version = useVersion1 ? 1 : 0;
    this.size = 4 * 2 + 2 + 2 + 12 * this.references.length;
    this.size += useVersion1 ? 16 : 8;
    this.flags = 0;
    this.writeHeader(stream);
    stream.writeUint32(this.reference_ID);
    stream.writeUint32(this.timescale);
    if (useVersion1) {
      stream.writeUint64(this.earliest_presentation_time);
      stream.writeUint64(this.first_offset);
    } else {
      stream.writeUint32(this.earliest_presentation_time);
      stream.writeUint32(this.first_offset);
    }
    stream.writeUint16(0);
    stream.writeUint16(this.references.length);
    for (let i = 0; i < this.references.length; i++) {
      const ref = this.references[i];
      stream.writeUint32(ref.reference_type << 31 | ref.referenced_size);
      stream.writeUint32(ref.subsegment_duration);
      stream.writeUint32(ref.starts_with_SAP << 31 | ref.SAP_type << 28 | ref.SAP_delta_time);
    }
  }
}, _lb.fourcc = "sidx", _lb);
var smhdBox = (_mb = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "SoundMediaHeaderBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.balance = stream.readUint16();
    stream.readUint16();
  }
  /** @bundle writing/smhd.js */
  write(stream) {
    this.version = 0;
    this.size = 4;
    this.writeHeader(stream);
    stream.writeUint16(this.balance);
    stream.writeUint16(0);
  }
}, _mb.fourcc = "smhd", _mb);
var stcoBox = (_nb = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "ChunkOffsetBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    const entry_count = stream.readUint32();
    this.chunk_offsets = [];
    if (this.version === 0) {
      for (let i = 0; i < entry_count; i++) {
        this.chunk_offsets.push(stream.readUint32());
      }
    }
  }
  /** @bundle writings/stco.js */
  write(stream) {
    this.version = 0;
    this.flags = 0;
    this.size = 4 + 4 * this.chunk_offsets.length;
    this.writeHeader(stream);
    stream.writeUint32(this.chunk_offsets.length);
    stream.writeUint32Array(this.chunk_offsets);
  }
  /** @bundle box-unpack.js */
  unpack(samples) {
    for (let i = 0; i < this.chunk_offsets.length; i++) {
      samples[i].offset = this.chunk_offsets[i];
    }
  }
}, _nb.fourcc = "stco", _nb);
var sthdBox = (_ob = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "SubtitleMediaHeaderBox";
  }
}, _ob.fourcc = "sthd", _ob);
var stscBox = (_pb = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "SampleToChunkBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    const entry_count = stream.readUint32();
    this.first_chunk = [];
    this.samples_per_chunk = [];
    this.sample_description_index = [];
    if (this.version === 0) {
      for (let i = 0; i < entry_count; i++) {
        this.first_chunk.push(stream.readUint32());
        this.samples_per_chunk.push(stream.readUint32());
        this.sample_description_index.push(stream.readUint32());
      }
    }
  }
  write(stream) {
    this.version = 0;
    this.flags = 0;
    this.size = 4 + 12 * this.first_chunk.length;
    this.writeHeader(stream);
    stream.writeUint32(this.first_chunk.length);
    for (let i = 0; i < this.first_chunk.length; i++) {
      stream.writeUint32(this.first_chunk[i]);
      stream.writeUint32(this.samples_per_chunk[i]);
      stream.writeUint32(this.sample_description_index[i]);
    }
  }
  unpack(samples) {
    let l = 0;
    let m = 0;
    for (let i = 0; i < this.first_chunk.length; i++) {
      for (let j = 0; j < (i + 1 < this.first_chunk.length ? this.first_chunk[i + 1] : Infinity); j++) {
        m++;
        for (let k = 0; k < this.samples_per_chunk[i]; k++) {
          if (samples[l]) {
            samples[l].description_index = this.sample_description_index[i];
            samples[l].chunk_index = m;
          } else {
            return;
          }
          l++;
        }
      }
    }
  }
}, _pb.fourcc = "stsc", _pb);
var stsdBox = (_qb = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "SampleDescriptionBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.entries = [];
    const entryCount = stream.readUint32();
    for (let i = 1; i <= entryCount; i++) {
      const ret = parseOneBox(stream, true, this.size - (stream.getPosition() - this.start));
      if (ret.code === OK) {
        let box;
        if (ret.type in BoxRegistry.sampleEntry) {
          box = new BoxRegistry.sampleEntry[ret.type](ret.size);
          box.hdr_size = ret.hdr_size;
          box.start = ret.start;
        } else {
          Log.warn("BoxParser", `Unknown sample entry type: '${ret.type}'`);
          box = new SampleEntry(ret.size, ret.hdr_size, ret.start);
          box.type = ret.type;
        }
        if (box.write === SampleEntry.prototype.write) {
          Log.info(
            "BoxParser",
            "SampleEntry " + box.type + " box writing not yet implemented, keeping unparsed data in memory for later write"
          );
          box.parseDataAndRewind(stream);
        }
        box.parse(stream);
        this.entries.push(box);
      } else {
        return;
      }
    }
  }
  /** @bundle writing/stsd.js */
  write(stream) {
    this.version = 0;
    this.flags = 0;
    this.size = 0;
    this.writeHeader(stream);
    stream.writeUint32(this.entries.length);
    this.size += 4;
    for (let i = 0; i < this.entries.length; i++) {
      this.entries[i].write(stream);
      this.size += this.entries[i].size;
    }
    Log.debug("BoxWriter", "Adjusting box " + this.type + " with new size " + this.size);
    stream.adjustUint32(this.sizePosition, this.size);
  }
}, _qb.fourcc = "stsd", _qb);
var stszBox = (_rb = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "SampleSizeBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.sample_sizes = [];
    if (this.version === 0) {
      this.sample_size = stream.readUint32();
      this.sample_count = stream.readUint32();
      for (let i = 0; i < this.sample_count; i++) {
        if (this.sample_size === 0) {
          this.sample_sizes.push(stream.readUint32());
        } else {
          this.sample_sizes[i] = this.sample_size;
        }
      }
    }
  }
  /** @bundle writing/stsz.js */
  write(stream) {
    let constant = true;
    this.version = 0;
    this.flags = 0;
    if (this.sample_sizes.length > 0) {
      let i = 0;
      while (i + 1 < this.sample_sizes.length) {
        if (this.sample_sizes[i + 1] !== this.sample_sizes[0]) {
          constant = false;
          break;
        } else {
          i++;
        }
      }
    } else {
      constant = false;
    }
    this.size = 8;
    if (!constant) {
      this.size += 4 * this.sample_sizes.length;
    }
    this.writeHeader(stream);
    if (!constant) {
      stream.writeUint32(0);
    } else {
      stream.writeUint32(this.sample_sizes[0]);
    }
    stream.writeUint32(this.sample_sizes.length);
    if (!constant) {
      stream.writeUint32Array(this.sample_sizes);
    }
  }
  /** @bundle box-unpack.js */
  unpack(samples) {
    for (let i = 0; i < this.sample_sizes.length; i++) {
      samples[i].size = this.sample_sizes[i];
    }
  }
}, _rb.fourcc = "stsz", _rb);
var sttsBox = (_sb = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "TimeToSampleBox";
    this.sample_counts = [];
    this.sample_deltas = [];
  }
  parse(stream) {
    this.parseFullHeader(stream);
    const entry_count = stream.readUint32();
    this.sample_counts.length = 0;
    this.sample_deltas.length = 0;
    if (this.version === 0) {
      for (let i = 0; i < entry_count; i++) {
        this.sample_counts.push(stream.readUint32());
        let delta = stream.readInt32();
        if (delta < 0) {
          Log.warn(
            "BoxParser",
            "File uses negative stts sample delta, using value 1 instead, sync may be lost!"
          );
          delta = 1;
        }
        this.sample_deltas.push(delta);
      }
    }
  }
  /** @bundle writing/stts.js */
  write(stream) {
    this.version = 0;
    this.flags = 0;
    this.size = 4 + 8 * this.sample_counts.length;
    this.writeHeader(stream);
    stream.writeUint32(this.sample_counts.length);
    for (let i = 0; i < this.sample_counts.length; i++) {
      stream.writeUint32(this.sample_counts[i]);
      stream.writeUint32(this.sample_deltas[i]);
    }
  }
  /** @bundle box-unpack.js */
  unpack(samples) {
    let k = 0;
    for (let i = 0; i < this.sample_counts.length; i++) {
      for (let j = 0; j < this.sample_counts[i]; j++) {
        if (k === 0) {
          samples[k].dts = 0;
        } else {
          samples[k].dts = samples[k - 1].dts + this.sample_deltas[i];
        }
        k++;
      }
    }
  }
}, _sb.fourcc = "stts", _sb);
var tfdtBox = (_tb = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "TrackFragmentBaseMediaDecodeTimeBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    if (this.version === 1) {
      this.baseMediaDecodeTime = stream.readUint64();
    } else {
      this.baseMediaDecodeTime = stream.readUint32();
    }
  }
  /** @bundle writing/tdft.js */
  write(stream) {
    const useVersion1 = this.baseMediaDecodeTime > MAX_UINT32 || this.version === 1;
    this.version = useVersion1 ? 1 : 0;
    this.size = 4;
    this.size += useVersion1 ? 4 : 0;
    this.flags = 0;
    this.writeHeader(stream);
    if (useVersion1) {
      stream.writeUint64(this.baseMediaDecodeTime);
    } else {
      stream.writeUint32(this.baseMediaDecodeTime);
    }
  }
}, _tb.fourcc = "tfdt", _tb);
var tfhdBox = (_ub = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "TrackFragmentHeaderBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    let readBytes = 0;
    this.track_id = stream.readUint32();
    if (this.size - this.hdr_size > readBytes && this.flags & TFHD_FLAG_BASE_DATA_OFFSET) {
      this.base_data_offset = stream.readUint64();
      readBytes += 8;
    } else {
      this.base_data_offset = 0;
    }
    if (this.size - this.hdr_size > readBytes && this.flags & TFHD_FLAG_SAMPLE_DESC) {
      this.default_sample_description_index = stream.readUint32();
      readBytes += 4;
    } else {
      this.default_sample_description_index = 0;
    }
    if (this.size - this.hdr_size > readBytes && this.flags & TFHD_FLAG_SAMPLE_DUR) {
      this.default_sample_duration = stream.readUint32();
      readBytes += 4;
    } else {
      this.default_sample_duration = 0;
    }
    if (this.size - this.hdr_size > readBytes && this.flags & TFHD_FLAG_SAMPLE_SIZE) {
      this.default_sample_size = stream.readUint32();
      readBytes += 4;
    } else {
      this.default_sample_size = 0;
    }
    if (this.size - this.hdr_size > readBytes && this.flags & TFHD_FLAG_SAMPLE_FLAGS) {
      this.default_sample_flags = stream.readUint32();
      readBytes += 4;
    } else {
      this.default_sample_flags = 0;
    }
  }
  /** @bundle writing/tfhd.js */
  write(stream) {
    this.version = 0;
    this.size = 4;
    if (this.flags & TFHD_FLAG_BASE_DATA_OFFSET) {
      this.size += 8;
    }
    if (this.flags & TFHD_FLAG_SAMPLE_DESC) {
      this.size += 4;
    }
    if (this.flags & TFHD_FLAG_SAMPLE_DUR) {
      this.size += 4;
    }
    if (this.flags & TFHD_FLAG_SAMPLE_SIZE) {
      this.size += 4;
    }
    if (this.flags & TFHD_FLAG_SAMPLE_FLAGS) {
      this.size += 4;
    }
    this.writeHeader(stream);
    stream.writeUint32(this.track_id);
    if (this.flags & TFHD_FLAG_BASE_DATA_OFFSET) {
      stream.writeUint64(this.base_data_offset);
    }
    if (this.flags & TFHD_FLAG_SAMPLE_DESC) {
      stream.writeUint32(this.default_sample_description_index);
    }
    if (this.flags & TFHD_FLAG_SAMPLE_DUR) {
      stream.writeUint32(this.default_sample_duration);
    }
    if (this.flags & TFHD_FLAG_SAMPLE_SIZE) {
      stream.writeUint32(this.default_sample_size);
    }
    if (this.flags & TFHD_FLAG_SAMPLE_FLAGS) {
      stream.writeUint32(this.default_sample_flags);
    }
  }
}, _ub.fourcc = "tfhd", _ub);
var tkhdBox = (_vb = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "TrackHeaderBox";
    this.layer = 0;
    this.alternate_group = 0;
  }
  parse(stream) {
    this.parseFullHeader(stream);
    if (this.version === 1) {
      this.creation_time = stream.readUint64();
      this.modification_time = stream.readUint64();
      this.track_id = stream.readUint32();
      stream.readUint32();
      this.duration = stream.readUint64();
    } else {
      this.creation_time = stream.readUint32();
      this.modification_time = stream.readUint32();
      this.track_id = stream.readUint32();
      stream.readUint32();
      this.duration = stream.readUint32();
    }
    stream.readUint32Array(2);
    this.layer = stream.readInt16();
    this.alternate_group = stream.readInt16();
    this.volume = stream.readInt16() >> 8;
    stream.readUint16();
    this.matrix = stream.readInt32Array(9);
    this.width = stream.readUint32();
    this.height = stream.readUint32();
  }
  write(stream) {
    const useVersion1 = this.modification_time > MAX_UINT32 || this.creation_time > MAX_UINT32 || this.duration > MAX_UINT32 || this.version === 1;
    this.version = useVersion1 ? 1 : 0;
    this.size = 5 * 4 + 15 * 4;
    this.size += useVersion1 ? 3 * 4 : 0;
    this.flags = this.flags ?? 1 | 2;
    this.writeHeader(stream);
    if (useVersion1) {
      stream.writeUint64(this.creation_time);
      stream.writeUint64(this.modification_time);
      stream.writeUint32(this.track_id);
      stream.writeUint32(0);
      stream.writeUint64(this.duration);
    } else {
      stream.writeUint32(this.creation_time);
      stream.writeUint32(this.modification_time);
      stream.writeUint32(this.track_id);
      stream.writeUint32(0);
      stream.writeUint32(this.duration);
    }
    stream.writeUint32Array([0, 0]);
    stream.writeInt16(this.layer);
    stream.writeInt16(this.alternate_group);
    stream.writeInt16(this.volume << 8);
    stream.writeInt16(0);
    stream.writeInt32Array(this.matrix);
    stream.writeUint32(this.width);
    stream.writeUint32(this.height);
  }
  /** @bundle box-print.js */
  print(output) {
    super.printHeader(output);
    output.log(output.indent + "creation_time: " + this.creation_time);
    output.log(output.indent + "modification_time: " + this.modification_time);
    output.log(output.indent + "track_id: " + this.track_id);
    output.log(output.indent + "duration: " + this.duration);
    output.log(output.indent + "volume: " + (this.volume >> 8));
    output.log(output.indent + "matrix: " + this.matrix.join(", "));
    output.log(output.indent + "layer: " + this.layer);
    output.log(output.indent + "alternate_group: " + this.alternate_group);
    output.log(output.indent + "width: " + this.width);
    output.log(output.indent + "height: " + this.height);
  }
}, _vb.fourcc = "tkhd", _vb);
var trexBox = (_wb = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "TrackExtendsBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.track_id = stream.readUint32();
    this.default_sample_description_index = stream.readUint32();
    this.default_sample_duration = stream.readUint32();
    this.default_sample_size = stream.readUint32();
    this.default_sample_flags = stream.readUint32();
  }
  write(stream) {
    this.version = 0;
    this.flags = 0;
    this.size = 4 * 5;
    this.writeHeader(stream);
    stream.writeUint32(this.track_id);
    stream.writeUint32(this.default_sample_description_index);
    stream.writeUint32(this.default_sample_duration);
    stream.writeUint32(this.default_sample_size);
    stream.writeUint32(this.default_sample_flags);
  }
}, _wb.fourcc = "trex", _wb);
var trunBox = (_xb = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "TrackRunBox";
    this.sample_duration = [];
    this.sample_size = [];
    this.sample_flags = [];
    this.sample_composition_time_offset = [];
  }
  parse(stream) {
    this.parseFullHeader(stream);
    let readBytes = 0;
    this.sample_count = stream.readUint32();
    readBytes += 4;
    if (this.size - this.hdr_size > readBytes && this.flags & TRUN_FLAGS_DATA_OFFSET) {
      this.data_offset = stream.readInt32();
      readBytes += 4;
    } else {
      this.data_offset = 0;
    }
    if (this.size - this.hdr_size > readBytes && this.flags & TRUN_FLAGS_FIRST_FLAG) {
      this.first_sample_flags = stream.readUint32();
      readBytes += 4;
    } else {
      this.first_sample_flags = 0;
    }
    this.sample_duration = [];
    this.sample_size = [];
    this.sample_flags = [];
    this.sample_composition_time_offset = [];
    if (this.size - this.hdr_size > readBytes) {
      for (let i = 0; i < this.sample_count; i++) {
        if (this.flags & TRUN_FLAGS_DURATION) {
          this.sample_duration[i] = stream.readUint32();
        }
        if (this.flags & TRUN_FLAGS_SIZE) {
          this.sample_size[i] = stream.readUint32();
        }
        if (this.flags & TRUN_FLAGS_FLAGS) {
          this.sample_flags[i] = stream.readUint32();
        }
        if (this.flags & TRUN_FLAGS_CTS_OFFSET) {
          if (this.version === 0) {
            this.sample_composition_time_offset[i] = stream.readUint32();
          } else {
            this.sample_composition_time_offset[i] = stream.readInt32();
          }
        }
      }
    }
  }
  /** @bundle writing/trun.js */
  write(stream) {
    this.size = 4;
    if (this.flags & TRUN_FLAGS_DATA_OFFSET) {
      this.size += 4;
    }
    if (this.flags & TRUN_FLAGS_FIRST_FLAG) {
      this.size += 4;
    }
    if (this.flags & TRUN_FLAGS_DURATION) {
      this.size += 4 * this.sample_duration.length;
    }
    if (this.flags & TRUN_FLAGS_SIZE) {
      this.size += 4 * this.sample_size.length;
    }
    if (this.flags & TRUN_FLAGS_FLAGS) {
      this.size += 4 * this.sample_flags.length;
    }
    if (this.flags & TRUN_FLAGS_CTS_OFFSET) {
      this.size += 4 * this.sample_composition_time_offset.length;
    }
    this.writeHeader(stream);
    stream.writeUint32(this.sample_count);
    if (this.flags & TRUN_FLAGS_DATA_OFFSET) {
      this.data_offset_position = stream.getPosition();
      stream.writeInt32(this.data_offset);
    }
    if (this.flags & TRUN_FLAGS_FIRST_FLAG) {
      stream.writeUint32(this.first_sample_flags);
    }
    for (let i = 0; i < this.sample_count; i++) {
      if (this.flags & TRUN_FLAGS_DURATION) {
        stream.writeUint32(this.sample_duration[i]);
      }
      if (this.flags & TRUN_FLAGS_SIZE) {
        stream.writeUint32(this.sample_size[i]);
      }
      if (this.flags & TRUN_FLAGS_FLAGS) {
        stream.writeUint32(this.sample_flags[i]);
      }
      if (this.flags & TRUN_FLAGS_CTS_OFFSET) {
        if (this.version === 0) {
          stream.writeUint32(this.sample_composition_time_offset[i]);
        } else {
          stream.writeInt32(this.sample_composition_time_offset[i]);
        }
      }
    }
  }
}, _xb.fourcc = "trun", _xb);
var urlBox = (_yb = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "DataEntryUrlBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    if (this.flags !== 1) {
      this.location = stream.readCString();
    }
  }
  /** @bundle writing/url.js */
  write(stream) {
    this.version = 0;
    if (this.location) {
      this.flags = 0;
      this.size = this.location.length + 1;
    } else {
      this.flags = 1;
      this.size = 0;
    }
    this.writeHeader(stream);
    if (this.location) {
      stream.writeCString(this.location);
    }
  }
}, _yb.fourcc = "url ", _yb);
var vmhdBox = (_zb = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "VideoMediaHeaderBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.graphicsmode = stream.readUint16();
    this.opcolor = stream.readUint16Array(3);
  }
  /** @bundle writing/vmhd.js */
  write(stream) {
    this.version = 0;
    this.size = 8;
    this.writeHeader(stream);
    stream.writeUint16(this.graphicsmode);
    stream.writeUint16Array(this.opcolor);
  }
}, _zb.fourcc = "vmhd", _zb);
var SampleGroupInfo = class {
  constructor(grouping_type, grouping_type_parameter, sbgp) {
    this.grouping_type = grouping_type;
    this.grouping_type_parameter = grouping_type_parameter;
    this.sbgp = sbgp;
    this.last_sample_in_run = -1;
    this.entry_index = -1;
  }
};
var ISOFile = class _ISOFile {
  constructor(stream, discardMdatData = true) {
    this.boxes = [];
    this.mdats = [];
    this.moofs = [];
    this.isProgressive = false;
    this.moovStartFound = false;
    this.moovStartSent = false;
    this.readySent = false;
    this.sampleListBuilt = false;
    this.fragmentedTracks = [];
    this.extractedTracks = [];
    this.isFragmentationInitialized = false;
    this.sampleProcessingStarted = false;
    this.nextMoofNumber = 0;
    this.itemListBuilt = false;
    this.sidxSent = false;
    this.items = [];
    this.entity_groups = [];
    this.itemsDataSize = 0;
    this.lastMoofIndex = 0;
    this.samplesDataSize = 0;
    this.lastBoxStartPosition = 0;
    this.nextParsePosition = 0;
    this.discardMdatData = true;
    this.discardMdatData = discardMdatData;
    if (stream) {
      this.stream = stream;
      this.parse();
    } else {
      this.stream = new MultiBufferStream();
    }
    this.stream.isofile = this;
  }
  setSegmentOptions(id, user, opts) {
    const { sizePerSegment = Number.MAX_SAFE_INTEGER, rapAlignement = true } = opts;
    let nbSamples = opts.nbSamples ?? opts.nbSamplesPerFragment ?? 1e3;
    const nbSamplesPerFragment = opts.nbSamplesPerFragment ?? nbSamples;
    if (nbSamples <= 0 || nbSamplesPerFragment <= 0 || sizePerSegment <= 0) {
      Log.error(
        "ISOFile",
        `Invalid segment options: nbSamples=${nbSamples}, nbSamplesPerFragment=${nbSamplesPerFragment}, sizePerSegment=${sizePerSegment}`
      );
      return;
    }
    if (nbSamples < nbSamplesPerFragment) {
      Log.warn(
        "ISOFile",
        `nbSamples (${nbSamples}) is less than nbSamplesPerFragment (${nbSamplesPerFragment}), setting nbSamples to nbSamplesPerFragment`
      );
      nbSamples = nbSamplesPerFragment;
    }
    if (this.fragmentedTracks.some((track) => track.nb_samples !== nbSamples)) {
      Log.error(
        "ISOFile",
        `Cannot set segment options for track ${id}: nbSamples (${nbSamples}) does not match existing tracks`
      );
      return;
    }
    const trak = this.getTrackById(id);
    if (trak) {
      const fragTrack = {
        id,
        user,
        trak,
        segmentStream: void 0,
        nb_samples: nbSamples,
        nb_samples_per_fragment: nbSamplesPerFragment,
        size_per_segment: sizePerSegment,
        rapAlignement,
        state: {
          lastFragmentSampleNumber: 0,
          lastSegmentSampleNumber: 0,
          accumulatedSize: 0
        }
      };
      this.fragmentedTracks.push(fragTrack);
      trak.nextSample = 0;
    }
    if (this.discardMdatData) {
      Log.warn(
        "ISOFile",
        "Segmentation options set but discardMdatData is true, samples will not be segmented"
      );
    }
  }
  unsetSegmentOptions(id) {
    let index = -1;
    for (let i = 0; i < this.fragmentedTracks.length; i++) {
      const fragTrack = this.fragmentedTracks[i];
      if (fragTrack.id === id) {
        index = i;
      }
    }
    if (index > -1) {
      this.fragmentedTracks.splice(index, 1);
    }
  }
  setExtractionOptions(id, user, { nbSamples: nb_samples = 1e3 } = {}) {
    const trak = this.getTrackById(id);
    if (trak) {
      this.extractedTracks.push({
        id,
        user,
        trak,
        nb_samples,
        samples: []
      });
      trak.nextSample = 0;
    }
    if (this.discardMdatData) {
      Log.warn(
        "ISOFile",
        "Extraction options set but discardMdatData is true, samples will not be extracted"
      );
    }
  }
  unsetExtractionOptions(id) {
    let index = -1;
    for (let i = 0; i < this.extractedTracks.length; i++) {
      const extractTrack = this.extractedTracks[i];
      if (extractTrack.id === id) {
        index = i;
      }
    }
    if (index > -1) {
      this.extractedTracks.splice(index, 1);
    }
  }
  parse() {
    const parseBoxHeadersOnly = false;
    if (this.restoreParsePosition) {
      if (!this.restoreParsePosition()) {
        return;
      }
    }
    while (true) {
      if (this.hasIncompleteMdat && this.hasIncompleteMdat()) {
        if (this.processIncompleteMdat()) {
          continue;
        } else {
          return;
        }
      } else {
        if (this.saveParsePosition) {
          this.saveParsePosition();
        }
        const ret = parseOneBox(this.stream, parseBoxHeadersOnly);
        if (ret.code === ERR_NOT_ENOUGH_DATA) {
          if (this.processIncompleteBox) {
            if (this.processIncompleteBox(ret)) {
              continue;
            } else {
              return;
            }
          } else {
            return;
          }
        } else if (ret.code === OK) {
          const box = ret.box;
          this.boxes.push(box);
          if (box.type === "uuid") {
            if (this[box.uuid] !== void 0) {
              Log.warn(
                "ISOFile",
                "Duplicate Box of uuid: " + box.uuid + ", overriding previous occurrence"
              );
            }
            this[box.uuid] = box;
          } else {
            switch (box.type) {
              case "mdat":
                this.mdats.push(box);
                this.transferMdatData(box);
                break;
              case "moof":
                this.moofs.push(box);
                break;
              case "free":
              case "skip":
                break;
              case "moov":
                this.moovStartFound = true;
                if (this.mdats.length === 0) {
                  this.isProgressive = true;
                }
              /* no break */
              /* falls through */
              default:
                if (this[box.type] !== void 0) {
                  if (Array.isArray(this[box.type + "s"])) {
                    Log.info(
                      "ISOFile",
                      `Found multiple boxes of type ${box.type} in ISOFile, adding to array`
                    );
                    this[box.type + "s"].push(box);
                  } else {
                    Log.warn(
                      "ISOFile",
                      `Found multiple boxes of type ${box.type} but no array exists. Creating array dynamically.`
                    );
                    this[box.type + "s"] = [this[box.type], box];
                  }
                } else {
                  this[box.type] = box;
                  if (Array.isArray(this[box.type + "s"])) {
                    this[box.type + "s"].push(box);
                  }
                }
                break;
            }
          }
          if (this.updateUsedBytes) {
            this.updateUsedBytes(box, ret);
          }
        } else if (ret.code === ERR_INVALID_DATA) {
          Log.error(
            "ISOFile",
            `Invalid data found while parsing box of type '${ret.type}' at position ${ret.start}. Aborting parsing.`,
            this
          );
          break;
        }
      }
    }
  }
  checkBuffer(ab) {
    if (!ab) throw new Error("Buffer must be defined and non empty");
    if (ab.byteLength === 0) {
      Log.warn("ISOFile", "Ignoring empty buffer (fileStart: " + ab.fileStart + ")");
      this.stream.logBufferLevel();
      return false;
    }
    Log.info("ISOFile", "Processing buffer (fileStart: " + ab.fileStart + ")");
    ab.usedBytes = 0;
    this.stream.insertBuffer(ab);
    this.stream.logBufferLevel();
    if (!this.stream.initialized()) {
      Log.warn("ISOFile", "Not ready to start parsing");
      return false;
    }
    return true;
  }
  /**
   * Processes a new ArrayBuffer (with a fileStart property)
   * Returns the next expected file position, or undefined if not ready to parse
   */
  appendBuffer(ab, last) {
    let nextFileStart;
    if (!this.checkBuffer(ab)) {
      return;
    }
    this.parse();
    if (this.moovStartFound && !this.moovStartSent) {
      this.moovStartSent = true;
      if (this.onMoovStart) this.onMoovStart();
    }
    if (this.moov) {
      if (!this.sampleListBuilt) {
        this.buildSampleLists();
        this.sampleListBuilt = true;
      }
      this.updateSampleLists();
      if (this.onReady && !this.readySent) {
        this.readySent = true;
        this.onReady(this.getInfo());
      }
      this.processSamples(last);
      if (this.nextSeekPosition) {
        nextFileStart = this.nextSeekPosition;
        this.nextSeekPosition = void 0;
      } else {
        nextFileStart = this.nextParsePosition;
      }
      if (this.stream.getEndFilePositionAfter) {
        nextFileStart = this.stream.getEndFilePositionAfter(nextFileStart);
      }
    } else {
      if (this.nextParsePosition) {
        nextFileStart = this.nextParsePosition;
      } else {
        nextFileStart = 0;
      }
    }
    if (this.sidx) {
      if (this.onSidx && !this.sidxSent) {
        this.onSidx(this.sidx);
        this.sidxSent = true;
      }
    }
    if (this.meta) {
      if (this.flattenItemInfo && !this.itemListBuilt) {
        this.flattenItemInfo();
        this.itemListBuilt = true;
      }
      if (this.processItems) {
        this.processItems(this.onItem);
      }
    }
    if (this.stream.cleanBuffers) {
      Log.info(
        "ISOFile",
        "Done processing buffer (fileStart: " + ab.fileStart + ") - next buffer to fetch should have a fileStart position of " + nextFileStart
      );
      this.stream.logBufferLevel();
      this.stream.cleanBuffers();
      this.stream.logBufferLevel(true);
      Log.info("ISOFile", "Sample data size in memory: " + this.getAllocatedSampleDataSize());
    }
    return nextFileStart;
  }
  getFragmentDuration() {
    const mvex = this.getBox("mvex");
    if (!mvex) return;
    if (mvex.mehd) {
      return {
        num: mvex.mehd.fragment_duration,
        den: this.moov.mvhd.timescale
      };
    }
    const traks = this.getBoxes("trak", false);
    let maximum = { num: 0, den: 1 };
    for (const trak of traks) {
      const duration = trak.samples_duration;
      const timescale = trak.mdia.mdhd.timescale;
      if (duration && timescale) {
        const ratio = duration / timescale;
        if (ratio > maximum.num / maximum.den) {
          maximum = { num: duration, den: timescale };
        }
      }
    }
    return maximum;
  }
  getInfo() {
    if (!this.moov) {
      return {
        hasMoov: false,
        mime: ""
      };
    }
    const _1904 = (/* @__PURE__ */ new Date("1904-01-01T00:00:00Z")).getTime();
    const isFragmented = this.getBox("mvex") !== void 0;
    const movie = {
      hasMoov: true,
      duration: this.moov.mvhd.duration,
      timescale: this.moov.mvhd.timescale,
      isFragmented,
      fragment_duration: this.getFragmentDuration(),
      isProgressive: this.isProgressive,
      hasIOD: this.moov.iods !== void 0,
      brands: [this.ftyp.major_brand].concat(this.ftyp.compatible_brands),
      created: new Date(_1904 + this.moov.mvhd.creation_time * 1e3),
      modified: new Date(_1904 + this.moov.mvhd.modification_time * 1e3),
      tracks: [],
      audioTracks: [],
      videoTracks: [],
      subtitleTracks: [],
      metadataTracks: [],
      hintTracks: [],
      otherTracks: [],
      mime: ""
    };
    for (let i = 0; i < this.moov.traks.length; i++) {
      const trak = this.moov.traks[i];
      const sample_desc = trak.mdia.minf.stbl.stsd.entries[0];
      const size = trak.samples_size;
      const track_timescale = trak.mdia.mdhd.timescale;
      const samples_duration = trak.samples_duration;
      const bitrate = size * 8 * track_timescale / samples_duration;
      const track = {
        samples_duration,
        bitrate,
        size,
        timescale: track_timescale,
        alternate_group: trak.tkhd.alternate_group,
        codec: sample_desc.getCodec(),
        created: new Date(_1904 + trak.tkhd.creation_time * 1e3),
        cts_shift: trak.mdia.minf.stbl.cslg,
        duration: trak.mdia.mdhd.duration,
        id: trak.tkhd.track_id,
        kind: trak.udta && trak.udta.kinds.length ? trak.udta.kinds[0] : { schemeURI: "", value: "" },
        // NOTE:   trak.mdia.elng used to be trak.mdia.eln
        language: trak.mdia.elng ? trak.mdia.elng.extended_language : trak.mdia.mdhd.languageString,
        layer: trak.tkhd.layer,
        matrix: trak.tkhd.matrix,
        modified: new Date(_1904 + trak.tkhd.modification_time * 1e3),
        movie_duration: trak.tkhd.duration,
        movie_timescale: movie.timescale,
        name: trak.mdia.hdlr.name,
        nb_samples: trak.samples.length,
        references: [],
        track_height: trak.tkhd.height / (1 << 16),
        track_width: trak.tkhd.width / (1 << 16),
        volume: trak.tkhd.volume
      };
      movie.tracks.push(track);
      if (trak.tref) {
        for (let j = 0; j < trak.tref.references.length; j++) {
          track.references.push({
            type: trak.tref.references[j].type,
            track_ids: trak.tref.references[j].track_ids
          });
        }
      }
      if (trak.edts !== void 0 && trak.edts.elst !== void 0) {
        track.edits = trak.edts.elst.entries;
      }
      if (sample_desc instanceof AudioSampleEntry) {
        track.type = "audio";
        movie.audioTracks.push(track);
        track.audio = {
          sample_rate: sample_desc.getSampleRate(),
          channel_count: sample_desc.getChannelCount(),
          sample_size: sample_desc.getSampleSize()
        };
      } else if (sample_desc instanceof VisualSampleEntry) {
        track.type = "video";
        movie.videoTracks.push(track);
        track.video = {
          width: sample_desc.getWidth(),
          height: sample_desc.getHeight()
        };
      } else if (sample_desc instanceof SubtitleSampleEntry) {
        track.type = "subtitles";
        movie.subtitleTracks.push(track);
      } else if (sample_desc instanceof HintSampleEntry) {
        track.type = "metadata";
        movie.hintTracks.push(track);
      } else if (sample_desc instanceof MetadataSampleEntry) {
        track.type = "metadata";
        movie.metadataTracks.push(track);
      } else {
        track.type = "metadata";
        movie.otherTracks.push(track);
      }
    }
    if (movie.videoTracks && movie.videoTracks.length > 0) {
      movie.mime += 'video/mp4; codecs="';
    } else if (movie.audioTracks && movie.audioTracks.length > 0) {
      movie.mime += 'audio/mp4; codecs="';
    } else {
      movie.mime += 'application/mp4; codecs="';
    }
    for (let i = 0; i < movie.tracks.length; i++) {
      if (i !== 0) movie.mime += ",";
      movie.mime += movie.tracks[i].codec;
    }
    movie.mime += '"; profiles="';
    movie.mime += this.ftyp.compatible_brands.join();
    movie.mime += '"';
    return movie;
  }
  setNextSeekPositionFromSample(sample) {
    if (!sample) {
      return;
    }
    if (this.nextSeekPosition) {
      this.nextSeekPosition = Math.min(sample.offset + sample.alreadyRead, this.nextSeekPosition);
    } else {
      this.nextSeekPosition = sample.offset + sample.alreadyRead;
    }
  }
  processSamples(last) {
    if (!this.sampleProcessingStarted) return;
    if (this.isFragmentationInitialized && this.onSegment !== void 0) {
      const consumedTracks = /* @__PURE__ */ new Set();
      while (consumedTracks.size < this.fragmentedTracks.length && this.fragmentedTracks.some((track) => track.trak.nextSample < track.trak.samples.length) && this.sampleProcessingStarted) {
        for (const fragTrak of this.fragmentedTracks) {
          const trak = fragTrak.trak;
          if (!consumedTracks.has(fragTrak.id)) {
            const sample = trak.nextSample < trak.samples.length ? this.getSample(trak, trak.nextSample) : void 0;
            if (!sample) {
              this.setNextSeekPositionFromSample(trak.samples[trak.nextSample]);
              consumedTracks.add(fragTrak.id);
              continue;
            }
            fragTrak.state.accumulatedSize += sample.size;
            const sampleNum = trak.nextSample + 1;
            const isFragmentOverdue = sampleNum - fragTrak.state.lastFragmentSampleNumber > fragTrak.nb_samples_per_fragment;
            const isSegmentOverdue = sampleNum - fragTrak.state.lastSegmentSampleNumber > fragTrak.nb_samples;
            let isFragmentBoundary = isFragmentOverdue || sampleNum % fragTrak.nb_samples_per_fragment === 0;
            let isSegmentBoundary = isSegmentOverdue || sampleNum % fragTrak.nb_samples === 0;
            let isSizeBoundary = fragTrak.state.accumulatedSize >= fragTrak.size_per_segment;
            const isRAP = !fragTrak.rapAlignement || sample.is_sync;
            const isFlush = last || trak.nextSample + 1 >= trak.samples.length;
            if (isFlush && !isRAP) {
              Log.warn(
                "ISOFile",
                "Flushing track #" + fragTrak.id + " at sample #" + trak.nextSample + " which is not a RAP, this may lead to playback issues"
              );
            }
            isFragmentBoundary = isFragmentBoundary && isRAP;
            isSegmentBoundary = isSegmentBoundary && isRAP;
            isSizeBoundary = isSizeBoundary && isRAP;
            if (isFragmentBoundary || isSizeBoundary || isFlush) {
              if (isFragmentOverdue) {
                Log.warn(
                  "ISOFile",
                  "Fragment on track #" + fragTrak.id + " is overdue, creating it with samples [" + fragTrak.state.lastFragmentSampleNumber + ", " + trak.nextSample + "]"
                );
              } else {
                Log.debug(
                  "ISOFile",
                  "Creating media fragment on track #" + fragTrak.id + " for samples [" + fragTrak.state.lastFragmentSampleNumber + ", " + trak.nextSample + "]"
                );
              }
              const result = this.createFragment(
                fragTrak.id,
                fragTrak.state.lastFragmentSampleNumber,
                trak.nextSample,
                fragTrak.segmentStream
              );
              if (result) {
                fragTrak.segmentStream = result;
                fragTrak.state.lastFragmentSampleNumber = trak.nextSample + 1;
              } else {
                consumedTracks.add(fragTrak.id);
                continue;
              }
            }
            if (isSegmentBoundary || isSizeBoundary || isFlush) {
              if (isSegmentOverdue) {
                Log.warn(
                  "ISOFile",
                  "Segment on track #" + fragTrak.id + " is overdue, sending it with samples [" + Math.max(0, trak.nextSample - fragTrak.nb_samples) + ", " + (trak.nextSample - 1) + "]"
                );
              } else {
                Log.info(
                  "ISOFile",
                  "Sending fragmented data on track #" + fragTrak.id + " for samples [" + Math.max(0, trak.nextSample - fragTrak.nb_samples) + ", " + (trak.nextSample - 1) + "]"
                );
              }
              Log.info(
                "ISOFile",
                "Sample data size in memory: " + this.getAllocatedSampleDataSize()
              );
              if (this.onSegment) {
                this.onSegment(
                  fragTrak.id,
                  fragTrak.user,
                  fragTrak.segmentStream.buffer,
                  trak.nextSample + 1,
                  last || trak.nextSample + 1 >= trak.samples.length
                );
              }
              fragTrak.segmentStream = void 0;
              fragTrak.state.accumulatedSize = 0;
              fragTrak.state.lastSegmentSampleNumber = trak.nextSample + 1;
            }
            trak.nextSample++;
          }
        }
      }
    }
    if (this.onSamples !== void 0) {
      for (let i = 0; i < this.extractedTracks.length; i++) {
        const extractTrak = this.extractedTracks[i];
        const trak = extractTrak.trak;
        while (trak.nextSample < trak.samples.length && this.sampleProcessingStarted) {
          Log.debug(
            "ISOFile",
            "Exporting on track #" + extractTrak.id + " sample #" + trak.nextSample
          );
          const sample = this.getSample(trak, trak.nextSample);
          if (sample) {
            trak.nextSample++;
            extractTrak.samples.push(sample);
          } else {
            this.setNextSeekPositionFromSample(trak.samples[trak.nextSample]);
            break;
          }
          if (trak.nextSample % extractTrak.nb_samples === 0 || trak.nextSample >= trak.samples.length) {
            Log.debug(
              "ISOFile",
              "Sending samples on track #" + extractTrak.id + " for sample " + trak.nextSample
            );
            if (this.onSamples) {
              this.onSamples(extractTrak.id, extractTrak.user, extractTrak.samples);
            }
            extractTrak.samples = [];
            if (extractTrak !== this.extractedTracks[i]) {
              break;
            }
          }
        }
      }
    }
  }
  /* Find and return specific boxes using recursion and early return */
  getBox(type) {
    const result = this.getBoxes(type, true);
    return result.length ? result[0] : void 0;
  }
  getBoxes(type, returnEarly) {
    const result = [];
    const sweep = (root) => {
      if (root instanceof Box && root.type && root.type === type) {
        result.push(root);
      }
      const inner = [];
      if (root["boxes"]) inner.push(...root.boxes);
      if (root["entries"]) inner.push(...root["entries"]);
      if (root["item_infos"]) inner.push(...root["item_infos"]);
      if (root["references"]) inner.push(...root["references"]);
      for (const box of inner) {
        if (result.length && returnEarly) return;
        sweep(box);
      }
    };
    sweep(this);
    return result;
  }
  getTrackSamplesInfo(track_id) {
    const track = this.getTrackById(track_id);
    if (track) {
      return track.samples;
    }
  }
  getTrackSample(track_id, number) {
    const track = this.getTrackById(track_id);
    const sample = this.getSample(track, number);
    return sample;
  }
  /* Called by the application to release the resources associated to samples already forwarded to the application */
  releaseUsedSamples(id, sampleNum) {
    let size = 0;
    const trak = this.getTrackById(id);
    if (!trak.lastValidSample) trak.lastValidSample = 0;
    for (let i = trak.lastValidSample; i < sampleNum; i++) {
      size += this.releaseSample(trak, i);
    }
    Log.info(
      "ISOFile",
      "Track #" + id + " released samples up to " + sampleNum + " (released size: " + size + ", remaining: " + this.samplesDataSize + ")"
    );
    trak.lastValidSample = sampleNum;
  }
  start() {
    this.sampleProcessingStarted = true;
    this.processSamples(false);
  }
  stop() {
    this.sampleProcessingStarted = false;
  }
  /* Called by the application to flush the remaining samples (e.g. once the download is finished or when no more samples will be added) */
  flush() {
    Log.info("ISOFile", "Flushing remaining samples");
    this.updateSampleLists();
    this.processSamples(true);
    this.stream.cleanBuffers();
    this.stream.logBufferLevel(true);
  }
  /* Finds the byte offset for a given time on a given track
     also returns the time of the previous rap */
  seekTrack(time, useRap, trak) {
    let rap_seek_sample_num = 0;
    let seek_sample_num = 0;
    let timescale;
    if (trak.samples.length === 0) {
      Log.info(
        "ISOFile",
        "No sample in track, cannot seek! Using time " + Log.getDurationString(0, 1) + " and offset: 0"
      );
      return { offset: 0, time: 0 };
    }
    for (let j = 0; j < trak.samples.length; j++) {
      const sample = trak.samples[j];
      if (j === 0) {
        seek_sample_num = 0;
        timescale = sample.timescale;
      } else if (sample.cts > time * sample.timescale) {
        seek_sample_num = j - 1;
        break;
      }
      if (useRap && sample.is_sync) {
        rap_seek_sample_num = j;
      }
    }
    if (useRap) {
      seek_sample_num = rap_seek_sample_num;
    }
    time = trak.samples[seek_sample_num].cts;
    trak.nextSample = seek_sample_num;
    while (trak.samples[seek_sample_num].alreadyRead === trak.samples[seek_sample_num].size) {
      if (!trak.samples[seek_sample_num + 1]) {
        break;
      }
      seek_sample_num++;
    }
    const seek_offset = trak.samples[seek_sample_num].offset + trak.samples[seek_sample_num].alreadyRead;
    Log.info(
      "ISOFile",
      "Seeking to " + (useRap ? "RAP" : "") + " sample #" + trak.nextSample + " on track " + trak.tkhd.track_id + ", time " + Log.getDurationString(time, timescale) + " and offset: " + seek_offset
    );
    return { offset: seek_offset, time: time / timescale };
  }
  getTrackDuration(trak) {
    if (!trak.samples) {
      return Infinity;
    }
    const sample = trak.samples[trak.samples.length - 1];
    return (sample.cts + sample.duration) / sample.timescale;
  }
  /* Finds the byte offset in the file corresponding to the given time or to the time of the previous RAP */
  seek(time, useRap) {
    const moov = this.moov;
    let seek_info = { offset: Infinity, time: Infinity };
    if (!this.moov) {
      throw new Error("Cannot seek: moov not received!");
    } else {
      for (let i = 0; i < moov.traks.length; i++) {
        const trak = moov.traks[i];
        if (time > this.getTrackDuration(trak)) {
          continue;
        }
        const trak_seek_info = this.seekTrack(time, useRap, trak);
        if (trak_seek_info.offset < seek_info.offset) {
          seek_info.offset = trak_seek_info.offset;
        }
        if (trak_seek_info.time < seek_info.time) {
          seek_info.time = trak_seek_info.time;
        }
      }
      Log.info(
        "ISOFile",
        "Seeking at time " + Log.getDurationString(seek_info.time, 1) + " needs a buffer with a fileStart position of " + seek_info.offset
      );
      if (seek_info.offset === Infinity) {
        seek_info = { offset: this.nextParsePosition, time: 0 };
      } else {
        seek_info.offset = this.stream.getEndFilePositionAfter(seek_info.offset);
      }
      Log.info(
        "ISOFile",
        "Adjusted seek position (after checking data already in buffer): " + seek_info.offset
      );
      return seek_info;
    }
  }
  equal(b) {
    let box_index = 0;
    while (box_index < this.boxes.length && box_index < b.boxes.length) {
      const a_box = this.boxes[box_index];
      const b_box = b.boxes[box_index];
      if (!boxEqual(a_box, b_box)) {
        return false;
      }
      box_index++;
    }
    return true;
  }
  /**
   * Rewrite the entire file
   * @bundle isofile-write.js
   */
  write(outstream) {
    for (let i = 0; i < this.boxes.length; i++) {
      this.boxes[i].write(outstream);
    }
  }
  /** @bundle isofile-write.js */
  createFragment(track_id, sampleStart, sampleEnd, existingStream) {
    const samples = [];
    for (let i = sampleStart; i <= sampleEnd; i++) {
      const trak = this.getTrackById(track_id);
      const sample = this.getSample(trak, i);
      if (!sample) {
        this.setNextSeekPositionFromSample(trak.samples[i]);
        return;
      }
      samples.push(sample);
    }
    const stream = existingStream || new DataStream();
    const moof = this.createMoof(samples);
    moof.write(stream);
    moof.trafs[0].truns[0].data_offset = moof.size + 8;
    Log.debug(
      "MP4Box",
      "Adjusting data_offset with new value " + moof.trafs[0].truns[0].data_offset
    );
    stream.adjustUint32(
      moof.trafs[0].truns[0].data_offset_position,
      moof.trafs[0].truns[0].data_offset
    );
    const mdat = new mdatBox();
    mdat.stream = new MultiBufferStream();
    let offset = 0;
    for (const sample of samples) {
      if (sample.data) {
        const mp4Buffer = MP4BoxBuffer.fromArrayBuffer(sample.data.buffer, offset);
        mdat.stream.insertBuffer(mp4Buffer);
        offset += sample.data.byteLength;
      }
    }
    mdat.write(stream);
    return stream;
  }
  /**
   * Modify the file and create the initialization segment
   * @bundle isofile-write.js
   */
  static writeInitializationSegment(ftyp, moov, total_duration) {
    Log.debug("ISOFile", "Generating initialization segment");
    const stream = new DataStream();
    ftyp.write(stream);
    const mvex = moov.addBox(new mvexBox());
    if (total_duration) {
      const mehd = mvex.addBox(new mehdBox());
      mehd.fragment_duration = total_duration;
    }
    for (let i = 0; i < moov.traks.length; i++) {
      const trex = mvex.addBox(new trexBox());
      trex.track_id = moov.traks[i].tkhd.track_id;
      trex.default_sample_description_index = 1;
      trex.default_sample_duration = moov.traks[i].samples[0]?.duration ?? 0;
      trex.default_sample_size = 0;
      trex.default_sample_flags = 1 << 16;
    }
    moov.write(stream);
    return stream.buffer;
  }
  /** @bundle isofile-write.js */
  save(name) {
    const stream = new DataStream();
    stream.isofile = this;
    this.write(stream);
    return stream.save(name);
  }
  /** @bundle isofile-write.js */
  getBuffer() {
    const stream = new DataStream();
    stream.isofile = this;
    this.write(stream);
    return stream;
  }
  /** @bundle isofile-write.js */
  initializeSegmentation() {
    if (!this.onSegment) {
      Log.warn("MP4Box", "No segmentation callback set!");
    }
    if (!this.isFragmentationInitialized) {
      this.isFragmentationInitialized = true;
      this.resetTables();
    }
    const moov = new moovBox();
    moov.addBox(this.moov.mvhd);
    for (let i = 0; i < this.fragmentedTracks.length; i++) {
      const trak = this.getTrackById(this.fragmentedTracks[i].id);
      if (!trak) {
        Log.warn(
          "ISOFile",
          `Track with id ${this.fragmentedTracks[i].id} not found, skipping fragmentation initialization`
        );
        continue;
      }
      moov.addBox(trak);
    }
    return {
      tracks: moov.traks.map((trak, i) => ({
        id: trak.tkhd.track_id,
        user: this.fragmentedTracks[i].user
      })),
      buffer: _ISOFile.writeInitializationSegment(
        this.ftyp,
        moov,
        this.moov?.mvex?.mehd.fragment_duration
      )
    };
  }
  /**
   * Resets all sample tables
   * @bundle isofile-sample-processing.js
   */
  resetTables() {
    this.initial_duration = this.moov.mvhd.duration;
    this.moov.mvhd.duration = 0;
    for (let i = 0; i < this.moov.traks.length; i++) {
      const trak = this.moov.traks[i];
      trak.tkhd.duration = 0;
      trak.mdia.mdhd.duration = 0;
      const stco = trak.mdia.minf.stbl.stco || trak.mdia.minf.stbl.co64;
      stco.chunk_offsets = [];
      const stsc = trak.mdia.minf.stbl.stsc;
      stsc.first_chunk = [];
      stsc.samples_per_chunk = [];
      stsc.sample_description_index = [];
      const stsz = trak.mdia.minf.stbl.stsz || trak.mdia.minf.stbl.stz2;
      stsz.sample_sizes = [];
      const stts = trak.mdia.minf.stbl.stts;
      stts.sample_counts = [];
      stts.sample_deltas = [];
      const ctts = trak.mdia.minf.stbl.ctts;
      if (ctts) {
        ctts.sample_counts = [];
        ctts.sample_offsets = [];
      }
      const stss = trak.mdia.minf.stbl.stss;
      const k = trak.mdia.minf.stbl.boxes.indexOf(stss);
      if (k !== -1) trak.mdia.minf.stbl.boxes[k] = void 0;
    }
  }
  /** @bundle isofile-sample-processing.js */
  static initSampleGroups(trak, traf, sbgps, trak_sgpds, traf_sgpds) {
    if (traf) {
      traf.sample_groups_info = [];
    }
    if (!trak.sample_groups_info) {
      trak.sample_groups_info = [];
    }
    for (let k = 0; k < sbgps.length; k++) {
      const sample_group_key = sbgps[k].grouping_type + "/" + sbgps[k].grouping_type_parameter;
      const sample_group_info = new SampleGroupInfo(
        sbgps[k].grouping_type,
        sbgps[k].grouping_type_parameter,
        sbgps[k]
      );
      if (traf) {
        traf.sample_groups_info[sample_group_key] = sample_group_info;
      }
      if (!trak.sample_groups_info[sample_group_key]) {
        trak.sample_groups_info[sample_group_key] = sample_group_info;
      }
      for (let l = 0; l < trak_sgpds.length; l++) {
        if (trak_sgpds[l].grouping_type === sbgps[k].grouping_type) {
          sample_group_info.description = trak_sgpds[l];
          sample_group_info.description.used = true;
        }
      }
      if (traf_sgpds) {
        for (let l = 0; l < traf_sgpds.length; l++) {
          if (traf_sgpds[l].grouping_type === sbgps[k].grouping_type) {
            sample_group_info.fragment_description = traf_sgpds[l];
            sample_group_info.fragment_description.used = true;
            sample_group_info.is_fragment = true;
          }
        }
      }
    }
    if (!traf) {
      for (let k = 0; k < trak_sgpds.length; k++) {
        if (!trak_sgpds[k].used && trak_sgpds[k].version >= 2) {
          const sample_group_key = trak_sgpds[k].grouping_type + "/0";
          const sample_group_info = new SampleGroupInfo(trak_sgpds[k].grouping_type, 0);
          if (!trak.sample_groups_info[sample_group_key]) {
            trak.sample_groups_info[sample_group_key] = sample_group_info;
          }
        }
      }
    } else {
      if (traf_sgpds) {
        for (let k = 0; k < traf_sgpds.length; k++) {
          if (!traf_sgpds[k].used && traf_sgpds[k].version >= 2) {
            const sample_group_key = traf_sgpds[k].grouping_type + "/0";
            const sample_group_info = new SampleGroupInfo(traf_sgpds[k].grouping_type, 0);
            sample_group_info.is_fragment = true;
            if (!traf.sample_groups_info[sample_group_key]) {
              traf.sample_groups_info[sample_group_key] = sample_group_info;
            }
          }
        }
      }
    }
  }
  /** @bundle isofile-sample-processing.js */
  static setSampleGroupProperties(trak, sample, sample_number, sample_groups_info) {
    sample.sample_groups = [];
    for (const k in sample_groups_info) {
      sample.sample_groups[k] = {
        grouping_type: sample_groups_info[k].grouping_type,
        grouping_type_parameter: sample_groups_info[k].grouping_type_parameter
      };
      if (sample_number >= sample_groups_info[k].last_sample_in_run) {
        if (sample_groups_info[k].last_sample_in_run < 0) {
          sample_groups_info[k].last_sample_in_run = 0;
        }
        sample_groups_info[k].entry_index++;
        if (sample_groups_info[k].entry_index <= sample_groups_info[k].sbgp.entries.length - 1) {
          sample_groups_info[k].last_sample_in_run += sample_groups_info[k].sbgp.entries[sample_groups_info[k].entry_index].sample_count;
        }
      }
      if (sample_groups_info[k].entry_index <= sample_groups_info[k].sbgp.entries.length - 1) {
        sample.sample_groups[k].group_description_index = sample_groups_info[k].sbgp.entries[sample_groups_info[k].entry_index].group_description_index;
      } else {
        sample.sample_groups[k].group_description_index = -1;
      }
      if (sample.sample_groups[k].group_description_index !== 0) {
        let description;
        if (sample_groups_info[k].fragment_description) {
          description = sample_groups_info[k].fragment_description;
        } else {
          description = sample_groups_info[k].description;
        }
        if (sample.sample_groups[k].group_description_index > 0) {
          let index;
          if (sample.sample_groups[k].group_description_index > 65535) {
            index = (sample.sample_groups[k].group_description_index >> 16) - 1;
          } else {
            index = sample.sample_groups[k].group_description_index - 1;
          }
          if (description && index >= 0) {
            sample.sample_groups[k].description = description.entries[index];
          }
        } else {
          if (description && description.version >= 2) {
            if (description.default_group_description_index > 0) {
              sample.sample_groups[k].description = description.entries[description.default_group_description_index - 1];
            }
          }
        }
      }
    }
  }
  /** @bundle isofile-sample-processing.js */
  static process_sdtp(sdtp, sample, number) {
    if (!sample) {
      return;
    }
    if (sdtp) {
      sample.is_leading = sdtp.is_leading[number];
      sample.depends_on = sdtp.sample_depends_on[number];
      sample.is_depended_on = sdtp.sample_is_depended_on[number];
      sample.has_redundancy = sdtp.sample_has_redundancy[number];
    } else {
      sample.is_leading = 0;
      sample.depends_on = 0;
      sample.is_depended_on = 0;
      sample.has_redundancy = 0;
    }
  }
  /* Build initial sample list from  sample tables */
  buildSampleLists() {
    for (let i = 0; i < this.moov.traks.length; i++) {
      this.buildTrakSampleLists(this.moov.traks[i]);
    }
  }
  buildTrakSampleLists(trak) {
    let j;
    let chunk_run_index;
    let chunk_index;
    let last_chunk_in_run;
    let offset_in_chunk;
    let last_sample_in_chunk;
    trak.samples = [];
    trak.samples_duration = 0;
    trak.samples_size = 0;
    const stco = trak.mdia.minf.stbl.stco || trak.mdia.minf.stbl.co64;
    const stsc = trak.mdia.minf.stbl.stsc;
    const stsz = trak.mdia.minf.stbl.stsz || trak.mdia.minf.stbl.stz2;
    const stts = trak.mdia.minf.stbl.stts;
    const ctts = trak.mdia.minf.stbl.ctts;
    const stss = trak.mdia.minf.stbl.stss;
    const stsd = trak.mdia.minf.stbl.stsd;
    const subs = trak.mdia.minf.stbl.subs;
    const stdp = trak.mdia.minf.stbl.stdp;
    const sbgps = trak.mdia.minf.stbl.sbgps;
    const sgpds = trak.mdia.minf.stbl.sgpds;
    let last_sample_in_stts_run = -1;
    let stts_run_index = -1;
    let last_sample_in_ctts_run = -1;
    let ctts_run_index = -1;
    let last_stss_index = 0;
    let subs_entry_index = 0;
    let last_subs_sample_index = 0;
    _ISOFile.initSampleGroups(trak, void 0, sbgps, sgpds);
    if (typeof stsz === "undefined") {
      return;
    }
    for (j = 0; j < stsz.sample_sizes.length; j++) {
      const sample = {
        number: j,
        track_id: trak.tkhd.track_id,
        timescale: trak.mdia.mdhd.timescale,
        alreadyRead: 0,
        size: stsz.sample_sizes[j]
      };
      trak.samples[j] = sample;
      trak.samples_size += sample.size;
      if (j === 0) {
        chunk_index = 1;
        chunk_run_index = 0;
        sample.chunk_index = chunk_index;
        sample.chunk_run_index = chunk_run_index;
        last_sample_in_chunk = stsc.samples_per_chunk[chunk_run_index];
        offset_in_chunk = 0;
        if (chunk_run_index + 1 < stsc.first_chunk.length) {
          last_chunk_in_run = stsc.first_chunk[chunk_run_index + 1] - 1;
        } else {
          last_chunk_in_run = Infinity;
        }
      } else {
        if (j < last_sample_in_chunk) {
          sample.chunk_index = chunk_index;
          sample.chunk_run_index = chunk_run_index;
        } else {
          chunk_index++;
          sample.chunk_index = chunk_index;
          offset_in_chunk = 0;
          if (chunk_index <= last_chunk_in_run) ;
          else {
            chunk_run_index++;
            if (chunk_run_index + 1 < stsc.first_chunk.length) {
              last_chunk_in_run = stsc.first_chunk[chunk_run_index + 1] - 1;
            } else {
              last_chunk_in_run = Infinity;
            }
          }
          sample.chunk_run_index = chunk_run_index;
          last_sample_in_chunk += stsc.samples_per_chunk[chunk_run_index];
        }
      }
      sample.description_index = stsc.sample_description_index[sample.chunk_run_index] - 1;
      sample.description = stsd.entries[sample.description_index];
      sample.offset = stco.chunk_offsets[sample.chunk_index - 1] + offset_in_chunk;
      offset_in_chunk += sample.size;
      if (j > last_sample_in_stts_run) {
        stts_run_index++;
        if (last_sample_in_stts_run < 0) {
          last_sample_in_stts_run = 0;
        }
        last_sample_in_stts_run += stts.sample_counts[stts_run_index];
      }
      if (j > 0) {
        trak.samples[j - 1].duration = stts.sample_deltas[stts_run_index];
        trak.samples_duration += trak.samples[j - 1].duration;
        sample.dts = trak.samples[j - 1].dts + trak.samples[j - 1].duration;
      } else {
        sample.dts = 0;
      }
      if (ctts) {
        if (j >= last_sample_in_ctts_run) {
          ctts_run_index++;
          if (last_sample_in_ctts_run < 0) {
            last_sample_in_ctts_run = 0;
          }
          last_sample_in_ctts_run += ctts.sample_counts[ctts_run_index];
        }
        sample.cts = trak.samples[j].dts + ctts.sample_offsets[ctts_run_index];
      } else {
        sample.cts = sample.dts;
      }
      if (stss) {
        if (j === stss.sample_numbers[last_stss_index] - 1) {
          sample.is_sync = true;
          last_stss_index++;
        } else {
          sample.is_sync = false;
          sample.degradation_priority = 0;
        }
        if (subs) {
          if (subs.entries[subs_entry_index].sample_delta + last_subs_sample_index === j + 1) {
            sample.subsamples = subs.entries[subs_entry_index].subsamples;
            last_subs_sample_index += subs.entries[subs_entry_index].sample_delta;
            subs_entry_index++;
          }
        }
      } else {
        sample.is_sync = true;
      }
      _ISOFile.process_sdtp(trak.mdia.minf.stbl.sdtp, sample, sample.number);
      if (stdp) {
        sample.degradation_priority = stdp.priority[j];
      } else {
        sample.degradation_priority = 0;
      }
      if (subs) {
        if (subs.entries[subs_entry_index].sample_delta + last_subs_sample_index === j) {
          sample.subsamples = subs.entries[subs_entry_index].subsamples;
          last_subs_sample_index += subs.entries[subs_entry_index].sample_delta;
        }
      }
      if (sbgps.length > 0 || sgpds.length > 0) {
        _ISOFile.setSampleGroupProperties(trak, sample, j, trak.sample_groups_info);
      }
    }
    if (j > 0) {
      trak.samples[j - 1].duration = Math.max(trak.mdia.mdhd.duration - trak.samples[j - 1].dts, 0);
      trak.samples_duration += trak.samples[j - 1].duration;
    }
  }
  /**
   * Update sample list when new 'moof' boxes are received
   * @bundle isofile-sample-processing.js
   */
  updateSampleLists() {
    let default_sample_description_index;
    let default_sample_duration;
    let default_sample_size;
    let default_sample_flags;
    let last_run_position;
    if (this.moov === void 0) {
      return;
    }
    while (this.lastMoofIndex < this.moofs.length) {
      const box = this.moofs[this.lastMoofIndex];
      this.lastMoofIndex++;
      if (box.type === "moof") {
        const moof = box;
        for (let i = 0; i < moof.trafs.length; i++) {
          const traf = moof.trafs[i];
          const trak = this.getTrackById(traf.tfhd.track_id);
          const trex = this.getTrexById(traf.tfhd.track_id);
          if (traf.tfhd.flags & TFHD_FLAG_SAMPLE_DESC) {
            default_sample_description_index = traf.tfhd.default_sample_description_index;
          } else {
            default_sample_description_index = trex ? trex.default_sample_description_index : 1;
          }
          if (traf.tfhd.flags & TFHD_FLAG_SAMPLE_DUR) {
            default_sample_duration = traf.tfhd.default_sample_duration;
          } else {
            default_sample_duration = trex ? trex.default_sample_duration : 0;
          }
          if (traf.tfhd.flags & TFHD_FLAG_SAMPLE_SIZE) {
            default_sample_size = traf.tfhd.default_sample_size;
          } else {
            default_sample_size = trex ? trex.default_sample_size : 0;
          }
          if (traf.tfhd.flags & TFHD_FLAG_SAMPLE_FLAGS) {
            default_sample_flags = traf.tfhd.default_sample_flags;
          } else {
            default_sample_flags = trex ? trex.default_sample_flags : 0;
          }
          traf.sample_number = 0;
          if (traf.sbgps.length > 0) {
            _ISOFile.initSampleGroups(trak, traf, traf.sbgps, trak.mdia.minf.stbl.sgpds, traf.sgpds);
          }
          for (let j = 0; j < traf.truns.length; j++) {
            const trun = traf.truns[j];
            for (let k = 0; k < trun.sample_count; k++) {
              const description_index = default_sample_description_index - 1;
              let sample_flags = default_sample_flags;
              if (trun.flags & TRUN_FLAGS_FLAGS) {
                sample_flags = trun.sample_flags[k];
              } else if (k === 0 && trun.flags & TRUN_FLAGS_FIRST_FLAG) {
                sample_flags = trun.first_sample_flags;
              }
              let size = default_sample_size;
              if (trun.flags & TRUN_FLAGS_SIZE) {
                size = trun.sample_size[k];
              }
              trak.samples_size += size;
              let duration = default_sample_duration;
              if (trun.flags & TRUN_FLAGS_DURATION) {
                duration = trun.sample_duration[k];
              }
              trak.samples_duration += duration;
              let dts;
              if (trak.first_traf_merged || k > 0) {
                dts = trak.samples[trak.samples.length - 1].dts + trak.samples[trak.samples.length - 1].duration;
              } else {
                if (traf.tfdt) {
                  dts = traf.tfdt.baseMediaDecodeTime;
                } else {
                  dts = 0;
                }
                trak.first_traf_merged = true;
              }
              let cts = dts;
              if (trun.flags & TRUN_FLAGS_CTS_OFFSET) {
                cts = dts + trun.sample_composition_time_offset[k];
              }
              const bdop = traf.tfhd.flags & TFHD_FLAG_BASE_DATA_OFFSET ? true : false;
              const dbim = traf.tfhd.flags & TFHD_FLAG_DEFAULT_BASE_IS_MOOF ? true : false;
              const dop = trun.flags & TRUN_FLAGS_DATA_OFFSET ? true : false;
              let bdo = 0;
              if (!bdop) {
                if (!dbim) {
                  if (j === 0) {
                    bdo = moof.start;
                  } else {
                    bdo = last_run_position;
                  }
                } else {
                  bdo = moof.start;
                }
              } else {
                bdo = traf.tfhd.base_data_offset;
              }
              let offset;
              if (j === 0 && k === 0) {
                if (dop) {
                  offset = bdo + trun.data_offset;
                } else {
                  offset = bdo;
                }
              } else {
                offset = last_run_position;
              }
              last_run_position = offset + size;
              const number_in_traf = traf.sample_number;
              traf.sample_number++;
              const sample = {
                cts,
                description_index,
                description: trak.mdia.minf.stbl.stsd.entries[description_index],
                dts,
                duration,
                moof_number: this.lastMoofIndex,
                number_in_traf,
                number: trak.samples.length,
                offset,
                size,
                timescale: trak.mdia.mdhd.timescale,
                track_id: trak.tkhd.track_id,
                is_sync: sample_flags >> 16 & 1 ? false : true,
                is_leading: sample_flags >> 26 & 3,
                depends_on: sample_flags >> 24 & 3,
                is_depended_on: sample_flags >> 22 & 3,
                has_redundancy: sample_flags >> 20 & 3,
                degradation_priority: sample_flags & 65535
              };
              traf.first_sample_index = trak.samples.length;
              trak.samples.push(sample);
              if (traf.sbgps.length > 0 || traf.sgpds.length > 0 || trak.mdia.minf.stbl.sbgps.length > 0 || trak.mdia.minf.stbl.sgpds.length > 0) {
                _ISOFile.setSampleGroupProperties(
                  trak,
                  sample,
                  sample.number_in_traf,
                  traf.sample_groups_info
                );
              }
            }
          }
          if (traf.subs) {
            trak.has_fragment_subsamples = true;
            let sample_index = traf.first_sample_index;
            for (let j = 0; j < traf.subs.entries.length; j++) {
              sample_index += traf.subs.entries[j].sample_delta;
              const sample = trak.samples[sample_index - 1];
              sample.subsamples = traf.subs.entries[j].subsamples;
            }
          }
        }
      }
    }
  }
  /**
   * Try to get sample data for a given sample:
   * returns null if not found
   * returns the same sample if already requested
   *
   * @bundle isofile-sample-processing.js
   */
  getSample(trak, sampleNum) {
    const sample = trak.samples[sampleNum];
    if (!this.moov) return;
    if (!sample.data) {
      sample.data = new Uint8Array(sample.size);
      sample.alreadyRead = 0;
      this.samplesDataSize += sample.size;
      Log.debug(
        "ISOFile",
        "Allocating sample #" + sampleNum + " on track #" + trak.tkhd.track_id + " of size " + sample.size + " (total: " + this.samplesDataSize + ")"
      );
    } else if (sample.alreadyRead === sample.size) {
      return sample;
    }
    while (true) {
      let stream = this.stream;
      let index = stream.findPosition(true, sample.offset + sample.alreadyRead, false);
      let buffer;
      let fileStart;
      if (index > -1) {
        buffer = stream.buffers[index];
        fileStart = buffer.fileStart;
      } else {
        for (const mdat of this.mdats) {
          if (!mdat.stream) {
            Log.debug(
              "ISOFile",
              "mdat stream not yet fully read for #" + this.mdats.indexOf(mdat) + " mdat"
            );
            continue;
          }
          index = mdat.stream.findPosition(
            true,
            sample.offset + sample.alreadyRead - mdat.start - mdat.hdr_size,
            false
          );
          if (index > -1) {
            stream = mdat.stream;
            buffer = mdat.stream.buffers[index];
            fileStart = mdat.start + mdat.hdr_size + buffer.fileStart;
            break;
          }
        }
      }
      if (buffer) {
        const lengthAfterStart = buffer.byteLength - (sample.offset + sample.alreadyRead - fileStart);
        if (sample.size - sample.alreadyRead <= lengthAfterStart) {
          Log.debug(
            "ISOFile",
            "Getting sample #" + sampleNum + " data (alreadyRead: " + sample.alreadyRead + " offset: " + (sample.offset + sample.alreadyRead - fileStart) + " read size: " + (sample.size - sample.alreadyRead) + " full size: " + sample.size + ")"
          );
          DataStream.memcpy(
            sample.data.buffer,
            sample.alreadyRead,
            buffer,
            sample.offset + sample.alreadyRead - fileStart,
            sample.size - sample.alreadyRead
          );
          buffer.usedBytes += sample.size - sample.alreadyRead;
          stream.logBufferLevel();
          sample.alreadyRead = sample.size;
          return sample;
        } else {
          if (lengthAfterStart === 0) return;
          Log.debug(
            "ISOFile",
            "Getting sample #" + sampleNum + " partial data (alreadyRead: " + sample.alreadyRead + " offset: " + (sample.offset + sample.alreadyRead - fileStart) + " read size: " + lengthAfterStart + " full size: " + sample.size + ")"
          );
          DataStream.memcpy(
            sample.data.buffer,
            sample.alreadyRead,
            buffer,
            sample.offset + sample.alreadyRead - fileStart,
            lengthAfterStart
          );
          sample.alreadyRead += lengthAfterStart;
          buffer.usedBytes += lengthAfterStart;
          stream.logBufferLevel();
        }
      } else return;
    }
  }
  /**
   * Release the memory used to store the data of the sample
   *
   * @bundle isofile-sample-processing.js
   */
  releaseSample(trak, sampleNum) {
    const sample = trak.samples[sampleNum];
    if (sample.data) {
      this.samplesDataSize -= sample.size;
      sample.data = void 0;
      sample.alreadyRead = 0;
      return sample.size;
    } else {
      return 0;
    }
  }
  /** @bundle isofile-sample-processing.js */
  getAllocatedSampleDataSize() {
    return this.samplesDataSize;
  }
  /**
   * Builds the MIME Type 'codecs' sub-parameters for the whole file
   *
   * @bundle isofile-sample-processing.js
   */
  getCodecs() {
    let codecs = "";
    for (let i = 0; i < this.moov.traks.length; i++) {
      const trak = this.moov.traks[i];
      if (i > 0) {
        codecs += ",";
      }
      codecs += trak.mdia.minf.stbl.stsd.entries[0].getCodec();
    }
    return codecs;
  }
  /**
   * Helper function
   *
   * @bundle isofile-sample-processing.js
   */
  getTrexById(id) {
    if (!this.moov || !this.moov.mvex) return;
    for (let i = 0; i < this.moov.mvex.trexs.length; i++) {
      const trex = this.moov.mvex.trexs[i];
      if (trex.track_id === id) return trex;
    }
  }
  /**
   * Helper function
   *
   * @bundle isofile-sample-processing.js
   */
  getTrackById(id) {
    if (!this.moov) return;
    for (let j = 0; j < this.moov.traks.length; j++) {
      const trak = this.moov.traks[j];
      if (trak.tkhd.track_id === id) return trak;
    }
  }
  /** @bundle isofile-item-processing.js */
  flattenItemInfo() {
    const items = this.items;
    const entity_groups = this.entity_groups;
    const meta = this.meta;
    if (!meta || !meta.hdlr || !meta.iinf) return;
    for (let i = 0; i < meta.iinf.item_infos.length; i++) {
      const id = meta.iinf.item_infos[i].item_ID;
      items[id] = {
        id,
        name: meta.iinf.item_infos[i].item_name,
        ref_to: [],
        content_type: meta.iinf.item_infos[i].content_type,
        content_encoding: meta.iinf.item_infos[i].content_encoding,
        item_uri_type: meta.iinf.item_infos[i].item_uri_type,
        type: meta.iinf.item_infos[i].item_type ? meta.iinf.item_infos[i].item_type : "mime",
        protection: (
          // NOTE:   This was `meta.iinf.item_infos[i].protection_index` before
          meta.iinf.item_infos[i].item_protection_index > 0 ? (
            // NOTE:   This was `meta.iinf.item_infos[i].protection_index - 1` before
            meta.ipro.protections[meta.iinf.item_infos[i].item_protection_index - 1]
          ) : void 0
        )
      };
    }
    if (meta.grpl) {
      for (let i = 0; i < meta.grpl.boxes.length; i++) {
        const entityGroup = meta.grpl.boxes[i];
        entity_groups[entityGroup.group_id] = {
          id: entityGroup.group_id,
          entity_ids: entityGroup.entity_ids,
          type: entityGroup.type
        };
      }
    }
    if (meta.iloc) {
      for (let i = 0; i < meta.iloc.items.length; i++) {
        const itemloc = meta.iloc.items[i];
        const item = items[itemloc.item_ID];
        if (itemloc.data_reference_index !== 0) {
          Log.warn("Item storage with reference to other files: not supported");
          item.source = meta.dinf.boxes[itemloc.data_reference_index - 1];
        }
        item.extents = [];
        item.size = 0;
        for (let j = 0; j < itemloc.extents.length; j++) {
          item.extents[j] = {
            offset: itemloc.extents[j].extent_offset + itemloc.base_offset,
            length: itemloc.extents[j].extent_length,
            alreadyRead: 0
          };
          if (itemloc.construction_method === 1) {
            item.extents[j].offset += meta.idat.start + meta.idat.hdr_size;
          }
          item.size += item.extents[j].length;
        }
      }
    }
    if (meta.pitm) {
      items[meta.pitm.item_id].primary = true;
    }
    if (meta.iref) {
      for (let i = 0; i < meta.iref.references.length; i++) {
        const ref = meta.iref.references[i];
        for (let j = 0; j < ref.references.length; j++) {
          items[ref.from_item_ID].ref_to.push({ type: ref.type, id: ref.references[j] });
        }
      }
    }
    if (meta.iprp) {
      for (let k = 0; k < meta.iprp.ipmas.length; k++) {
        const ipma = meta.iprp.ipmas[k];
        for (let i = 0; i < ipma.associations.length; i++) {
          const association = ipma.associations[i];
          const item = items[association.id] ?? entity_groups[association.id];
          if (item) {
            if (item.properties === void 0) {
              item.properties = {
                boxes: []
              };
            }
            for (let j = 0; j < association.props.length; j++) {
              const propEntry = association.props[j];
              if (propEntry.property_index > 0 && propEntry.property_index - 1 < meta.iprp.ipco.boxes.length) {
                const propbox = meta.iprp.ipco.boxes[propEntry.property_index - 1];
                item.properties[propbox.type] = propbox;
                item.properties.boxes.push(propbox);
              }
            }
          }
        }
      }
    }
  }
  /** @bundle isofile-item-processing.js */
  getItem(item_id) {
    if (!this.meta) return;
    const item = this.items[item_id];
    if (!item.data && item.size) {
      item.data = new Uint8Array(item.size);
      item.alreadyRead = 0;
      this.itemsDataSize += item.size;
      Log.debug(
        "ISOFile",
        "Allocating item #" + item_id + " of size " + item.size + " (total: " + this.itemsDataSize + ")"
      );
    } else if (item.alreadyRead === item.size) {
      return item;
    }
    for (let i = 0; i < item.extents.length; i++) {
      const extent = item.extents[i];
      if (extent.alreadyRead === extent.length) {
        continue;
      } else {
        const index = this.stream.findPosition(true, extent.offset + extent.alreadyRead, false);
        if (index > -1) {
          const buffer = this.stream.buffers[index];
          const lengthAfterStart = buffer.byteLength - (extent.offset + extent.alreadyRead - buffer.fileStart);
          if (extent.length - extent.alreadyRead <= lengthAfterStart) {
            Log.debug(
              "ISOFile",
              "Getting item #" + item_id + " extent #" + i + " data (alreadyRead: " + extent.alreadyRead + " offset: " + (extent.offset + extent.alreadyRead - buffer.fileStart) + " read size: " + (extent.length - extent.alreadyRead) + " full extent size: " + extent.length + " full item size: " + item.size + ")"
            );
            DataStream.memcpy(
              item.data.buffer,
              item.alreadyRead,
              buffer,
              extent.offset + extent.alreadyRead - buffer.fileStart,
              extent.length - extent.alreadyRead
            );
            if (!this.parsingMdat || this.discardMdatData)
              buffer.usedBytes += extent.length - extent.alreadyRead;
            this.stream.logBufferLevel();
            item.alreadyRead += extent.length - extent.alreadyRead;
            extent.alreadyRead = extent.length;
          } else {
            Log.debug(
              "ISOFile",
              "Getting item #" + item_id + " extent #" + i + " partial data (alreadyRead: " + extent.alreadyRead + " offset: " + (extent.offset + extent.alreadyRead - buffer.fileStart) + " read size: " + lengthAfterStart + " full extent size: " + extent.length + " full item size: " + item.size + ")"
            );
            DataStream.memcpy(
              item.data.buffer,
              item.alreadyRead,
              buffer,
              extent.offset + extent.alreadyRead - buffer.fileStart,
              lengthAfterStart
            );
            extent.alreadyRead += lengthAfterStart;
            item.alreadyRead += lengthAfterStart;
            if (!this.parsingMdat || this.discardMdatData) buffer.usedBytes += lengthAfterStart;
            this.stream.logBufferLevel();
            return;
          }
        } else return;
      }
    }
    if (item.alreadyRead === item.size) {
      return item;
    }
  }
  /**
   * Release the memory used to store the data of the item
   *
   * @bundle isofile-item-processing.js
   */
  releaseItem(item_id) {
    const item = this.items[item_id];
    if (item.data) {
      this.itemsDataSize -= item.size;
      item.data = void 0;
      item.alreadyRead = 0;
      for (let i = 0; i < item.extents.length; i++) {
        const extent = item.extents[i];
        extent.alreadyRead = 0;
      }
      return item.size;
    } else {
      return 0;
    }
  }
  /** @bundle isofile-item-processing.js */
  processItems(callback) {
    for (const i in this.items) {
      const item = this.items[i];
      this.getItem(item.id);
      if (callback && !item.sent) {
        callback(item);
        item.sent = true;
        item.data = void 0;
      }
    }
  }
  /** @bundle isofile-item-processing.js */
  hasItem(name) {
    for (const i in this.items) {
      const item = this.items[i];
      if (item.name === name) {
        return item.id;
      }
    }
    return -1;
  }
  /** @bundle isofile-item-processing.js */
  getMetaHandler() {
    if (this.meta) return this.meta.hdlr.handler;
  }
  /** @bundle isofile-item-processing.js */
  getPrimaryItem() {
    if (this.meta && this.meta.pitm) return this.getItem(this.meta.pitm.item_id);
  }
  /** @bundle isofile-item-processing.js */
  itemToFragmentedTrackFile({ itemId } = {}) {
    let item;
    if (itemId) {
      item = this.getItem(itemId);
    } else {
      item = this.getPrimaryItem();
    }
    if (!item) return;
    const file = new _ISOFile();
    file.discardMdatData = false;
    const trackOptions = {
      type: item.type,
      description_boxes: item.properties.boxes
    };
    if (item.properties.ispe) {
      trackOptions.width = item.properties.ispe.image_width;
      trackOptions.height = item.properties.ispe.image_height;
    }
    const trackId = file.addTrack(trackOptions);
    if (trackId) {
      file.addSample(trackId, item.data);
      return file;
    }
  }
  /** @bundle isofile-advanced-parsing.js */
  processIncompleteBox(ret) {
    if (ret.type === "mdat") {
      const box = new mdatBox(ret.size);
      this.parsingMdat = box;
      this.boxes.push(box);
      this.mdats.push(box);
      box.start = ret.start;
      box.hdr_size = ret.hdr_size;
      box.original_size = ret.original_size;
      this.stream.addUsedBytes(box.hdr_size);
      this.lastBoxStartPosition = box.start + box.size;
      const found = this.stream.seek(box.start + box.size, false, this.discardMdatData);
      if (found) {
        this.transferMdatData();
        this.parsingMdat = void 0;
        return true;
      } else {
        if (!this.moovStartFound) {
          this.nextParsePosition = box.start + box.size;
        } else {
          this.nextParsePosition = this.stream.findEndContiguousBuf();
        }
        return false;
      }
    } else {
      if (ret.type === "moov") {
        this.moovStartFound = true;
        if (this.mdats.length === 0) {
          this.isProgressive = true;
        }
      }
      const merged = this.stream.mergeNextBuffer ? this.stream.mergeNextBuffer() : false;
      if (merged) {
        this.nextParsePosition = this.stream.getEndPosition();
        return true;
      } else {
        if (!ret.type) {
          this.nextParsePosition = this.stream.getEndPosition();
        } else {
          if (this.moovStartFound) {
            this.nextParsePosition = this.stream.getEndPosition();
          } else {
            this.nextParsePosition = this.stream.getPosition() + ret.size;
          }
        }
        return false;
      }
    }
  }
  /** @bundle isofile-advanced-parsing.js */
  hasIncompleteMdat() {
    return this.parsingMdat !== void 0;
  }
  /**
   * Transfer the data of the mdat box to its stream
   * @param mdat the mdat box to use
   */
  transferMdatData(inMdat) {
    const mdat = inMdat ?? this.parsingMdat;
    if (this.discardMdatData) {
      Log.debug("ISOFile", "Discarding 'mdat' data, not transferring it to the mdat box stream");
      return;
    }
    if (!mdat) {
      Log.warn("ISOFile", "Cannot transfer 'mdat' data, no mdat box is being parsed");
      return;
    }
    const startBufferIndex = this.stream.findPosition(true, mdat.start + mdat.hdr_size, false);
    const endBufferIndex = this.stream.findPosition(true, mdat.start + mdat.size, false);
    if (startBufferIndex === -1 || endBufferIndex === -1) {
      Log.warn("ISOFile", "Cannot transfer 'mdat' data, start or end buffer not found");
      return;
    }
    mdat.stream = new MultiBufferStream();
    for (let i = startBufferIndex; i <= endBufferIndex; i++) {
      const buffer = this.stream.buffers[i];
      const startOffset = i === startBufferIndex ? mdat.start + mdat.hdr_size - buffer.fileStart : 0;
      const endOffset = i === endBufferIndex ? mdat.start + mdat.size - buffer.fileStart : buffer.byteLength;
      if (endOffset > startOffset) {
        Log.debug(
          "ISOFile",
          "Transferring 'mdat' data from buffer #" + i + " (" + startOffset + " to " + endOffset + ")"
        );
        const transferSize = endOffset - startOffset;
        const newBuffer = new MP4BoxBuffer(transferSize);
        const lastPosition = mdat.stream.getAbsoluteEndPosition();
        DataStream.memcpy(newBuffer, 0, buffer, startOffset, transferSize);
        newBuffer.fileStart = lastPosition;
        mdat.stream.insertBuffer(newBuffer);
        buffer.usedBytes += transferSize;
      }
    }
  }
  /** @bundle isofile-advanced-parsing.js */
  processIncompleteMdat() {
    const box = this.parsingMdat;
    const found = this.stream.seek(box.start + box.size, false, this.discardMdatData);
    if (found) {
      Log.debug("ISOFile", "Found 'mdat' end in buffered data");
      this.transferMdatData();
      this.parsingMdat = void 0;
      return true;
    } else {
      this.nextParsePosition = this.stream.findEndContiguousBuf();
      return false;
    }
  }
  /** @bundle isofile-advanced-parsing.js */
  restoreParsePosition() {
    return this.stream.seek(this.lastBoxStartPosition, true, this.discardMdatData);
  }
  /** @bundle isofile-advanced-parsing.js */
  saveParsePosition() {
    this.lastBoxStartPosition = this.stream.getPosition();
  }
  /** @bundle isofile-advanced-parsing.js */
  updateUsedBytes(box, _ret) {
    if (this.stream.addUsedBytes) {
      if (box.type === "mdat") {
        this.stream.addUsedBytes(box.hdr_size);
        if (this.discardMdatData) {
          this.stream.addUsedBytes(box.size - box.hdr_size);
        }
      } else {
        this.stream.addUsedBytes(box.size);
      }
    }
  }
  /** @bundle isofile-advanced-creation.js */
  addBox(box) {
    return Box.prototype.addBox.call(this, box);
  }
  /** @bundle isofile-advanced-creation.js */
  init(options = {}) {
    const ftyp = this.addBox(new ftypBox());
    ftyp.major_brand = options.brands && options.brands[0] || "iso4";
    ftyp.minor_version = 0;
    ftyp.compatible_brands = options.brands || ["iso4"];
    const moov = this.addBox(new moovBox());
    moov.addBox(new mvexBox());
    const mvhd = moov.addBox(new mvhdBox());
    mvhd.timescale = options.timescale || 600;
    mvhd.rate = options.rate || 1 << 16;
    mvhd.creation_time = 0;
    mvhd.modification_time = 0;
    mvhd.duration = options.duration || 0;
    mvhd.volume = options.width ? 0 : 256;
    mvhd.matrix = [1 << 16, 0, 0, 0, 1 << 16, 0, 0, 0, 1073741824];
    mvhd.next_track_id = 1;
    return this;
  }
  /** @bundle isofile-advanced-creation.js */
  addTrack(_options = {}) {
    if (!this.moov) {
      this.init(_options);
    }
    const options = _options || {};
    options.width = options.width || 320;
    options.height = options.height || 320;
    options.id = options.id || this.moov.mvhd.next_track_id;
    options.type = options.type || "avc1";
    const trak = this.moov.addBox(new trakBox());
    this.moov.mvhd.next_track_id = options.id + 1;
    const tkhd = trak.addBox(new tkhdBox());
    tkhd.flags = TKHD_FLAG_ENABLED | TKHD_FLAG_IN_MOVIE | TKHD_FLAG_IN_PREVIEW;
    tkhd.creation_time = 0;
    tkhd.modification_time = 0;
    tkhd.track_id = options.id;
    tkhd.duration = options.duration || 0;
    tkhd.layer = options.layer || 0;
    tkhd.alternate_group = 0;
    tkhd.volume = 1;
    tkhd.matrix = [1 << 16, 0, 0, 0, 1 << 16, 0, 0, 0, 1073741824];
    tkhd.width = options.width << 16;
    tkhd.height = options.height << 16;
    const mdia = trak.addBox(new mdiaBox());
    const mdhd = mdia.addBox(new mdhdBox());
    mdhd.creation_time = 0;
    mdhd.modification_time = 0;
    mdhd.timescale = options.timescale || 1;
    mdhd.duration = options.media_duration || 0;
    mdhd.language = options.language || "und";
    const hdlr = mdia.addBox(new hdlrBox());
    hdlr.handler = options.hdlr || "vide";
    hdlr.name = options.name || "Track created with MP4Box.js";
    const elng = mdia.addBox(new elngBox());
    elng.extended_language = options.language || "fr-FR";
    const minf = mdia.addBox(new minfBox());
    const sampleEntry = BoxRegistry.sampleEntry[options.type];
    if (!sampleEntry) return;
    const sample_description_entry = new sampleEntry();
    sample_description_entry.data_reference_index = 1;
    if (sample_description_entry instanceof VisualSampleEntry) {
      const sde = sample_description_entry;
      const vmhd = minf.addBox(new vmhdBox());
      vmhd.graphicsmode = 0;
      vmhd.opcolor = [0, 0, 0];
      sde.width = options.width;
      sde.height = options.height;
      sde.horizresolution = 72 << 16;
      sde.vertresolution = 72 << 16;
      sde.frame_count = 1;
      sde.compressorname = options.type + " Compressor";
      sde.depth = 24;
      if (options.avcDecoderConfigRecord) {
        const avcC = sde.addBox(new avcCBox(options.avcDecoderConfigRecord.byteLength));
        avcC.parse(new DataStream(options.avcDecoderConfigRecord));
      } else if (options.hevcDecoderConfigRecord) {
        const hvcC = sde.addBox(new hvcCBox(options.hevcDecoderConfigRecord.byteLength));
        hvcC.parse(new DataStream(options.hevcDecoderConfigRecord));
      }
    } else if (sample_description_entry instanceof AudioSampleEntry) {
      const sde = sample_description_entry;
      const smhd = minf.addBox(new smhdBox());
      smhd.balance = options.balance || 0;
      sde.channel_count = options.channel_count || 2;
      sde.samplesize = options.samplesize || 16;
      sde.samplerate = options.samplerate || 1 << 16;
    } else if (sample_description_entry instanceof HintSampleEntry) {
      minf.addBox(new hmhdBox());
    } else if (sample_description_entry instanceof SubtitleSampleEntry) {
      minf.addBox(new sthdBox());
      if (sample_description_entry instanceof stppSampleEntry) {
        sample_description_entry.namespace = options.namespace || "nonamespace";
        sample_description_entry.schema_location = options.schema_location || "";
        sample_description_entry.auxiliary_mime_types = options.auxiliary_mime_types || "";
      }
    } else if (sample_description_entry instanceof MetadataSampleEntry) {
      minf.addBox(new nmhdBox());
    } else if (sample_description_entry instanceof SystemSampleEntry) {
      minf.addBox(new nmhdBox());
    } else {
      minf.addBox(new nmhdBox());
    }
    if (options.description) {
      sample_description_entry.addBox.call(
        sample_description_entry,
        options.description
      );
    }
    if (options.description_boxes) {
      options.description_boxes.forEach(function(b) {
        sample_description_entry.addBox.call(sample_description_entry, b);
      });
    }
    const dinf = minf.addBox(new dinfBox());
    const dref = dinf.addBox(new drefBox());
    const url = new urlBox();
    url.flags = 1;
    dref.addEntry(url);
    const stbl = minf.addBox(new stblBox());
    const stsd = stbl.addBox(new stsdBox());
    stsd.addEntry(sample_description_entry);
    const stts = stbl.addBox(new sttsBox());
    stts.sample_counts = [];
    stts.sample_deltas = [];
    const stsc = stbl.addBox(new stscBox());
    stsc.first_chunk = [];
    stsc.samples_per_chunk = [];
    stsc.sample_description_index = [];
    const stco = stbl.addBox(new stcoBox());
    stco.chunk_offsets = [];
    const stsz = stbl.addBox(new stszBox());
    stsz.sample_sizes = [];
    const trex = this.moov.mvex.addBox(new trexBox());
    trex.track_id = options.id;
    trex.default_sample_description_index = options.default_sample_description_index || 1;
    trex.default_sample_duration = options.default_sample_duration || 0;
    trex.default_sample_size = options.default_sample_size || 0;
    trex.default_sample_flags = options.default_sample_flags || 0;
    this.buildTrakSampleLists(trak);
    return options.id;
  }
  /** @bundle isofile-advanced-creation.js */
  addSample(track_id, data, {
    sample_description_index,
    duration = 1,
    cts = 0,
    dts = 0,
    is_sync = false,
    is_leading = 0,
    depends_on = 0,
    is_depended_on = 0,
    has_redundancy = 0,
    degradation_priority = 0,
    subsamples,
    offset = 0
  } = {}) {
    const trak = this.getTrackById(track_id);
    if (trak === void 0) return;
    const descriptionIndex = sample_description_index ? sample_description_index - 1 : 0;
    const sample = {
      number: trak.samples.length,
      track_id: trak.tkhd.track_id,
      timescale: trak.mdia.mdhd.timescale,
      description_index: descriptionIndex,
      description: trak.mdia.minf.stbl.stsd.entries[descriptionIndex],
      data,
      size: data.byteLength,
      alreadyRead: data.byteLength,
      duration,
      cts,
      dts,
      is_sync,
      is_leading,
      depends_on,
      is_depended_on,
      has_redundancy,
      degradation_priority,
      offset,
      subsamples
    };
    trak.samples.push(sample);
    trak.samples_size += sample.size;
    trak.samples_duration += sample.duration;
    if (trak.first_dts === void 0) {
      trak.first_dts = dts;
    }
    this.processSamples();
    const moof = this.addBox(this.createMoof([sample]));
    moof.computeSize();
    moof.trafs[0].truns[0].data_offset = moof.size + 8;
    const mdat = this.addBox(new mdatBox());
    mdat.data = new Uint8Array(data);
    return sample;
  }
  /** @bundle isofile-advanced-creation.js */
  createMoof(samples) {
    if (samples.length === 0) return;
    if (samples.some((s) => s.track_id !== samples[0].track_id)) {
      throw new Error(
        "Cannot create moof for samples from different tracks: " + samples.map((s) => s.track_id).join(", ")
      );
    }
    const trackId = samples[0].track_id;
    const trak = this.getTrackById(trackId);
    if (!trak) {
      throw new Error("Cannot create moof for non-existing track: " + trackId);
    }
    const moof = new moofBox();
    const mfhd = moof.addBox(new mfhdBox());
    mfhd.sequence_number = ++this.nextMoofNumber;
    const traf = moof.addBox(new trafBox());
    const tfhd = traf.addBox(new tfhdBox());
    tfhd.track_id = trackId;
    tfhd.flags = TFHD_FLAG_DEFAULT_BASE_IS_MOOF;
    const tfdt = traf.addBox(new tfdtBox());
    tfdt.baseMediaDecodeTime = samples[0].dts - (trak.first_dts || 0);
    const trun = traf.addBox(new trunBox());
    trun.flags = TRUN_FLAGS_DATA_OFFSET | TRUN_FLAGS_DURATION | TRUN_FLAGS_SIZE | TRUN_FLAGS_FLAGS | TRUN_FLAGS_CTS_OFFSET;
    trun.data_offset = 0;
    trun.first_sample_flags = 0;
    trun.sample_count = samples.length;
    for (const sample of samples) {
      let sample_flags = 0;
      if (sample.is_sync)
        sample_flags = 1 << 25;
      else sample_flags = 1 << 16;
      trun.sample_duration.push(sample.duration);
      trun.sample_size.push(sample.size);
      trun.sample_flags.push(sample_flags);
      trun.sample_composition_time_offset.push(sample.cts - sample.dts);
    }
    return moof;
  }
  /** @bundle box-print.js */
  print(output) {
    output.indent = "";
    for (let i = 0; i < this.boxes.length; i++) {
      if (this.boxes[i]) {
        this.boxes[i].print(output);
      }
    }
  }
};
function createFile(keepMdatData = false, stream) {
  const file = new ISOFile(stream, !keepMdatData);
  return file;
}
var descriptor_exports = {};
__export(descriptor_exports, {
  Descriptor: () => Descriptor,
  ES_Descriptor: () => ES_Descriptor,
  MPEG4DescriptorParser: () => MPEG4DescriptorParser
});
var ES_DescrTag = 3;
var DecoderConfigDescrTag = 4;
var DecSpecificInfoTag = 5;
var SLConfigDescrTag = 6;
var Descriptor = class _Descriptor {
  constructor(tag, size) {
    this.tag = tag;
    this.size = size;
    this.descs = [];
  }
  parse(stream) {
    this.data = stream.readUint8Array(this.size);
  }
  findDescriptor(tag) {
    for (let i = 0; i < this.descs.length; i++) {
      if (this.descs[i].tag === tag) {
        return this.descs[i];
      }
    }
  }
  parseOneDescriptor(stream) {
    let size = 0;
    const tag = stream.readUint8();
    let byteRead = stream.readUint8();
    while (byteRead & 128) {
      size = (size << 7) + (byteRead & 127);
      byteRead = stream.readUint8();
    }
    size = (size << 7) + (byteRead & 127);
    Log.debug(
      "Descriptor",
      "Found " + (descTagToName[tag] || "Descriptor " + tag) + ", size " + size + " at position " + stream.getPosition()
    );
    const desc = descTagToName[tag] ? new DESCRIPTOR_CLASSES[descTagToName[tag]](size) : (
      // @ts-expect-error FIXME: Descriptor expects a tag as first parameter
      new _Descriptor(size)
    );
    desc.parse(stream);
    return desc;
  }
  parseRemainingDescriptors(stream) {
    const start2 = stream.getPosition();
    while (stream.getPosition() < start2 + this.size) {
      const desc = this.parseOneDescriptor?.(stream);
      this.descs.push(desc);
    }
  }
};
var ES_Descriptor = class extends Descriptor {
  constructor(size) {
    super(ES_DescrTag, size);
  }
  parse(stream) {
    this.ES_ID = stream.readUint16();
    this.flags = stream.readUint8();
    this.size -= 3;
    if (this.flags & 128) {
      this.dependsOn_ES_ID = stream.readUint16();
      this.size -= 2;
    } else {
      this.dependsOn_ES_ID = 0;
    }
    if (this.flags & 64) {
      const l = stream.readUint8();
      this.URL = stream.readString(l);
      this.size -= l + 1;
    } else {
      this.URL = "";
    }
    if (this.flags & 32) {
      this.OCR_ES_ID = stream.readUint16();
      this.size -= 2;
    } else {
      this.OCR_ES_ID = 0;
    }
    this.parseRemainingDescriptors(stream);
  }
  getOTI() {
    const dcd = this.findDescriptor(DecoderConfigDescrTag);
    if (dcd) {
      return dcd.oti;
    } else {
      return 0;
    }
  }
  getAudioConfig() {
    const dcd = this.findDescriptor(DecoderConfigDescrTag);
    if (!dcd) return;
    const dsi = dcd.findDescriptor(DecSpecificInfoTag);
    if (dsi && dsi.data) {
      let audioObjectType = (dsi.data[0] & 248) >> 3;
      if (audioObjectType === 31 && dsi.data.length >= 2) {
        audioObjectType = 32 + ((dsi.data[0] & 7) << 3) + ((dsi.data[1] & 224) >> 5);
      }
      return audioObjectType;
    }
  }
};
var DecoderConfigDescriptor = class extends Descriptor {
  constructor(size) {
    super(DecoderConfigDescrTag, size);
  }
  parse(stream) {
    this.oti = stream.readUint8();
    this.streamType = stream.readUint8();
    this.upStream = (this.streamType >> 1 & 1) !== 0;
    this.streamType = this.streamType >>> 2;
    this.bufferSize = stream.readUint24();
    this.maxBitrate = stream.readUint32();
    this.avgBitrate = stream.readUint32();
    this.size -= 13;
    this.parseRemainingDescriptors(stream);
  }
};
var DecoderSpecificInfo = class extends Descriptor {
  constructor(size) {
    super(DecSpecificInfoTag, size);
  }
};
var SLConfigDescriptor = class extends Descriptor {
  constructor(size) {
    super(SLConfigDescrTag, size);
  }
};
var DESCRIPTOR_CLASSES = {
  Descriptor,
  ES_Descriptor,
  DecoderConfigDescriptor,
  DecoderSpecificInfo,
  SLConfigDescriptor
};
var descTagToName = {
  [ES_DescrTag]: "ES_Descriptor",
  [DecoderConfigDescrTag]: "DecoderConfigDescriptor",
  [DecSpecificInfoTag]: "DecoderSpecificInfo",
  [SLConfigDescrTag]: "SLConfigDescriptor"
};
var MPEG4DescriptorParser = class {
  constructor() {
    this.parseOneDescriptor = Descriptor.prototype.parseOneDescriptor;
  }
  getDescriptorName(tag) {
    return descTagToName[tag];
  }
};
var all_boxes_exports = {};
__export(all_boxes_exports, {
  CoLLBox: () => CoLLBox,
  ItemContentIDPropertyBox: () => ItemContentIDPropertyBox,
  OpusSampleEntry: () => OpusSampleEntry,
  SmDmBox: () => SmDmBox,
  a1lxBox: () => a1lxBox,
  a1opBox: () => a1opBox,
  ac_3SampleEntry: () => ac_3SampleEntry,
  ac_4SampleEntry: () => ac_4SampleEntry,
  aebrBox: () => aebrBox,
  afbrBox: () => afbrBox,
  albcBox: () => albcBox,
  alstSampleGroupEntry: () => alstSampleGroupEntry,
  altrBox: () => altrBox,
  auxCBox: () => auxCBox,
  av01SampleEntry: () => av01SampleEntry,
  av1CBox: () => av1CBox,
  avc1SampleEntry: () => avc1SampleEntry,
  avc2SampleEntry: () => avc2SampleEntry,
  avc3SampleEntry: () => avc3SampleEntry,
  avc4SampleEntry: () => avc4SampleEntry,
  avcCBox: () => avcCBox,
  avllSampleGroupEntry: () => avllSampleGroupEntry,
  avs3SampleEntry: () => avs3SampleEntry,
  avssSampleGroupEntry: () => avssSampleGroupEntry,
  brstBox: () => brstBox,
  btrtBox: () => btrtBox,
  bxmlBox: () => bxmlBox,
  ccstBox: () => ccstBox,
  cdefBox: () => cdefBox,
  clapBox: () => clapBox,
  clefBox: () => clefBox,
  clliBox: () => clliBox,
  cmexBox: () => cmexBox,
  cminBox: () => cminBox,
  cmpdBox: () => cmpdBox,
  co64Box: () => co64Box,
  colrBox: () => colrBox,
  coviBox: () => coviBox,
  cprtBox: () => cprtBox,
  cschBox: () => cschBox,
  cslgBox: () => cslgBox,
  cttsBox: () => cttsBox,
  dOpsBox: () => dOpsBox,
  dac3Box: () => dac3Box,
  dataBox: () => dataBox,
  dav1SampleEntry: () => dav1SampleEntry,
  dec3Box: () => dec3Box,
  dfLaBox: () => dfLaBox,
  dimmBox: () => dimmBox,
  dinfBox: () => dinfBox,
  dmax: () => dmax,
  dmedBox: () => dmedBox,
  dobrBox: () => dobrBox,
  drefBox: () => drefBox,
  drepBox: () => drepBox,
  dtrtSampleGroupEntry: () => dtrtSampleGroupEntry,
  dvh1SampleEntry: () => dvh1SampleEntry,
  dvheSampleEntry: () => dvheSampleEntry,
  ec_3SampleEntry: () => ec_3SampleEntry,
  edtsBox: () => edtsBox,
  elngBox: () => elngBox,
  elstBox: () => elstBox,
  emsgBox: () => emsgBox,
  encaSampleEntry: () => encaSampleEntry,
  encmSampleEntry: () => encmSampleEntry,
  encsSampleEntry: () => encsSampleEntry,
  enctSampleEntry: () => enctSampleEntry,
  encuSampleEntry: () => encuSampleEntry,
  encvSampleEntry: () => encvSampleEntry,
  enofBox: () => enofBox,
  eqivBox: () => eqivBox,
  esdsBox: () => esdsBox,
  etypBox: () => etypBox,
  fLaCSampleEntry: () => fLaCSampleEntry,
  favcBox: () => favcBox,
  fielBox: () => fielBox,
  fobrBox: () => fobrBox,
  freeBox: () => freeBox,
  frmaBox: () => frmaBox,
  ftypBox: () => ftypBox,
  grplBox: () => grplBox,
  hdlrBox: () => hdlrBox,
  hev1SampleEntry: () => hev1SampleEntry,
  hev2SampleEntry: () => hev2SampleEntry,
  hinfBox: () => hinfBox,
  hmhdBox: () => hmhdBox,
  hntiBox: () => hntiBox,
  hvc1SampleEntry: () => hvc1SampleEntry,
  hvc2SampleEntry: () => hvc2SampleEntry,
  hvcCBox: () => hvcCBox,
  hvt1SampleEntry: () => hvt1SampleEntry,
  iaugBox: () => iaugBox,
  idatBox: () => idatBox,
  iinfBox: () => iinfBox,
  ilocBox: () => ilocBox,
  ilstBox: () => ilstBox,
  imirBox: () => imirBox,
  infeBox: () => infeBox,
  iodsBox: () => iodsBox,
  ipcoBox: () => ipcoBox,
  ipmaBox: () => ipmaBox,
  iproBox: () => iproBox,
  iprpBox: () => iprpBox,
  irefBox: () => irefBox,
  irotBox: () => irotBox,
  ispeBox: () => ispeBox,
  itaiBox: () => itaiBox,
  j2kHBox: () => j2kHBox,
  j2kiSampleEntry: () => j2kiSampleEntry,
  keysBox: () => keysBox,
  kindBox: () => kindBox,
  levaBox: () => levaBox,
  lhe1SampleEntry: () => lhe1SampleEntry,
  lhv1SampleEntry: () => lhv1SampleEntry,
  lhvCBox: () => lhvCBox,
  lselBox: () => lselBox,
  m4aeSampleEntry: () => m4aeSampleEntry,
  maxrBox: () => maxrBox,
  mdatBox: () => mdatBox,
  mdcvBox: () => mdcvBox,
  mdhdBox: () => mdhdBox,
  mdiaBox: () => mdiaBox,
  mecoBox: () => mecoBox,
  mehdBox: () => mehdBox,
  metaBox: () => metaBox,
  mettSampleEntry: () => mettSampleEntry,
  metxSampleEntry: () => metxSampleEntry,
  mfhdBox: () => mfhdBox,
  mfraBox: () => mfraBox,
  mfroBox: () => mfroBox,
  mha1SampleEntry: () => mha1SampleEntry,
  mha2SampleEntry: () => mha2SampleEntry,
  mhm1SampleEntry: () => mhm1SampleEntry,
  mhm2SampleEntry: () => mhm2SampleEntry,
  minfBox: () => minfBox,
  mjp2SampleEntry: () => mjp2SampleEntry,
  mjpgSampleEntry: () => mjpgSampleEntry,
  moofBox: () => moofBox,
  moovBox: () => moovBox,
  mp4aSampleEntry: () => mp4aSampleEntry,
  mp4sSampleEntry: () => mp4sSampleEntry,
  mp4vSampleEntry: () => mp4vSampleEntry,
  mskCBox: () => mskCBox,
  msrcTrackGroupTypeBox: () => msrcTrackGroupTypeBox,
  mvexBox: () => mvexBox,
  mvhdBox: () => mvhdBox,
  mvifSampleGroupEntry: () => mvifSampleGroupEntry,
  nmhdBox: () => nmhdBox,
  npckBox: () => npckBox,
  numpBox: () => numpBox,
  padbBox: () => padbBox,
  panoBox: () => panoBox,
  paspBox: () => paspBox,
  paylBox: () => paylBox,
  paytBox: () => paytBox,
  pdinBox: () => pdinBox,
  piffLsmBox: () => piffLsmBox,
  piffPsshBox: () => piffPsshBox,
  piffSencBox: () => piffSencBox,
  piffTencBox: () => piffTencBox,
  piffTfrfBox: () => piffTfrfBox,
  piffTfxdBox: () => piffTfxdBox,
  pitmBox: () => pitmBox,
  pixiBox: () => pixiBox,
  pmaxBox: () => pmaxBox,
  povdBox: () => povdBox,
  prdiBox: () => prdiBox,
  prfrBox: () => prfrBox,
  prftBox: () => prftBox,
  prgrBox: () => prgrBox,
  profBox: () => profBox,
  prolSampleGroupEntry: () => prolSampleGroupEntry,
  psshBox: () => psshBox,
  pymdBox: () => pymdBox,
  rapSampleGroupEntry: () => rapSampleGroupEntry,
  rashSampleGroupEntry: () => rashSampleGroupEntry,
  resvSampleEntry: () => resvSampleEntry,
  rinfBox: () => rinfBox,
  rollSampleGroupEntry: () => rollSampleGroupEntry,
  rtp_Box: () => rtp_Box,
  saioBox: () => saioBox,
  saizBox: () => saizBox,
  sbgpBox: () => sbgpBox,
  sbpmBox: () => sbpmBox,
  sbttSampleEntry: () => sbttSampleEntry,
  schiBox: () => schiBox,
  schmBox: () => schmBox,
  scifSampleGroupEntry: () => scifSampleGroupEntry,
  scnmSampleGroupEntry: () => scnmSampleGroupEntry,
  sdp_Box: () => sdp_Box,
  sdtpBox: () => sdtpBox,
  seigSampleGroupEntry: () => seigSampleGroupEntry,
  sencBox: () => sencBox,
  sgpdBox: () => sgpdBox,
  sidxBox: () => sidxBox,
  sinfBox: () => sinfBox,
  skipBox: () => skipBox,
  slidBox: () => slidBox,
  smhdBox: () => smhdBox,
  sratBox: () => sratBox,
  ssixBox: () => ssixBox,
  stblBox: () => stblBox,
  stcoBox: () => stcoBox,
  stdpBox: () => stdpBox,
  sterBox: () => sterBox,
  sthdBox: () => sthdBox,
  stppSampleEntry: () => stppSampleEntry,
  strdBox: () => strdBox,
  striBox: () => striBox,
  strkBox: () => strkBox,
  stsaSampleGroupEntry: () => stsaSampleGroupEntry,
  stscBox: () => stscBox,
  stsdBox: () => stsdBox,
  stsgBox: () => stsgBox,
  stshBox: () => stshBox,
  stssBox: () => stssBox,
  stszBox: () => stszBox,
  sttsBox: () => sttsBox,
  stviBox: () => stviBox,
  stxtSampleEntry: () => stxtSampleEntry,
  stypBox: () => stypBox,
  stz2Box: () => stz2Box,
  subsBox: () => subsBox,
  syncSampleGroupEntry: () => syncSampleGroupEntry,
  taicBox: () => taicBox,
  taptBox: () => taptBox,
  teleSampleGroupEntry: () => teleSampleGroupEntry,
  tencBox: () => tencBox,
  tfdtBox: () => tfdtBox,
  tfhdBox: () => tfhdBox,
  tfraBox: () => tfraBox,
  tkhdBox: () => tkhdBox,
  tmaxBox: () => tmaxBox,
  tminBox: () => tminBox,
  totlBox: () => totlBox,
  tpayBox: () => tpayBox,
  tpylBox: () => tpylBox,
  trafBox: () => trafBox,
  trakBox: () => trakBox,
  trefBox: () => trefBox,
  trepBox: () => trepBox,
  trexBox: () => trexBox,
  trgrBox: () => trgrBox,
  trpyBox: () => trpyBox,
  trunBox: () => trunBox,
  tsasSampleGroupEntry: () => tsasSampleGroupEntry,
  tsclSampleGroupEntry: () => tsclSampleGroupEntry,
  tselBox: () => tselBox,
  tsynBox: () => tsynBox,
  tx3gSampleEntry: () => tx3gSampleEntry,
  txtcBox: () => txtcBox,
  tycoBox: () => tycoBox,
  udesBox: () => udesBox,
  udtaBox: () => udtaBox,
  uncCBox: () => uncCBox,
  uncvSampleEntry: () => uncvSampleEntry,
  urlBox: () => urlBox,
  urnBox: () => urnBox,
  viprSampleGroupEntry: () => viprSampleGroupEntry,
  vmhdBox: () => vmhdBox,
  vp08SampleEntry: () => vp08SampleEntry,
  vp09SampleEntry: () => vp09SampleEntry,
  vpcCBox: () => vpcCBox,
  vttCBox: () => vttCBox,
  vttcBox: () => vttcBox,
  vvc1SampleEntry: () => vvc1SampleEntry,
  vvcCBox: () => vvcCBox,
  vvcNSampleEntry: () => vvcNSampleEntry,
  vvi1SampleEntry: () => vvi1SampleEntry,
  vvnCBox: () => vvnCBox,
  vvs1SampleEntry: () => vvs1SampleEntry,
  waveBox: () => waveBox,
  wbbrBox: () => wbbrBox,
  wvttSampleEntry: () => wvttSampleEntry,
  xmlBox: () => xmlBox
});
var a1lxBox = (_Ab = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "AV1LayeredImageIndexingProperty";
  }
  parse(stream) {
    const large_size = stream.readUint8() & 1;
    const FieldLength = ((large_size & 1) + 1) * 16;
    this.layer_size = [];
    for (let i = 0; i < 3; i++) {
      if (FieldLength === 16) {
        this.layer_size[i] = stream.readUint16();
      } else {
        this.layer_size[i] = stream.readUint32();
      }
    }
  }
}, _Ab.fourcc = "a1lx", _Ab);
var a1opBox = (_Bb = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "OperatingPointSelectorProperty";
  }
  parse(stream) {
    this.op_index = stream.readUint8();
  }
}, _Bb.fourcc = "a1op", _Bb);
var auxCBox = (_Cb = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "AuxiliaryTypeProperty";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.aux_type = stream.readCString();
    const aux_subtype_length = this.size - this.hdr_size - (this.aux_type.length + 1);
    this.aux_subtype = stream.readUint8Array(aux_subtype_length);
  }
}, _Cb.fourcc = "auxC", _Cb);
var btrtBox = (_Db = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "BitRateBox";
  }
  parse(stream) {
    this.bufferSizeDB = stream.readUint32();
    this.maxBitrate = stream.readUint32();
    this.avgBitrate = stream.readUint32();
  }
}, _Db.fourcc = "btrt", _Db);
var ccstBox = (_Eb = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "CodingConstraintsBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    const flags = stream.readUint8();
    this.all_ref_pics_intra = (flags & 128) === 128;
    this.intra_pred_used = (flags & 64) === 64;
    this.max_ref_per_pic = (flags & 63) >> 2;
    stream.readUint24();
  }
}, _Eb.fourcc = "ccst", _Eb);
var cdefBox = (_Fb = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "ComponentDefinitionBox";
  }
  parse(stream) {
    this.channel_count = stream.readUint16();
    this.channel_indexes = [];
    this.channel_types = [];
    this.channel_associations = [];
    for (let i = 0; i < this.channel_count; i++) {
      this.channel_indexes.push(stream.readUint16());
      this.channel_types.push(stream.readUint16());
      this.channel_associations.push(stream.readUint16());
    }
  }
}, _Fb.fourcc = "cdef", _Fb);
var clapBox = (_Gb = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "CleanApertureBox";
  }
  parse(stream) {
    this.cleanApertureWidthN = stream.readUint32();
    this.cleanApertureWidthD = stream.readUint32();
    this.cleanApertureHeightN = stream.readUint32();
    this.cleanApertureHeightD = stream.readUint32();
    this.horizOffN = stream.readUint32();
    this.horizOffD = stream.readUint32();
    this.vertOffN = stream.readUint32();
    this.vertOffD = stream.readUint32();
  }
}, _Gb.fourcc = "clap", _Gb);
var clliBox = (_Hb = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "ContentLightLevelBox";
  }
  parse(stream) {
    this.max_content_light_level = stream.readUint16();
    this.max_pic_average_light_level = stream.readUint16();
  }
}, _Hb.fourcc = "clli", _Hb);
var cmexBox = (_Ib = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "CameraExtrinsicMatrixProperty";
  }
  parse(stream) {
    if (this.flags & 1) {
      this.pos_x = stream.readInt32();
    }
    if (this.flags & 2) {
      this.pos_y = stream.readInt32();
    }
    if (this.flags & 4) {
      this.pos_z = stream.readInt32();
    }
    if (this.flags & 8) {
      if (this.version === 0) {
        if (this.flags & 16) {
          this.quat_x = stream.readInt32();
          this.quat_y = stream.readInt32();
          this.quat_z = stream.readInt32();
        } else {
          this.quat_x = stream.readInt16();
          this.quat_y = stream.readInt16();
          this.quat_z = stream.readInt16();
        }
      } else if (this.version === 1) ;
    }
    if (this.flags & 32) {
      this.id = stream.readUint32();
    }
  }
}, _Ib.fourcc = "cmex", _Ib);
var cminBox = (_Jb = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "CameraIntrinsicMatrixProperty";
  }
  parse(stream) {
    this.focal_length_x = stream.readInt32();
    this.principal_point_x = stream.readInt32();
    this.principal_point_y = stream.readInt32();
    if (this.flags & 1) {
      this.focal_length_y = stream.readInt32();
      this.skew_factor = stream.readInt32();
    }
  }
}, _Jb.fourcc = "cmin", _Jb);
var cmpdBox = (_Kb = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "ComponentDefinitionBox";
  }
  parse(stream) {
    this.component_count = stream.readUint32();
    this.component_types = [];
    this.component_type_urls = [];
    for (let i = 0; i < this.component_count; i++) {
      const component_type = stream.readUint16();
      this.component_types.push(component_type);
      if (component_type >= 32768) {
        this.component_type_urls.push(stream.readCString());
      }
    }
  }
}, _Kb.fourcc = "cmpd", _Kb);
var co64Box = (_Lb = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "ChunkLargeOffsetBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    const entry_count = stream.readUint32();
    this.chunk_offsets = [];
    if (this.version === 0) {
      for (let i = 0; i < entry_count; i++) {
        this.chunk_offsets.push(stream.readUint64());
      }
    }
  }
  /** @bundle writing/co64.js */
  write(stream) {
    this.version = 0;
    this.flags = 0;
    this.size = 4 + 8 * this.chunk_offsets.length;
    this.writeHeader(stream);
    stream.writeUint32(this.chunk_offsets.length);
    for (let i = 0; i < this.chunk_offsets.length; i++) {
      stream.writeUint64(this.chunk_offsets[i]);
    }
  }
}, _Lb.fourcc = "co64", _Lb);
var CoLLBox = (_Mb = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "ContentLightLevelBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.maxCLL = stream.readUint16();
    this.maxFALL = stream.readUint16();
  }
}, _Mb.fourcc = "CoLL", _Mb);
var SphereRegion = class {
  toString() {
    let s = "centre_azimuth: ";
    s += this.centre_azimuth;
    s += " (";
    s += this.centre_azimuth * 2 ** -16;
    s += "°), centre_elevation: ";
    s += this.centre_elevation;
    s += " (";
    s += this.centre_elevation * 2 ** -16;
    s += "°), centre_tilt: ";
    s += this.centre_tilt;
    s += " (";
    s += this.centre_tilt * 2 ** -16;
    s += "°)";
    if (this.range_included_flag) {
      s += ", azimuth_range: ";
      s += this.azimuth_range;
      s += " (";
      s += this.azimuth_range * 2 ** -16;
      s += "°), elevation_range: ";
      s += this.elevation_range;
      s += " (";
      s += this.elevation_range * 2 ** -16;
      s += "°)";
    }
    if (this.interpolate_included_flag) {
      s += ", interpolate: ";
      s += this.interpolate;
    }
    return s;
  }
};
var CoverageSphereRegion = class {
  toString() {
    let s = "";
    if (this.view_idc) {
      s += "view_idc: ";
      s += this.view_idc;
      s += ", ";
    }
    s += "sphere_region: {";
    s += this.sphere_region;
    s += "}";
    return s;
  }
};
var coviBox = (_Nb = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "CoverageInformationBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.coverage_shape_type = stream.readUint8();
    const num_regions = stream.readUint8();
    const f = stream.readInt8();
    const view_idc_presence_flag = f & 128;
    if (view_idc_presence_flag) {
      this.default_view_idc = (f & 96) >> 5;
    }
    this.coverage_regions = new Array();
    for (let i = 0; i < num_regions; i++) {
      const region = new CoverageSphereRegion();
      if (view_idc_presence_flag) {
        region.view_idc = stream.readUint8() >> 6;
      }
      region.sphere_region = this.parseSphereRegion(stream, true, true);
      this.coverage_regions.push(region);
    }
  }
  parseSphereRegion(stream, range_included_flag, interpolate_included_flag) {
    const sphere_region = new SphereRegion();
    sphere_region.centre_azimuth = stream.readInt32();
    sphere_region.centre_elevation = stream.readInt32();
    sphere_region.centre_tilt = stream.readInt32();
    sphere_region.range_included_flag = range_included_flag;
    if (range_included_flag) {
      sphere_region.azimuth_range = stream.readUint32();
      sphere_region.elevation_range = stream.readUint32();
    }
    sphere_region.interpolate_included_flag = interpolate_included_flag;
    if (interpolate_included_flag) {
      sphere_region.interpolate = (stream.readUint8() & 128) === 128;
    }
    return sphere_region;
  }
}, _Nb.fourcc = "covi", _Nb);
var cprtBox = (_Ob = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "CopyrightBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.parseLanguage(stream);
    this.notice = stream.readCString();
  }
}, _Ob.fourcc = "cprt", _Ob);
var cschBox = (_Pb = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "CompatibleSchemeTypeBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.scheme_type = stream.readString(4);
    this.scheme_version = stream.readUint32();
    if (this.flags & 1) {
      this.scheme_uri = stream.readCString();
    }
  }
}, _Pb.fourcc = "csch", _Pb);
var INT32_MAX = 2147483647;
var cslgBox = (_Qb = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "CompositionToDecodeBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    if (this.version === 0) {
      this.compositionToDTSShift = stream.readInt32();
      this.leastDecodeToDisplayDelta = stream.readInt32();
      this.greatestDecodeToDisplayDelta = stream.readInt32();
      this.compositionStartTime = stream.readInt32();
      this.compositionEndTime = stream.readInt32();
    } else if (this.version === 1) {
      this.compositionToDTSShift = stream.readInt64();
      this.leastDecodeToDisplayDelta = stream.readInt64();
      this.greatestDecodeToDisplayDelta = stream.readInt64();
      this.compositionStartTime = stream.readInt64();
      this.compositionEndTime = stream.readInt64();
    }
  }
  /** @bundle writing/cslg.js */
  write(stream) {
    this.version = 0;
    if (this.compositionToDTSShift > INT32_MAX || this.leastDecodeToDisplayDelta > INT32_MAX || this.greatestDecodeToDisplayDelta > INT32_MAX || this.compositionStartTime > INT32_MAX || this.compositionEndTime > INT32_MAX) {
      this.version = 1;
    }
    this.flags = 0;
    if (this.version === 0) {
      this.size = 4 * 5;
      this.writeHeader(stream);
      stream.writeInt32(this.compositionToDTSShift);
      stream.writeInt32(this.leastDecodeToDisplayDelta);
      stream.writeInt32(this.greatestDecodeToDisplayDelta);
      stream.writeInt32(this.compositionStartTime);
      stream.writeInt32(this.compositionEndTime);
    } else if (this.version === 1) {
      this.size = 8 * 5;
      this.writeHeader(stream);
      stream.writeInt64(this.compositionToDTSShift);
      stream.writeInt64(this.leastDecodeToDisplayDelta);
      stream.writeInt64(this.greatestDecodeToDisplayDelta);
      stream.writeInt64(this.compositionStartTime);
      stream.writeInt64(this.compositionEndTime);
    }
  }
}, _Qb.fourcc = "cslg", _Qb);
var cttsBox = (_Rb = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "CompositionOffsetBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    const entry_count = stream.readUint32();
    this.sample_counts = [];
    this.sample_offsets = [];
    if (this.version === 0) {
      for (let i = 0; i < entry_count; i++) {
        this.sample_counts.push(stream.readUint32());
        const value = stream.readInt32();
        if (value < 0) {
          Log.warn("BoxParser", "ctts box uses negative values without using version 1");
        }
        this.sample_offsets.push(value);
      }
    } else if (this.version === 1) {
      for (let i = 0; i < entry_count; i++) {
        this.sample_counts.push(stream.readUint32());
        this.sample_offsets.push(stream.readInt32());
      }
    }
  }
  /** @bundle writing/ctts.js */
  write(stream) {
    this.version = this.sample_offsets.some((offset) => offset < 0) ? 1 : 0;
    this.flags = 0;
    this.size = 4 + 8 * this.sample_counts.length;
    this.writeHeader(stream);
    stream.writeUint32(this.sample_counts.length);
    for (let i = 0; i < this.sample_counts.length; i++) {
      stream.writeUint32(this.sample_counts[i]);
      if (this.version === 1) {
        stream.writeInt32(this.sample_offsets[i]);
      } else {
        stream.writeUint32(this.sample_offsets[i]);
      }
    }
  }
  /** @bundle box-unpack.js */
  unpack(samples) {
    let k = 0;
    for (let i = 0; i < this.sample_counts.length; i++) {
      for (let j = 0; j < this.sample_counts[i]; j++) {
        samples[k].pts = samples[k].dts + this.sample_offsets[i];
        k++;
      }
    }
  }
}, _Rb.fourcc = "ctts", _Rb);
var dac3Box = (_Sb = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "AC3SpecificBox";
  }
  parse(stream) {
    const tmp_byte1 = stream.readUint8();
    const tmp_byte2 = stream.readUint8();
    const tmp_byte3 = stream.readUint8();
    this.fscod = tmp_byte1 >> 6;
    this.bsid = tmp_byte1 >> 1 & 31;
    this.bsmod = (tmp_byte1 & 1) << 2 | tmp_byte2 >> 6 & 3;
    this.acmod = tmp_byte2 >> 3 & 7;
    this.lfeon = tmp_byte2 >> 2 & 1;
    this.bit_rate_code = tmp_byte2 & 3 | tmp_byte3 >> 5 & 7;
  }
}, _Sb.fourcc = "dac3", _Sb);
var dec3Box = (_Tb = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "EC3SpecificBox";
  }
  parse(stream) {
    const tmp_16 = stream.readUint16();
    this.data_rate = tmp_16 >> 3;
    this.num_ind_sub = tmp_16 & 7;
    this.ind_subs = [];
    for (let i = 0; i < this.num_ind_sub + 1; i++) {
      const tmp_byte1 = stream.readUint8();
      const tmp_byte2 = stream.readUint8();
      const tmp_byte3 = stream.readUint8();
      const ind_sub = {
        fscod: tmp_byte1 >> 6,
        bsid: tmp_byte1 >> 1 & 31,
        bsmod: (tmp_byte1 & 1) << 4 | tmp_byte2 >> 4 & 15,
        acmod: tmp_byte2 >> 1 & 7,
        lfeon: tmp_byte2 & 1,
        num_dep_sub: tmp_byte3 >> 1 & 15
      };
      this.ind_subs.push(ind_sub);
      if (ind_sub.num_dep_sub > 0) {
        ind_sub.chan_loc = (tmp_byte3 & 1) << 8 | stream.readUint8();
      }
    }
  }
}, _Tb.fourcc = "dec3", _Tb);
var dfLaBox = (_Ub = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "FLACSpecificBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    const BLOCKTYPE_MASK = 127;
    const LASTMETADATABLOCKFLAG_MASK = 128;
    const boxesFound = [];
    const knownBlockTypes = [
      "STREAMINFO",
      "PADDING",
      "APPLICATION",
      "SEEKTABLE",
      "VORBIS_COMMENT",
      "CUESHEET",
      "PICTURE",
      "RESERVED"
    ];
    let flagAndType;
    do {
      flagAndType = stream.readUint8();
      const type = Math.min(flagAndType & BLOCKTYPE_MASK, knownBlockTypes.length - 1);
      if (!type) {
        stream.readUint8Array(13);
        this.samplerate = stream.readUint32() >> 12;
        stream.readUint8Array(20);
      } else {
        stream.readUint8Array(stream.readUint24());
      }
      boxesFound.push(knownBlockTypes[type]);
    } while (flagAndType & LASTMETADATABLOCKFLAG_MASK);
    this.numMetadataBlocks = boxesFound.length + " (" + boxesFound.join(", ") + ")";
  }
}, _Ub.fourcc = "dfLa", _Ub);
var dimmBox = (_Vb = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "hintimmediateBytesSent";
  }
  parse(stream) {
    this.bytessent = stream.readUint64();
  }
}, _Vb.fourcc = "dimm", _Vb);
var dmax = (_Wb = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "hintlongestpacket";
  }
  parse(stream) {
    this.time = stream.readUint32();
  }
}, _Wb.fourcc = "dmax", _Wb);
var dmedBox = (_Xb = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "hintmediaBytesSent";
  }
  parse(stream) {
    this.bytessent = stream.readUint64();
  }
}, _Xb.fourcc = "dmed", _Xb);
var dOpsBox = (_Yb = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "OpusSpecificBox";
  }
  parse(stream) {
    this.Version = stream.readUint8();
    this.OutputChannelCount = stream.readUint8();
    this.PreSkip = stream.readUint16();
    this.InputSampleRate = stream.readUint32();
    this.OutputGain = stream.readInt16();
    this.ChannelMappingFamily = stream.readUint8();
    if (this.ChannelMappingFamily !== 0) {
      this.StreamCount = stream.readUint8();
      this.CoupledCount = stream.readUint8();
      this.ChannelMapping = [];
      for (let i = 0; i < this.OutputChannelCount; i++) {
        this.ChannelMapping[i] = stream.readUint8();
      }
    }
  }
  write(stream) {
    this.size = 11;
    if (this.ChannelMappingFamily !== 0) {
      this.size += 2 + this.OutputChannelCount;
    }
    this.writeHeader(stream);
    stream.writeUint8(this.Version);
    stream.writeUint8(this.OutputChannelCount);
    stream.writeUint16(this.PreSkip);
    stream.writeUint32(this.InputSampleRate);
    stream.writeInt16(this.OutputGain);
    stream.writeUint8(this.ChannelMappingFamily);
    if (this.ChannelMappingFamily !== 0) {
      stream.writeUint8(this.StreamCount);
      stream.writeUint8(this.CoupledCount);
      for (let i = 0; i < this.OutputChannelCount; i++) {
        stream.writeUint8(this.ChannelMapping[i]);
      }
    }
  }
}, _Yb.fourcc = "dOps", _Yb);
var drepBox = (_Zb = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "hintrepeatedBytesSent";
  }
  parse(stream) {
    this.bytessent = stream.readUint64();
  }
}, _Zb.fourcc = "drep", _Zb);
var elstBox = (__b = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "EditListBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.entries = [];
    const entry_count = stream.readUint32();
    for (let i = 0; i < entry_count; i++) {
      const entry = {
        segment_duration: this.version === 1 ? stream.readUint64() : stream.readUint32(),
        media_time: this.version === 1 ? stream.readInt64() : stream.readInt32(),
        media_rate_integer: stream.readInt16(),
        media_rate_fraction: stream.readInt16()
      };
      this.entries.push(entry);
    }
  }
  /** @bundle writing/elst.js */
  write(stream) {
    const useVersion1 = this.entries.some(
      (entry) => entry.segment_duration > MAX_UINT32 || entry.media_time > MAX_UINT32
    ) || this.version === 1;
    this.version = useVersion1 ? 1 : 0;
    this.size = 4 + 12 * this.entries.length;
    this.size += useVersion1 ? 2 * 4 * this.entries.length : 0;
    this.writeHeader(stream);
    stream.writeUint32(this.entries.length);
    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      if (useVersion1) {
        stream.writeUint64(entry.segment_duration);
        stream.writeInt64(entry.media_time);
      } else {
        stream.writeUint32(entry.segment_duration);
        stream.writeInt32(entry.media_time);
      }
      stream.writeInt16(entry.media_rate_integer);
      stream.writeInt16(entry.media_rate_fraction);
    }
  }
}, __b.fourcc = "elst", __b);
var emsgBox = (_$b = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "EventMessageBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    if (this.version === 1) {
      this.timescale = stream.readUint32();
      this.presentation_time = stream.readUint64();
      this.event_duration = stream.readUint32();
      this.id = stream.readUint32();
      this.scheme_id_uri = stream.readCString();
      this.value = stream.readCString();
    } else {
      this.scheme_id_uri = stream.readCString();
      this.value = stream.readCString();
      this.timescale = stream.readUint32();
      this.presentation_time_delta = stream.readUint32();
      this.event_duration = stream.readUint32();
      this.id = stream.readUint32();
    }
    let message_size = this.size - this.hdr_size - (4 * 4 + (this.scheme_id_uri.length + 1) + (this.value.length + 1));
    if (this.version === 1) {
      message_size -= 4;
    }
    this.message_data = stream.readUint8Array(message_size);
  }
  /** @bundle writing/emsg.js */
  write(stream) {
    this.version = 0;
    this.flags = 0;
    this.size = 4 * 4 + this.message_data.length + (this.scheme_id_uri.length + 1) + (this.value.length + 1);
    this.writeHeader(stream);
    stream.writeCString(this.scheme_id_uri);
    stream.writeCString(this.value);
    stream.writeUint32(this.timescale);
    stream.writeUint32(this.presentation_time_delta);
    stream.writeUint32(this.event_duration);
    stream.writeUint32(this.id);
    stream.writeUint8Array(this.message_data);
  }
}, _$b.fourcc = "emsg", _$b);
var EntityToGroup = class extends FullBox {
  parse(stream) {
    this.parseFullHeader(stream);
    this.group_id = stream.readUint32();
    this.num_entities_in_group = stream.readUint32();
    this.entity_ids = [];
    for (let i = 0; i < this.num_entities_in_group; i++) {
      const entity_id = stream.readUint32();
      this.entity_ids.push(entity_id);
    }
  }
};
var aebrBox = (_ac = class extends EntityToGroup {
  constructor() {
    super(...arguments);
    this.box_name = "Auto exposure bracketing";
  }
}, _ac.fourcc = "aebr", _ac);
var afbrBox = (_bc = class extends EntityToGroup {
  constructor() {
    super(...arguments);
    this.box_name = "Flash exposure information";
  }
}, _bc.fourcc = "afbr", _bc);
var albcBox = (_cc = class extends EntityToGroup {
  constructor() {
    super(...arguments);
    this.box_name = "Album collection";
  }
}, _cc.fourcc = "albc", _cc);
var altrBox = (_dc = class extends EntityToGroup {
  constructor() {
    super(...arguments);
    this.box_name = "Alternative entity";
  }
}, _dc.fourcc = "altr", _dc);
var brstBox = (_ec = class extends EntityToGroup {
  constructor() {
    super(...arguments);
    this.box_name = "Burst image";
  }
}, _ec.fourcc = "brst", _ec);
var dobrBox = (_fc = class extends EntityToGroup {
  constructor() {
    super(...arguments);
    this.box_name = "Depth of field bracketing";
  }
}, _fc.fourcc = "dobr", _fc);
var eqivBox = (_gc = class extends EntityToGroup {
  constructor() {
    super(...arguments);
    this.box_name = "Equivalent entity";
  }
}, _gc.fourcc = "eqiv", _gc);
var favcBox = (_hc = class extends EntityToGroup {
  constructor() {
    super(...arguments);
    this.box_name = "Favorites collection";
  }
}, _hc.fourcc = "favc", _hc);
var fobrBox = (_ic = class extends EntityToGroup {
  constructor() {
    super(...arguments);
    this.box_name = "Focus bracketing";
  }
}, _ic.fourcc = "fobr", _ic);
var iaugBox = (_jc = class extends EntityToGroup {
  constructor() {
    super(...arguments);
    this.box_name = "Image item with an audio track";
  }
}, _jc.fourcc = "iaug", _jc);
var panoBox = (_kc = class extends EntityToGroup {
  constructor() {
    super(...arguments);
    this.box_name = "Panorama";
  }
}, _kc.fourcc = "pano", _kc);
var slidBox = (_lc = class extends EntityToGroup {
  constructor() {
    super(...arguments);
    this.box_name = "Slideshow";
  }
}, _lc.fourcc = "slid", _lc);
var sterBox = (_mc = class extends EntityToGroup {
  constructor() {
    super(...arguments);
    this.box_name = "Stereo";
  }
}, _mc.fourcc = "ster", _mc);
var tsynBox = (_nc = class extends EntityToGroup {
  constructor() {
    super(...arguments);
    this.box_name = "Time-synchronized capture";
  }
}, _nc.fourcc = "tsyn", _nc);
var wbbrBox = (_oc = class extends EntityToGroup {
  constructor() {
    super(...arguments);
    this.box_name = "White balance bracketing";
  }
}, _oc.fourcc = "wbbr", _oc);
var prgrBox = (_pc = class extends EntityToGroup {
  constructor() {
    super(...arguments);
    this.box_name = "Progressive rendering";
  }
}, _pc.fourcc = "prgr", _pc);
var pymdBox = (_qc = class extends EntityToGroup {
  constructor() {
    super(...arguments);
    this.box_name = "Image pyramid";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.group_id = stream.readUint32();
    this.num_entities_in_group = stream.readUint32();
    this.entity_ids = [];
    for (let i = 0; i < this.num_entities_in_group; i++) {
      const entity_id = stream.readUint32();
      this.entity_ids.push(entity_id);
    }
    this.tile_size_x = stream.readUint16();
    this.tile_size_y = stream.readUint16();
    this.layer_binning = [];
    this.tiles_in_layer_column_minus1 = [];
    this.tiles_in_layer_row_minus1 = [];
    for (let i = 0; i < this.num_entities_in_group; i++) {
      this.layer_binning[i] = stream.readUint16();
      this.tiles_in_layer_row_minus1[i] = stream.readUint16();
      this.tiles_in_layer_column_minus1[i] = stream.readUint16();
    }
  }
}, _qc.fourcc = "pymd", _qc);
var fielBox = (_rc = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "FieldHandlingBox";
  }
  parse(stream) {
    this.fieldCount = stream.readUint8();
    this.fieldOrdering = stream.readUint8();
  }
}, _rc.fourcc = "fiel", _rc);
var frmaBox = (_sc = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "OriginalFormatBox";
  }
  parse(stream) {
    this.data_format = stream.readString(4);
  }
}, _sc.fourcc = "frma", _sc);
var imirBox = (_tc = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "ImageMirror";
  }
  parse(stream) {
    const tmp = stream.readUint8();
    this.reserved = tmp >> 7;
    this.axis = tmp & 1;
  }
}, _tc.fourcc = "imir", _tc);
var ipmaBox = (_uc = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "ItemPropertyAssociationBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    const entry_count = stream.readUint32();
    this.associations = [];
    for (let i = 0; i < entry_count; i++) {
      const id = this.version < 1 ? stream.readUint16() : stream.readUint32();
      const props = [];
      const association_count = stream.readUint8();
      for (let j = 0; j < association_count; j++) {
        const tmp = stream.readUint8();
        props.push({
          essential: (tmp & 128) >> 7 === 1,
          property_index: this.flags & 1 ? (tmp & 127) << 8 | stream.readUint8() : tmp & 127
        });
      }
      this.associations.push({
        id,
        props
      });
    }
  }
}, _uc.fourcc = "ipma", _uc);
var irotBox = (_vc = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "ImageRotation";
  }
  parse(stream) {
    this.angle = stream.readUint8() & 3;
  }
}, _vc.fourcc = "irot", _vc);
var ispeBox = (_wc = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "ImageSpatialExtentsProperty";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.image_width = stream.readUint32();
    this.image_height = stream.readUint32();
  }
}, _wc.fourcc = "ispe", _wc);
var itaiBox = (_xc = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "TAITimestampBox";
  }
  parse(stream) {
    this.TAI_timestamp = stream.readUint64();
    const status_bits = stream.readUint8();
    this.sychronization_state = status_bits >> 7 & 1;
    this.timestamp_generation_failure = status_bits >> 6 & 1;
    this.timestamp_is_modified = status_bits >> 5 & 1;
  }
}, _xc.fourcc = "itai", _xc);
var kindBox = (_yc = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "KindBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.schemeURI = stream.readCString();
    if (!this.isEndOfBox(stream)) {
      this.value = stream.readCString();
    }
  }
  /** @bundle writing/kind.js */
  write(stream) {
    this.version = 0;
    this.flags = 0;
    this.size = this.schemeURI.length + 1 + (this.value ? this.value.length + 1 : 0);
    this.writeHeader(stream);
    stream.writeCString(this.schemeURI);
    if (this.value) stream.writeCString(this.value);
  }
}, _yc.fourcc = "kind", _yc);
var levaBox = (_zc = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "LevelAssignmentBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    const count = stream.readUint8();
    this.levels = [];
    for (let i = 0; i < count; i++) {
      const level = {};
      this.levels[i] = level;
      level.track_ID = stream.readUint32();
      const tmp_byte = stream.readUint8();
      level.padding_flag = tmp_byte >> 7;
      level.assignment_type = tmp_byte & 127;
      switch (level.assignment_type) {
        case 0:
          level.grouping_type = stream.readString(4);
          break;
        case 1:
          level.grouping_type = stream.readString(4);
          level.grouping_type_parameter = stream.readUint32();
          break;
        case 2:
          break;
        case 3:
          break;
        case 4:
          level.sub_track_id = stream.readUint32();
          break;
        default:
          Log.warn("BoxParser", `Unknown level assignment type: ${level.assignment_type}`);
      }
    }
  }
}, _zc.fourcc = "leva", _zc);
var lhvCBox = (_Ac = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "LHEVCConfigurationBox";
  }
  parse(stream) {
    this.configurationVersion = stream.readUint8();
    this.min_spatial_segmentation_idc = stream.readUint16() & 4095;
    this.parallelismType = stream.readUint8() & 3;
    let tmp_byte = stream.readUint8();
    this.numTemporalLayers = (tmp_byte & 13) >> 3;
    this.temporalIdNested = (tmp_byte & 4) >> 2;
    this.lengthSizeMinusOne = tmp_byte & 3;
    this.nalu_arrays = [];
    const numOfArrays = stream.readUint8();
    for (let i = 0; i < numOfArrays; i++) {
      const nalu_array = [];
      this.nalu_arrays.push(nalu_array);
      tmp_byte = stream.readUint8();
      nalu_array.completeness = (tmp_byte & 128) >> 7;
      nalu_array.nalu_type = tmp_byte & 63;
      const numNalus = stream.readUint16();
      for (let j = 0; j < numNalus; j++) {
        const length = stream.readUint16();
        nalu_array.push({ data: stream.readUint8Array(length) });
      }
    }
  }
}, _Ac.fourcc = "lhvC", _Ac);
var lselBox = (_Bc = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "LayerSelectorProperty";
  }
  parse(stream) {
    this.layer_id = stream.readUint16();
  }
}, _Bc.fourcc = "lsel", _Bc);
var maxrBox = (_Cc = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "hintmaxrate";
  }
  parse(stream) {
    this.period = stream.readUint32();
    this.bytes = stream.readUint32();
  }
}, _Cc.fourcc = "maxr", _Cc);
var ColorPoint = class {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  toString() {
    return "(" + this.x + "," + this.y + ")";
  }
};
var mdcvBox = (_Dc = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "MasteringDisplayColourVolumeBox";
  }
  parse(stream) {
    this.display_primaries = [];
    this.display_primaries[0] = new ColorPoint(stream.readUint16(), stream.readUint16());
    this.display_primaries[1] = new ColorPoint(stream.readUint16(), stream.readUint16());
    this.display_primaries[2] = new ColorPoint(stream.readUint16(), stream.readUint16());
    this.white_point = new ColorPoint(stream.readUint16(), stream.readUint16());
    this.max_display_mastering_luminance = stream.readUint32();
    this.min_display_mastering_luminance = stream.readUint32();
  }
}, _Dc.fourcc = "mdcv", _Dc);
var mfroBox = (_Ec = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "MovieFragmentRandomAccessOffsetBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this._size = stream.readUint32();
  }
}, _Ec.fourcc = "mfro", _Ec);
var mskCBox = (_Fc = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "MaskConfigurationProperty";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.bits_per_pixel = stream.readUint8();
  }
}, _Fc.fourcc = "mskC", _Fc);
var npckBox = (_Gc = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "hintPacketsSent";
  }
  parse(stream) {
    this.packetssent = stream.readUint32();
  }
}, _Gc.fourcc = "npck", _Gc);
var numpBox = (_Hc = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "hintPacketsSent";
  }
  parse(stream) {
    this.packetssent = stream.readUint64();
  }
}, _Hc.fourcc = "nump", _Hc);
var PaddingBit = class {
  constructor(pad1, pad2) {
    this.pad1 = pad1;
    this.pad2 = pad2;
  }
};
var padbBox = (_Ic = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "PaddingBitsBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    const sample_count = stream.readUint32();
    this.padbits = [];
    for (let i = 0; i < Math.floor((sample_count + 1) / 2); i++) {
      const bits = stream.readUint8();
      const pad1 = (bits & 112) >> 4;
      const pad2 = bits & 7;
      this.padbits.push(new PaddingBit(pad1, pad2));
    }
  }
}, _Ic.fourcc = "padb", _Ic);
var paspBox = (_Jc = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "PixelAspectRatioBox";
  }
  parse(stream) {
    this.hSpacing = stream.readUint32();
    this.vSpacing = stream.readUint32();
  }
}, _Jc.fourcc = "pasp", _Jc);
var paylBox = (_Kc = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "CuePayloadBox";
  }
  parse(stream) {
    this.text = stream.readString(this.size - this.hdr_size);
  }
}, _Kc.fourcc = "payl", _Kc);
var paytBox = (_Lc = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "hintpayloadID";
  }
  parse(stream) {
    this.payloadID = stream.readUint32();
    const count = stream.readUint8();
    this.rtpmap_string = stream.readString(count);
  }
}, _Lc.fourcc = "payt", _Lc);
var pdinBox = (_Mc = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "ProgressiveDownloadInfoBox";
    this.rate = [];
    this.initial_delay = [];
  }
  parse(stream) {
    this.parseFullHeader(stream);
    const count = (this.size - this.hdr_size) / 8;
    for (let i = 0; i < count; i++) {
      this.rate[i] = stream.readUint32();
      this.initial_delay[i] = stream.readUint32();
    }
  }
}, _Mc.fourcc = "pdin", _Mc);
var pixiBox = (_Nc = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "PixelInformationProperty";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.num_channels = stream.readUint8();
    this.bits_per_channels = [];
    for (let i = 0; i < this.num_channels; i++) {
      this.bits_per_channels[i] = stream.readUint8();
    }
  }
}, _Nc.fourcc = "pixi", _Nc);
var pmaxBox = (_Oc = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "hintlargestpacket";
  }
  parse(stream) {
    this.bytes = stream.readUint32();
  }
}, _Oc.fourcc = "pmax", _Oc);
var prdiBox = (_Pc = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "ProgressiveDerivedImageItemInformationProperty";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.step_count = stream.readUint16();
    this.item_count = [];
    if (this.flags & 2) {
      for (let i = 0; i < this.step_count; i++) {
        this.item_count[i] = stream.readUint16();
      }
    }
  }
}, _Pc.fourcc = "prdi", _Pc);
var prfrBox = (_Qc = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "ProjectionFormatBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.projection_type = stream.readUint8() & 31;
  }
}, _Qc.fourcc = "prfr", _Qc);
var prftBox = (_Rc = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "ProducerReferenceTimeBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.ref_track_id = stream.readUint32();
    this.ntp_timestamp = stream.readUint64();
    if (this.version === 0) {
      this.media_time = stream.readUint32();
    } else {
      this.media_time = stream.readUint64();
    }
  }
}, _Rc.fourcc = "prft", _Rc);
var psshBox = (_Sc = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "ProtectionSystemSpecificHeaderBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.system_id = parseHex16(stream);
    this.kid = [];
    if (this.version > 0) {
      const count = stream.readUint32();
      for (let i = 0; i < count; i++) {
        this.kid[i] = parseHex16(stream);
      }
    }
    const datasize = stream.readUint32();
    if (datasize > 0) {
      this.protection_data = stream.readUint8Array(datasize);
    }
  }
}, _Sc.fourcc = "pssh", _Sc);
var clefBox = (_Tc = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "TrackCleanApertureDimensionsBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.width = stream.readUint32();
    this.height = stream.readUint32();
  }
}, _Tc.fourcc = "clef", _Tc);
function parseItifData(type, data) {
  if (type === dataBox.Types.UTF8) {
    return new TextDecoder("utf-8").decode(data);
  }
  const view = new DataView(data.buffer);
  if (type === dataBox.Types.BE_UNSIGNED_INT) {
    if (data.length === 1) {
      return view.getUint8(0);
    } else if (data.length === 2) {
      return view.getUint16(0, false);
    } else if (data.length === 4) {
      return view.getUint32(0, false);
    } else if (data.length === 8) {
      return view.getBigUint64(0, false);
    } else {
      throw new Error("Unsupported ITIF_TYPE_BE_UNSIGNED_INT length " + data.length);
    }
  } else if (type === dataBox.Types.BE_SIGNED_INT) {
    if (data.length === 1) {
      return view.getInt8(0);
    } else if (data.length === 2) {
      return view.getInt16(0, false);
    } else if (data.length === 4) {
      return view.getInt32(0, false);
    } else if (data.length === 8) {
      return view.getBigInt64(0, false);
    } else {
      throw new Error("Unsupported ITIF_TYPE_BE_SIGNED_INT length " + data.length);
    }
  } else if (type === dataBox.Types.BE_FLOAT32) {
    return view.getFloat32(0, false);
  }
  Log.warn("DataBox", "Unsupported or unimplemented itif data type: " + type);
  return void 0;
}
var dataBox = (_Uc = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "DataBox";
  }
  parse(stream) {
    this.valueType = stream.readUint32();
    this.country = stream.readUint16();
    if (this.country > 255) {
      stream.seek(stream.getPosition() - 2);
      this.countryString = stream.readString(2);
    }
    this.language = stream.readUint16();
    if (this.language > 255) {
      stream.seek(stream.getPosition() - 2);
      this.parseLanguage(stream);
    }
    this.raw = stream.readUint8Array(this.size - this.hdr_size - 8);
    this.value = parseItifData(this.valueType, this.raw);
  }
}, _Uc.fourcc = "data", _Uc.Types = {
  RESERVED: 0,
  UTF8: 1,
  UTF16: 2,
  SJIS: 3,
  UTF8_SORT: 4,
  UTF16_SORT: 5,
  JPEG: 13,
  PNG: 14,
  BE_SIGNED_INT: 21,
  BE_UNSIGNED_INT: 22,
  BE_FLOAT32: 23,
  BE_FLOAT64: 24,
  BMP: 27,
  QT_ATOM: 28,
  BE_SIGNED_INT8: 65,
  BE_SIGNED_INT16: 66,
  BE_SIGNED_INT32: 67,
  BE_FLOAT32_POINT: 70,
  BE_FLOAT32_DIMENSIONS: 71,
  BE_FLOAT32_RECT: 72,
  BE_SIGNED_INT64: 74,
  BE_UNSIGNED_INT8: 75,
  BE_UNSIGNED_INT16: 76,
  BE_UNSIGNED_INT32: 77,
  BE_UNSIGNED_INT64: 78,
  BE_FLOAT64_AFFINE_TRANSFORM: 79
}, _Uc);
var enofBox = (_Vc = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "TrackEncodedPixelsDimensionsBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.width = stream.readUint32();
    this.height = stream.readUint32();
  }
}, _Vc.fourcc = "enof", _Vc);
var ilstBox = (_Wc = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "IlstBox";
  }
  parse(stream) {
    this.list = {};
    let total = this.size - this.hdr_size;
    while (total > 0) {
      const size = stream.readUint32();
      const index = stream.readUint32();
      const res = parseOneBox(stream, false, size - 8);
      if (res.code === OK) this.list[index] = res.box;
      total -= size;
    }
  }
}, _Wc.fourcc = "ilst", _Wc);
var keysBox = (_Xc = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "KeysBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.count = stream.readUint32();
    this.keys = {};
    for (let i = 0; i < this.count; i++) {
      const len = stream.readUint32();
      this.keys[i + 1] = stream.readString(len - 4);
    }
  }
}, _Xc.fourcc = "keys", _Xc);
var profBox = (_Yc = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "TrackProductionApertureDimensionsBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.width = stream.readUint32();
    this.height = stream.readUint32();
  }
}, _Yc.fourcc = "prof", _Yc);
var taptBox = (_Zc = class extends ContainerBox {
  constructor() {
    super(...arguments);
    this.box_name = "TrackApertureModeDimensionsBox";
    this.clefs = [];
    this.profs = [];
    this.enofs = [];
    this.subBoxNames = ["clef", "prof", "enof"];
  }
}, _Zc.fourcc = "tapt", _Zc);
var waveBox = (__c = class extends ContainerBox {
  constructor() {
    super(...arguments);
    this.box_name = "siDecompressionParamBox";
  }
}, __c.fourcc = "wave", __c);
var rtp_Box = (_$c = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "rtpmoviehintinformation";
  }
  parse(stream) {
    this.descriptionformat = stream.readString(4);
    this.sdptext = stream.readString(this.size - this.hdr_size - 4);
  }
}, _$c.fourcc = "rtp ", _$c);
var saioBox = (_ad = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "SampleAuxiliaryInformationOffsetsBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    if (this.flags & 1) {
      this.aux_info_type = stream.readString(4);
      this.aux_info_type_parameter = stream.readUint32();
    }
    const count = stream.readUint32();
    this.offset = [];
    for (let i = 0; i < count; i++) {
      if (this.version === 0) {
        this.offset[i] = stream.readUint32();
      } else {
        this.offset[i] = stream.readUint64();
      }
    }
  }
}, _ad.fourcc = "saio", _ad);
var saizBox = (_bd = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "SampleAuxiliaryInformationSizesBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    if (this.flags & 1) {
      this.aux_info_type = stream.readString(4);
      this.aux_info_type_parameter = stream.readUint32();
    }
    this.default_sample_info_size = stream.readUint8();
    this.sample_count = stream.readUint32();
    this.sample_info_size = [];
    if (this.default_sample_info_size === 0) {
      for (let i = 0; i < this.sample_count; i++) {
        this.sample_info_size[i] = stream.readUint8();
      }
    }
  }
}, _bd.fourcc = "saiz", _bd);
var Pixel = class {
  constructor(bad_pixel_row, bad_pixel_column) {
    this.bad_pixel_row = bad_pixel_row;
    this.bad_pixel_column = bad_pixel_column;
  }
  toString() {
    return "[row: " + this.bad_pixel_row + ", column: " + this.bad_pixel_column + "]";
  }
};
var sbpmBox = (_cd = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "SensorBadPixelsMapBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.component_count = stream.readUint16();
    this.component_index = [];
    for (let i = 0; i < this.component_count; i++) {
      this.component_index.push(stream.readUint16());
    }
    const flags = stream.readUint8();
    this.correction_applied = 128 === (flags & 128);
    this.num_bad_rows = stream.readUint32();
    this.num_bad_cols = stream.readUint32();
    this.num_bad_pixels = stream.readUint32();
    this.bad_rows = [];
    this.bad_columns = [];
    this.bad_pixels = [];
    for (let i = 0; i < this.num_bad_rows; i++) {
      this.bad_rows.push(stream.readUint32());
    }
    for (let i = 0; i < this.num_bad_cols; i++) {
      this.bad_columns.push(stream.readUint32());
    }
    for (let i = 0; i < this.num_bad_pixels; i++) {
      const row = stream.readUint32();
      const col = stream.readUint32();
      this.bad_pixels.push(new Pixel(row, col));
    }
  }
}, _cd.fourcc = "sbpm", _cd);
var schmBox = (_dd = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "SchemeTypeBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.scheme_type = stream.readString(4);
    this.scheme_version = stream.readUint32();
    if (this.flags & 1) {
      this.scheme_uri = stream.readString(this.size - this.hdr_size - 8);
    }
  }
}, _dd.fourcc = "schm", _dd);
var sdp_Box = (_ed = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "rtptracksdphintinformation";
  }
  parse(stream) {
    this.sdptext = stream.readString(this.size - this.hdr_size);
  }
}, _ed.fourcc = "sdp ", _ed);
var sencBox = (_fd = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "SampleEncryptionBox";
  }
  // Cannot be fully parsed because Per_Sample_IV_Size needs to be known
  /* parse(stream: MultiBufferStream) {
    this.parseFullHeader(stream);
    let sample_count = stream.readUint32();
    this.samples = [];
    for (let i = 0; i < sample_count; i++) {
      let sample = {};
      // tenc.default_Per_Sample_IV_Size or seig.Per_Sample_IV_Size
      sample.InitializationVector = this.readUint8Array(Per_Sample_IV_Size*8);
      if (this.flags & 0x2) {
        sample.subsamples = [];
        subsample_count = stream.readUint16();
        for (let j = 0; j < subsample_count; j++) {
          let subsample = {};
          subsample.BytesOfClearData = stream.readUint16();
          subsample.BytesOfProtectedData = stream.readUint32();
          sample.subsamples.push(subsample);
        }
      }
      // TODO
      this.samples.push(sample);
    } 
  } */
}, _fd.fourcc = "senc", _fd);
var SmDmBox = (_gd = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "SMPTE2086MasteringDisplayMetadataBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.primaryRChromaticity_x = stream.readUint16();
    this.primaryRChromaticity_y = stream.readUint16();
    this.primaryGChromaticity_x = stream.readUint16();
    this.primaryGChromaticity_y = stream.readUint16();
    this.primaryBChromaticity_x = stream.readUint16();
    this.primaryBChromaticity_y = stream.readUint16();
    this.whitePointChromaticity_x = stream.readUint16();
    this.whitePointChromaticity_y = stream.readUint16();
    this.luminanceMax = stream.readUint32();
    this.luminanceMin = stream.readUint32();
  }
}, _gd.fourcc = "SmDm", _gd);
var sratBox = (_hd = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "SamplingRateBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.sampling_rate = stream.readUint32();
  }
}, _hd.fourcc = "srat", _hd);
var ssixBox = (_id = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "CompressedSubsegmentIndexBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.subsegments = [];
    const subsegment_count = stream.readUint32();
    for (let i = 0; i < subsegment_count; i++) {
      const subsegment = {};
      this.subsegments.push(subsegment);
      subsegment.ranges = [];
      const range_count = stream.readUint32();
      for (let j = 0; j < range_count; j++) {
        const range = {};
        subsegment.ranges.push(range);
        range.level = stream.readUint8();
        range.range_size = stream.readUint24();
      }
    }
  }
}, _id.fourcc = "ssix", _id);
var stdpBox = (_jd = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "DegradationPriorityBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    const count = (this.size - this.hdr_size) / 2;
    this.priority = [];
    for (let i = 0; i < count; i++) {
      this.priority[i] = stream.readUint16();
    }
  }
}, _jd.fourcc = "stpd", _jd);
var striBox = (_kd = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "SubTrackInformationBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.switch_group = stream.readUint16();
    this.alternate_group = stream.readUint16();
    this.sub_track_id = stream.readUint32();
    const count = (this.size - this.hdr_size - 8) / 4;
    this.attribute_list = [];
    for (let i = 0; i < count; i++) {
      this.attribute_list[i] = stream.readUint32();
    }
  }
}, _kd.fourcc = "stri", _kd);
var stsgBox = (_ld = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "SubTrackSampleGroupBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.grouping_type = stream.readUint32();
    const count = stream.readUint16();
    this.group_description_index = [];
    for (let i = 0; i < count; i++) {
      this.group_description_index[i] = stream.readUint32();
    }
  }
}, _ld.fourcc = "stsg", _ld);
var stshBox = (_md = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "ShadowSyncSampleBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    const entry_count = stream.readUint32();
    this.shadowed_sample_numbers = [];
    this.sync_sample_numbers = [];
    if (this.version === 0) {
      for (let i = 0; i < entry_count; i++) {
        this.shadowed_sample_numbers.push(stream.readUint32());
        this.sync_sample_numbers.push(stream.readUint32());
      }
    }
  }
  write(stream) {
    this.version = 0;
    this.flags = 0;
    this.size = 4 + 8 * this.shadowed_sample_numbers.length;
    this.writeHeader(stream);
    stream.writeUint32(this.shadowed_sample_numbers.length);
    for (let i = 0; i < this.shadowed_sample_numbers.length; i++) {
      stream.writeUint32(this.shadowed_sample_numbers[i]);
      stream.writeUint32(this.sync_sample_numbers[i]);
    }
  }
}, _md.fourcc = "stsh", _md);
var stssBox = (_nd = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "SyncSampleBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    const entry_count = stream.readUint32();
    if (this.version === 0) {
      this.sample_numbers = [];
      for (let i = 0; i < entry_count; i++) {
        this.sample_numbers.push(stream.readUint32());
      }
    }
  }
  /** @bundle writing/stss.js */
  write(stream) {
    this.version = 0;
    this.flags = 0;
    this.size = 4 + 4 * this.sample_numbers.length;
    this.writeHeader(stream);
    stream.writeUint32(this.sample_numbers.length);
    stream.writeUint32Array(this.sample_numbers);
  }
}, _nd.fourcc = "stss", _nd);
var stviBox = (_od = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "StereoVideoBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    const tmp32 = stream.readUint32();
    this.single_view_allowed = tmp32 & 3;
    this.stereo_scheme = stream.readUint32();
    const length = stream.readUint32();
    this.stereo_indication_type = stream.readString(length);
    this.boxes = [];
    while (stream.getPosition() < this.start + this.size) {
      const ret = parseOneBox(stream, false, this.size - (stream.getPosition() - this.start));
      if (ret.code === OK) {
        const box = ret.box;
        this.boxes.push(box);
        this[box.type] = box;
      } else {
        return;
      }
    }
  }
}, _od.fourcc = "stvi", _od);
var stypBox = (_pd = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "SegmentTypeBox";
  }
  parse(stream) {
    let toparse = this.size - this.hdr_size;
    this.major_brand = stream.readString(4);
    this.minor_version = stream.readUint32();
    toparse -= 8;
    this.compatible_brands = [];
    let i = 0;
    while (toparse >= 4) {
      this.compatible_brands[i] = stream.readString(4);
      toparse -= 4;
      i++;
    }
  }
  write(stream) {
    this.size = 8 + 4 * this.compatible_brands.length;
    this.writeHeader(stream);
    stream.writeString(this.major_brand, void 0, 4);
    stream.writeUint32(this.minor_version);
    for (let i = 0; i < this.compatible_brands.length; i++) {
      stream.writeString(this.compatible_brands[i], void 0, 4);
    }
  }
}, _pd.fourcc = "styp", _pd);
var stz2Box = (_qd = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "CompactSampleSizeBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.sample_sizes = [];
    if (this.version === 0) {
      this.reserved = stream.readUint24();
      this.field_size = stream.readUint8();
      const sample_count = stream.readUint32();
      if (this.field_size === 4) {
        for (let i = 0; i < sample_count; i += 2) {
          const tmp = stream.readUint8();
          this.sample_sizes[i] = tmp >> 4 & 15;
          this.sample_sizes[i + 1] = tmp & 15;
        }
      } else if (this.field_size === 8) {
        for (let i = 0; i < sample_count; i++) {
          this.sample_sizes[i] = stream.readUint8();
        }
      } else if (this.field_size === 16) {
        for (let i = 0; i < sample_count; i++) {
          this.sample_sizes[i] = stream.readUint16();
        }
      } else {
        Log.error("BoxParser", "Error in length field in stz2 box", stream.isofile);
      }
    }
  }
}, _qd.fourcc = "stz2", _qd);
var subsBox = (_rd = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "SubSampleInformationBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    const entry_count = stream.readUint32();
    this.entries = [];
    let subsample_count;
    for (let i = 0; i < entry_count; i++) {
      const sampleInfo = {};
      this.entries[i] = sampleInfo;
      sampleInfo.sample_delta = stream.readUint32();
      sampleInfo.subsamples = [];
      subsample_count = stream.readUint16();
      if (subsample_count > 0) {
        for (let j = 0; j < subsample_count; j++) {
          const subsample = {};
          sampleInfo.subsamples.push(subsample);
          if (this.version === 1) {
            subsample.size = stream.readUint32();
          } else {
            subsample.size = stream.readUint16();
          }
          subsample.priority = stream.readUint8();
          subsample.discardable = stream.readUint8();
          subsample.codec_specific_parameters = stream.readUint32();
        }
      }
    }
  }
}, _rd.fourcc = "subs", _rd);
var taicBox = (_sd = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "TAIClockInfoBox";
  }
  parse(stream) {
    this.time_uncertainty = stream.readUint64();
    this.clock_resolution = stream.readUint32();
    this.clock_drift_rate = stream.readInt32();
    const reserved_byte = stream.readUint8();
    this.clock_type = (reserved_byte & 192) >> 6;
  }
}, _sd.fourcc = "taic", _sd);
var tencBox = (_td = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "TrackEncryptionBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    stream.readUint8();
    if (this.version === 0) {
      stream.readUint8();
    } else {
      const tmp = stream.readUint8();
      this.default_crypt_byte_block = tmp >> 4 & 15;
      this.default_skip_byte_block = tmp & 15;
    }
    this.default_isProtected = stream.readUint8();
    this.default_Per_Sample_IV_Size = stream.readUint8();
    this.default_KID = parseHex16(stream);
    if (this.default_isProtected === 1 && this.default_Per_Sample_IV_Size === 0) {
      this.default_constant_IV_size = stream.readUint8();
      this.default_constant_IV = stream.readUint8Array(this.default_constant_IV_size);
    }
  }
}, _td.fourcc = "tenc", _td);
var tfraBox = (_ud = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "TrackFragmentRandomAccessBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.track_ID = stream.readUint32();
    stream.readUint24();
    const tmp_byte = stream.readUint8();
    this.length_size_of_traf_num = tmp_byte >> 4 & 3;
    this.length_size_of_trun_num = tmp_byte >> 2 & 3;
    this.length_size_of_sample_num = tmp_byte & 3;
    this.entries = [];
    const number_of_entries = stream.readUint32();
    for (let i = 0; i < number_of_entries; i++) {
      if (this.version === 1) {
        this.time = stream.readUint64();
        this.moof_offset = stream.readUint64();
      } else {
        this.time = stream.readUint32();
        this.moof_offset = stream.readUint32();
      }
      this.traf_number = stream["readUint" + 8 * (this.length_size_of_traf_num + 1)]();
      this.trun_number = stream["readUint" + 8 * (this.length_size_of_trun_num + 1)]();
      this.sample_number = stream["readUint" + 8 * (this.length_size_of_sample_num + 1)]();
    }
  }
}, _ud.fourcc = "tfra", _ud);
var tmaxBox = (_vd = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "hintmaxrelativetime";
  }
  parse(stream) {
    this.time = stream.readUint32();
  }
}, _vd.fourcc = "tmax", _vd);
var tminBox = (_wd = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "hintminrelativetime";
  }
  parse(stream) {
    this.time = stream.readUint32();
  }
}, _wd.fourcc = "tmin", _wd);
var totlBox = (_xd = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "hintBytesSent";
  }
  parse(stream) {
    this.bytessent = stream.readUint32();
  }
}, _xd.fourcc = "totl", _xd);
var tpayBox = (_yd = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "hintBytesSent";
  }
  parse(stream) {
    this.bytessent = stream.readUint32();
  }
}, _yd.fourcc = "tpay", _yd);
var tpylBox = (_zd = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "hintBytesSent";
  }
  parse(stream) {
    this.bytessent = stream.readUint64();
  }
}, _zd.fourcc = "tpyl", _zd);
var msrcTrackGroupTypeBox = (_Ad = class extends TrackGroupTypeBox {
}, _Ad.fourcc = "msrc", _Ad);
var trefBox = (_Bd = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "TrackReferenceBox";
    this.references = [];
  }
  parse(stream) {
    while (stream.getPosition() < this.start + this.size) {
      const ret = parseOneBox(stream, true, this.size - (stream.getPosition() - this.start));
      if (ret.code === OK) {
        if (!_Bd.allowed_types.includes(ret.type)) {
          Log.warn("BoxParser", `Unknown track reference type: '${ret.type}'`);
        }
        const box = new TrackReferenceTypeBox(ret.type, ret.size, ret.hdr_size, ret.start);
        if (box.write === Box.prototype.write && box.type !== "mdat") {
          Log.info(
            "BoxParser",
            "TrackReference " + box.type + " box writing not yet implemented, keeping unparsed data in memory for later write"
          );
          box.parseDataAndRewind(stream);
        }
        box.parse(stream);
        this.references.push(box);
      } else {
        return;
      }
    }
  }
}, _Bd.fourcc = "tref", _Bd.allowed_types = [
  "hint",
  "cdsc",
  "font",
  "hind",
  "vdep",
  "vplx",
  "subt",
  "thmb",
  "auxl",
  "cdtg",
  "shsc",
  "aest"
], _Bd);
var trepBox = (_Cd = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "TrackExtensionPropertiesBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.track_ID = stream.readUint32();
    this.boxes = [];
    while (stream.getPosition() < this.start + this.size) {
      const ret = parseOneBox(stream, false, this.size - (stream.getPosition() - this.start));
      if (ret.code === OK) {
        const box = ret.box;
        this.boxes.push(box);
      } else {
        return;
      }
    }
  }
}, _Cd.fourcc = "trep", _Cd);
var trpyBox = (_Dd = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "hintBytesSent";
  }
  parse(stream) {
    this.bytessent = stream.readUint64();
  }
}, _Dd.fourcc = "trpy", _Dd);
var tselBox = (_Ed = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "TrackSelectionBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.switch_group = stream.readUint32();
    const count = (this.size - this.hdr_size - 4) / 4;
    this.attribute_list = [];
    for (let i = 0; i < count; i++) {
      this.attribute_list[i] = stream.readUint32();
    }
  }
}, _Ed.fourcc = "tsel", _Ed);
var txtcBox = (_Fd = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "TextConfigBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.config = stream.readCString();
  }
}, _Fd.fourcc = "txtc", _Fd);
var tycoBox = (_Gd = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "TypeCombinationBox";
  }
  parse(stream) {
    const count = (this.size - this.hdr_size) / 4;
    this.compatible_brands = [];
    for (let i = 0; i < count; i++) {
      this.compatible_brands[i] = stream.readString(4);
    }
  }
}, _Gd.fourcc = "tyco", _Gd);
var udesBox = (_Hd = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "UserDescriptionProperty";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.lang = stream.readCString();
    this.name = stream.readCString();
    this.description = stream.readCString();
    this.tags = stream.readCString();
  }
}, _Hd.fourcc = "udes", _Hd);
var uncCBox = (_Id = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "UncompressedFrameConfigBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.profile = stream.readString(4);
    if (this.version === 1) ;
    else if (this.version === 0) {
      this.component_count = stream.readUint32();
      this.component_index = [];
      this.component_bit_depth_minus_one = [];
      this.component_format = [];
      this.component_align_size = [];
      for (let i = 0; i < this.component_count; i++) {
        this.component_index.push(stream.readUint16());
        this.component_bit_depth_minus_one.push(stream.readUint8());
        this.component_format.push(stream.readUint8());
        this.component_align_size.push(stream.readUint8());
      }
      this.sampling_type = stream.readUint8();
      this.interleave_type = stream.readUint8();
      this.block_size = stream.readUint8();
      const flags = stream.readUint8();
      this.component_little_endian = flags >> 7 & 1;
      this.block_pad_lsb = flags >> 6 & 1;
      this.block_little_endian = flags >> 5 & 1;
      this.block_reversed = flags >> 4 & 1;
      this.pad_unknown = flags >> 3 & 1;
      this.pixel_size = stream.readUint32();
      this.row_align_size = stream.readUint32();
      this.tile_align_size = stream.readUint32();
      this.num_tile_cols_minus_one = stream.readUint32();
      this.num_tile_rows_minus_one = stream.readUint32();
    }
  }
}, _Id.fourcc = "uncC", _Id);
var urnBox = (_Jd = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "DataEntryUrnBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.name = stream.readCString();
    if (this.size - this.hdr_size - this.name.length - 1 > 0) {
      this.location = stream.readCString();
    }
  }
  /** @bundle writing/urn.js */
  write(stream) {
    this.version = 0;
    this.flags = 0;
    this.size = this.name.length + 1 + (this.location ? this.location.length + 1 : 0);
    this.writeHeader(stream);
    stream.writeCString(this.name);
    if (this.location) {
      stream.writeCString(this.location);
    }
  }
}, _Jd.fourcc = "urn ", _Jd);
var vttCBox = (_Kd = class extends Box {
  constructor() {
    super(...arguments);
    this.box_name = "WebVTTConfigurationBox";
  }
  parse(stream) {
    this.text = stream.readString(this.size - this.hdr_size);
  }
}, _Kd.fourcc = "vttC", _Kd);
var vvnCBox = (_Ld = class extends FullBox {
  constructor() {
    super(...arguments);
    this.box_name = "VvcNALUConfigBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    const tmp = stream.readUint8();
    this.lengthSizeMinusOne = tmp & 3;
  }
}, _Ld.fourcc = "vvnC", _Ld);
var alstSampleGroupEntry = (_Md = class extends SampleGroupEntry {
  parse(stream) {
    const roll_count = stream.readUint16();
    this.first_output_sample = stream.readUint16();
    this.sample_offset = [];
    for (let i = 0; i < roll_count; i++) {
      this.sample_offset[i] = stream.readUint32();
    }
    const remaining = this.description_length - 4 - 4 * roll_count;
    this.num_output_samples = [];
    this.num_total_samples = [];
    for (let i = 0; i < remaining / 4; i++) {
      this.num_output_samples[i] = stream.readUint16();
      this.num_total_samples[i] = stream.readUint16();
    }
  }
}, _Md.grouping_type = "alst", _Md);
var avllSampleGroupEntry = (_Nd = class extends SampleGroupEntry {
  parse(stream) {
    this.layerNumber = stream.readUint8();
    this.accurateStatisticsFlag = stream.readUint8();
    this.avgBitRate = stream.readUint16();
    this.avgFrameRate = stream.readUint16();
  }
}, _Nd.grouping_type = "avll", _Nd);
var avssSampleGroupEntry = (_Od = class extends SampleGroupEntry {
  parse(stream) {
    this.subSequenceIdentifier = stream.readUint16();
    this.layerNumber = stream.readUint8();
    const tmp_byte = stream.readUint8();
    this.durationFlag = tmp_byte >> 7;
    this.avgRateFlag = tmp_byte >> 6 & 1;
    if (this.durationFlag) {
      this.duration = stream.readUint32();
    }
    if (this.avgRateFlag) {
      this.accurateStatisticsFlag = stream.readUint8();
      this.avgBitRate = stream.readUint16();
      this.avgFrameRate = stream.readUint16();
    }
    this.dependency = [];
    const numReferences = stream.readUint8();
    for (let i = 0; i < numReferences; i++) {
      this.dependency.push({
        subSeqDirectionFlag: stream.readUint8(),
        layerNumber: stream.readUint8(),
        subSequenceIdentifier: stream.readUint16()
      });
    }
  }
}, _Od.grouping_type = "avss", _Od);
var dtrtSampleGroupEntry = (_Pd = class extends SampleGroupEntry {
  parse(_stream) {
    Log.warn("BoxParser", "Sample Group type: " + this.grouping_type + " not fully parsed");
  }
}, _Pd.grouping_type = "dtrt", _Pd);
var mvifSampleGroupEntry = (_Qd = class extends SampleGroupEntry {
  parse(_stream) {
    Log.warn("BoxParser", "Sample Group type: " + this.grouping_type + " not fully parsed");
  }
}, _Qd.grouping_type = "mvif", _Qd);
var prolSampleGroupEntry = (_Rd = class extends SampleGroupEntry {
  parse(stream) {
    this.roll_distance = stream.readInt16();
  }
}, _Rd.grouping_type = "prol", _Rd);
var rapSampleGroupEntry = (_Sd = class extends SampleGroupEntry {
  parse(stream) {
    const tmp_byte = stream.readUint8();
    this.num_leading_samples_known = tmp_byte >> 7;
    this.num_leading_samples = tmp_byte & 127;
  }
}, _Sd.grouping_type = "rap ", _Sd);
var rashSampleGroupEntry = (_Td = class extends SampleGroupEntry {
  parse(stream) {
    this.operation_point_count = stream.readUint16();
    if (this.description_length !== 2 + (this.operation_point_count === 1 ? 2 : this.operation_point_count * 6) + 9) {
      Log.warn("BoxParser", "Mismatch in " + this.grouping_type + " sample group length");
      this.data = stream.readUint8Array(this.description_length - 2);
    } else {
      if (this.operation_point_count === 1) {
        this.target_rate_share = stream.readUint16();
      } else {
        this.target_rate_share = [];
        this.available_bitrate = [];
        for (let i = 0; i < this.operation_point_count; i++) {
          this.available_bitrate[i] = stream.readUint32();
          this.target_rate_share[i] = stream.readUint16();
        }
      }
      this.maximum_bitrate = stream.readUint32();
      this.minimum_bitrate = stream.readUint32();
      this.discard_priority = stream.readUint8();
    }
  }
}, _Td.grouping_type = "rash", _Td);
var rollSampleGroupEntry = (_Ud = class extends SampleGroupEntry {
  parse(stream) {
    this.roll_distance = stream.readInt16();
  }
}, _Ud.grouping_type = "roll", _Ud);
var scifSampleGroupEntry = (_Vd = class extends SampleGroupEntry {
  parse(_stream) {
    Log.warn("BoxParser", "Sample Group type: " + this.grouping_type + " not fully parsed");
  }
}, _Vd.grouping_type = "scif", _Vd);
var scnmSampleGroupEntry = (_Wd = class extends SampleGroupEntry {
  parse(_stream) {
    Log.warn("BoxParser", "Sample Group type: " + this.grouping_type + " not fully parsed");
  }
}, _Wd.grouping_type = "scnm", _Wd);
var seigSampleGroupEntry = (_Xd = class extends SampleGroupEntry {
  parse(stream) {
    this.reserved = stream.readUint8();
    const tmp = stream.readUint8();
    this.crypt_byte_block = tmp >> 4;
    this.skip_byte_block = tmp & 15;
    this.isProtected = stream.readUint8();
    this.Per_Sample_IV_Size = stream.readUint8();
    this.KID = parseHex16(stream);
    this.constant_IV_size = 0;
    this.constant_IV = 0;
    if (this.isProtected === 1 && this.Per_Sample_IV_Size === 0) {
      this.constant_IV_size = stream.readUint8();
      this.constant_IV = stream.readUint8Array(this.constant_IV_size);
    }
  }
}, _Xd.grouping_type = "seig", _Xd);
var stsaSampleGroupEntry = (_Yd = class extends SampleGroupEntry {
  parse(_stream) {
    Log.warn("BoxParser", "Sample Group type: " + this.grouping_type + " not fully parsed");
  }
}, _Yd.grouping_type = "stsa", _Yd);
var syncSampleGroupEntry = (_Zd = class extends SampleGroupEntry {
  parse(stream) {
    const tmp_byte = stream.readUint8();
    this.NAL_unit_type = tmp_byte & 63;
  }
}, _Zd.grouping_type = "sync", _Zd);
var teleSampleGroupEntry = (__d = class extends SampleGroupEntry {
  parse(stream) {
    const tmp_byte = stream.readUint8();
    this.level_independently_decodable = tmp_byte >> 7;
  }
}, __d.grouping_type = "tele", __d);
var tsasSampleGroupEntry = (_$d = class extends SampleGroupEntry {
  parse(_stream) {
    Log.warn("BoxParser", "Sample Group type: " + this.grouping_type + " not fully parsed");
  }
}, _$d.grouping_type = "tsas", _$d);
var tsclSampleGroupEntry = (_ae = class extends SampleGroupEntry {
  parse(_stream) {
    Log.warn("BoxParser", "Sample Group type: " + this.grouping_type + " not fully parsed");
  }
}, _ae.grouping_type = "tscl", _ae);
var viprSampleGroupEntry = (_be = class extends SampleGroupEntry {
  parse(_stream) {
    Log.warn("BoxParser", "Sample Group type: " + this.grouping_type + " not fully parsed");
  }
}, _be.grouping_type = "vipr", _be);
var UUIDBox = (_ce = class extends Box {
}, _ce.fourcc = "uuid", _ce);
var UUIDFullBox = (_de = class extends FullBox {
}, _de.fourcc = "uuid", _de);
var piffLsmBox = (_ee = class extends UUIDFullBox {
  constructor() {
    super(...arguments);
    this.box_name = "LiveServerManifestBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.LiveServerManifest = stream.readString(this.size - this.hdr_size).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
}, _ee.uuid = "a5d40b30e81411ddba2f0800200c9a66", _ee);
var piffPsshBox = (_fe = class extends UUIDFullBox {
  constructor() {
    super(...arguments);
    this.box_name = "PiffProtectionSystemSpecificHeaderBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.system_id = parseHex16(stream);
    const datasize = stream.readUint32();
    if (datasize > 0) {
      this.data = stream.readUint8Array(datasize);
    }
  }
}, _fe.uuid = "d08a4f1810f34a82b6c832d8aba183d3", _fe);
var piffSencBox = (_ge = class extends UUIDFullBox {
  constructor() {
    super(...arguments);
    this.box_name = "PiffSampleEncryptionBox";
  }
}, _ge.uuid = "a2394f525a9b4f14a2446c427c648df4", _ge);
var piffTencBox = (_he = class extends UUIDFullBox {
  constructor() {
    super(...arguments);
    this.box_name = "PiffTrackEncryptionBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.default_AlgorithmID = stream.readUint24();
    this.default_IV_size = stream.readUint8();
    this.default_KID = parseHex16(stream);
  }
}, _he.uuid = "8974dbce7be74c5184f97148f9882554", _he);
var piffTfrfBox = (_ie = class extends UUIDFullBox {
  constructor() {
    super(...arguments);
    this.box_name = "TfrfBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    this.fragment_count = stream.readUint8();
    this.entries = [];
    for (let i = 0; i < this.fragment_count; i++) {
      let absolute_time = 0;
      let absolute_duration = 0;
      if (this.version === 1) {
        absolute_time = stream.readUint64();
        absolute_duration = stream.readUint64();
      } else {
        absolute_time = stream.readUint32();
        absolute_duration = stream.readUint32();
      }
      this.entries.push({
        absolute_time,
        absolute_duration
      });
    }
  }
}, _ie.uuid = "d4807ef2ca3946958e5426cb9e46a79f", _ie);
var piffTfxdBox = (_je = class extends UUIDFullBox {
  constructor() {
    super(...arguments);
    this.box_name = "TfxdBox";
  }
  parse(stream) {
    this.parseFullHeader(stream);
    if (this.version === 1) {
      this.absolute_time = stream.readUint64();
      this.duration = stream.readUint64();
    } else {
      this.absolute_time = stream.readUint32();
      this.duration = stream.readUint32();
    }
  }
}, _je.uuid = "6d1d9b0542d544e680e2141daff757b2", _je);
var ItemContentIDPropertyBox = (_ke = class extends UUIDBox {
  constructor() {
    super(...arguments);
    this.box_name = "ItemContentIDProperty";
  }
  parse(stream) {
    this.content_id = stream.readCString();
  }
}, _ke.uuid = "261ef3741d975bbaacbd9d2c8ea73522", _ke);
registerBoxes(all_boxes_exports);
registerDescriptors(descriptor_exports);
const MICROS_PER_SECOND = 1e6;
const MP4_TIMESCALE = 9e4;
const resolvePositiveEvenInteger = (value, label) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`[VideoRecorder] ${label} must be a finite number greater than 0.`);
  }
  const integer = Math.floor(value);
  const evenInteger = integer % 2 === 0 ? integer : integer - 1;
  return Math.max(2, evenInteger);
};
const resolvePositiveFiniteNumber = (value, label) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`[VideoRecorder] ${label} must be a finite number greater than 0.`);
  }
  return value;
};
const wait$1 = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});
const toErrorMessage = (error) => {
  if (error instanceof DOMException || error instanceof Error) {
    return error.message;
  }
  return String(error);
};
class VideoRecorder {
  encoder = null;
  mp4File = null;
  trackId = null;
  width;
  height;
  fps;
  bitrate;
  maxEncodeQueue;
  frameDurationMicros;
  keyFrameIntervalFrames;
  frameCounter = 0;
  recording = false;
  encoderError = null;
  sampleCount = 0;
  droppedChunkCountWithoutTrack = 0;
  constructor(options) {
    this.width = resolvePositiveEvenInteger(options.width, "width");
    this.height = resolvePositiveEvenInteger(options.height, "height");
    this.fps = resolvePositiveFiniteNumber(options.fps, "fps");
    if (typeof options.bitrate === "number" && (!Number.isFinite(options.bitrate) || options.bitrate <= 0)) {
      throw new Error("[VideoRecorder] bitrate must be a finite number greater than 0.");
    }
    this.bitrate = options.bitrate != null ? Math.max(1, Math.floor(options.bitrate)) : 25e6;
    this.maxEncodeQueue = Number.isFinite(options.maxEncodeQueue) ? Math.max(0, Math.floor(options.maxEncodeQueue)) : 8;
    this.frameDurationMicros = Math.max(1, Math.round(MICROS_PER_SECOND / this.fps));
    this.keyFrameIntervalFrames = Math.max(1, Math.round(this.fps * 2));
  }
  async start() {
    if (this.recording) return;
    this.recording = true;
    this.frameCounter = 0;
    this.encoderError = null;
    this.sampleCount = 0;
    this.droppedChunkCountWithoutTrack = 0;
    this.mp4File = createFile();
    this.trackId = null;
    this.encoder = new VideoEncoder({
      output: (chunk, metadata) => this.handleEncodedChunk(chunk, metadata),
      error: (error) => {
        this.encoderError = error;
        this.recording = false;
        console.error("[VideoRecorder] encoder error:", error);
      }
    });
    const baseConfig = {
      width: this.width,
      height: this.height,
      bitrate: this.bitrate,
      framerate: this.fps,
      latencyMode: "quality"
    };
    const codecCandidates = ["avc1.640033", "avc1.640032", "avc1.4d002a", "avc1.42001f"];
    let configuredCodec = null;
    for (const codec of codecCandidates) {
      const configVariants = [
        { ...baseConfig, codec, avc: { format: "avc" } }
      ];
      for (const config of configVariants) {
        try {
          const support = await VideoEncoder.isConfigSupported(config);
          if (!support.supported) continue;
          this.encoder.configure(config);
          configuredCodec = codec;
          break;
        } catch {
        }
      }
      if (configuredCodec) break;
    }
    if (!configuredCodec) {
      this.recording = false;
      throw new Error(
        "[VideoRecorder] no supported H.264 AVC WebCodecs configuration found for MP4 capture. Use an installed Chrome/Edge browser with H.264 WebCodecs support, or use a frame/ffmpeg capture fallback."
      );
    }
  }
  throwIfEncoderErrored() {
    if (!this.encoderError) return;
    throw new Error(`[VideoRecorder] encoder error: ${toErrorMessage(this.encoderError)}`);
  }
  async waitForEncodeQueue() {
    while (this.encoder && this.encoder.encodeQueueSize > this.maxEncodeQueue) {
      this.throwIfEncoderErrored();
      await wait$1(0);
    }
    this.throwIfEncoderErrored();
  }
  /**
   * Encode one frame from a canvas or existing VideoFrame.
   */
  async appendFrame(source) {
    this.throwIfEncoderErrored();
    if (!this.recording || !this.encoder || this.encoder.state === "closed") {
      throw new Error("[VideoRecorder] not running");
    }
    const timestamp = Math.round(this.frameCounter * MICROS_PER_SECOND / this.fps);
    const nextTimestamp = Math.round((this.frameCounter + 1) * MICROS_PER_SECOND / this.fps);
    const duration = Math.max(1, nextTimestamp - timestamp);
    const frame = source instanceof VideoFrame ? new VideoFrame(source, { timestamp, duration }) : new VideoFrame(source, { timestamp, duration });
    try {
      const keyFrame = this.frameCounter % this.keyFrameIntervalFrames === 0;
      this.encoder.encode(frame, { keyFrame });
    } finally {
      frame.close();
    }
    this.frameCounter += 1;
    await this.waitForEncodeQueue();
  }
  /**
   * Finish encoding, mux MP4 container, and return video blob.
   */
  async stop() {
    const encoder = this.encoder;
    this.recording = false;
    try {
      if (!encoder) {
        this.throwIfEncoderErrored();
        throw new Error("[VideoRecorder] not running");
      }
      this.throwIfEncoderErrored();
      if (encoder.state !== "closed") {
        await encoder.flush();
        encoder.close();
      }
      this.throwIfEncoderErrored();
      if (!this.mp4File) {
        return new Blob([], { type: "video/mp4" });
      }
      if (this.sampleCount <= 0) {
        throw new Error(
          `[VideoRecorder] no encoded samples were muxed into MP4 (droppedWithoutTrack=${this.droppedChunkCountWithoutTrack}).`
        );
      }
      const stream = this.mp4File.getBuffer();
      return new Blob([stream.buffer], { type: "video/mp4" });
    } finally {
      this.encoder = null;
      this.mp4File = null;
      this.trackId = null;
    }
  }
  handleEncodedChunk(chunk, metadata) {
    if (!this.mp4File) return;
    const data = new Uint8Array(chunk.byteLength);
    chunk.copyTo(data);
    if (this.trackId === null && metadata?.decoderConfig?.description) {
      const description = metadata.decoderConfig.description;
      const descriptionBytes = description instanceof ArrayBuffer ? new Uint8Array(description) : new Uint8Array(description.buffer, description.byteOffset, description.byteLength);
      const avcDecoderConfigRecord = descriptionBytes.slice().buffer;
      this.trackId = this.mp4File.addTrack({
        timescale: 9e4,
        width: this.width,
        height: this.height,
        type: "avc1",
        avcDecoderConfigRecord
      });
    }
    if (this.trackId === null) {
      this.droppedChunkCountWithoutTrack += 1;
      console.warn("[VideoRecorder] dropping chunk: no track yet");
      return;
    }
    const durationMicros = typeof chunk.duration === "number" && Number.isFinite(chunk.duration) && chunk.duration > 0 ? Math.max(1, Math.round(chunk.duration)) : this.frameDurationMicros;
    const timestampMicros = Number.isFinite(chunk.timestamp) && chunk.timestamp >= 0 ? Math.round(chunk.timestamp) : this.sampleCount * this.frameDurationMicros;
    const durationTicks = Math.max(1, Math.round(durationMicros * MP4_TIMESCALE / MICROS_PER_SECOND));
    const dtsTicks = Math.max(0, Math.round(timestampMicros * MP4_TIMESCALE / MICROS_PER_SECOND));
    this.mp4File.addSample(this.trackId, data, {
      duration: durationTicks,
      dts: dtsTicks,
      cts: dtsTicks,
      is_sync: chunk.type === "key"
    });
    this.sampleCount += 1;
  }
}
const DEFAULT_VIDEO_CAPTURE_FPS = 60;
const normalizeExtension = (extension) => {
  const normalized = String(extension ?? "png").toLowerCase();
  if (normalized === "png") return "png";
  if (normalized === "jpg" || normalized === "jpeg") return "jpg";
  if (normalized === "webp") return "webp";
  throw new Error(`Unsupported extension "${extension}". Use png, jpg, or webp.`);
};
const resolveMimeType = (extension) => {
  if (extension === "png") return "image/png";
  if (extension === "jpg") return "image/jpeg";
  return "image/webp";
};
const resolvePositiveNumber = (value, fallback, label, context = "captureFrameSequence") => {
  if (typeof value === "undefined" || value === null) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${context}: ${label} must be a finite number greater than 0.`);
  }
  if (value <= 0) throw new Error(`${context}: ${label} must be greater than 0.`);
  return value;
};
const resolveOptionalPositiveInteger = (value, fallback, label, context = "captureFrameSequence") => {
  if (typeof value === "undefined" || value === null) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${context}: ${label} must be a finite number greater than 0.`);
  }
  const parsed = Math.floor(value);
  if (parsed <= 0) throw new Error(`${context}: ${label} must be greater than 0.`);
  return parsed;
};
const resolveOptionalPositiveEvenInteger = (value, fallback, label, context = "captureFrameSequence") => {
  if (typeof value === "undefined" || value === null) return normalizeEvenCanvasDimension(fallback, 2);
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${context}: ${label} must be a finite number greater than 0.`);
  }
  const parsed = Math.floor(value);
  if (parsed <= 0) throw new Error(`${context}: ${label} must be greater than 0.`);
  return normalizeEvenCanvasDimension(parsed, fallback);
};
const FRAME_COUNT_EPSILON = 1e-9;
const resolveFrameCountFromDuration = (duration, fps, context) => {
  const rawFrameCount = duration * fps;
  if (!Number.isFinite(rawFrameCount) || rawFrameCount <= 0) {
    throw new Error(`${context}: duration * fps must be a finite number greater than 0.`);
  }
  return Math.max(1, Math.ceil(rawFrameCount - FRAME_COUNT_EPSILON));
};
const resolveTotalFrames = ({
  totalFrames,
  duration,
  fps,
  context
}) => {
  if (typeof totalFrames !== "undefined" && totalFrames !== null) {
    return resolveOptionalPositiveInteger(totalFrames, 1, "totalFrames", context);
  }
  const safeDuration = resolvePositiveNumber(duration, 1, "duration", context);
  return resolveFrameCountFromDuration(safeDuration, fps, context);
};
const resolveQuality = (extension, quality) => {
  if (extension === "png") return void 0;
  if (quality === void 0 || quality === null) return void 0;
  if (typeof quality !== "number" || !Number.isFinite(quality) || quality < 0 || quality > 1) {
    throw new Error("captureFrameSequence: quality must be a finite number between 0 and 1.");
  }
  return quality;
};
const nextAnimationFrame = () => new Promise((resolve) => {
  requestAnimationFrame(resolve);
});
const wait = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});
const toBlob = (canvas, mimeType, quality) => new Promise((resolve, reject) => {
  canvas.toBlob(
    (blob) => {
      if (!blob) {
        reject(new Error("Canvas toBlob() returned null."));
        return;
      }
      resolve(blob);
    },
    mimeType,
    quality
  );
});
const frameDigits = (totalFrames) => Math.max(3, String(Math.max(0, totalFrames - 1)).length);
const frameFileName = (prefix, frame, totalFrames, extension) => {
  const digits = frameDigits(totalFrames);
  const index = String(frame).padStart(digits, "0");
  return `${prefix}-${index}.${extension}`;
};
const saveBlobToDirectory = async (directoryHandle, fileName, blob) => {
  const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
};
const saveBlobAsDownload = (fileName, blob) => {
  if (typeof document === "undefined") {
    throw new Error("captureFrameSequence: downloadFallback requires a browser document context.");
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};
const waitForGPUQueue = async (runtime) => {
  const queue = runtime.renderer.device?.queue;
  if (!queue || typeof queue.onSubmittedWorkDone !== "function") return;
  await queue.onSubmittedWorkDone();
};
const captureFrameSequence = async (options) => {
  const canvas = options.canvas;
  if (!canvas || typeof canvas.toBlob !== "function") {
    throw new Error("captureFrameSequence: options.canvas must be an HTMLCanvasElement.");
  }
  if (typeof options.step !== "function") {
    throw new Error("captureFrameSequence: options.step(frameInfo) is required.");
  }
  const fps = resolvePositiveNumber(options.fps, 30, "fps");
  const extension = normalizeExtension(options.extension);
  const mimeType = resolveMimeType(extension);
  const quality = resolveQuality(extension, options.quality);
  const deltaTime = 1 / fps;
  const fallbackCanvasWidth = Number.isFinite(canvas.width) ? normalizeEvenCanvasDimension(canvas.width, 2) : 2;
  const fallbackCanvasHeight = Number.isFinite(canvas.height) ? normalizeEvenCanvasDimension(canvas.height, 2) : 2;
  const totalFrames = resolveTotalFrames({
    totalFrames: options.totalFrames,
    duration: options.duration,
    fps,
    context: "captureFrameSequence"
  });
  const duration = totalFrames / fps;
  const width = resolveOptionalPositiveEvenInteger(options.width, fallbackCanvasWidth, "width");
  const height = resolveOptionalPositiveEvenInteger(options.height, fallbackCanvasHeight, "height");
  const prefix = String(options.prefix ?? "frame");
  const waitForRAF = options.waitForRAF === true;
  const downloadFallback = options.downloadFallback !== false;
  const onFrameBlob = options.onFrameBlob;
  const hasFrameBlobListener = typeof onFrameBlob === "function";
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  let directoryHandle = options.directoryHandle ?? null;
  if (!directoryHandle && options.pickDirectory) {
    if (typeof window === "undefined" || typeof window.showDirectoryPicker !== "function") {
      throw new Error("captureFrameSequence: showDirectoryPicker() is not available in this browser.");
    }
    directoryHandle = await window.showDirectoryPicker({ mode: "readwrite" });
  }
  const shouldDownload = !directoryHandle && !hasFrameBlobListener && downloadFallback;
  if (!directoryHandle && !hasFrameBlobListener && !shouldDownload) {
    throw new Error(
      "captureFrameSequence: no output target. Pass directoryHandle, set pickDirectory, provide onFrameBlob, or enable downloadFallback."
    );
  }
  for (let frame = 0; frame < totalFrames; frame += 1) {
    if (options.signal?.aborted) {
      throw new Error("Capture aborted.");
    }
    const time = frame * deltaTime;
    const playhead = totalFrames <= 1 ? 0 : frame / (totalFrames - 1);
    await options.step({
      frame,
      totalFrames,
      fps,
      time,
      deltaTime,
      playhead,
      duration,
      width: canvas.width,
      height: canvas.height,
      canvas
    });
    if (waitForRAF) {
      await nextAnimationFrame();
    }
    const blob = await toBlob(canvas, mimeType, quality);
    const fileName = frameFileName(prefix, frame, totalFrames, extension);
    if (directoryHandle) {
      await saveBlobToDirectory(directoryHandle, fileName, blob);
    }
    if (hasFrameBlobListener) {
      await onFrameBlob({
        frame,
        frameNumber: frame + 1,
        totalFrames,
        fileName,
        blob
      });
    }
    if (shouldDownload) {
      saveBlobAsDownload(fileName, blob);
    }
    if (typeof options.onProgress === "function") {
      options.onProgress({
        frame,
        frameNumber: frame + 1,
        totalFrames,
        fileName,
        percent: (frame + 1) / totalFrames * 100
      });
    }
  }
  const digits = frameDigits(totalFrames);
  return {
    fps,
    width: canvas.width,
    height: canvas.height,
    totalFrames,
    duration,
    prefix,
    extension,
    ffmpegPattern: `${prefix}-%0${digits}d.${extension}`
  };
};
const activeRuntimeCaptures = /* @__PURE__ */ new WeakSet();
const captureHydraFrameSequence = async (options) => {
  const runtime = options.runtime;
  if (!runtime) {
    throw new Error("captureHydraFrameSequence: options.runtime is required.");
  }
  if (activeRuntimeCaptures.has(runtime)) {
    throw new Error("captureHydraFrameSequence: a capture is already in progress for this runtime.");
  }
  const {
    output,
    step,
    waitForGPU = true,
    resumeAfterCapture = true,
    restoreResolution = true,
    ignoreEngineFpsGate = true,
    gpuReadback = "auto",
    readbackFormat = "rgba16float",
    onFrameBuffer,
    width,
    height,
    ...captureOptions
  } = options;
  await runtime.init();
  const synth = runtime.synth;
  const wasRunning = runtime.host.isRunning;
  const previousWidth = runtime.host.canvas.width;
  const previousHeight = runtime.host.canvas.height;
  const restoreWidth = normalizeEvenCanvasDimension(previousWidth, 1280);
  const restoreHeight = normalizeEvenCanvasDimension(previousHeight, 720);
  const hasFpsBinding = Object.prototype.hasOwnProperty.call(synth, "fps");
  const previousFpsBinding = synth.fps;
  const shouldResize = Number.isFinite(width) || Number.isFinite(height) || previousWidth !== restoreWidth || previousHeight !== restoreHeight;
  const nextWidth = Number.isFinite(width) ? resolveOptionalPositiveEvenInteger(width, previousWidth, "width", "captureHydraFrameSequence") : restoreWidth;
  const nextHeight = Number.isFinite(height) ? resolveOptionalPositiveEvenInteger(height, previousHeight, "height", "captureHydraFrameSequence") : restoreHeight;
  const device = runtime.renderer?.device ?? null;
  const useGpuReadback = gpuReadback === true ? true : gpuReadback === "auto" ? device !== null : false;
  if (gpuReadback === true && !device) {
    throw new Error("captureHydraFrameSequence: gpuReadback is enabled but no WebGPU device is available.");
  }
  activeRuntimeCaptures.add(runtime);
  runtime.stop();
  if (output) {
    runtime.render(output);
  }
  if (shouldResize) {
    runtime.setResolution(nextWidth, nextHeight);
  }
  if (ignoreEngineFpsGate) {
    synth.fps = void 0;
  }
  let captureFailed = false;
  let restoreError = null;
  const readbackBuffers = [];
  let pendingReadback = null;
  const resolveActiveOutput = () => {
    if (output) return output;
    const runtimeAny = runtime;
    if (typeof runtimeAny.getActiveOutput === "function") {
      return runtimeAny.getActiveOutput();
    }
    return runtime.outputs?.[0] ?? null;
  };
  const flushPendingReadback = async () => {
    if (!pendingReadback) return;
    const pending = pendingReadback;
    pendingReadback = null;
    const { data, unmap } = await mapReadbackBuffer(pending.bufferInfo.buffer);
    try {
      if (typeof onFrameBuffer === "function") {
        await onFrameBuffer({
          frame: pending.frame,
          totalFrames: pending.totalFrames,
          data,
          width: pending.width,
          height: pending.height,
          format: readbackFormat,
          bytesPerRow: pending.bufferInfo.paddedBytesPerRow
        });
      }
    } finally {
      unmap();
    }
  };
  let intermediateTexture = null;
  const cleanupReadbackBuffers = () => {
    for (const info of readbackBuffers) {
      try {
        info.buffer.destroy();
      } catch {
      }
    }
    readbackBuffers.length = 0;
    if (intermediateTexture) {
      try {
        intermediateTexture.destroy();
      } catch {
      }
      intermediateTexture = null;
    }
  };
  try {
    if (useGpuReadback && device) {
      const fps = resolvePositiveNumber(captureOptions.fps, 30, "fps");
      const extension = normalizeExtension(captureOptions.extension);
      const mimeType = resolveMimeType(extension);
      const quality = resolveQuality(extension, captureOptions.quality);
      const deltaTime = 1 / fps;
      const totalFrames = resolveTotalFrames({
        totalFrames: captureOptions.totalFrames,
        duration: captureOptions.duration,
        fps,
        context: "captureHydraFrameSequence"
      });
      const duration = totalFrames / fps;
      const captureWidth = runtime.host.canvas.width;
      const captureHeight = runtime.host.canvas.height;
      const prefix = String(captureOptions.prefix ?? "frame");
      const hasFrameBlobListener = typeof captureOptions.onFrameBlob === "function";
      const hasFrameBufferListener = typeof onFrameBuffer === "function";
      const waitForRAFLocal = captureOptions.waitForRAF === true;
      let directoryHandle = captureOptions.directoryHandle ?? null;
      if (!directoryHandle && captureOptions.pickDirectory) {
        if (typeof window === "undefined" || typeof window.showDirectoryPicker !== "function") {
          throw new Error("captureFrameSequence: showDirectoryPicker() is not available in this browser.");
        }
        directoryHandle = await window.showDirectoryPicker({ mode: "readwrite" });
      }
      const downloadFallback = captureOptions.downloadFallback !== false;
      const shouldDownload = !directoryHandle && !hasFrameBlobListener && !hasFrameBufferListener && downloadFallback;
      const needsBlob = Boolean(directoryHandle) || hasFrameBlobListener || shouldDownload;
      readbackBuffers.push(
        createReadbackBuffer(device, captureWidth, captureHeight, readbackFormat),
        createReadbackBuffer(device, captureWidth, captureHeight, readbackFormat)
      );
      if (readbackFormat === "rgba8unorm") {
        intermediateTexture = createintermediateConversionTexture(device, captureWidth, captureHeight);
      }
      for (let frame = 0; frame < totalFrames; frame += 1) {
        if (captureOptions.signal?.aborted) {
          throw new Error("Capture aborted.");
        }
        const time = frame * deltaTime;
        const playhead = totalFrames <= 1 ? 0 : frame / (totalFrames - 1);
        if (step) {
          await step({
            frame,
            totalFrames,
            fps,
            time,
            deltaTime,
            playhead,
            duration,
            width: captureWidth,
            height: captureHeight,
            canvas: runtime.host.canvas,
            runtime,
            synth
          });
        } else {
          runtime.tick(deltaTime * 1e3);
        }
        if (waitForGPU) {
          await waitForGPUQueue(runtime);
        }
        await flushPendingReadback();
        const activeOutput = resolveActiveOutput();
        const outputTexture = activeOutput?.getCurrent?.() ?? null;
        if (outputTexture) {
          const bufferIndex = frame % 2;
          const bufferInfo = readbackBuffers[bufferIndex];
          const encoder = device.createCommandEncoder({ label: `hydra-capture-readback-${frame}` });
          if (readbackFormat === "rgba8unorm" && intermediateTexture) {
            readbackTextureWithConversion(device, encoder, outputTexture, bufferInfo, intermediateTexture);
          } else {
            readbackTexture(encoder, outputTexture, bufferInfo);
          }
          device.queue.submit([encoder.finish()]);
          pendingReadback = {
            bufferInfo,
            frame,
            totalFrames,
            width: captureWidth,
            height: captureHeight
          };
        }
        if (needsBlob) {
          if (waitForRAFLocal) {
            await nextAnimationFrame();
          }
          const blob = await toBlob(runtime.host.canvas, mimeType, quality);
          const fileName = frameFileName(prefix, frame, totalFrames, extension);
          if (directoryHandle) {
            await saveBlobToDirectory(directoryHandle, fileName, blob);
          }
          if (hasFrameBlobListener) {
            await captureOptions.onFrameBlob({
              frame,
              frameNumber: frame + 1,
              totalFrames,
              fileName,
              blob
            });
          }
          if (shouldDownload) {
            saveBlobAsDownload(fileName, blob);
          }
        }
        if (typeof captureOptions.onProgress === "function") {
          captureOptions.onProgress({
            frame,
            frameNumber: frame + 1,
            totalFrames,
            fileName: frameFileName(prefix, frame, totalFrames, extension),
            percent: (frame + 1) / totalFrames * 100
          });
        }
      }
      await flushPendingReadback();
      cleanupReadbackBuffers();
      const digits = frameDigits(totalFrames);
      return {
        fps,
        width: captureWidth,
        height: captureHeight,
        totalFrames,
        duration,
        prefix,
        extension,
        ffmpegPattern: `${prefix}-%0${digits}d.${extension}`
      };
    }
    return await captureFrameSequence({
      ...captureOptions,
      canvas: runtime.host.canvas,
      step: async (frameInfo) => {
        if (step) {
          await step({
            ...frameInfo,
            runtime,
            synth
          });
        } else {
          runtime.tick(frameInfo.deltaTime * 1e3);
        }
        if (waitForGPU) {
          await waitForGPUQueue(runtime);
        }
      }
    });
  } catch (error) {
    captureFailed = true;
    cleanupReadbackBuffers();
    throw error;
  } finally {
    try {
      if (ignoreEngineFpsGate) {
        if (hasFpsBinding) synth.fps = previousFpsBinding;
        else delete synth.fps;
      }
      if (restoreResolution && (runtime.host.canvas.width !== restoreWidth || runtime.host.canvas.height !== restoreHeight)) {
        runtime.setResolution(restoreWidth, restoreHeight);
      }
      if (resumeAfterCapture && wasRunning) {
        await runtime.start();
      }
    } catch (error) {
      restoreError = error;
    } finally {
      activeRuntimeCaptures.delete(runtime);
    }
    if (!captureFailed && restoreError) {
      throw restoreError;
    }
  }
};
const captureVideo = async (options) => {
  const {
    canvas,
    step,
    duration,
    fps,
    width,
    height,
    bitrate,
    signal,
    onProgress,
    realtime = false,
    maxEncodeQueue
  } = options;
  if (!canvas) throw new Error("captureVideo: canvas is required.");
  if (typeof step !== "function") throw new Error("captureVideo: step(frameInfo) is required.");
  const safeFps = resolvePositiveNumber(fps, DEFAULT_VIDEO_CAPTURE_FPS, "fps", "captureVideo");
  const safeDuration = resolvePositiveNumber(duration, 1, "duration", "captureVideo");
  const fallbackCanvasWidth = Number.isFinite(canvas.width) ? normalizeEvenCanvasDimension(canvas.width, 2) : 2;
  const fallbackCanvasHeight = Number.isFinite(canvas.height) ? normalizeEvenCanvasDimension(canvas.height, 2) : 2;
  const captureWidth = resolveOptionalPositiveEvenInteger(width, fallbackCanvasWidth, "width", "captureVideo");
  const captureHeight = resolveOptionalPositiveEvenInteger(height, fallbackCanvasHeight, "height", "captureVideo");
  const totalFrames = resolveFrameCountFromDuration(safeDuration, safeFps, "captureVideo");
  const normalizedDuration = totalFrames / safeFps;
  const deltaTime = 1 / safeFps;
  const frameIntervalMs = deltaTime * 1e3;
  if (canvas.width !== captureWidth || canvas.height !== captureHeight) {
    canvas.width = captureWidth;
    canvas.height = captureHeight;
  }
  const recorder = new VideoRecorder({
    width: captureWidth,
    height: captureHeight,
    fps: safeFps,
    ...bitrate != null ? { bitrate } : {},
    ...maxEncodeQueue != null ? { maxEncodeQueue } : {}
  });
  await recorder.start();
  const captureStartMs = realtime && typeof performance !== "undefined" ? performance.now() : 0;
  try {
    for (let frame = 0; frame < totalFrames; frame += 1) {
      if (signal?.aborted) throw new Error("Capture aborted.");
      if (realtime && frame > 0) {
        const targetElapsedMs = frame * frameIntervalMs;
        while (true) {
          if (signal?.aborted) throw new Error("Capture aborted.");
          const elapsedMs = performance.now() - captureStartMs;
          const remainingMs = targetElapsedMs - elapsedMs;
          if (remainingMs <= 0.5) break;
          await wait(Math.min(remainingMs, 8));
        }
      }
      const time = frame * deltaTime;
      const playhead = totalFrames <= 1 ? 0 : frame / (totalFrames - 1);
      await step({
        frame,
        totalFrames,
        fps: safeFps,
        time,
        deltaTime,
        playhead,
        duration: normalizedDuration,
        width: captureWidth,
        height: captureHeight,
        canvas
      });
      await recorder.appendFrame(canvas);
      if (onProgress) onProgress((frame + 1) / totalFrames * 100);
    }
  } catch (err) {
    try {
      await recorder.stop();
    } catch {
    }
    throw err;
  }
  return await recorder.stop();
};
const captureHydraVideo = async (options) => {
  const runtime = options.runtime;
  if (!runtime) throw new Error("captureHydraVideo: runtime is required");
  if (activeRuntimeCaptures.has(runtime)) {
    throw new Error("captureHydraVideo: a capture is already in progress");
  }
  const {
    output,
    step,
    waitForGPU = true,
    resumeAfterCapture = true,
    restoreResolution = true,
    ignoreEngineFpsGate = true,
    width,
    height,
    duration,
    fps,
    bitrate,
    maxEncodeQueue,
    signal,
    onProgress,
    realtime = false
  } = options;
  const safeFps = resolvePositiveNumber(fps, DEFAULT_VIDEO_CAPTURE_FPS, "fps", "captureHydraVideo");
  const safeDuration = resolvePositiveNumber(duration, 1, "duration", "captureHydraVideo");
  await runtime.init();
  const hasGpuDevice = Boolean(runtime.renderer?.device);
  if (hasGpuDevice) {
    const recorder = new VideoRecorder({
      width: Number.isFinite(width) ? resolveOptionalPositiveEvenInteger(width, runtime.host.canvas.width, "width", "captureHydraVideo") : normalizeEvenCanvasDimension(runtime.host.canvas.width, 1280),
      height: Number.isFinite(height) ? resolveOptionalPositiveEvenInteger(height, runtime.host.canvas.height, "height", "captureHydraVideo") : normalizeEvenCanvasDimension(runtime.host.canvas.height, 720),
      fps: safeFps,
      ...bitrate != null ? { bitrate } : {},
      ...maxEncodeQueue != null ? { maxEncodeQueue } : {}
    });
    await recorder.start();
    let finalized = false;
    let stagingCanvas = null;
    let stagingContext = null;
    let stagingImageData = null;
    const frameIntervalMs = 1 / safeFps * 1e3;
    const captureStartMs = realtime && typeof performance !== "undefined" ? performance.now() : 0;
    try {
      await captureHydraFrameSequence({
        runtime,
        output,
        width,
        height,
        fps: safeFps,
        duration: safeDuration,
        signal,
        waitForGPU,
        resumeAfterCapture,
        restoreResolution,
        ignoreEngineFpsGate,
        gpuReadback: true,
        readbackFormat: "rgba8unorm",
        step: async (frameInfo) => {
          if (realtime && frameInfo.frame > 0) {
            const targetElapsedMs = frameInfo.frame * frameIntervalMs;
            while (true) {
              if (signal?.aborted) throw new Error("Capture aborted.");
              const elapsedMs = performance.now() - captureStartMs;
              const remainingMs = targetElapsedMs - elapsedMs;
              if (remainingMs <= 0.5) break;
              await wait(Math.min(remainingMs, 8));
            }
          }
          if (step) {
            await step(frameInfo);
          } else {
            runtime.tick(frameInfo.deltaTime * 1e3);
          }
        },
        onFrameBuffer: async ({ frame, totalFrames, data, width: frameWidth, height: frameHeight, bytesPerRow }) => {
          if (signal?.aborted) throw new Error("Capture aborted.");
          if (!stagingCanvas) {
            stagingCanvas = document.createElement("canvas");
            stagingCanvas.width = frameWidth;
            stagingCanvas.height = frameHeight;
            stagingContext = stagingCanvas.getContext("2d", { willReadFrequently: true });
            if (!stagingContext) {
              throw new Error("captureHydraVideo: unable to acquire 2D context for staging canvas.");
            }
            stagingImageData = stagingContext.createImageData(frameWidth, frameHeight);
          }
          const pixels = stripRowPadding(data, frameWidth, frameHeight, bytesPerRow);
          stagingImageData.data.set(pixels);
          stagingContext.putImageData(stagingImageData, 0, 0);
          await recorder.appendFrame(stagingCanvas);
          if (onProgress) {
            onProgress((frame + 1) / totalFrames * 100);
          }
        }
      });
      const blob = await recorder.stop();
      finalized = true;
      return blob;
    } catch (error) {
      if (!finalized) {
        try {
          await recorder.stop();
        } catch {
        }
      }
      throw error;
    }
  }
  const synth = runtime.synth;
  const wasRunning = runtime.host.isRunning;
  const previousWidth = runtime.host.canvas.width;
  const previousHeight = runtime.host.canvas.height;
  const restoreWidth = normalizeEvenCanvasDimension(previousWidth, 1280);
  const restoreHeight = normalizeEvenCanvasDimension(previousHeight, 720);
  const hasFpsBinding = Object.prototype.hasOwnProperty.call(synth, "fps");
  const previousFpsBinding = synth.fps;
  const shouldResize = Number.isFinite(width) || Number.isFinite(height) || previousWidth !== restoreWidth || previousHeight !== restoreHeight;
  const nextWidth = Number.isFinite(width) ? resolveOptionalPositiveEvenInteger(width, previousWidth, "width", "captureHydraVideo") : restoreWidth;
  const nextHeight = Number.isFinite(height) ? resolveOptionalPositiveEvenInteger(height, previousHeight, "height", "captureHydraVideo") : restoreHeight;
  activeRuntimeCaptures.add(runtime);
  runtime.stop();
  if (output) runtime.render(output);
  if (shouldResize) runtime.setResolution(nextWidth, nextHeight);
  if (ignoreEngineFpsGate) synth.fps = void 0;
  let captureFailed = false;
  let restoreError = null;
  try {
    return await captureVideo({
      duration: safeDuration,
      fps: safeFps,
      width: nextWidth,
      height: nextHeight,
      ...bitrate != null ? { bitrate } : {},
      ...maxEncodeQueue != null ? { maxEncodeQueue } : {},
      ...signal ? { signal } : {},
      ...onProgress ? { onProgress } : {},
      realtime,
      canvas: runtime.host.canvas,
      step: async (frameInfo) => {
        if (step) {
          await step({ ...frameInfo, runtime, synth });
        } else {
          runtime.tick(frameInfo.deltaTime * 1e3);
        }
        if (waitForGPU) {
          await waitForGPUQueue(runtime);
        }
      }
    });
  } catch (error) {
    captureFailed = true;
    throw error;
  } finally {
    try {
      if (ignoreEngineFpsGate) {
        if (hasFpsBinding) synth.fps = previousFpsBinding;
        else delete synth.fps;
      }
      if (restoreResolution && shouldResize) {
        runtime.setResolution(restoreWidth, restoreHeight);
      }
      if (resumeAfterCapture && wasRunning) {
        await runtime.start();
      }
    } catch (e) {
      restoreError = e;
    } finally {
      activeRuntimeCaptures.delete(runtime);
    }
    if (!captureFailed && restoreError) throw restoreError;
  }
};
const MAX_DYNAMIC_UNIFORMS = 256;
const OUTPUT_TEXTURE_FORMAT = "rgba16float";
const createOutputTextureUsage = ({ includeRenderAttachment = true } = {}) => {
  let usage = GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC;
  if (includeRenderAttachment) usage |= GPUTextureUsage.RENDER_ATTACHMENT;
  return usage;
};
const MAX_SCALED_TEXTURE_PAIRS = 8;
const MAX_BIND_GROUP_CACHE_ENTRIES = 64;
const DEFAULT_HISTORY_DEPTH = 0;
class WebGPUOutputNode {
  static liveNodes = /* @__PURE__ */ new Set();
  static refreshHistoryDepths() {
    for (const target of WebGPUOutputNode.liveNodes) {
      let externalDepth = DEFAULT_HISTORY_DEPTH;
      for (const requester of WebGPUOutputNode.liveNodes) {
        if (requester === target) continue;
        const requested = requester.outboundHistoryRequests.get(target.id);
        if (typeof requested === "number" && Number.isFinite(requested)) {
          externalDepth = Math.max(externalDepth, Math.max(1, Math.floor(requested)));
        }
      }
      const nextDepth = Math.max(target.ownHistoryDepth, externalDepth);
      if (nextDepth === target.historyDepth) continue;
      target.historyDepth = nextDepth;
      target.resetHistoryTextures();
      target.ensureHistoryTextures();
    }
  }
  label;
  id = -1;
  renderer;
  width;
  height;
  pingPongIndex = 0;
  textures = [null, null];
  passDynamicUniformBuffers = [];
  dynamicUniformData = new Float32Array(MAX_DYNAMIC_UNIFORMS);
  activePasses = [];
  activeSourcePasses = [];
  pendingPasses = null;
  activePipelineEntries = [];
  reportedPipelineErrors = /* @__PURE__ */ new Set();
  pipelineErrorHandler = null;
  bindGroupCache = /* @__PURE__ */ new Map();
  resolvedTexturesScratch = [];
  scaledTexturePairs = /* @__PURE__ */ new Map();
  transientWriteTexturePools = /* @__PURE__ */ new Map();
  graphSource = null;
  graphRenderHandler = null;
  inGraphRenderCycle = false;
  samplerFilter = "nearest";
  historyTextures = [];
  historyCursor = -1;
  historyCount = 0;
  historyDepth = DEFAULT_HISTORY_DEPTH;
  ownHistoryDepth = DEFAULT_HISTORY_DEPTH;
  outboundHistoryRequests = /* @__PURE__ */ new Map();
  frameInputTexture = null;
  lastOutputTexture = null;
  passOutputHistory = [];
  frameCounter = 0;
  frameOrdinal = 0;
  frameEvents = /* @__PURE__ */ new Set();
  passStats = /* @__PURE__ */ new Map();
  constructor({ renderer, label = "", width, height }) {
    this.renderer = renderer;
    this.label = label;
    this.width = width;
    this.height = height;
    WebGPUOutputNode.liveNodes.add(this);
  }
  setPipelineErrorHandler(handler) {
    this.pipelineErrorHandler = handler;
  }
  setNearest() {
    this.samplerFilter = "nearest";
    return this;
  }
  setLinear() {
    this.samplerFilter = "linear";
    return this;
  }
  setGraphRenderHandler(handler) {
    this.graphRenderHandler = handler;
  }
  getGraphSource() {
    return this.graphSource;
  }
  clearGraphSource() {
    this.graphSource = null;
  }
  renderGraph(source) {
    this.graphSource = source;
    if (!this.graphRenderHandler) {
      this.inGraphRenderCycle = true;
      try {
        this.render(source.compilePasses());
      } finally {
        this.inGraphRenderCycle = false;
      }
      return;
    }
    this.inGraphRenderCycle = true;
    try {
      this.graphRenderHandler(this, source);
    } finally {
      this.inGraphRenderCycle = false;
    }
  }
  emitEvent(name) {
    if (!name) return;
    this.frameEvents.add(name);
  }
  attachRenderer(renderer) {
    this.destroyPassDynamicUniformBuffers();
    this.renderer = renderer;
    this.invalidateBindGroupCache();
    this.ensureResources();
  }
  ensureResources() {
    if (!this.renderer || !this.renderer.ready) return;
    if (!this.textures[0] || !this.textures[1]) {
      this.createPingPongTextures();
    }
  }
  createPingPongTextures() {
    if (!this.renderer || !this.renderer.ready) return;
    this.textures.forEach((texture) => {
      if (texture) texture.destroy();
    });
    this.destroyTransientWriteTexturePools();
    this.textures = [0, 1].map((index) => this.renderer?.createOutputTexture({
      width: this.width,
      height: this.height,
      label: `${this.label}-pingpong-${index}`
    }) ?? null);
    this.pingPongIndex = 0;
    this.lastOutputTexture = this.textures[this.pingPongIndex];
    this.passOutputHistory = [];
    this.resetHistoryTextures();
    this.ensureHistoryTextures();
    this.invalidateBindGroupCache();
  }
  destroyPassDynamicUniformBuffers() {
    this.passDynamicUniformBuffers.forEach((buffer) => {
      if (buffer) buffer.destroy();
    });
    this.passDynamicUniformBuffers = [];
  }
  restorePassDynamicUniformBuffers(previousSourcePasses, previousBuffers, nextSourcePasses) {
    const restored = new Array(nextSourcePasses.length).fill(null);
    const bufferBucketsBySignature = /* @__PURE__ */ new Map();
    for (let index = 0; index < previousSourcePasses.length; index += 1) {
      const previousPass = previousSourcePasses[index];
      const previousBuffer = previousBuffers[index];
      if (!previousPass || !previousBuffer) continue;
      const bucket = bufferBucketsBySignature.get(previousPass.signature);
      if (bucket) bucket.push(previousBuffer);
      else bufferBucketsBySignature.set(previousPass.signature, [previousBuffer]);
    }
    for (let index = 0; index < nextSourcePasses.length; index += 1) {
      const nextPass = nextSourcePasses[index];
      if (!nextPass || nextPass.uniforms.length === 0) continue;
      const reusableBucket = bufferBucketsBySignature.get(nextPass.signature);
      const reusableBuffer = reusableBucket?.shift() ?? null;
      if (reusableBuffer) {
        restored[index] = reusableBuffer;
        continue;
      }
      if (!this.renderer || !this.renderer.ready) continue;
      restored[index] = this.renderer.createDynamicUniformBuffer(`${this.label}-dynamic-uniforms-pass-${index}`);
    }
    for (const bucket of bufferBucketsBySignature.values()) {
      for (const staleBuffer of bucket) {
        staleBuffer.destroy();
      }
    }
    return restored;
  }
  getScaleKey(width, height) {
    return `${width}x${height}`;
  }
  destroyScaledTexturePairs() {
    this.scaledTexturePairs.forEach((pair) => {
      pair.textures.forEach((texture) => {
        if (texture) texture.destroy();
      });
    });
    this.scaledTexturePairs.clear();
  }
  pruneScaledTexturePairs() {
    if (this.scaledTexturePairs.size <= MAX_SCALED_TEXTURE_PAIRS) return;
    const entries = Array.from(this.scaledTexturePairs.entries()).sort((left, right) => left[1].lastUsedFrame - right[1].lastUsedFrame);
    const overflow = this.scaledTexturePairs.size - MAX_SCALED_TEXTURE_PAIRS;
    for (let index = 0; index < overflow; index += 1) {
      const candidate = entries[index];
      if (!candidate) break;
      const [key, pair] = candidate;
      this.scaledTexturePairs.delete(key);
      pair.textures.forEach((texture) => {
        if (texture) texture.destroy();
      });
    }
  }
  destroyTransientWriteTexturePools() {
    this.transientWriteTexturePools.forEach((pool) => {
      pool.textures.forEach((texture) => texture.destroy());
    });
    this.transientWriteTexturePools.clear();
  }
  resetHistoryTextures() {
    this.historyTextures.forEach((texture) => {
      if (texture) texture.destroy();
    });
    this.historyTextures = [];
    this.historyCursor = -1;
    this.historyCount = 0;
  }
  ensureHistoryTextures() {
    if (!this.renderer || !this.renderer.ready) return;
    const depth = Math.max(DEFAULT_HISTORY_DEPTH, this.historyDepth);
    if (depth <= 0) {
      this.resetHistoryTextures();
      return;
    }
    if (this.historyTextures.length === depth && this.historyTextures.every(Boolean)) return;
    this.resetHistoryTextures();
    this.historyTextures = new Array(depth).fill(null).map((_, index) => this.renderer?.createOutputTexture({
      width: this.width,
      height: this.height,
      label: `${this.label}-history-${index}`,
      includeRenderAttachment: false
    }) ?? null);
  }
  updateRequiredHistoryDepth(passes) {
    let requiredDepth = DEFAULT_HISTORY_DEPTH;
    const outboundRequests = /* @__PURE__ */ new Map();
    const queue = passes.slice();
    const visited = /* @__PURE__ */ new Set();
    while (queue.length > 0) {
      const candidate = queue.pop();
      if (!candidate) break;
      if (visited.has(candidate.signature)) continue;
      visited.add(candidate.signature);
      candidate.textures.forEach((textureBinding) => {
        const source = textureBinding.sourceRef;
        if (!source || typeof source !== "object") return;
        if ("id" in source) {
          const targetId2 = source.id;
          if (typeof targetId2 === "number" && Number.isInteger(targetId2) && targetId2 >= 0 && targetId2 === this.id) {
            requiredDepth = Math.max(requiredDepth, 1);
          }
        }
        if (!("historyOffset" in source)) return;
        const offset = source.historyOffset;
        if (typeof offset !== "number" || !Number.isFinite(offset)) return;
        const normalizedOffset = Math.max(1, Math.floor(offset));
        const targetId = source.id;
        if (typeof targetId === "number" && Number.isInteger(targetId) && targetId >= 0 && targetId !== this.id) {
          const existing = outboundRequests.get(targetId) ?? DEFAULT_HISTORY_DEPTH;
          outboundRequests.set(targetId, Math.max(existing, normalizedOffset));
          return;
        }
        requiredDepth = Math.max(requiredDepth, normalizedOffset);
      });
    }
    this.ownHistoryDepth = requiredDepth;
    this.outboundHistoryRequests = outboundRequests;
    WebGPUOutputNode.refreshHistoryDepths();
  }
  resolveHistoryTexture(historyOffset) {
    const depth = this.historyTextures.length;
    if (depth === 0 || this.historyCount <= 0 || historyOffset <= 0) return null;
    if (historyOffset > this.historyCount) return null;
    const offset = historyOffset - 1;
    const index = (this.historyCursor - offset + depth) % depth;
    return this.historyTextures[index] ?? null;
  }
  resolveHistoryTargetOutput(sourceRef) {
    if (!sourceRef || typeof sourceRef !== "object") return this;
    const candidateId = sourceRef.id;
    if (typeof candidateId !== "number" || !Number.isInteger(candidateId) || candidateId < 0) return this;
    if (candidateId === this.id) return this;
    for (const candidate of WebGPUOutputNode.liveNodes) {
      if (candidate.id !== candidateId) continue;
      if (candidate.renderer !== this.renderer) continue;
      return candidate;
    }
    return null;
  }
  recordHistoryTexture(texture, sourceWidth, sourceHeight, encoder) {
    if (!texture || this.historyDepth <= 0) return;
    if (!this.renderer || !this.renderer.ready) return;
    this.ensureHistoryTextures();
    if (this.historyTextures.length === 0) return;
    const copyTexture = encoder.copyTextureToTexture;
    if (typeof copyTexture !== "function") return;
    const depth = this.historyTextures.length;
    const nextCursor = (this.historyCursor + 1) % depth;
    const destination = this.historyTextures[nextCursor];
    if (!destination) return;
    const copyWidth = Math.max(1, Math.min(this.width, Math.floor(sourceWidth)));
    const copyHeight = Math.max(1, Math.min(this.height, Math.floor(sourceHeight)));
    copyTexture.call(
      encoder,
      { texture },
      { texture: destination },
      {
        width: copyWidth,
        height: copyHeight,
        depthOrArrayLayers: 1
      }
    );
    this.historyCursor = nextCursor;
    this.historyCount = Math.min(depth, this.historyCount + 1);
  }
  getOrCreateScaledTexturePair(width, height) {
    const key = this.getScaleKey(width, height);
    const cached = this.scaledTexturePairs.get(key);
    if (cached && cached.textures[0] && cached.textures[1]) return cached;
    if (!this.renderer || !this.renderer.ready) {
      return {
        textures: [null, null],
        currentIndex: 0,
        lastUsedFrame: this.frameOrdinal
      };
    }
    if (cached) {
      cached.textures.forEach((texture) => {
        if (texture) texture.destroy();
      });
    }
    const created = {
      textures: [0, 1].map((index) => this.renderer?.createOutputTexture({
        width,
        height,
        label: `${this.label}-scaled-${width}x${height}-${index}`
      }) ?? null),
      currentIndex: 0,
      lastUsedFrame: this.frameOrdinal
    };
    this.scaledTexturePairs.set(key, created);
    return created;
  }
  getOrCreateTransientWriteTexture(width, height, avoidTextures = []) {
    if (!this.renderer || !this.renderer.ready) return null;
    const key = this.getScaleKey(width, height);
    const avoid = new Set(avoidTextures.filter((texture) => Boolean(texture)));
    const cached = this.transientWriteTexturePools.get(key);
    if (cached && cached.textures.length > 0) {
      cached.lastUsedFrame = this.frameOrdinal;
      for (let offset = 0; offset < cached.textures.length; offset += 1) {
        const index = (cached.cursor + offset) % cached.textures.length;
        const candidate = cached.textures[index];
        if (avoid.has(candidate)) continue;
        cached.cursor = (index + 1) % cached.textures.length;
        return candidate;
      }
      const created2 = this.renderer.createOutputTexture({
        width,
        height,
        label: `${this.label}-transient-write-${width}x${height}-${cached.textures.length}`
      });
      cached.textures.push(created2);
      cached.cursor = cached.textures.length % cached.textures.length;
      return created2;
    }
    const created = this.renderer.createOutputTexture({
      width,
      height,
      label: `${this.label}-transient-write-${width}x${height}-0`
    });
    this.transientWriteTexturePools.set(key, {
      textures: [created],
      cursor: 0,
      lastUsedFrame: this.frameOrdinal
    });
    return created;
  }
  getInternalPassLastUseByIndex(passes) {
    const lastUseByIndex = /* @__PURE__ */ new Map();
    passes.forEach((pass, passIndex) => {
      pass.textures.forEach((textureBinding) => {
        const source = textureBinding.sourceRef;
        if (!source || typeof source !== "object" || !("internalPassIndex" in source)) return;
        const internalPassIndex = source.internalPassIndex;
        if (typeof internalPassIndex !== "number" || !Number.isInteger(internalPassIndex) || internalPassIndex < 0) return;
        const current = lastUseByIndex.get(internalPassIndex) ?? -1;
        if (passIndex > current) lastUseByIndex.set(internalPassIndex, passIndex);
      });
    });
    return lastUseByIndex;
  }
  getProtectedPassOutputTextures(passIndex, lastUseByIndex) {
    const protectedTextures = [];
    lastUseByIndex.forEach((lastUse, sourcePassIndex) => {
      if (sourcePassIndex >= passIndex || lastUse < passIndex) return;
      protectedTextures.push(this.passOutputHistory[sourcePassIndex] ?? null);
    });
    return protectedTextures;
  }
  isTextureBeingSampled(texture, sampledTextures) {
    return Boolean(texture) && sampledTextures.some((sampled) => sampled === texture);
  }
  normalizeResolutionScale(value) {
    const scale = Number(value ?? 1);
    if (!Number.isFinite(scale) || scale <= 0) return 1;
    return scale;
  }
  getPassDimensions(pass) {
    const scale = this.normalizeResolutionScale(pass.schedule?.resolutionScale);
    const width = Math.max(1, Math.floor(this.width * scale));
    const height = Math.max(1, Math.floor(this.height * scale));
    return [width, height];
  }
  resize(width, height) {
    this.width = width;
    this.height = height;
    this.invalidateBindGroupCache();
    this.destroyScaledTexturePairs();
    this.destroyTransientWriteTexturePools();
    this.passOutputHistory = [];
    this.resetHistoryTextures();
    if (this.renderer && this.renderer.ready) this.createPingPongTextures();
  }
  getCurrent() {
    return this.lastOutputTexture ?? this.textures[this.pingPongIndex];
  }
  getTexture() {
    return this.lastOutputTexture ?? this.textures[this.pingPongIndex];
  }
  getPassStats() {
    const snapshot = {};
    this.passStats.forEach((value, signature) => {
      snapshot[signature] = {
        runCount: value.runCount,
        lastCpuEncodeMs: value.lastCpuEncodeMs,
        avgCpuEncodeMs: value.avgCpuEncodeMs,
        lastGpuMs: value.lastGpuMs,
        avgGpuMs: value.avgGpuMs,
        gpuTimingSource: value.gpuTimingSource,
        fallbackCount: value.fallbackCount,
        variant: value.variant
      };
    });
    return snapshot;
  }
  render(passes) {
    if (!this.inGraphRenderCycle) this.clearGraphSource();
    this.pendingPasses = passes.slice();
    this.reportedPipelineErrors.clear();
    this.updateRequiredHistoryDepth(this.pendingPasses);
    if (this.renderer && this.renderer.ready) {
      for (const pass of this.pendingPasses) {
        this.renderer.getOutputPipelineEntry(pass.signature, pass.wgsl);
      }
    }
  }
  getDependencyOutputIds() {
    const dependencies = /* @__PURE__ */ new Set();
    const trackedPasses = this.pendingPasses ?? this.activePasses;
    for (const pass of trackedPasses) {
      for (const textureBinding of pass.textures) {
        if (textureBinding.isPrev) continue;
        const sourceRef = textureBinding.sourceRef;
        if (!sourceRef || typeof sourceRef !== "object") continue;
        const candidateId = sourceRef.id;
        if (typeof candidateId === "number" && Number.isInteger(candidateId) && candidateId >= 0 && candidateId !== this.id) {
          dependencies.add(candidateId);
        }
      }
    }
    return Array.from(dependencies);
  }
  reportPipelineErrorOnce(errorKey, context) {
    if (this.reportedPipelineErrors.has(errorKey)) return;
    this.reportedPipelineErrors.add(errorKey);
    if (this.pipelineErrorHandler) this.pipelineErrorHandler(context);
  }
  invalidateBindGroupCache() {
    this.bindGroupCache.clear();
  }
  nowMs() {
    if (typeof performance !== "undefined" && typeof performance.now === "function") return performance.now();
    return Date.now();
  }
  estimateGpuMs(_cpuEncodeMs, existing) {
    if (existing?.gpuTimingSource === "timestamp_query" && existing.lastGpuMs != null && Number.isFinite(existing.lastGpuMs)) {
      return {
        value: Math.max(0, existing.lastGpuMs),
        source: "history_fallback"
      };
    }
    return {
      value: null,
      source: "unavailable"
    };
  }
  recordPassStat(signature, cpuEncodeMs, fallbackUsed, variant) {
    const safeMs = Number.isFinite(cpuEncodeMs) ? Math.max(0, cpuEncodeMs) : 0;
    const existing = this.passStats.get(signature);
    const gpuEstimate = this.estimateGpuMs(safeMs, existing);
    const gpuMs = gpuEstimate.value;
    const gpuTimingSource = gpuEstimate.source;
    if (!existing) {
      this.passStats.set(signature, {
        runCount: 1,
        lastCpuEncodeMs: safeMs,
        avgCpuEncodeMs: safeMs,
        lastGpuMs: gpuMs,
        avgGpuMs: gpuMs,
        gpuTimingSource,
        fallbackCount: fallbackUsed ? 1 : 0,
        variant
      });
      return;
    }
    const nextCount = existing.runCount + 1;
    const avg = (existing.avgCpuEncodeMs * existing.runCount + safeMs) / nextCount;
    const avgGpu = gpuMs == null || existing.avgGpuMs == null ? gpuMs ?? existing.avgGpuMs : (existing.avgGpuMs * existing.runCount + gpuMs) / nextCount;
    existing.runCount = nextCount;
    existing.lastCpuEncodeMs = safeMs;
    existing.avgCpuEncodeMs = avg;
    existing.lastGpuMs = gpuMs;
    existing.avgGpuMs = avgGpu ?? null;
    existing.gpuTimingSource = gpuTimingSource;
    if (fallbackUsed) existing.fallbackCount += 1;
    existing.variant = variant;
  }
  doesPassProduceOutput(pass) {
    return Boolean(pass.output);
  }
  restorePassOutputHistory(previousSourcePasses, previousHistory, nextSourcePasses) {
    const restored = new Array(nextSourcePasses.length).fill(null);
    if (previousSourcePasses.length === 0 || previousHistory.length === 0) return restored;
    const historyBySignature = /* @__PURE__ */ new Map();
    for (let index = 0; index < previousSourcePasses.length; index += 1) {
      const previousPass = previousSourcePasses[index];
      const texture = previousHistory[index];
      if (!previousPass || !texture) continue;
      const bucket = historyBySignature.get(previousPass.signature);
      if (bucket) bucket.push(texture);
      else historyBySignature.set(previousPass.signature, [texture]);
    }
    for (let index = 0; index < nextSourcePasses.length; index += 1) {
      const nextPass = nextSourcePasses[index];
      if (!nextPass) continue;
      const bucket = historyBySignature.get(nextPass.signature);
      if (!bucket || bucket.length === 0) continue;
      const restoredTexture = bucket.shift();
      if (!restoredTexture) continue;
      restored[index] = restoredTexture;
    }
    return restored;
  }
  resolvePassEntry(pass, passIndex) {
    if (!this.renderer || !this.renderer.ready) return null;
    const entry = this.renderer.getOutputPipelineEntry(pass.signature, pass.wgsl);
    if (!entry) return null;
    if (!entry.error && entry.pipeline) return entry;
    if (!entry.error && !entry.pipeline) return null;
    this.reportPipelineErrorOnce(entry.cacheKey || pass.signature, {
      outputLabel: this.label,
      passIndex,
      signature: pass.signature,
      error: entry.error
    });
    return null;
  }
  resolvePasses() {
    if (!this.renderer || !this.renderer.ready) return null;
    if (this.pendingPasses) {
      const previousSourcePasses = this.activeSourcePasses.slice();
      const previousHistory = this.passOutputHistory.slice();
      const previousDynamicUniformBuffers = this.passDynamicUniformBuffers.slice();
      const nextPasses = [];
      const nextSourcePasses = [];
      const nextEntries = [];
      for (let index = 0; index < this.pendingPasses.length; index += 1) {
        const sourcePass = this.pendingPasses[index];
        const entry = this.resolvePassEntry(sourcePass, index);
        if (!entry) return null;
        nextSourcePasses.push(sourcePass);
        nextPasses.push(sourcePass);
        nextEntries.push(entry);
      }
      this.activeSourcePasses = nextSourcePasses;
      this.activePasses = nextPasses;
      this.activePipelineEntries = nextEntries;
      this.passOutputHistory = this.restorePassOutputHistory(previousSourcePasses, previousHistory, nextSourcePasses);
      this.passDynamicUniformBuffers = this.restorePassDynamicUniformBuffers(
        previousSourcePasses,
        previousDynamicUniformBuffers,
        nextSourcePasses
      );
      this.pendingPasses = null;
      this.invalidateBindGroupCache();
    }
    if (this.activeSourcePasses.length === 0) return null;
    const resolved = [];
    for (let index = 0; index < this.activeSourcePasses.length; index += 1) {
      const sourcePass = this.activeSourcePasses[index];
      const entry = this.resolvePassEntry(sourcePass, index);
      if (!entry) return null;
      const pass = sourcePass;
      this.activePasses[index] = pass;
      this.activePipelineEntries[index] = entry;
      if (!entry.pipeline) return null;
      resolved.push({ pass, pipeline: entry.pipeline });
    }
    return resolved;
  }
  updateDynamicUniforms(uniforms, props, dynamicUniformBuffer) {
    if (!this.renderer || !this.renderer.device || !dynamicUniformBuffer || uniforms.length === 0) return;
    const writeScalar = (index, value) => {
      const safe = typeof value === "number" && Number.isFinite(value) ? value : 0;
      this.dynamicUniformData[index] = safe;
    };
    let maxIndex = -1;
    uniforms.forEach((uniform) => {
      const size = Math.max(1, Math.min(4, Math.floor(uniform.size || 1)));
      const value = typeof uniform.value === "function" ? uniform.value(props) : 0;
      if (size <= 1) {
        writeScalar(uniform.index, value);
        if (uniform.index > maxIndex) maxIndex = uniform.index;
        return;
      }
      const vector = Array.isArray(value) ? value : ArrayBuffer.isView(value) ? Array.from(value) : typeof value === "number" ? Array(size).fill(value) : [];
      for (let lane = 0; lane < size; lane += 1) {
        writeScalar(uniform.index + lane, vector[lane]);
      }
      const endIndex = uniform.index + size - 1;
      if (endIndex > maxIndex) maxIndex = endIndex;
    });
    if (maxIndex < 0) return;
    const floatCount = maxIndex + 1;
    this.renderer.device.queue.writeBuffer(dynamicUniformBuffer, 0, this.dynamicUniformData, 0, floatCount);
  }
  resolveTextureProviderBinding(textureBinding) {
    if (!textureBinding.getTexture) return null;
    try {
      return textureBinding.getTexture();
    } catch {
      return null;
    }
  }
  resolveTextureBinding(textureBinding, readTexture) {
    if (textureBinding.isPrev) return readTexture;
    const source = textureBinding.sourceRef;
    if (source && typeof source === "object" && "internalPassIndex" in source) {
      const passIndex = source.internalPassIndex;
      if (typeof passIndex === "number" && Number.isInteger(passIndex) && passIndex >= 0) {
        return this.passOutputHistory[passIndex] ?? readTexture;
      }
    }
    if (source && typeof source === "object" && "historyOffset" in source) {
      const rawOffset = source.historyOffset;
      if (typeof rawOffset === "number" && Number.isFinite(rawOffset)) {
        const historyOffset = Math.max(1, Math.floor(rawOffset));
        const targetOutput = this.resolveHistoryTargetOutput(source);
        if (targetOutput) {
          const historyTexture = targetOutput.resolveHistoryTexture(historyOffset);
          if (historyTexture) return historyTexture;
          const latestTexture = targetOutput.getTexture();
          if (latestTexture) return latestTexture;
        }
        return this.resolveTextureProviderBinding(textureBinding) ?? readTexture;
      }
    }
    if (source && typeof source === "object" && "id" in source) {
      const targetId = source.id;
      if (typeof targetId === "number" && Number.isInteger(targetId) && targetId >= 0 && targetId === this.id) {
        const historyTexture = this.resolveHistoryTexture(1);
        if (historyTexture) return historyTexture;
        return this.frameInputTexture ?? this.lastOutputTexture ?? this.textures[this.pingPongIndex] ?? readTexture;
      }
    }
    return this.resolveTextureProviderBinding(textureBinding);
  }
  shouldRunPass(pass, passIndex) {
    const updateRate = pass.schedule?.updateRate ?? "everyFrame";
    let dueByRate = true;
    if (updateRate === "everyFrame") {
      dueByRate = true;
    } else if ("everyNFrames" in updateRate) {
      const everyNFrames = Math.max(1, Math.floor(updateRate.everyNFrames || 1));
      dueByRate = (this.frameCounter - 1) % everyNFrames === 0;
    } else if ("onEvent" in updateRate) {
      dueByRate = this.frameEvents.has(updateRate.onEvent);
    }
    if (!pass.schedule?.sparse || !this.doesPassProduceOutput(pass)) return dueByRate;
    if (!this.passOutputHistory[passIndex]) return true;
    if (updateRate === "everyFrame") return this.frameEvents.size > 0;
    if ("onEvent" in updateRate) return dueByRate;
    if (this.frameEvents.size > 0) return true;
    return dueByRate;
  }
  getOrCreateBindGroup(pipeline, pass, resolvedTextures, _writeTexture, dynamicUniformBuffer) {
    if (!this.renderer || !this.renderer.device || !this.renderer.globalUniformBuffer) {
      throw new Error("Renderer resources are unavailable.");
    }
    const sampledTextures = pass.textures;
    let cacheKey = `p${this.renderer.getObjectId(pipeline)}|g${this.renderer.getObjectId(this.renderer.globalUniformBuffer)}`;
    if (pass.uniforms.length > 0 && dynamicUniformBuffer) {
      cacheKey += `|d${this.renderer.getObjectId(dynamicUniformBuffer)}`;
    }
    const sampler = sampledTextures.length > 0 ? this.renderer.getSampler(this.samplerFilter) : null;
    if (sampledTextures.length > 0 && sampler) {
      cacheKey += `|s${this.renderer.getObjectId(sampler)}`;
    }
    for (let index = 0; index < sampledTextures.length; index += 1) {
      const textureBinding = sampledTextures[index];
      cacheKey += `|t${textureBinding.binding}:${this.renderer.getObjectId(resolvedTextures[index])}`;
    }
    const cached = this.bindGroupCache.get(cacheKey);
    if (cached) {
      this.bindGroupCache.delete(cacheKey);
      this.bindGroupCache.set(cacheKey, cached);
      return cached;
    }
    const entries = [
      { binding: 0, resource: { buffer: this.renderer.globalUniformBuffer } }
    ];
    if (pass.uniforms.length > 0) {
      if (!dynamicUniformBuffer) {
        throw new Error("Dynamic uniform buffer is unavailable for pass uniforms.");
      }
      entries.push({ binding: 1, resource: { buffer: dynamicUniformBuffer } });
    }
    if (sampledTextures.length > 0) {
      if (!sampler) {
        throw new Error("Sampler resource is unavailable for textured pass.");
      }
      entries.push({ binding: 2, resource: sampler });
    }
    for (let index = 0; index < sampledTextures.length; index += 1) {
      const textureBinding = sampledTextures[index];
      const texture = resolvedTextures[index] ?? this.renderer.getFallbackTexture();
      entries.push({
        binding: textureBinding.binding,
        resource: this.renderer.getTextureView(texture)
      });
    }
    const created = this.renderer.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries
    });
    this.bindGroupCache.set(cacheKey, created);
    while (this.bindGroupCache.size > MAX_BIND_GROUP_CACHE_ENTRIES) {
      const oldest = this.bindGroupCache.keys().next().value;
      if (!oldest) break;
      this.bindGroupCache.delete(oldest);
    }
    return created;
  }
  tick(props, encoder) {
    this.ensureResources();
    if (!this.renderer || !this.renderer.ready || !encoder) return;
    const resolvedPasses = this.resolvePasses();
    if (!resolvedPasses) return;
    this.frameInputTexture = this.lastOutputTexture ?? this.textures[this.pingPongIndex] ?? this.renderer.getFallbackTexture();
    this.frameCounter += 1;
    this.frameOrdinal += 1;
    let currentTexture = this.frameInputTexture;
    let currentTextureWidth = this.width;
    let currentTextureHeight = this.height;
    const internalPassLastUseByIndex = this.getInternalPassLastUseByIndex(
      resolvedPasses.map((resolved) => resolved.pass)
    );
    for (let passIndex = 0; passIndex < resolvedPasses.length; passIndex += 1) {
      const resolved = resolvedPasses[passIndex];
      const { pass, pipeline } = resolved;
      if (!this.shouldRunPass(pass, passIndex)) {
        const historyTexture = this.passOutputHistory[passIndex];
        if (historyTexture && this.doesPassProduceOutput(pass)) {
          const [historyWidth, historyHeight] = this.getPassDimensions(pass);
          currentTexture = historyTexture;
          currentTextureWidth = historyWidth;
          currentTextureHeight = historyHeight;
        }
        continue;
      }
      const [passWidth, passHeight] = this.getPassDimensions(pass);
      const fullResolutionTarget = passWidth === this.width && passHeight === this.height;
      const readTexture = currentTexture;
      const producesOutput = this.doesPassProduceOutput(pass);
      const requiresWriteTexture = producesOutput;
      let writeTexture = null;
      let writeIndex = 0;
      let scaledPair = null;
      let usingTransientWriteTexture = false;
      if (requiresWriteTexture) {
        if (fullResolutionTarget) {
          writeIndex = this.pingPongIndex ? 0 : 1;
          writeTexture = this.textures[writeIndex] ?? this.renderer.getFallbackTexture();
        } else {
          scaledPair = this.getOrCreateScaledTexturePair(passWidth, passHeight);
          scaledPair.lastUsedFrame = this.frameOrdinal;
          writeIndex = scaledPair.currentIndex ? 0 : 1;
          writeTexture = scaledPair.textures[writeIndex] ?? this.renderer.getFallbackTexture();
        }
      }
      this.renderer.updateGlobalUniforms({
        time: props.time,
        bpm: props.bpm,
        width: passWidth,
        height: passHeight
      });
      const dynamicUniformBuffer = this.passDynamicUniformBuffers[passIndex] ?? null;
      this.updateDynamicUniforms(pass.uniforms, props, dynamicUniformBuffer);
      for (let index = 0; index < pass.textures.length; index += 1) {
        const textureBinding = pass.textures[index];
        this.resolvedTexturesScratch[index] = this.resolveTextureBinding(textureBinding, readTexture) ?? this.renderer.getFallbackTexture();
      }
      this.resolvedTexturesScratch.length = pass.textures.length;
      const protectedPassOutputTextures = this.getProtectedPassOutputTextures(passIndex, internalPassLastUseByIndex);
      const writeAvoidTextures = this.resolvedTexturesScratch.concat(protectedPassOutputTextures);
      if (producesOutput && writeTexture && this.isTextureBeingSampled(writeTexture, writeAvoidTextures)) {
        const transientWriteTexture = this.getOrCreateTransientWriteTexture(passWidth, passHeight, writeAvoidTextures);
        if (transientWriteTexture) {
          writeTexture = transientWriteTexture;
          usingTransientWriteTexture = true;
        }
      }
      const bindGroup = this.getOrCreateBindGroup(
        pipeline,
        pass,
        this.resolvedTexturesScratch,
        writeTexture,
        dynamicUniformBuffer
      );
      const encodeStartMs = this.nowMs();
      if (producesOutput && writeTexture) {
        const renderPass = encoder.beginRenderPass({
          colorAttachments: [{
            view: this.renderer.getTextureView(writeTexture),
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: "clear",
            storeOp: "store"
          }]
        });
        renderPass.setPipeline(pipeline);
        renderPass.setBindGroup(0, bindGroup);
        renderPass.draw(3, 1, 0, 0);
        renderPass.end();
      }
      this.recordPassStat(
        pass.signature,
        this.nowMs() - encodeStartMs,
        false,
        "fragment"
      );
      if (producesOutput && writeTexture) {
        if (fullResolutionTarget && !usingTransientWriteTexture) {
          this.pingPongIndex = writeIndex;
        } else if (scaledPair) {
          scaledPair.currentIndex = writeIndex;
        }
        currentTexture = writeTexture;
        currentTextureWidth = passWidth;
        currentTextureHeight = passHeight;
        this.passOutputHistory[passIndex] = writeTexture;
        this.lastOutputTexture = writeTexture;
      } else {
        this.passOutputHistory[passIndex] = currentTexture;
      }
    }
    this.recordHistoryTexture(currentTexture, currentTextureWidth, currentTextureHeight, encoder);
    this.pruneScaledTexturePairs();
    this.renderer.updateGlobalUniforms({
      time: props.time,
      bpm: props.bpm,
      width: this.width,
      height: this.height
    });
    this.frameEvents.clear();
    this.frameInputTexture = null;
  }
  dispose() {
    WebGPUOutputNode.liveNodes.delete(this);
    WebGPUOutputNode.refreshHistoryDepths();
    this.pendingPasses = null;
    this.activePasses = [];
    this.activeSourcePasses = [];
    this.activePipelineEntries = [];
    this.graphSource = null;
    this.graphRenderHandler = null;
    this.inGraphRenderCycle = false;
    this.reportedPipelineErrors.clear();
    this.pipelineErrorHandler = null;
    this.passStats.clear();
    this.invalidateBindGroupCache();
    this.frameEvents.clear();
    this.textures.forEach((texture) => {
      if (texture) texture.destroy();
    });
    this.textures = [null, null];
    this.frameInputTexture = null;
    this.lastOutputTexture = null;
    this.passOutputHistory = [];
    this.resetHistoryTextures();
    this.destroyScaledTexturePairs();
    this.destroyTransientWriteTexturePools();
    this.resolvedTexturesScratch.length = 0;
    this.destroyPassDynamicUniformBuffers();
    this.renderer = null;
  }
}
class WebGPUFrameRendererAdapter {
  renderer;
  outputs;
  sources;
  getRenderAll;
  getActiveOutput;
  constructor({ renderer, outputs, sources, getRenderAll, getActiveOutput }) {
    this.renderer = renderer;
    this.outputs = outputs;
    this.sources = sources;
    this.getRenderAll = getRenderAll;
    this.getActiveOutput = getActiveOutput;
  }
  async init() {
    await this.renderer.init();
    for (const output of this.outputs) output.attachRenderer(this.renderer);
    for (const source of this.sources) source.attachRenderer(this.renderer);
  }
  beginFrame(_frame) {
    return this.renderer.beginFrame();
  }
  getScheduledOutputs() {
    if (this.outputs.length <= 1) return this.outputs;
    const byId = /* @__PURE__ */ new Map();
    this.outputs.forEach((output) => {
      if (Number.isInteger(output.id) && output.id >= 0) byId.set(output.id, output);
    });
    const indegree = /* @__PURE__ */ new Map();
    const dependents = /* @__PURE__ */ new Map();
    this.outputs.forEach((output) => {
      indegree.set(output, 0);
      dependents.set(output, []);
    });
    for (const output of this.outputs) {
      const dependencies = output.getDependencyOutputIds();
      const dedupedDeps = /* @__PURE__ */ new Set();
      for (const dependencyId of dependencies) {
        const dependency = byId.get(dependencyId);
        if (!dependency || dependency === output || dedupedDeps.has(dependency)) continue;
        dedupedDeps.add(dependency);
        indegree.set(output, (indegree.get(output) ?? 0) + 1);
        const next = dependents.get(dependency);
        if (next) next.push(output);
      }
    }
    const queue = [];
    for (const output of this.outputs) {
      if ((indegree.get(output) ?? 0) === 0) queue.push(output);
    }
    const scheduled = [];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;
      scheduled.push(current);
      const downstream = dependents.get(current) ?? [];
      for (const candidate of downstream) {
        const nextIndegree = (indegree.get(candidate) ?? 0) - 1;
        indegree.set(candidate, nextIndegree);
        if (nextIndegree === 0) queue.push(candidate);
      }
    }
    if (scheduled.length === this.outputs.length) return scheduled;
    const scheduledSet = new Set(scheduled);
    for (const output of this.outputs) {
      if (!scheduledSet.has(output)) scheduled.push(output);
    }
    return scheduled;
  }
  renderFrame(frameHandle, frame) {
    const encoder = frameHandle;
    if (!encoder || !this.renderer.ready) return;
    this.renderer.updateGlobalUniforms({
      time: frame.time,
      bpm: frame.bpm,
      width: frame.resolution[0],
      height: frame.resolution[1]
    });
    const scheduledOutputs = this.getScheduledOutputs();
    for (const output of scheduledOutputs) {
      output.tick(frame, encoder);
    }
    if (this.getRenderAll()) {
      const textures = [];
      for (const output of this.outputs) {
        const texture = output.getCurrent();
        if (texture) textures.push(texture);
      }
      this.renderer.renderAllOutputsToScreen(encoder, textures);
      return;
    }
    this.renderer.renderTextureToScreen(encoder, this.getActiveOutput().getCurrent());
  }
  submitFrame(frameHandle) {
    this.renderer.submitFrame(frameHandle);
  }
  setResolution(width, height) {
    this.renderer.setResolution(width, height);
    for (const output of this.outputs) output.resize(width, height);
  }
  dispose() {
    for (const output of this.outputs) output.dispose();
    this.renderer.dispose();
  }
}
const isBlob = (value) => typeof Blob !== "undefined" && value instanceof Blob;
const isMediaSource = (value) => typeof MediaSource !== "undefined" && value instanceof MediaSource;
const createObjectUrl = (source) => {
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
    throw new Error("Hydra: local File/Blob media sources require URL.createObjectURL support.");
  }
  return URL.createObjectURL(source);
};
const revokeObjectUrl = (url) => {
  if (typeof URL === "undefined" || typeof URL.revokeObjectURL !== "function") return;
  URL.revokeObjectURL(url);
};
const warnIfLocalDiskPath = (source, mediaType) => {
  const trimmed = source.trim();
  const looksLikeLocalPath = /^file:/iu.test(trimmed) || /^[A-Za-z]:(?:[\\/]|[^/\\])/u.test(trimmed) || /^\\\\/u.test(trimmed);
  if (!looksLikeLocalPath) return;
  console.warn(
    `Hydra: browsers cannot load local disk ${mediaType} paths directly. Use a URL served by the dev server or pass a File/Blob from a file picker.`
  );
};
class HydraSourceNode {
  label;
  renderer;
  pb;
  src = null;
  dynamic = true;
  texture = null;
  textureWidth = 0;
  textureHeight = 0;
  flipY = false;
  needsUpload = false;
  uploadedStatic = false;
  disposed = false;
  canvases = {};
  cleanups = [];
  constructor({ renderer, pb, label = "" }) {
    this.renderer = renderer;
    this.pb = pb;
    this.label = label;
  }
  attachRenderer(renderer) {
    this.renderer = renderer;
    this.ensureTexture(1, 1);
    this.needsUpload = true;
  }
  init(opts = {}, params = {}) {
    if (this.disposed) return;
    this.clearRegisteredCleanups();
    if ("dynamic" in opts && typeof opts.dynamic === "boolean") this.dynamic = opts.dynamic;
    if ("src" in opts && opts.src) {
      this.src = opts.src;
      this.flipY = Boolean(params.flipY);
      this.needsUpload = true;
      this.uploadedStatic = false;
    }
  }
  initVideo(source = "", params = {}) {
    if (this.disposed) return;
    this.clearRegisteredCleanups();
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    let objectUrl = null;
    if (isBlob(source) || isMediaSource(source)) {
      objectUrl = createObjectUrl(source);
      video.src = objectUrl;
    } else {
      const url = typeof source === "string" ? source : "";
      warnIfLocalDiskPath(url, "video");
      video.src = url;
    }
    const loaded = () => {
      if (this.disposed) return;
      this.src = video;
      this.flipY = Boolean(params.flipY);
      this.dynamic = true;
      this.needsUpload = true;
      this.uploadedStatic = false;
      void video.play().catch(() => {
      });
    };
    this.listen(video, "loadeddata", loaded);
    this.registerCleanup(() => {
      video.pause();
      video.src = "";
      video.load();
      if (objectUrl) revokeObjectUrl(objectUrl);
    });
  }
  initImage(source = "", params = {}) {
    if (this.disposed) return;
    this.clearRegisteredCleanups();
    const image = document.createElement("img");
    image.crossOrigin = "anonymous";
    let objectUrl = null;
    if (isBlob(source)) {
      objectUrl = createObjectUrl(source);
      image.src = objectUrl;
    } else {
      const url = typeof source === "string" ? source : "";
      warnIfLocalDiskPath(url, "image");
      image.src = url;
    }
    const loaded = () => {
      if (this.disposed) return;
      this.src = image;
      this.flipY = Boolean(params.flipY);
      this.dynamic = false;
      this.needsUpload = true;
      this.uploadedStatic = false;
    };
    this.listen(image, "load", loaded);
    if (objectUrl) this.registerCleanup(() => revokeObjectUrl(objectUrl));
  }
  initStream(streamName, params = {}) {
    if (!streamName || !this.pb || this.disposed) return;
    this.clearRegisteredCleanups();
    this.pb.initSource(streamName);
    const onVideo = (nick, video) => {
      if (nick !== streamName || this.disposed) return;
      this.src = video;
      this.flipY = Boolean(params.flipY);
      this.dynamic = true;
      this.needsUpload = true;
      this.uploadedStatic = false;
    };
    const maybeUnsubscribe = this.pb.on("got video", onVideo);
    if (typeof maybeUnsubscribe === "function") {
      this.registerCleanup(maybeUnsubscribe);
    } else if (this.pb.off) {
      this.registerCleanup(() => {
        this.pb?.off?.("got video", onVideo);
      });
    }
  }
  async initScreen(optionsOrIndex, params = {}) {
    if (this.disposed) return;
    this.clearRegisteredCleanups();
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
      throw new Error("Hydra: screen capture requires navigator.mediaDevices.getDisplayMedia support.");
    }
    const displayOptions = optionsOrIndex && typeof optionsOrIndex === "object" && Object.keys(optionsOrIndex).length > 0 ? optionsOrIndex : {
      video: true,
      audio: false
    };
    const stream = await navigator.mediaDevices.getDisplayMedia(displayOptions);
    if (this.disposed) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    const video = document.createElement("video");
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    const ready = new Promise((resolve, reject) => {
      const cleanup = () => {
        video.removeEventListener("loadedmetadata", onReady);
        video.removeEventListener("loadeddata", onReady);
        video.removeEventListener("error", onError);
      };
      const onReady = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error("Hydra: screen source video failed to load."));
      };
      video.addEventListener("loadedmetadata", onReady, { once: true });
      video.addEventListener("loadeddata", onReady, { once: true });
      video.addEventListener("error", onError, { once: true });
    });
    this.registerCleanup(() => {
      stream.getTracks().forEach((track) => track.stop());
      video.pause();
      video.srcObject = null;
    });
    await ready;
    await video.play();
    this.src = video;
    this.flipY = Boolean(params.flipY);
    this.dynamic = true;
    this.needsUpload = true;
    this.uploadedStatic = false;
  }
  async initCam(constraintsOrId) {
    if (this.disposed) return;
    this.clearRegisteredCleanups();
    let constraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "user"
      },
      audio: false
    };
    if (typeof constraintsOrId === "number") {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        const device = videoDevices[constraintsOrId];
        if (device && device.deviceId) {
          constraints = {
            video: {
              deviceId: { exact: device.deviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false
          };
        }
      } catch (err) {
        console.warn("Hydra: failed to enumerate devices for initCam index", err);
      }
    } else if (typeof constraintsOrId === "object") {
      if ("video" in constraintsOrId || "audio" in constraintsOrId) {
        constraints = constraintsOrId;
      } else {
        constraints = {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            ...constraintsOrId
          },
          audio: false
        };
      }
    } else if (typeof constraintsOrId === "string") {
      constraints = {
        video: {
          deviceId: { exact: constraintsOrId },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (this.disposed) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const video = document.createElement("video");
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      this.registerCleanup(() => {
        stream.getTracks().forEach((t) => t.stop());
        video.srcObject = null;
      });
      await video.play();
      this.src = video;
      this.dynamic = true;
      this.needsUpload = true;
      this.uploadedStatic = false;
      this.flipY = false;
    } catch (err) {
      console.error("Hydra: initCam failed", err);
    }
  }
  initCanvas(width = 1e3, height = 1e3) {
    if (!this.canvases[this.label]) {
      const canvas2 = document.createElement("canvas");
      const context2 = canvas2.getContext("2d");
      if (!context2) throw new Error("Failed to create 2D canvas context for Hydra source.");
      this.canvases[this.label] = context2;
    }
    const context = this.canvases[this.label];
    if (!context) throw new Error("Failed to retrieve 2D canvas context.");
    const canvas = context.canvas;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    } else {
      context.clearRect(0, 0, width, height);
    }
    this.init({ src: canvas, dynamic: true });
    return context;
  }
  registerCleanup(cleanup) {
    this.cleanups.push(cleanup);
  }
  clearRegisteredCleanups() {
    while (this.cleanups.length > 0) {
      const cleanup = this.cleanups.pop();
      if (!cleanup) continue;
      try {
        cleanup();
      } catch {
      }
    }
  }
  listen(target, type, listener, options) {
    target.addEventListener(type, listener, options);
    this.registerCleanup(() => {
      target.removeEventListener(type, listener, options);
    });
  }
  getSourceSize() {
    if (!this.src) return { width: 1, height: 1 };
    if ("videoWidth" in this.src && this.src.videoWidth && this.src.videoHeight) {
      return { width: this.src.videoWidth, height: this.src.videoHeight };
    }
    if ("naturalWidth" in this.src && this.src.naturalWidth && this.src.naturalHeight) {
      return { width: this.src.naturalWidth, height: this.src.naturalHeight };
    }
    if ("width" in this.src && "height" in this.src) {
      return { width: this.src.width, height: this.src.height };
    }
    return { width: 1, height: 1 };
  }
  ensureTexture(width, height) {
    if (!this.renderer || !this.renderer.ready) return;
    const w = Math.max(1, Math.floor(width));
    const h = Math.max(1, Math.floor(height));
    if (this.texture && this.textureWidth === w && this.textureHeight === h) return;
    if (this.texture) this.texture.destroy();
    this.texture = this.renderer.createOutputTexture({
      width: w,
      height: h,
      label: `${this.label}-source-texture`
    });
    this.textureWidth = w;
    this.textureHeight = h;
  }
  clear() {
    if (this.src && "srcObject" in this.src && this.src.srcObject && "getTracks" in this.src.srcObject) {
      this.src.srcObject.getTracks().forEach((track) => track.stop());
    }
    this.clearRegisteredCleanups();
    this.src = null;
    this.dynamic = true;
    this.needsUpload = false;
    this.uploadedStatic = false;
    this.ensureTexture(1, 1);
  }
  uploadSource() {
    if (!this.renderer || !this.renderer.ready || !this.renderer.device || !this.src) return;
    const { width, height } = this.getSourceSize();
    if (width <= 0 || height <= 0) return;
    this.ensureTexture(width, height);
    if (!this.texture) return;
    const queue = this.renderer.device.queue;
    queue.copyExternalImageToTexture(
      {
        source: this.src,
        flipY: this.flipY
      },
      {
        texture: this.texture
      },
      {
        width: Math.max(1, Math.floor(width)),
        height: Math.max(1, Math.floor(height))
      }
    );
  }
  tick(_frame) {
    if (this.disposed || !this.renderer || !this.renderer.ready) return;
    if (!this.src) {
      this.ensureTexture(1, 1);
      return;
    }
    if (this.dynamic) {
      this.uploadSource();
      this.needsUpload = false;
      return;
    }
    if (this.needsUpload || !this.uploadedStatic) {
      this.uploadSource();
      this.needsUpload = false;
      this.uploadedStatic = true;
    }
  }
  getTexture() {
    if (this.texture) return this.texture;
    if (this.renderer && this.renderer.ready) return this.renderer.getFallbackTexture();
    return null;
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.clear();
    if (this.texture) this.texture.destroy();
    this.texture = null;
    this.textureWidth = 0;
    this.textureHeight = 0;
    this.renderer = null;
  }
}
const clamp$2 = (value, min, max) => Math.max(min, Math.min(max, value));
const average$1 = (values) => {
  if (values.length <= 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};
const percentile$2 = (values, ratio) => {
  if (values.length <= 0) return 0;
  const sorted = values.slice().sort((left, right) => left - right);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio)));
  return sorted[index] ?? 0;
};
const normalizeProfileName = (value) => {
  const normalized = `${value}`.trim().toLowerCase();
  return normalized.length > 0 ? normalized : "balanced";
};
const buildCandidateSignature = (candidateProfiles) => candidateProfiles.map((candidate) => normalizeProfileName(candidate)).join("|");
const profileBias = (policy, profile) => {
  const normalized = normalizeProfileName(profile);
  const conservative = normalized.includes("conservative") || normalized.includes("stable");
  const aggressive = normalized.includes("aggressive") || normalized.includes("throughput");
  const balanced = normalized.includes("balanced");
  if (policy === "compat_stable") {
    if (conservative) return 0;
    if (balanced) return 0.08;
    if (aggressive) return 0.18;
    return 0.1;
  }
  if (policy === "throughput") {
    if (aggressive) return 0;
    if (balanced) return 0.06;
    if (conservative) return 0.12;
    return 0.08;
  }
  if (balanced) return 0;
  if (conservative || aggressive) return 0.06;
  return 0.04;
};
const evaluateCandidate = ({
  policy,
  profile,
  baselineP95FrameMs,
  baselineFallbackRate,
  residentBytesEstimate,
  correctnessEquivalent,
  warmupTrials,
  sampleTrials,
  measureCandidate
}) => {
  const normalizedProfile = normalizeProfileName(profile);
  const residentMb = residentBytesEstimate / 1e6;
  const bias = profileBias(policy, normalizedProfile);
  const correctnessPenalty = correctnessEquivalent ? 0 : 10;
  const syntheticSampleMs = Math.max(
    1e-3,
    baselineP95FrameMs + baselineFallbackRate * 35 + residentMb * 0.12 + bias * 4
  );
  for (let trialIndex = 0; trialIndex < warmupTrials; trialIndex += 1) {
    measureCandidate?.({
      profile: normalizedProfile,
      phase: "warmup",
      trialIndex,
      baselineP95FrameMs
    });
  }
  const measuredSamples = [];
  const safeSampleTrials = Math.max(1, Math.floor(sampleTrials));
  for (let trialIndex = 0; trialIndex < safeSampleTrials; trialIndex += 1) {
    const measured = measureCandidate?.({
      profile: normalizedProfile,
      phase: "sample",
      trialIndex,
      baselineP95FrameMs
    });
    if (typeof measured === "number" && Number.isFinite(measured) && measured >= 0) {
      measuredSamples.push(measured);
    } else {
      measuredSamples.push(syntheticSampleMs);
    }
  }
  const measuredMeanMs = average$1(measuredSamples);
  const measuredP95Ms = percentile$2(measuredSamples, 0.95);
  const score = measuredP95Ms + correctnessPenalty;
  return {
    profile: normalizedProfile,
    measuredMeanMs,
    measuredP95Ms,
    sampleCount: measuredSamples.length,
    score
  };
};
const toFingerprintKey = ({
  adapterFingerprint,
  browserFingerprint,
  kernelSignature,
  resolutionClass
}) => [adapterFingerprint, browserFingerprint, kernelSignature, resolutionClass].join("|");
class HydraAutotuner {
  policy = "compat_stable";
  profiles = /* @__PURE__ */ new Map();
  profilesByFingerprint = /* @__PURE__ */ new Map();
  setPolicy(policy) {
    this.policy = policy;
  }
  getPolicy() {
    return this.policy;
  }
  run({
    profileKey,
    policy,
    candidateProfiles = ["conservative", "balanced", "aggressive"],
    profilerSnapshot = null,
    adapterFingerprint = "unknown-adapter",
    browserFingerprint = "unknown-browser",
    kernelSignature = "default-kernel",
    resolutionClass = "default-resolution",
    correctnessEquivalent = true,
    warmupTrials = 1,
    sampleTrials = 5,
    measureCandidate
  }) {
    const activePolicy = policy ?? this.policy;
    const baselineP95FrameMs = clamp$2(Number(profilerSnapshot?.frameWindow?.p95FrameMs ?? 16), 0, 1e4);
    const baselineFallbackRate = clamp$2(Number(profilerSnapshot?.scheduler?.fallbackRate ?? 0), 0, 1);
    const residentBytesEstimate = clamp$2(Number(profilerSnapshot?.resources?.residentBytesEstimate ?? 0), 0, Number.MAX_SAFE_INTEGER);
    const normalizedCandidates = (candidateProfiles.length > 0 ? candidateProfiles : ["balanced"]).map((candidate) => normalizeProfileName(candidate)).filter((candidate, index, all) => all.indexOf(candidate) === index);
    const candidateSignature = buildCandidateSignature(normalizedCandidates);
    const evaluations = normalizedCandidates.map((candidate) => evaluateCandidate({
      policy: activePolicy,
      profile: candidate,
      baselineP95FrameMs,
      baselineFallbackRate,
      residentBytesEstimate,
      correctnessEquivalent,
      warmupTrials: Math.max(0, Math.floor(warmupTrials)),
      sampleTrials: Math.max(1, Math.floor(sampleTrials)),
      measureCandidate
    }));
    evaluations.sort((left, right) => {
      if (left.score !== right.score) return left.score - right.score;
      if (left.measuredP95Ms !== right.measuredP95Ms) return left.measuredP95Ms - right.measuredP95Ms;
      if (left.measuredMeanMs !== right.measuredMeanMs) return left.measuredMeanMs - right.measuredMeanMs;
      return left.profile.localeCompare(right.profile);
    });
    const selected = evaluations[0] ?? {
      profile: "balanced",
      measuredMeanMs: baselineP95FrameMs,
      measuredP95Ms: baselineP95FrameMs,
      score: baselineP95FrameMs
    };
    const fingerprintKey = toFingerprintKey({
      adapterFingerprint,
      browserFingerprint,
      kernelSignature,
      resolutionClass
    });
    const profile = {
      profileKey,
      policy: activePolicy,
      selectedProfile: selected.profile,
      score: selected.score,
      candidateSignature,
      fingerprintKey,
      adapterFingerprint,
      browserFingerprint,
      kernelSignature,
      resolutionClass,
      candidateCount: normalizedCandidates.length,
      warmupTrials: Math.max(0, Math.floor(warmupTrials)),
      sampleTrials: Math.max(1, Math.floor(sampleTrials)),
      selectedMeasuredMeanMs: selected.measuredMeanMs,
      selectedMeasuredP95Ms: selected.measuredP95Ms,
      baselineP95FrameMs,
      baselineFallbackRate,
      evaluatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.profiles.set(profileKey, profile);
    this.profilesByFingerprint.set(`${profileKey}|${fingerprintKey}`, profile);
    return profile;
  }
  getProfile(profileKey) {
    return this.profiles.get(profileKey) ?? null;
  }
  getProfileByFingerprint(profileKey, fingerprintKey) {
    return this.profilesByFingerprint.get(`${profileKey}|${fingerprintKey}`) ?? null;
  }
  getAllProfiles() {
    return Array.from(this.profiles.values());
  }
  clear(profileKey) {
    if (profileKey) {
      this.profiles.delete(profileKey);
      for (const key of Array.from(this.profilesByFingerprint.keys())) {
        if (key.startsWith(`${profileKey}|`)) this.profilesByFingerprint.delete(key);
      }
      return;
    }
    this.profiles.clear();
    this.profilesByFingerprint.clear();
  }
}
const clamp$1 = (value, min, max) => {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
};
const toFiniteNumber$1 = (value, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return fallback;
};
const nowMs = () => {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
};
const normalizeSoft01 = (value, softness) => {
  const positive = Math.max(0, value);
  const safeSoftness = Math.max(1e-6, softness);
  return positive / (positive + safeSoftness);
};
const smoothingAlpha = (deltaMs, timeConstantMs = 90) => {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return 1;
  const tau = Math.max(1, timeConstantMs);
  return 1 - Math.exp(-deltaMs / tau);
};
const isEventTarget = (value) => typeof value === "object" && value !== null && "addEventListener" in value && typeof value.addEventListener === "function" && "removeEventListener" in value && typeof value.removeEventListener === "function";
const isPointerSurface = (value) => isEventTarget(value);
const readRect = (element) => {
  if (typeof element.getBoundingClientRect === "function") {
    const rect = element.getBoundingClientRect();
    if (rect && Number.isFinite(rect.width) && Number.isFinite(rect.height)) {
      return {
        left: toFiniteNumber$1(rect.left, 0),
        top: toFiniteNumber$1(rect.top, 0),
        width: Math.max(1, toFiniteNumber$1(rect.width, 1)),
        height: Math.max(1, toFiniteNumber$1(rect.height, 1))
      };
    }
  }
  return {
    left: 0,
    top: 0,
    width: Math.max(1, toFiniteNumber$1(element.width, 1)),
    height: Math.max(1, toFiniteNumber$1(element.height, 1))
  };
};
const readResolution = (element) => ({
  width: Math.max(1, toFiniteNumber$1(element.width, 1)),
  height: Math.max(1, toFiniteNumber$1(element.height, 1))
});
const asPointerEvent = (event) => event;
const asKeyboardEvent = (event) => event;
const updateModifiersFromEvent = (target, event) => {
  let changed = false;
  if ("altKey" in event && typeof event.altKey === "boolean") {
    changed = changed || target.alt !== event.altKey;
    target.alt = event.altKey;
  }
  if ("shiftKey" in event && typeof event.shiftKey === "boolean") {
    changed = changed || target.shift !== event.shiftKey;
    target.shift = event.shiftKey;
  }
  if ("ctrlKey" in event && typeof event.ctrlKey === "boolean") {
    changed = changed || target.control !== event.ctrlKey;
    target.control = event.ctrlKey;
  }
  if ("metaKey" in event && typeof event.metaKey === "boolean") {
    changed = changed || target.meta !== event.metaKey;
    target.meta = event.metaKey;
  }
  return changed;
};
const createHydraMouseInput = ({
  element = null,
  rootTarget = typeof window !== "undefined" ? window : null,
  enabled = true
} = {}) => {
  const surface = isPointerSurface(element) ? element : null;
  const root = isEventTarget(rootTarget) ? rootTarget : null;
  let active = false;
  let x = 0;
  let y = 0;
  let pixelX = 0;
  let pixelY = 0;
  let velocityX = 0;
  let velocityY = 0;
  let accelerationX = 0;
  let accelerationY = 0;
  let jerkX = 0;
  let jerkY = 0;
  let speed = 0;
  let acceleration = 0;
  let jerk = 0;
  let speedSmooth = 0;
  let accelerationSmooth = 0;
  let jerkSmooth = 0;
  let inside = false;
  let buttons = 0;
  let pressure = 0;
  let pointerType = "unknown";
  let dragActive = false;
  let dragStartPixelX = 0;
  let dragStartPixelY = 0;
  let dragStartTimeMs = 0;
  let dragDistancePx = 0;
  let dragTravelPx = 0;
  let dragDurationMs = 0;
  let resolutionDiagonalPx = 1;
  let lastSampleTimeMs = null;
  const mods = {
    shift: false,
    alt: false,
    control: false,
    meta: false
  };
  const disposers = /* @__PURE__ */ new Set();
  const resetMotionState = () => {
    velocityX = 0;
    velocityY = 0;
    accelerationX = 0;
    accelerationY = 0;
    jerkX = 0;
    jerkY = 0;
    speed = 0;
    acceleration = 0;
    jerk = 0;
    speedSmooth = 0;
    accelerationSmooth = 0;
    jerkSmooth = 0;
    lastSampleTimeMs = null;
  };
  const resetDragState = () => {
    dragActive = false;
    dragStartPixelX = pixelX;
    dragStartPixelY = pixelY;
    dragStartTimeMs = 0;
    dragDistancePx = 0;
    dragTravelPx = 0;
    dragDurationMs = 0;
  };
  const resolveEventTimeMs = (event) => {
    const candidate = toFiniteNumber$1(event.timeStamp, Number.NaN);
    if (Number.isFinite(candidate) && candidate >= 0) return candidate;
    return nowMs();
  };
  const beginDrag = (eventTimeMs) => {
    dragActive = true;
    dragStartPixelX = pixelX;
    dragStartPixelY = pixelY;
    dragStartTimeMs = eventTimeMs;
    dragDistancePx = 0;
    dragTravelPx = 0;
    dragDurationMs = 0;
  };
  const updateDrag = (segmentDistancePx, eventTimeMs) => {
    if (!dragActive) return;
    dragTravelPx += Math.max(0, segmentDistancePx);
    dragDistancePx = Math.hypot(pixelX - dragStartPixelX, pixelY - dragStartPixelY);
    dragDurationMs = Math.max(0, eventTimeMs - dragStartTimeMs);
  };
  const endDrag = () => {
    resetDragState();
  };
  const updatePointerPosition = (event) => {
    if (!surface) return null;
    const clientX = toFiniteNumber$1(event.clientX, Number.NaN);
    const clientY = toFiniteNumber$1(event.clientY, Number.NaN);
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;
    const rect = readRect(surface);
    const resolution = readResolution(surface);
    resolutionDiagonalPx = Math.max(1, Math.hypot(resolution.width, resolution.height));
    const previousX = x;
    const previousY = y;
    const previousPixelX = pixelX;
    const previousPixelY = pixelY;
    const previousVelocityX = velocityX;
    const previousVelocityY = velocityY;
    const previousAccelerationX = accelerationX;
    const previousAccelerationY = accelerationY;
    const localCssX = clamp$1(clientX - rect.left, 0, rect.width);
    const localCssY = clamp$1(clientY - rect.top, 0, rect.height);
    const normalizedX = rect.width > 0 ? localCssX / rect.width : 0;
    const normalizedY = rect.height > 0 ? localCssY / rect.height : 0;
    pixelX = clamp$1(normalizedX * resolution.width, 0, resolution.width);
    pixelY = clamp$1(normalizedY * resolution.height, 0, resolution.height);
    x = resolution.width > 0 ? pixelX / resolution.width : 0;
    y = resolution.height > 0 ? pixelY / resolution.height : 0;
    const eventTimeMs = resolveEventTimeMs(event);
    const segmentDistancePx = Math.hypot(pixelX - previousPixelX, pixelY - previousPixelY);
    let deltaMs = 0;
    if (lastSampleTimeMs !== null) {
      deltaMs = eventTimeMs - lastSampleTimeMs;
      if (Number.isFinite(deltaMs) && deltaMs > 0) {
        const deltaSeconds = deltaMs * 1e-3;
        const nextVelocityX = (x - previousX) / deltaSeconds;
        const nextVelocityY = (y - previousY) / deltaSeconds;
        const nextAccelerationX = (nextVelocityX - previousVelocityX) / deltaSeconds;
        const nextAccelerationY = (nextVelocityY - previousVelocityY) / deltaSeconds;
        const nextJerkX = (nextAccelerationX - previousAccelerationX) / deltaSeconds;
        const nextJerkY = (nextAccelerationY - previousAccelerationY) / deltaSeconds;
        velocityX = nextVelocityX;
        velocityY = nextVelocityY;
        accelerationX = nextAccelerationX;
        accelerationY = nextAccelerationY;
        jerkX = nextJerkX;
        jerkY = nextJerkY;
      } else {
        resetMotionState();
      }
    } else {
      velocityX = 0;
      velocityY = 0;
      accelerationX = 0;
      accelerationY = 0;
      jerkX = 0;
      jerkY = 0;
    }
    const speedRaw = Math.hypot(velocityX, velocityY);
    const accelerationRaw = Math.hypot(accelerationX, accelerationY);
    const jerkRaw = Math.hypot(jerkX, jerkY);
    speed = normalizeSoft01(speedRaw, 1);
    acceleration = normalizeSoft01(accelerationRaw, 20);
    jerk = normalizeSoft01(jerkRaw, 500);
    const alpha = smoothingAlpha(deltaMs);
    speedSmooth += (speed - speedSmooth) * alpha;
    accelerationSmooth += (acceleration - accelerationSmooth) * alpha;
    jerkSmooth += (jerk - jerkSmooth) * alpha;
    lastSampleTimeMs = eventTimeMs;
    return {
      eventTimeMs,
      segmentDistancePx
    };
  };
  const updatePointerState = (event, nextButtons) => {
    if (event.isPrimary === false) return;
    const wasDown = buttons !== 0;
    const positionSample = updatePointerPosition(event);
    if (typeof nextButtons === "number" && Number.isFinite(nextButtons)) {
      buttons = Math.max(0, nextButtons | 0);
    } else if (typeof event.buttons === "number" && Number.isFinite(event.buttons)) {
      buttons = Math.max(0, event.buttons | 0);
    }
    const isDown = buttons !== 0;
    const eventTimeMs = positionSample?.eventTimeMs ?? resolveEventTimeMs(event);
    if (!wasDown && isDown) {
      beginDrag(eventTimeMs);
    } else if (wasDown && isDown && positionSample) {
      updateDrag(positionSample.segmentDistancePx, eventTimeMs);
    } else if (wasDown && !isDown) {
      endDrag();
    }
    pressure = clamp$1(toFiniteNumber$1(event.pressure, buttons > 0 ? 1 : 0), 0, 1);
    pointerType = typeof event.pointerType === "string" && event.pointerType.length > 0 ? event.pointerType : pointerType;
    updateModifiersFromEvent(mods, event);
  };
  const resetState = () => {
    x = 0;
    y = 0;
    pixelX = 0;
    pixelY = 0;
    resolutionDiagonalPx = 1;
    resetMotionState();
    resetDragState();
    inside = false;
    buttons = 0;
    pressure = 0;
    pointerType = "unknown";
    mods.shift = false;
    mods.alt = false;
    mods.control = false;
    mods.meta = false;
  };
  const addListener = (target, type, listener, optionsArg) => {
    target.addEventListener(type, listener, optionsArg);
    disposers.add(() => {
      target.removeEventListener(type, listener, optionsArg);
    });
  };
  const detachAll = () => {
    if (!active) return;
    active = false;
    for (const dispose of Array.from(disposers).reverse()) {
      try {
        dispose();
      } catch {
      }
    }
    disposers.clear();
  };
  const attachAll = () => {
    if (active || !surface) return;
    active = true;
    addListener(surface, "pointermove", (event) => {
      updatePointerState(asPointerEvent(event));
    });
    addListener(surface, "pointerdown", (event) => {
      inside = true;
      updatePointerState(asPointerEvent(event));
    });
    addListener(surface, "pointerenter", (event) => {
      inside = true;
      updatePointerState(asPointerEvent(event));
    });
    addListener(surface, "pointerleave", (event) => {
      inside = false;
      updatePointerState(asPointerEvent(event), 0);
    });
    addListener(surface, "pointercancel", (event) => {
      inside = false;
      updatePointerState(asPointerEvent(event), 0);
    });
    if (root && root !== surface) {
      addListener(root, "pointerup", (event) => {
        updatePointerState(asPointerEvent(event), 0);
      });
      addListener(root, "pointercancel", (event) => {
        updatePointerState(asPointerEvent(event), 0);
      });
      addListener(root, "blur", () => {
        resetState();
      });
      addListener(root, "keydown", (event) => {
        updateModifiersFromEvent(mods, asKeyboardEvent(event));
      });
      addListener(root, "keyup", (event) => {
        updateModifiersFromEvent(mods, asKeyboardEvent(event));
      });
    }
  };
  if (surface) {
    const resolution = readResolution(surface);
    resolutionDiagonalPx = Math.max(1, Math.hypot(resolution.width, resolution.height));
  }
  if (enabled) attachAll();
  const state = {
    get element() {
      return surface;
    },
    get enabled() {
      return active;
    },
    set enabled(value) {
      if (value) attachAll();
      else {
        detachAll();
        resetMotionState();
        resetDragState();
      }
    },
    get x() {
      return x;
    },
    get y() {
      return y;
    },
    get speed() {
      return speed;
    },
    get acceleration() {
      return acceleration;
    },
    get jerk() {
      return jerk;
    },
    get speedSmooth() {
      return speedSmooth;
    },
    get accelerationSmooth() {
      return accelerationSmooth;
    },
    get jerkSmooth() {
      return jerkSmooth;
    },
    get dragDistance() {
      return clamp$1(dragDistancePx / resolutionDiagonalPx, 0, 1);
    },
    get dragTravel() {
      return clamp$1(dragTravelPx / resolutionDiagonalPx, 0, 1);
    },
    get dragDuration() {
      return clamp$1(dragDurationMs / 1e3, 0, 1);
    },
    get hold() {
      return buttons !== 0 ? 1 : 0;
    },
    get pressure() {
      return pressure;
    },
    get inside() {
      return inside ? 1 : 0;
    },
    get pixelX() {
      return pixelX;
    },
    get pixelY() {
      return pixelY;
    },
    get uvX() {
      return x;
    },
    get uvY() {
      return 1 - y;
    },
    get velocityX() {
      return velocityX;
    },
    get velocityY() {
      return velocityY;
    },
    get accelerationX() {
      return accelerationX;
    },
    get accelerationY() {
      return accelerationY;
    },
    get jerkX() {
      return jerkX;
    },
    get jerkY() {
      return jerkY;
    },
    get buttons() {
      return buttons;
    },
    get down() {
      return buttons !== 0;
    },
    get dragActive() {
      return dragActive;
    },
    get pointerType() {
      return pointerType;
    },
    get mods() {
      return mods;
    },
    reset: resetState
  };
  return {
    state,
    dispose: () => {
      detachAll();
      resetState();
    }
  };
};
const DEFAULT_NUM_BINS = 4;
const DEFAULT_CUTOFF = 2;
const DEFAULT_SCALE = 10;
const DEFAULT_SMOOTH = 0.4;
const DEFAULT_MAX = 15;
const DEFAULT_FFT_SIZE = 1024;
const clamp = (value, min, max) => {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
};
const toPositiveInteger = (value, fallback) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return fallback;
  return Math.max(1, Math.floor(value));
};
const toFinite = (value, fallback) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const getAudioContextConstructor = () => {
  if (typeof window === "undefined") return null;
  const audioWindow = window;
  return audioWindow.AudioContext ?? audioWindow.webkitAudioContext ?? null;
};
const isMediaStream = (value) => typeof MediaStream !== "undefined" && value instanceof MediaStream;
const isHtmlMediaElement = (value) => typeof HTMLMediaElement !== "undefined" && value instanceof HTMLMediaElement;
const isAudioNode = (value) => typeof AudioNode !== "undefined" && value instanceof AudioNode;
class HydraAudioAnalyzer {
  vol = 0;
  rms = 0;
  peak = 0;
  centroid = 0;
  low = 0;
  mid = 0;
  high = 0;
  fft = [];
  bins = [];
  prevBins = [];
  waveform = [];
  settings = [];
  beat = {
    holdFrames: 20,
    threshold: 0.35,
    _cutoff: 0,
    decay: 0.98,
    _framesSinceBeat: 0
  };
  onBeat = () => {
  };
  isDrawing;
  canvas = null;
  parentEl;
  bindingTargets = /* @__PURE__ */ new Set();
  context;
  ownsContext = false;
  analyser = null;
  sourceNode = null;
  stream = null;
  mediaElement = null;
  frequencyData = null;
  timeDomainData = null;
  helperNamesByTarget = /* @__PURE__ */ new Map();
  cutoff;
  smooth;
  scale;
  max;
  fftSize;
  minDecibels;
  maxDecibels;
  smoothingTimeConstant;
  ctx = null;
  constructor({
    numBins = DEFAULT_NUM_BINS,
    cutoff = DEFAULT_CUTOFF,
    smooth = DEFAULT_SMOOTH,
    max = DEFAULT_MAX,
    scale = DEFAULT_SCALE,
    fftSize = DEFAULT_FFT_SIZE,
    minDecibels = -90,
    maxDecibels = -10,
    smoothingTimeConstant = 0.65,
    context,
    source,
    isDrawing = false,
    parentEl,
    autostart = false
  } = {}) {
    this.cutoff = toFinite(cutoff, DEFAULT_CUTOFF);
    this.smooth = clamp(toFinite(smooth, DEFAULT_SMOOTH), 0, 0.999);
    this.max = toFinite(max, DEFAULT_MAX);
    this.scale = Math.max(1e-4, toFinite(scale, DEFAULT_SCALE));
    this.fftSize = Math.max(32, toPositiveInteger(fftSize, DEFAULT_FFT_SIZE));
    this.minDecibels = toFinite(minDecibels, -90);
    this.maxDecibels = toFinite(maxDecibels, -10);
    this.smoothingTimeConstant = clamp(toFinite(smoothingTimeConstant, 0.65), 0, 1);
    this.context = context ?? null;
    this.parentEl = parentEl ?? (typeof document !== "undefined" ? document.body : null);
    this.isDrawing = isDrawing;
    this.setBins(numBins);
    if (isDrawing) this.ensureCanvas();
    if (source) {
      void this.connect(source).catch(() => {
      });
    } else if (autostart) {
      void this.start().catch(() => {
      });
    }
  }
  get ready() {
    return Boolean(this.analyser);
  }
  async start(source) {
    if (source) {
      await this.connect(source);
      return;
    }
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      throw new Error("Hydra audio input requires navigator.mediaDevices.getUserMedia support.");
    }
    const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
    this.stream = stream;
    await this.connect(stream);
  }
  async connect(source) {
    this.disconnectSource(false);
    const context = this.resolveContext(source);
    if (context.state === "suspended" && typeof context.resume === "function") {
      await context.resume();
    }
    const analyser = context.createAnalyser();
    analyser.fftSize = this.fftSize;
    analyser.minDecibels = this.minDecibels;
    analyser.maxDecibels = this.maxDecibels;
    analyser.smoothingTimeConstant = this.smoothingTimeConstant;
    if (isMediaStream(source)) {
      this.stream = source;
      this.sourceNode = context.createMediaStreamSource(source);
    } else if (isHtmlMediaElement(source)) {
      this.mediaElement = source;
      this.sourceNode = context.createMediaElementSource(source);
      analyser.connect(context.destination);
    } else if (isAudioNode(source)) {
      this.sourceNode = source;
    } else {
      throw new Error("Unsupported Hydra audio source.");
    }
    this.sourceNode.connect(analyser);
    this.analyser = analyser;
    this.frequencyData = new Uint8Array(analyser.frequencyBinCount);
    this.timeDomainData = new Float32Array(analyser.fftSize);
  }
  stop() {
    this.disconnectSource(true);
    this.reset();
  }
  tick() {
    if (!this.analyser || !this.frequencyData) return;
    this.analyser.getByteFrequencyData(this.frequencyData);
    if (this.timeDomainData && typeof this.analyser.getFloatTimeDomainData === "function") {
      this.analyser.getFloatTimeDomainData(this.timeDomainData);
    }
    this.updateFromFrequencyData(this.frequencyData, this.timeDomainData ?? void 0);
  }
  updateFromFrequencyData(frequencyData, timeDomainData) {
    const sourceLength = Math.max(1, frequencyData.length);
    const binCount = Math.max(1, this.bins.length);
    const nextBins = new Array(binCount).fill(0);
    let weightedFrequency = 0;
    let totalMagnitude = 0;
    let peak = 0;
    for (let index = 0; index < binCount; index += 1) {
      const start2 = Math.floor(index / binCount * sourceLength);
      const end = Math.max(start2 + 1, Math.floor((index + 1) / binCount * sourceLength));
      let sum = 0;
      for (let sampleIndex = start2; sampleIndex < end && sampleIndex < sourceLength; sampleIndex += 1) {
        const magnitude = clamp(Number(frequencyData[sampleIndex] ?? 0), 0, 255) / 255;
        sum += magnitude;
        totalMagnitude += magnitude;
        weightedFrequency += magnitude * sampleIndex;
        peak = Math.max(peak, magnitude);
      }
      const normalized = sum / Math.max(1, end - start2);
      const setting = this.settings[index] ?? { cutoff: this.cutoff, scale: this.scale, smooth: this.smooth };
      const compatibilityValue = normalized * setting.scale + setting.cutoff;
      const previous = this.bins[index] ?? 0;
      nextBins[index] = compatibilityValue * (1 - setting.smooth) + previous * setting.smooth;
    }
    this.prevBins = this.bins.slice();
    this.bins = nextBins;
    this.fft = this.bins.map((bin, index) => {
      const setting = this.settings[index] ?? { cutoff: this.cutoff, scale: this.scale, smooth: this.smooth };
      return Math.max(0, (bin - setting.cutoff) / Math.max(1e-4, setting.scale));
    });
    this.low = this.averageFftRange(0, Math.max(1, Math.ceil(binCount / 3)));
    this.mid = this.averageFftRange(Math.floor(binCount / 3), Math.max(1, Math.ceil(binCount * 2 / 3)));
    this.high = this.averageFftRange(Math.floor(binCount * 2 / 3), binCount);
    this.vol = this.fft.reduce((sum, value) => sum + value, 0) / binCount;
    this.peak = peak;
    this.centroid = totalMagnitude > 0 ? weightedFrequency / totalMagnitude / sourceLength : 0;
    if (timeDomainData && timeDomainData.length > 0) {
      let squareSum = 0;
      const waveform = new Array(timeDomainData.length);
      for (let index = 0; index < timeDomainData.length; index += 1) {
        const sample = clamp(Number(timeDomainData[index] ?? 0), -1, 1);
        waveform[index] = sample;
        squareSum += sample * sample;
      }
      this.waveform = waveform;
      this.rms = Math.sqrt(squareSum / timeDomainData.length);
    } else {
      this.waveform = [];
      this.rms = this.vol;
    }
    this.detectBeat(this.vol);
    if (this.isDrawing) this.draw();
  }
  detectBeat(level) {
    if (level > this.beat._cutoff && level > this.beat.threshold) {
      this.onBeat();
      this.beat._cutoff = level * 1.2;
      this.beat._framesSinceBeat = 0;
      return;
    }
    if (this.beat._framesSinceBeat <= this.beat.holdFrames) {
      this.beat._framesSinceBeat += 1;
    } else {
      this.beat._cutoff *= this.beat.decay;
      this.beat._cutoff = Math.max(this.beat._cutoff, this.beat.threshold);
    }
  }
  setCutoff(cutoff) {
    this.cutoff = toFinite(cutoff, this.cutoff);
    this.settings = this.settings.map((setting) => ({ ...setting, cutoff: this.cutoff }));
  }
  setSmooth(smooth) {
    this.smooth = clamp(toFinite(smooth, this.smooth), 0, 0.999);
    this.settings = this.settings.map((setting) => ({ ...setting, smooth: this.smooth }));
  }
  setScale(scale) {
    this.scale = Math.max(1e-4, toFinite(scale, this.scale));
    this.settings = this.settings.map((setting) => ({ ...setting, scale: this.scale }));
  }
  setMax(max) {
    this.max = toFinite(max, this.max);
  }
  setBins(numBins) {
    const count = toPositiveInteger(numBins, DEFAULT_NUM_BINS);
    this.bins = Array(count).fill(0);
    this.prevBins = Array(count).fill(0);
    this.fft = Array(count).fill(0);
    this.settings = Array(count).fill(0).map(() => ({
      cutoff: this.cutoff,
      scale: this.scale,
      smooth: this.smooth
    }));
    this.refreshBindings();
  }
  getBand(index, scale = 1, offset = 0) {
    return () => (this.fft[index] ?? 0) * scale + offset;
  }
  attachBindings(bindings) {
    this.bindingTargets.add(bindings);
    this.refreshTargetBindings(bindings);
  }
  detachBindings(bindings) {
    this.bindingTargets.delete(bindings);
    for (const name of this.helperNamesByTarget.get(bindings) ?? []) delete bindings[name];
    this.helperNamesByTarget.delete(bindings);
    if (bindings.a === this) delete bindings.a;
  }
  show() {
    this.isDrawing = true;
    this.ensureCanvas();
    if (this.canvas) this.canvas.style.display = "block";
  }
  hide() {
    this.isDrawing = false;
    if (this.canvas) this.canvas.style.display = "none";
  }
  dispose() {
    this.stop();
    for (const bindings of Array.from(this.bindingTargets)) this.detachBindings(bindings);
    this.bindingTargets.clear();
    if (this.canvas?.parentElement) this.canvas.parentElement.removeChild(this.canvas);
  }
  resolveContext(source) {
    if (isAudioNode(source)) {
      this.context = source.context;
      return this.context;
    }
    if (this.context) return this.context;
    const Context = getAudioContextConstructor();
    if (!Context) throw new Error("Hydra audio input requires AudioContext support.");
    this.context = new Context();
    this.ownsContext = true;
    return this.context;
  }
  disconnectSource(stopStream) {
    try {
      this.sourceNode?.disconnect();
    } catch {
    }
    try {
      this.analyser?.disconnect();
    } catch {
    }
    this.sourceNode = null;
    this.analyser = null;
    this.frequencyData = null;
    this.timeDomainData = null;
    if (stopStream && this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }
    this.stream = null;
    this.mediaElement = null;
    if (stopStream && this.ownsContext && this.context && this.context.state !== "closed") {
      void this.context.close().catch(() => {
      });
      this.context = null;
      this.ownsContext = false;
    }
  }
  reset() {
    this.vol = 0;
    this.rms = 0;
    this.peak = 0;
    this.centroid = 0;
    this.low = 0;
    this.mid = 0;
    this.high = 0;
    this.bins.fill(0);
    this.prevBins.fill(0);
    this.fft.fill(0);
    this.waveform = [];
    this.beat._cutoff = 0;
    this.beat._framesSinceBeat = 0;
  }
  averageFftRange(start2, end) {
    const slice = this.fft.slice(start2, end);
    if (slice.length === 0) return 0;
    return slice.reduce((sum, value) => sum + value, 0) / slice.length;
  }
  ensureCanvas() {
    if (this.canvas || !this.parentEl || typeof document === "undefined") return;
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 80;
    canvas.style.width = "100px";
    canvas.style.height = "80px";
    canvas.style.position = "absolute";
    canvas.style.right = "0px";
    canvas.style.bottom = "0px";
    canvas.style.display = this.isDrawing ? "block" : "none";
    this.parentEl.appendChild(canvas);
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
  }
  refreshBindings() {
    for (const bindings of this.bindingTargets) this.refreshTargetBindings(bindings);
  }
  refreshTargetBindings(bindings) {
    for (const name of this.helperNamesByTarget.get(bindings) ?? []) delete bindings[name];
    bindings.a = this;
    const helperNames = this.fft.map((_, index) => `a${index}`);
    this.helperNamesByTarget.set(bindings, helperNames);
    helperNames.forEach((name, index) => {
      bindings[name] = (scale = 1, offset = 0) => this.getBand(index, Number(scale), Number(offset));
    });
  }
  draw() {
    if (!this.ctx || !this.canvas) return;
    const spacing = this.canvas.width / Math.max(1, this.bins.length);
    const scale = this.canvas.height / Math.max(1, this.max * 2);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = "#dfffff";
    this.ctx.strokeStyle = "#00ffff";
    this.ctx.lineWidth = 0.5;
    this.bins.forEach((bin, index) => {
      const height = bin * scale;
      this.ctx?.fillRect(index * spacing, this.canvas.height - height, spacing, height);
      const setting = this.settings[index];
      if (!setting || !this.ctx) return;
      const cutoffY = this.canvas.height - scale * setting.cutoff;
      this.ctx.beginPath();
      this.ctx.moveTo(index * spacing, cutoffY);
      this.ctx.lineTo((index + 1) * spacing, cutoffY);
      this.ctx.stroke();
    });
  }
}
const percentile$1 = (values, ratio) => {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((left, right) => left - right);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio)));
  return sorted[index] ?? 0;
};
const buildProfilerSnapshot = ({
  frameTimesMs,
  outputs,
  capabilities,
  residentBytesEstimate = 0,
  routingMetrics = null
}) => {
  const avgFrameMs = frameTimesMs.length > 0 ? frameTimesMs.reduce((sum, value) => sum + value, 0) / frameTimesMs.length : 0;
  const passes = {};
  let totalRunCount = 0;
  let totalFallbackCount = 0;
  outputs.forEach((output, index) => {
    const stats = output.getPassStats();
    Object.entries(stats).forEach(([signature, value]) => {
      const key = `o${index}:${signature}`;
      const runCount = Math.max(0, Number(value.runCount ?? 0));
      const fallbackCount = Math.max(0, Number(value.fallbackCount ?? 0));
      const variant = value.variant ?? "fragment";
      const gpuTimingSource = value.gpuTimingSource ?? (value.lastGpuMs != null ? "cpu_encode_fallback" : "unavailable");
      totalRunCount += runCount;
      totalFallbackCount += fallbackCount;
      passes[key] = {
        runCount,
        fallbackCount,
        cpuEncodeMsAvg: value.avgCpuEncodeMs,
        cpuEncodeMsLast: value.lastCpuEncodeMs,
        gpuMsLast: value.lastGpuMs ?? null,
        gpuMsAvg: value.avgGpuMs ?? null,
        gpuTimingSource,
        variant
      };
    });
  });
  return {
    frameWindow: {
      avgFrameMs,
      p95FrameMs: percentile$1(frameTimesMs, 0.95),
      p99FrameMs: percentile$1(frameTimesMs, 0.99),
      frameCount: frameTimesMs.length
    },
    passes,
    resources: {
      residentBytesEstimate: Math.max(0, Math.floor(residentBytesEstimate)),
      residency: null
    },
    scheduler: {
      fallbackRate: totalRunCount > 0 ? totalFallbackCount / totalRunCount : 0,
      routingConfiguredMode: routingMetrics?.configuredMode ?? "fragment",
      routingActiveMode: routingMetrics?.activeMode ?? "fragment",
      routingCompileFailures: Math.max(0, Math.floor(routingMetrics?.compileFailures ?? 0)),
      routingRouteFailureCount: Math.max(0, Math.floor(routingMetrics?.routeFailureCount ?? 0))
    },
    capability: {
      features: capabilities?.features ?? [],
      fragment: capabilities ? {
        targetFormat: capabilities.fragment.targetFormat,
        maxColorAttachments: capabilities.fragment.maxColorAttachments
      } : null
    }
  };
};
class HydraExecutor {
  executePlan(output, plan, _frame, _options = {}) {
    const passes = plan.steps.map((step) => step.compiledPass);
    output.render(passes);
    return {
      submittedPasses: passes.length,
      scheduledBarriers: plan.barriers.length,
      allocatedResourceCount: 0
    };
  }
  getResidentByteEstimate() {
    return 0;
  }
  getResidencySnapshot() {
    return null;
  }
  dispose() {
  }
}
const EASING_FUNCTIONS = {
  linear: (value) => value,
  easeInQuad: (value) => value * value,
  easeOutQuad: (value) => value * (2 - value),
  easeInOutQuad: (value) => value < 0.5 ? 2 * value * value : -1 + (4 - 2 * value) * value,
  easeInCubic: (value) => value * value * value,
  easeOutCubic: (value) => {
    const t = value - 1;
    return t * t * t + 1;
  },
  easeInOutCubic: (value) => value < 0.5 ? 4 * value * value * value : (value - 1) * (2 * value - 2) * (2 * value - 2) + 1,
  easeInQuart: (value) => value * value * value * value,
  easeOutQuart: (value) => {
    const t = value - 1;
    return 1 - t * t * t * t;
  },
  easeInOutQuart: (value) => value < 0.5 ? 8 * value * value * value * value : 1 - 8 * Math.pow(value - 1, 4),
  easeInQuint: (value) => value * value * value * value * value,
  easeOutQuint: (value) => {
    const t = value - 1;
    return 1 + t * t * t * t * t;
  },
  easeInOutQuint: (value) => value < 0.5 ? 16 * Math.pow(value, 5) : 1 + 16 * Math.pow(value - 1, 5),
  sin: (value) => (1 + Math.sin(Math.PI * value - Math.PI / 2)) * 0.5
};
let installed = false;
const toFiniteNumber = (value, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return fallback;
};
const modulo = (value, divisor) => {
  if (!Number.isFinite(divisor) || divisor === 0) return 0;
  return (value % divisor + divisor) % divisor;
};
const defineArrayMethod = (name, value) => {
  if (Object.prototype.hasOwnProperty.call(Array.prototype, name)) return;
  Object.defineProperty(Array.prototype, name, {
    configurable: true,
    enumerable: false,
    writable: true,
    value
  });
};
const copySequenceMetadata = (from, to) => {
  if (typeof from._speed === "number") to._speed = from._speed;
  if (typeof from._smooth === "number") to._smooth = from._smooth;
  if (typeof from._ease === "function") to._ease = from._ease;
};
const installArraySequenceExtensions = () => {
  if (installed) return;
  installed = true;
  defineArrayMethod("fast", function(speed = 1) {
    this._speed = toFiniteNumber(speed, 1);
    return this;
  });
  defineArrayMethod("smooth", function(smooth = 1) {
    this._smooth = toFiniteNumber(smooth, 1);
    return this;
  });
  defineArrayMethod("ease", function(ease = "linear") {
    if (typeof ease === "function") {
      this._smooth = 1;
      this._ease = ease;
      return this;
    }
    const easing = EASING_FUNCTIONS[ease];
    if (easing) {
      this._smooth = 1;
      this._ease = easing;
    }
    return this;
  });
  defineArrayMethod("offset", function(offset = 0.5) {
    this._offset = modulo(toFiniteNumber(offset, 0.5), 1);
    return this;
  });
  defineArrayMethod("fit", function(low = 0, high = 1) {
    const source = this;
    if (source.length === 0) return source;
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (let index = 0; index < source.length; index += 1) {
      const value = toFiniteNumber(source[index], 0);
      if (value < min) min = value;
      if (value > max) max = value;
    }
    const from = min;
    const range = max - min;
    const toLow = toFiniteNumber(low, 0);
    const toHigh = toFiniteNumber(high, 1);
    const targetRange = toHigh - toLow;
    const fitted = source.map((entry) => {
      const value = toFiniteNumber(entry, from);
      if (!Number.isFinite(range) || range === 0) return toLow;
      return (value - from) * targetRange / range + toLow;
    });
    copySequenceMetadata(source, fitted);
    return fitted;
  });
};
const normalizeRuntimeExecutionMode = (value, fallback = "auto") => {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "fragment" || normalized === "auto") return normalized;
  return fallback;
};
const DEFAULT_RUNTIME_DELTA_MS = 16;
const MAX_FRAME_HISTORY = 240;
const DEFAULT_MAX_OUTPUTS = 64;
const coerceCount = (value, fallback, minimum) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(minimum, Math.floor(value));
};
const coerceOutputIndex = (value) => {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new Error("HydraBrowserRuntime: output index must be a finite non-negative number.");
  }
  return Math.floor(numeric);
};
const coerceNonNegativeFinite = (value, fallback) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return fallback;
  return value;
};
class HydraBrowserRuntime {
  host;
  renderer;
  engine;
  outputs;
  sources;
  synth;
  mouse;
  audio;
  capabilities = null;
  onDebugCallback;
  registry;
  patchbay;
  mouseInput;
  activeOutput;
  renderAll = false;
  initPromise = null;
  disposed = false;
  frameTimesMs = [];
  autotuner = new HydraAutotuner();
  executionMode;
  executor = null;
  lastExecuteResult = null;
  lastPlan = null;
  maxOutputs;
  routingDiagnostics;
  constructor({
    host,
    renderer,
    patchbay = null,
    numSources = 4,
    numOutputs = 4,
    maxOutputs = DEFAULT_MAX_OUTPUTS,
    extendTransforms,
    autoLoop = true,
    audio = false,
    detectAudio = false,
    fps,
    speed = 1,
    bpm = 30,
    mouse = true,
    executionMode = "auto",
    errorPolicy = "emit",
    onError,
    onDebug
  }) {
    installArraySequenceExtensions();
    this.host = host;
    const normalizedHostWidth = normalizeEvenCanvasDimension(this.host.canvas.width, 1280);
    const normalizedHostHeight = normalizeEvenCanvasDimension(this.host.canvas.height, 720);
    if (this.host.canvas.width !== normalizedHostWidth || this.host.canvas.height !== normalizedHostHeight) {
      this.host.setResolution(normalizedHostWidth, normalizedHostHeight);
    }
    this.renderer = renderer;
    this.patchbay = patchbay;
    this.executionMode = normalizeRuntimeExecutionMode(executionMode, "auto");
    this.onDebugCallback = onDebug;
    const normalizedMouseOptions = mouse === false ? { enabled: false } : mouse === true ? {} : mouse ?? {};
    this.mouseInput = createHydraMouseInput({
      element: this.host.canvas,
      ...normalizedMouseOptions
    });
    this.mouse = this.mouseInput.state;
    this.routingDiagnostics = {
      configuredMode: this.executionMode,
      activeMode: "fragment",
      compileFailures: 0,
      routeFailureCount: 0
    };
    const sourceCount = coerceCount(numSources, 4, 0);
    const outputCount = coerceCount(numOutputs, 4, 1);
    this.maxOutputs = Math.max(outputCount, coerceCount(maxOutputs, DEFAULT_MAX_OUTPUTS, outputCount));
    this.outputs = Array(outputCount).fill(null).map((_, index) => this.createOutputNode(index));
    this.sources = [];
    for (let index = 0; index < sourceCount; index += 1) {
      this.sources.push(new HydraSourceNode({
        renderer: null,
        pb: this.patchbay,
        label: `s${index}`
      }));
    }
    this.activeOutput = this.outputs[0];
    const rendererAdapter = new WebGPUFrameRendererAdapter({
      renderer: this.renderer,
      outputs: this.outputs,
      sources: this.sources,
      getRenderAll: () => this.renderAll,
      getActiveOutput: () => this.activeOutput
    });
    this.engine = new HydraEngine({
      renderer: rendererAdapter,
      sources: this.sources,
      width: this.host.canvas.width,
      height: this.host.canvas.height,
      fps,
      speed,
      bpm,
      errorPolicy,
      onError
    });
    this.outputs.forEach((output) => {
      this.configureOutputNode(output);
    });
    this.synth = this.engine.getBindings();
    this.synth.stats = { fps: 0 };
    this.synth.capabilities = this.capabilities;
    this.synth.render = this.render.bind(this);
    this.synth.setResolution = this.setResolution.bind(this);
    this.synth.hush = this.hush.bind(this);
    this.synth.tick = this.tick.bind(this);
    this.synth.emitEvent = this.emitEvent.bind(this);
    this.synth.createSource = this.createSource.bind(this);
    this.synth.createOutput = this.createOutput.bind(this);
    this.synth.ensureOutput = this.ensureOutput.bind(this);
    this.synth.ensureOutputBuffer = this.ensureOutput.bind(this);
    this.synth.getPassStats = this.getPassStats.bind(this);
    this.synth.getExecutionMode = this.getExecutionMode.bind(this);
    this.synth.setExecutionMode = this.setExecutionMode.bind(this);
    this.synth.compilePlan = this.compilePlan.bind(this);
    this.synth.executePlan = this.executePlan.bind(this);
    this.synth.getProfilerSnapshot = this.getProfilerSnapshot.bind(this);
    this.synth.autotune = this.autotune.bind(this);
    this.synth.getAutotuneProfile = this.getAutotuneProfile.bind(this);
    this.synth.setTuningPolicy = this.setTuningPolicy.bind(this);
    this.synth.clearAutotuneProfiles = this.clearAutotuneProfiles.bind(this);
    this.synth.dumpShaders = this.dumpShaders.bind(this);
    this.synth.setCanvasDisplay = this.setCanvasDisplay.bind(this);
    this.synth.resetCanvasDisplay = this.resetCanvasDisplay.bind(this);
    this.synth.mouse = this.mouse;
    const audioOptions = typeof audio === "object" ? audio : {};
    this.audio = new HydraAudioAnalyzer({
      parentEl: this.host.canvas.parentElement ?? (typeof document !== "undefined" ? document.body : void 0),
      ...audioOptions
    });
    this.audio.attachBindings(this.synth);
    if (audio === true || detectAudio === true || audioOptions.autostart === true) {
      void this.audio.start(audioOptions.source).catch((error) => {
        this.engine.reportCompileError("audio.init", error);
      });
    }
    this.outputs.forEach((output, index) => {
      this.synth[`o${index}`] = output;
    });
    this.sources.forEach((source, index) => {
      this.synth[`s${index}`] = source;
    });
    let registryRef = null;
    this.registry = new HydraTransformRegistry({
      defaultOutput: this.outputs[0],
      extendTransforms,
      onCompileError: (transformName, error) => {
        this.engine.reportCompileError(transformName, error);
      },
      onChange: ({ method }) => {
        if (!registryRef) return;
        this.synth[method] = registryRef.generators[method];
      }
    });
    registryRef = this.registry;
    this.registry.attachToBindings(this.synth);
    if (autoLoop) {
      void this.start().catch(() => {
      });
    }
  }
  get bindings() {
    return this.engine.getBindings();
  }
  init() {
    if (this.disposed) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.engine.init().then(() => {
      this.capabilities = this.renderer.getCapabilities();
      this.synth.capabilities = this.capabilities;
      if (!this.executor) {
        this.executor = new HydraExecutor();
      }
    });
    return this.initPromise;
  }
  async start() {
    if (this.disposed) return;
    await this.init();
    this.host.start((deltaMs) => {
      this.tick(deltaMs);
    });
  }
  stop() {
    this.host.stop();
  }
  tick(deltaMs = DEFAULT_RUNTIME_DELTA_MS) {
    if (this.disposed) return;
    const safeDeltaMs = coerceNonNegativeFinite(deltaMs, DEFAULT_RUNTIME_DELTA_MS);
    this.audio.tick();
    const renderedDeltaMs = this.engine.tick(safeDeltaMs);
    if (!(renderedDeltaMs > 0)) return;
    this.frameTimesMs.push(renderedDeltaMs);
    while (this.frameTimesMs.length > MAX_FRAME_HISTORY) this.frameTimesMs.shift();
    const stats = this.synth.stats;
    stats.fps = Math.ceil(1e3 / renderedDeltaMs);
  }
  emitEvent(name) {
    if (!name) return;
    this.outputs.forEach((output) => output.emitEvent(name));
  }
  render(output) {
    if (output) {
      this.activeOutput = output;
      this.renderAll = false;
      return;
    }
    this.renderAll = true;
  }
  getActiveOutput() {
    return this.activeOutput;
  }
  isRenderAllEnabled() {
    return this.renderAll;
  }
  setResolution(width, height) {
    const nextWidth = normalizeEvenCanvasDimension(width, this.host.canvas.width);
    const nextHeight = normalizeEvenCanvasDimension(height, this.host.canvas.height);
    this.host.setResolution(nextWidth, nextHeight);
    this.engine.setResolution(nextWidth, nextHeight);
    this.outputs.forEach((output) => output.resize(nextWidth, nextHeight));
  }
  setCanvasDisplay(width, height, options) {
    const nextWidth = normalizeEvenCanvasDimension(width, this.host.canvas.width);
    const nextHeight = normalizeEvenCanvasDimension(height, this.host.canvas.height);
    this.host.setCanvasDisplay(nextWidth, nextHeight, options);
    this.engine.setResolution(nextWidth, nextHeight);
    this.outputs.forEach((output) => output.resize(nextWidth, nextHeight));
    this.renderer.setResolution(nextWidth, nextHeight);
  }
  resetCanvasDisplay() {
    this.host.resetCanvasDisplay();
  }
  createSource() {
    const sourceIndex = this.sources.length;
    const source = new HydraSourceNode({
      renderer: this.renderer.ready ? this.renderer : null,
      pb: this.patchbay,
      label: `s${sourceIndex}`
    });
    this.engine.addSource(source);
    if (this.renderer.ready) source.attachRenderer(this.renderer);
    this.synth[`s${sourceIndex}`] = source;
    return source;
  }
  createOutput() {
    return this.ensureOutput(this.outputs.length);
  }
  ensureOutput(index) {
    if (this.disposed) {
      throw new Error("HydraBrowserRuntime: cannot create outputs after dispose.");
    }
    const outputIndex = coerceOutputIndex(index);
    if (outputIndex >= this.maxOutputs) {
      throw new Error(`HydraBrowserRuntime: output index o${outputIndex} exceeds maxOutputs (${this.maxOutputs}).`);
    }
    while (this.outputs.length <= outputIndex) {
      const nextIndex = this.outputs.length;
      const output2 = this.createOutputNode(nextIndex);
      this.configureOutputNode(output2);
      this.outputs.push(output2);
      this.synth[`o${nextIndex}`] = output2;
      if (this.renderer.ready) output2.attachRenderer(this.renderer);
    }
    const output = this.outputs[outputIndex];
    if (!output) throw new Error(`HydraBrowserRuntime: failed to create output o${outputIndex}.`);
    return output;
  }
  getPassStats() {
    const stats = {};
    this.outputs.forEach((output, index) => {
      stats[`o${index}`] = output.getPassStats();
    });
    return stats;
  }
  getExecutionMode() {
    return this.executionMode;
  }
  setExecutionMode(mode) {
    this.executionMode = normalizeRuntimeExecutionMode(mode, this.executionMode);
    this.routingDiagnostics.configuredMode = this.executionMode;
    return this.executionMode;
  }
  ensureExecutor() {
    if (!this.executor) {
      this.executor = new HydraExecutor();
    }
    return this.executor;
  }
  createOutputNode(index) {
    const output = new WebGPUOutputNode({
      renderer: null,
      width: this.host.canvas.width,
      height: this.host.canvas.height,
      label: `o${index}`
    });
    output.id = index;
    output.setGraphRenderHandler((targetOutput, graphSource) => {
      this.routeGraphRender(targetOutput, graphSource);
    });
    return output;
  }
  configureOutputNode(output) {
    output.setPipelineErrorHandler(({ outputLabel, passIndex, signature, error }) => {
      this.engine.reportCompileError(`${outputLabel}:pass${passIndex}`, { signature, cause: error });
    });
  }
  getCurrentFrameState() {
    return {
      time: Number(this.synth.time ?? 0),
      bpm: Number(this.synth.bpm ?? 30),
      resolution: [this.host.canvas.width, this.host.canvas.height],
      deltaMs: this.frameTimesMs[this.frameTimesMs.length - 1] ?? DEFAULT_RUNTIME_DELTA_MS
    };
  }
  routeGraphRender(output, graphSource) {
    this.routingDiagnostics.configuredMode = this.executionMode;
    this.routingDiagnostics.activeMode = "fragment";
    let plan = null;
    try {
      const transforms = Array.isArray(graphSource.transforms) ? graphSource.transforms : [];
      if (transforms.length > 0) {
        plan = this.compilePlan({ transforms });
      } else if (typeof graphSource.compilePlan === "function") {
        plan = graphSource.compilePlan() ?? null;
      }
    } catch (error) {
      this.routingDiagnostics.compileFailures += 1;
      this.routingDiagnostics.routeFailureCount += 1;
      this.engine.reportCompileError(`${output.label}:fragment-route`, error);
      return;
    }
    if (!plan) {
      this.routingDiagnostics.compileFailures += 1;
      this.routingDiagnostics.routeFailureCount += 1;
      this.engine.reportCompileError(
        `${output.label}:fragment-route`,
        new Error("Plan compilation produced no plan for the current graph output.")
      );
      return;
    }
    try {
      this.lastExecuteResult = this.ensureExecutor().executePlan(
        output,
        plan,
        this.getCurrentFrameState(),
        {}
      );
      this.lastPlan = plan;
      this.routingDiagnostics.activeMode = "fragment";
    } catch (error) {
      this.routingDiagnostics.routeFailureCount += 1;
      this.engine.reportCompileError(`${output.label}:fragment-route`, error);
    }
  }
  compilePlan(graphNode) {
    const transforms = Array.isArray(graphNode?.transforms) ? graphNode?.transforms : null;
    if (!transforms || transforms.length === 0) return null;
    return compileGraph(transforms, {
      graphId: "runtime-plan",
      onDebug: this.onDebugCallback
    });
  }
  executePlan(graphNode, output = this.activeOutput, options = {}) {
    const plan = this.compilePlan(graphNode);
    if (!plan) return null;
    this.lastExecuteResult = this.ensureExecutor().executePlan(output, plan, this.getCurrentFrameState(), {
      ...options
    });
    this.routingDiagnostics.activeMode = "fragment";
    this.lastPlan = plan;
    return plan;
  }
  getProfilerSnapshot() {
    const residentBytesEstimate = this.executor?.getResidentByteEstimate() ?? this.outputs.map((output) => output.getPassStats()).reduce((sum, outputStats) => {
      const outputBytes = Object.values(outputStats).reduce((local, stats) => local + stats.runCount * 16, 0);
      return sum + outputBytes;
    }, 0);
    return buildProfilerSnapshot({
      frameTimesMs: this.frameTimesMs,
      outputs: this.outputs,
      capabilities: this.capabilities,
      residentBytesEstimate,
      routingMetrics: {
        configuredMode: this.routingDiagnostics.configuredMode,
        activeMode: this.routingDiagnostics.activeMode,
        compileFailures: this.routingDiagnostics.compileFailures,
        routeFailureCount: this.routingDiagnostics.routeFailureCount
      }
    });
  }
  autotune({
    profileKey = "default",
    policy,
    candidateProfiles,
    kernelSignature = "runtime-default"
  } = {}) {
    const snapshot = this.getProfilerSnapshot();
    const activePolicy = policy ?? this.autotuner.getPolicy();
    const adapterFingerprint = this.capabilities ? [
      `features:${(this.capabilities.features ?? []).join(",")}`,
      `target:${this.capabilities.fragment.targetFormat}`,
      `attachments:${this.capabilities.fragment.maxColorAttachments}`
    ].join("|") : "unknown-adapter";
    const browserFingerprint = typeof navigator !== "undefined" ? `${navigator.userAgent}` : "non-browser";
    const resolutionClass = `${this.host.canvas.width}x${this.host.canvas.height}`;
    const normalizedCandidates = (candidateProfiles && candidateProfiles.length > 0 ? candidateProfiles : ["conservative", "balanced", "aggressive"]).map((candidate) => `${candidate}`.trim().toLowerCase()).filter((candidate) => candidate.length > 0);
    const fingerprintKey = [adapterFingerprint, browserFingerprint, kernelSignature, resolutionClass].join("|");
    const candidateSignature = buildCandidateSignature(normalizedCandidates);
    const cached = this.autotuner.getProfileByFingerprint(profileKey, fingerprintKey);
    if (cached && cached.policy === activePolicy && cached.candidateSignature === candidateSignature) {
      return cached;
    }
    return this.autotuner.run({
      profileKey,
      policy: activePolicy,
      candidateProfiles: normalizedCandidates,
      profilerSnapshot: snapshot,
      adapterFingerprint,
      browserFingerprint,
      kernelSignature,
      resolutionClass
    });
  }
  getAutotuneProfile(profileKey = "default") {
    return this.autotuner.getProfile(profileKey);
  }
  setTuningPolicy(policy) {
    this.autotuner.setPolicy(policy);
  }
  clearAutotuneProfiles(profileKey) {
    this.autotuner.clear(profileKey);
  }
  dumpShaders() {
    if (this.lastPlan) {
      return this.lastPlan.steps.map((step) => `// Signature: ${step.signature}
${step.compiledPass.wgsl}`);
    }
    return [];
  }
  hush() {
    this.sources.forEach((source) => source.clear());
    const solid = this.registry.generators.solid;
    if (solid) {
      this.outputs.forEach((output) => {
        solid(0, 0, 0, 0).out(output);
      });
    }
    this.render(this.outputs[0]);
    this.synth.update = () => {
    };
    this.synth.afterUpdate = () => {
    };
  }
  attachPlugin(plugin) {
    return this.engine.attachPlugin(plugin);
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    this.outputs.forEach((output) => output.setGraphRenderHandler(null));
    this.executor?.dispose();
    this.executor = null;
    this.lastExecuteResult = null;
    this.audio.dispose();
    this.mouseInput.dispose();
    this.engine.dispose();
    this.host.dispose();
  }
}
class PipelineCache {
  device;
  targetFormat;
  maxEntries;
  entries = /* @__PURE__ */ new Map();
  constructor({ device, targetFormat, maxEntries = 256 }) {
    this.device = device;
    this.targetFormat = targetFormat;
    this.maxEntries = Math.max(1, Math.floor(maxEntries));
  }
  hashString(value = "") {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }
  buildEntryKey(signature, code, collisionIndex = 0) {
    const base = `${signature}|h${this.hashString(code)}|l${code.length}`;
    if (collisionIndex <= 0) return base;
    return `${base}|c${collisionIndex}`;
  }
  findEntry(signature, code) {
    let collisionIndex = 0;
    while (true) {
      const cacheKey = this.buildEntryKey(signature, code, collisionIndex);
      const existing = this.entries.get(cacheKey);
      if (!existing) return { cacheKey, entry: null };
      if (existing.code === code) return { cacheKey, entry: existing };
      collisionIndex += 1;
    }
  }
  touch(cacheKey, entry) {
    this.entries.delete(cacheKey);
    this.entries.set(cacheKey, entry);
  }
  evictIfNeeded() {
    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (!oldestKey) return;
      this.entries.delete(oldestKey);
    }
  }
  requestPipeline(signature, code) {
    const { cacheKey, entry: cachedEntry } = this.findEntry(signature, code);
    if (cachedEntry) {
      this.touch(cacheKey, cachedEntry);
      return cachedEntry;
    }
    const labelSuffix = this.hashString(cacheKey);
    const module = this.device.createShaderModule({
      label: `hydra-shader-${labelSuffix}`,
      code
    });
    const entry = {
      cacheKey,
      signature,
      code,
      module,
      pipeline: null,
      error: null,
      promise: null
    };
    entry.promise = this.device.createRenderPipelineAsync({
      label: `hydra-pipeline-${labelSuffix}`,
      layout: "auto",
      vertex: {
        module,
        entryPoint: "vsMain"
      },
      fragment: {
        module,
        entryPoint: "fsMain",
        targets: [{ format: this.targetFormat }]
      },
      primitive: {
        topology: "triangle-list"
      }
    }).then((pipeline) => {
      entry.pipeline = pipeline;
      return pipeline;
    }).catch((error) => {
      entry.error = error;
      throw error;
    });
    this.entries.set(cacheKey, entry);
    this.evictIfNeeded();
    return entry;
  }
  clear() {
    this.entries.clear();
  }
}
const WEBGPU_UNAVAILABLE_MESSAGE = "WebGPU is unavailable. Use a secure context (https:// or localhost) in a browser with WebGPU enabled, then retry.";
class WebGPURenderer {
  canvas;
  width;
  height;
  ready = false;
  initError = null;
  adapter = null;
  device = null;
  context = null;
  canvasFormat = null;
  globalUniformBuffer = null;
  linearSampler = null;
  nearestSampler = null;
  fallbackTexture = null;
  capabilities = null;
  outputPipelineCache = null;
  screenPipeline = null;
  screenAllPipeline = null;
  globalUniformData = new Float32Array(4);
  textureViewCache = /* @__PURE__ */ new WeakMap();
  objectIds = /* @__PURE__ */ new WeakMap();
  nextObjectId = 1;
  screenBindGroupCacheKey = "";
  screenBindGroup = null;
  screenAllBindGroupCacheKey = "";
  screenAllBindGroup = null;
  screenResolvedTextures = [null, null, null, null];
  constructor({ canvas, width = canvas.width || 1280, height = canvas.height || 720 }) {
    this.canvas = canvas;
    this.width = width;
    this.height = height;
  }
  static assertSupport() {
    if (typeof navigator === "undefined" || !navigator.gpu) {
      throw new Error(WEBGPU_UNAVAILABLE_MESSAGE);
    }
  }
  async init() {
    if (this.ready) return this;
    WebGPURenderer.assertSupport();
    this.context = this.canvas.getContext("webgpu");
    if (!this.context) {
      throw new Error("WebGPU context creation failed. Ensure this canvas supports `webgpu` contexts and retry.");
    }
    this.adapter = await navigator.gpu.requestAdapter();
    if (!this.adapter) {
      throw new Error("No compatible GPU adapter was found. Verify WebGPU is enabled and GPU acceleration is available.");
    }
    this.device = await this.adapter.requestDevice();
    this.canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    this.capabilities = this.inspectCapabilities();
    this.configureCanvas();
    this.initGlobalResources();
    this.initScreenPipelines();
    this.outputPipelineCache = new PipelineCache({
      device: this.device,
      targetFormat: OUTPUT_TEXTURE_FORMAT,
      maxEntries: 256
    });
    this.ready = true;
    return this;
  }
  inspectCapabilities() {
    if (!this.adapter || !this.device) return null;
    const limits = this.device.limits;
    const readLimit = (name, fallback = 0) => {
      const value = limits[name];
      return typeof value === "number" && Number.isFinite(value) ? value : fallback;
    };
    const features = Array.from(this.device.features.values()).map((entry) => `${entry}`);
    const targetFormat = this.canvasFormat ?? navigator.gpu.getPreferredCanvasFormat();
    return {
      fragment: {
        targetFormat,
        maxColorAttachments: readLimit("maxColorAttachments")
      },
      features
    };
  }
  configureCanvas() {
    if (!this.context || !this.device || !this.canvasFormat) return;
    this.context.configure({
      device: this.device,
      format: this.canvasFormat,
      alphaMode: "premultiplied",
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
    });
  }
  initGlobalResources() {
    if (!this.device) return;
    this.globalUniformBuffer = this.device.createBuffer({
      label: "hydra-global-uniforms",
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    this.nearestSampler = this.device.createSampler({
      magFilter: "nearest",
      minFilter: "nearest",
      mipmapFilter: "nearest",
      addressModeU: "repeat",
      addressModeV: "repeat"
    });
    this.linearSampler = this.device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
      mipmapFilter: "linear",
      addressModeU: "repeat",
      addressModeV: "repeat"
    });
    this.fallbackTexture = this.createOutputTexture({
      width: 1,
      height: 1,
      label: "hydra-fallback-texture"
    });
    const encoder = this.device.createCommandEncoder({ label: "hydra-fallback-clear" });
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: this.getTextureView(this.fallbackTexture),
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: "clear",
        storeOp: "store"
      }]
    });
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }
  initScreenPipelines() {
    if (!this.device || !this.canvasFormat) return;
    const baseVertex = `
fn hydraFullscreenVertex(vertexIndex: u32) -> vec4f {
  let positions = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );
  let p = positions[vertexIndex];
  return vec4f(p, 0.0, 1.0);
}
`;
    const singleShader = `
struct GlobalUniforms {
  time: f32,
  bpm: f32,
  width: f32,
  height: f32,
};

@group(0) @binding(0) var<uniform> globals: GlobalUniforms;
@group(0) @binding(1) var hydraSampler: sampler;
@group(0) @binding(2) var tex0: texture_2d<f32>;

${baseVertex}

@vertex
fn vsMain(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
  return hydraFullscreenVertex(vertexIndex);
}

@fragment
fn fsMain(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
  let uv = vec2f(fragCoord.x / globals.width, fragCoord.y / globals.height);
  return textureSample(tex0, hydraSampler, fract(uv));
}
`;
    const allShader = `
struct GlobalUniforms {
  time: f32,
  bpm: f32,
  width: f32,
  height: f32,
};

@group(0) @binding(0) var<uniform> globals: GlobalUniforms;
@group(0) @binding(1) var hydraSampler: sampler;
@group(0) @binding(2) var tex0: texture_2d<f32>;
@group(0) @binding(3) var tex1: texture_2d<f32>;
@group(0) @binding(4) var tex2: texture_2d<f32>;
@group(0) @binding(5) var tex3: texture_2d<f32>;

${baseVertex}

@vertex
fn vsMain(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
  return hydraFullscreenVertex(vertexIndex);
}

@fragment
fn fsMain(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
  let uv = vec2f(fragCoord.x / globals.width, fragCoord.y / globals.height);
  let tiled = clamp(uv * 2.0, vec2f(0.0), vec2f(1.9999));
  let localUv = fract(tiled);
  let cellX = i32(floor(tiled.x));
  let cellY = i32(floor(tiled.y));
  let quad = cellX + (cellY * 2);

  if (quad == 0) {
    return textureSampleLevel(tex0, hydraSampler, localUv, 0.0);
  }
  if (quad == 1) {
    return textureSampleLevel(tex1, hydraSampler, localUv, 0.0);
  }
  if (quad == 2) {
    return textureSampleLevel(tex2, hydraSampler, localUv, 0.0);
  }
  return textureSampleLevel(tex3, hydraSampler, localUv, 0.0);
}
`;
    const singleModule = this.device.createShaderModule({
      label: "hydra-screen-single-module",
      code: singleShader
    });
    const allModule = this.device.createShaderModule({
      label: "hydra-screen-all-module",
      code: allShader
    });
    this.screenPipeline = this.device.createRenderPipeline({
      label: "hydra-screen-single-pipeline",
      layout: "auto",
      vertex: {
        module: singleModule,
        entryPoint: "vsMain"
      },
      fragment: {
        module: singleModule,
        entryPoint: "fsMain",
        targets: [{ format: this.canvasFormat }]
      },
      primitive: {
        topology: "triangle-list"
      }
    });
    this.screenAllPipeline = this.device.createRenderPipeline({
      label: "hydra-screen-all-pipeline",
      layout: "auto",
      vertex: {
        module: allModule,
        entryPoint: "vsMain"
      },
      fragment: {
        module: allModule,
        entryPoint: "fsMain",
        targets: [{ format: this.canvasFormat }]
      },
      primitive: {
        topology: "triangle-list"
      }
    });
  }
  setResolution(width, height) {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    if (this.ready) this.configureCanvas();
  }
  updateGlobalUniforms({ time, bpm, width, height }) {
    if (!this.ready || !this.device || !this.globalUniformBuffer) return;
    if (typeof width === "number") this.width = width;
    if (typeof height === "number") this.height = height;
    this.globalUniformData[0] = time;
    this.globalUniformData[1] = bpm;
    this.globalUniformData[2] = this.width;
    this.globalUniformData[3] = this.height;
    this.device.queue.writeBuffer(this.globalUniformBuffer, 0, this.globalUniformData);
  }
  createOutputTexture({
    width = this.width,
    height = this.height,
    depthOrArrayLayers = 1,
    label = "",
    format = OUTPUT_TEXTURE_FORMAT,
    includeRenderAttachment = true
  } = {}) {
    if (!this.device) throw new Error("Renderer not initialized.");
    return this.device.createTexture({
      label: label || "hydra-output-texture",
      size: {
        width: Math.max(1, Math.floor(width)),
        height: Math.max(1, Math.floor(height)),
        depthOrArrayLayers: Math.max(1, Math.floor(depthOrArrayLayers))
      },
      format,
      usage: createOutputTextureUsage({ includeRenderAttachment })
    });
  }
  createDynamicUniformBuffer(label) {
    if (!this.device) throw new Error("Renderer not initialized.");
    return this.device.createBuffer({
      label,
      size: MAX_DYNAMIC_UNIFORMS * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
  }
  createReadbackBuffer(label, byteLength) {
    if (!this.device) throw new Error("Renderer not initialized.");
    const aligned = Math.max(256, Math.ceil(Math.max(1, byteLength) / 256) * 256);
    return this.device.createBuffer({
      label,
      size: aligned,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });
  }
  getCapabilities() {
    return this.capabilities;
  }
  getFallbackTexture() {
    if (!this.fallbackTexture) throw new Error("Renderer fallback texture is not initialized.");
    return this.fallbackTexture;
  }
  getOutputPipelineEntry(signature, code) {
    if (!this.outputPipelineCache) return null;
    return this.outputPipelineCache.requestPipeline(signature, code);
  }
  getObjectId(value) {
    if (!value) return 0;
    let id = this.objectIds.get(value);
    if (!id) {
      id = this.nextObjectId++;
      this.objectIds.set(value, id);
    }
    return id;
  }
  getTextureView(texture, dimension = "2d") {
    let viewCache = this.textureViewCache.get(texture);
    if (!viewCache) {
      viewCache = /* @__PURE__ */ new Map();
      this.textureViewCache.set(texture, viewCache);
    }
    const cacheKey = dimension;
    let view = viewCache.get(cacheKey);
    if (!view) {
      view = texture.createView({ dimension });
      viewCache.set(cacheKey, view);
    }
    return view;
  }
  invalidateScreenBindGroupCaches() {
    this.screenBindGroupCacheKey = "";
    this.screenBindGroup = null;
    this.screenAllBindGroupCacheKey = "";
    this.screenAllBindGroup = null;
  }
  beginFrame() {
    if (!this.ready || !this.device) return null;
    return this.device.createCommandEncoder({ label: "hydra-frame-encoder" });
  }
  getSampler(filter = "nearest") {
    return filter === "linear" ? this.linearSampler : this.nearestSampler;
  }
  submitFrame(encoder) {
    if (!this.ready || !this.device || !encoder) return;
    this.device.queue.submit([encoder.finish()]);
  }
  renderTextureToScreen(encoder, texture) {
    const screenSampler = this.getSampler("nearest");
    if (!this.ready || !this.context || !this.screenPipeline || !this.globalUniformBuffer || !screenSampler || !this.device) return;
    const targetView = this.context.getCurrentTexture().createView();
    const renderPass = encoder.beginRenderPass({
      colorAttachments: [{
        view: targetView,
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: "clear",
        storeOp: "store"
      }]
    });
    const sourceTexture = texture ?? this.getFallbackTexture();
    const bindGroupCacheKey = [
      `p${this.getObjectId(this.screenPipeline)}`,
      `g${this.getObjectId(this.globalUniformBuffer)}`,
      `s${this.getObjectId(screenSampler)}`,
      `t${this.getObjectId(sourceTexture)}`
    ].join("|");
    if (!this.screenBindGroup || this.screenBindGroupCacheKey !== bindGroupCacheKey) {
      this.screenBindGroup = this.device.createBindGroup({
        layout: this.screenPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.globalUniformBuffer } },
          { binding: 1, resource: screenSampler },
          { binding: 2, resource: this.getTextureView(sourceTexture) }
        ]
      });
      this.screenBindGroupCacheKey = bindGroupCacheKey;
    }
    renderPass.setPipeline(this.screenPipeline);
    renderPass.setBindGroup(0, this.screenBindGroup);
    renderPass.draw(3, 1, 0, 0);
    renderPass.end();
  }
  renderAllOutputsToScreen(encoder, textures = []) {
    const screenSampler = this.getSampler("nearest");
    if (!this.ready || !this.context || !this.screenAllPipeline || !this.globalUniformBuffer || !screenSampler || !this.device) return;
    const fallback = this.getFallbackTexture();
    const resolved = this.screenResolvedTextures;
    resolved[0] = fallback;
    resolved[1] = fallback;
    resolved[2] = fallback;
    resolved[3] = fallback;
    for (let index = 0; index < 4; index += 1) {
      if (textures[index]) resolved[index] = textures[index];
    }
    const targetView = this.context.getCurrentTexture().createView();
    const renderPass = encoder.beginRenderPass({
      colorAttachments: [{
        view: targetView,
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: "clear",
        storeOp: "store"
      }]
    });
    const bindGroupCacheKey = [
      `p${this.getObjectId(this.screenAllPipeline)}`,
      `g${this.getObjectId(this.globalUniformBuffer)}`,
      `s${this.getObjectId(screenSampler)}`,
      `t0${this.getObjectId(resolved[0])}`,
      `t1${this.getObjectId(resolved[1])}`,
      `t2${this.getObjectId(resolved[2])}`,
      `t3${this.getObjectId(resolved[3])}`
    ].join("|");
    if (!this.screenAllBindGroup || this.screenAllBindGroupCacheKey !== bindGroupCacheKey) {
      this.screenAllBindGroup = this.device.createBindGroup({
        layout: this.screenAllPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: this.globalUniformBuffer } },
          { binding: 1, resource: screenSampler },
          { binding: 2, resource: this.getTextureView(resolved[0] ?? fallback) },
          { binding: 3, resource: this.getTextureView(resolved[1] ?? fallback) },
          { binding: 4, resource: this.getTextureView(resolved[2] ?? fallback) },
          { binding: 5, resource: this.getTextureView(resolved[3] ?? fallback) }
        ]
      });
      this.screenAllBindGroupCacheKey = bindGroupCacheKey;
    }
    renderPass.setPipeline(this.screenAllPipeline);
    renderPass.setBindGroup(0, this.screenAllBindGroup);
    renderPass.draw(3, 1, 0, 0);
    renderPass.end();
  }
  dispose() {
    this.ready = false;
    this.invalidateScreenBindGroupCaches();
    if (this.outputPipelineCache) this.outputPipelineCache.clear();
    this.outputPipelineCache = null;
    if (this.globalUniformBuffer) this.globalUniformBuffer.destroy();
    this.globalUniformBuffer = null;
    if (this.fallbackTexture) this.fallbackTexture.destroy();
    this.fallbackTexture = null;
    this.textureViewCache = /* @__PURE__ */ new WeakMap();
    this.objectIds = /* @__PURE__ */ new WeakMap();
    this.nextObjectId = 1;
    this.screenPipeline = null;
    this.screenAllPipeline = null;
    this.linearSampler = null;
    this.nearestSampler = null;
    this.capabilities = null;
    this.context = null;
    this.device = null;
    this.adapter = null;
    this.canvasFormat = null;
  }
}
const OUTPUT_IDENTIFIER_PATTERN = /\bo(\d+)\b/g;
const stripStringsAndComments = (code) => {
  let output = "";
  let index = 0;
  let state = "code";
  while (index < code.length) {
    const current = code[index] ?? "";
    const next = code[index + 1] ?? "";
    if (state === "lineComment") {
      if (current === "\n" || current === "\r") {
        state = "code";
        output += current;
      } else {
        output += " ";
      }
      index += 1;
      continue;
    }
    if (state === "blockComment") {
      if (current === "*" && next === "/") {
        output += "  ";
        index += 2;
        state = "code";
      } else {
        output += current === "\n" || current === "\r" ? current : " ";
        index += 1;
      }
      continue;
    }
    if (state === "singleQuote" || state === "doubleQuote" || state === "template") {
      const terminator = state === "singleQuote" ? "'" : state === "doubleQuote" ? '"' : "`";
      if (current === "\\") {
        output += "  ";
        index += 2;
        continue;
      }
      if (current === terminator) {
        output += " ";
        index += 1;
        state = "code";
        continue;
      }
      output += current === "\n" || current === "\r" ? current : " ";
      index += 1;
      continue;
    }
    if (current === "/" && next === "/") {
      output += "  ";
      index += 2;
      state = "lineComment";
      continue;
    }
    if (current === "/" && next === "*") {
      output += "  ";
      index += 2;
      state = "blockComment";
      continue;
    }
    if (current === "'") {
      output += " ";
      index += 1;
      state = "singleQuote";
      continue;
    }
    if (current === '"') {
      output += " ";
      index += 1;
      state = "doubleQuote";
      continue;
    }
    if (current === "`") {
      output += " ";
      index += 1;
      state = "template";
      continue;
    }
    output += current;
    index += 1;
  }
  return output;
};
const findReferencedOutputIndices = (code) => {
  const stripped = stripStringsAndComments(code);
  const indices = /* @__PURE__ */ new Set();
  let match;
  OUTPUT_IDENTIFIER_PATTERN.lastIndex = 0;
  while (match = OUTPUT_IDENTIFIER_PATTERN.exec(stripped)) {
    const rawIndex = match[1];
    if (!rawIndex) continue;
    const index = Number(rawIndex);
    if (Number.isSafeInteger(index) && index >= 0) indices.add(index);
  }
  return Array.from(indices).sort((left, right) => left - right);
};
const defaultHydraFileBaseName = () => {
  const date = /* @__PURE__ */ new Date();
  return `hydra-${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}.${date.getMinutes()}.${date.getSeconds()}`;
};
const downloadBlob = (blob, fileName) => {
  if (typeof document === "undefined" || typeof URL === "undefined") return;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    anchor.remove();
  }, 300);
};
const canvasToBlob = (canvas) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(new Error("Hydra screenshot failed."));
  }, "image/png");
});
class LegacyVideoRecorder {
  output;
  runtime;
  stream;
  mediaRecorder = null;
  recordedBlobs = [];
  startedAtMs = 0;
  constructor(runtime, stream) {
    this.runtime = runtime;
    this.stream = stream;
    this.output = typeof document !== "undefined" ? document.createElement("video") : null;
    if (this.output) {
      this.output.autoplay = true;
      this.output.loop = true;
    }
  }
  start(options = {}) {
    this.startedAtMs = typeof performance !== "undefined" ? performance.now() : Date.now();
    this.recordedBlobs = [];
    if (!this.stream || typeof MediaRecorder === "undefined") return;
    const mimeCandidates = [
      options.mimeType,
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm"
    ].filter((entry) => Boolean(entry));
    let recorder = null;
    for (const mimeType of mimeCandidates) {
      try {
        recorder = new MediaRecorder(this.stream, { mimeType });
        break;
      } catch {
      }
    }
    if (!recorder) recorder = new MediaRecorder(this.stream);
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) this.recordedBlobs.push(event.data);
    };
    this.mediaRecorder = recorder;
    recorder.start(100);
  }
  async stop(options = {}) {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      const recorder = this.mediaRecorder;
      const blob2 = await new Promise((resolve) => {
        recorder.onstop = () => {
          const mimeType = recorder.mimeType || "video/webm";
          resolve(new Blob(this.recordedBlobs, { type: mimeType }));
        };
        recorder.stop();
      });
      if (this.output && typeof URL !== "undefined") this.output.src = URL.createObjectURL(blob2);
      if (options.download !== false) downloadBlob(blob2, options.fileName ?? `${defaultHydraFileBaseName()}.webm`);
      return blob2;
    }
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const elapsedSeconds = Math.max(0.1, (now - this.startedAtMs) / 1e3);
    const duration = options.duration ?? elapsedSeconds;
    const blob = await captureHydraVideo({
      runtime: this.runtime,
      duration,
      fps: options.fps ?? 60,
      ...options.bitrate != null ? { bitrate: options.bitrate } : {}
    });
    if (options.download !== false) downloadBlob(blob, options.fileName ?? `${defaultHydraFileBaseName()}.mp4`);
    return blob;
  }
}
class Hydra {
  runtime;
  synth;
  canvas;
  vidRecorder;
  captureStream;
  s;
  o;
  output;
  pb;
  width;
  height;
  targetGlobal;
  runTrustedCode;
  installedGlobalNames = /* @__PURE__ */ new Set();
  constructor({
    pb = null,
    width = 1280,
    height = 720,
    numSources = 4,
    numOutputs = 4,
    maxOutputs,
    makeGlobal = true,
    autoLoop = true,
    detectAudio = false,
    audio = detectAudio,
    enableStreamCapture = true,
    canvas,
    parent,
    extendTransforms,
    executionMode,
    hostOptions,
    rendererOptions,
    targetGlobal = globalThis,
    runCode
  } = {}) {
    this.pb = pb;
    const host = new BrowserHost({
      canvas,
      width,
      height,
      parent,
      ...hostOptions
    });
    const renderer = new WebGPURenderer({
      canvas: host.canvas,
      ...rendererOptions
    });
    this.runtime = new HydraBrowserRuntime({
      host,
      renderer,
      patchbay: pb,
      numSources,
      numOutputs,
      ...maxOutputs != null ? { maxOutputs } : {},
      extendTransforms,
      autoLoop,
      audio,
      detectAudio,
      ...executionMode ? { executionMode } : {}
    });
    this.synth = this.runtime.synth;
    this.canvas = host.canvas;
    this.s = this.runtime.sources;
    this.o = this.runtime.outputs;
    this.output = this.runtime.getActiveOutput();
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.targetGlobal = makeGlobal ? targetGlobal : null;
    this.runTrustedCode = runCode ?? null;
    this.captureStream = this.createCaptureStream(enableStreamCapture);
    this.vidRecorder = enableStreamCapture ? new LegacyVideoRecorder(this.runtime, this.captureStream) : null;
    this.installCompatibilityAliases();
    if (this.targetGlobal) this.installGlobalBindings();
  }
  init() {
    return this.runtime.init();
  }
  start() {
    return this.runtime.start();
  }
  stop() {
    this.runtime.stop();
  }
  tick(dt) {
    this.runtime.tick(dt);
  }
  render(output) {
    this.runtime.render(output);
    this.output = this.runtime.getActiveOutput();
  }
  setResolution(width, height) {
    this.runtime.setResolution(width, height);
    this.width = this.canvas.width;
    this.height = this.canvas.height;
  }
  hush() {
    this.runtime.hush();
  }
  createSource() {
    const source = this.runtime.createSource();
    this.s = this.runtime.sources;
    this.installGlobalBinding(source.label);
    return source;
  }
  createOutput() {
    const output = this.runtime.createOutput();
    this.o = this.runtime.outputs;
    this.installGlobalBinding(output.label);
    return output;
  }
  ensureOutput(index) {
    const output = this.runtime.ensureOutput(index);
    this.o = this.runtime.outputs;
    this.runtime.outputs.forEach((candidate) => this.installGlobalBinding(candidate.label));
    return output;
  }
  eval(code) {
    if (!this.runTrustedCode) {
      throw new Error("Hydra legacy code execution requires an explicit runCode(code, scope) callback.");
    }
    this.ensureReferencedOutputs(code);
    const scope = this.targetGlobal ?? this.synth;
    return this.runTrustedCode(code, scope);
  }
  loadScript(url = "") {
    if (typeof document === "undefined") return Promise.resolve();
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.onload = () => resolve();
      script.onerror = () => resolve();
      script.src = url;
      document.head.appendChild(script);
    });
  }
  async getScreenImage(callback) {
    const blob = await canvasToBlob(this.canvas);
    if (callback) callback(blob);
    return blob;
  }
  async screencap(fileName = `${defaultHydraFileBaseName()}.png`) {
    const blob = await this.getScreenImage();
    downloadBlob(blob, fileName);
    return blob;
  }
  canvasToImage(callback) {
    return this.getScreenImage(callback);
  }
  dispose() {
    for (const name of Array.from(this.installedGlobalNames).reverse()) {
      if (this.targetGlobal) delete this.targetGlobal[name];
    }
    this.installedGlobalNames.clear();
    this.runtime.dispose();
  }
  createCaptureStream(enableStreamCapture) {
    if (!enableStreamCapture) return null;
    const canvasWithCapture = this.canvas;
    if (typeof canvasWithCapture.captureStream !== "function") return null;
    try {
      return canvasWithCapture.captureStream(60);
    } catch {
      return null;
    }
  }
  installCompatibilityAliases() {
    this.synth.createOutput = this.createOutput.bind(this);
    this.synth.ensureOutput = this.ensureOutput.bind(this);
    this.synth.ensureOutputBuffer = this.ensureOutput.bind(this);
    this.synth.setFunction = (definition) => {
      const registerFunction = this.synth.registerFunction;
      if (typeof registerFunction !== "function") {
        throw new Error("Hydra transform registration is unavailable.");
      }
      const result = registerFunction(definition);
      this.installGlobalBinding(definition.name);
      return result;
    };
    this.synth.screencap = this.screencap.bind(this);
    this.synth.getScreenImage = this.getScreenImage.bind(this);
    this.synth.canvasToImage = this.canvasToImage.bind(this);
    this.synth.loadScript = this.loadScript.bind(this);
    this.synth.vidRecorder = this.vidRecorder;
    this.synth.hydra = this.runtime;
  }
  installGlobalBindings() {
    if (!this.targetGlobal) return;
    for (const name of Object.keys(this.synth)) this.installGlobalBinding(name);
    this.targetGlobal.hydra = this;
    this.targetGlobal.hydraSynth = this;
    this.installedGlobalNames.add("hydra");
    this.installedGlobalNames.add("hydraSynth");
  }
  installGlobalBinding(name) {
    if (!this.targetGlobal || !name || this.installedGlobalNames.has(name)) return;
    Object.defineProperty(this.targetGlobal, name, {
      configurable: true,
      enumerable: true,
      get: () => this.synth[name],
      set: (value) => {
        this.synth[name] = value;
      }
    });
    this.installedGlobalNames.add(name);
  }
  ensureReferencedOutputs(code) {
    const outputIndices = findReferencedOutputIndices(code);
    if (outputIndices.length === 0) return;
    const maxOutputIndex = outputIndices[outputIndices.length - 1];
    if (typeof maxOutputIndex === "number") this.ensureOutput(maxOutputIndex);
  }
}
const BENCHMARK_CORPUS = [
  {
    id: "img_chain_4k_postfx",
    workloadClass: "image",
    description: "Long post-processing chain at high resolution.",
    acceptance: { maxAvgFrameMs: 20, maxP95FrameMs: 24, maxFallbackRate: 0.15 }
  },
  {
    id: "img_pyramid_bloom",
    workloadClass: "image",
    description: "Multi-level downsample/upsample bloom stress.",
    acceptance: { maxAvgFrameMs: 16, maxP95FrameMs: 20, maxFallbackRate: 0.2 }
  }
];
const getBenchmarkSceneDefinition = (id) => BENCHMARK_CORPUS.find((scene) => scene.id === id);
const resolveCodeRunner = (options) => {
  if (options.runCode) return options.runCode;
  throw new Error("Hydra livecoding requires an explicit runCode(code, scope) callback.");
};
const attachLivecoding = (engine, options = {}) => {
  const targetGlobal = options.targetGlobal ?? globalThis;
  const initialBindings = engine.getBindings();
  const allowedBindings = new Set(options.allowedBindings ?? Object.keys(initialBindings));
  const runCode = resolveCodeRunner(options);
  const previousValues = /* @__PURE__ */ new Map();
  const injectedBindings = /* @__PURE__ */ new Set();
  const disposeCallbacks = /* @__PURE__ */ new Set();
  let disposed = false;
  const registerDisposeCallback = (callback) => {
    disposeCallbacks.add(callback);
    return () => {
      disposeCallbacks.delete(callback);
    };
  };
  const listenWithDispose = (target, type, listener, optionsArg) => {
    target.addEventListener(type, listener, optionsArg);
    return registerDisposeCallback(() => {
      target.removeEventListener(type, listener, optionsArg);
    });
  };
  const helperBindings = {};
  if (options.exposeHelpers) {
    helperBindings.hydraOnDispose = registerDisposeCallback;
    helperBindings.hydraListen = listenWithDispose;
    if (typeof options.exposeHelpers === "object") {
      for (const [name, value] of Object.entries(options.exposeHelpers)) {
        helperBindings[name] = value;
      }
    }
  }
  const inject = (name, value) => {
    if (!previousValues.has(name)) {
      previousValues.set(name, {
        exists: Object.prototype.hasOwnProperty.call(targetGlobal, name),
        value: targetGlobal[name]
      });
    }
    targetGlobal[name] = value;
    injectedBindings.add(name);
  };
  const ensureReferencedOutputs = (code) => {
    const outputIndices = findReferencedOutputIndices(code);
    if (outputIndices.length === 0) return;
    const bindings = engine.getBindings();
    const ensureOutput = bindings.ensureOutput;
    if (typeof ensureOutput !== "function") return;
    const maxOutputIndex = outputIndices[outputIndices.length - 1];
    if (typeof maxOutputIndex !== "number") return;
    ensureOutput(maxOutputIndex);
    for (let index = 0; index <= maxOutputIndex; index += 1) {
      allowedBindings.add(`o${index}`);
    }
  };
  const syncFromEngine = () => {
    if (disposed) return;
    const bindings = engine.getBindings();
    for (const name of allowedBindings) {
      if (!(name in bindings)) continue;
      inject(name, bindings[name]);
    }
  };
  syncFromEngine();
  for (const [name, helper] of Object.entries(helperBindings)) {
    inject(name, helper);
  }
  const syncFromGlobal = () => {
    if (disposed) return;
    for (const name of allowedBindings) {
      if (!injectedBindings.has(name)) continue;
      engine.setBinding(name, targetGlobal[name]);
    }
  };
  const run = (code) => {
    if (disposed) {
      throw new Error("Livecoding session has been disposed.");
    }
    ensureReferencedOutputs(code);
    syncFromEngine();
    const result = runCode(code, targetGlobal);
    syncFromGlobal();
    return result;
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    for (const callback of Array.from(disposeCallbacks).reverse()) {
      try {
        callback();
      } catch {
      }
    }
    disposeCallbacks.clear();
    for (const name of Array.from(injectedBindings).reverse()) {
      const previous = previousValues.get(name);
      if (!previous) continue;
      if (previous.exists) targetGlobal[name] = previous.value;
      else delete targetGlobal[name];
    }
    injectedBindings.clear();
    previousValues.clear();
  };
  return { run, syncFromGlobal, syncFromEngine, dispose };
};
const createLivecodingPlugin = (options) => {
  let session = null;
  return {
    attach: (engine) => {
      session = attachLivecoding(engine, options);
    },
    run: (code) => {
      if (!session) throw new Error("Livecoding plugin has not been attached.");
      return session.run(code);
    },
    dispose: () => {
      if (!session) return;
      session.dispose();
      session = null;
    }
  };
};
const buildCapabilityMatrix = (capabilities) => {
  const features = new Set(capabilities?.features ?? []);
  return {
    targetFormat: capabilities?.fragment?.targetFormat ?? "unknown",
    maxColorAttachments: capabilities?.fragment?.maxColorAttachments ?? 0,
    timestampQuery: features.has("timestamp-query")
  };
};
const toFiniteOrNull = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return numeric;
};
const collectFinite = (values) => values.filter((value) => typeof value === "number" && Number.isFinite(value));
const average = (values) => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};
const percentile = (values, ratio) => {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((left, right) => left - right);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio)));
  return sorted[index] ?? 0;
};
const buildBenchmarkReport = ({
  sceneId,
  samples,
  capabilities = null,
  baseline = null
}) => {
  const scene = getBenchmarkSceneDefinition(sceneId);
  if (!scene) throw new Error(`Unknown benchmark scene "${sceneId}".`);
  if (baseline && baseline.sceneId !== scene.id) {
    throw new Error(`Baseline scene "${baseline.sceneId}" does not match "${scene.id}".`);
  }
  const frameTimes = collectFinite(samples.map((sample) => toFiniteOrNull(sample.frameMs)));
  const cpuTimes = collectFinite(samples.map((sample) => toFiniteOrNull(sample.cpuEncodeMs)));
  const gpuTimes = samples.map((sample) => sample.gpuMs).filter((value) => typeof value === "number" && Number.isFinite(value));
  const runCounts = collectFinite(samples.map((sample) => toFiniteOrNull(sample.runCount)));
  const fallbackCounts = collectFinite(samples.map((sample) => toFiniteOrNull(sample.fallbackCount)));
  const residentBytes = collectFinite(samples.map((sample) => toFiniteOrNull(sample.residentBytes))).map((value) => Math.max(0, Math.floor(value)));
  const totalFallbackCount = fallbackCounts.reduce((sum, value) => sum + value, 0);
  const totalRunCount = runCounts.reduce((sum, value) => sum + value, 0);
  const fallbackRate = totalRunCount > 0 ? totalFallbackCount / totalRunCount : 0;
  const report = {
    sceneId: scene.id,
    workloadClass: scene.workloadClass,
    frameCount: samples.length,
    avgFrameMs: average(frameTimes),
    p95FrameMs: percentile(frameTimes, 0.95),
    p99FrameMs: percentile(frameTimes, 0.99),
    avgCpuEncodeMs: average(cpuTimes),
    avgGpuMs: gpuTimes.length > 0 ? average(gpuTimes) : null,
    avgRunCount: average(runCounts),
    fallbackRate,
    peakResidentBytes: residentBytes.length > 0 ? Math.max(...residentBytes) : 0,
    capabilityMatrix: buildCapabilityMatrix(capabilities)
  };
  if (baseline) {
    report.deltaFromBaseline = {
      avgFrameMs: report.avgFrameMs - baseline.avgFrameMs,
      p95FrameMs: report.p95FrameMs - baseline.p95FrameMs,
      p99FrameMs: report.p99FrameMs - baseline.p99FrameMs,
      avgCpuEncodeMs: report.avgCpuEncodeMs - baseline.avgCpuEncodeMs,
      avgGpuMs: typeof report.avgGpuMs === "number" && Number.isFinite(report.avgGpuMs) && typeof baseline.avgGpuMs === "number" && Number.isFinite(baseline.avgGpuMs) ? report.avgGpuMs - baseline.avgGpuMs : null,
      avgRunCount: report.avgRunCount - baseline.avgRunCount,
      fallbackRate: report.fallbackRate - baseline.fallbackRate,
      peakResidentBytes: report.peakResidentBytes - baseline.peakResidentBytes
    };
  } else {
    report.deltaFromBaseline = null;
  }
  return report;
};
const validateBenchmarkReport = (report) => {
  const scene = getBenchmarkSceneDefinition(report.sceneId);
  if (!scene) {
    return { ok: false, failures: [`Unknown benchmark scene "${report.sceneId}".`] };
  }
  const failures = [];
  if (typeof scene.acceptance.maxAvgFrameMs === "number" && report.avgFrameMs > scene.acceptance.maxAvgFrameMs) {
    failures.push(`avgFrameMs ${report.avgFrameMs.toFixed(3)} exceeded ${scene.acceptance.maxAvgFrameMs.toFixed(3)}`);
  }
  if (typeof scene.acceptance.maxP95FrameMs === "number" && report.p95FrameMs > scene.acceptance.maxP95FrameMs) {
    failures.push(`p95FrameMs ${report.p95FrameMs.toFixed(3)} exceeded ${scene.acceptance.maxP95FrameMs.toFixed(3)}`);
  }
  if (typeof scene.acceptance.maxFallbackRate === "number" && report.fallbackRate > scene.acceptance.maxFallbackRate) {
    failures.push(`fallbackRate ${report.fallbackRate.toFixed(3)} exceeded ${scene.acceptance.maxFallbackRate.toFixed(3)}`);
  }
  return {
    ok: failures.length === 0,
    failures
  };
};
const createBrowserHost = (options) => new BrowserHost(options);
const createWebGPURenderer = (host, options) => new WebGPURenderer({ canvas: host.canvas, ...options });
const createHydraBrowserRuntime = (options = {}) => {
  const host = options.host ?? createBrowserHost(options.hostOptions);
  const renderer = options.renderer ?? createWebGPURenderer(host, options.rendererOptions);
  return new HydraBrowserRuntime({
    ...options,
    host,
    renderer
  });
};
export {
  BENCHMARK_CORPUS,
  BrowserHost,
  Hydra,
  HydraAudioAnalyzer,
  HydraAutotuner,
  HydraBrowserRuntime,
  HydraEngine,
  HydraExecutor,
  HydraSourceNode,
  WEBGPU_UNAVAILABLE_MESSAGE,
  WebGPUOutputNode,
  WebGPURenderer,
  attachLivecoding,
  buildBenchmarkReport,
  buildCandidateSignature,
  buildProfilerSnapshot,
  captureFrameSequence,
  captureHydraFrameSequence,
  captureHydraVideo,
  captureVideo,
  createBrowserHost,
  createHydraBrowserRuntime,
  createLivecodingPlugin,
  createWebGPURenderer,
  Hydra as default,
  getBenchmarkSceneDefinition,
  normalizeRuntimeExecutionMode,
  validateBenchmarkReport
};
