ofst=btw(.125,.375)

multi = (px,spd) => {
  return ns(px,0).pixelate(px,1).scrollX(0,(1/px)*spd).brightness(1).pixelate(1,1)
}
speed=.5

solid().diff(o0)
.modulate(solid()
.add(osc(TAU,1).sub(multi(3,1),.25).pixelate(1,1).color(1,0).mult(multi(7,1)),-100)
.add(shape(4,.25,1).rotate(0,.1).scale(1, A, B).modulate((gradient().scale(1, (ns(3,1).pixelate(1,1)).r(4, 1), (ns(3,1).pixelate(1,1)).g(4, 1)).sub(gradient())).color(1 / width, 1 / height), 1).diff(osc(1,-1)).mult(multi(9,1)),50)
.add(gradient().rotate(Math.PI/2).mult(noise(10,1).thresh(.25,.5).pixelate(1,1)).mult(multi(4,2)),125)
.add(gradient().rotate(Math.PI/-2).mult(noise(10,1).thresh(.25,.5).invert().pixelate(1,1)).mult(multi(4,2)),-125)
.color(1/width,1/height)
,.1)
.layer(src(o1).mask(shape(4,1,0).scale(1,1/width,1,0)))
.out(o0)

solid(0,0,0)
.add(osc(TAU,1).modulate(solid(1,0),0).color(1,0,0))
.add(osc(TAU,1).modulate(solid(1,0),ofst/2*btw(.75,1.25)).color(0,1,0))
.add(osc(TAU,1).modulate(solid(1,0),ofst*btw(.75,1.25)).color(0,0,1))
.modulate(solid(rn()*width,rn()*height),1)
.out(o1)

render(o0)

//screencap()
