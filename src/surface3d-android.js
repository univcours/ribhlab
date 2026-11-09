/**
 * Offline bridge for true but relative (not metric) multi-view 3D page mesh.
 * Uses the original photos for calibrated-approximate ORB/essential pose, then
 * remaps the locally cleaned image. No network, no hallucinated text.
 */
const valid=(data,w,h)=>Number.isInteger(w)&&Number.isInteger(h)&&w>=160&&h>=160&&
 w*h<=5200000&&data?.length===w*h*4;
function inputJpeg(data,w,h){
 return new Promise((resolve,reject)=>{
  if(!valid(data,w,h)){reject(new Error('Invalid document pixels for relative 3D'));return}
  const source=document.createElement('canvas');source.width=w;source.height=h;
  const context=source.getContext('2d',{willReadFrequently:true});
  const img=context.createImageData(w,h);img.data.set(data);context.putImageData(img,0,0);
  const scale=Math.min(1,960/Math.max(w,h));
  const tiny=document.createElement('canvas');
  tiny.width=Math.max(160,Math.round(w*scale));
  tiny.height=Math.max(160,Math.round(h*scale));
  tiny.getContext('2d').drawImage(source,0,0,tiny.width,tiny.height);
  tiny.toBlob(blob=>{
   if(!blob){reject(Error('Unable to encode 3D camera frame'));return}
   const reader=new FileReader();
   reader.onerror=()=>reject(Error('Cannot encode 3D image'));
   reader.onload=()=>resolve(String(reader.result).split(',')[1]);
   reader.readAsDataURL(blob);
  },'image/jpeg',.95);
 });
}
function decodeJpeg(base64){
 return new Promise((resolve,reject)=>{
  const img=new Image();
  img.onload=()=>resolve(img);
  img.onerror=()=>reject(Error('Native 3D image cannot be decoded'));
  img.src='data:image/jpeg;base64,'+base64;
 });
}
export async function reconstructRelativeSurfaceAndroid({
 plugin,reference,render,extraFrames,width,height
}){
 if(!plugin?.reconstruct||!valid(reference,width,height)||
 !valid(render,width,height)||!Array.isArray(extraFrames)||
 extraFrames.length<1||extraFrames.length>3)throw Error('3D requires 2–4 photos of one document');
 for(const frame of extraFrames)if(!valid(frame,width,height))throw Error('3D source geometry mismatch');
 const images=await Promise.all([reference,...extraFrames].map(data=>inputJpeg(data,width,height)));
 const renderBase64=await inputJpeg(render,width,height);
 const result=await plugin.reconstruct({images,renderBase64});
 const points=Number(result?.triangulatedPoints),conf=Number(result?.confidence);
 if(!result?.physical3DRelative||!result.imageBase64||points<36||!(conf>=.28)||
 !Number.isInteger(result.width)||!Number.isInteger(result.height))
   throw Error('3D mesh was not reconstructed; use UVDoc or scan another angle');
 const img=await decodeJpeg(result.imageBase64);
 if(img.naturalWidth!==result.width||img.naturalHeight!==result.height)
  throw Error('Invalid decoded 3D mesh output');
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 ctx.drawImage(img,0,0,width,height);
 return {pixels:new Uint8ClampedArray(ctx.getImageData(0,0,width,height).data),
  points,confidence:conf,relativeDepthSpread:result.relativeDepthSpread,
  inliers:result.ransacInliers,matches:result.featureMatches,
  effectiveWidth:result.width,effectiveHeight:result.height,
  surfaceModel:result.surfaceModel,metricDepth:false,
  calibrationAssumed:result.approximateCameraCalibration,
  elapsedMs:result.elapsedMs,physical3DRelative:true};
}
