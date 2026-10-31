import { PDFDocument } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';
import {makeLongImage,makeWordText} from './share-exports.js';

export function createLibraryBulk({bridge,getLanguage,getItems,onRefresh,onPreview,onEdit,onOpenLibrary,onDirectTransfer,onRename,showBusy,progress,clearBusy,saveOut,toast}){
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
  const extraWords={
    en:{long:'Long image',word:'Word (editable text)',wordHint:'Word uses OCR. Tables, pictures and layout may not match the original.',longHint:'Long image joins pages vertically (12 pages max).',direct:'Direct transfer',link:'Link / direct',noCloud:'No public cloud link is created. Direct transfer pairs two devices with a code.',shareFile:'Share file',shareLink:'Send to another device',rename:'Rename',copy:'Copy',move:'Move',folder:'Destination folder',root:'My documents',work:'Work',personal:'Personal',archive:'Archive',qualityHint:'Compression can reduce image clarity.',asIs:'Keep original',preview:'Preview',imageCount:'pages',compress:'Compress',menuActions:'Actions',ready:'Ready to share',first:'Selected files',files:'files'},
    ar:{long:'صورة طويلة',word:'Word (نص قابل للتعديل)',wordHint:'Word كيعتمد على OCR، وممكن ما يحافظش على الجداول والتنسيق والصور.',longHint:'الصورة الطويلة كتجمع الصفحات عمودياً، حتى 12 صفحة.',direct:'نقل مباشر',link:'رابط / نقل مباشر',noCloud:'ما كننشئوش رابط عام بلا خادم. النقل المباشر كيستعمل رمز الربط بين جوج أجهزة.',shareFile:'مشاركة الملف',shareLink:'إرسال لجهاز آخر',rename:'تبديل الاسم',copy:'نسخ',move:'نقل',folder:'المجلد الهدف',root:'وثائقي',work:'العمل',personal:'شخصي',archive:'الأرشيف',qualityHint:'الضغط يمكن ينقص من وضوح الصور.',asIs:'احتفظ بالأصل',preview:'معاينة',imageCount:'صفحات',compress:'ضغط',menuActions:'العمليات',ready:'جاهز للمشاركة',first:'الملفات المختارة',files:'ملفات'},
    fr:{long:'Image longue',word:'Word (texte modifiable)',wordHint:'Word utilise OCR : tableaux, images et mise en page peuvent changer.',longHint:'Assemble les pages verticalement, 12 max.',direct:'Transfert direct',link:'Lien / transfert',noCloud:'Pas de lien public sans serveur. Appairez deux appareils avec un code.',shareFile:'Partager fichier',shareLink:'Envoyer à un appareil',rename:'Renommer',copy:'Copier',move:'Déplacer',folder:'Dossier cible',root:'Mes documents',work:'Travail',personal:'Personnel',archive:'Archives',qualityHint:'La compression peut réduire la netteté.',asIs:'Original',preview:'Aperçu',imageCount:'pages',compress:'Compresser',menuActions:'Actions',ready:'Prêt à partager',first:'Fichiers sélectionnés',files:'fichiers'},
    es:{long:'Imagen larga',word:'Word (texto editable)',wordHint:'Word usa OCR; el formato y las tablas pueden cambiar.',longHint:'Combina hasta 12 páginas verticalmente.',direct:'Transferencia directa',link:'Enlace / directo',noCloud:'Sin servidor no hay enlace público. Empareja dispositivos con un código.',shareFile:'Compartir archivo',shareLink:'Enviar a dispositivo',rename:'Renombrar',copy:'Copiar',move:'Mover',folder:'Carpeta',root:'Documentos',work:'Trabajo',personal:'Personal',archive:'Archivo',qualityHint:'La compresión puede reducir la nitidez.',asIs:'Original',preview:'Vista previa',imageCount:'páginas',compress:'Comprimir',menuActions:'Acciones',ready:'Listo',first:'Archivos seleccionados',files:'archivos'},
    de:{long:'Langes Bild',word:'Word (bearbeitbarer Text)',wordHint:'Word nutzt OCR; Layout und Tabellen können abweichen.',longHint:'Max. 12 Seiten untereinander.',direct:'Direkt übertragen',link:'Link / Direkt',noCloud:'Kein öffentlicher Link ohne Server. Geräte per Code koppeln.',shareFile:'Datei teilen',shareLink:'An Gerät senden',rename:'Umbenennen',copy:'Kopieren',move:'Verschieben',folder:'Zielordner',root:'Dokumente',work:'Arbeit',personal:'Privat',archive:'Archiv',qualityHint:'Komprimierung kann Schärfe reduzieren.',asIs:'Original',preview:'Vorschau',imageCount:'Seiten',compress:'Komprimieren',menuActions:'Aktionen',ready:'Bereit',first:'Ausgewählte Dateien',files:'Dateien'},
    pt:{long:'Imagem longa',word:'Word (texto editável)',wordHint:'Word usa OCR; formatação e tabelas podem mudar.',longHint:'Até 12 páginas na vertical.',direct:'Transferência direta',link:'Link / direto',noCloud:'Sem servidor não há link público. Emparelhe com código.',shareFile:'Partilhar ficheiro',shareLink:'Enviar a dispositivo',rename:'Renomear',copy:'Copiar',move:'Mover',folder:'Pasta de destino',root:'Documentos',work:'Trabalho',personal:'Pessoal',archive:'Arquivo',qualityHint:'Compressão pode reduzir a nitidez.',asIs:'Original',preview:'Prévia',imageCount:'páginas',compress:'Comprimir',menuActions:'Ações',ready:'Pronto',first:'Ficheiros selecionados',files:'ficheiros'},
    it:{long:'Immagine lunga',word:'Word (testo modificabile)',wordHint:'Word usa OCR; impaginazione e tabelle possono cambiare.',longHint:'Fino a 12 pagine verticali.',direct:'Trasferimento diretto',link:'Link / diretto',noCloud:'Nessun link pubblico senza server. Collega i dispositivi con codice.',shareFile:'Condividi file',shareLink:'Invia a dispositivo',rename:'Rinomina',copy:'Copia',move:'Sposta',folder:'Cartella',root:'Documenti',work:'Lavoro',personal:'Personale',archive:'Archivio',qualityHint:'Compressione può ridurre nitidezza.',asIs:'Originale',preview:'Anteprima',imageCount:'pagine',compress:'Comprimi',menuActions:'Azioni',ready:'Pronto',first:'File selezionati',files:'file'}
  };
  const t=key=>{
    const item=extraWords[getLanguage()]?.[key];
    return item||((translations[getLanguage()]||translations.en)[keys.indexOf(key)]||key);
  };
  const size=bytes=>bytes<1024?bytes+' B':bytes<1048576?(bytes/1024).toFixed(1)+' KB':(bytes/1048576).toFixed(1)+' MB';
  const selectedDocs=()=>[...selected].map(uri=>getItems().find(doc=>doc.uri===uri)).filter(Boolean);
  const chosen=doc=>selected.has(doc.uri);
  function toolbar(){
    if(!mode)return '';
    const items=selectedDocs(),total=items.reduce((sum,d)=>sum+(d.size||0),0);
    return `<div class="library-selection-toolbar" role="group" aria-label="${t('select')}">
      <strong>${items.length} ${t('selected')}</strong><small>${size(total)}</small>
      <div class="bulk-secondary"><button data-bulk="all">${t('all')}</button><button data-bulk="invert">${t('invert')}</button><button data-bulk="cancel">${t('cancel')}</button></div>
      <div class="bulk-actions" role="toolbar" aria-label="${t('menuActions')}">
        <button data-bulk="share" ${items.length?'':'disabled'}><span aria-hidden="true">↗</span> ${t('share')}</button>
        <button data-bulk="organize" ${items.length?'':'disabled'}><span aria-hidden="true">▣</span> ${t('move')} / ${t('copy')}</button>
        <button data-bulk="rename" ${items.length===1?'':'disabled'}><span aria-hidden="true">✎</span> ${t('rename')}</button>
        <button data-bulk="delete" ${items.length?'':'disabled'}><span aria-hidden="true">⌫</span> ${t('delete')}</button>
        <button data-bulk="merge" ${items.length>1?'':'disabled'}><span aria-hidden="true">⋯</span> ${t('merge')}</button>
      </div>
    </div>`;
  }
  function checkbox(doc,index){
    if(!mode)return '';
    return `<input type="checkbox" class="doc-select-box" data-doc-select="${index}" aria-label="${t('select')}" ${chosen(doc)?'checked':''}>`;
  }
  function clear(){mode=false;selected.clear();document.body.classList.remove('rivo-multiselect');}
  function prune(){const known=new Set(getItems().map(x=>x.uri));for(const uri of selected)if(!known.has(uri))selected.delete(uri);if(!selected.size)mode=false;}
  function sync(){
    document.body.classList.toggle('rivo-multiselect',mode);
    for(const slotId of ['library-selection-root','home-selection-root']){
      const slot=document.getElementById(slotId);
      if(slot)slot.innerHTML=toolbar();
    }
    for(const rootId of ['library-list','home-recents']){
    const root=document.getElementById(rootId);
    if(root){
      for(const row of root.querySelectorAll('.document-entry[data-doc-open],.recent-entry[data-doc-open]')){
        const doc=getItems()[Number(row.dataset.docOpen)];
        row.classList.toggle('doc-selected',!!doc&&chosen(doc));
        row.setAttribute('aria-selected',String(!!doc&&chosen(doc)));
        const existing=row.querySelector('.doc-select-box');
        const alwaysVisible=rootId==='home-recents';
        if(mode&&!existing){
          const div=document.createElement('div');div.innerHTML=doc?checkbox(doc,Number(row.dataset.docOpen)):'';
          if(div.firstElementChild)row.prepend(div.firstElementChild);
        } else if(!mode&&existing&&!alwaysVisible)existing.remove();
        else if(existing)existing.checked=!!doc&&chosen(doc);
      }
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
        <button data-menu="rename">${t('rename')}</button>
        <button data-menu="copy">${t('copy')}</button>
        <button data-menu="select">${chosen(doc)?t('remove'):t('add')}</button>
      </div>`);
    root.addEventListener('click',async e=>{
      const action=e.target.closest('[data-menu]')?.dataset.menu;if(!action)return;
      closeSheet();
      if(action==='select'){toggle(doc);return;}
      if(action==='preview'){await onPreview(doc);return;}
      if(action==='rename'){await onRename?.(doc);return;}
      if(action==='copy'){organize([doc],'copy');return;}
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
        timer=null;suppressUntil=Date.now()+900;
        if(root.id==='home-recents')onOpenLibrary?.();
        longPress(pressed);
        try{navigator.vibrate?.(25)}catch{}
      },550);
    });
    root.addEventListener('pointermove',e=>{if(Math.hypot(e.clientX-startX,e.clientY-startY)>12)stop()});
    for(const name of ['pointerup','pointercancel','pointerleave'])root.addEventListener(name,stop);
    root.addEventListener('contextmenu',e=>{
      const row=e.target.closest('[data-doc-open]');
      if(row&&root.contains(row)){
        e.preventDefault();suppressUntil=Date.now()+900;
        const doc=getItems()[Number(row.dataset.docOpen)];
        if(root.id==='home-recents')onOpenLibrary?.();
        longPress(doc);
      }
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
  async function loadCanvas(file){const uri=URL.createObjectURL(file);try{
    const img=await new Promise((resolve,reject)=>{const e=new Image();e.onload=()=>resolve(e);e.onerror=reject;e.src=uri});
    const ratio=Math.min(1,2400/Math.max(img.naturalWidth,img.naturalHeight));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));
    const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(img,0,0,canvas.width,canvas.height);return canvas;
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
    const safe=x=>String(x||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const names=docs.slice(0,3).map(d=>`<li>${safe(d.name)}</li>`).join('');
    const root=sheet(`<div class="bulk-sheet-title"><strong>${docs.length} ${t('files')} · ${t('share')}</strong><button data-close-sheet aria-label="${t('cancel')}">✕</button></div>
      <div class="rivo-share-tabs" role="tablist">
        <button type="button" class="active" data-share-tab="file">${t('shareFile')}</button>
        <button type="button" data-share-tab="direct">${t('link')}</button>
      </div>
      <div class="rivo-share-file-pane">
        <div class="rivo-share-preview"><div class="rivo-share-paper">▤</div><div><strong>${t('first')}</strong>
          <ul>${names}</ul>${docs.length>3?`<small>+ ${docs.length-3} ${t('files')}</small>`:''}</div></div>
        <label class="bulk-field">${t('format')}
          <select name="bulk-format"><option value="pdf">${t('pdf')}</option>
          <option value="image">${t('images')}</option><option value="long">${t('long')}</option>
          <option value="word">${t('word')}</option></select></label>
        <label class="bulk-field">${t('quality')}
          <select name="bulk-quality"><option value="original">${t('original')}</option>
            <option value="balanced">${t('balanced')}</option><option value="small">${t('small')}</option></select></label>
        <p class="bulk-note" data-share-note>${t('loss')}</p>
        <button class="bulk-share-confirm" data-share-confirm>${t('send')}</button>
      </div>
      <div class="rivo-share-direct-pane" hidden><p class="bulk-note">${t('noCloud')}</p>
        <button class="bulk-share-confirm" data-direct-transfer>${t('direct')}</button></div>`);
    const filePane=root.querySelector('.rivo-share-file-pane');
    const directPane=root.querySelector('.rivo-share-direct-pane');
    root.querySelectorAll('[data-share-tab]').forEach(button=>button.addEventListener('click',()=>{
      const direct=button.dataset.shareTab==='direct';
      root.querySelectorAll('[data-share-tab]').forEach(b=>b.classList.toggle('active',b===button));
      filePane.hidden=direct;directPane.hidden=!direct;
    }));
    const formatSelect=root.querySelector('[name="bulk-format"]');
    const qualitySelect=root.querySelector('[name="bulk-quality"]');
    const note=root.querySelector('[data-share-note]');
    formatSelect.addEventListener('change',()=>{
      const format=formatSelect.value;
      note.textContent=format==='word'?t('wordHint'):format==='long'?t('longHint'):t('loss');
      qualitySelect.disabled=format==='word';
    });
    root.querySelector('[data-direct-transfer]').addEventListener('click',()=>{
      closeSheet();onDirectTransfer?.(docs);
    });
    root.querySelector('[data-share-confirm]').addEventListener('click',async()=>{
      const format=formatSelect.value,q=qualitySelect.value;closeSheet();
      showBusy(t('preparing'));
      try{
        let uris,mime;
        if(format==='pdf'&&q==='original'&&docs.every(isPDF)){
          uris=docs.map(doc=>doc.uri);mime='application/pdf';
        }else if(format==='image'&&q==='original'&&docs.every(doc=>String(doc.mimeType||'').toLowerCase()==='image/jpeg'||String(doc.name||'').toLowerCase().endsWith('.jpg')||String(doc.name||'').toLowerCase().endsWith('.jpeg'))){
          uris=docs.map(doc=>doc.uri);mime='image/jpeg';
        }else if(format==='pdf'){
          const bytes=await createMergedPDF(docs,q);
          const file=await saveOut(bytes,`RivoScan_Shared_${Date.now()}.pdf`,'application/pdf');
          uris=[file.uri];mime='application/pdf';
        }else if(format==='long'){
          const bytes=await makeLongImage(docs,q,fileFromDocument,isPDF,num=>progress(`${t('preparing')} ${num}`));
          const saved=await saveOut(bytes,`RivoScan_Long_${Date.now()}.jpg`,'image/jpeg');
          uris=[saved.uri];mime='image/jpeg';
        }else if(format==='word'){
          const bytes=await makeWordText(docs,fileFromDocument,isPDF,(now,total)=>progress(`${t('preparing')} ${now}/${total}`),'eng');
          const saved=await saveOut(bytes,`RivoScan_Text_${Date.now()}.docx`,'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
          uris=[saved.uri];mime='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        }else{
          uris=await createJpgs(docs,q);mime='image/jpeg';
          await onRefresh();
        }
        await bridge.shareFiles({uris,mimeType:mime});
      }catch(error){console.error(error);toast(error?.message||t('stop'),true);}
      finally{clearBusy();}
    });
  }
  function organize(docs,defaultType='copy'){
    if(!docs?.length){toast(t('none'),true);return;}
    const root=sheet(`<div class="bulk-sheet-title"><strong>${t('move')} / ${t('copy')} · ${docs.length}</strong><button data-close-sheet>✕</button></div>
      <label class="bulk-field">${t('menuActions')}<select name="bulk-file-operation">
        <option value="copy" ${defaultType==='copy'?'selected':''}>${t('copy')}</option>
        <option value="move" ${defaultType==='move'?'selected':''}>${t('move')}</option></select></label>
      <label class="bulk-field">${t('folder')}<select name="bulk-destination">
        <option value="">${t('root')}</option><option value="Work">${t('work')}</option>
        <option value="Personal">${t('personal')}</option><option value="Archive">${t('archive')}</option></select></label>
      <p class="bulk-note">${t('info')}</p>
      <button class="bulk-share-confirm" data-organize-confirm>${t('ready')}</button>`);
    root.querySelector('[data-organize-confirm]').addEventListener('click',async()=>{
      const move=root.querySelector('[name="bulk-file-operation"]').value==='move';
      const folder=root.querySelector('[name="bulk-destination"]').value;
      closeSheet();
      showBusy(t('preparing'));
      let completed=0;
      try{
        for(const doc of docs){
          progress(`${move?t('move'):t('copy')} ${completed+1}/${docs.length}`);
          await bridge.organizeFile({uri:doc.uri,folder,move});
          if(move)selected.delete(doc.uri);
          completed++;
        }
        await onRefresh();prune();sync();
        toast(`${completed} ${t('done')}`);
      }catch(error){
        await onRefresh();prune();sync();
        toast(`${completed}/${docs.length} · ${error?.message||t('stop')}`,true);
      }finally{clearBusy();}
    });
  }
  async function savePdf(docs){
    if(!docs?.length){toast(t('none'),true);return;}
    showBusy(t('preparing'));
    try{
      const bytes=await createMergedPDF(docs,'original');
      await saveOut(bytes,`RivoScan_Export_${Date.now()}.pdf`,'application/pdf');
      await onRefresh();
      toast(t('done'));
    }catch(error){console.error(error);toast(error?.message||t('stop'),true);}
    finally{clearBusy();}
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
    if(name==='organize')organize(docs);
    if(name==='rename'&&docs.length===1)await onRename?.(docs[0]);
  }
  function wireToolbar(root){
    root?.addEventListener('click',e=>{
      const button=e.target.closest('[data-bulk]');if(button)action(button.dataset.bulk);
    });
  }
  return {t,toolbar,checkbox,mode:()=>mode,chosen,toggle,clear,prune,sync,longPress,wireLongPress,suppressClick,share,savePdf,organize,action,wireToolbar};
}
