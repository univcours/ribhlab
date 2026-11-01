import * as pdfjs from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
const {recognize}=Tesseract;

export async function createEditableTextPresentation(pages,{progress=()=>{}}={}){
 if(!Array.isArray(pages)||pages.length<1||pages.length>25)throw Error('Choose 1–25 pages');
 const {default:PptxGen}=await import('pptxgenjs');
 const pres=new PptxGen();pres.layout='LAYOUT_WIDE';
 pres.author='RivoScan';pres.subject='Editable text recovered from document';
 pres.title='RivoScan extracted editable slides';
 for(let i=0;i<pages.length;i++){
  progress('Editable slide '+(i+1)+'/'+pages.length);
  const page=pages[i];if(!page||!Array.isArray(page.items))throw Error('Invalid slide text');
  const slide=pres.addSlide();slide.background={color:'FFFFFF'};
  const pageWidth=Math.max(1,Number(page.width)||1000),pageHeight=Math.max(1,Number(page.height)||700);
  const scale=Math.min(12.65/pageWidth,6.55/pageHeight);
  const x0=(13.333-pageWidth*scale)/2,y0=(7.5-pageHeight*scale)/2;
  let fallback=0;
  for(const block of page.items.slice(0,380)){
   const str=String(block.text||'').trim().slice(0,800);
   if(!str)continue;
   const px=Number(block.x),py=Number(block.y),width=Number(block.width),height=Number(block.height);
   const coords=Number.isFinite(px)&&Number.isFinite(py);
   const actualH=Math.max(8,Number.isFinite(height)?height:16);
   const x=coords?Math.max(.1,Math.min(12.4,x0+px*scale)):.5;
   const y=coords?Math.max(.1,Math.min(7.05,y0+(pageHeight-py-actualH)*scale)):.45+fallback++*.31;
   if(y>7.05)continue;
   const w=Math.max(.35,Math.min(13.1-x,coords?Math.max(width,30)*scale+.16:12.15));
   const h=Math.max(.18,Math.min(7.4-y,actualH*scale+.18));
   const fontSize=Math.max(8,Math.min(28,actualH*scale*60));
   slide.addText(str,{
    x,y,w,h,margin:0,fontFace:'Arial',fontSize,color:'20325C',
    valign:'mid',breakLine:false,fit:'shrink',isTextBox:true,
    bold:Boolean(block.bold),
   });
  }
  // Do not manufacture images/tables. Document graphics/layout may differ.
  if(!page.items.some(item=>String(item.text||'').trim())){
   slide.addText('No readable text was detected on this page.',{
    x:.65,y:3.4,w:12,h:.5,fontSize:17,color:'76849C'
   });
  }
 }
 const bytes=await pres.write({outputType:'arraybuffer',compression:true});
 return new Uint8Array(bytes);
}
export async function editableSlidesFromFile(file,language='eng',progress=()=>{}){
 const isPDF=file.type==='application/pdf'||/\.pdf$/i.test(file.name);
 const pages=[];
 if(isPDF){
  const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),useSystemFonts:true}).promise;
  try{
   if(pdf.numPages>25)throw Error('Maximum 25 editable slides');
   for(let n=1;n<=pdf.numPages;n++){
    progress('Extracting slide '+n+'/'+pdf.numPages);
    const page=await pdf.getPage(n);
    const view=page.getViewport({scale:1});
    const text=(await page.getTextContent()).items.filter(v=>typeof v.str==='string'&&v.str.trim());
    if(text.length){
     pages.push({width:view.width,height:view.height,
      items:text.map(it=>({
       text:it.str,x:it.transform?.[4]??0,y:it.transform?.[5]??0,
       width:it.width||40,height:Math.abs(it.height)||12
      }))});
    }else{
     const scale=Math.min(1.8,1700/Math.max(view.width,view.height));
     const viewport=page.getViewport({scale});
     const canvas=document.createElement('canvas');
     canvas.width=Math.max(1,Math.round(viewport.width));canvas.height=Math.max(1,Math.round(viewport.height));
     await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
     const text=(await recognize(canvas,language)).data.text||'';
     pages.push({width:1000,height:750,items:text.split(/\r?\n/).filter(Boolean)
      .map((line,i)=>({text:line,x:35,y:720-i*40,width:920,height:28}))});
    }
    page.cleanup();
   }
  }finally{await pdf.destroy()}
 }else{
  const extracted=(await recognize(file,language)).data.text||'';
  pages.push({width:1000,height:750,items:extracted.split(/\r?\n/).filter(Boolean)
   .map((text,i)=>({text,x:35,y:720-i*40,width:920,height:28}))});
 }
 return createEditableTextPresentation(pages,{progress});
}
