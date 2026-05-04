multi = (px,spd) => {
  return ns(px,0).pixelate(px,1).scrollX(0,(1/px)*spd).brightness(1).pixelate(1,1)
}
speed=1

solid().diff(o0)
.modulate(solid()
.add(osc(TAU,1).sub(multi(3,1),.1).pixelate(1,1).color(1,0).mult(multi(7,1)),-100)
.add(shape(4,.25,0).rotate(0,.1).scale(1, A, B).modulate((gradient().scale(1, (ns(3,1).pixelate(1,1)).r(4, 1), (ns(3,1).pixelate(1,1)).g(4, 1)).sub(gradient())).color(1 / width, 1 / height), 1).diff(osc(1,-1)).mult(multi(9,1)),50)
.add(gradient().rotate(Math.PI/2).mult(noise(10,1).thresh(.25,.5).pixelate(1,1)).mult(multi(4,2)),125)
.add(gradient().rotate(Math.PI/-2).mult(noise(10,1).thresh(.25,.5).invert().pixelate(1,1)).mult(multi(4,2)),-125)
.color(1/width,1/height)
)
.layer(osc(TAU,1,1).rotate(0,.1*0).mask(shape(4,1,0).scale(1,1/width,1,0)))
.out(o0)
