setResolution(width / 2, height / 2);

solid()
.add(o0)
.diff(shape(4, .25, 0).mask(shape(4, .25, 0).invert().scale(1, 1 - 5 / width, 1 - 5 / height)).modulate((gradient().scale(1, (ns(3, 1, .75).pixelate(10, 10).scrollX(0, .5).pixelate(1, 1)).r(2, 1), (ns(3, 1, .75).pixelate(10, 10).scrollX(0, .5).pixelate(1, 1)).g(2, 1)).sub(gradient())).color(1 / width, 1 / height), 1).modulate(ns(3, .25, .75).color(1, 0).add(ns(3, .25, .75).color(0, 1)).pixelate(1, 1), .5))
.modulate(solid().add(shape(4, .5, 0).modulate((gradient().scale(1, (ns(3, .25, .75).color(1, 0).add(ns(3, .25, .75).color(0, 1)).pixelate(1, 1)).r(1, 1), (ns(3, .25, .75).color(1, 0).add(ns(3, .25, .75).color(0, 1)).pixelate(1, 1)).g(1, 1)).sub(gradient())).color(1 / width, 1 / height), 1).modulate(ns(3, .25, .75).color(1, 0).add(ns(3, .25, .75).color(0, 1)).pixelate(1, 1), .5).color(1, 0, 0)).add(shape(4, .5, 0).modulate((gradient().scale(1, (ns(3, .25, .75).color(1, 0).add(ns(3, .25, .75).color(0, 1)).pixelate(1, 1)).r(1, 1), (ns(3, .25, .75).color(1, 0).add(ns(3, .25, .75).color(0, 1)).pixelate(1, 1)).g(1, 1)).sub(gradient())).color(1 / width, 1 / height), 1).modulate(ns(3, .25, .75).color(1, 0).add(ns(3, .25, .75).color(0, 1)).pixelate(1, 1), .5).color(0, 1, 0)).color(1 / width, 1 / height), 6)
.modulate(src(o0).color(1 / width, 1 / height), 1)
.diff(o0)
.out(o0);
