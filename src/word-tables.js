import JSZip from 'jszip';
import Tesseract from 'tesseract.js';
import {reconstructPositionedTable} from './table-reconstruct.js';
const {recognize}=Tesseract;
const esc=str=>String(str??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
 .replace(/"/g,'&quot;').replace(/'/g,'&apos;')
 .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'');
const paragraph=(text)=>'<w:p><w:r><w:t xml:space="preserve">'+esc(text)+'</w:t></w:r></w:p>';
export function wordTableXML(rows){
 if(!rows.length)return paragraph('');
 const n=Math.max(1,...rows.map(r=>r.length));
 if(n>32)throw Error('Too many columns for Word');
 if(n<2)return rows.map(r=>paragraph(r.join(' '))).join('');
 const width=Math.floor(9640/n);
 const grid='<w:tblGrid>'+Array.from({length:n},()=>'<w:gridCol w:w="'+width+'"/>').join('')+'</w:tblGrid>';
 const body=rows.map(row=>'<w:tr>'+Array.from({length:n},(_,i)=>
  '<w:tc><w:tcPr><w:tcW w:w="'+width+'" w:type="dxa"/></w:tcPr>'+paragraph(row[i]||'')+'</w:tc>'
 ).join('')+'</w:tr>').join('');
 return '<w:tbl><w:tblPr><w:tblW w:w="9640" w:type="dxa"/><w:tblBorders>'+
  '<w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/>'+
  '<w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/>'+
  '<w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/>'+
  '</w:tblBorders></w:tblPr>'+grid+body+'</w:tbl>';
}
export async function createEditableWordTables(pages){
 if(!Array.isArray(pages)||!pages.length||pages.length>25)throw Error('Choose 1–25 pages');
 const blocks=[];
 for(const [i,page] of pages.entries()){
  if(i)blocks.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
  const rows=page.rows||reconstructPositionedTable(page.items||[]);
  if(rows.length>10000)throw Error('Too many Word rows');
  blocks.push(wordTableXML(rows));
 }
 const document='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
  '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+
  blocks.join('')+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>'+
  '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>';
 const zip=new JSZip();
 zip.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
  '<Default Extension="xml" ContentType="application/xml"/>'+
  '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'+
  '</Types>');
 zip.folder('_rels').file('.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'+
  '</Relationships>');
 zip.folder('word').file('document.xml',document);
 return new Uint8Array(await zip.generateAsync({type:'arraybuffer',compression:'DEFLATE'}));
}
export async function wordTablesFromFile(file,ocrLang='eng',progress=()=>{}){
 if(!file||file.size>16*1024*1024)throw Error('Word file limit: 16 MB');
 const isPDF=file.type==='application/pdf'||/\.pdf$/i.test(file.name);
 const pages=[];
 if(isPDF){
  const pdfjs=await import('pdfjs-dist');
  const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),useSystemFonts:true}).promise;
  try{
   if(pdf.numPages>25)throw Error('Maximum 25 pages');
   for(let n=1;n<=pdf.numPages;n++){
    progress('Word table page '+n+'/'+pdf.numPages);
    const page=await pdf.getPage(n),items=(await page.getTextContent()).items;
    const positioned=items.filter(it=>String(it.str||'').trim())
      .map(it=>({str:it.str,x:it.transform?.[4]??0,y:it.transform?.[5]??0}));
    if(positioned.length)pages.push({items:positioned});
    else{
     const base=page.getViewport({scale:1});
     const vp=page.getViewport({scale:Math.min(1.6,1600/Math.max(base.width,base.height))});
     const canvas=document.createElement('canvas');
     canvas.width=Math.round(vp.width);canvas.height=Math.round(vp.height);
     await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
     const extracted=(await recognize(canvas,ocrLang)).data.text||'';
     pages.push({rows:extracted.split(/\r?\n/).filter(Boolean).map(t=>[t])});
    }
    page.cleanup();
   }
  }finally{await pdf.destroy()}
 }else{
  const extracted=(await recognize(file,ocrLang)).data.text||'';
  pages.push({rows:extracted.split(/\r?\n/).filter(Boolean).map(t=>[t])});
 }
 return createEditableWordTables(pages);
}
