import JSZip from 'jszip';
import { recognize } from 'tesseract.js';
import * as pdfjs from 'pdfjs-dist';

/** Document exports remain entirely on the device. No remote conversion service. */
const maxPages=30,maxPixels=26000000,maxLongHeight=16000;
const xmlEscape=value=>String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
const qscale=q=>q==='original'?1.6:q==='balanced'?1.15:0.8;
const qrate=q=>q==='original'?0.94:q==='balanced'?0.78:0.56;
async function photoCanvas(file,maxSide){
 const url=URL.createObjectURL(file);
 try{
  const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('Could not read image'));i.src=url;});
  const ratio=Math.min(1,maxSide/Math.max(img.naturalWidth,img.naturalHeight));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));
  canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));
  const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
  context.drawImage(img,0,0,canvas.width,canvas.height);
  return canvas;
 }finally{URL.revokeObjectURL(url);}
}
async function eachPage(file,q,isPdf,callback){
 if(!isPdf){await callback(await photoCanvas(file,2000));return 1;}
 const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),useSystemFonts:true}).promise;
 try{
  if(pdf.numPages>maxPages)throw new Error('Too many pages for this export (maximum 30).');
  for(let i=1;i<=pdf.numPages;i++){
   const page=await pdf.getPage(i),original=page.getViewport({scale:1});
   const zoom=Math.min(qscale(q),2000/Math.max(original.width,original.height));
   const vp=page.getViewport({scale:zoom}),canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(vp.width));canvas.height=Math.max(1,Math.round(vp.height));
   const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
   await page.render({canvasContext:context,viewport:vp}).promise;
   await callback(canvas,i);
   page.cleanup();
  }
  return pdf.numPages;
 }finally{await pdf.destroy();}
}
const asBlob=(canvas,q)=>new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not export image')),'image/jpeg',qrate(q)));

/** Stitch bounded page previews into one JPEG; large sets are refused rather than silently cropped. */
export async function makeLongImage(docs,q,getFile,isPDF,notify=()=>{}){
 const pages=[];
 for(const doc of docs){
  const f=await getFile(doc);
  await eachPage(f,q,isPDF(doc),async canvas=>{
   if(pages.length>=12)throw new Error('Long image supports up to 12 pages; use PDF for larger sets.');
   pages.push(canvas);notify(pages.length);
  });
 }
 if(!pages.length)throw new Error('No image pages found.');
 const width=q==='small'?720:q==='balanced'?900:1100,margin=18,gap=14;
 const heights=pages.map(c=>Math.max(1,Math.round(width*c.height/c.width)));
 const total=heights.reduce((a,b)=>a+b,0)+margin*2+gap*(pages.length-1);
 if(total>maxLongHeight||width*total>maxPixels)throw new Error('Long image is too tall. Share fewer pages or choose smaller quality.');
 const output=document.createElement('canvas');output.width=width;output.height=total;
 const context=output.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,width,total);
 let y=margin;pages.forEach((canvas,i)=>{context.drawImage(canvas,0,y,width,heights[i]);y+=heights[i]+gap;});
 return new Uint8Array(await (await asBlob(output,q)).arrayBuffer());
}

/** Text-only editable DOCX. Explains that layout and tables are not retained. */
export async function makeWordText(docs,getFile,isPDF,notify=()=>{},lang='eng'){
 const all=[];
 for(let fileIndex=0;fileIndex<docs.length;fileIndex++){
  const doc=docs[fileIndex],file=await getFile(doc);
  all.push(doc.name||'Document');
  if(isPDF(doc)){
   const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),useSystemFonts:true}).promise;
   try{
    if(pdf.numPages>20)throw new Error('Word text extraction supports up to 20 pages per PDF.');
    for(let i=1;i<=pdf.numPages;i++){
     notify(i,pdf.numPages);
     const page=await pdf.getPage(i);
     const content=await page.getTextContent();
     let text=content.items.map(x=>x.str||'').join(' ').trim();
     if(text.length<25){
      const view=page.getViewport({scale:Math.min(1.7,1500/Math.max(page.getViewport({scale:1}).width,page.getViewport({scale:1}).height))});
      const canvas=document.createElement('canvas');canvas.width=Math.round(view.width);canvas.height=Math.round(view.height);
      await page.render({canvasContext:canvas.getContext('2d'),viewport:view}).promise;
      text=(await recognize(canvas,lang)).data.text||'';
     }
     all.push(text||'[No recognized text]');
     page.cleanup();
    }
   }finally{await pdf.destroy();}
  }else{
   notify(1,1);
   const result=await recognize(await photoCanvas(file,1700),lang);
   all.push(result.data.text||'[No recognized text]');
  }
 }
 const paragraphs=all.join('\n\n').split(/\r?\n/).map(line=>'<w:p><w:r><w:t xml:space="preserve">'+xmlEscape(line)+'</w:t></w:r></w:p>').join('');
 const zip=new JSZip();
 zip.file('[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
 zip.folder('_rels').file('.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
 zip.folder('word').file('document.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`);
 return new Uint8Array(await zip.generateAsync({type:'arraybuffer',compression:'DEFLATE'}));
}
