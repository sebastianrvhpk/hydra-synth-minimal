shape(4,1,0).scale(.125/2,1,1,0,0).repeat(width/16,height/16,.5,0)
.modulate(gradient().rotate(0,1).repeat(width/16,height/16),rng(0, 0.1, 8, 2, 0.05))
.blend(o0,.25)
.out(o0)

src(o0).mask(noise(3,.1).pixelate(8,8).thresh(0,0))
.layer(shape(4,1,0).scale(.125/2,1,1,0,0).repeat(width/16,height/16,.5,0).mask(noise(3,.1).pixelate(8,8).thresh(0,0).invert()))
.out(o1)
render(o1)
