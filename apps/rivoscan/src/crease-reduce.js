import {normalizeDocumentShadowsRGBA} from './document-shadows.js';
import {normalizeScannerPaperRGBA} from './scanner-paper.js';
/**
 * Conservative scanner-style fold-shadow correction for user-owned documents.
 * A long-range paper-light estimate reduces wrinkles' shading while retaining
 * actual pigment; this cannot recover missing text or true 3D folds.
 */
export function reducePaperCreasesRGBA(rgba,width,height){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||
   width*height>6500000||rgba.length!==width*height*4)
   throw Error('Invalid document pixels');
 const src=new Uint8ClampedArray(rgba);
 const shadow=normalizeDocumentShadowsRGBA(src,width,height);
 const corrected=normalizeScannerPaperRGBA(shadow,width,height);
 const out=src.slice();
 for(let i=0;i<src.length;i+=4){
  const r=src[i],g=src[i+1],b=src[i+2];
  const light=.2126*r+.7152*g+.0722*b;
  const max=Math.max(r,g,b),min=Math.min(r,g,b);
  const sat=(max-min)/Math.max(30,max);
  // Dark signatures remain dark; saturated stamps keep their exact source
  // chroma. Light paper may be strongly normalized.
  const protectDark=light<52?.96:light<100?.77:light<145?.36:0;
  const protectColor=Math.min(.88,Math.max(0,(sat-.10)*2.8));
  const blend=Math.max(.04,.93*(1-Math.max(protectDark,protectColor)));
  for(let channel=0;channel<3;channel++)
   out[i+channel]=Math.round(src[i+channel]*(1-blend)+corrected[i+channel]*blend);
  out[i+3]=src[i+3];
 }
 return out;
}
