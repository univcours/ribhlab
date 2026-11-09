/**
 * Offline document-paper normalization for already cropped pages.
 * Regional upper-percentile illumination is interpolated bilinearly;
 * ink and colored stamps stay visible, source pixels stay untouched.
 */
export function normalizeScannerPaperRGBA(rgba,width,height){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||
    width*height>6500000||rgba.length!==width*height*4)throw Error('Invalid scanner photo');
 const src=new Uint8ClampedArray(rgba),out=src.slice();
 const cell=Math.max(32,Math.min(160,Math.round(Math.min(width,height)/10)));
 const nx=Math.ceil(width/cell),ny=Math.ceil(height/cell);
 const hist=new Uint32Array(nx*ny*64);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4;
  const lum=.2126*src[i]+.7152*src[i+1]+.0722*src[i+2];
  const tile=Math.floor(y/cell)*nx+Math.floor(x/cell);
  hist[tile*64+Math.min(63,Math.floor(lum/4))]++;
 }
 const whites=new Float32Array(nx*ny);
 for(let ty=0;ty<ny;ty++)for(let tx=0;tx<nx;tx++){
  const at=ty*nx+tx;
  const pixels=Math.min(cell,height-ty*cell)*Math.min(cell,width-tx*cell);
  const threshold=Math.max(1,Math.ceil(pixels*.86));
  let count=0,level=63;
  for(let b=0;b<64;b++){count+=hist[at*64+b];if(count>=threshold){level=b;break}}
  whites[at]=Math.max(82,level*4+2);
 }
 const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
 for(let y=0;y<height;y++){
  const fy=clamp(y/cell-.5,0,ny-1),y0=Math.floor(fy),y1=Math.min(ny-1,y0+1),dy=fy-y0;
  for(let x=0;x<width;x++){
   const fx=clamp(x/cell-.5,0,nx-1),x0=Math.floor(fx),x1=Math.min(nx-1,x0+1),dx=fx-x0;
   const bg0=whites[y0*nx+x0]*(1-dx)+whites[y0*nx+x1]*dx;
   const bg1=whites[y1*nx+x0]*(1-dx)+whites[y1*nx+x1]*dx;
   const paper=bg0*(1-dy)+bg1*dy;
   const p=(y*width+x)*4,r=src[p],g=src[p+1],b=src[p+2];
   const min=Math.min(r,g,b),max=Math.max(r,g,b);
   const saturation=(max-min)/Math.max(28,max);
   const light=.2126*r+.7152*g+.0722*b;
   const gain=clamp(247/paper,1,1.8);
   const ink=clamp((paper-light)/Math.max(25,paper),0,1);
   const scale=gain*(1-.16*ink);
   const chromaMix=clamp((saturation-.18)*2.5,0,.62);
   for(let k=0;k<3;k++){
    const repaired=clamp(Math.round(src[p+k]*scale),0,255);
    out[p+k]=Math.round(repaired*(1-chromaMix)+src[p+k]*chromaMix);
   }
  }
 }
 return out;
}
