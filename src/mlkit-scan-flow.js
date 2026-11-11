/** Google-managed camera, editable crop review, cleaning, native PDF creation. */
export function mlkitFullOptions(mode='Document',pageLimit=null){
  const idCard=mode==='ID Card';
  const count=Number.isSafeInteger(pageLimit)&&pageLimit>=1?Math.min(50,pageLimit):(idCard?2:20);
  return {galleryImportAllowed:true,pageLimit:count,resultFormats:'JPEG_PDF',scannerMode:'FULL'};
}
/** Native importer uses JPEGs only for an optional offline PerfectClean pass.
 * Only one PDF becomes public. If cleanup fails, Google PDF stays intact. */
export async function persistMlKitPdf(result,{importPdf,now=()=>Date.now(),perfectClean=false}={}){
  const uri=result?.pdf?.uri;
  if(typeof uri!=='string'||!(/^(content:\/\/|file:\/\/)/i.test(uri)))
    throw new Error('Google scanner did not return a usable PDF URI.');
  if(typeof importPdf!=='function')throw new Error('Native PDF storage is unavailable.');
  const name='RivoScan_Scan_'+now()+'.pdf';
  const request={uri,name};
  const scannedImages=result?.scannedImages;
  if(perfectClean&&Array.isArray(scannedImages)&&scannedImages.length>0){
    request.perfectClean=true;
    request.scannedImages=scannedImages;
  }
  const saved=await importPdf(request);
  if(!saved?.uri)throw new Error('Google scan PDF was not persisted.');
  return {uri:saved.uri,name:saved.name||name,pageCount:result.pdf.pageCount||1,
   perfectCleanApplied:!!saved.perfectCleanApplied};
}
