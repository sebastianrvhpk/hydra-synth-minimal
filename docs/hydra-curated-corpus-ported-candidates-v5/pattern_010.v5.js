speed = .75;

src(o0)
.modulate(solid().add(noiseLoop(35, .25, .8).scale(4, A, B).pixelate(6 * (height / 500) / A, 6 * (height / 500)).mask(noiseLoop(13, .5, .8).scale(4, A, B).thresh(.125, .25)).color(1, 0), 1).add(noiseLoop(35, .25, .8).scale(4, A, B).pixelate(6 * (height / 500) / A, 6 * (height / 500)).mask(noiseLoop(13, .5, .8).scale(4, A, B).thresh(.5, .25)).color(0, 1), 1).scrollY(0, btw(-2, 2) / height).pixelate(pick(0.95, 6 * (height / 500) * 2 / A, width), pick(0.95, 6 * (height / 500) * 2, height)).scrollY(0, -btw(-2, 2) / height).color(1 / width, 1 / height), 6)
.layer(shape(4, .5, 0).scroll(.25, .25, 0).repeat(width / 2, height / 2).mask(noiseLoop(43, .25, .8).scale(4, A, B).thresh(.75, 0).pixelate(6 * (height / 500) * 4 / A, 6 * (height / 500) * 4)))
.out(o0);

src(o1)
.modulate(solid(btw(-2, 2), 0, 0).add(noiseLoop(35, .025, 1).scale(4, A, B).thresh(.05, .1).brightness(bl() * -.5)).add(noiseLoop(35, .025, 1).scale(4, A, B).thresh(.05, .1).brightness(bl() * -.5)).color(1 / width, 0 / height).mask(noiseLoop(13, .1, 1).scale(4, A, B).thresh(0, .125)).scrollY(0, btw(-2, 2) / height).pixelate(1, 6 * (height / 500)).scrollY(0, -btw(-2, 2) / height), btw(-2, 2) * 2)
.layer(src(o0).diff(solid()).scroll(rn(), rn(), btw(-3, 3) / width, btw(-3, 3) / height).mask(shape(4, 1, 0).scale(1, btw(1, 4) / width, 1, bl()).scrollX(btw(-2, 2) / width)))
.out(o1);

solid()
.diff(src(o1))
.out(o2);

render(o2);

solid()
.diff(src(o1))
.out(o2);

solid()
.diff(src(o0))
.out(o2);
