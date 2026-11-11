/** Google-managed camera, editable crop review, cleaning, native PDF creation. */
export function mlkitFullOptions(mode='Document',pageLimit=null){
  const idCard=mode==='ID Card';
  const count=Number.isSafeInteger(pageLimit)&&pageLimit>=1?Math.min(50,pageLimit):(idCard?2:20);
  return {galleryImportAllowed:true,pageLimit:count,resultFormats:idCard?'JPEG_PDF':'PDF',scannerMode:'FULL'};
}
/** Keep the exact Google PDF bytes; native importer streams to MediaStore. */
export async function persistMlKitPdf(result,{importPdf,now=()=>Date.now()}={}){
  const uri=result?.pdf?.uri;
  if(typeof uri!=='string'||!(/^(content:\/\/|file:\/\/)/i.test(uri)))
    throw new Error('Google scanner did not return a usable PDF URI.');
  if(typeof importPdf!=='function')throw new Error('Native PDF storage is unavailable.');
  const name='RivoScan_Scan_'+now()+'.pdf';
  const saved=await importPdf({uri,name});
  if(!saved?.uri)throw new Error('Google scan PDF was not persisted.');
  return {uri:saved.uri,name:saved.name||name,pageCount:result.pdf.pageCount||1};
}
