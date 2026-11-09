/**
 * Capacitor bridge for the real local PaddlePaddle UVDoc ONNX CPU model.
 * Never transmits scanned files to a third party. Keeps original RGBA immutable.
 * The 1024px inference is upsampled only for compatible export dimensions;
 * effective model resolution is reported (not misrepresented as 12MP detail).
 */
const valid=(rgba,w,h)=>Number.isInteger(w)&&Number.isInteger(h)&&
  w>=128&&h>=128&&w*h<=5200000&&rgba?.length===w*h*4;
const toDataUrl=canvas=>new Promise((resolve,reject)=>canvas.toBlob(blob=>{
 if(!blob){reject(new Error('Cannot prepare UVDoc image'));return;}
 const reader=new FileReader();
 reader.onerror=()=>reject(new Error('Cannot encode UVDoc image'));
 reader.onload=()=>resolve(String(reader.result).split(',')[1]);
 reader.readAsDataURL(blob);
},'image/jpeg',.94));
const loadImage=url=>new Promise((resolve,reject)=>{
 const img=new Image();
 img.onload=()=>resolve(img);
 img.onerror=()=>reject(new Error('UVDoc returned undecodable JPEG'));
 img.src=url;
});
export async function unwarpPixelsAndroid({plugin,rgba,width,height}){
 if(!plugin?.unwarp||!valid(rgba,width,height))throw Error('UVDoc requires a valid on-device image');
 const original=new Uint8ClampedArray(rgba);
 const source=document.createElement('canvas');
 source.width=width;source.height=height;
 const context=source.getContext('2d',{willReadFrequently:true});
 const bitmap=context.createImageData(width,height);bitmap.data.set(original);context.putImageData(bitmap,0,0);
 const scale=Math.min(1,1024/Math.max(width,height));
 const reduced=document.createElement('canvas');
 reduced.width=Math.max(128,Math.round(width*scale));
 reduced.height=Math.max(128,Math.round(height*scale));
 reduced.getContext('2d').drawImage(source,0,0,reduced.width,reduced.height);
 const imageBase64=await toDataUrl(reduced);
 const outcome=await plugin.unwarp({imageBase64});
 if(!outcome?.imageBase64||!/^[a-f0-9]{64}$/.test(outcome.modelSha256||''))
  throw Error('UVDoc Android returned an unverified model result');
 const nativeWidth=Number(outcome.width),nativeHeight=Number(outcome.height);
 if(!Number.isInteger(nativeWidth)||!Number.isInteger(nativeHeight)||
   nativeWidth<128||nativeHeight<128||nativeWidth*nativeHeight>1600000)
  throw Error('UVDoc output geometry invalid');
 const img=await loadImage('data:image/jpeg;base64,'+outcome.imageBase64);
 if(img.naturalWidth!==nativeWidth||img.naturalHeight!==nativeHeight)
  throw Error('UVDoc dimensions and decoded JPEG disagree');
 const converted=document.createElement('canvas');
 converted.width=width;converted.height=height;
 const ctx=converted.getContext('2d',{willReadFrequently:true});
 ctx.drawImage(img,0,0,width,height);
 const pixels=ctx.getImageData(0,0,width,height).data;
 // Independent output and a separate original; no in-place edits.
 return {pixels:new Uint8ClampedArray(pixels),width,height,modelSha256:outcome.modelSha256,
  engine:outcome.engine,effectiveWidth:nativeWidth,effectiveHeight:nativeHeight,
  inferenceMs:outcome.inferenceMs,physical3D:false};
}
