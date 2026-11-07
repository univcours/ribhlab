/**
 * Optional on-device portrait cutout for ID photo sheets.
 * BodyPix MobileNet model weights download on first use. The original portrait
 * is never uploaded, and the user may choose to keep its actual background.
 * Hair/veil edges and clothing can require manual review.
 */
let modelPromise;
export async function segmentPortrait(image,{onProgress=()=>{},maxSide=1280}={}){
 if(!image?.naturalWidth||!image?.naturalHeight)throw Error('Choose a portrait first');
 if(maxSide<320||maxSide>2200)throw Error('Invalid segmentation size');
 onProgress('Loading on-device person segmentation model (first use needs internet)…');
 if(!modelPromise)modelPromise=(async()=>{
  const tf=await import('@tensorflow/tfjs');await tf.ready();
  const module=await import('@tensorflow-models/body-pix');
  const bodypix=module.default?.load?module.default:module;
  return bodypix.load({architecture:'MobileNetV1',outputStride:16,multiplier:0.5,quantBytes:2});
 })().catch(e=>{modelPromise=null;throw e});
 const net=await modelPromise;
 const scale=Math.min(1,maxSide/Math.max(image.naturalWidth,image.naturalHeight));
 const width=Math.max(1,Math.round(image.naturalWidth*scale));
 const height=Math.max(1,Math.round(image.naturalHeight*scale));
 const photo=document.createElement('canvas');photo.width=width;photo.height=height;
 const context=photo.getContext('2d',{willReadFrequently:true});
 context.drawImage(image,0,0,width,height);
 onProgress('Separating the portrait locally…');
 const result=await net.segmentPerson(photo,{flipHorizontal:false,internalResolution:'high',segmentationThreshold:.66});
 if(result.width!==width||result.height!==height||!result.data||result.data.length!==width*height)
   throw Error('Person mask was not aligned with portrait');
 let personCount=0;
 const mask=document.createElement('canvas');mask.width=width;mask.height=height;
 const maskCtx=mask.getContext('2d');const img=maskCtx.createImageData(width,height);
 for(let i=0;i<result.data.length;i++){
  const a=result.data[i]?255:0;
  if(a)personCount++;
  img.data[i*4]=255;img.data[i*4+1]=255;img.data[i*4+2]=255;img.data[i*4+3]=a;
 }
 if(personCount<width*height*.025)throw Error('No clear person detected');
 maskCtx.putImageData(img,0,0);
 // Soft antialiased boundary, avoiding hard-cut hair edges.
 const cutout=document.createElement('canvas');cutout.width=width;cutout.height=height;
 const out=cutout.getContext('2d');out.drawImage(photo,0,0);
 out.globalCompositeOperation='destination-in';
 out.filter='blur(1.2px)';out.drawImage(mask,0,0);out.filter='none';
 out.globalCompositeOperation='source-over';
 return cutout;
}
