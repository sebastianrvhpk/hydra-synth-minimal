speed = .15;

solid()
.diff(osc(Math.PI * 2.025 * 4, Math.PI / 2 / 4, btw(.5, 1.5)).color(1, 0, 0).scale(4, btw(.75, 1.5), btw(.75, 1.5), rn(), rn()).rotate(btw(0, TAU)))
.diff(osc(Math.PI * 2.025 * 4, Math.PI / 2 / 4, btw(.5, 1.5)).color(0, 1, 0).scale(4, btw(.75, 1.5), btw(.75, 1.5), rn(), rn()).rotate(btw(0, TAU)))
.diff(osc(Math.PI * 2.025 * 4, Math.PI / 2 / 4, btw(.5, 1.5)).color(0, 0, 1).scale(4, btw(.75, 1.5), btw(.75, 1.5), rn(), rn()).rotate(btw(0, TAU)))
.out(o2);

src(o0)
.layer(src(o2).mask(shape(400, .0025, 0).modulate((gradient().scale(1, (solid().add(noiseLoop(2.5, 2, .5).scale(4, 1, 1, rn(), rn())).add(noiseLoop(25, 8, .5).scale(4, 1, 1, rn(), rn()), .25).brightness(.5).pixelate(1, 1)).r(4, 1), (solid().add(noiseLoop(2.5, 2, .5).scale(4, 1, 1, rn(), rn())).add(noiseLoop(25, 8, .5).scale(4, 1, 1, rn(), rn()), .25).brightness(.5).pixelate(1, 1)).g(4, 1)).sub(gradient())).color(1 / width, 1 / height), 1).modulate(solid().add(noiseLoop(2.5, 2, .5).scale(4, 1, 1, rn(), rn()).color(1, 0)).add(noiseLoop(2.5, 2, .5).scale(4, 1, 1, rn(), rn()).color(0, 1)).add(noiseLoop(25, 8, .5).scale(4, 1, 1, rn(), rn()).color(1, 0), .25).add(noiseLoop(25, 8, .5).scale(4, 1, 1, rn(), rn()).color(0, 1), .25).scroll(rn(), rn()).pixelate(1, 1).scroll(0, 0, 1 / width, 1 / height), .5).modulate((gradient().rotate((solid().add(noiseLoop(2.5, 2, .125).pixelate(1, 1))).r(Math.PI, 0)).sub(gradient())).color(1 / width, 1 / height), 1).modulate((gradient().scale(1, (solid().add(noiseLoop(25, 2, .5).brightness(.5).pixelate(1, 1))).r(1, 1), (solid().add(noiseLoop(25, 2, .5).brightness(.5).pixelate(1, 1))).g(1, 1)).sub(gradient())).color(1 / width, 1 / height), 1).modulate(osc(Math.PI * 2.0375, Math.PI / 2, btw(0, TAU)).pixelate(1, 1).brightness(-.5), 2 / width)))
.modulate(solid().add(src(o2).brightness(-.5).color(1 / width, 1 / height).modulate((gradient().scale(1, (noiseLoop(25, .1, 2.5).scale(4, 1, 1, rn(), rn()).brightness(1)).r(1, 1), (noiseLoop(25, .1, 2.5).scale(4, 1, 1, rn(), rn()).brightness(1)).g(1, 1)).sub(gradient())).color(1 / width, 1 / height), 1).rotate(btw(0, TAU)).scale(1 / 25, btw(1, 2), btw(1, 2), rn(), rn()).pixelate(3, 4)).add(src(o2).brightness(-.5).color(1 / width, 1 / height).modulate((gradient().scale(1, (noiseLoop(25, .1, 2.5).scale(4, 1, 1, rn(), rn()).brightness(1)).r(1, 1), (noiseLoop(25, .1, 2.5).scale(4, 1, 1, rn(), rn()).brightness(1)).g(1, 1)).sub(gradient())).color(1 / width, 1 / height), 1).rotate(btw(0, TAU)).scale(1 / 25, btw(1, 2), btw(1, 2), rn(), rn()).pixelate(5, 3)).add(src(o3).brightness(-.5).color(1 / width, 1 / height), 1), 1)
.out(o0);

osc(TAU, 0, .5)
.repeatX(btw(1, 2))
.rotate(btw(0, TAU))
.modulate(noise(15, 2).scale(10, 1, 1, rn(), rn()), rn())
.diff(osc(TAU, 0, .75).repeatX(btw(1, 2)).rotate(btw(0, TAU)).modulate(noise(20, 2).scale(10, 1, 1, rn(), rn()).thresh(.5, 1)), rn())
.diff(osc(TAU, 0, 1.).repeatX(btw(1, 2)).rotate(btw(0, TAU)).modulate(noise(25, 2).scale(10, 1, 1, rn(), rn()).thresh(1, 2)), rn())
.diff(osc(TAU, 0, 1.25).repeatX(btw(1, 2)).rotate(btw(0, TAU)).modulate(noise(30, 2).scale(10, 1, 1, rn(), rn()).thresh(1.5, 3)), rn())
.diff(osc(TAU, 0, 1.5).repeatX(btw(1, 2)).rotate(btw(0, TAU)).modulate(noise(35, 2).scale(10, 1, 1, rn(), rn()).thresh(2, 4)), rn())
.out(o3);

render(o0);
