speed = 1;

solid()
.diff(o0)
.mask(shape(4, 1, 0))
.layer(solid().diff(osc(Math.PI * .6 / 3, .666 / 7, 1).modulate(solid(rn() * width, 0), 1).pixelate(1, 1), 1).add(osc(Math.PI * .2 / 3, .75 / 7, 1).modulate(solid(rn() * width, 0), 1).kaleid(60000), .5).diff(osc(Math.PI * 6 / 3, .666 / 7, 1).modulate(solid(rn() * width, 0), 1).pixelate(1, 1), -.25).add(osc(TAU / 3, .75 / 7, 1).modulate(solid(rn() * width, 0), 1).kaleid(60000), -.25).mask(shape(4, 1, 0).scale(.25, 1, 1, rn(), rn()).repeat(width / 4, height / 4)))
.blend(src(o0), .5)
.modulate(gradient().brightness(-.5).rotate(Math.PI / -2).color(1 / width, 1 / height).mask(ns(.3, .1).pixelate(4, 4).brightness(1)).scale(1, A, B), 2)
.modulate(ns(.3, .025).color(.05, 1).add(ns(.3, .025).color(1, .05)).scale(1, A, B).color(1 / width, 1 / height), 1)
.modulateHue(o0, .125)
.layer(src(o0).colorama(.0025).mask(ns(.3, .025).scale(1, A, B).thresh(.5, 0)).mask(shape(4, 1, 0).scale(.25, 1, 1, rn(), rn()).repeat(width / 4, height / 4, 0, .5)))
.out(o0);
