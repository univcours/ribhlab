import JSZip from 'jszip';
import {createOCRWorkbook} from './xlsx-export.js';
import {editableSlidesFromFile} from './editable-pptx.js';
import {recognize} from 'tesseract.js';
import * as pdfjs from 'pdfjs-dist';
import {makeLongImage,makeWordText} from './share-exports.js';

export async function exportToolFile({file,format,language='en',save,progress=()=>{}}){
 if(!file)throw Error('Select a file first');
 if(file.size>16*1024*1024)throw Error('Conversion limit: 16 MB per file');
 const isPdf=/\.pdf$/i.test(file.name)||file.type==='application/pdf';
 const doc={name:file.name,mimeType:file.type|| (isPdf?'application/pdf':'image/jpeg'),size:file.size};
 const load=async()=>file;
 const date=Date.now();
 const ocrLang=({en:'eng',fr:'fra',ar:'ara',es:'spa',de:'deu',pt:'por',it:'ita'})[language]||'eng';
 if(format==='word'){
  const bytes=await makeWordText([doc],load,()=>isPdf,(i,n)=>progress(`OCR ${i}/${n}`),ocrLang);
  await save(bytes,'RivoScan_Text_'+date+'.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  return;
 }
 if(format==='long'){
  const bytes=await makeLongImage([doc],'balanced',load,()=>isPdf,i=>progress('Page '+i));
  await save(bytes,'RivoScan_Long_'+date+'.jpg','image/jpeg');
  return;
 }
 if(format==='csv'||format==='xlsx'){
  const rows=[];
  if(isPdf){
   const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),useSystemFonts:true}).promise;
   try{
    if(pdf.numPages>25)throw Error('Maximum 25 PDF pages');
    for(let i=1;i<=pdf.numPages;i++){
     progress(`Page ${i}/${pdf.numPages}`);
     const page=await pdf.getPage(i),items=(await page.getTextContent()).items;
     const sorted=items.filter(it=>String(it.str||'').trim()).map(it=>({str:String(it.str).trim(),x:it.transform?.[4]??0,y:it.transform?.[5]??0}))
        .sort((a,b)=>b.y-a.y||a.x-b.x);
     let current=[],position=null;
     for(const item of sorted){
      if(position!==null&&Math.abs(position-item.y)>5){rows.push(current);current=[]}
      current.push(item.str);position=item.y;
     }
     if(current.length)rows.push(current);
     if(!sorted.length){
      const viewport=page.getViewport({scale:1.4}),canvas=document.createElement('canvas');
      canvas.width=Math.round(viewport.width);canvas.height=Math.round(viewport.height);
      await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
      const result=(await recognize(canvas,ocrLang)).data.text;
      rows.push(...result.split(/\r?\n/).filter(Boolean).map(line=>line.split(/\t|\s{2,}/)));
     }
     page.cleanup();
    }
   }finally{await pdf.destroy()}
  }else{
   const result=(await recognize(file,ocrLang)).data.text;
   rows.push(...result.split(/\r?\n/).filter(Boolean).map(line=>line.split(/\t|\s{2,}/)));
  }
  if(!rows.length)throw Error('No extractable text found');
  if(format==='xlsx'){
   const workbook=await createOCRWorkbook(rows);
   await save(workbook,'RivoScan_Excel_Extract_'+date+'.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
   return;
  }
  const csv='\ufeff'+rows.map(row=>row.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(',')).join('\r\n');
  await save(new TextEncoder().encode(csv),'RivoScan_Excel_Extract_'+date+'.csv','text/csv');
  return;
 }
 if(format==='editablePptx'){
  const bytes=await editableSlidesFromFile(file,ocrLang,progress);
  await save(bytes,'RivoScan_Editable_Text_Slides_'+date+'.pptx',
   'application/vnd.openxmlformats-officedocument.presentationml.presentation');
  return;
 }
 if(format==='pptx'){
  // Create an image-backed PPTX: each page is a slide. Text is not editable.
  const slideImgs=[];
  const add=async canvas=>{
   if(slideImgs.length>=30)throw Error('Maximum 30 slides');
   const blob=await new Promise((ok,bad)=>canvas.toBlob(b=>b?ok(b):bad(Error('Cannot render slide')),'image/jpeg',.85));
   slideImgs.push(new Uint8Array(await blob.arrayBuffer()));
  };
  if(isPdf){
   const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),useSystemFonts:true}).promise;
   try{
    if(pdf.numPages>30)throw Error('Maximum 30 slides');
    for(let i=1;i<=pdf.numPages;i++){
     progress(`Slide ${i}/${pdf.numPages}`);
     const p=await pdf.getPage(i),original=p.getViewport({scale:1});
     const vp=p.getViewport({scale:Math.min(1.5,1600/Math.max(original.width,original.height))});
     const c=document.createElement('canvas');c.width=Math.max(1,Math.round(vp.width));c.height=Math.max(1,Math.round(vp.height));
     const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);
     await p.render({canvasContext:ctx,viewport:vp}).promise;await add(c);p.cleanup();
    }
   }finally{await pdf.destroy()}
  }else{
   const blobUrl=URL.createObjectURL(file);
   try{
    const image=await new Promise((ok,bad)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=bad;i.src=blobUrl});
    const scale=Math.min(1,1800/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas=document.createElement('canvas');canvas.width=Math.round(image.naturalWidth*scale);canvas.height=Math.round(image.naturalHeight*scale);
    canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);await add(canvas);
   }finally{URL.revokeObjectURL(blobUrl)}
  }
  if(!slideImgs.length)throw Error('No slides to export');
  const zip=new JSZip(),sids=slideImgs.map((_,i)=>`<p:sldId id="${256+i}" r:id="rId${i+1}"/>`).join('');
  zip.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpg" ContentType="image/jpeg"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>'+slideImgs.map((_,i)=>`<Override PartName="/ppt/slides/slide${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('')+'</Types>');
  zip.folder('_rels').file('.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>');
  zip.folder('ppt').file('presentation.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst>'+sids+'</p:sldIdLst><p:sldSz cx="9144000" cy="5143500" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>');
  zip.folder('ppt').folder('_rels').file('presentation.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+slideImgs.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i+1}.xml"/>`).join('')+'</Relationships>');
  const slideDir=zip.folder('ppt').folder('slides'),rels=slideDir.folder('_rels'),media=zip.folder('ppt').folder('media');
  for(let i=0;i<slideImgs.length;i++){
   media.file('slide'+(i+1)+'.jpg',slideImgs[i]);
   const pic=`<p:pic><p:nvPicPr><p:cNvPr id="2" name="Document page ${i+1}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="9144000" cy="5143500"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;
   slideDir.file('slide'+(i+1)+'.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>'+pic+'</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>');
   rels.file('slide'+(i+1)+'.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/slide'+(i+1)+'.jpg"/></Relationships>');
  }
  await save(new Uint8Array(await zip.generateAsync({type:'arraybuffer',compression:'DEFLATE'})),'RivoScan_Slides_'+date+'.pptx','application/vnd.openxmlformats-officedocument.presentationml.presentation');
  return;
 }
 throw Error('Unsupported output format');
}
