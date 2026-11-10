import * as pdfjs from 'pdfjs-dist';
import {PDFDocument} from 'pdf-lib';
import {normalizeRedaction,redactCanvas} from './privacy-shield-core.js';

const MAX_BYTES=24*1024*1024;
const MAX_PDF_PAGES=30;
const MAX_RENDER_PIXELS=7_000_000;
const WORDS={
 en:{title:'Privacy Shield',subtitle:'Hide sensitive information permanently in a new copy',pick:'Select PDF or image',hint:'Drag over the text or picture you want to hide. Use one or more rectangles.',page:'Page',previous:'Previous',next:'Next',undo:'Undo',clear:'Clear',save:'Save redacted copy',close:'Close',pending:'Choose a document first.',ready:'Black areas will be permanently flattened into the exported file. The original stays unchanged.',none:'Select at least one area to hide.',saving:'Creating sanitized copy on your device…',saved:'Sanitized copy saved. Original preserved.',failed:'Could not redact document: ',confirm:'Export a new copy with sensitive areas permanently hidden? The original file is not altered.',limit:'PDF exceeds 30 pages; please split it first.',access:'Redaction happens on-device. Review every page before sharing.'},
 ar:{title:'Privacy Shield',subtitle:'إخفاء المعلومات الحساسة نهائياً فنسخة جديدة',pick:'اختار PDF أو صورة',hint:'جرّ صبعك فوق النص أو الصورة اللي بغيتي تخفي. تقدر تحدد عدة مناطق.',page:'الصفحة',previous:'السابقة',next:'التالية',undo:'تراجع',clear:'مسح التحديد',save:'حفظ نسخة آمنة',close:'إغلاق',pending:'اختار وثيقة أولاً.',ready:'المناطق السوداء غادي تندمج نهائياً فالنسخة الجديدة، والأصل غادي يبقى.',none:'حدد على الأقل منطقة وحدة.',saving:'كنوجد نسخة آمنة محلياً…',saved:'تحفظات النسخة الآمنة والأصل باقي.',failed:'تعذر إخفاء المعلومات: ',confirm:'واش بغيتي تحفظ نسخة جديدة والمعلومات المحددة مخفية نهائياً؟ الأصل ما غاديش يتبدل.',limit:'PDF فيه أكثر من 30 صفحة. قسمو قبل التعديل.',access:'المعالجة محلية. راجع كل صفحة قبل المشاركة.'},
 fr:{title:'Privacy Shield',subtitle:'Masquer définitivement les données dans une nouvelle copie',pick:'Choisir PDF ou image',hint:'Faites glisser sur la zone à masquer. Plusieurs rectangles possibles.',page:'Page',previous:'Précédente',next:'Suivante',undo:'Annuler',clear:'Effacer',save:'Enregistrer la copie masquée',close:'Fermer',pending:'Choisissez un document.',ready:'Les zones noires seront aplaties dans le nouveau fichier. Original intact.',none:'Sélectionnez au moins une zone.',saving:'Création locale de la copie…',saved:'Copie masquée enregistrée.',failed:'Masquage impossible : ',confirm:'Exporter une nouvelle copie avec les données définitivement masquées ?',limit:'PDF de plus de 30 pages. Divisez-le avant.',access:'Traitement local. Vérifiez chaque page.'}
};
const bytesFromBase64=str=>{
 const raw=String(str||'').split(',').at(-1),out=new Uint8Array(Math.floor(raw.length*3/4));
 const binary=atob(raw);return Uint8Array.from(binary,c=>c.charCodeAt(0));
};
const imageLoad=bytes=>new Promise((resolve,reject)=>{
 const blob=new Blob([bytes]),url=URL.createObjectURL(blob),img=new Image();
 const release=()=>URL.revokeObjectURL(url);
 img.onload=()=>{release();resolve(img)};img.onerror=()=>{release();reject(Error('Cannot decode image'))};img.src=url;
});
const canvasFor=(w,h)=>{
 if(!Number.isFinite(w)||!Number.isFinite(h)||w<1||h<1||w*h>MAX_RENDER_PIXELS)
  throw Error('Document page is too large to process safely');
 const c=document.createElement('canvas');c.width=Math.round(w);c.height=Math.round(h);return c;
};
const canvasBlob=(canvas,type='image/jpeg',quality=.95)=>new Promise((resolve,reject)=>
 canvas.toBlob(b=>b?resolve(b):reject(Error('Could not encode sanitized copy')),type,quality));
