/**
 * Extract physical formula *image regions* from actual OCR coordinates.
 * Does not pretend text OCR can reliably reconstruct a stacked fraction.
 * A region is returned only if a line includes visible maths notation.
 * All coordinates are image pixels and need to be checked before saving.
 */
export function findFormulaRegions(blocks,width,height){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||
   width*height>12000000||!Array.isArray(blocks))throw Error('Invalid OCR geometry');
 const results=[];
 const mathToken=t=>/[=+×÷√∑∫≠≤≥≈∂∞^_]/.test(t)||
  /^(?:sin|cos|tan|log|lim|sqrt)\b/i.test(t)||/^[([{]?[A-Za-z0-9]+\s*\/\s*[A-Za-z0-9]+[)}\]]?$/.test(t);
 for(const block of blocks.slice(0,120)){
  for(const paragraph of (block?.paragraphs||[]).slice(0,300)){
   for(const line of (paragraph?.lines||[]).slice(0,400)){
    const words=(line.words||[]).filter(w=>typeof w?.text==='string'&&
      w.bbox&&['x0','x1','y0','y1'].every(k=>Number.isFinite(w.bbox[k])));
    if(!words.length||!words.some(w=>mathToken(w.text)))continue;
    const x0=Math.min(...words.map(w=>w.bbox.x0));
    const y0=Math.min(...words.map(w=>w.bbox.y0));
    const x1=Math.max(...words.map(w=>w.bbox.x1));
    const y1=Math.max(...words.map(w=>w.bbox.y1));
    const pad=Math.max(3,Math.round((y1-y0)*.2));
    const x=Math.max(0,Math.floor(x0-pad)),y=Math.max(0,Math.floor(y0-pad));
    const w=Math.min(width-x,Math.ceil(x1+pad)-x),h=Math.min(height-y,Math.ceil(y1+pad)-y);
    if(w<8||h<6||w*h>4000000)continue;
    results.push({x,y,w,h,text:words.map(z=>z.text).join(' ').slice(0,500)});
    if(results.length>=20)return results;
   }
  }
 }
 return results.sort((a,b)=>a.y-b.y||a.x-b.x);
}
export function formulaRegionLayout(regions,imageWidth,imageHeight){
 if(!Array.isArray(regions)||regions.length<1||regions.length>20||
  !Number.isInteger(imageWidth)||!Number.isInteger(imageHeight)||
  imageWidth<1||imageHeight<1)throw Error('Invalid formula regions');
 const padding=14,gap=12;
 const width=Math.max(...regions.map(r=>r.w))+padding*2;
 let y=padding;const parts=[];
 for(const r of regions){
  if(![r.x,r.y,r.w,r.h].every(Number.isFinite)||r.x<0||r.y<0||r.w<1||r.h<1||
    r.x+r.w>imageWidth||r.y+r.h>imageHeight)throw Error('Formula region outside the source');
  parts.push({...r,dx:padding,dy:y});y+=r.h+gap;
 }
 const height=y-gap+padding;
 if(width*height>8000000||width>4000||height>18000)throw Error('Formula image too large');
 return {width,height,parts};
}
