/*
Hydra curated corpus port candidate: pattern_002
Title: source block 2
Status: semantic port, not visually accepted.
Bucket: legacy feedback / conceptual port

Port moves:
- P: review feedback order; prefer pre-accumulation memory drift when clean ingress is intended
- N: normalize feedback displacement into pixel-step units where possible
- AX?: review xy correlation; split axes when same-field diagonal motion is not intended
- S: specialized modulation translated when math-safe, otherwise retained as a marked extension
- G?: review gate role; hard gates for ingress, soft/luma only for other roles or intended legacy behavior
- C: callback/time controls retained as legacy controls; replace manually when porting for the no-callback grammar

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
.layer(src(o2).mult(o3, () => .25 + time / 2.5 % .75))
.modulate((osc(btw(2.5, 20), btw(-.1, .1), 2).modulate(noise(btw(0.5, 10), btw(.005, .125)).rotate(btw(0, Math.PI / 2)).luma(btw(0, .875)).pixelate(btw(3, 750), btw(3, 150)), 1)).r().color(1 / width, 0), (btw(-0.00375, 0.00375)) * width)
.modulate((osc(btw(2.5, 20), -btw(-.1, .1), 2).modulate(noise(btw(0.5, 10), -btw(.005, .125)).rotate(btw(0, TAU) / 2).luma(btw(0, .875)).pixelate(btw(3, 750), btw(3, 150)), 1)).r().color(0, 1 / height), (btw(-0.00375, 0.00375)) * height)
.modulate((osc(btw(2.5, 20), btw(-.1, .1), 2).modulate(noise(btw(0.5, 10), btw(.005, .125)).invert().rotate(btw(0, Math.PI * 3) / 2).luma(btw(0, .875)).pixelate(btw(3, 750), btw(3, 150)), 1)).r().color(1 / width, 0), (btw(-0.005625, 0.005625)) * width)
.modulate((osc(btw(2.5, 20), -btw(-.1, .1), 2).modulate(noise(btw(0.5, 10), -btw(.005, .125)).invert().rotate(btw(0, Math.PI * 4) / 2).luma(btw(0, .875)).pixelate(btw(3, 750), btw(3, 150)), 1)).r().color(0, 1 / height), (btw(-0.005625, 0.005625)) * height)
.modulateHue(src(o0).pixelate(btw(3, 750), btw(3, 150)), () => time / 5 % btw(.5, 7.5))
.color(1, .999, 1)
.out(o0);

osc(btw(2.5, 20), btw(.05, .25), btw(1, 4))
.rotate(btw(0, TAU))
.contrast(.75)
.saturate(.875)
.modulate(noise(btw(1, 5), btw(-0.5, 0.5)), btw(.1, .75))
.diff(osc(btw(5, 15), btw(.05, .25), btw(1, 4)).rotate(btw(0, TAU)).hue(.1).contrast(.666).saturate(2).color(1, .5, 1).modulate(noise(btw(1, 5), btw(-0.5, 0.5)), btw(.1, .75)))
.out(o3);

shape(300, btw(.2, .7), .00)
.diff(shape(300, btw(-0.15, 0.6), .00))
.repeat(intgr(3, 15), intgr(3, 15))
.mult(osc(btw(50, 600), btw(.0125, .125)).luma(btw(.75, .975)).modulate(gradient().rotate((noise(3, .05)).r(1, 0)).sub(gradient()), 1))
.mult(noise(btw(1, 8), btw(0.05, 0.75)).pixelate(intgr(3, 15), intgr(3, 15)).contrast(2).thresh(.25))
.luma()
.scale(1, A, B)
.out(o2);

solid()
.layer(o0)
.out(o1);

render(o1);
