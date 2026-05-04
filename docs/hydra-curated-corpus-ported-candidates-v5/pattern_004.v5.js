solid()
.diff(src(o0))
.modulate((noise(4, .25, .5).scale(4, A, 1, rn(), rn(), intgr(10, 40)).color(1, 0).pixelate(intgr(10, 40) / B, intgr(10, 40))).color(1 / width, 0), px((.005) * Math.max(width, height)))
.modulate((noise(4, .25, .5).scale(4, A, 1, rn(), rn()).color(0, 1).pixelate(intgr(10, 40) / B, intgr(10, 40))).color(0, 1 / height), px((.005) * Math.max(width, height)))
.modulate((noise(4, .25, .5).scale(4, A, 1, rn(), rn()).color(1, 0).pixelate(intgr(10, 40) / B, intgr(10, 40))).color(1 / width, 0), px((.005) * Math.max(width, height)))
.modulate((noise(4, .25, .5).scale(4, A, 1, rn(), rn()).color(0, 1).pixelate(intgr(10, 40) / B, intgr(10, 40))).color(0, 1 / height), px((.005) * Math.max(width, height)))
.modulate((gradient().scale(1, (osc(5, .25).color(1, 0)).r(.00075, 1), (osc(5, .25).color(1, 0)).g(.00075, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
.layer(shape(90, 1, 0).diff(shape(90, .875)).scale(.875).repeat(intgr(10, 40) / B, intgr(10, 40)).mask(noise(15 * 4, .25).scale(4, A, 1, rn(), rn()).pixelate(intgr(10, 40) / B, intgr(10, 40)).thresh(.75, 0)).luma(.5, 0).mult(osc(5, .1, 2).rotate(rn(TAU)).contrast(.75).saturate(.875).modulate(noise(2 * 4, .2).scale(4, A, 1, rn(), rn()), .5).diff(osc(10, .1, 2).rotate(rn(TAU)).hue(.1).contrast(.666).saturate(1.5).color(1, .5, 1).modulate(noise(2 * 4, .15).scale(4, A, 1, rn(), rn()), .5))))
.out(o0);
