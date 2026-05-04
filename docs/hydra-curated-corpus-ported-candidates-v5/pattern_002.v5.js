src(o0)
.layer(src(o2).mult(o3, rng(0.25, 1, 8, 2, 0.05)))
.modulate((osc(btw(2.5, 20), btw(-.1, .1), 2).modulate(noise(btw(0.5, 10), btw(.005, .125)).rotate(btw(0, Math.PI / 2)).luma(btw(0, .875)).pixelate(btw(3, 750), btw(3, 150)), 1)).r().color(1 / width, 0), (btw(-0.00375, 0.00375)) * width)
.modulate((osc(btw(2.5, 20), -btw(-.1, .1), 2).modulate(noise(btw(0.5, 10), -btw(.005, .125)).rotate(btw(0, TAU) / 2).luma(btw(0, .875)).pixelate(btw(3, 750), btw(3, 150)), 1)).r().color(0, 1 / height), (btw(-0.00375, 0.00375)) * height)
.modulate((osc(btw(2.5, 20), btw(-.1, .1), 2).modulate(noise(btw(0.5, 10), btw(.005, .125)).invert().rotate(btw(0, Math.PI * 3) / 2).luma(btw(0, .875)).pixelate(btw(3, 750), btw(3, 150)), 1)).r().color(1 / width, 0), (btw(-0.005625, 0.005625)) * width)
.modulate((osc(btw(2.5, 20), -btw(-.1, .1), 2).modulate(noise(btw(0.5, 10), -btw(.005, .125)).invert().rotate(btw(0, Math.PI * 4) / 2).luma(btw(0, .875)).pixelate(btw(3, 750), btw(3, 150)), 1)).r().color(0, 1 / height), (btw(-0.005625, 0.005625)) * height)
.modulateHue(src(o0).pixelate(btw(3, 750), btw(3, 150)), rng(0, btw(.5, 7.5), 8, 2, 0.05))
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
.mult(osc(btw(50, 600), btw(.0125, .125)).luma(btw(.75, .975)).modulate((gradient().rotate((noise(3, .05)).r(1, 0)).sub(gradient())).color(1 / width, 1 / height), 1))
.mult(noise(btw(1, 8), btw(0.05, 0.75)).pixelate(intgr(3, 15), intgr(3, 15)).contrast(2).thresh(.25))
.luma()
.scale(1, A, B)
.out(o2);

render(o0);
