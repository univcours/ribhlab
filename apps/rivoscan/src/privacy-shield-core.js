export function normalizeRedaction({x1,y1,x2,y2},min=.008){
 if(![x1,y1,x2,y2].every(Number.isFinite))return null;
 const clamp=x=>Math.max(0,Math.min(1,x));
 const left=clamp(Math.min(x1,x2)),top=clamp(Math.min(y1,y2));
 const right=clamp(Math.max(x1,x2)),bottom=clamp(Math.max(y1,y2));
 if(right-left<min||bottom-top<min)return null;
 return {x:left,y:top,w:right-left,h:bottom-top};
}
export function redactCanvas(ctx,rects,width,height){
 // Rectangles are over-painted into decoded pixels, never PDF annotations.
 ctx.save();ctx.fillStyle='#000000';
 for(const r of rects||[]){
  const box=normalizeRedaction({x1:r.x,y1:r.y,x2:r.x+r.w,y2:r.y+r.h},0.00001);
  if(box)ctx.fillRect(Math.floor(box.x*width),Math.floor(box.y*height),
   Math.ceil(box.w*width)+2,Math.ceil(box.h*height)+2);
 }
 ctx.restore();
}
