// Shared helpers for Hydra curated corpus port candidates v3.
// Run once before evaluating individual pattern_*.v3.js files.
// Assignment arrows are intentionally editor-friendly and re-runnable.

TAU = Math.PI * 2
A = width > height ? height / width : 1
B = height > width ? width / height : 1

rn = (max = 1) => Math.random() * max

btw = (min = 0, max = 1, power = 1) =>
  min + Math.random() ** power * (max - min)

intgr = (min = 0, max = 1, power = 1) => {
  const lo = Math.ceil(min)
  const hi = Math.floor(max)
  return lo + Math.floor(Math.random() ** power * (hi - lo + 1))
}

maybe = (p = 0.5) => Math.random() < p

bi = (p = 0.5) => rn() > p ? 1 : -1

bl = (p = 0.5, power = 1) => Math.random() ** power > p ? 1 : 0

pick = (p, a, b) => maybe(p) ? a : b

choice2 = (a, b, power = 1) => Math.random() ** power < 0.5 ? a : b

choice3 = (a, b, c, power = 1) => {
  const r = Math.random() ** power
  return r < 1 / 3 ? a : r < 2 / 3 ? b : c
}

choice4 = (a, b, c, d, power = 1) => {
  const r = Math.random() ** power
  return r < 0.25 ? a : r < 0.5 ? b : r < 0.75 ? c : d
}

pixelX = () => choice3(1, intgr(4, 13), width)

pixelY = () => choice3(1, intgr(4, 13), height)

ns = (freq = 3, vel = 0, x = rn(), y = rn()) =>
  noise(freq, vel)
    .scale(1, A, B)
    .modulate(solid(width * x, height * y), 1)

nsloop = (freq = 35, vel = 0.25, rad = 0.8, x = rn(), y = rn()) =>
  noiseLoop(freq, vel, rad)
    .scale(1, A, B)
    .modulate(solid(width * x, height * y), 1)

knob = (base = 0, amount = 1, bins = 4, freq = 2, vel = 0.05) =>
  ns(freq, vel)
    .posterize(bins, 1)
    .pixelate(1, 1)
    .r(amount, base)

rng = (min = 0, max = 1, bins = 4, freq = 2, vel = 0.05) =>
  knob((min + max) / 2, (max - min) / 2, bins, freq, vel)

hit = (base = 0, amount = 1, threshold = 0.65, freq = 1, vel = 0.05) =>
  solid(base)
    .add(ns(freq, vel).pixelate(1, 1).thresh(threshold, 0), amount)

wob = (min = 0, max = 1, sync = 0.05) =>
  osc(TAU, sync, 1)
    .pixelate(1, 1)
    .r(max - min, min)

wobc = (base = 0, amount = 1, sync = 0.05) =>
  osc(TAU, sync, 1)
    .brightness(-0.5)
    .pixelate(1, 1)
    .r(amount * 2, base)
