import {materialSymbol} from './material-symbols.js';
import {perfectScanRGBA,assessDocumentQualityRGBA,inspectInkChanges} from './perfect-scan-core.js';
import {PDFDocument} from 'pdf-lib';
import {reviewPerfectScanCapture} from './perfectscan-capture-review.js';

const dict={
 en:{title:'PerfectScan Pro',subtitle:'Improve paper clarity, straighten folds and reduce shadows on your device.',base:'Source photo',add:'Add shots',capture:'Capture another angle',process:'Apply correction',compare:'Hold to compare original',original:'Original photo',processed:'Enhanced copy',save:'Save PDF',cancel:'Close',privacy:'Processed locally. Only one PDF is saved; no image or JSON copies.',tip:'Use 2–4 photos of the SAME document, with matching framing. Slightly change lighting or angle. Unmatched photos are rejected.',none:'Choose a source photo first.',choosing:'Choose document photo',ready:'Ready to enhance',working:'Checking alignment and correcting paper...',review:'Please review ALL text, stamps and signatures before saving.',saved:'PerfectScan PDF saved.',failed:'Unable to process this document.',geometry:'Correct curved printed lines (2D)',quality:'Contrast safe; strongly folded/missing text cannot be recovered.',frames:'Additional photos',rejected:'Photos rejected (misalignment)',manual:'Manual review required',clean:'Safety checks passed; review still recommended'},
 ar:{title:'PerfectScan Pro',subtitle:'حسّن وضوح الورقة، صحّح الانحناء وخفّف الظلال على هاتفك.',base:'الصورة الأصلية',add:'إضافة صور',capture:'التقط صورة من زاوية أخرى',process:'تطبيق التصحيح',compare:'اضغط مطولًا لعرض الأصل',original:'الصورة الأصلية',processed:'الصورة المحسنة',save:'حفظ PDF',cancel:'إغلاق',privacy:'المعالجة على هاتفك. يتحفظ PDF واحد فقط، بلا صور أو JSON إضافية.',tip:'التقط من صورتين إلى أربع صور للمستند نفسه وبالتأطير ذاته مع اختلاف طفيف في الإضاءة أو الزاوية. لن تُستخدم الصور غير المتطابقة.',none:'اختر الصورة الأصلية أولًا.',choosing:'اختار صورة الوثيقة',ready:'الصور واجدة',working:'كنتحققو من التطابق وكنقوّمو الورقة…',review:'راجع النصوص والكاشيات والتواقيع كاملين قبل الحفظ.',saved:'تحفظ ملف PDF واحد ديال الوثيقة المصححة.',failed:'ما قدرناش نعالجو الوثيقة.',geometry:'تقويم انحناء السطور (2D)',quality:'التجاعيد العميقة والحروف المفقودة ماشي مضمون نصلحوها.',frames:'صور إضافية',rejected:'صور مرفوضة (ما متطابقاش)',manual:'خاص مراجعة',clean:'فحص الحبر جيد، والمراجعة لازمة'},
 fr:{title:'Advanced document correction',subtitle:'Améliorez la lisibilité et redressez les documents sur votre appareil.',base:'Photo source',add:'Ajouter des prises',capture:'Autre angle',process:'Appliquer la correction',compare:'Maintenir pour comparer',original:'Original',processed:'Copie améliorée',save:'Enregistrer PDF',cancel:'Fermer',privacy:'Traitement local. Un seul PDF, sans images ni JSON supplémentaires.',tip:'2 à 4 photos du MÊME document avec cadrage similaire.',none:'Sélectionnez la photo source.',choosing:'Choisir photo',ready:'Prêt',working:'Alignement et nettoyage...',review:'Vérifiez le texte, les cachets et signatures.',saved:'PDF PerfectScan enregistré.',failed:'Traitement impossible.',geometry:'Redresser lignes courbes (2D)',quality:'Plis profonds et texte manquant non récupérables.',frames:'Autres prises',rejected:'Prises rejetées',manual:'Vérification manuelle',clean:'Tests de couleur et encre réussis; vérifiez'},
 es:{title:'Advanced document correction',subtitle:'Mejora la legibilidad y endereza los documentos en tu dispositivo.',base:'Foto original',add:'Añadir fotos',capture:'Otra toma',process:'Aplicar corrección',compare:'Mantener para comparar',original:'Original',processed:'Mejorada',save:'Guardar PDF',cancel:'Cerrar',privacy:'Procesamiento local. Solo se guarda un PDF, sin JPG ni JSON.',tip:'Use 2–4 fotos del MISMO papel con encuadre similar.',none:'Elija una foto.',choosing:'Elegir foto',ready:'Lista',working:'Alineando y corrigiendo...',review:'Revise texto, sellos y firmas.',saved:'PDF PerfectScan guardado.',failed:'No se pudo procesar.',geometry:'Corregir líneas curvas (2D)',quality:'No recupera tinta perdida ni pliegues profundos.',frames:'Fotos añadidas',rejected:'Fotos rechazadas',manual:'Revisión requerida',clean:'Comprobación pasada; revise'},
 de:{title:'Advanced document correction',subtitle:'Dokumente auf dem Gerät begradigen und besser lesbar machen.',base:'Originalfoto',add:'Aufnahmen hinzufügen',capture:'Weiteren Winkel aufnehmen',process:'Apply correction',compare:'Halten zum Vergleich',original:'Original',processed:'Bearbeitet',save:'PDF speichern',cancel:'Schließen',privacy:'Lokale Verarbeitung. Nur eine PDF, keine JPG- oder JSON-Dateien.',tip:'2–4 Aufnahmen desselben Dokuments bei ähnlicher Ausrichtung.',none:'Foto auswählen.',choosing:'Foto auswählen',ready:'Bereit',working:'Ausrichten und bereinigen...',review:'Text, Stempel und Unterschriften prüfen.',saved:'PerfectScan PDF gespeichert.',failed:'Bearbeitung nicht möglich.',geometry:'Gekrümmte Zeilen korrigieren (2D)',quality:'Keine Wiederherstellung fehlender Schrift.',frames:'Weitere Fotos',rejected:'Abgewiesene Fotos',manual:'Bitte prüfen',clean:'Prüfung erfolgreich; bitte prüfen'},
 pt:{title:'Advanced document correction',subtitle:'Melhore a leitura e endireite documentos no dispositivo.',base:'Foto original',add:'Adicionar fotos',capture:'Capturar outro ângulo',process:'✦ PerfectScan',compare:'Manter para comparar',original:'Original',processed:'Melhorada',save:'Guardar PDF',cancel:'Fechar',privacy:'Processamento local. Guarda apenas um PDF, sem JPG nem JSON.',tip:'Use 2–4 fotos do MESMO documento com enquadramento semelhante.',none:'Escolha a foto.',choosing:'Escolher foto',ready:'Pronto',working:'A alinhar e limpar...',review:'Confira texto, carimbos e assinaturas.',saved:'PDF PerfectScan guardado.',failed:'Não foi possível processar.',geometry:'Corrigir linhas curvas (2D)',quality:'Não recupera texto perdido.',frames:'Fotos extras',rejected:'Fotos rejeitadas',manual:'Verificação necessária',clean:'Verificação aprovada; revise'},
 it:{title:'Advanced document correction',subtitle:'Migliora la leggibilità e raddrizza i documenti sul dispositivo.',base:'Foto originale',add:'Aggiungi foto',capture:'Altro angolo',process:'✦ PerfectScan',compare:'Tieni premuto per confrontare',original:'Originale',processed:'Migliorata',save:'Salva PDF',cancel:'Chiudi',privacy:'Elaborazione locale. Un solo PDF, senza JPG o JSON.',tip:'2–4 scatti dello STESSO documento con inquadratura simile.',none:'Scegli prima una foto.',choosing:'Scegli foto',ready:'Pronto',working:'Allineamento e pulizia...',review:'Controlla testo, timbri e firme.',saved:'PDF PerfectScan salvato.',failed:'Impossibile elaborare.',geometry:'Correggi righe curve (2D)',quality:'Non recupera testo mancante.',frames:'Scatti extra',rejected:'Foto rifiutate',manual:'Da controllare',clean:'Controlli superati; verificare'}
};
const qualityLabels={
 en:'Quality review',ar:'مراجعة جودة الصورة',fr:'Vérification qualité',
 es:'Revisar calidad',de:'Qualitätsprüfung',pt:'Revisão da qualidade',it:'Controllo qualità'
};
const toBytes=base64=>{const bin=atob(base64);const a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return a};
const sha256=async bytes=>{
 if(typeof crypto==='undefined'||!crypto.subtle)return null;
 const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
 return Array.from(hash,b=>b.toString(16).padStart(2,'0')).join('');
};
const imageCanvas=async(blob,size=null)=>{
 const uri=URL.createObjectURL(blob);
 try{
  const image=await new Promise((resolve,reject)=>{
   const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Unreadable document photo'));img.src=uri;
  });
  const ratio=size?Math.min(size.width/image.naturalWidth,size.height/image.naturalHeight):
   Math.min(1,2100/Math.max(image.naturalWidth,image.naturalHeight),Math.sqrt(4800000/(image.naturalWidth*image.naturalHeight)));
  if(size&&Math.abs(image.naturalWidth/image.naturalHeight-size.width/size.height)>.035)
   throw Error('Extra photo has a different crop. Capture the same whole page.');
  const width=size?size.width:Math.max(1,Math.round(image.naturalWidth*ratio));
  const height=size?size.height:Math.max(1,Math.round(image.naturalHeight*ratio));
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.drawImage(image,0,0,width,height);
  return canvas;
 }finally{URL.revokeObjectURL(uri);}
};
const asJpeg=canvas=>new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('JPEG encoding failed')),'image/jpeg',.96));

