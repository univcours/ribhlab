import {PDFDocument,degrees} from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';

export async function openPageManager({file,getLanguage,onSave,onDone,onError}){
 const lang=getLanguage();
 const L={
 en:['Manage Pages','selected','Select all','Deselect all','Drag to reorder or use ↑ and ↓','Left','Right','Delete','Restore','Save PDF','Cancel','No pages left','Original PDF remains unchanged','Undo'],
 ar:['إدارة الصفحات','مختارة','تحديد الكل','إلغاء الكل','جرّ الصفحات أو استعمل ↑ و↓','يسار','يمين','مسح','استرجاع','حفظ PDF','إلغاء','ما بقات حتى صفحة','الوثيقة الأصلية غتبقى محفوظة','تراجع'],
 fr:['Gérer les pages','sélectionnées','Tout sélectionner','Tout désélectionner','Glisser ou utiliser ↑ et ↓','Gauche','Droite','Supprimer','Restaurer','Enregistrer','Annuler','Plus de pages','Le PDF original est conservé','Annuler'],
 es:['Organizar páginas','seleccionadas','Todo','Deseleccionar','Arrastrar o utilizar ↑ y ↓','Izquierda','Derecha','Eliminar','Restaurar','Guardar','Cancelar','Sin páginas','El original se conserva','Deshacer'],
 de:['Seiten verwalten','gewählt','Alle','Keine','Ziehen oder ↑ und ↓','Links','Rechts','Löschen','Wiederherstellen','Speichern','Abbrechen','Keine Seiten','Original bleibt erhalten','Rückgängig'],
 pt:['Gerir páginas','selecionadas','Selecionar tudo','Desselecionar','Arrastar ou usar ↑ e ↓','Esquerda','Direita','Eliminar','Restaurar','Guardar','Cancelar','Sem páginas','Original preservado','Desfazer'],
 it:['Gestisci pagine','selezionate','Seleziona tutto','Deseleziona','Trascina o usa ↑ e ↓','Sinistra','Destra','Elimina','Ripristina','Salva','Annulla','Nessuna pagina','Originale invariato','Annulla']
 };
 const t=i=>(L[lang]||L.en)[i];
 if(!file||(!/\.pdf$/i.test(file.name)&&file.type!=='application/pdf'))throw Error('Select a PDF file');
 if(file.size>30*1024*1024)throw Error('PDF must be smaller than 30 MB');
 const raw=new Uint8Array(await file.arrayBuffer()),src=await PDFDocument.load(raw);
 const total=src.getPageCount();if(total>80)throw Error('Maximum 80 pages');
 const pages=Array.from({length:total},(_,id)=>({id,selected:false,removed:false,turn:0,preview:''}));
 let pdf=null,closed=false,saving=false,dragged=-1;
 const history=[];
 const selected=()=>pages.filter(x=>x.selected&&!x.removed);
 const remember=()=>{history.push(pages.map(x=>({...x})));if(history.length>15)history.shift()};
 const overlay=document.createElement('div');overlay.className='rivo-pages-overlay';
 overlay.innerHTML='<div class="rivo-pages-modal" role="dialog" aria-modal="true"></div>';
 const panel=overlay.firstElementChild;
 async function close(){if(closed)return;closed=true;overlay.remove();document.body.classList.remove('rivo-pages-open');try{await pdf?.destroy()}catch{}}
 function draw(){
  if(closed)return;
  panel.innerHTML=`<header class="rivo-pages-top"><button data-page-action="close">✕</button><strong>${t(0)}</strong><button class="rivo-pages-save" data-page-action="save">✓ ${t(9)}</button></header>
  <div class="rivo-pages-count"><strong>${selected().length} ${t(1)}</strong><button data-page-action="all">${t(2)}</button><button data-page-action="none">${t(3)}</button></div>
  <p class="rivo-pages-tip">${t(4)}</p><div class="rivo-pages-grid">${pages.map((p,i)=>`<div class="rivo-page-item ${p.selected?'selected':''} ${p.removed?'removed':''}" draggable="true" data-id="${p.id}">
    <button class="rivo-page-tile" data-page-action="select" data-id="${p.id}" aria-pressed="${p.selected}"><img src="${p.preview}" alt="Page ${i+1}" style="transform:rotate(${p.turn}deg)"><span class="rivo-page-check">${p.selected?'✓':p.removed?'×':''}</span></button>
    <div class="rivo-page-row"><button data-page-action="up" data-id="${p.id}">↑</button><b>${i+1}</b><button data-page-action="down" data-id="${p.id}">↓</button></div>
  </div>`).join('')}</div>
  <footer class="rivo-pages-bottom"><div class="rivo-page-operations"><button data-page-action="left" ${selected().length?'':'disabled'}>↶ ${t(5)}</button>
   <button data-page-action="right" ${selected().length?'':'disabled'}>↷ ${t(6)}</button>
   <button data-page-action="delete" ${selected().length?'':'disabled'}>⌫ ${t(7)}</button>
   <button data-page-action="restore">↩ ${t(8)}</button><button data-page-action="undo" ${history.length?'':'disabled'}>⟲ ${t(13)}</button></div><small>${t(12)}</small></footer>`;
 }
 overlay.addEventListener('dragstart',e=>{const row=e.target.closest('.rivo-page-item');if(!row)return;dragged=Number(row.dataset.id);e.dataTransfer.effectAllowed='move'});
 overlay.addEventListener('dragover',e=>{if(e.target.closest('.rivo-page-item'))e.preventDefault()});
 overlay.addEventListener('drop',e=>{const row=e.target.closest('.rivo-page-item');if(!row||dragged<0)return;e.preventDefault();const from=pages.findIndex(x=>x.id===dragged),to=pages.findIndex(x=>x.id===Number(row.dataset.id));if(from!==to&&from>=0&&to>=0){remember();pages.splice(to,0,pages.splice(from,1)[0]);draw()}dragged=-1});
 overlay.addEventListener('click',async e=>{
  const b=e.target.closest('[data-page-action]');if(!b||saving)return;
  const action=b.dataset.pageAction,p=pages.find(x=>x.id===Number(b.dataset.id));
  try{
   if(action==='close'){await close();return}
   if(action==='select'&&p){remember();p.selected=!p.selected}
   if(action==='all'){remember();pages.forEach(x=>x.selected=!x.removed)}
   if(action==='none'){remember();pages.forEach(x=>x.selected=false)}
   if(action==='up'||action==='down'){const from=pages.indexOf(p),to=from+(action==='up'?-1:1);if(from>=0&&to>=0&&to<pages.length){remember();[pages[from],pages[to]]=[pages[to],pages[from]]}}
   if(action==='left'||action==='right'){remember();selected().forEach(x=>x.turn=(x.turn+(action==='left'?270:90))%360)}
   if(action==='delete'){remember();selected().forEach(x=>{x.removed=true;x.selected=false})}
   if(action==='restore'){remember();pages.forEach(x=>x.removed=false)}
   if(action==='undo'&&history.length)pages.splice(0,pages.length,...history.pop());
   if(action==='save'){
    const keep=pages.filter(x=>!x.removed);if(!keep.length)throw Error(t(11));
    saving=true;b.disabled=true;
    const out=await PDFDocument.create();
    for(const x of keep){const [copy]=await out.copyPages(src,[x.id]);copy.setRotation(degrees((copy.getRotation().angle+x.turn)%360));out.addPage(copy)}
    await onSave(await out.save({useObjectStreams:true}),file.name.replace(/\.pdf$/i,'')+'_managed_'+Date.now()+'.pdf','application/pdf');
    await close();await onDone?.();return;
   }
   draw();
  }catch(error){saving=false;onError?.(error?.message||String(error));draw()}
 });
 document.body.appendChild(overlay);document.body.classList.add('rivo-pages-open');draw();
 try{
  pdf=await pdfjs.getDocument({data:raw.slice(),useSystemFonts:true}).promise;
  for(let i=0;i<total&&!closed;i++){
   const page=await pdf.getPage(i+1),vp=page.getViewport({scale:1}),scale=Math.min(.45,160/Math.max(vp.width,vp.height));
   const v=page.getViewport({scale}),canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(v.width));canvas.height=Math.max(1,Math.round(v.height));
   const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);
   await page.render({canvasContext:ctx,viewport:v}).promise;
   pages[i].preview=canvas.toDataURL('image/jpeg',.65);page.cleanup();
   const img=overlay.querySelector('.rivo-page-item[data-id="'+i+'"] img');if(img)img.src=pages[i].preview;
  }
 }catch(error){onError?.(error?.message||String(error))}
 return close;
}
