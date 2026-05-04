solid()
.out(o0);

src(o0)
.layer(shape(4, .5, 0).scroll(.25, .25, 0, .25).repeat(width / 3, height / 3).mask(noise(2, -.1).thresh(.5, 0).pixelate(9, 9)))
.modulate((solid().add(noise(3, .1).scale(2, 1, 1, 0, 0).color(1, 0, 0).pixelate(3, 3).mask(noise(3, .1).scale(2, 1, 1, 0, 0).thresh(.5, .1))).add(noise(3, .1).scale(2, 1, 1, 1, 1).color(0, 1, 0).pixelate(3, 3).mask(noise(3, .1).scale(2, 1, 1, 1, 1).thresh(.5, .1))).sub(noise(3, .1).scale(2, 1, 1, 1, 0).color(1, 0, 0).pixelate(6, 6).mask(noise(3, .1).scale(2, 1, 1, 1, 0).thresh(.5, .1))).sub(noise(3, .1).scale(2, 1, 1, 0, 1).color(0, 1, 0).pixelate(6, 6).mask(noise(3, .1).scale(2, 1, 1, 0, 1))).pixelate(9, 9)).color(1 / width, 1 / height), px((.02 * 2) * Math.max(width, height)))
.modulate((gradient().scale(1, (osc(35, .15).brightness(-.5).rotate(.25).pixelate(6, 6).mask(noise(1, .5).thresh(.375, 0).pixelate(3, 3)).color(0, 1, 0)).r(2, 1), (osc(35, .15).brightness(-.5).rotate(.25).pixelate(6, 6).mask(noise(1, .5).thresh(.375, 0).pixelate(3, 3)).color(0, 1, 0)).g(2, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
.out(o0);

render(o0);
