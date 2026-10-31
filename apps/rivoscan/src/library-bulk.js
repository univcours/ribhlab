import { PDFDocument } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';

export function createLibraryBulk({bridge,getLanguage,getItems,onRefresh,onPreview,onEdit,showBusy,progress,clearBusy,saveOut,toast}){
  let mode=false;
  const selected=new Set();
  let suppressUntil=0;
  const translations={
    en:['Select','selected','Select all','Invert','Cancel','Delete','Share','Merge PDF','Edit','Preview','Document actions','Share as','Quality','PDF','JPG images','Original / best','Balanced','Small file','Prepare and share','Processed on your phone. Converted copies are saved in Documents/RivoScan.','Reduced PDF quality converts text to images; original preserves editable text.','Delete {n} documents permanently?','Limit: 30 documents.','Limit: 30 image pages.','File exceeds the 16 MB conversion limit. Share the original instead.','Select documents first.','Completed','Stopped; remaining files are safe.','Select at least two documents.','Long-press any document for more actions.','Add to selection','Remove from selection','Preparing document','Pages limit exceeded.'],
    ar:['تحديد','مختارة','تحديد الكل','عكس الاختيار','إلغاء','مسح','مشاركة','جمع PDF','تعديل','معاينة','خيارات الوثيقة','شارك بصيغة','الجودة','PDF','صور JPG','أصلية / أعلى جودة','متوازنة','حجم صغير','تحضير ومشاركة','التحويل كيتم فهاتفك. النسخ كتتحفظ فـDocuments/RivoScan.','الجودة المنخفضة كتبدل نص PDF بصور؛ الأصلية كتحافظ عليه.','واش تمسح {n} وثائق نهائياً؟','الحد الأقصى 30 وثيقة.','الحد الأقصى 30 صورة.','الوثيقة أكبر من 16 ميغا للتحويل. شارك الأصلية.','اختار الوثائق أولاً.','تكمّلات العملية','توقّفات العملية؛ الملفات الباقية ما تمسحاتش.','اختار جوج وثائق على الأقل.','ضغط مطوّل على وثيقة باش تختار وتفتح الخيارات.','زيد للتحديد','حيد من التحديد','كنوجدو الوثيقة','عدد الصفحات فات الحد.'],
    fr:['Sélectionner','sélectionnés','Tout sélectionner','Inverser','Annuler','Supprimer','Partager','Fusionner PDF','Modifier','Aperçu','Actions du document','Partager en','Qualité','PDF','Images JPG','Originale / optimale','Équilibrée','Petit fichier','Préparer et partager','Traitement local. Copies dans Documents/RivoScan.','La qualité réduite transforme le texte PDF en images.','Supprimer définitivement {n} documents ?','Maximum 30 documents.','Maximum 30 images.','Fichier trop volumineux (16 Mo). Partagez l’original.','Sélectionnez des documents.','Terminé','Arrêté : les autres fichiers sont préservés.','Sélectionnez deux documents.','Appui long pour choisir plusieurs documents.','Ajouter','Désélectionner','Préparation…','Trop de pages.'],
    es:['Seleccionar','seleccionados','Todo','Invertir','Cancelar','Eliminar','Compartir','Unir PDF','Editar','Vista previa','Acciones','Compartir como','Calidad','PDF','Imágenes JPG','Original / máxima','Equilibrada','Archivo pequeño','Preparar y compartir','Proceso local. Copias en Documents/RivoScan.','Menor calidad convierte el texto PDF en imágenes.','¿Eliminar {n} documentos definitivamente?','Máximo 30 documentos.','Máximo 30 imágenes.','Archivo demasiado grande (16 MB). Comparte el original.','Selecciona documentos.','Completado','Detenido. Los demás archivos siguen intactos.','Selecciona dos documentos.','Mantén pulsado para ver opciones.','Añadir','Quitar','Preparando…','Demasiadas páginas.'],
    de:['Auswählen','ausgewählt','Alle auswählen','Umkehren','Abbrechen','Löschen','Teilen','PDF verbinden','Bearbeiten','Vorschau','Aktionen','Teilen als','Qualität','PDF','JPG-Bilder','Original / beste','Ausgewogen','Klein','Vorbereiten und teilen','Lokal verarbeitet. Kopien in Documents/RivoScan.','Reduzierte Qualität wandelt PDF-Text in Bilder um.','{n} Dokumente dauerhaft löschen?','Maximal 30 Dokumente.','Maximal 30 Bilder.','Datei zu groß (16 MB). Original teilen.','Dokumente wählen.','Fertig','Angehalten. Übrige Dateien sicher.','Zwei Dokumente wählen.','Lange drücken für Auswahl.','Hinzufügen','Entfernen','Vorbereitung…','Zu viele Seiten.'],
    pt:['Selecionar','selecionados','Selecionar tudo','Inverter','Cancelar','Eliminar','Partilhar','Unir PDF','Editar','Pré-visualizar','Ações','Partilhar como','Qualidade','PDF','Imagens JPG','Original / máxima','Equilibrada','Pequeno','Preparar e partilhar','Processamento local. Cópias em Documents/RivoScan.','Qualidade inferior transforma texto PDF em imagem.','Eliminar {n} documentos definitivamente?','Máximo 30 documentos.','Máximo 30 imagens.','Ficheiro muito grande (16 MB). Partilhe o original.','Selecione documentos.','Concluído','Interrompido. Restantes ficheiros intactos.','Selecione dois documentos.','Toque longo para opções.','Adicionar','Remover','Preparando…','Demasiadas páginas.'],
    it:['Seleziona','selezionati','Seleziona tutto','Inverti','Annulla','Elimina','Condividi','Unisci PDF','Modifica','Anteprima','Azioni','Condividi come','Qualità','PDF','Immagini JPG','Originale / massima','Bilanciata','Piccolo','Prepara e condividi','Elaborazione locale. Copie in Documents/RivoScan.','Qualità ridotta converte il testo PDF in immagini.','Eliminare {n} documenti definitivamente?','Massimo 30 documenti.','Massimo 30 immagini.','File troppo grande (16 MB). Condividi originale.','Seleziona documenti.','Completato','Interrotto. Altri file intatti.','Seleziona due documenti.','Tieni premuto per opzioni.','Aggiungi','Rimuovi','Preparazione…','Troppe pagine.']
  };
  const keys=['select','selected','all','invert','cancel','delete','share','merge','edit','preview','menu','format','quality','pdf','images','original','balanced','small','send','info','loss','confirm','limit','pageLimit','large','none','done','stop','needTwo','hint','add','remove','preparing','tooMany'];
  const t=key=>(translations[getLanguage()]||translations.en)[keys.indexOf(key)]||key;
  const size=bytes=>bytes<1024?bytes+' B':bytes<1048576?(bytes/1024).toFixed(1)+' KB':(bytes/1048576).toFixed(1)+' MB';
  const selectedDocs=()=>[...selected].map(uri=>getItems().find(doc=>doc.uri===uri)).filter(Boolean);
  const chosen=doc=>selected.has(doc.uri);
  function toolbar(){
    if(!mode)return '';
    const items=selectedDocs(),total=items.reduce((sum,d)=>sum+(d.size||0),0);
    return `<div class="library-selection-toolbar" role="group" aria-label="${t('select')}">
      <strong>${items.length} ${t('selected')}</strong><small>${size(total)}</small>
      <div class="bulk-secondary"><button data-bulk="all">${t('all')}</button><button data-bulk="invert">${t('invert')}</button><button data-bulk="cancel">${t('cancel')}</button></div>
      <div class="bulk-actions">
        <button data-bulk="share" ${items.length?'':'disabled'}>↗ ${t('share')}</button>
        <button data-bulk="merge" ${items.length>1?'':'disabled'}>▣ ${t('merge')}</button>
        <button data-bulk="delete" ${items.length?'':'disabled'}>⌫ ${t('delete')}</button>
      </div>
    </div>`;
  }
  function checkbox(doc,index){
    if(!mode)return '';
    return `<input type="checkbox" class="doc-select-box" data-doc-select="${index}" aria-label="${t('select')}" ${chosen(doc)?'checked':''}>`;
  }
  function clear(){mode=false;selected.clear();}
  function prune(){const known=new Set(getItems().map(x=>x.uri));for(const uri of selected)if(!known.has(uri))selected.delete(uri);if(!selected.size)mode=false;}
  function sync(){
    const slot=document.getElementById('library-selection-root');
    if(slot)slot.innerHTML=toolbar();
    const root=document.getElementById('library-list');
    if(root){
      for(const row of root.querySelectorAll('.document-entry[data-doc-open]')){
        const doc=getItems()[Number(row.dataset.docOpen)];
        row.classList.toggle('doc-selected',!!doc&&chosen(doc));
        row.setAttribute('aria-selected',String(!!doc&&chosen(doc)));
        const existing=row.querySelector('.doc-select-box');
        if(mode&&!existing){
          const div=document.createElement('div');div.innerHTML=doc?checkbox(doc,Number(row.dataset.docOpen)):'';
          if(div.firstElementChild)row.prepend(div.firstElementChild);
        } else if(!mode&&existing)existing.remove();
        else if(existing)existing.checked=!!doc&&chosen(doc);
      }
    }
  }
  function toggle(doc){
    if(!doc)return;
    mode=true;
    if(selected.has(doc.uri))selected.delete(doc.uri);
    else if(selected.size>=30){toast(t('limit'),true);return;}
    else selected.add(doc.uri);
    sync();
  }
  function selectAll(){
    selected.clear();getItems().slice(0,30).forEach(doc=>selected.add(doc.uri));mode=true;sync();
    if(getItems().length>30)toast(t('limit'),true);
  }
  function invert(){
    const next=getItems().filter(doc=>!selected.has(doc.uri));
    selected.clear();next.slice(0,30).forEach(doc=>selected.add(doc.uri));mode=true;sync();
  }
  function closeSheet(){document.querySelector('.bulk-overlay')?.remove();}
  function sheet(html){
    closeSheet();
    const shade=document.createElement('div');shade.className='bulk-overlay';shade.innerHTML=`<section class="bulk-sheet" role="dialog" aria-modal="true">${html}</section>`;
    shade.addEventListener('click',e=>{if(e.target===shade||e.target.closest('[data-close-sheet]'))closeSheet()});
    document.body.appendChild(shade);
    shade.querySelector('button')?.focus();
    return shade;
  }
  function longPress(doc){
    if(!doc)return;
    if(!selected.has(doc.uri)){mode=true;selected.add(doc.uri);sync();}
    const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const root=sheet(`<div class="bulk-sheet-title"><strong>${t('menu')}</strong><button data-close-sheet aria-label="${t('cancel')}">✕</button></div>
      <p class="bulk-document-name">${escape(doc.name)}</p>
      <div class="bulk-sheet-actions">
        <button data-menu="preview">${t('preview')}</button>
        <button data-menu="edit">${t('edit')}</button>
        <button data-menu="share">${t('share')}</button>
        <button data-menu="delete">${t('delete')}</button>
        <button data-menu="select">${chosen(doc)?t('remove'):t('add')}</button>
      </div>`);
    root.addEventListener('click',async e=>{
      const action=e.target.closest('[data-menu]')?.dataset.menu;if(!action)return;
      closeSheet();
      if(action==='select'){toggle(doc);return;}
      if(action==='preview'){await onPreview(doc);return;}
      if(action==='edit'){await onEdit(doc);return;}
      if(action==='share'){share([doc]);return;}
      if(action==='delete')await erase([doc]);
    });
  }
  function wireLongPress(root){
    if(!root)return;
    let timer=null,startX=0,startY=0,pressed=null;
    const stop=()=>{if(timer!==null){clearTimeout(timer);timer=null;}};
    root.addEventListener('pointerdown',e=>{
      if(e.pointerType==='mouse'||e.target.closest('button,input,select'))return;
      const row=e.target.closest('[data-doc-open]');if(!row||!root.contains(row))return;
      pressed=getItems()[Number(row.dataset.docOpen)];
      startX=e.clientX;startY=e.clientY;stop();
      timer=setTimeout(()=>{
        timer=null;suppressUntil=Date.now()+900;longPress(pressed);
        try{navigator.vibrate?.(25)}catch{}
      },550);
    });
    root.addEventListener('pointermove',e=>{if(Math.hypot(e.clientX-startX,e.clientY-startY)>12)stop()});
    for(const name of ['pointerup','pointercancel','pointerleave'])root.addEventListener(name,stop);
    root.addEventListener('contextmenu',e=>{
      const row=e.target.closest('[data-doc-open]');
      if(row&&root.contains(row)){e.preventDefault();suppressUntil=Date.now()+900;longPress(getItems()[Number(row.dataset.docOpen)])}
    });
  }
  function suppressClick(){return Date.now()<suppressUntil}
  async function erase(docs){
    if(!docs.length)return;
    if(!window.confirm(t('confirm').replace('{n}',String(docs.length))))return;
    showBusy(t('preparing'));
    let done=0;
    try{
      for(const doc of docs){progress(`${t('delete')} ${done+1}/${docs.length}`);await bridge.deleteFile({uri:doc.uri});selected.delete(doc.uri);done++;}
      await onRefresh();
      if(!selected.size)mode=false;
      sync();toast(`${done} ${t('done')}`);
    }catch(error){toast((error.message||t('stop'))+' · '+t('stop'),true);await onRefresh();}
    finally{clearBusy()}
  }
  async function fileFromDocument(doc){
    if((doc.size||0)>16*1024*1024)throw Error(t('large'));
    const response=await bridge.readFile({uri:doc.uri});
    const raw=atob(response.base64||'');
    const bytes=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
    const mime=doc.mimeType||response.mimeType||(/\.pdf$/i.test(doc.name)?'application/pdf':'image/jpeg');
    return new File([bytes],doc.name,{type:mime});
  }
  const isPDF=doc=>/pdf/i.test(doc.mimeType||'')||/\.pdf$/i.test(doc.name||'');
  const qrate=q=>q==='original'?.94:q==='balanced'?.77:.52;
  const scale=q=>q==='original'?1.65:q==='balanced'?1.2:.78;
  const jpeg=canvas=>new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Image conversion failed')),'image/jpeg',.88));
  async function loadCanvas(file){const uri=URL.createObjectURL(file);try{
    const img=await new Promise((resolve,reject)=>{const e=new Image();e.onload=()=>resolve(e);e.onerror=reject;e.src=uri});
    const ratio=Math.min(1,2400/Math.max(img.naturalWidth,img.naturalHeight));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));
    canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);return canvas;
  }finally{URL.revokeObjectURL(uri)}}
  async function rasterPdf(file,q,onCanvas){
    const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),useSystemFonts:true}).promise;
    try{
      for(let i=1;i<=pdf.numPages;i++){
        const page=await pdf.getPage(i);const base=page.getViewport({scale:1});
        const zoom=Math.min(scale(q),2400/Math.max(base.width,base.height));
        const vp=page.getViewport({scale:zoom});
        const canvas=document.createElement('canvas');canvas.width=Math.round(vp.width);canvas.height=Math.round(vp.height);
        await page.render({canvasContext:canvas.getContext('2d'),viewport:vp,canvas}).promise;
        await onCanvas(canvas,base.width,base.height);
        page.cleanup();
      }
    }finally{await pdf.destroy()}
  }
  async function createMergedPDF(docs,q='original'){
    if(!docs.length)throw Error(t('none'));
    const output=await PDFDocument.create();
    let pages=0;
    for(const doc of docs){
      progress(`${t('preparing')} ${++pages}/${docs.length}`);
      const file=await fileFromDocument(doc);
      if(isPDF(doc)&&q==='original'){
        const source=await PDFDocument.load(await file.arrayBuffer());
        const indexes=source.getPageIndices();if(output.getPageCount()+indexes.length>120)throw Error(t('tooMany'));
        const copies=await output.copyPages(source,indexes);copies.forEach(page=>output.addPage(page));continue;
      }
      const add=async(canvas,w,h)=>{
        if(output.getPageCount()>=120)throw Error(t('tooMany'));
        const blob=await new Promise((resolve,reject)=>canvas.toBlob(v=>v?resolve(v):reject(Error('Image error')),'image/jpeg',qrate(q)));
        const image=await output.embedJpg(await blob.arrayBuffer());
        const page=output.addPage([w,h]);page.drawImage(image,{x:0,y:0,width:w,height:h});
      };
      if(isPDF(doc))await rasterPdf(file,q,add);
      else{const canvas=await loadCanvas(file);await add(canvas,canvas.width,canvas.height);}
    }
    const bytes=await output.save({useObjectStreams:true});if(bytes.byteLength>60*1024*1024)throw Error('PDF exceeds 60 MB');
    return bytes;
  }
  async function createJpgs(docs,q){
    const uris=[];let count=0;
    for(const doc of docs){
      const file=await fileFromDocument(doc);
      const add=async canvas=>{
        if(count>=30)throw Error(t('pageLimit'));
        progress(`${t('preparing')} ${count+1}`);
        const blob=await new Promise((resolve,reject)=>canvas.toBlob(v=>v?resolve(v):reject(Error('Image error')),'image/jpeg',qrate(q)));
        const bytes=new Uint8Array(await blob.arrayBuffer());
        if(bytes.length>60*1024*1024)throw Error('Image exceeds 60 MB');
        let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));
        const saved=await bridge.saveFile({name:`RivoScan_Share_${Date.now()}_${count+1}.jpg`,mimeType:'image/jpeg',base64:btoa(binary)});
        uris.push(saved.uri);count++;
      };
      if(isPDF(doc))await rasterPdf(file,q,add);
      else await add(await loadCanvas(file));
    }
    return uris;
  }
  function share(docs){
    if(!docs?.length){toast(t('none'),true);return;}
    const root=sheet(`<div class="bulk-sheet-title"><strong>${t('share')} · ${docs.length}</strong><button data-close-sheet>✕</button></div>
      <label class="bulk-field">${t('format')}<select name="bulk-format"><option value="pdf">${t('pdf')}</option><option value="image">${t('images')}</option></select></label>
      <label class="bulk-field">${t('quality')}<select name="bulk-quality"><option value="original">${t('original')}</option><option value="balanced">${t('balanced')}</option><option value="small">${t('small')}</option></select></label>
      <p class="bulk-note">${t('loss')}</p><p class="bulk-note">${t('info')}</p>
      <button class="bulk-share-confirm" data-share-confirm>${t('send')}</button>`);
    root.querySelector('[data-share-confirm]').addEventListener('click',async()=>{
      const format=root.querySelector('[name="bulk-format"]').value;
      const q=root.querySelector('[name="bulk-quality"]').value;closeSheet();
      showBusy(t('preparing'));
      try{
        let uris,mime;
        if(format==='pdf'&&q==='original'&&docs.every(isPDF)){
          uris=docs.map(doc=>doc.uri);mime='application/pdf'; // lossless native sharing
        }else if(format==='pdf'){
          const bytes=await createMergedPDF(docs,q);
          const file=await saveOut(bytes,`RivoScan_Shared_${Date.now()}.pdf`,'application/pdf');
          uris=[file.uri];mime='application/pdf';
        }else{
          uris=await createJpgs(docs,q);mime='image/jpeg';
          await onRefresh();
        }
        await bridge.shareFiles({uris,mimeType:mime});
      }catch(error){console.error(error);toast(error.message||t('stop'),true)}
      finally{clearBusy()}
    });
  }
  async function merge(){
    const docs=selectedDocs();if(docs.length<2){toast(t('needTwo'),true);return}
    showBusy(t('preparing'));
    try{
      const bytes=await createMergedPDF(docs,'original');
      await saveOut(bytes,`RivoScan_Merged_${Date.now()}.pdf`,'application/pdf');
      clear();await onRefresh();toast(t('done'));
    }catch(error){console.error(error);toast(error.message||t('stop'),true)}
    finally{clearBusy()}
  }
  async function action(name){
    if(name==='cancel'){clear();sync();return}
    if(name==='all'){selectAll();return}
    if(name==='invert'){invert();return}
    const docs=selectedDocs();
    if(!docs.length){toast(t('none'),true);return;}
    if(name==='delete')await erase(docs);
    if(name==='share')share(docs);
    if(name==='merge')await merge();
  }
  function wireToolbar(root){
    root?.addEventListener('click',e=>{
      const button=e.target.closest('[data-bulk]');if(button)action(button.dataset.bulk);
    });
  }
  return {t,toolbar,checkbox,mode:()=>mode,chosen,toggle,clear,prune,sync,longPress,wireLongPress,suppressClick,share,action,wireToolbar};
}
