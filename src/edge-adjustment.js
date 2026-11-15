/** Four-corner document readjustment for saved local images and scanned PDFs.
 * Uses the original file as a read-only source; creates a NEW copy on Save.
 * PDFs retain all untouched pages; only the chosen page is raster-replaced.
 */
export function edgeAdjustableDocument(doc){
 const mime=String(doc?.mimeType||'').toLowerCase(),name=String(doc?.name||'').toLowerCase();
 return /^image\/(jpeg|png|webp)$/.test(mime)||/\.(jpe?g|png|webp)$/.test(name)
  ||mime==='application/pdf'||name.endsWith('.pdf');
}
export function validEdgeQuadrilateral(points){
 if(!Array.isArray(points)||points.length!==4)return false;
 if(points.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v)||v<0||v>1)))return false;
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);
 const cs=points.map((_,i)=>cross(points[i],points[(i+1)%4],points[(i+2)%4]));
 const area=Math.abs(points.reduce((total,p,i)=>total+p[0]*points[(i+1)%4][1]-points[(i+1)%4][0]*p[1],0))/2;
 return area>0.025&&cs.every(x=>x>0.004)||area>0.025&&cs.every(x=>x< -0.004);
}
export function projectiveSquareToQuad(points){
 if(!validEdgeQuadrilateral(points))throw Error('Invalid or crossed document corners.');
 const [p0,p1,p2,p3]=points;
 const dx1=p1[0]-p2[0],dx2=p3[0]-p2[0],dx3=p0[0]-p1[0]+p2[0]-p3[0];
 const dy1=p1[1]-p2[1],dy2=p3[1]-p2[1],dy3=p0[1]-p1[1]+p2[1]-p3[1];
 const determinant=dx1*dy2-dx2*dy1;
 let g=0,h=0;
 if(Math.abs(dx3)+Math.abs(dy3)>1e-8){
  if(Math.abs(determin)<1e-9)throw Error('Invalid perspective geometry.');
  g=(dx3*dy2-dx2*dy3)/determinant;
  h=(dx1*dy3-dx3*dy1)/determinant;
 }
 const a=p1[0]-p0[0]+g*p1[0],b=p3[0]-p0[0]+h*p3[0],c=p0[0];
 const d=p1[1]-p0[1]+g*p1[1],e=p3[1]-p0[1]+h*p3[1],f=p0[1];
 return (u,v)=>{
  const den=g*u+h*v+1;
  if(Math.abs(den)<1e-9)throw Error('Perspective geometry is singular.');
  return [(a*u+b*v+c)/den,(d*u+e*v+f)/den];
 };
}
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const distance=(a,b,w,h)=>Math.hypot((a[0]-b[0])*w,(a[1]-b[1])*h);
function correctedDimensions(points,w,h){
 const outW=(distance(points[0],points[1],w,h)+distance(points[3],points[2],w,h))/2;
 const outH=(distance(points[0],points[3],w,h)+distance(points[1],points[2],w,h))/2;
 const ratio=Math.min(1,2200/Math.max(1,outW),2800/Math.max(1,outH),Math.sqrt(6000000/(Math.max(1,outW*outH))));
 return [Math.max(120,Math.round(outW*ratio)),Math.max(120,Math.round(outH*ratio))];
}
export function perspectiveCropImageData(imageData,points,{maxPixels=6000000}={}){
 const {width:w,height:h,data}=imageData;
 if(!w||!h||!data||data.length<w*h*4)throw Error('Source image is unavailable.');
 if(!validEdgeQuadrilateral(points))throw Error('Document corners must not cross.');
 const [ow,oh]=correctedDimensions(points,w,h);
 if(ow*oh>maxPixels)throw Error('The corrected image is too large.');
 const map=projectiveSquareToQuad(points);
 const output=new Uint8ClampedArray(ow*oh*4);
 for(let y=0;y<oh;y++){
  const v=(y+.5)/oh;
  for(let x=0;x<ow;x++){
   const u=(x+.5)/ow,[nx,ny]=map(u,v);
   const sx=clamp(nx*(w-1),0,w-1),sy=clamp(ny*(h-1),0,h-1);
   const ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy;
   const i00=(iy*w+ix)*4,i10=(iy*w+Math.min(w-1,ix+1))*4;
   const i01=(Math.min(h-1,iy+1)*w+ix)*4;
   const i11=(Math.min(h-1,iy+1)*w+Math.min(w-1,ix+1))*4;
   const out=(y*ow+x)*4;
   for(let ch=0;ch<3;ch++){
    output[out+ch]=(data[i00+ch]*(1-fx)+data[i10+ch]*fx)*(1-fy)
       +(data[i01+ch]*(1-fx)+data[i11+ch]*fx)*fy;
   }
   output[out+3]=255;
  }
 }
 return {width:ow,height:oh,data:output};
}
const LABELS={
 en:{title:'Readjust document edges',info:'Drag the four corners onto the document boundaries.',page:'PDF page',save:'Save corrected copy',cancel:'Cancel',reset:'Reset corners',busy:'Correcting perspective…',original:'Original file is preserved. Only the selected PDF page is replaced in the new copy.',bad:'Check that the four corners do not cross.',failed:'Unable to adjust document edges',pageSelect:'Select the PDF page to correct'},
 ar:{title:'إعادة ضبط حواف المستند',info:'اسحب الزوايا الأربع إلى حدود المستند.',page:'صفحة PDF',save:'حفظ نسخة مصححة',cancel:'إلغاء',reset:'إعادة ضبط الزوايا',busy:'جارٍ تصحيح المنظور…',original:'يبقى الملف الأصلي محفوظًا. تُستبدل الصفحة المحددة فقط في نسخة PDF الجديدة.',bad:'تأكد من عدم تقاطع الزوايا الأربع.',failed:'تعذّر تعديل حواف المستند',pageSelect:'اختر صفحة PDF المراد تصحيحها'},
 fr:{title:'Ajuster les bords du document',info:'Déplacez les quatre coins sur les bords du document.',page:'Page PDF',save:'Enregistrer une copie corrigée',cancel:'Annuler',reset:'Réinitialiser',busy:'Correction de la perspective…',original:'Le fichier original est conservé. Seule la page PDF sélectionnée est remplacée dans la copie.',bad:'Les coins ne doivent pas se croiser.',failed:'Impossible de corriger les bords',pageSelect:'Choisir une page PDF'},
 es:{title:'Ajustar bordes del documento',info:'Arrastra las cuatro esquinas hasta los bordes.',page:'Página PDF',save:'Guardar copia corregida',cancel:'Cancelar',reset:'Restablecer esquinas',busy:'Corrigiendo perspectiva…',original:'El original se conserva. Solo se reemplaza la página seleccionada en la copia.',bad:'Las esquinas no deben cruzarse.',failed:'No se pudieron ajustar los bordes',pageSelect:'Seleccionar página PDF'},
 de:{title:'Dokumentränder korrigieren',info:'Ziehen Sie die vier Ecken an die Dokumentränder.',page:'PDF-Seite',save:'Korrigierte Kopie speichern',cancel:'Abbrechen',reset:'Ecken zurücksetzen',busy:'Perspektive korrigieren…',original:'Die Originaldatei bleibt erhalten. Nur die gewählte PDF-Seite wird in der Kopie ersetzt.',bad:'Die vier Ecken dürfen sich nicht kreuzen.',failed:'Dokumentränder konnten nicht korrigiert werden',pageSelect:'PDF-Seite wählen'},
 pt:{title:'Ajustar limites do documento',info:'Arraste os quatro cantos até aos limites.',page:'Página PDF',save:'Guardar cópia corrigida',cancel:'Cancelar',reset:'Repor cantos',busy:'A corrigir perspetiva…',original:'O original é preservado. Só a página selecionada é substituída na cópia.',bad:'Os cantos não podem cruzar-se.',failed:'Não foi possível ajustar os limites',pageSelect:'Escolher página PDF'},
 it:{title:'Regola i bordi del documento',info:'Trascina i quattro angoli sui bordi del documento.',page:'Pagina PDF',save:'Salva copia corretta',cancel:'Annulla',reset:'Ripristina angoli',busy:'Correzione prospettiva…',original:'L’originale resta invariato. Solo la pagina PDF selezionata viene sostituita nella copia.',bad:'Gli angoli non devono incrociarsi.',failed:'Impossibile regolare i bordi',pageSelect:'Seleziona pagina PDF'}
};
const initialCorners=()=>[[.055,.055],[.945,.055],[.945,.945],[.055,.945]];
function decodeBase64(value){
 const s=String(value||'').split(',').pop(),out=new Uint8Array(s.length*3/4+4);
 let pos=0;for(let i=0;i<s.length;i+=32768){
  const decoded=atob(s.slice(i,i+32768-(32768%4)));
  for(let k=0;k<decoded.length;k++)out[pos++]=decoded.charCodeAt(k);
 }
 return out.subarray(0,pos);
}
function htmlEsc(value){return String(value||'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
/** Interactive editor that never mutates the input document.
 * Callers provide PDF.js configured with its worker, pdf-lib, and saveOut.
 */
export async function openEdgeAdjustment({doc,bridge,language='en',pdfjs,PDFDocument,onSave,onDone=async()=>{},notify=()=>{}}){
 if(!edgeAdjustableDocument(doc))throw Error('Only images and PDF files support edge adjustment.');
 const tr=LABELS[language]||LABELS.en;
 let sourceBytes,sourcePdf=null,pdfPreview=null,pdfPage=1,image=null,closed=false,busy=false;
 let points=initialCorners(),drag=-1,previousFocus=document.activeElement;
 const overlay=document.createElement('div');overlay.className='rivo-edge-adjust-overlay';
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',tr.title);
 overlay.innerHTML='<div class="rivo-edge-adjust-panel"><header><strong>'+tr.title+'</strong><button type="button" data-edge="close" aria-label="'+tr.cancel+'">✕</button></header>'+
   '<p>'+tr.info+'</p><label class="rivo-edge-page" hidden>'+tr.page+' <select aria-label="'+tr.pageSelect+'"></select></label>'+
   '<div class="rivo-edge-canvas-wrap"><canvas class="rivo-edge-canvas" aria-label="'+tr.info+'"></canvas></div>'+
   '<small class="rivo-edge-notice">'+tr.original+'</small><div class="rivo-edge-status" role="status"></div>'+
   '<footer><button type="button" data-edge="reset">'+tr.reset+'</button><button type="button" data-edge="save">'+tr.save+'</button></footer></div>';
 const canvas=overlay.querySelector('canvas'),status=overlay.querySelector('.rivo-edge-status'),select=overlay.querySelector('select');
 const submit=overlay.querySelector('[data-edge="save"]');
 document.body.appendChild(overlay);
 overlay.querySelector('[data-edge="close"]').focus();
 const isPdf=String(doc.mimeType||'').toLowerCase()==='application/pdf'||/\.pdf$/i.test(doc.name||'');
 function close(){
  if(busy||closed)return;closed=true;overlay.remove();
  document.removeEventListener('keydown',onKeydown,true);
  try{sourcePdf?.destroy?.();}catch{}
  try{previousFocus?.focus?.()}catch{}
 }
 function onKeydown(e){if(e.key==='Escape'){e.stopPropagation();e.preventDefault();close();}}
 document.addEventListener('keydown',onKeydown,true);
 function setStatus(msg){status.textContent=msg;}
 function draw(){
  if(!image||closed)return;
  const cap=Math.min(1,1250/Math.max(image.width,image.height));
  canvas.width=Math.max(1,Math.round(image.width*cap));
  canvas.height=Math.max(1,Math.round(image.height*cap));
  const ctx=canvas.getContext('2d');
  ctx.drawImage(image,0,0,canvas.width,canvas.height);
  ctx.beginPath();
  points.forEach((p,i)=>{const x=p[0]*canvas.width,y=p[1]*canvas.height;if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y)});
  ctx.closePath();ctx.fillStyle='rgba(0,175,218,0.11)';ctx.fill();
  ctx.strokeStyle=validEdgeQuadrilateral(points)?'#06e1cb':'#f06565';ctx.lineWidth=Math.max(3,canvas.width/400);ctx.stroke();
  points.forEach((p,i)=>{
   const x=p[0]*canvas.width,y=p[1]*canvas.height,r=Math.max(10,canvas.width/90);
   ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();
   ctx.lineWidth=Math.max(2,canvas.width/550);ctx.strokeStyle='#00a5d9';ctx.stroke();
   ctx.fillStyle='#004563';ctx.font=Math.max(10,canvas.width/75)+'px sans-serif';
   ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(i+1),x,y);
  });
  submit.disabled=!validEdgeQuadrilateral(points);
  setStatus(submit.disabled?tr.bad:'');
 }
 function eventPoint(e){
  const box=canvas.getBoundingClientRect();
  return [clamp((e.clientX-box.left)/box.width,0,1),clamp((e.clientY-box.top)/box.height,0,1)];
 }
 canvas.addEventListener('pointerdown',e=>{
  if(busy||!image)return;
  const p=eventPoint(e),rect=canvas.getBoundingClientRect();
  const distances=points.map(q=>Math.hypot((q[0]-p[0])*rect.width,(q[1]-p[1])*rect.height));
  const min=Math.min(...distances);
  if(min>Math.max(42,rect.width*.13))return;
  drag=distances.indexOf(min);canvas.setPointerCapture(e.pointerId);e.preventDefault();
 });
 canvas.addEventListener('pointermove',e=>{
  if(drag<0||busy||!image)return;
  const p=eventPoint(e);points[drag]=[clamp(p[0],.005,.995),clamp(p[1],.005,.995)];draw();e.preventDefault();
 });
 for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{drag=-1});
 async function loadImage(bytes,mime){
  const objectUrl=URL.createObjectURL(new Blob([bytes],{type:mime}));
  try{
   const img=new Image();img.src=objectUrl;await img.decode();
   const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
   const ctx=c.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0);
   return c;
  }finally{URL.revokeObjectURL(objectUrl);}
 }
 async function displayPage(pageNum){
  if(!sourcePdf)return;
  busy=true;submit.disabled=true;setStatus(tr.busy);
  try{
   const page=await sourcePdf.getPage(pageNum);
   const raw=page.getViewport({scale:1});
   const scale=Math.min(2,2000/Math.max(raw.width,raw.height));
   const vp=page.getViewport({scale});
   const c=document.createElement('canvas');c.width=Math.ceil(vp.width);c.height=Math.ceil(vp.height);
   await page.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
   image=c;pdfPage=pageNum;points=initialCorners();draw();
  }finally{busy=false;setStatus('');draw();}
 }
 const pdfLabel=overlay.querySelector('.rivo-edge-page');
 select.addEventListener('change',()=>void displayPage(Number(select.value)).catch(e=>setStatus(String(e.message||e))));
 overlay.querySelector('[data-edge="close"]').addEventListener('click',close);
 overlay.querySelector('[data-edge="reset"]').addEventListener('click',()=>{if(!busy){points=initialCorners();draw()}});
 overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
 submit.addEventListener('click',async()=>{
  if(!image||busy||!validEdgeQuadrilateral(points))return;
  busy=true;submit.disabled=true;setStatus(tr.busy);
  try{
   const ctx=image.getContext('2d',{willReadFrequently:true});
   const raw=ctx.getImageData(0,0,image.width,image.height);
   const crop=perspectiveCropImageData(raw,points);
   const corrected=document.createElement('canvas');corrected.width=crop.width;corrected.height=crop.height;
   corrected.getContext('2d').putImageData(new ImageData(crop.data,crop.width,crop.height),0,0);
   const jpg=await new Promise((resolve,reject)=>corrected.toBlob(b=>b?resolve(b):reject(Error('JPEG export failed')),'image/jpeg',.93));
   const correctedBytes=new Uint8Array(await jpg.arrayBuffer());
   if(isPdf){
    const pdf=await PDFDocument.load(sourceBytes,{ignoreEncryption:false});
    const originalPage=pdf.getPage(pdfPage-1),size=originalPage.getSize();
    const embedded=await pdf.embedJpg(correctedBytes);
    pdf.removePage(pdfPage-1);
    const replacement=pdf.insertPage(pdfPage-1,[size.width,size.height]);
    replacement.drawImage(embedded,{x:0,y:0,width:size.width,height:size.height});
    await onSave(await pdf.save(), 'RS_Edges_'+Date.now()+'.pdf','application/pdf');
   }else{
    await onSave(correctedBytes,'RS_Edges_'+Date.now()+'.jpg','image/jpeg');
   }
   busy=false;close();await onDone();
  }catch(e){
   busy=false;draw();setStatus(tr.failed+': '+String(e?.message||e));
   notify(tr.failed+': '+String(e?.message||e),true);
  }
 });
 try{
  const data=await bridge.readFile({uri:doc.uri});
  sourceBytes=decodeBase64(data.base64||'');
  if(!sourceBytes.length)throw Error('Document could not be read.');
  if(isPdf){
   sourcePdf=await pdfjs.getDocument({data:sourceBytes.slice()}).promise;
   pdfLabel.hidden=false;
   select.replaceChildren(...Array.from({length:sourcePdf.numPages},(_,i)=>{
    const option=document.createElement('option');option.value=String(i+1);option.textContent=tr.page+' '+(i+1);return option;
   }));
   await displayPage(1);
  }else{
   image=await loadImage(sourceBytes,doc.mimeType||'image/jpeg');
   draw();
  }
 }catch(e){
  busy=false;setStatus(tr.failed+': '+String(e?.message||e));
  submit.disabled=true;
  notify(tr.failed+': '+String(e?.message||e),true);
 }
 return {close,source:doc,saveAsCopy:true};
}
