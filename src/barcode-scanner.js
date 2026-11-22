import {BrowserMultiFormatReader} from '@zxing/browser';
import {Capacitor,registerPlugin} from '@capacitor/core';
const RivoDocuments=registerPlugin('RivoDocuments');
import {scanMultipleCanvas,scanMultipleCanvasAsync,verifiedUniqueCodes} from './code-multi-scan.js';

const I18N={
 en:['QR / Barcode UltraScan','Live camera · automatic QR or barcode detection','Point at a QR or barcode…','Detected','Copy','Choose photo','Torch','Camera unavailable. Choose a photo.','Saved to the daily TXT file','Could not save: ','Close','No code detected','Already scanned and saved. No duplicate was created.','Code copied','Could not copy code','Open link','Could not open the link','Saved codes','codes found on page','codes detected'],
 ar:['مسح رموز QR والباركود','الكاميرا تتعرف تلقائيًا على رموز QR والباركود','وجّه الكاميرا نحو رمز QR أو باركود…','تم التعرف على','نسخ','اختيار صورة','المصباح','الكاميرا غير متاحة. اختر صورة.','تم الحفظ في الملف النصي اليومي','تعذر حفظ الرمز: ','إغلاق','لم يتم العثور على أي رمز','تم مسح هذا الرمز وحفظه مسبقًا، ولن يُحفظ مرة أخرى.','تم نسخ الرمز','تعذر نسخ الرمز','فتح الرابط','تعذر فتح الرابط','الرموز المحفوظة','رموز مكتشفة في الصورة','رموز مكتشفة'],
 fr:['QR / Code-barres UltraScan','Détection automatique par la caméra','Cadrez un QR ou un code-barres…','Détecté','Copier','Choisir une photo','Lampe','Caméra indisponible. Choisissez une photo.','Enregistré dans le TXT du jour','Enregistrement impossible : ','Fermer','Aucun code détecté','Code déjà scanné et enregistré. Aucun doublon.','Code copié','Copie impossible','Ouvrir le lien','Impossible d’ouvrir le lien','Codes enregistrés','codes trouvés sur la photo','codes détectés'],
 es:['Lector QR y códigos de barras','Detección automática con la cámara','Apunte a un código QR o de barras…','Detectado','Copiar','Elegir imagen','Linterna','Cámara no disponible. Elija una imagen.','Guardado en el TXT diario','Error al guardar: ','Cerrar','No se encontró ningún código','Este código ya se escaneó y guardó. No se duplicó.','Código copiado','No se pudo copiar','Abrir enlace','No se pudo abrir el enlace','Códigos guardados','códigos en la imagen','códigos detectados'],
 de:['QR-/Barcode-Scanner','Automatische QR- und Barcode-Erkennung','Kamera auf einen Code richten…','Erkannt','Kopieren','Bild wählen','Licht','Kamera nicht verfügbar. Bild wählen.','In täglicher TXT-Datei gespeichert','Speichern fehlgeschlagen: ','Schließen','Kein Code gefunden','Code bereits gescannt und gespeichert. Kein Duplikat.','Code kopiert','Kopieren fehlgeschlagen','Link öffnen','Link konnte nicht geöffnet werden','Gespeicherte Codes','Codes im Bild','Codes erkannt'],
 pt:['Leitor QR e códigos de barras','Deteção automática pela câmara','Aponte para um código QR ou de barras…','Detetado','Copiar','Escolher fotografia','Lanterna','Câmara indisponível. Escolha uma fotografia.','Guardado no TXT diário','Erro ao guardar: ','Fechar','Nenhum código encontrado','Este código já foi lido e guardado. Sem duplicação.','Código copiado','Não foi possível copiar','Abrir ligação','Não foi possível abrir a ligação','Códigos guardados','códigos na imagem','códigos detetados'],
 it:['Lettore QR e codici a barre','Rilevamento automatico con fotocamera','Inquadra un QR o codice a barre…','Rilevato','Copia','Scegli foto','Torcia','Fotocamera non disponibile. Scegli una foto.','Salvato nel TXT giornaliero','Salvataggio non riuscito: ','Chiudi','Nessun codice trovato','Codice già acquisito e salvato. Nessun duplicato.','Codice copiato','Impossibile copiare','Apri link','Impossibile aprire il link','Codici salvati','codici nell’immagine','codici rilevati']
};
const FORMATS=['AZTEC','CODABAR','CODE39','CODE93','CODE128','DATA_MATRIX','EAN8','EAN13','ITF','MAXICODE','PDF417','QR','RSS14','RSS_EXPANDED','UPCA','UPCE','UPC_EXTENSION'];
export const safeScannedUrl=value=>{
 const raw=String(value??'').trim();
 if(raw.length>2048||!/^https?:\/\//i.test(raw))return null;
 try{const url=new URL(raw);return ['http:','https:'].includes(url.protocol)&&url.hostname?url.href:null;}catch{return null;}
};
export function decodeFormat(result){
 const raw=result?.getBarcodeFormat?.();
 return Number.isInteger(raw)&&raw>=0&&raw<FORMATS.length?FORMATS[raw]:'UNKNOWN';
}
/** Decode-only gate: neither blank video frames nor unknown camera patterns
 * may trigger a capture, a saved log entry, or a fake detected-code frame.
 * The barcode library itself must recognize a supported format first. */
export function recognizedCode(result){
 const value=String(result?.getText?.()??'').trim();
 const format=decodeFormat(result);
 return value && format!=='UNKNOWN'?{value,format}:null;
}
/**
 * Treat a continuously visible symbol as a single scan, even across long
 * camera sessions. Re-arm only after the code has been absent long enough.
 * Key includes FORMAT, so a QR and EAN with identical text are distinct.
 */
export function newScanDeduplicator({gapMs=1800,clock=()=>Date.now()}={}){
 const seen=new Set();
 let absenceSince=null;
 return {
  accept(identity){
   const next=String(identity??'');
   if(!next)return false;
   // Any recognized symbol cancels the tentative absence period, including
   // an already-seen one. Alternating QR and barcode frames must not re-arm.
   absenceSince=null;
   if(seen.has(next))return false;
   seen.add(next);
   return true;
  },
  absence(){
   if(absenceSince===null)absenceSince=clock();
   else if(clock()-absenceSince>=gapMs){
    seen.clear();
    absenceSince=null;
   }
  }
 };
}
function iconButton(label,action){
 const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-label',label);
 b.addEventListener('click',action);return b;
}
function drawOutline(canvas,video,points){
 const bounds=canvas.getBoundingClientRect();
 if(!bounds.width||!bounds.height)return;
 canvas.width=Math.round(bounds.width*devicePixelRatio);
 canvas.height=Math.round(bounds.height*devicePixelRatio);
 const ctx=canvas.getContext('2d');
 ctx.scale(devicePixelRatio,devicePixelRatio);
 const w=bounds.width,h=bounds.height,vw=video.videoWidth||w,vh=video.videoHeight||h;
 const scale=Math.max(w/vw,h/vh),offX=(w-vw*scale)/2,offY=(h-vh*scale)/2;
 // Do not draw a fabricated rectangle if the decoder did not locate a code.
 // Barcode and QR detections have real result points in their camera image.
 const valid=(points||[]).filter(p=>Number.isFinite(p?.getX?.())&&Number.isFinite(p?.getY?.()));
 if(!valid.length)return false;
 const z=Number(video.dataset.digitalZoom)||1;
 const xs=valid.map(p=>(offX+p.getX()*scale-w/2)*z+w/2),ys=valid.map(p=>(offY+p.getY()*scale-h/2)*z+h/2);
 const minX=Math.max(4,Math.min(...xs)-14),maxX=Math.min(w-4,Math.max(...xs)+14);
 const minY=Math.max(4,Math.min(...ys)-14),maxY=Math.min(h-4,Math.max(...ys)+14);
 if(maxX<=minX||maxY<=minY)return false;
 ctx.strokeStyle='#2CF2D5';ctx.lineWidth=3;ctx.shadowColor='#2CF2D5';ctx.shadowBlur=7;
 ctx.strokeRect(minX,minY,maxX-minX,maxY-minY);
 return true;
}
function drawMultipleOutlines(canvas,video,decoded){
 const bounds=canvas.getBoundingClientRect();
 if(!bounds.width||!bounds.height||!decoded.length)return false;
 const dpr=Math.min(3,Number(globalThis.devicePixelRatio)||1);
 const w=bounds.width,h=bounds.height,vw=video.videoWidth||w,vh=video.videoHeight||h;
 canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
 const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
 const scale=Math.max(w/vw,h/vh),xOffset=(w-vw*scale)/2,yOffset=(h-vh*scale)/2;
 const digital=Number(video.dataset.digitalZoom)||1;
 let count=0;
 for(const result of decoded){
  const valid=(result.getResultPoints?.()||[]).filter(p=>Number.isFinite(p.getX?.())&&Number.isFinite(p.getY?.()));
  if(!valid.length)continue;
  const xs=valid.map(p=>(xOffset+p.getX()*scale-w/2)*digital+w/2);
  const ys=valid.map(p=>(yOffset+p.getY()*scale-h/2)*digital+h/2);
  const left=Math.max(4,Math.min(...xs)-13),top=Math.max(4,Math.min(...ys)-13);
  const right=Math.min(w-4,Math.max(...xs)+13),bottom=Math.min(h-4,Math.max(...ys)+13);
  if(right<=left||bottom<=top)continue;
  ctx.strokeStyle='#2CF2D5';ctx.lineWidth=2.6;
  ctx.strokeRect(left,top,right-left,bottom-top);
  count++;
 }
 return count>0;
}
const scannerResultIcon=kind=>{
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
 svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('width','18');svg.setAttribute('height','18');
 svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');
 svg.setAttribute('stroke-width','2');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');
 const add=(tag,attrs)=>{const el=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));svg.append(el);};
 if(kind==='copy'){add('rect',{x:8,y:8,width:12,height:12,rx:2});add('path',{d:'M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2'});}
 else{add('path',{d:'M14 4h6v6M20 4l-9 9'});add('path',{d:'M20 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5'});}
 svg.setAttribute('aria-hidden','true');return svg;
};
export function openBarcodeScanner({language='en',notify=()=>{},onScan=async()=>({saved:false}),onSuccess=()=>{},onClose=()=>{}}={}){
 const L=I18N[language]||I18N.en;
 const overlay=document.createElement('div');overlay.className='rivo-code-overlay rivo-live-overlay';
 const box=document.createElement('section');box.className='rivo-live-dialog';
 box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label',L[0]);
 const head=document.createElement('header');head.className='rivo-live-head';
 const title=document.createElement('strong');title.textContent=L[0];
 const counter=document.createElement('span');counter.className='rivo-code-count';counter.textContent='0';counter.setAttribute('aria-label',L[17]);
 const close=iconButton('✕',()=>stop());close.dataset.scanOverlayClose='true';
 head.append(title,counter,close);
 const camera=document.createElement('div');camera.className='rivo-live-preview';
 const video=document.createElement('video');video.autoplay=true;video.muted=true;video.playsInline=true;
 const outline=document.createElement('canvas');outline.className='rivo-detection-outline';outline.setAttribute('aria-hidden','true');
 const guide=document.createElement('div');guide.className='rivo-code-target-guide';guide.setAttribute('aria-hidden','true');
 camera.append(video,guide,outline);
 const help=document.createElement('p');help.className='rivo-live-help';help.textContent=L[1];
 const status=document.createElement('p');status.className='rivo-live-status';status.setAttribute('role','status');status.textContent=L[2];
 const result=document.createElement('div');result.className='rivo-live-result rivo-code-results';
 result.setAttribute('role','list');result.setAttribute('aria-label',L[3]);result.hidden=true;
  const stage=document.createElement('div');stage.className='rivo-live-split-stage';
  const resultsPane=document.createElement('aside');resultsPane.className='rivo-live-results-pane';
  resultsPane.setAttribute('aria-label',L[17]);
  const resultsHeading=document.createElement('strong');resultsHeading.className='rivo-live-results-heading';
  resultsHeading.textContent=({ar:'النتائج',fr:'Résultats',en:'Results',es:'Resultados',de:'Ergebnisse',pt:'Resultados',it:'Risultati'})[language]||'Results';
  const resultsEmpty=document.createElement('p');resultsEmpty.className='rivo-live-results-empty';
  resultsEmpty.textContent=({ar:'النتائج ستظهر هنا بعد المسح',fr:'Les résultats apparaîtront ici',en:'Scanned codes appear here',es:'Los códigos aparecerán aquí',de:'Gescannte Codes erscheinen hier',pt:'Os códigos aparecem aqui',it:'I codici appaiono qui'})[language]||'Scanned codes appear here';
 const actions=document.createElement('div');actions.className='rivo-live-actions';
 const torch=iconButton('⚡ '+L[6],()=>toggleTorch());
 const file=iconButton(L[5],()=>picker.click());
 const zoomMinus=iconButton('−',()=>manualZoom(-1)),zoomPlus=iconButton('+',()=>manualZoom(1));
 const autoZoom=iconButton('AUTO',()=>{zoom.auto=!zoom.auto;lastCodeAt=Date.now()-2500;updateZoomUI();});
 const zoomLabel=document.createElement('span');zoomLabel.className='rivo-code-zoom-label';zoomLabel.setAttribute('aria-live','polite');
 const zoomActions=document.createElement('div');zoomActions.className='rivo-code-zoom-controls';
 zoomMinus.setAttribute('aria-label','Zoom out');zoomPlus.setAttribute('aria-label','Zoom in');
 autoZoom.setAttribute('aria-label','Automatic camera zoom');
 zoomActions.append(zoomMinus,zoomLabel,zoomPlus,autoZoom);
 actions.append(torch,file);
 const picker=document.createElement('input');picker.type='file';picker.accept='image/*';picker.hidden=true;
  resultsPane.append(resultsHeading,status,resultsEmpty,result);
  stage.append(camera,resultsPane);
 box.append(head,help,stage,zoomActions,actions,picker);overlay.append(box);document.body.append(overlay);
 const reader=new BrowserMultiFormatReader();
 const dedup=newScanDeduplicator({gapMs:4200}),streams=[],temporaryURLs=[];
 let control=null,closed=false,light=false,lastDetectionAt=0;
 let multiTimer=null,multiActive=false,multiFrameCount=0;
 let successful=0;
 const multiCanvas=document.createElement('canvas');
 const codeHistory=new Map(),duplicateNotices=new Map();
 const updateCount=()=>{counter.textContent=String(successful);counter.title=successful+' '+L[17];};
 const writeClipboard=async value=>{
  if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(value);return;}
  const field=document.createElement('textarea');
  field.value=value;field.readOnly=true;field.style.position='fixed';field.style.opacity='0';
  document.body.appendChild(field);field.focus();field.select();
  try{if(!document.execCommand?.('copy'))throw Error('Clipboard unavailable');}
  finally{field.remove();}
 };
 const openScannedLink=async raw=>{
  const url=safeScannedUrl(raw);
  if(!url)return;
  try{
   if(Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='android'){
    // Native Android opens the system browser outside this WebView.
    await RivoDocuments.openWebLink({url});
   }else{
    const opened=window.open(url,'_blank','noopener,noreferrer');
    // Browsers using noopener may return null even when navigation succeeds.
   }
  }catch(error){status.textContent=L[16];console.warn('Open verified barcode link:',error);}
 };
 const renderCodeResults=()=>{
  const fragment=document.createDocumentFragment();
  for(const item of [...codeHistory.values()].slice(-35).reverse()){
   const row=document.createElement('div');row.className='rivo-code-result-row';
   row.setAttribute('role','listitem');
   const info=document.createElement('div');info.className='rivo-code-result-info';
   const format=document.createElement('strong');format.textContent=item.format;
   const value=document.createElement('span');value.className='rivo-code-result-value';value.textContent=item.value;
   value.dir='auto';
    const stamped=document.createElement('time');stamped.className='rivo-code-result-time';
    stamped.dateTime=new Date(item.scannedAt).toISOString();
    stamped.textContent=new Date(item.scannedAt).toLocaleTimeString(language);
    const saved=document.createElement('small');saved.className='rivo-code-result-save-state';
    saved.dataset.saveState=item.saveState;
    saved.textContent=item.saveState==='saved'?'Saved':item.saveState==='already'?'Already saved':item.saveState==='failed'?'Save failed':'Saving...';
    // The code, copy and link buttons share one compact row.
   const buttons=document.createElement('div');buttons.className='rivo-code-result-buttons';
   const copyButton=iconButton(L[4],async()=>{
    try{await writeClipboard(item.value);status.textContent=L[13];}
    catch(error){status.textContent=L[14];console.warn('Copy code:',error);}
   });
   copyButton.className='rivo-code-copy';copyButton.setAttribute('aria-label',L[4]);copyButton.title=L[4];copyButton.replaceChildren(scannerResultIcon('copy'));buttons.append(copyButton);
   if(safeScannedUrl(item.value)){
    const linkButton=iconButton(L[15],()=>{void openScannedLink(item.value);});
    linkButton.className='rivo-code-open-link';linkButton.setAttribute('aria-label',L[15]);linkButton.title=L[15];linkButton.replaceChildren(scannerResultIcon('link'));buttons.append(linkButton);
   }
   const valueLine=document.createElement('div');valueLine.className='rivo-code-value-line';valueLine.append(value,buttons);
    info.replaceChildren(format,valueLine,stamped,saved);row.append(info);fragment.append(row);
  }
  result.replaceChildren(fragment);
  result.hidden=codeHistory.size===0;resultsEmpty.hidden=codeHistory.size>0;
 };
 const duplicateMessage=identity=>{
  const now=Date.now();
  if(now-(duplicateNotices.get(identity)||0)<4500)return;
  duplicateNotices.set(identity,now);
  if(!closed)status.textContent=L[12];
 };

 const zoom={track:null,min:1,max:2.6,current:1,hardware:false,auto:true,pending:false};
 let lastCodeAt=Date.now(),lastZoomAt=0,zoomTimer=null;
 const updateZoomUI=()=>{
  zoomActions.hidden=false;
  zoomMinus.disabled=zoom.pending||zoom.current<=zoom.min+0.01;
  zoomPlus.disabled=zoom.pending||zoom.current>=zoom.max-0.01;
  autoZoom.disabled=false;autoZoom.setAttribute('aria-pressed',String(zoom.auto));
  autoZoom.textContent=zoom.auto?'AUTO ✓':'AUTO';
  zoomLabel.textContent=zoom.current.toFixed(1)+'×'+(zoom.hardware?'':' DIG');
 };
 async function setZoom(value){
  if(zoom.pending||closed||!zoom.track)return;
  zoom.pending=true;updateZoomUI();
  const target=Math.min(zoom.max,Math.max(zoom.min,Number(value)||1));
  try{
   if(zoom.hardware){
    const caps=zoom.track.getCapabilities?.()||{};
    const step=Number(caps.zoom?.step)||0.1;
    const rounded=Math.max(zoom.min,Math.min(zoom.max,zoom.min+Math.round((target-zoom.min)/step)*step));
    await zoom.track.applyConstraints({advanced:[{zoom:rounded}]});
    zoom.current=Number(zoom.track.getSettings?.().zoom)||rounded;
    video.style.transform='';video.dataset.digitalZoom='1';
   }else{
    // WebView camera track does not expose hardware zoom. Crop the real
    // decoded image in addition to magnifying its preview (not CSS-only).
    zoom.current=target;
    video.style.transform='scale('+zoom.current+')';
    video.dataset.digitalZoom=String(zoom.current);
   }
  }catch(error){
   console.warn('Hardware zoom rejected; using decoded-frame crop instead:',error);
   zoom.hardware=false;zoom.min=1;zoom.max=2.6;zoom.current=Math.min(zoom.max,Math.max(zoom.min,target));
   video.style.transform='scale('+zoom.current+')';
   video.dataset.digitalZoom=String(zoom.current);
  }finally{zoom.pending=false;updateZoomUI();}
 }
 function manualZoom(direction){
  zoom.auto=false;lastCodeAt=Date.now();
  void setZoom(zoom.current+direction*(zoom.hardware?0.5:0.35));updateZoomUI();
 }
 let feedbackTimer=null;
 const playDetectedAnimation=()=>{
  camera.classList.remove('rivo-code-accepted');
  // Restart the success pulse for each DISTINCT accepted code.
  void camera.offsetWidth;
  camera.classList.add('rivo-code-accepted');
  if(feedbackTimer!==null)clearTimeout(feedbackTimer);
  feedbackTimer=setTimeout(()=>{if(!closed)camera.classList.remove('rivo-code-accepted');feedbackTimer=null;},560);
 };
 const clearDetectionOutline=()=>{
  const ctx=outline.getContext('2d');
  ctx?.clearRect(0,0,outline.width,outline.height);
 };
 const key=e=>{if(e.key==='Escape'||e.key==='Backspace'){e.preventDefault();stop();}};
 const stop=()=>{
  if(closed)return;closed=true;
  if(feedbackTimer!==null)clearTimeout(feedbackTimer);
  if(zoomTimer!==null){clearInterval(zoomTimer);zoomTimer=null;}
  if(multiTimer!==null){clearInterval(multiTimer);multiTimer=null;}
  clearDetectionOutline();
  try{control?.stop();}catch{}
  for(const track of streams)try{track.stop();}catch{}
  for(const url of temporaryURLs)URL.revokeObjectURL(url);
  document.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility);overlay.remove();onClose();
 };
 const visibility=()=>{if(document.hidden)stop();};
 document.addEventListener('keydown',key);document.addEventListener('visibilitychange',visibility);
 async function toggleTorch(){
  const track=streams.find(x=>x.kind==='video');if(!track)return;
  try{light=!light;await track.applyConstraints({advanced:[{torch:light}]});}
  catch{light=false;torch.disabled=true;}
 }
 async function deliver(decoded,{fromPhoto=false}={}){
  if(closed)return;
  const entry=recognizedCode(decoded);
  if(entry)lastCodeAt=Date.now();
  if(!entry)return;
  const identity=entry.format+'\u0000'+entry.value;
  // Both fast and multi-frame decoders run concurrently: block the duplicate
  // synchronously, before any awaited disk write or status notification.
  if(!dedup.accept(identity)){
   duplicateMessage(identity);return;
  }
  if(fromPhoto){lastDetectionAt=0;clearDetectionOutline();}
  else{
   lastDetectionAt=Date.now();
   if(drawOutline(outline,video,decoded.getResultPoints?.()||[]))playDetectedAnimation();
  }
  const current={...entry,scannedAt:Date.now(),saveState:'pending'};
  codeHistory.set(identity,current);
  renderCodeResults();
  status.textContent=L[3]+' · '+entry.format;
  try{
   const saved=await onScan(entry);
   if(closed)return;
   if(saved?.duplicate||saved?.alreadySaved){
    current.saveState='already';renderCodeResults();
    status.textContent=L[12];
    duplicateNotices.set(identity,Date.now());
    return;
   }
   if(saved?.saved){
    current.saveState='saved';renderCodeResults();
    successful++;updateCount();
    try{onSuccess(entry);}catch(error){console.warn('Scan success feedback:',error);}
    try{navigator.vibrate?.(55);}catch{}
    status.textContent=L[8]+' · '+entry.format;
   }else{
    current.saveState='failed';renderCodeResults();
    status.textContent=L[9]+(saved?.reason||'');
   }
  }catch(error){
   current.saveState='failed';renderCodeResults();
   if(!closed){status.textContent=L[9]+String(error?.message||error);notify(status.textContent,true);}
  }
 }
 // Decode an entire uploaded page, rather than just its first barcode.
 picker.addEventListener('change',async()=>{
  const item=picker.files?.[0];picker.value='';if(!item)return;
  const url=URL.createObjectURL(item);temporaryURLs.push(url);
  try{
   const image=new Image();image.src=url;await image.decode();
   const canvas=document.createElement('canvas'),scale=Math.min(1,2400/Math.max(image.naturalWidth,image.naturalHeight));
   canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
   canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
   canvas.getContext('2d',{willReadFrequently:true}).drawImage(image,0,0,canvas.width,canvas.height);
   const found=verifiedUniqueCodes(scanMultipleCanvas(canvas,{fine:true,maxResults:28}),recognizedCode);
   if(found.length){
    const before=successful;
    for(const {result:decoded} of found){if(closed)break;await deliver(decoded,{fromPhoto:true});}
    if(!closed&&successful>before)status.textContent=found.length+' '+L[18]+' · '+successful+' '+L[17];
   }else{
    const found=reader.decodeFromCanvas(canvas);await deliver(found,{fromPhoto:true});
   }
  }catch(error){
   if(!closed)status.textContent=L[11];
   clearDetectionOutline();
  }
 });
 // Supplement single-code fast scans with multi-code whole-frame searches.
 // At every interval it searches all regions, even during hardware zoom.
 // For software zoom it alternates full-frame and real cropped pixel scans.
 async function scanMultiFrame(){
  if(closed||multiActive||video.readyState<2||!video.videoWidth||!video.videoHeight||document.hidden)return;
  multiActive=true;
  try{
   const vw=video.videoWidth,vh=video.videoHeight;
   const ratio=Math.min(1,1280/Math.max(vw,vh));
   const cw=Math.max(1,Math.round(vw*ratio)),ch=Math.max(1,Math.round(vh*ratio));
   multiCanvas.width=cw;multiCanvas.height=ch;
   const ctx=multiCanvas.getContext('2d',{willReadFrequently:true});
   const cropped=!zoom.hardware&&zoom.current>1.08&&((multiFrameCount++%3)===2);
   const z=cropped?zoom.current:1;
   const sw=vw/z,sh=vh/z,sx=(vw-sw)/2,sy=(vh-sh)/2;
   ctx.drawImage(video,sx,sy,sw,sh,0,0,cw,ch);
   const decoded=await scanMultipleCanvasAsync(multiCanvas,{maxResults:22,shouldStop:()=>closed});
   const mapped=decoded.map(found=>({
    getText:()=>found.getText(),
    getBarcodeFormat:()=>found.getBarcodeFormat(),
    getResultPoints:()=>found.getResultPoints().map(p=>({
     getX:()=>sx+p.getX()*sw/cw,
     getY:()=>sy+p.getY()*sh/ch
    }))
   }));
   const codes=verifiedUniqueCodes(mapped,recognizedCode);
   if(codes.length){
    lastCodeAt=Date.now();
    const before=successful;
    for(const {result:found} of codes){if(closed)break;await deliver(found);}
    if(!closed&&codes.length>1){
     drawMultipleOutlines(outline,video,codes.map(item=>item.result));
     if(successful>before)status.textContent=codes.length+' '+L[19]+' · '+successful+' '+L[17];
    }
   }
  }catch(error){console.debug('Multi-code frame unavailable:',error);}
  finally{multiActive=false;}
 }
 async function start(){
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{
    facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080},
    frameRate:{ideal:30,max:30}
   }});
   if(closed){stream.getTracks().forEach(t=>t.stop());return;}
   streams.push(...stream.getTracks());video.srcObject=stream;
   const track=stream.getVideoTracks()[0];zoom.track=track;
   const caps=track?.getCapabilities?.()||{};
   // Hardware autofocus and track.zoom affect decoded video pixels (CSS zoom does not).
   if(Array.isArray(caps.focusMode)&&caps.focusMode.includes('continuous')){
    try{await track.applyConstraints({advanced:[{focusMode:'continuous'}]});}catch{}
   }
   if(caps.zoom&&Number.isFinite(caps.zoom.min)&&Number.isFinite(caps.zoom.max)&&caps.zoom.max>caps.zoom.min){
    zoom.hardware=true;zoom.min=caps.zoom.min;zoom.max=Math.min(caps.zoom.max,6);
    zoom.current=Math.max(zoom.min,Math.min(zoom.max,Number(track.getSettings?.().zoom)||zoom.min));
   }else{
    // Keep controls visible on WebView even when zoom capabilities are hidden.
    zoom.hardware=false;zoom.min=1;zoom.max=2.6;zoom.current=1;
   }
   updateZoomUI();
   await video.play();
   multiTimer=setInterval(()=>{void scanMultiFrame();},1350);
   void scanMultiFrame();
   zoomTimer=setInterval(()=>{
    if(closed||!zoom.auto||zoom.pending||Date.now()-lastCodeAt<2600||Date.now()-lastZoomAt<1900)return;
    // Sweep the real camera zoom range, then start again to search another distance.
    const next=zoom.current+(zoom.hardware?0.45:0.35)>zoom.max?zoom.min:zoom.current+(zoom.hardware?0.45:0.35);
    lastZoomAt=Date.now();void setZoom(next);
   },800);
   control=await reader.decodeFromVideoElement(video,(decoded,error)=>{
    if(closed)return;
    if(decoded){void deliver(decoded);}
    else {
     // A long continuous view must not generate repeated exports. Re-arm
     // only after a real absence window, independent of error subtype.
     dedup.absence();
     // Never leave a code frame over empty live video.
     if(lastDetectionAt&&Date.now()-lastDetectionAt>1700){
      clearDetectionOutline();lastDetectionAt=0;
     }
    }
   });
   if(closed)control?.stop();
  }catch(error){if(!closed){status.textContent=L[7];torch.disabled=true;console.warn('Live code scanner:',error);}}
 }
 void start();
 return stop;
}
