/** Offline white-paper shadow lift. Preserves nearby ink and never invents missing pixels. */
export function normalizeDocumentShadowsRGBA(rgba,width,height){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||
 width*height>7000000||rgba.length!==width*height*4)throw Error('Invalid document image');
 const src=new Uint8ClampedArray(rgba),out=src.slice();
 const tile=Math.max(32,Math.round(Math.min(width,height)/8)),nx=Math.ceil(width/tile),ny=Math.ceil(height/tile);
 const histogram=new Uint32Array(nx*ny*256);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const p=(y*width+x)*4,light=Math.round(.2126*src[p]+.7152*src[p+1]+.0722*src[p+2]);
  histogram[(Math.floor(y/tile)*nx+Math.floor(x/tile))*256+light]++;
 }
 const white=new Float32Array(nx*ny);
 for(let cy=0;cy<ny;cy++)for(let cx=0;cx<nx;cx++){
  const target=Math.min(tile,width-cx*tile)*Math.min(tile,height-cy*tile)*.85;
  let sum=0,value=255;
  for(let l=0;l<256;l++){sum+=histogram[(cy*nx+cx)*256+l];if(sum>=target){value=l;break}}
  white[cy*nx+cx]=Math.max(80,value);
 }
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 for(let y=0;y<height;y++){
  const fy=clamp(y/tile-.5,0,ny-1),y0=Math.floor(fy),y1=Math.min(ny-1,y0+1),dy=fy-y0;
  for(let x=0;x<width;x++){
   const fx=clamp(x/tile-.5,0,nx-1),x0=Math.floor(fx),x1=Math.min(nx-1,x0+1),dx=fx-x0;
   const upper=white[y0*nx+x0]*(1-dx)+white[y0*nx+x1]*dx;
   const lower=white[y1*nx+x0]*(1-dx)+white[y1*nx+x1]*dx;
   const background=upper*(1-dy)+lower*dy;
   const p=(y*width+x)*4,r=src[p],g=src[p+1],b=src[p+2];
   const light=.2126*r+.7152*g+.0722*b;
   // Lighten paper strongly, but protect the contrast of ink and faint stamps.
   const preservation=Math.pow(clamp((light/Math.max(1,background)-.42)/.58,0,1),2);
   const lift=clamp(245-background,0,125)*(.04+.96*preservation);
   for(let k=0;k<3;k++)out[p+k]=clamp(Math.round(src[p+k]+lift),0,255);
  }
 }
 return out;
}
