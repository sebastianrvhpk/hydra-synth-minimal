ns = (f = 3, v = 0, x = rn(), y = rn()) => {
  return noise(f, v)
    .scale(1, A, B, rn())
    .modulate(
      solid(width * x, height * y)
        .mask(noise(Math.PI * 20, .02).thresh(0, .025).pixelate(1, 1)),
      1
    )
}
speed=2
shape(4,1,0).scale(.5,1,1,rn(),rn()).repeat(width/2,height/2,rn(),rn()).mult(ns(1,.1).thresh(.25-.5,.25))
.diff(shape(4,1,0).scale(.25,1,1,rn(),rn()).repeat(width/4,height/4,rn(),rn()).mult(ns(1.25,.1).thresh(.375-.5,.25)))
.diff(shape(4,1,0).scale(.125,1,1,rn(),rn()).repeat(width/8,height/8,rn(),rn()).mult(ns(.5,.1).thresh(.5-.5,.25)))
.diff(shape(4,1,0).scale(.5,1,1,rn(),rn()).repeat(width/2,height/2,rn(),rn()).mult(ns(1.75,.1).thresh(.75-.5,.25)))
.diff(src(o0).mask(ns(TAU,2).thresh(0,0).pixelate(1,1)).mask(ns(Math.PI/4,.05).pixelate(width,1).thresh(0,0)))
.blend(src(o0).modulate(solid(1/width,1/height).mult(osc(TAU,.1).mask(ns(TAU,2).thresh(0,.025).pixelate(1,1)).brightness(-.5).contrast(2)),-1),.875)
.scrollX(-2/width)
.blend(o0,.5)
.out(o0)
