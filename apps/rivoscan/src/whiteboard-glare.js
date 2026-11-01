/**
 * Local-contrast normalization for whiteboards and glossy printed sheets.
 * Estimates a white reference from the 80th percentile per tile and balances
 * illumination without a destructive black/white threshold.
 *
 * NOTE: Fully clipped glare pixels contain no recoverable writing; this tool
 * cannot reconstruct text that the camera never recorded.
 */
export function normalizeWhiteboardRGBA(rgba,width,height){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||
    width*height>7000000||rgba.length!==width*height*4)throw Error('Invalid whiteboard photo');
 const tile=Math.max(24,Math.round(Math.min(width,height)/12));
 const nx=Math.ceil(width/tile),ny=Math.ceil(height/tile);
 const hist=new Uint32Array(nx*ny*256),source=new Uint8ClampedArray(rgba);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4;
  const lum=Math.round(.2126*source[i]+.7152*source[i+1]+.0722*source[i+2]);
  const c=Math.floor(y/tile)*nx+Math.floor(x/tile);
  hist[c*256+lum]++;
 }
 const white=new Float32Array(nx*ny);
 for(let cy=0;cy<ny;cy++)for(let cx=0;cx<nx;cx++){
  const n=Math.min(tile,width-cx*tile)*Math.min(tile,height-cy*tile);
  const base=(cy*nx+cx)*256,target=n*.80;
  let sum=0,bright=205;
  for(let i=0;i<256;i++){sum+=hist[base+i];if(sum>=target){bright=i;break}}
  white[cy*nx+cx]=Math.max(115,bright);
 }
 const output=new Uint8ClampedArray(source);
 for(let y=0;y<height;y++){
  const fy=Math.max(0,Math.min(ny-1,y/tile-.5)),y0=Math.floor(fy),y1=Math.min(ny-1,y0+1),ry=fy-y0;
  for(let x=0;x<width;x++){
   const fx=Math.max(0,Math.min(nx-1,x/tile-.5)),x0=Math.floor(fx),x1=Math.min(nx-1,x0+1),rx=fx-x0;
   const top=white[y0*nx+x0]*(1-rx)+white[y0*nx+x1]*rx;
   const bottom=white[y1*nx+x0]*(1-rx)+white[y1*nx+x1]*rx;
   const reference=top*(1-ry)+bottom*ry;
   const p=(y*width+x)*4,r=source[p],g=source[p+1],b=source[p+2];
   const lum=.2126*r+.7152*g+.0722*b,max=Math.max(r,g,b),min=Math.min(r,g,b);
   const target=242*Math.pow(Math.max(0,lum)/reference,1.12);
   const corrected=Math.max(0,Math.min(250,target));
   const ratio=lum>1?corrected/lum:0;
   // Colored markers/stamps keep their actual hue and 65% of original tone.
   const preserve=(max-min)>26&&max>46?.65:.15;
   for(let k=0;k<3;k++){
    const shifted=Math.max(0,Math.min(250,source[p+k]*ratio));
    output[p+k]=Math.round(shifted*(1-preserve)+source[p+k]*preserve);
   }
   output[p+3]=source[p+3];
  }
 }
 return output;
}
