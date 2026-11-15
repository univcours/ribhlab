/* Multi-symbol QR and barcode scanner for camera frames and gallery photos.
 * ZXing's BrowserMultiFormatReader decodes ONE symbol per frame. We also
 * inspect the full image and overlapping regions, collecting every DISTINCT,
 * verified result and mapping actual detector points back to the image.
 * This never invents a barcode when no decoder has verified its contents.
 */
import ZXingCore from '@zxing/library';
const {BinaryBitmap,HybridBinarizer,RGBLuminanceSource,MultiFormatReader,DecodeHintType}=ZXingCore;

const KEY=result=>String(result.getBarcodeFormat())+'\u0000'+String(result.getText());
const QUIET_LIMIT=24;
export function multiScanRegions(width,height,{fine=false}={}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<40||height<40)return [];
 const regs=[{x:0,y:0,w:width,h:height}];
 // Whole-page pass plus overlapping tiles (the original image can contain
 // codes in several corners, adjacent rows, or different barcode formats).
 const tiles=fine?[
  [0,0,.62,.62],[.38,0,.62,.62],[0,.38,.62,.62],[.38,.38,.62,.62],
  [0,0,.44,.53],[.28,0,.44,.53],[.56,0,.44,.53],
  [0,.47,.44,.53],[.28,.47,.44,.53],[.56,.47,.44,.53],
  [0,0,1,.55],[0,.45,1,.55],[0,0,.55,1],[.45,0,.55,1]
 ]:[
  [0,0,.62,.62],[.38,0,.62,.62],[0,.38,.62,.62],[.38,.38,.62,.62],
  [0,0,1,.59],[0,.41,1,.59],[0,0,.59,1],[.41,0,.59,1]
 ];
 for(const [x,y,w,h] of tiles){
  const rx=Math.round(x*width),ry=Math.round(y*height);
  const rw=Math.min(width-rx,Math.round(w*width)),rh=Math.min(height-ry,Math.round(h*height));
  if(rw>=40&&rh>=40)regs.push({x:rx,y:ry,w:rw,h:rh});
 }
 return regs;
}
function bitmapForRegion(pixels,width,region){
 const {x,y,w,h}=region;
 const gray=new Uint8ClampedArray(w*h);
 for(let row=0;row<h;row++){
  const offset=((y+row)*width+x)*4;
  for(let col=0;col<w;col++){
   const at=offset+col*4;
   gray[row*w+col]=(pixels[at]*77+pixels[at+1]*150+pixels[at+2]*29)>>8;
  }
 }
 return new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(gray,w,h)));
}
function remapResult(result,region){
 const text=String(result.getText?.()??'');
 const format=result.getBarcodeFormat?.();
 const raw=result.getResultPoints?.()||[];
 const pts=raw.map(p=>({
  getX:()=>p.getX()+region.x,
  getY:()=>p.getY()+region.y
 }));
 return {getText:()=>text,getBarcodeFormat:()=>format,getResultPoints:()=>pts};
}
/** Pixel decoder is also usable in tests with injected verified decoders.
 * A new MultiFormatReader is created per scan to avoid conflicting with
 * BrowserMultiFormatReader's own asynchronous single-code camera polling.
 */
export function scanMultiplePixels(pixels,width,height,{maxResults=QUIET_LIMIT,fine=false,decodeRegion=null}={}){
 if(!pixels||pixels.length<width*height*4||width<40||height<40)return [];
 const found=new Map();
 const decoder=decodeRegion?null:new MultiFormatReader();
 const hints=new Map([[DecodeHintType.TRY_HARDER,true]]);
 const regions=multiScanRegions(width,height,{fine});
 for(const region of regions){
  if(found.size>=maxResults)break;
  let result=null;
  try{
   result=decodeRegion?decodeRegion(region,pixels,width,height):
     decoder.decode(bitmapForRegion(pixels,width,region),hints);
  }catch{continue;}
  if(!result?.getText?.()||result.getBarcodeFormat?.()===undefined)continue;
  const normalized=remapResult(result,region);
  const key=KEY(normalized);
  if(!found.has(key))found.set(key,normalized);
 }
 decoder?.reset?.();
 return [...found.values()];
}
export function scanMultipleCanvas(canvas,options={}){
 const ctx=canvas?.getContext?.('2d',{willReadFrequently:true});
 if(!ctx||!canvas.width||!canvas.height)return [];
 const frame=ctx.getImageData(0,0,canvas.width,canvas.height);
 return scanMultiplePixels(frame.data,frame.width,frame.height,options);
}
/** Yield between camera decoding regions so the preview, Back and torch stay
 * responsive even on mid-range phones. Each result is decoded from real pixels.
 */
export async function scanMultipleCanvasAsync(canvas,{maxResults=QUIET_LIMIT,shouldStop=()=>false}={}){
 const ctx=canvas?.getContext?.('2d',{willReadFrequently:true});
 if(!ctx||!canvas.width||!canvas.height)return [];
 const {width,height}=canvas;
 const pixels=ctx.getImageData(0,0,width,height).data;
 const found=new Map(),decoder=new MultiFormatReader();
 const hints=new Map([[DecodeHintType.TRY_HARDER,false]]);
 const regions=multiScanRegions(width,height,{fine:false});
 for(let i=0;i<regions.length;i++){
  if(found.size>=maxResults||shouldStop())break;
  if(i>0&&i%2===0)await new Promise(resolve=>setTimeout(resolve,0));
  if(shouldStop())break;
  const region=regions[i];
  try{
   const value=decoder.decode(bitmapForRegion(pixels,width,region),hints);
   if(value?.getText?.()&&value.getBarcodeFormat?.()!==undefined){
    const next=remapResult(value,region);
    if(!found.has(KEY(next)))found.set(KEY(next),next);
   }
  }catch{ /* No supported code in this region. */ }
 }
 decoder.reset();
 return [...found.values()];
}
export function verifiedUniqueCodes(results,recognize){
 const collected=[],seen=new Set();
 for(const result of results||[]){
  const code=recognize(result);
  if(!code)continue;
  const key=code.format+'\u0000'+code.value;
  if(seen.has(key))continue;
  seen.add(key);collected.push({code,result});
 }
 return collected;
}
