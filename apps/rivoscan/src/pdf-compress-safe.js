import {PDFDocument} from 'pdf-lib';
/** Keep PDF objects/searchable text rather than silently flattening every page. */
export async function compressPdfPreservingContent(input,{requireSmaller=true}={}){
 const source=input instanceof Uint8Array?input:new Uint8Array(input);
 if(!source.length)throw Error('Choose a nonempty PDF.');
 if(source.length>30*1024*1024)throw Error('Safe PDF compression limit: 30 MB.');
 const doc=await PDFDocument.load(source,{updateMetadata:false});
 if(doc.getPageCount()<1||doc.getPageCount()>70)throw Error('Compress 1–70 PDF pages at a time.');
 const output=await doc.save({useObjectStreams:true});
 if(requireSmaller&&output.length>=source.length)
  throw Error('No smaller searchable PDF could be produced. Original unchanged. To compress image scans, select the image-only mode explicitly.');
 return output;
}
