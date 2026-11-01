/**
 * Restrict manual inpainting to a selected ink/watermark color inside a
 * user-painted region. Printed black text is not selected in blue/red/green
 * modes. "gray" is intended for light gray stamps/watermarks only, not
 * reliable semantic handwriting detection.
 */
export function coloredMarkMask(rgba,brushMask,width,height,color='all'){
 if(!['all','blue','red','green','light-gray'].includes(color))throw Error('Unknown mark color');
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||
   rgba.length!==width*height*4||brushMask.length!==width*height)throw Error('Invalid image/mask');
 const out=new Uint8Array(width*height);
 for(let i=0;i<out.length;i++){
  if(!brushMask[i])continue;
  const k=i*4,r=rgba[k],g=rgba[k+1],b=rgba[k+2];
  const max=Math.max(r,g,b),min=Math.min(r,g,b),neutral=max-min<23;
  const isTarget=color==='all'||
   color==='blue'&&(b>r+34&&b>g+12&&b>65)||
   color==='red'&&(r>g+26&&r>b+19&&r>66)||
   color==='green'&&(g>r+23&&g>b+13&&g>70)||
   color==='light-gray'&&(neutral&&min>=120&&max<=239);
  if(isTarget)out[i]=255;
 }
 // Do not dilate: adjacent black printed strokes must stay exactly intact.
 return out;
}
