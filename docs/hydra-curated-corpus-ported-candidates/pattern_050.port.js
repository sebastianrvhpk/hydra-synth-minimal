/*
Hydra curated corpus port candidate: pattern_050
Title: source block 50
Status: semantic port, not visually accepted.
Bucket: portable core feedback

Port moves:
- P: review feedback order; prefer pre-accumulation memory drift when clean ingress is intended
- AX?: review xy correlation; split axes when same-field diagonal motion is not intended
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


src(o1)
.layer(osc(TAU,1,1).mask(shape(width,1,0)
.scale(4,1/width,1/height)
.repeat(4,4,.5,0)).mask(noise(4,.4).pixelate(4,4).thresh(0,0))
.scrollX(0,.125)
.rotate(0,.1)
.kaleid(4))
.modulate(gradient().brightness(-.5).color(1/width,1/height).pixelate(2,2).mask(noise(.2,1)),-4)
.out(o1)

src(o2)
.layer(osc(TAU,1,1).mask(shape(width,1,0)
.scale(4,1/width,1/height)
.repeat(4,4,.5,0)).mask(noise(4,.4).pixelate(4,4).thresh(0,0))
.scrollX(0,.125)
.rotate(0,.1)
.kaleid(4))
.modulate(gradient().brightness(-.5).color(1/width,1/height).pixelate(2,2).mask(noise(.2,1)),4)
.out(o2)

src(o1)
.add(o2)
.add(o3,.75)
.modulate(gradient().brightness(-.5).color(1/width,1/height).pixelate(2,2).rotate(0,.25).mask(noise(.2,1).brightness(-1)),-4)
.out(o3)

src(o0)
.scrollX(-1/width)
.layer(src(o3).mask(shape(4,1,0).scale(1,1/width,1,0))
)
.diff(shape(4,1,0).scale(.25,1,1/4,0,0).repeat(width/4,height/4/4,0,.5))
.out(o0)

render(o0)