export async function openPrivacyShield({doc=null,bridge=null,language='en',onSave,notify=()=>{},onRefresh=async()=>{}}={}){
 if(typeof onSave!=='function')throw Error('Privacy Shield needs a save handler');
 const t=WORDS[language]||WORDS.en;
 const root=document.createElement('div');root.className='rivo-shield-overlay';
 root.dir=language==='ar'?'rtl':'ltr';
 root.innerHTML='<section class="rivo-shield-dialog" role="dialog" aria-modal="true">'+
 '<header class="rivo-shield-head"><div><strong>'+t.title+'</strong><small>'+t.subtitle+'</small></div><button type="button" data-shield="close" aria-label="'+t.close+'">✕</button></header>'+
 '<div class="rivo-shield-toolbar"><button type="button" data-shield="pick">'+t.pick+'</button>'+
 '<button type="button" data-shield="undo" disabled>↶ '+t.undo+'</button>'+
 '<button type="button" data-shield="clear" disabled>'+t.clear+'</button></div>'+
 '<input type="file" accept=".pdf,application/pdf,image/*" class="rivo-shield-file" hidden>'+
 '<p class="rivo-shield-hint">'+t.hint+'</p>'+
 '<div class="rivo-shield-stage"><canvas aria-label="'+t.hint+'"></canvas><div class="rivo-shield-empty">'+t.pending+'</div></div>'+
 '<div class="rivo-shield-pages"><button type="button" data-shield="prev" disabled>'+t.previous+'</button><span role="status" data-shield-status></span><button type="button" data-shield="next" disabled>'+t.next+'</button></div>'+
 '<p class="rivo-shield-note">'+t.access+'</p><button class="rivo-shield-save" type="button" data-shield="save" disabled>'+t.save+'</button></section>';
 document.body.append(root);
 const canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
 const stage=root.querySelector('.rivo-shield-stage'),empty=root.querySelector('.rivo-shield-empty');
 const input=root.querySelector('input'),status=root.querySelector('[data-shield-status]');
 const button=a=>root.querySelector('[data-shield="'+a+'"]');
 const masks=new Map();let fileBytes=null,type=null,name='scan',pdf=null,pages=0,page=1,sourceCanvas=null,drag=null,busy=false,closed=false;
 const update=()=>{
  if(closed)return;
  empty.hidden=!!sourceCanvas;
  canvas.hidden=!sourceCanvas;
  if(sourceCanvas){
   canvas.width=sourceCanvas.width;canvas.height=sourceCanvas.height;
   ctx.drawImage(sourceCanvas,0,0);
   redactCanvas(ctx,masks.get(page)||[],canvas.width,canvas.height);
   if(drag){ctx.save();ctx.strokeStyle='#12ead0';ctx.lineWidth=Math.max(2,canvas.width/400);
    const r=normalizeRedaction(drag,0);
    if(r)ctx.strokeRect(r.x*canvas.width,r.y*canvas.height,r.w*canvas.width,r.h*canvas.height);
    ctx.restore();}
  }
  const total=[...masks.values()].reduce((n,a)=>n+a.length,0);
  status.textContent=sourceCanvas?t.page+' '+page+' / '+pages+' · '+total+' ▪':'';
  button('prev').disabled=busy||page<=1;
  button('next').disabled=busy||page>=pages;
  button('undo').disabled=busy||!(masks.get(page)||[]).length;
  button('clear').disabled=busy||!(masks.get(page)||[]).length;
  button('save').disabled=busy||total===0;
 };
 const clearPdf=async()=>{if(pdf){await pdf.destroy().catch(()=>{});pdf=null;}};
 const close=()=>{if(busy||closed)return;closed=true;void clearPdf();root.remove();};
 async function renderPage(n){
  if(!fileBytes||closed)return;
  let c;
  if(type==='pdf'){
   const p=await pdf.getPage(n);
   try{
    const viewport=p.getViewport({scale:1}),scale=Math.min(1.65,1800/Math.max(viewport.width,viewport.height),Math.sqrt(MAX_RENDER_PIXELS/(viewport.width*viewport.height)));
    const output=p.getViewport({scale});
    c=canvasFor(output.width,output.height);
    await p.render({canvasContext:c.getContext('2d',{alpha:false}),viewport:output,background:'#ffffff'}).promise;
   }finally{p.cleanup()}
  }else{
   const img=await imageLoad(fileBytes);
   const scale=Math.min(1,2200/Math.max(img.naturalWidth,img.naturalHeight),
    Math.sqrt(MAX_RENDER_PIXELS/(img.naturalWidth*img.naturalHeight)));
   c=canvasFor(img.naturalWidth*scale,img.naturalHeight*scale);
   const draw=c.getContext('2d');draw.fillStyle='#fff';draw.fillRect(0,0,c.width,c.height);draw.drawImage(img,0,0,c.width,c.height);
  }
  if(closed)return;sourceCanvas=c;page=n;update();
 }
 async function openBytes(bytes,filename,mime=''){
  if(!bytes?.length||bytes.length>MAX_BYTES)throw Error('Maximum input size: 24 MB');
  await clearPdf();fileBytes=bytes;name=String(filename||'document').replace(/\.[^.]+$/,'');masks.clear();sourceCanvas=null;
  const signature=bytes.length>4&&bytes[0]===37&&bytes[1]===80&&bytes[2]===68&&bytes[3]===70;
  type=signature?'pdf':/^image\//.test(mime)?'image':null;
  if(!type)throw Error('Choose a valid PDF or image');
  if(type==='pdf'){
   pdf=await pdfjs.getDocument({data:bytes.slice(),disableAutoFetch:true,isEvalSupported:false}).promise;
   pages=pdf.numPages;
   if(pages>MAX_PDF_PAGES){await clearPdf();throw Error(t.limit)}
  }else pages=1;
  await renderPage(1);
 }
 const point=e=>{
  const r=canvas.getBoundingClientRect();
  return {x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),
   y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))};
 };
 canvas.addEventListener('pointerdown',e=>{
  if(!sourceCanvas||busy)return;
  e.preventDefault();const p=point(e);drag={x1:p.x,y1:p.y,x2:p.x,y2:p.y};
  canvas.setPointerCapture(e.pointerId);
 });
 canvas.addEventListener('pointermove',e=>{
  if(!drag||busy)return;const p=point(e);drag.x2=p.x;drag.y2=p.y;update();
 });
 const finishDrag=e=>{
  if(!drag)return;const p=point(e);drag.x2=p.x;drag.y2=p.y;
  const box=normalizeRedaction(drag);drag=null;
  if(box)masks.set(page,[...(masks.get(page)||[]),box]);
  update();
 };
 canvas.addEventListener('pointerup',finishDrag);
 canvas.addEventListener('pointercancel',()=>{drag=null;update()});
 const pick=async file=>{
  if(!file)return;
  busy=true;button('save').disabled=true;
  try{await openBytes(new Uint8Array(await file.arrayBuffer()),file.name,file.type)}
  catch(e){notify(t.failed+e.message,true);status.textContent=e.message}
  finally{busy=false;update()}
 };
 async function saveSanitized(){
  if(busy||!fileBytes)return;
  const total=[...masks.values()].reduce((n,a)=>n+a.length,0);
  if(!total){notify(t.none,true);return}
  if(!window.confirm(t.confirm))return;
  busy=true;update();status.textContent=t.saving;
  try{
   const base=(name||'RivoScan').replace(/[^a-zA-Z0-9_-]+/g,'_').slice(0,48);
   const suffix=Date.now();
   if(type==='pdf'){
    const newPdf=await PDFDocument.create();
    // Every page is RASTERIZED in a completely new PDF. No original hidden text,
    // unredacted embedded assets, attachments, or annotations are copied.
    for(let n=1;n<=pages;n++){
     const p=await pdf.getPage(n);
     const vp=p.getViewport({scale:1});
     const scale=Math.min(1.8,2000/Math.max(vp.width,vp.height),Math.sqrt(MAX_RENDER_PIXELS/(vp.width*vp.height)));
     const view=p.getViewport({scale});
     const c=canvasFor(view.width,view.height),ct=c.getContext('2d',{alpha:false});
     await p.render({canvasContext:ct,viewport:view,background:'#ffffff'}).promise;
     redactCanvas(ct,masks.get(n)||[],c.width,c.height);
     const jpg=new Uint8Array(await (await canvasBlob(c)).arrayBuffer());
     const embedded=await newPdf.embedJpg(jpg);
     const target=newPdf.addPage([vp.width,vp.height]);
     target.drawImage(embedded,{x:0,y:0,width:vp.width,height:vp.height});
     p.cleanup();c.width=0;c.height=0;
    }
    newPdf.setTitle('RivoScan Privacy Shield · Redacted');
    newPdf.setAuthor('RivoScan');
    await onSave(await newPdf.save(),base+'_redacted_'+suffix+'.pdf','application/pdf');
   }else{
    const c=canvasFor(sourceCanvas.width,sourceCanvas.height),ct=c.getContext('2d',{alpha:false});
    ct.drawImage(sourceCanvas,0,0);
    redactCanvas(ct,masks.get(1)||[],c.width,c.height);
    const bytes=new Uint8Array(await (await canvasBlob(c)).arrayBuffer());
    await onSave(bytes,base+'_redacted_'+suffix+'.jpg','image/jpeg');
    c.width=0;c.height=0;
   }
   await onRefresh();notify(t.saved);
   busy=false;close();
  }catch(e){busy=false;notify(t.failed+e.message,true);status.textContent=t.failed+e.message;update()}
 }
 root.addEventListener('click',async e=>{
  const action=e.target.closest('[data-shield]')?.dataset.shield;
  if(!action||busy)return;
  if(action==='close')close();
  else if(action==='pick')input.click();
  else if(action==='prev'&&page>1){busy=true;await renderPage(page-1).finally(()=>{busy=false;update()})}
  else if(action==='next'&&page<pages){busy=true;await renderPage(page+1).finally(()=>{busy=false;update()})}
  else if(action==='undo'){masks.get(page)?.pop();update()}
  else if(action==='clear'){masks.delete(page);update()}
  else if(action==='save')await saveSanitized();
 });
 input.addEventListener('change',()=>{const selected=input.files?.[0];input.value='';if(selected)void pick(selected)});
 const back=e=>{if(e.key==='Escape'&&!busy){e.preventDefault();close()}};
 document.addEventListener('keydown',back);
 const oldClose=close;
 // Escape listeners are removed even when the dialog is closed by a tool switch.
 const closeButton=button('close');
 closeButton.addEventListener('click',()=>document.removeEventListener('keydown',back),{once:true});
 if(doc){
  try{
   const source=await bridge.readFile({uri:doc.uri});
   const bytes=bytesFromBase64(source.base64);
   await openBytes(bytes,doc.name,doc.mimeType||source.mimeType||'');
  }catch(e){status.textContent=e.message;notify(t.failed+e.message,true)}
 }
 return oldClose;
}
