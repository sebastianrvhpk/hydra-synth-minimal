src(o1)
.diff(shape(4, .0075, 0).modulate(osc(4, 1).pixelate(1, 1).brightness(-.5).color(0, 1)).scale(1, A, B).luma())
.modulate((gradient().brightness(-.5).pixelate(2, 2)).color(1 / width, 1 / height), pxknob(-0.01, 0.0025, 3, 2, 0.08))
.out(o1);

src(o2)
.diff(shape(4, .015, 0).mask(noiseLoop(62, 1, 2)).scale(1, A, B).luma())
.modulate((gradient().brightness(-.5).pixelate(2, 2)).color(1 / width, 1 / height), px((-.0125) * Math.max(width, height)))
.out(o2);

solid()
.diff(o1)
.out(o3);

render(o3);