const nativeModeLabels={
 en:{uvdoc:'Straighten curved paper · offline',surface:'Combine 2–4 camera angles (experimental)'},
 ar:{uvdoc:'تقويم الورق المنحني بلا إنترنت',surface:'دمج 2–4 صور من زوايا مختلفة (تجريبي)'},
 fr:{uvdoc:'Redresser le papier · hors connexion',surface:'Combiner 2 à 4 photos (expérimental)'},
 es:{uvdoc:'Enderezar papel curvado sin conexión',surface:'Combinar 2 a 4 fotos (experimental)'},
 de:{uvdoc:'Gebogenes Papier offline begradigen',surface:'2–4 Fotos kombinieren (experimentell)'},
 pt:{uvdoc:'Endireitar papel offline',surface:'Combinar 2–4 fotos (experimental)'},
 it:{uvdoc:'Raddrizza la carta offline',surface:'Combina 2–4 foto (sperimentale)'}
};

/** Experimental multi-angle correction is a utility in Scan settings, not a separate scanner. */
export async function openPerfectScan({doc=null,bridge,getLanguage=()=> 'en',onSave,onRefresh=async()=>{},notify=()=>{},onUVDoc=null,onSurface3D=null}){
 const lang=getLanguage(),t=dict[lang]||dict.en;
 // Advanced correction is part of the single Scan workspace, not a second scanner.
 const modeTitle=t.title;
 const onboarding=({
  en:{camera:'Take photo',hint:'Choose a document photo or take one to start. Then select a correction method.'},
  ar:{camera:'صوّر الوثيقة',hint:'اختر صورة المستند أو التقط صورة أولًا، ثم اختر طريقة التصحيح.'},
  fr:{camera:'Prendre une photo',hint:'Choisissez une photo ou photographiez le document, puis choisissez la correction.'},
  es:{camera:'Tomar foto',hint:'Selecciona o toma una foto del documento, luego elige cómo corregirla.'},
  de:{camera:'Foto aufnehmen',hint:'Wählen oder fotografieren Sie zuerst das Dokument und dann die Korrektur.'},
  pt:{camera:'Tirar foto',hint:'Escolha ou fotografe o documento primeiro e depois selecione a correção.'},
  it:{camera:'Scatta foto',hint:'Scegli o scatta una foto del documento, poi seleziona la correzione.'}
 })[lang]||{camera:'Take photo',hint:'Choose or take a document photo to start.'};
 const root=document.createElement('div');root.className='rivo-perfectscan-overlay';
 root.dir=lang==='ar'?'rtl':'ltr';
 root.innerHTML='<section class="rivo-perfectscan-modal" role="dialog" aria-modal="true" aria-label="'+modeTitle+'">'+
 '<header><div><strong>'+modeTitle+'</strong><small>'+t.subtitle+'</small></div><button type="button" data-perfect="close" aria-label="'+t.cancel+'">'+materialSymbol('close',20)+'</button></header>'+
 '<div class="rivo-perfectscan-toolbar">'+
 '<button type="button" data-perfect="base">'+t.choosing+'</button>'+
 '<button type="button" data-perfect="add" hidden disabled>'+t.add+'</button>'+
 '<button type="button" data-perfect="camera">'+onboarding.camera+'</button>'+
'</div>'+
 '<input class="rivo-perfect-file" type="file" accept="image/*" hidden>'+
 '<input class="rivo-perfect-extras" type="file" accept="image/*" multiple hidden>'+
 '<input class="rivo-perfect-camera" type="file" accept="image/*" capture="environment" hidden>'+
 '<p class="rivo-perfectscan-tip" hidden>'+t.tip+'</p>'+
 '<div class="rivo-perfectscan-empty" role="status"><span aria-hidden="true" class="rivo-perfectscan-empty-icon">'+materialSymbol('file',28)+'</span><p>'+onboarding.hint+'</p></div>'+
 '<div class="rivo-perfectscan-preview" hidden role="group" aria-label="'+t.original+'"><canvas role="img" aria-label="'+t.original+'"></canvas><span class="rivo-perfectscan-tag">'+t.original+'</span>'+'<input type="range" class="rivo-perfect-compare-range" min="0" max="100" value="52" hidden aria-label="Before/after comparison"></div>'+
 '<div class="rivo-perfectscan-control" hidden>'+
 '<label class="rivo-scan-method"><span>'+({en:'Correction method',ar:'طريقة التصحيح',fr:'Méthode de correction',
 es:'Método de corrección',de:'Korrekturmethode',pt:'Método de correção',
 it:'Metodo di correzione'})[lang]+'</span><select data-perfect-mode aria-label="Correction method">'+
 (onUVDoc?'<option value="uvdoc">'+(nativeModeLabels[lang]||nativeModeLabels.en).uvdoc+'</option>':'')+
 '<option value="enhance">'+({en:'Enhance text and contrast (recommended)',ar:'تحسين وضوح النص والتباين (مقترح)',fr:'Améliorer la lisibilité (recommandé)',es:'Mejorar legibilidad (recomendado)',de:'Text und Kontrast optimieren (empfohlen)',pt:'Melhorar a legibilidade (recomendado)',it:'Migliora la leggibilità (consigliato)'})[lang]+'</option>'+
 '<option value="geometry">'+t.geometry+'</option>'+
 (onSurface3D?'<option value="surface3d">'+(nativeModeLabels[lang]||nativeModeLabels.en).surface+'</option>':'')+
 '</select></label>'+
 '<button data-perfect="compare" hidden disabled>'+t.compare+'</button></div>'+
 '<p class="rivo-perfectscan-status" role="status" hidden>'+t.none+'</p>'+
 '<p class="rivo-perfectscan-warning" hidden>'+t.quality+'</p>'+
 '<footer class="rivo-perfectscan-actions" hidden><button data-perfect="process" disabled>'+t.process+'</button>'+
 '<button data-perfect="save" hidden disabled>'+t.save+'</button></footer>'+
 '<p class="rivo-perfectscan-privacy">'+t.privacy+'</p></section>';
 document.body.appendChild(root);
 const sourceInput=root.querySelector('.rivo-perfect-file'),extrasInput=root.querySelector('.rivo-perfect-extras'),cameraInput=root.querySelector('.rivo-perfect-camera');
 const canvas=root.querySelector('.rivo-perfectscan-preview canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
 const status=root.querySelector('.rivo-perfectscan-status');
 const tag=root.querySelector('.rivo-perfectscan-tag');
 const save=root.querySelector('[data-perfect="save"]'),process=root.querySelector('[data-perfect="process"]');
 const compare=root.querySelector('[data-perfect="compare"]');
 const actions=root.querySelector('.rivo-perfectscan-actions');
 const preview=root.querySelector('.rivo-perfectscan-preview');
 // Shared preview-first pattern: gear opens only the relevant task's controls.
 const modal=root.querySelector('.rivo-perfectscan-modal');
 modal.classList.add('rivo-preview-first-dialog');
 const header=modal.querySelector('header');
 const gear=document.createElement('button');gear.type='button';
 gear.className='rivo-workspace-settings-toggle';gear.innerHTML=materialSymbol('settings',21);
 gear.setAttribute('aria-label',({ar:'إعدادات الصورة',fr:'Réglages',en:'Image settings'})[lang]||'Settings');
 gear.setAttribute('aria-expanded','false');
 header.insertBefore(gear,header.lastElementChild);
 const settingsScroll=document.createElement('div');
 settingsScroll.className='rivo-edit-settings-scroll rivo-workspace-settings';
 const tabs=document.createElement('div');tabs.className='rivo-workspace-taskbar';
 const groups={};
 const names={
  source:({ar:'الصور',fr:'Photos',en:'Photos'})[lang]||'Photos',
  correction:({ar:'التصحيح',fr:'Correction',en:'Correction'})[lang]||'Correction'
 };
 let task='source',drawerOpen=false;
 const buttons={};
 for(const name of ['source','correction']){
  const button=document.createElement('button');button.type='button';
  button.className='rivo-workspace-task';button.innerHTML=materialSymbol(name==='source'?'source':'magic',18)+'<span>'+names[name]+'</span>';
  button.addEventListener('click',()=>chooseTask(name));
  button.dataset.perfectTask=name;tabs.append(button);buttons[name]=button;
  const group=document.createElement('div');group.className='rivo-workspace-task-panel';
  group.hidden=true;groups[name]=group;
 }
 groups.source.append(modal.querySelector('.rivo-perfectscan-toolbar'),modal.querySelector('.rivo-perfectscan-tip'));
 const diagnostics=document.createElement('details');
 diagnostics.className='rivo-perfectscan-diagnostics';diagnostics.hidden=true;
 const diagnosticTitle=document.createElement('summary');
 diagnosticTitle.textContent=({en:'Processing details',ar:'تفاصيل المعالجة',fr:'Détails du traitement',
  es:'Detalles del proceso',de:'Verarbeitungsdetails',pt:'Detalhes do processamento',it:'Dettagli elaborazione'})[lang]||'Processing details';
 const diagnosticBody=document.createElement('p');diagnostics.append(diagnosticTitle,diagnosticBody);
 groups.correction.append(modal.querySelector('.rivo-perfectscan-control'),diagnostics,modal.querySelector('.rivo-perfectscan-warning'),modal.querySelector('.rivo-perfectscan-privacy'));
 settingsScroll.append(tabs,groups.source,groups.correction);
 modal.insertBefore(settingsScroll,actions);
 actions.classList.add('rivo-edit-bottom-bar');
 const chooseTask=name=>{
  if(name==='correction'&&!base)return;
  task=name;
  for(const id of Object.keys(groups)){
   groups[id].hidden=id!==name;
   buttons[id].classList.toggle('active',id===name);
   buttons[id].setAttribute('aria-pressed',String(id===name));
  }
  buttons.correction.disabled=!base;
 };
 const openSettings=open=>{
  drawerOpen=!!open;settingsScroll.hidden=!drawerOpen;
  gear.classList.toggle('active',drawerOpen);
  gear.setAttribute('aria-expanded',String(drawerOpen));
 };
 gear.addEventListener('click',()=>openSettings(!drawerOpen));
 // App starts with photo input; opening a photo closes the drawer for maximum preview.
 // Comparison is a deliberate opt-in preview action, never the default image.
 preview.append(compare);
 compare.classList.add('rivo-perfect-preview-compare');
 compare.textContent=({en:'Compare',ar:'مقارنة',fr:'Comparer',es:'Comparar',
  de:'Vergleichen',pt:'Comparar',it:'Confronta'})[lang]||'Compare';
 compare.setAttribute('aria-pressed','false');
 const compareRange=root.querySelector('.rivo-perfect-compare-range');
 let base=null,extra=[],result=null,closed=false,working=false,compareLayers=null,captureReviewPending=false;
 let compareActive=false;
 tag.hidden=true;
 chooseTask('source');openSettings(true);
 const setStatus=(message,alert=false)=>{status.hidden=false;status.textContent=message;status.classList.toggle('rivo-warning',alert)};
 const close=()=>{if(closed||captureReviewPending)return;closed=true;root.remove()};
 const previewPixels=(rgba,w,h,label)=>{
  if(closed)return;
  preview.hidden=false;
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
  const data=ctx.createImageData(w,h);data.data.set(rgba);ctx.putImageData(data,0,0);tag.textContent=label;
 };
 const splitPreview=()=>{
  if(!base||!result||closed)return;
  if(!compareLayers){
   const makeLayer=pixels=>{
    const layer=document.createElement('canvas');layer.width=base.width;layer.height=base.height;
    const layerContext=layer.getContext('2d');const image=layerContext.createImageData(base.width,base.height);
    image.data.set(pixels);layerContext.putImageData(image,0,0);return layer;
   };
   compareLayers={before:makeLayer(base.data),after:makeLayer(result.pixels)};
  }
  const ratio=Number(compareRange.value)/100,edge=Math.max(0,Math.min(canvas.width,ratio*canvas.width));
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(compareLayers.before,0,0);
  ctx.save();ctx.beginPath();ctx.rect(edge,0,canvas.width-edge,canvas.height);ctx.clip();
  ctx.drawImage(compareLayers.after,0,0);ctx.restore();
  ctx.save();ctx.strokeStyle='#26A6F5';ctx.lineWidth=Math.max(3,canvas.width/550);
  ctx.beginPath();ctx.moveTo(edge,0);ctx.lineTo(edge,canvas.height);ctx.stroke();ctx.restore();
  preview.classList.add('rivo-perfect-split-active');
  tag.hidden=false;
  tag.textContent=t.original+' / '+t.processed;
 };
 const setCompareMode=active=>{
  compareActive=Boolean(active&&result&&!closed);
  compareRange.hidden=!compareActive;
  compare.setAttribute('aria-pressed',String(compareActive));
  compare.textContent=compareActive
   ?(({en:'Done comparing',ar:'إنهاء المقارنة',fr:'Terminer',es:'Terminar',
      de:'Vergleich beenden',pt:'Terminar',it:'Fine confronto'})[lang]||'Done')
   :(({en:'Compare',ar:'مقارنة',fr:'Comparer',es:'Comparar',
      de:'Vergleichen',pt:'Comparar',it:'Confronta'})[lang]||'Compare');
  if(compareActive)splitPreview();
  else{
   preview.classList.remove('rivo-perfect-split-active');
   tag.hidden=true;
   if(result)previewPixels(result.pixels,base.width,base.height,t.processed);
  }
 };
 const resetOutput=()=>{
  result=null;compareLayers=null;compareActive=false;compareRange.hidden=true;
  tag.hidden=true;
  compare.setAttribute('aria-pressed','false');
  diagnostics.hidden=true;diagnostics.open=false;diagnosticBody.textContent='';
  preview.classList.remove('rivo-perfect-split-active');
  save.disabled=true;save.hidden=true;
  compare.disabled=true;compare.hidden=true;
  process.hidden=!base;process.disabled=!base;actions.hidden=!base;
 };
 async function setBase(blob,name,bytes=null,mime='image/jpeg',fromLibrary=false,captureReview=null){
  if(!blob||blob.size>20*1024*1024)throw Error('Maximum source photo: 20 MB');
  const c=await imageCanvas(blob),image=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height);
  base={data:image.data,width:c.width,height:c.height,bytes:bytes||new Uint8Array(await blob.arrayBuffer()),
   name,mime,fromLibrary,captureReview};extra=[];resetOutput();process.disabled=false;
  root.querySelector('.rivo-perfectscan-modal').classList.add('rivo-perfectscan-has-source');
  root.querySelector('.rivo-perfectscan-empty').hidden=true;
  root.querySelector('.rivo-perfectscan-tip').hidden=false;
  root.querySelector('.rivo-perfectscan-warning').hidden=true;
  root.querySelector('.rivo-perfectscan-control').hidden=false;
  root.querySelector('[data-perfect="add"]').hidden=false;
  root.querySelector('[data-perfect="add"]').disabled=false;
  root.querySelector('[data-perfect="camera"]').textContent=t.capture;
  previewPixels(base.data,base.width,base.height,t.original);
  chooseTask('correction');openSettings(false);
  const captureQuality=assessDocumentQualityRGBA(base.data,base.width,base.height);
  const firstWarning=captureQuality.warnings[0];
  setStatus(firstWarning?qualityLabels[lang]+': '+firstWarning:t.ready,captureQuality.reviewRecommended);
 }
 async function addShots(files){
  if(!base){setStatus(t.none,true);return}
  for(const file of Array.from(files).slice(0,3-extra.length)){
   if(file.size>20*1024*1024){setStatus('Photo over 20 MB',true);continue}
   try{
    const c=await imageCanvas(file,{width:base.width,height:base.height});
    const a=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height).data;
    extra.push({data:a,name:file.name,sha256:await sha256(new Uint8Array(await file.arrayBuffer()))});
   }catch(error){setStatus(error.message,true)}
  }
  resetOutput();setStatus(t.frames+': '+extra.length+' / 3');
 }
 function disableDuring(value){
  working=value;
  root.querySelectorAll('button,input').forEach(el=>{el.disabled=value;});
  if(!value){
   process.disabled=!base;process.hidden=!base||!!result;
   save.disabled=!result;save.hidden=!result;
   compare.disabled=!result;compare.hidden=!result;
   if(result&&!compareActive){compareRange.hidden=true;tag.hidden=true;}
   actions.hidden=!base;
  }
 }
 async function run(){
  if(!base||working)return;
  disableDuring(true);setStatus(t.working);
  // Yield to paint progress before the CPU-bound local pixel pipeline.
  await new Promise(done=>setTimeout(done,40));
  try{
   const frames=extra.map(({data})=>({data}));
   const started=performance.now();
   const method=root.querySelector('[data-perfect-mode]').value;
   const uvdocRequested=!!onUVDoc&&method==='uvdoc';
   const surface3dRequested=!!onSurface3D&&method==='surface3d';
   if(surface3dRequested&&extra.length<1)
     throw Error(({en:'Add another photo of this page from a different angle.',
       ar:'إضافة صورة أخرى لنفس الورقة من زاوية مختلفة.',
       fr:'Ajoutez une autre photo de la même page sous un autre angle.'})[lang]||
       'Add another photo from a different angle.');
   const processed=perfectScanRGBA(base.data,base.width,base.height,{
    extraFrames:frames,creaseStrength:80,
    // UVDoc and a triangulated 3D surface each do their own non-rigid warp.
    geometry:method==='geometry'
   });
   processed.surface3DAttempted=surface3dRequested;
   if(surface3dRequested){
    try{
     const surface=await onSurface3D(base.data,processed.pixels,extra.map(frame=>frame.data),
       base.width,base.height);
     if(!surface?.physical3DRelative||surface.pixels?.length!==base.data.length)
       throw Error('Insufficient 3D paper surface evidence');
     processed.pixels=surface.pixels;
     processed.surface3DApplied=true;
     processed.surface3DPointCount=surface.points;
     processed.surface3DConfidence=surface.confidence;
     processed.surface3DRelativeDepthSpread=surface.relativeDepthSpread;
     processed.surface3DCameraCalibrationApproximate=surface.calibrationAssumed;
     processed.surface3DEffectiveResolution=[surface.effectiveWidth,surface.effectiveHeight];
     processed.requiresReview=true;
    }catch(error){
     // Reject instead of pretending to have flattened a 3D sheet.
     processed.surface3DRejectedReason=String(error.message||error);
    }
   }
   if(uvdocRequested){
    const neural=await onUVDoc(processed.pixels,base.width,base.height);
    if(neural?.pixels?.length!==base.data.length||!neural.modelSha256)
      throw Error('UVDoc returned invalid Android inference; uncheck UVDoc to use safe offline 2D mode');
    processed.pixels=neural.pixels;
    processed.neuralUvdocApplied=true;
    processed.neuralModelSha256=neural.modelSha256;
    processed.neuralEffectiveResolution=[neural.effectiveWidth,neural.effectiveHeight];
    processed.neuralRuntime=neural.engine;
    processed.neuralInferenceMs=neural.inferenceMs;
    processed.integrity=inspectInkChanges(base.data,neural.pixels,base.width,base.height);
    processed.requiresReview=true;
   }
   const elapsed=Math.round(performance.now()-started);
   result={...processed,sourceName:base.name,extraCount:extra.length,elapsed};
   previewPixels(processed.pixels,base.width,base.height,t.processed);
   compareLayers=null;
   // Always show the completed correction unobstructed. Users can opt into
   // a before/after divider with the Compare button on the picture.
   setCompareMode(false);
   const methodApplied=processed.neuralUvdocApplied?'UVDoc':processed.surface3DApplied?'3D':
    processed.geometryApplied?'2D':method==='geometry'?'none':'enhance';
   const appliedLabel=({
    en:{UVDoc:'UVDoc applied','3D':'3D correction applied','2D':'Curvature correction applied',
      none:'No reliable curvature found — enhanced without warping',enhance:'Enhanced — no geometric warp'},
    ar:{UVDoc:'تم تطبيق UVDoc','3D':'تم التصحيح ثلاثي الأبعاد','2D':'تم تصحيح الانحناء',
      none:'لم يُكتشف انحناء موثوق — تحسنت الصورة دون تشويه',enhance:'تم تحسين الصورة دون تغيير هندستها'},
    fr:{UVDoc:'UVDoc appliqué','3D':'Correction 3D appliquée','2D':'Courbure corrigée',
      none:'Aucune courbure fiable — amélioration sans déformation',enhance:'Image améliorée, sans déformation'}
   })[lang]||{
    UVDoc:'UVDoc applied','3D':'3D correction applied','2D':'Curvature correction applied',
    none:'No reliable curvature found — enhanced without warping',enhance:'Enhanced without geometric warp'
   };
   const summary=appliedLabel[methodApplied]+
    (processed.quality.warnings.length?' · '+qualityLabels[lang]+': '+processed.quality.warnings[0]:'')+
    (processed.rejectedFrames.length?' · '+t.rejected+': '+processed.rejectedFrames.length:'')+
    (processed.requiresReview?' · '+t.manual:'');
   diagnosticBody.textContent=t.frames+': '+processed.usedFrames+'/'+extra.length+
    ' · Selected: '+method+' · Applied: '+methodApplied+
    ' · 2D confidence: '+Math.round((processed.geometryConfidence||0)*100)+'%'+
    (processed.surface3DApplied?' · relative 3D (not metric)':'')+
    (processed.surface3DRejectedReason?' · 3D: '+processed.surface3DRejectedReason:'')+
    (processed.quality.warnings.length?' · '+processed.quality.warnings.join('; '):'')+
    ' · '+elapsed+' ms';
   diagnostics.hidden=false;
   setStatus(summary,processed.requiresReview||processed.rejectedFrames.length>0);
  }catch(e){result=null;setStatus(t.failed+' '+e.message,true)}
  finally{disableDuring(false)}
 }
 async function writeResult(){
  if(!base||!result||working)return;
  disableDuring(true);
  try{
   // PerfectScan publishes EXACTLY ONE document: a one-page PDF containing
   // the user's perspective-corrected and enhanced image. No JPG, backup
   // original, audit JSON or intermediary scan is written to My Documents.
   if(result.pixels?.length!==base.width*base.height*4)
    throw Error('PerfectScan final image is incomplete.');
   const temp=document.createElement('canvas');
   temp.width=base.width;temp.height=base.height;
   const c=temp.getContext('2d',{willReadFrequently:true});
   const pixels=c.createImageData(base.width,base.height);
   pixels.data.set(result.pixels);c.putImageData(pixels,0,0);
   const jpg=await asJpeg(temp);
   const pdf=await PDFDocument.create();
   const documentImage=await pdf.embedJpg(await jpg.arrayBuffer());
   const pageWidth=base.width>=base.height?842:595;
   const pageHeight=pageWidth*base.height/base.width;
   const page=pdf.addPage([pageWidth,pageHeight]);
   page.drawImage(documentImage,{x:0,y:0,width:pageWidth,height:pageHeight});
   pdf.setTitle('RivoScan PerfectScan');
   pdf.setProducer('RivoScan');
   const stamp=new Date().toISOString().replace(/[-:.TZ]/g,'');
   const pdfBytes=await pdf.save();
   await onSave(pdfBytes,'RivoScan_PerfectScan_'+stamp+'.pdf','application/pdf');
   await onRefresh();
   notify(t.saved);
   close();
  }catch(error){
   setStatus(error?.message||String(error),true);
   notify(error?.message||String(error),true);
   disableDuring(false);
  }
 }
 root.addEventListener('click',e=>{
  const action=e.target.closest('[data-perfect]')?.dataset.perfect;
  if(working)return;
  if(action==='close'){close();return;}
  if(action==='base')sourceInput.click();
  else if(action==='add')extrasInput.click();
  else if(action==='camera')cameraInput.click();
  else if(action==='process')run();
  else if(action==='compare')setCompareMode(!compareActive);
  else if(action==='save')writeResult();
 });
 sourceInput.addEventListener('change',async()=>{
  const file=sourceInput.files?.[0];sourceInput.value='';if(!file)return;
  try{await setBase(file,file.name,null,file.type||'image/jpeg')}catch(e){setStatus(e.message,true)}
 });
 extrasInput.addEventListener('change',async()=>{const files=[...extrasInput.files];extrasInput.value='';await addShots(files)});
 cameraInput.addEventListener('change',async()=>{
  const files=[...cameraInput.files];cameraInput.value='';if(!files.length)return;
  if(captureReviewPending||working)return;
  try{
   if(!base){
    // This explicit review happens AFTER camera capture. Nothing is saved
    // until the user confirms the four corners, processes and presses Save.
    captureReviewPending=true;
    // The camera returns to the existing PerfectScan modal. Its native
    // z-index used to hide the review underneath; inert the parent while
    // its independent post-shutter review is active.
    root.inert=true;
    const reviewed=await reviewPerfectScanCapture(files[0],{language:lang});
    if(!reviewed)return;
    const originalBytes=new Uint8Array(await reviewed.original.arrayBuffer());
    await setBase(reviewed.file,reviewed.original.name,originalBytes,
      reviewed.original.type||'image/jpeg',false,{
        detected:reviewed.detected,cropped:reviewed.cropped,corners:reviewed.corners
      });
   }else await addShots(files);
  }catch(error){setStatus(error.message,true)}
  finally{root.inert=false;captureReviewPending=false}
 });
 // One select ensures mutually exclusive AI/2D/3D corrections.
 root.querySelector('[data-perfect-mode]').addEventListener('change',()=>{
  resetOutput();if(base)previewPixels(base.data,base.width,base.height,t.original);
 });
 // The slider is interactive only in explicit comparison mode; normal preview
 // has no dividing line or overlap on document text.
 compareRange.addEventListener('input',()=>{if(compareActive)splitPreview()});
 if(doc){
  try{
   const source=await bridge.readFile({uri:doc.uri});
   if(!source.base64)throw Error('Cannot read original photo');
   const bytes=toBytes(source.base64),mime=doc.mimeType||source.mimeType||'image/jpeg';
   await setBase(new Blob([bytes],{type:mime}),doc.name,bytes,mime,true);
  }catch(error){setStatus(error.message,true)}
 }
 return close;
}
