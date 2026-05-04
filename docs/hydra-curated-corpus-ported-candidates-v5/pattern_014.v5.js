speed = 1;

solid()
.diff(o0)
.mask(shape(4, 1, 0))
.layer(solid().diff(osc(Math.PI * .6 / 3, .666 / 7, 1).modulate(solid(rn() * width, 0), 1).pixelate(1, 1), 1).add(osc(Math.PI * .2 / 3, .75 / 7, 1).modulate(solid(rn() * width, 0), 1).kaleid(60000), .5).diff(osc(Math.PI * 6 / 3, .666 / 7, 1).modulate(solid(rn() * width, 0), 1).pixelate(1, 1), -.25).add(osc(TAU / 3, .75 / 7, 1).modulate(solid(rn() * width, 0), 1).kaleid(60000), -.25).mask(shape(4, 1, 0).scale(.25, 1, 1, rn(), rn()).repeat(width / 4, height / 4)))
.modulate((gradient().rotate((ns(.3, .025).scale(1, A, B)).r(Math.PI / 360, 0)).sub(gradient())).color(1 / width, 1 / height), 1)
.layer(src(o0).colorama(.0025).mask(ns(.03, .025).scale(1, A, B).thresh(.5, 0)).mask(shape(4, 1, 0).scale(.25, 1, 1, rn(), rn()).repeat(width / 4, height / 4)))
.out(o0);
