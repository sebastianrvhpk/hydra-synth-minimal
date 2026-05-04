# Hydra V5 Feedback Energy Audit

Max feedback displacement: 6 px/pass

Changed modulate calls: 142
Residual review calls: 0

## Changed Files

### pattern_002.v5.js

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().rotate((noise(3, .05)).r(1, 0)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_003.v5.js

- normalized raw/fractional field; fractional knob amount knob(-0.01, 0.0025, 3, 2, 0.08) converted to bounded pixel-valued pxknob(...)

```js
.modulate((gradient().brightness(-.5).pixelate(2, 2)).color(1 / width, 1 / height), pxknob(-0.01, 0.0025, 3, 2, 0.08))
```

- normalized raw/fractional field; fractional native amount -.0125 converted through px(... * Math.max(width, height))

```js
.modulate((gradient().brightness(-.5).pixelate(2, 2)).color(1 / width, 1 / height), px((-.0125) * Math.max(width, height)))
```

### pattern_004.v5.js

- normalized raw/fractional field; fractional native amount .005 converted through px(... * Math.max(width, height))

```js
.modulate((noise(4, .25, .5).scale(4, A, 1, rn(), rn(), intgr(10, 40)).color(1, 0).pixelate(intgr(10, 40) / B, intgr(10, 40))).color(1 / width, 0), px((.005) * Math.max(width, height)))
```

- normalized raw/fractional field; fractional native amount .005 converted through px(... * Math.max(width, height))

```js
.modulate((noise(4, .25, .5).scale(4, A, 1, rn(), rn()).color(0, 1).pixelate(intgr(10, 40) / B, intgr(10, 40))).color(0, 1 / height), px((.005) * Math.max(width, height)))
```

- normalized raw/fractional field; fractional native amount .005 converted through px(... * Math.max(width, height))

```js
.modulate((noise(4, .25, .5).scale(4, A, 1, rn(), rn()).color(1, 0).pixelate(intgr(10, 40) / B, intgr(10, 40))).color(1 / width, 0), px((.005) * Math.max(width, height)))
```

- normalized raw/fractional field; fractional native amount .005 converted through px(... * Math.max(width, height))

```js
.modulate((noise(4, .25, .5).scale(4, A, 1, rn(), rn()).color(0, 1).pixelate(intgr(10, 40) / B, intgr(10, 40))).color(0, 1 / height), px((.005) * Math.max(width, height)))
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (osc(5, .25).color(1, 0)).r(.00075, 1), (osc(5, .25).color(1, 0)).g(.00075, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_006.v5.js

- normalized raw/fractional field; fractional native amount .02 * 2 converted through px(... * Math.max(width, height))

```js
.modulate((solid().add(noise(3, .1).scale(2, 1, 1, 0, 0).color(1, 0, 0).pixelate(3, 3).mask(noise(3, .1).scale(2, 1, 1, 0, 0).thresh(.5, .1))).add(noise(3, .1).scale(2, 1, 1, 1, 1).color(0, 1, 0).pixelate(3, 3).mask(noise(3, .1).scale(2, 1, 1, 1, 1).thresh(.5, .1))).sub(noise(3, .1).scale(2, 1, 1, 1, 0).color(1, 0, 0).pixelate(6, 6).mask(noise(3, .1).scale(2, 1, 1, 1, 0).thresh(.5, .1))).sub(noise(3, .1).scale(2, 1, 1, 0, 1).color(0, 1, 0).pixelate(6, 6).mask(noise(3, .1).scale(2, 1, 1, 0, 1))).pixelate(9, 9)).color(1 / width, 1 / height), px((.02 * 2) * Math.max(width, height)))
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (osc(35, .15).brightness(-.5).rotate(.25).pixelate(6, 6).mask(noise(1, .5).thresh(.375, 0).pixelate(3, 3)).color(0, 1, 0)).r(2, 1), (osc(35, .15).brightness(-.5).rotate(.25).pixelate(6, 6).mask(noise(1, .5).thresh(.375, 0).pixelate(3, 3)).color(0, 1, 0)).g(2, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_007.v5.js

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (solid().add(noiseLoop(2.5, 2, .5).scale(4, 1, 1, rn(), rn())).add(noiseLoop(25, 8, .5).scale(4, 1, 1, rn(), rn()), .25).brightness(.5).pixelate(1, 1)).r(4, 1), (solid().add(noiseLoop(2.5, 2, .5).scale(4, 1, 1, rn(), rn())).add(noiseLoop(25, 8, .5).scale(4, 1, 1, rn(), rn()), .25).brightness(.5).pixelate(1, 1)).g(4, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().rotate((solid().add(noiseLoop(2.5, 2, .5).pixelate(1, 1))).r(Math.PI, 0)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (solid().add(noiseLoop(25, 8, .5).brightness(.5).pixelate(1, 1))).r(1, 1), (solid().add(noiseLoop(25, 8, .5).brightness(.5).pixelate(1, 1))).g(1, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_008.v5.js

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (solid().add(noiseLoop(2.5, 2, .5).scale(4, 1, 1, rn(), rn())).add(noiseLoop(25, 8, .5).scale(4, 1, 1, rn(), rn()), .25).brightness(.5).pixelate(1, 1)).r(4, 1), (solid().add(noiseLoop(2.5, 2, .5).scale(4, 1, 1, rn(), rn())).add(noiseLoop(25, 8, .5).scale(4, 1, 1, rn(), rn()), .25).brightness(.5).pixelate(1, 1)).g(4, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().rotate((solid().add(noiseLoop(2.5, 2, .125).pixelate(1, 1))).r(Math.PI, 0)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (solid().add(noiseLoop(25, 2, .5).brightness(.5).pixelate(1, 1))).r(1, 1), (solid().add(noiseLoop(25, 2, .5).brightness(.5).pixelate(1, 1))).g(1, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (noiseLoop(25, .1, 2.5).scale(4, 1, 1, rn(), rn()).brightness(1)).r(1, 1), (noiseLoop(25, .1, 2.5).scale(4, 1, 1, rn(), rn()).brightness(1)).g(1, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (noiseLoop(25, .1, 2.5).scale(4, 1, 1, rn(), rn()).brightness(1)).r(1, 1), (noiseLoop(25, .1, 2.5).scale(4, 1, 1, rn(), rn()).brightness(1)).g(1, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_009.v5.js

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (noiseLoop(3, .06, 2.5).scale(4, 1, 1, rn(), rn()).brightness(.5)).r(.5, 1), (noiseLoop(3, .06, 2.5).scale(4, 1, 1, rn(), rn()).brightness(.5)).g(.5, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().rotate((noiseLoop(3, .06, 2.5).scale(4, 1, 1, rn(), rn())).r(Math.PI / 2, 0)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (noiseLoop(3, .06, 2.5).scale(4, 1, 1, rn(), rn()).brightness(.5)).r(.5, 1), (noiseLoop(3, .06, 2.5).scale(4, 1, 1, rn(), rn()).brightness(.5)).g(.5, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().rotate((noiseLoop(3, .06, 2.5).scale(4, 1, 1, rn(), rn())).r(Math.PI / 2, 0)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (noiseLoop(3, .06, 2.5).scale(4, 1, 1, rn(), rn()).brightness(.5)).r(.5, 1), (noiseLoop(3, .06, 2.5).scale(4, 1, 1, rn(), rn()).brightness(.5)).g(.5, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().rotate((noiseLoop(3, .06, 2.5).scale(4, 1, 1, rn(), rn())).r(Math.PI / 2, 0)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (solid().add(noiseLoop(2.5, 2 * .015, 5).scale(4, 1, 1, rn(), rn())).add(noiseLoop(25, 8 * .015, 5).scale(4, 1, 1, rn(), rn()), .25).pixelate(1, 1).brightness(.5)).r(4, 1), (solid().add(noiseLoop(2.5, 2 * .015, 5).scale(4, 1, 1, rn(), rn())).add(noiseLoop(25, 8 * .015, 5).scale(4, 1, 1, rn(), rn()), .25).pixelate(1, 1).brightness(.5)).g(4, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().rotate((noiseLoop(5, 2 * .15, .5 * 2).scale(4, 1, 1, rn(), rn()).pixelate(1, 1)).r(Math.PI, 0)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (noiseLoop(5, 8 * .15, .5).scale(2, 1, 1, rn(), rn()).brightness(1).pixelate(1, 1)).r(.25, 1), (noiseLoop(5, 8 * .15, .5).scale(2, 1, 1, rn(), rn()).brightness(1).pixelate(1, 1)).g(.25, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().rotate((noiseLoop(25, .005, 2.5).scale(4, 1, 1, rn(), rn()).pixelate(pixelX(), pixelY())).r(TAU, 0)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_010.v5.js

- kept field units; numeric amount 50 capped to 6

```js
.modulate(solid().add(noiseLoop(35, .25, .8).scale(4, A, B).pixelate(6 * (height / 500) / A, 6 * (height / 500)).mask(noiseLoop(13, .5, .8).scale(4, A, B).thresh(.125, .25)).color(1, 0), 1).add(noiseLoop(35, .25, .8).scale(4, A, B).pixelate(6 * (height / 500) / A, 6 * (height / 500)).mask(noiseLoop(13, .5, .8).scale(4, A, B).thresh(.5, .25)).color(0, 1), 1).scrollY(0, btw(-2, 2) / height).pixelate(pick(0.95, 6 * (height / 500) * 2 / A, width), pick(0.95, 6 * (height / 500) * 2, height)).scrollY(0, -btw(-2, 2) / height).color(1 / width, 1 / height), 6)
```

### pattern_011.v5.js

- kept field units; numeric amount 25 capped to 6

```js
.modulate(solid().add(noiseLoop(35, .25, 2).scale(4, A, B, rn(), rn()).color(1 / width, 0, 0).mask(noiseLoop(13, .5, 2).scale(4, A, B, rn(), rn()).thresh(.125, .25)), 1).add(noiseLoop(35, .25, 2).scale(4, A, B, rn(), rn()).color(0, 1 / height, 0).mask(noiseLoop(13, .5, 2).scale(4, A, B, rn(), rn()).thresh(.375, .25)), 1).scrollY(0, btw(-2, 2) / height).pixelate(intgr(6, 12) / (A) * 2, intgr(6, 12) / (B) * 2).add(gradient().brightness(-.5).rotate(Math.PI / 2).repeat(intgr(6, 12) / (A), intgr(6, 12) / (B)).color(1 / width, 1 / height).mask(noiseLoop(35 / 2, .05, 2).scale(4, A, B, .75, .75).thresh(.875, .025).pixelate(intgr(6, 12) / (A), intgr(6, 12) / (B))), 5).modulate(osc(Math.PI * btw(1, 10), btw(.01, .25)).brightness(-.5).thresh(0, 0).pixelate(intgr(6, 12) / (A) * 2, 1).color(0, 1).mask(noiseLoop(13, .5, 2).scale(4, A, B, .7, .3)), btw(0, .25)).scrollY(0, -btw(-2, 2) / height), 6)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (noiseLoop(33, 1, 2).scale(4, A, B, rn(), rn()).pixelate(width, 1).brightness(-.5).rotate(.25).thresh(.125, 0).pixelate(intgr(6, 12) / (A), intgr(6, 12) / (B)).mult(noiseLoop(33, 1, 2).scale(4, A, B, rn(), rn()).pixelate(intgr(6, 12) / (A) / 2, intgr(6, 12) / (B) / 2)).color(0, 1, 0)).r(5, 1), (noiseLoop(33, 1, 2).scale(4, A, B, rn(), rn()).pixelate(width, 1).brightness(-.5).rotate(.25).thresh(.125, 0).pixelate(intgr(6, 12) / (A), intgr(6, 12) / (B)).mult(noiseLoop(33, 1, 2).scale(4, A, B, rn(), rn()).pixelate(intgr(6, 12) / (A) / 2, intgr(6, 12) / (B) / 2)).color(0, 1, 0)).g(5, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- kept field units; numeric amount 25 capped to 6

```js
.modulate(solid().add(noiseLoop(35, .25, 2).scale(4, A, B, rn(), rn()).color(1 / width, 0, 0).mask(noiseLoop(13, .5, 2).scale(4, A, B, rn(), rn()).thresh(.125, .25)), 1).add(noiseLoop(35, .25, 2).scale(4, A, B, rn(), rn()).color(0, 1 / height, 0).mask(noiseLoop(13, .5, 2).scale(4, A, B, rn(), rn()).thresh(.375, .25)), 1).scrollY(0, btw(-2, 2) / height).pixelate(intgr(6, 12) / (A) * 2, intgr(6, 12) / (B) * 2).add(gradient().brightness(-.5).rotate(Math.PI / 2).repeat(intgr(6, 12) / (A), intgr(6, 12) / (B)).color(1 / width, 1 / height).mask(noiseLoop(35 / 2, .05, 2).scale(4, A, B, .75, .75).thresh(.875, .025).pixelate(intgr(6, 12) / (A), intgr(6, 12) / (B))), 5).modulate(osc(Math.PI * btw(1, 10), btw(.01, .25)).brightness(-.5).thresh(0, 0).pixelate(intgr(6, 12) / (A) * 2, 1).color(0, 1).mask(noiseLoop(13, .5, 2).scale(4, A, B, .7, .3)), btw(0, .25)).scrollY(0, -btw(-2, 2) / height), 6)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (noiseLoop(33, 1, 2).scale(4, A, B, rn(), rn()).pixelate(width, 1).brightness(-.5).rotate(.25).thresh(.125, 0).pixelate(intgr(6, 12) / (A), intgr(6, 12) / (B)).mult(noiseLoop(33, 1, 2).scale(4, A, B, rn(), rn()).pixelate(intgr(6, 12) / (A) / 2, intgr(6, 12) / (B) / 2)).color(0, 1, 0)).r(rn() * 5, 1), (noiseLoop(33, 1, 2).scale(4, A, B, rn(), rn()).pixelate(width, 1).brightness(-.5).rotate(.25).thresh(.125, 0).pixelate(intgr(6, 12) / (A), intgr(6, 12) / (B)).mult(noiseLoop(33, 1, 2).scale(4, A, B, rn(), rn()).pixelate(intgr(6, 12) / (A) / 2, intgr(6, 12) / (B) / 2)).color(0, 1, 0)).g(rn() * 5, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (noiseLoop(33, 1, 2).scale(4, A, B, rn(), rn()).pixelate(width, 1).brightness(-.5).rotate(.25).thresh(.125, 0).pixelate(intgr(6, 12) / (A), intgr(6, 12) / (B)).mult(noiseLoop(33, 1, 2).scale(4, A, B, rn(), rn()).pixelate(intgr(6, 12) / (A) / 2, intgr(6, 12) / (B) / 2)).color(0, 1, 0)).r(5, 1), (noiseLoop(33, 1, 2).scale(4, A, B, rn(), rn()).pixelate(width, 1).brightness(-.5).rotate(.25).thresh(.125, 0).pixelate(intgr(6, 12) / (A), intgr(6, 12) / (B)).mult(noiseLoop(33, 1, 2).scale(4, A, B, rn(), rn()).pixelate(intgr(6, 12) / (A) / 2, intgr(6, 12) / (B) / 2)).color(0, 1, 0)).g(5, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_012.v5.js

- kept field units; numeric amount 10 capped to 6

```js
.modulate(solid().add(shape(4, .5, 0).modulate(gradient().scale(1, (ns(3, .25, .75).color(1, 0).add(ns(3, .25, .75).color(0, 1)).pixelate(1, 1)).r(1, 1), (ns(3, .25, .75).color(1, 0).add(ns(3, .25, .75).color(0, 1)).pixelate(1, 1)).g(1, 1)).sub(gradient()), 1).modulate(ns(3, .25, .75).color(1, 0).add(ns(3, .25, .75).color(0, 1)).pixelate(1, 1), .5).color(1, 0, 0)).add(shape(4, .5, 0).modulate(gradient().scale(1, (ns(3, .25, .75).color(1, 0).add(ns(3, .25, .75).color(0, 1)).pixelate(1, 1)).r(1, 1), (ns(3, .25, .75).color(1, 0).add(ns(3, .25, .75).color(0, 1)).pixelate(1, 1)).g(1, 1)).sub(gradient()), 1).modulate(ns(3, .25, .75).color(1, 0).add(ns(3, .25, .75).color(0, 1)).pixelate(1, 1), .5).color(0, 1, 0)).color(1 / width, 1 / height), 6)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (ns(3, 1, .75).pixelate(10, 10).scrollX(0, .5).pixelate(1, 1)).r(2, 1), (ns(3, 1, .75).pixelate(10, 10).scrollX(0, .5).pixelate(1, 1)).g(2, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (ns(3, .25, .75).color(1, 0).add(ns(3, .25, .75).color(0, 1)).pixelate(1, 1)).r(1, 1), (ns(3, .25, .75).color(1, 0).add(ns(3, .25, .75).color(0, 1)).pixelate(1, 1)).g(1, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (ns(3, .25, .75).color(1, 0).add(ns(3, .25, .75).color(0, 1)).pixelate(1, 1)).r(1, 1), (ns(3, .25, .75).color(1, 0).add(ns(3, .25, .75).color(0, 1)).pixelate(1, 1)).g(1, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_013.v5.js

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().rotate((noise(.3, .25)).r(Math.PI / 360, 0)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (noise(4.5, 0).pixelate(16, 1).scrollX(0, .5).pixelate(1, 1).color(1 / width, 1 / height)).r(-20, 1), (noise(4.5, 0).pixelate(16, 1).scrollX(0, .5).pixelate(1, 1).color(1 / width, 1 / height)).g(-20, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (noise(4.5, 0).pixelate(8, 1).scrollX(0, 1).pixelate(1, 1).brightness(1)).r(500, 1), (noise(4.5, 0).pixelate(8, 1).scrollX(0, 1).pixelate(1, 1).brightness(1)).g(500, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_014.v5.js

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().rotate((ns(.3, .025).scale(1, A, B)).r(Math.PI / 360, 0)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_016.v5.js

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (src(o0).hue(rng(0, 1, 8, 2, 0.05)).scale(1.0125)
     .mask(osc(TAU)
           .modulate(solid(1,0),0/8).thresh(.5,.125/3).pixelate(1,1)).color(1/width,1/height)).r(10, 1), (src(o0).hue(rng(0, 1, 8, 2, 0.05)).scale(1.0125)
     .mask(osc(TAU)
           .modulate(solid(1,0),0/8).thresh(.5,.125/3).pixelate(1,1)).color(1/width,1/height)).g(10, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_017.v5.js

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (noise(3,3)).r(.001, 1), (noise(3,3)).g(.001, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (src(o0).brightness(-.5)).r(.0025, 1), (src(o0).brightness(-.5)).g(.0025, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_021.v5.js

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (ns(3,.025).mask(osc(TAU,1).kaleid(height/64).posterize(6,1).pixelate(2,2)).color(1,0)).r(.0125/2, 1), (ns(3,.025).mask(osc(TAU,1).kaleid(height/64).posterize(6,1).pixelate(2,2)).color(1,0)).g(.0125/2, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized raw/fractional field; fractional pixel amount 2/height converted to 2 px

```js
.modulate((osc(TAU,.25).brightness(-.25).color(1,0)).color(1 / width, 0), 2)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (ns(3,.025).mask(osc(TAU,1).kaleid(height/64).posterize(6,1).pixelate(2,2)).color(0,1)).r(.0125/2, 1), (ns(3,.025).mask(osc(TAU,1).kaleid(height/64).posterize(6,1).pixelate(2,2)).color(0,1)).g(.0125/2, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_023.v5.js

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (solid()
.add(ns(.5,.5).color(1,0))
.add(ns(.5,.5).color(0,1)).pixelate(1,1)
.add(ns(.5,.5).color(1,0))
.add(ns(.5,.5).color(0,1))
.mask(ns(1,1))).r(80, 1), (solid()
.add(ns(.5,.5).color(1,0))
.add(ns(.5,.5).color(0,1)).pixelate(1,1)
.add(ns(.5,.5).color(1,0))
.add(ns(.5,.5).color(0,1))
.mask(ns(1,1))).g(80, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_026.v5.js

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (solid()
.add(ns(.5,.5).color(1,0))
.add(ns(.5,.5).color(0,1)).pixelate(1,1)
.add(ns(.5,.5).color(1,0))
.add(ns(.5,.5).color(0,1))
.mask(ns(1,1))).r(80, 1), (solid()
.add(ns(.5,.5).color(1,0))
.add(ns(.5,.5).color(0,1)).pixelate(1,1)
.add(ns(.5,.5).color(1,0))
.add(ns(.5,.5).color(0,1))
.mask(ns(1,1))).g(80, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_027.v5.js

- normalized raw/fractional field; fractional pixel amount -1/height converted to -1 px

```js
.modulate((solid(0,2).add(noise(1,.1).brightness(1).pixelate(1,height),.5)
.color(0,1)).color(0, 1 / height), -1)
```

- kept field units; rng range capped to +/-6

```js
.modulate(gradient().brightness(-.5).repeat(16,16).mask(noise(5,.01).brightness(wob(-1, 1, 0.05)).pixelate(8,8)).color(1/width,1/height), rng(0, 6, 8, 2, 0.05))
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (noise(3,1).thresh(0,0)).r(rng(0, 8, 8, 2, 0.05), 1), (noise(3,1).thresh(0,0)).g(rng(0, 8, 8, 2, 0.05), 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (osc(Math.PI*5,.081021).pixelate(1,1)
.diff(osc(Math.PI*4,.071275))
.modulate(gradient().scale(1, (osc(Math.PI*3,.01).pixelate(1,1)
.diff(osc(TAU,.075))).r(1, 1), (osc(Math.PI*3,.01).pixelate(1,1)
.diff(osc(TAU,.075))).g(1, 1)).sub(gradient()), 1).color(0,1).mask(noise(6,.025).scale(1,4).pixelate(8,8).thresh(0,0))).r(1, 1), (osc(Math.PI*5,.081021).pixelate(1,1)
.diff(osc(Math.PI*4,.071275))
.modulate(gradient().scale(1, (osc(Math.PI*3,.01).pixelate(1,1)
.diff(osc(TAU,.075))).r(1, 1), (osc(Math.PI*3,.01).pixelate(1,1)
.diff(osc(TAU,.075))).g(1, 1)).sub(gradient()), 1).color(0,1).mask(noise(6,.025).scale(1,4).pixelate(8,8).thresh(0,0))).g(1, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_030.v5.js

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (ns(3,1).pixelate(1,1)).r(4, 1), (ns(3,1).pixelate(1,1)).g(4, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_031.v5.js

- normalized raw/fractional field; fractional pixel amount 2/height converted to 2 px

```js
.modulate((osc(TAU,.25).brightness(-.5).color(1,0)).color(1 / width, 0), 2)
```

### pattern_032.v5.js

- normalized raw/fractional field; fractional pixel amount 2/height converted to 2 px

```js
.modulate((osc(Math.PI,.25).brightness(-.5).color(1,0).kaleid(width)).color(1 / width, 0), 2)
```

### pattern_035.v5.js

- normalized raw/fractional field; fractional pixel amount 2/height converted to 2 px

```js
.modulate((osc(TAU,.25).brightness(-.25).color(1,0)).color(1 / width, 0), 2)
```

### pattern_037.v5.js

- normalized raw/fractional field; fractional native amount .025 converted through px(... * Math.max(width, height))

```js
.modulate((solid()
.add(ns(3,1).color(1,0).mask(osc(Math.PI*4,.25).pixelate(1,1).thresh(.5,.1)))
.add(ns(3,1).color(1,0).mask(osc(Math.PI*4,.25).scrollX(.5).pixelate(1,1).thresh(.5,.1)))
.add(ns(3,1).color(0,1).mask(osc(Math.PI*4,.25).scrollX(.25).pixelate(1,1).thresh(.5,.1)))
.add(ns(3,1).color(0,1).mask(osc(Math.PI*4,.25).scrollX(.75).pixelate(1,1).thresh(.5,.1)))
.pixelate(1,1)).color(1 / width, 1 / height), px((.025) * Math.max(width, height)))
```

### pattern_038.v5.js

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (solid()
.add(ns(3,.1).color(1,0,0).mask(osc(TAU,.25).pixelate(1,1).thresh(.75,.1)))
.add(ns(3,.1).color(1,0,0).mask(osc(TAU,.25).scrollX(.5).pixelate(1,1).thresh(.75,.1)))
.add(ns(3,.1).color(.25,1,0).mask(osc(TAU,.25).scrollX(.25).pixelate(1,1).thresh(.75,.1)))
.add(ns(3,.1).color(0,1,0).mask(osc(TAU,.25).scrollX(.75).pixelate(1,1).thresh(.75,.1)))
//.brightness(.5)
.pixelate(1,1)).r(.0125, 1), (solid()
.add(ns(3,.1).color(1,0,0).mask(osc(TAU,.25).pixelate(1,1).thresh(.75,.1)))
.add(ns(3,.1).color(1,0,0).mask(osc(TAU,.25).scrollX(.5).pixelate(1,1).thresh(.75,.1)))
.add(ns(3,.1).color(.25,1,0).mask(osc(TAU,.25).scrollX(.25).pixelate(1,1).thresh(.75,.1)))
.add(ns(3,.1).color(0,1,0).mask(osc(TAU,.25).scrollX(.75).pixelate(1,1).thresh(.75,.1)))
//.brightness(.5)
.pixelate(1,1)).g(.0125, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- kept field units; numeric amount 25 capped to 6

```js
.modulate(solid()
.add(ns(3,.1).color(1,0,0).mask(osc(TAU,.25).pixelate(1,1).thresh(.75,.1)))
.add(ns(3,.1).color(1,0,0).mask(osc(TAU,.25).scrollX(.5).pixelate(1,1).thresh(.75,.1)))
.add(ns(3,.1).color(.25,1,0).mask(osc(TAU,.25).scrollX(.25).pixelate(1,1).thresh(.75,.1)))
.add(ns(3,.1).color(0,1,0).mask(osc(TAU,.25).scrollX(.75).pixelate(1,1).thresh(.75,.1)))
.pixelate(1,1)
.color(1/width,1/height), 6)
```

### pattern_039.v5.js

- normalized raw/fractional field; fractional native amount .025 converted through px(... * Math.max(width, height))

```js
.modulate((ns(1).pixelate(8,8)).color(1 / width, 1 / height), px((.025) * Math.max(width, height)))
```

### pattern_042.v5.js

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (shape(width,1,1).scale(100,1/width,1/height)
.modulate(osc(TAU,.25).brightness(-.5).color(1,0).pixelate(1,1),.5)
.rotate(0,Math.PI/5)
.modulate(osc(TAU,.25).scrollX(.25).brightness(-.5).color(0,1).pixelate(1,1),.5)
.modulate(gradient().brightness(-.5).pixelate(2,2).color(1/width,1/height),-4)).r(.25, 1), (shape(width,1,1).scale(100,1/width,1/height)
.modulate(osc(TAU,.25).brightness(-.5).color(1,0).pixelate(1,1),.5)
.rotate(0,Math.PI/5)
.modulate(osc(TAU,.25).scrollX(.25).brightness(-.5).color(0,1).pixelate(1,1),.5)
.modulate(gradient().brightness(-.5).pixelate(2,2).color(1/width,1/height),-4)).g(.25, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_044.v5.js

- normalized raw/fractional field; fractional pixel amount 2/height converted to 2 px

```js
.modulate((osc(TAU,.25).brightness(-.25).color(1,0)).color(1 / width, 0), 2)
```

### pattern_045.v5.js

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (ns(3,1).pixelate(1,1)).r(4, 1), (ns(3,1).pixelate(1,1)).g(4, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_046.v5.js

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (ns(30,1).rotate(0,1).pixelate(2,2).thresh(.5,0).color(1,0)).r(width, 1), (ns(30,1).rotate(0,1).pixelate(2,2).thresh(.5,0).color(1,0)).g(width, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (ns(30,1).rotate(0,1).pixelate(2,2).thresh(.5,0).color(0,1)).r(height, 1), (ns(30,1).rotate(0,1).pixelate(2,2).thresh(.5,0).color(0,1)).g(height, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- kept field units; numeric amount 25 capped to 6

```js
.modulate(ns(3,1).pixelate(9,9).color(1,0).add(ns(3,1).pixelate(13,13).color(0,1)).color(1/width,1/height), 6)
```

### pattern_047.v5.js

- normalized raw/fractional field; fractional pixel amount 2/height converted to 2 px

```js
.modulate((osc(TAU,.25).brightness(-.25).color(1,0)).color(1 / width, 0), 2)
```

### pattern_048.v5.js

- normalized raw/fractional field; implicit raw feedback modulation converted to explicit 1 px/pass

```js
.modulate((noise(0,.1).color(1,0).mask(noise(3,1.25).pixelate(8,8).thresh(.75,0).scrollX(0,.1))).color(1 / width, 0), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (osc(1,1).rotate(0,Math.PI/4).pixelate(width,1).color(0,1)).r(.5, 1), (osc(1,1).rotate(0,Math.PI/4).pixelate(width,1).color(0,1)).g(.5, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_049.v5.js

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (ns(3).color(1,0)).r(1.25, 1), (ns(3).color(1,0)).g(1.25, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (ns(3).color(1,0)).r(1.25, 1), (ns(3).color(1,0)).g(1.25, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (shape(1,-1,2).scrollY(0,1).pixelate(1,1).brightness(-.5)).r(2, 1), (shape(1,-1,2).scrollY(0,1).pixelate(1,1).brightness(-.5)).g(2, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_051.v5.js

- kept field units; numeric amount 10 capped to 6

```js
.modulate(osc(TAU,.25).thresh(.5,.375).brightness(-.5).color(1,0).add(osc(TAU,.25).scrollX(.25).thresh(.5,.375).brightness(-.5).color(0,1)).pixelate(1,1).color(1/width,1/height), 6)
```

### pattern_053.v5.js

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().brightness(-.5).mask(shape(4,1,0)).repeat(1,1).scale(1/8,1,1,0,0).mask(ns(6,1).thresh(.625/2,0).pixelate(8,8)).scale(1, A, B).color(A,1).modulate(gradient().scale(1, (ns(6,0).pixelate(8/A,8).brightness(1).color(A,1)).r(.5, 1), (ns(6,0).pixelate(8/A,8).brightness(1).color(A,1)).g(.5, 1)).sub(gradient()), 1)).color(1 / width, 1 / height), -.125)
```

- kept field units; numeric amount 10 capped to 6

```js
.modulate(solid(1/width,0), 6)
```

- kept field units; numeric amount 50 capped to 6

```js
.modulate(solid(1/width,0), 6)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (ns(6,0).pixelate(8/A,8).brightness(1).color(A,1)).r(.5, 1), (ns(6,0).pixelate(8/A,8).brightness(1).color(A,1)).g(.5, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_055.v5.js

- normalized raw/fractional field; raw field normalized; wob(-1, 1, 0.05) kept as bounded pixel-valued signal

```js
.modulate((src(o0).color(0,1)).color(0, 1 / height), wob(-1, 1, 0.05))
```

- normalized raw/fractional field; fractional native amount .5 converted through px(... * Math.max(width, height))

```js
.modulate((noise(.6,.1).color(0,1).hue(rng(-1, 0, 8, 2, 0.05)).posterize(4,1).hue(rng(0, 1, 8, 2, 0.05)).blend(noise(2,.25).color(1,0),.025).scale(1,.4,1,rn()).rotate(0,1).pixelate(width/8,height/8)).color(1 / width, 1 / height), px((.5) * Math.max(width, height)))
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (src(o0).color(1/width,0/height)).r(2, 1), (src(o0).color(1/width,0/height)).g(2, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_058.v5.js

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (noise(3,.1).blend(o0,.75).posterize(4,1).color(1/width,1/height)).r(5, 1), (noise(3,.1).blend(o0,.75).posterize(4,1).color(1/width,1/height)).g(5, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (osc(TAU,-.5).rotate(0,.25).brightness(-.25).posterize(16,1).color(0,1)).r(1, 1), (osc(TAU,-.5).rotate(0,.25).brightness(-.25).posterize(16,1).color(0,1)).g(1, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_059.v5.js

- normalized raw/fractional field; fractional pixel amount 2/height converted to 2 px

```js
.modulate((osc(TAU,.25).brightness(-.25).color(1,0)).color(1 / width, 0), 2)
```

### pattern_060.v5.js

- normalized raw/fractional field; fractional pixel amount 2/height converted to 2 px

```js
.modulate((osc(TAU,.25).brightness(-.25).color(1,0)).color(1 / width, 0), 2)
```

### pattern_061.v5.js

- normalized raw/fractional field; fractional pixel amount 3/height converted to 3 px

```js
.modulate((osc(TAU,.25).brightness(-.25).color(1,0)).color(1 / width, 0), 3)
```

### pattern_063.v5.js

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (noise(.5,.5).blend(osc(Math.PI,1).brightness(-.5),.5).color(0,1/height)).r(2, 1), (noise(.5,.5).blend(osc(Math.PI,1).brightness(-.5),.5).color(0,1/height)).g(2, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (noise(.5,-.5).blend(osc(Math.PI,1).modulate(solid(1,0),1).brightness(-.5),.5).color(1/width,0)).r(2, 1), (noise(.5,-.5).blend(osc(Math.PI,1).modulate(solid(1,0),1).brightness(-.5),.5).color(1/width,0)).g(2, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_064.v5.js

- kept field units; numeric amount 10 capped to 6

```js
.modulate(solid()
.add(ns(.15,1).color(1,0))
.add(ns(.15,1).color(0,1))
.add(ns(.25,1).color(1,0))
.add(ns(.25,1).color(0,1))
.pixelate(1,1)
.color(1/width,1/height), 6)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (ns(.03,.01,10).color(1/width,1/height).pixelate(8,8).mask(ns(.25,1,10).pixelate(10,10).thresh(0,0))).r(10, 1), (ns(.03,.01,10).color(1/width,1/height).pixelate(8,8).mask(ns(.25,1,10).pixelate(10,10).thresh(0,0))).g(10, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (shape(5000,0,1).scale(1, A, B)).r(wobc(0, 0.9875, 0.05), 1), (shape(5000,0,1).scale(1, A, B)).g(wobc(0, 0.9875, 0.05), 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_065.v5.js

- kept field units; numeric amount 10 capped to 6

```js
.modulate(solid()
.add(ns(.15,1).color(1,0))
.add(ns(.15,1).color(0,1))
.add(ns(.25,1).color(1,0))
.add(ns(.25,1).color(0,1))
.pixelate(1,1)
.color(1/width,1/height), 6)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (ns(.03,.01,10).color(1/width,1/height).pixelate(8,8).mask(ns(.25,1,10).pixelate(10,10).thresh(0,0))).r(10, 1), (ns(.03,.01,10).color(1/width,1/height).pixelate(8,8).mask(ns(.25,1,10).pixelate(10,10).thresh(0,0))).g(10, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_068.v5.js

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().brightness(-.5)
.modulate(noise(3,1)
.modulate(gradient().scale(1, (noise(3,1).modulate(solid(.05,.05),1)).r(.5, 1), (noise(3,1).modulate(solid(.05,.05),1)).g(.5, 1)).sub(gradient()), 1)
.modulate(noise(3,1).modulate(solid(-.05,-.15),1),.05)
.modulate(gradient().scale(1, (noise(3/2,1).modulate(solid(.15,.35),1)).r(.25, 1), (noise(3/2,1).modulate(solid(.15,.35),1)).g(.25, 1)).sub(gradient()), 1)
.modulate(noise(3/2,1).modulate(solid(-.25,-.15),1),.025),.5)
.pixelate(64,64)).color(1 / width, 1 / height), .5)
```

- kept field units; numeric amount 12.5 capped to 6

```js
.modulate(noise(500,.1).color(1,0).add(noise(500,-.1).color(0,1)).color(1/width,1/height), 6)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((noise(3,1)
.modulate(gradient().scale(1, (noise(3,1).modulate(solid(.05,.05),1)).r(.5, 1), (noise(3,1).modulate(solid(.05,.05),1)).g(.5, 1)).sub(gradient()), 1)
.modulate(noise(3,1).modulate(solid(-.05,-.15),1),.05)
.modulate(gradient().scale(1, (noise(3/2,1).modulate(solid(.15,.35),1)).r(.25, 1), (noise(3/2,1).modulate(solid(.15,.35),1)).g(.25, 1)).sub(gradient()), 1)
.modulate(noise(3/2,1).modulate(solid(-.25,-.15),1),.025)).color(1 / width, 1 / height), .5)
```

### pattern_069.v5.js

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().rotate((ns(.3,.25)).r(Math.PI/360, 0)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (ns(4.5,0).pixelate(16,1).scrollX(0,.5).pixelate(1,1).color(1/width,1/height)).r(-20, 1), (ns(4.5,0).pixelate(16,1).scrollX(0,.5).pixelate(1,1).color(1/width,1/height)).g(-20, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (ns(4.5,0).pixelate(8,1).scrollX(0,1).pixelate(1,1).brightness(1)).r(500, 1), (ns(4.5,0).pixelate(8,1).scrollX(0,1).pixelate(1,1).brightness(1)).g(500, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_070.v5.js

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (osc(Math.PI*.2,1)).r(1, 1), (osc(Math.PI*.2,1)).g(1, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_073.v5.js

- normalized raw/fractional field; raw field normalized; numeric amount 1 kept as bounded pixel amount

```js
.modulate((solid(2/width,0).mask(osc(Math.PI*width,1/width).thresh(.5,0))).color(1 / width, 1 / height), 1)
```

### pattern_074.v5.js

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().rotate((noise(.3,.25)).r(Math.PI/360, 0)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (noise(4.5,0).pixelate(16,1).scrollX(0,.5).pixelate(1,1).color(1/width,1/height)).r(-20, 1), (noise(4.5,0).pixelate(16,1).scrollX(0,.5).pixelate(1,1).color(1/width,1/height)).g(-20, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (noise(4.5,0).pixelate(8,1).scrollX(0,1).pixelate(1,1).brightness(1)).r(500, 1), (noise(4.5,0).pixelate(8,1).scrollX(0,1).pixelate(1,1).brightness(1)).g(500, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_076.v5.js

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (ns(4.5,0).pixelate(8,1).scrollX(0,1).pixelate(1,1).brightness(2)).r(250, 1), (ns(4.5,0).pixelate(8,1).scrollX(0,1).pixelate(1,1).brightness(2)).g(250, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().rotate((ns(.3,.25)).r(Math.PI/360, 0)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (ns(4.5,0).pixelate(16,1).scrollX(0,.5).pixelate(1,1).color(1/width,1/height)).r(-20, 1), (ns(4.5,0).pixelate(16,1).scrollX(0,.5).pixelate(1,1).color(1/width,1/height)).g(-20, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (ns(4.5,0).pixelate(16,1).scrollX(0,.5).pixelate(1,1).brightness(-2).color(1/width,1/height)).r(-5, 1), (ns(4.5,0).pixelate(16,1).scrollX(0,.5).pixelate(1,1).brightness(-2).color(1/width,1/height)).g(-5, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_077.v5.js

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (ns(4.5,0).pixelate(8,1).scrollX(0,1).pixelate(1,1).brightness(2)).r(250, 1), (ns(4.5,0).pixelate(8,1).scrollX(0,1).pixelate(1,1).brightness(2)).g(250, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().rotate((ns(.3,.25)).r(Math.PI/360, 0)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (ns(4.5,0).pixelate(16,1).scrollX(0,.5).pixelate(1,1).color(1/width,1/height)).r(-20, 1), (ns(4.5,0).pixelate(16,1).scrollX(0,.5).pixelate(1,1).color(1/width,1/height)).g(-20, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (ns(4.5,0).pixelate(16,1).scrollX(0,.5).pixelate(1,1).brightness(-2).color(1/width,1/height)).r(-5, 1), (ns(4.5,0).pixelate(16,1).scrollX(0,.5).pixelate(1,1).brightness(-2).color(1/width,1/height)).g(-5, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_078.v5.js

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (ns(4.5,0).pixelate(8,1).scrollX(0,1).pixelate(1,1).brightness(2)).r(250, 1), (ns(4.5,0).pixelate(8,1).scrollX(0,1).pixelate(1,1).brightness(2)).g(250, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().rotate((ns(.3,.25)).r(Math.PI/360, 0)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (ns(4.5,0).pixelate(16,1).scrollX(0,.5).pixelate(1,1).color(1/width,1/height)).r(-20, 1), (ns(4.5,0).pixelate(16,1).scrollX(0,.5).pixelate(1,1).color(1/width,1/height)).g(-20, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (ns(4.5,0).pixelate(16,1).scrollX(0,.5).pixelate(1,1).brightness(-2).color(1/width,1/height)).r(-5, 1), (ns(4.5,0).pixelate(16,1).scrollX(0,.5).pixelate(1,1).brightness(-2).color(1/width,1/height)).g(-5, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (noise(.3,.25).thresh(-.5,0)).r(1, 1), (noise(.3,.25).thresh(-.5,0)).g(1, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_079.v5.js

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (ns(4.5,0).pixelate(8,1).scrollX(0,1).pixelate(1,1).brightness(2)).r(250, 1), (ns(4.5,0).pixelate(8,1).scrollX(0,1).pixelate(1,1).brightness(2)).g(250, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().rotate((ns(.3,.25)).r(Math.PI/360, 0)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (ns(4.5,0).pixelate(16,1).scrollX(0,.5).pixelate(1,1).color(1/width,1/height)).r(-20, 1), (ns(4.5,0).pixelate(16,1).scrollX(0,.5).pixelate(1,1).color(1/width,1/height)).g(-20, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (ns(4.5,0).pixelate(16,1).scrollX(0,.5).pixelate(1,1).brightness(-2).color(1/width,1/height)).r(-5, 1), (ns(4.5,0).pixelate(16,1).scrollX(0,.5).pixelate(1,1).brightness(-2).color(1/width,1/height)).g(-5, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (noise(.3,.25).thresh(-.5,0)).r(1, 1), (noise(.3,.25).thresh(-.5,0)).g(1, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_080.v5.js

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().rotate((ns(.3,.25)).r(Math.PI/360*2, 0)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (ns(.3,1).pixelate(16,1).scrollX(0,.125).pixelate(1,1).brightness(-2).color(1/width,1/height)).r(-5, 1), (ns(.3,1).pixelate(16,1).scrollX(0,.125).pixelate(1,1).brightness(-2).color(1/width,1/height)).g(-5, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (ns(4.5,0).pixelate(8,1).scrollX(0,1).pixelate(1,1).brightness(1)).r(500, 1), (ns(4.5,0).pixelate(8,1).scrollX(0,1).pixelate(1,1).brightness(1)).g(500, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_081.v5.js

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().rotate((ns(.3,.25)).r(Math.PI/360*2, 0)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (ns(.3,1).pixelate(16,4).scrollX(0,.125).pixelate(1,1).brightness(-2).color(1/width,1/height)).r(-5, 1), (ns(.3,1).pixelate(16,4).scrollX(0,.125).pixelate(1,1).brightness(-2).color(1/width,1/height)).g(-5, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (ns(4.5,0).pixelate(8,1).scrollX(0,1).pixelate(1,1).brightness(1)).r(500, 1), (ns(4.5,0).pixelate(8,1).scrollX(0,1).pixelate(1,1).brightness(1)).g(500, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_083.v5.js

- kept field units; numeric amount 20 capped to 6

```js
.modulate(noise(3,1).color(1/width,0/height).add(noise(9,-1/3).color(0/width,1/height)).pixelate(1,1).mask(noise(22,-.1).pixelate(1,height).mask(noise(2,-.01)).thresh(0,0)), 6)
```

- kept field units; numeric amount 20 capped to 6

```js
.modulate(noise(3,-1).color(0/width,1/height).add(noise(9,1/3).color(1/width,0/height)).pixelate(1,1).mask(noise(22,.1).pixelate(width,1).mask(noise(2,.01)).thresh(0,0)), 6)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (osc(Math.PI*5,.1).pixelate(2,1)).r(10, 1), (osc(Math.PI*5,.1).pixelate(2,1)).g(10, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_084.v5.js

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (nstpx(13,1,.125,15,15)).r(-1, 1), (nstpx(13,1,.125,15,15)).g(-1, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_085.v5.js

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (ns(30,1).rotate(0,1).pixelate(2,2).thresh(.5,0).color(1,0)).r(width, 1), (ns(30,1).rotate(0,1).pixelate(2,2).thresh(.5,0).color(1,0)).g(width, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (ns(30,1).rotate(0,1).pixelate(2,2).thresh(.5,0).color(0,1)).r(height, 1), (ns(30,1).rotate(0,1).pixelate(2,2).thresh(.5,0).color(0,1)).g(height, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_087.v5.js

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (noise(1,1).color(1/width,1/height)).r(1, 1), (noise(1,1).color(1/width,1/height)).g(1, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- kept field units; rng range capped to +/-6

```js
.modulate(solid(1/width,0), rng(0, 6, 8, 2, 0.05))
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (noise(.3,.5)).r(4, 1), (noise(.3,.5)).g(4, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (noise(3,.25)).r(4, 1), (noise(3,.25)).g(4, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (noise(1,.3)).r(4, 1), (noise(1,.3)).g(4, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

### pattern_091.v5.js

- normalized raw/fractional field; fractional native amount .25 converted through px(... * Math.max(width, height))

```js
.modulate((ns(.3,1).pixelate(width,1).thresh(.75,.0125)).color(1 / width, 1 / height), px((.25) * Math.max(width, height)))
```

- normalized transform-delta field; amount already within bound

```js
.modulate((gradient().scale(1, (ns(.3,1).pixelate(width,1).thresh(.75,.0125)).r(.01, 1), (ns(.3,1).pixelate(width,1).thresh(.75,.0125)).g(.01, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
```

## Residual Manual Review

No residual top-level feedback modulates were left without recognizable pixel-step or transform-delta handling.
