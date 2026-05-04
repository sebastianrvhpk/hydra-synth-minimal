/*
Hydra curated corpus port candidate: pattern_013
Title: source block 13
Status: semantic port, not visually accepted.
Bucket: portable core feedback

Port moves:
- P: review feedback order; prefer pre-accumulation memory drift when clean ingress is intended
- AX?: review xy correlation; split axes when same-field diagonal motion is not intended
- S: specialized modulation translated when math-safe, otherwise retained as a marked extension
- G?: review gate role; hard gates for ingress, soft/luma only for other roles or intended legacy behavior
- L/X: review global blend/diff/sub pressure; move into material before mask unless intentionally global
- T: preserve metric tiling and anchor math

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


src(o0)
.add(o0, .01)
.mask(shape(4, 1, 0))
.layer(solid().add(osc(Math.PI * .6, .666, 1).pixelate(1, 1), 1).add(osc(Math.PI * .2, .75, 1).kaleid(60000), .5).add(osc(Math.PI * 6, .666, 1).pixelate(1, 1), -.25).add(osc(TAU, .75, 1).kaleid(60000), -.25).mask(shape(4, .001, 0).scale(1, A, B).modulate(gradient().scale(1, (noise(4.5, 0).pixelate(8, 1).scrollX(0, 1).pixelate(1, 1).brightness(1)).r(500, 1), (noise(4.5, 0).pixelate(8, 1).scrollX(0, 1).pixelate(1, 1).brightness(1)).g(500, 1)).sub(gradient()), 1).mask(noise(4.5, 0).pixelate(8, 1).thresh(-.5, 0).scrollX(0, 1.75).pixelate(1, 1)).mask(shape(4, 1, 0).scale(.25, 1, 1, 0, 0).repeat(width / 4, height / 4)).mask(noise(.7, -2).thresh(0, 0))))
.blend(src(o0).mask(shape(4, 1, .01).scale(.25, 1, 1, 0, 0).repeat(width / 4, height / 4).invert()), .5)
.modulate(gradient().rotate((noise(.3, .25)).r(Math.PI / 360, 0)).sub(gradient()), 1)
.modulate(noise(1, 1).color(.05, 1).add(noise(1, 1.25).color(1, .05)).color(1 / width, 1 / height), 2.5)
.modulateHue(o0, 2)
.modulate(gradient().scale(1, (noise(4.5, 0).pixelate(16, 1).scrollX(0, .5).pixelate(1, 1).color(1 / width, 1 / height)).r(-20, 1), (noise(4.5, 0).pixelate(16, 1).scrollX(0, .5).pixelate(1, 1).color(1 / width, 1 / height)).g(-20, 1)).sub(gradient()), 1)
.diff(solid())
.layer(src(o0).colorama(.0025).mask(noise(.3, 1).thresh(.5, 0)))
.out(o0);
