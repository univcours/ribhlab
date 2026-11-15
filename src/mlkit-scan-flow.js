import {createRsFileNamer} from './rs-file-names.js';
/** Google-managed camera, editable crop review, cleaning, native PDF creation. */
/** Auto-save uses the selected scanner preference, without a second review screen. */
export function mlkitAutoCleanMode(prefs={}){
  if(prefs?.autoClean===false || prefs?.enhancement==='original')return 'original';
  return prefs?.enhancement==='bw'?'bw':'clean';
}

export function mlkitFullOptions(mode='Document',pageLimit=null){
  const idCard=mode==='ID Card';
  const count=Number.isSafeInteger(pageLimit)&&pageLimit>=1?Math.min(50,pageLimit):(idCard?2:20);
  return {galleryImportAllowed:true,pageLimit:count,resultFormats:'JPEG_PDF',scannerMode:'FULL'};
}
/** Native importer uses JPEGs only for an optional offline PerfectClean pass.
 * Only one PDF becomes public. If cleanup fails, Google PDF stays intact. */
export async function persistMlKitPdf(result,{importPdf,now=()=>Date.now(),perfectClean=false,cleanMode='clean',reviewEdits=[]}={}){
  const uri=result?.pdf?.uri;
  if(typeof uri!=='string'||!(/^(content:\/\/|file:\/\/)/i.test(uri)))
    throw new Error('Google scanner did not return a usable PDF URI.');
  if(typeof importPdf!=='function')throw new Error('Native PDF storage is unavailable.');
  const name=createRsFileNamer({clock:()=>new Date(now())})('RivoScan_Scan.pdf','application/pdf');
  const request={uri,name};
  const scannedImages=result?.scannedImages;
  const mode=['clean','bw','original'].includes(cleanMode)?cleanMode:'clean';
  const edits=Array.isArray(reviewEdits)&&reviewEdits.length===scannedImages?.length?reviewEdits:[];
  const touched=edits.some(x=>Array.isArray(x)&&x.length===8);
  if((perfectClean||touched)&&Array.isArray(scannedImages)&&scannedImages.length>0){
    request.perfectClean=Boolean(perfectClean);
    request.cleanMode=mode;
    request.reviewEdits=edits;
    request.scannedImages=scannedImages;
  }
  // First-run Google Play Services / MediaStore may expose the source URI a
  // fraction of a second after returning the scanner result. A failed native
  // import deletes its incomplete target, so a bounded retry is safe. Never
  // retry a successfully persisted URI (that would create a duplicate file).
  let saved;
  const retryable=error=>/(?:not found|no such file|ENOENT|temporar|not ready|open.*(?:pdf|file|document)|unable to read|could not read|unavailable|Scanner returned no PDF data)/i
    .test(String(error?.message||error||''));
  for(let attempt=0;attempt<3;attempt++){
   try{
    saved=await importPdf(request);
    break;
   }catch(error){
    if(attempt===2||!retryable(error))throw error;
    await new Promise(resolve=>setTimeout(resolve,attempt===0?180:480));
   }
  }
  if(!saved?.uri)throw new Error('Google scan PDF was not persisted.');
  return {uri:saved.uri,name:saved.name||name,pageCount:result.pdf.pageCount||1,
   perfectCleanApplied:!!saved.perfectCleanApplied};
}
