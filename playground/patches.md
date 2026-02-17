A=()=>height/width,speed=1,fps=60,setCanvasDisplay(512,512),rn=()=>Math.random(),ns=(f=.3,v=.125,x=rn(),y=rn())=>noise(f,v).modulate(solid(width*x,height*y),1).scale(1,A,1,rn())

solid().diff(o0)
.layer(osc(Math.PI
,.75,Math.PI/4).mask(shape(4,1,0)).scale(1,1/width,1/height))
.blur().scale(1.05).bloomUpsample().sharpen().dualKawaseBloom()
.out()
src(o0)
.toneMap(.25,1).sub(prevN(o1,55).modulate(ns().color(1,0).add(ns().color(0,1)).pixelate(1,1)))
.blend(src(o1),.125)
.out(o1)
render(o1)


---


