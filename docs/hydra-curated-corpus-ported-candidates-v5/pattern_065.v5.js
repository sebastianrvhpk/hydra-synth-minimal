ns = (scl=1,tm=1,freq=3) => {
  return noise(freq,0).modulate(solid(rn()*width,rn()*height),1).scroll(wobc(0, scl*.5, 0.05),wobc(0, scl*.5, 0.05))
}

src(o0).diff(solid())
.layer(src(o1).mask(shape(5000,1,0).scale(.01,A)
.modulate(solid()
.add(ns(.15,4).color(1,0))
.add(ns(.15,8).color(0,1))
.add(ns(.25,4).color(1,0))
.add(ns(.25,8).color(0,1))
.pixelate(1,1)
,.25)))
.modulate(solid()
.add(ns(.15,1).color(1,0))
.add(ns(.15,1).color(0,1))
.add(ns(.25,1).color(1,0))
.add(ns(.25,1).color(0,1))
.pixelate(1,1)
.color(1/width,1/height), 6)
.modulate((gradient().scale(1, (ns(.03,.01,10).color(1/width,1/height).pixelate(8,8).mask(ns(.25,1,10).pixelate(10,10).thresh(0,0))).r(10, 1), (ns(.03,.01,10).color(1/width,1/height).pixelate(8,8).mask(ns(.25,1,10).pixelate(10,10).thresh(0,0))).g(10, 1)).sub(gradient())).color(1 / width, 1 / height), 1)
.out(o0)

osc(Math.PI,1,1)
.out(o1)

//screencap()
