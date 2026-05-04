// Shared helpers for Hydra curated corpus port candidates v2.
// Run once before evaluating individual pattern_*.v2.js files.

TAU = Math.PI * 2
A = width > height ? height / width : 1
B = height > width ? width / height : 1

function rn(max = 1) {
  return Math.random() * max
}

function btw(min = 0, max = 1, power = 1) {
  return min + Math.random() ** power * (max - min)
}

function intgr(min = 0, max = 1, power = 1) {
  const lo = Math.ceil(min)
  const hi = Math.floor(max)
  return lo + Math.floor(Math.random() ** power * (hi - lo + 1))
}

function maybe(p = 0.5) {
  return Math.random() < p
}

function bi(p = 0.5) {
  return rn() > p ? 1 : -1
}

function bl(p = 0.5, power = 1) {
  return Math.random() ** power > p ? 1 : 0
}

function pick(p, a, b) {
  return maybe(p) ? a : b
}

function choice2(a, b, power = 1) {
  return Math.random() ** power < 0.5 ? a : b
}

function choice3(a, b, c, power = 1) {
  const r = Math.random() ** power
  return r < 1 / 3 ? a : r < 2 / 3 ? b : c
}

function choice4(a, b, c, d, power = 1) {
  const r = Math.random() ** power
  return r < 0.25 ? a : r < 0.5 ? b : r < 0.75 ? c : d
}

function pixelX() {
  return choice3(1, intgr(4, 13), width)
}

function pixelY() {
  return choice3(1, intgr(4, 13), height)
}

function ns(freq = 3, vel = 0, x = rn(), y = rn()) {
  return noise(freq, vel)
    .scale(1, A, B)
    .modulate(solid(width * x, height * y), 1)
}

function nsloop(freq = 35, vel = 0.25, rad = 0.8, x = rn(), y = rn()) {
  return noiseloop(freq, vel, rad)
    .modulate(solid(width * x, height * y), 1)
}

function seqSignal(min = 0, max = 1, bins = 4, speed = 0.25, freq = 4) {
  const scale = (max - min) / 2
  const offset = (max + min) / 2
  return ns(freq, 0)
    .posterize(bins, 1)
    .pixelate(bins, 1)
    .scrollX(0, speed)
    .pixelate(1, 1)
    .r(scale, offset)
}

function uniSignal(min = 0, max = 1, bins = 8, freq = 1, vel = 0.05) {
  const scale = (max - min) / 2
  const offset = (max + min) / 2
  return nsloop(freq, vel, 0.8)
    .posterize(bins, 1)
    .pixelate(1, 1)
    .r(scale, offset)
}

function oscSignal(min = 0, max = 1, sync = 0.05) {
  return osc(Math.PI * 2, sync, 1)
    .pixelate(1, 1)
    .r(max - min, min)
}
