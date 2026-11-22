import {Capacitor} from '@capacitor/core';
import {Filesystem,Directory} from '@capacitor/filesystem';
import {BarcodeScanner} from '@capacitor-mlkit/barcode-scanning';
import {TextRecognition,Script} from '@capacitor-mlkit/text-recognition';

/** Google ML Kit processing is native-only; browser builds keep existing fallbacks. */
export const mlkitReady=plugin=>Capacitor.isNativePlatform()
  &&Capacitor.getPlatform()==='android'&&Capacitor.isPluginAvailable(plugin);

let tempCounter=0;
export async function withMlkitImage(file,processor){
  if(!(file instanceof Blob))throw Error('A photo Blob is required for native ML Kit.');
  if(file.size>16*1024*1024)throw Error('Photo exceeds the 16 MB ML Kit processing limit.');
  if(typeof processor!=='function')throw Error('Image processor is missing.');
  // Android plugins require a local file URI, not a web object URL.
  const bytes=new Uint8Array(await file.arrayBuffer());
  let binary='';
  for(let i=0;i<bytes.length;i+=32768)
    binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
  const path='RivoScanMlKit/vision_'+Date.now()+'_'+(++tempCounter)+'.jpg';
  const stored=await Filesystem.writeFile({
    directory:Directory.Cache,path,data:btoa(binary),recursive:true
  });
  try{return await processor(stored.uri)}
  finally{
    try{await Filesystem.deleteFile({directory:Directory.Cache,path})}
    catch(error){console.warn('Temporary ML Kit photo cleanup:',error)}
  }
}

/** Returns null if the native SDK is unavailable, for explicit web fallback. */
export async function readMlkitBarcodes(photo){
  if(!mlkitReady('BarcodeScanner'))return null;
  return withMlkitImage(photo,async path=>{
    const result=await BarcodeScanner.readBarcodesFromImage({path});
    return Array.isArray(result?.barcodes)?result.barcodes:[];
  });
}

/** Arabic is not supported by ML Kit v2 OCR: retain Tesseract for Arabic. */
export async function recognizeMlkitLatin(photo,{language='en'}={}){
  if(language==='ar'||!mlkitReady('TextRecognition'))return null;
  return withMlkitImage(photo,async path=>{
    const result=await TextRecognition.processImage({path,script:Script.Latin});
    return String(result?.text||'');
  });
}
