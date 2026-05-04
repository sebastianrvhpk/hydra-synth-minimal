/*
Hydra curated corpus port candidate: pattern_003
Title: source block 3
Status: semantic port, not visually accepted.
Bucket: memory-drift / non-ingress feedback

Port moves:
- N: normalize feedback displacement into pixel-step units where possible
- AX?: review xy correlation; split axes when same-field diagonal motion is not intended
- G?: review gate role; hard gates for ingress, soft/luma only for other roles or intended legacy behavior
- L/X: review global blend/diff/sub pressure; move into material before mask unless intentionally global

This file preserves authored behavior where automatic conversion would be risky.
Math-safe automated rewrites currently include:
- .out() -> .out(o0)
- modulateScrollX/Y(field, amount, speed?) -> explicit .modulate(...) pixel-step equivalent
- modulateRotate(field, multiple, offset) -> gradient().rotate(...).sub(gradient()) transform delta
- modulateScale(field, multiple, offset) -> gradient().scale(...).sub(gradient()) transform delta
*/

// Shared helpers for first-pass corpus ports.
// These are assignments, not const declarations, so snippets can be re-run in the Hydra editor.
TAU = Math.PI * 2
A = width > height ? height / width : 1
B = height > width ? width / height : 1
rn = (max = 1) => Math.random() * max
btw = (min = 0, max = 1, power = 1) => min + Math.random() ** power * (max - min)
intgr = (min = 0, max = 1, power = 1) => {
  const lo = Math.ceil(min)
  const hi = Math.floor(max)
  return lo + Math.floor(Math.random() ** power * (hi - lo + 1))
}
chc = (values, power = 1) => values[Math.min(values.length - 1, Math.floor(Math.random() ** power * values.length))]
maybe = (p = 0.5) => Math.random() < p
bi = (p = 0.5) => rn() > p ? 1 : -1
bl = (p = 0.5, power = 1) => Math.random() ** power > p ? 1 : 0
pick = (p, a, b) => maybe(p) ? a : b
ns = (freq = 3, vel = 0, x = rn(), y = rn()) =>
  noise(freq, vel).scale(1, A, B).modulate(solid(width * x, height * y), 1)
nsloop = (freq = 35, vel = 0.25, rad = 0.8, x = rn(), y = rn()) =>
  noiseloop(freq, vel, rad).modulate(solid(width * x, height * y), 1)
pixelX = () => chc([1, intgr(4, 13), width])
pixelY = () => chc([1, intgr(4, 13), height])


src(o1)
.diff(shape(4, .0075, 0).modulate(osc(4, 1).pixelate(1, 1).brightness(-.5).color(0, 1)).scale(1, A, B).luma())
.modulate(gradient().brightness(-.5).pixelate(2, 2), [-.0125, -.0125, -.0075, -.0075, -.01].fast(2))
.out(o1);

src(o2)
.diff(shape(4, .015, 0).mask(noiseloop(62, 1, 2)).scale(1, A, B).luma())
.modulate(gradient().brightness(-.5).pixelate(2, 2), -.0125)
.out(o2);

solid()
.diff(o1)
.out(o3);

render(o3);
