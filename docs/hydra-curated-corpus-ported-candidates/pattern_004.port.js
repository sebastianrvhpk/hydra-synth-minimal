/*
Hydra curated corpus port candidate: pattern_004
Title: source block 4
Status: semantic port, not visually accepted.
Bucket: portable core feedback

Port moves:
- P: review feedback order; prefer pre-accumulation memory drift when clean ingress is intended
- N: normalize feedback displacement into pixel-step units where possible
- AX?: review xy correlation; split axes when same-field diagonal motion is not intended
- S: specialized modulation translated when math-safe, otherwise retained as a marked extension
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


solid()
.diff(src(o0))
.modulate(noise(4, .25, .5).scale(4, A, 1, rn(), rn(), intgr(10, 40)).color(1, 0).pixelate(intgr(10, 40) / B, intgr(10, 40)), .005)
.modulate(noise(4, .25, .5).scale(4, A, 1, rn(), rn()).color(0, 1).pixelate(intgr(10, 40) / B, intgr(10, 40)), .005)
.modulate(noise(4, .25, .5).scale(4, A, 1, rn(), rn()).color(1, 0).pixelate(intgr(10, 40) / B, intgr(10, 40)), .005)
.modulate(noise(4, .25, .5).scale(4, A, 1, rn(), rn()).color(0, 1).pixelate(intgr(10, 40) / B, intgr(10, 40)), .005)
.modulate(gradient().scale(1, (osc(5, .25).color(1, 0)).r(.00075, 1), (osc(5, .25).color(1, 0)).g(.00075, 1)).sub(gradient()), 1)
.layer(shape(90, 1, 0).diff(shape(90, .875)).scale(.875).repeat(intgr(10, 40) / B, intgr(10, 40)).mask(noise(15 * 4, .25).scale(4, A, 1, rn(), rn()).pixelate(intgr(10, 40) / B, intgr(10, 40)).thresh(.75, 0)).luma(.5, 0).mult(osc(5, .1, 2).rotate(rn(TAU)).contrast(.75).saturate(.875).modulate(noise(2 * 4, .2).scale(4, A, 1, rn(), rn()), .5).diff(osc(10, .1, 2).rotate(rn(TAU)).hue(.1).contrast(.666).saturate(1.5).color(1, .5, 1).modulate(noise(2 * 4, .15).scale(4, A, 1, rn(), rn()), .5))))
.out(o0);
