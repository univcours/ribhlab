import {createWorker} from 'tesseract.js';
import {readPlateZoomRange,planPlateAutoZoom,plateSearchRoi,applyPlateZoom} from './plate-distance.js';

const labels={
 en:['Plate Scanner','Search for a plate (e.g. 12345 A 7)','Point the camera at the whole plate','Plate saved','Match found · photo captured','Camera unavailable','OCR model may download on first use','No target'],
 ar:['قارئ اللوحات','ابحث عن لوحة (مثال 12345 أ 7)','وجّه الكاميرا نحو اللوحة كاملة','تسجلات اللوحة','تلقات مطابقة · تصوّرات السيارة','الكاميرا غير متاحة','أول استعمال يمكن يحتاج تحميل نموذج القراءة','ما كاين حتى رقم للبحث'],
 fr:['Lecteur de plaques','Rechercher une plaque (ex. 12345 A 7)','Cadrez la plaque entière','Plaque enregistrée','Correspondance · photo enregistrée','Caméra indisponible','Le modèle OCR peut être téléchargé au premier usage','Aucune cible'],
 es:['Lector de matrículas','Buscar matrícula (ej. 12345 A 7)','Enfoca la matrícula completa','Matrícula guardada','Coincidencia · foto capturada','Cámara no disponible','El modelo OCR puede descargarse en el primer uso','Sin objetivo'],
 de:['Kennzeichenleser','Kennzeichen suchen (z. B. 12345 A 7)','Ganzes Kennzeichen erfassen','Kennzeichen gespeichert','Übereinstimmung · Foto aufgenommen','Kamera nicht verfügbar','OCR-Modell wird eventuell beim ersten Mal geladen','Kein Suchziel'],
 pt:['Leitor de matrículas','Procurar matrícula (ex. 12345 A 7)','Aponte a câmara para toda a matrícula','Matrícula guardada','Correspondência · fotografia capturada','Câmara indisponível','O modelo OCR poderá ser descarregado no primeiro uso','Sem alvo'],
 it:['Lettore targhe','Cerca targa (es. 12345 A 7)','Inquadra tutta la targa','Targa salvata','Corrispondenza · foto acquisita','Fotocamera non disponibile','Il modello OCR potrebbe essere scaricato al primo uso','Nessun obiettivo']
};
export function normalizePlate(value){
 return cleanedText(value).replace(/[^A-Z0-9\u0621-\u064a]/g,'');
}
const seriesCode=letter=>MOROCCAN_PLATE_SERIES[letter]||(officialLatin.has(letter)?letter:null);
const seriesLetter=letter=>MOROCCAN_PLATE_SERIES[letter]?letter:null;
export function plateComparisonKey(value){
 // Enable matching Arabic-only and 2026 Arabic/Latin bilingual plates.
 const valuePlate=normalizePlate(value);
 return Array.from(valuePlate).map(letter=>seriesCode(letter)||letter).join('')
  .replace(/^MA(?=\d)/,'');
}
const series='[أبدهوطيكلمنصفرسABDHETYKLMNCFRS]';
const between='[\\s\\-|/:·]*';
const divided='[\\s\\-|/:·]+';
const forward=new RegExp('(?:^|[^\\p{L}\\p{N}])(?:MA\\s*)?(\\d{1,5})'+between+'('+series+')(?:'+divided+'('+series+'))?'+between+'(\\d{1,2})(?=$|[^\\p{L}\\p{N}])','gu');
const reversed=new RegExp('(?:^|[^\\p{L}\\p{N}])(\\d{1,2})'+divided+'('+series+')(?:'+divided+'('+series+'))?'+divided+'(\\d{1,5})(?=$|[^\\p{L}\\p{N}])','gu');
// Native log values stay Unicode-safe so Arabic series can be exported to Excel/TXT.
export function moroccanPlateCandidates(text){
 const raw=cleanedText(text);
 const found=new Map();
 const add=(serial,first,second,province)=>{
  const order=Number(serial),region=Number(province);
  if(!Number.isInteger(order)||order<1||order>99999||
     !Number.isInteger(region)||region<1||region>99)return;
  const left=seriesCode(first),right=second?seriesCode(second):null;
  if(!left||(second&&left!==right))return;
  const letter=seriesLetter(first)||seriesLetter(second)||first;
  const candidate=normalizePlate(serial+letter+province);
  const key=plateComparisonKey(candidate);
  // Prefer displaying the real Arabic character when dual-script OCR finds it.
  if(!found.has(key)||(!/[\u0621-\u064a]/.test(found.get(key))&&/[\u0621-\u064a]/.test(candidate)))
   found.set(key,candidate);
 };
 for(const match of raw.matchAll(forward))add(match[1],match[2],match[3],match[4]);
 // OCR can reverse Arabic text. Only try RTL reversal if the usual plate order
 // produced no valid candidate: 1-أ-7 would otherwise become two false IDs.
 if(!found.size)for(const match of raw.matchAll(reversed))add(match[4],match[2],match[3],match[1]);
 return [...found.values()];
}
export function plateCandidates(text){
 const matches=moroccanPlateCandidates(text);
 if(matches.length)return matches;
 // Legacy international plates remain supported without mislabelling them Moroccan.
 const raw=cleanedText(text),out=[];
 for(const match of raw.matchAll(/(?:^|[^\p{L}\p{N}])([A-Z]{1,3})[\s-]+(\d{3,6})(?=$|[^\p{L}\p{N}])/gu)){
  if(match[1]==='MA')continue;
  const plate=normalizePlate(match[1]+match[2]);
  if(plate.length>=5&&!out.includes(plate))out.push(plate);
 }
 return out;
}
export function matchesPlate(plate,query){
 const p=plateComparisonKey(plate),q=plateComparisonKey(query);
 return q.length>=3&&p.includes(q);
}
// Manual search stays live. Pinned targets are stored on this device only.
export function matchingPlateTargets(plate,targets=[]){
 const qs=Array.isArray(targets)?targets:[targets];
 return [...new Set(qs.map(normalizePlate).filter(q=>q.length>=3&&matchesPlate(plate,q)))];
}
/** Other recognized cars must not stop the search for a watched plate. */
export function hasPlateSearchHit(candidates,targets=[]){
 const qs=(Array.isArray(targets)?targets:[targets]).map(normalizePlate).filter(q=>q.length>=3);
 if(!Array.isArray(candidates)||!candidates.length)return false;
 return qs.length
  ?candidates.some(plate=>matchingPlateTargets(plate,qs).length>0)
  :true;
}
export function plateOcrLines(blocks){
 const rows=[];
 for(const block of (Array.isArray(blocks)?blocks:[])){
  for(const para of (block?.paragraphs||[])){
   for(const line of (para?.lines||[])){
    if(typeof line?.text==='string'&&line?.bbox)rows.push({text:line.text,bbox:line.bbox});
   }
  }
 }
 return rows;
}
export function plateBoxInView(bbox,roi,ocrScale,video,view){
 if(!bbox||!roi||!Number.isFinite(ocrScale)||ocrScale<=0||video.width<=0||video.height<=0||view.width<=0||view.height<=0)return null;
 const s=Math.max(view.width/video.width,view.height/video.height),cv=video.width/roi.canvasWidth;
 const offX=(view.width-video.width*s)/2,offY=(view.height-video.height*s)/2;
 const xy=(x,y)=>({
  x:offX+(roi.x+x/ocrScale)*cv*s,
  y:offY+(roi.y+y/ocrScale)*cv*s
 });
 const a=xy(bbox.x0,bbox.y0),b=xy(bbox.x1,bbox.y1);
 if(![a.x,a.y,b.x,b.y].every(Number.isFinite))return null;
 const left=Math.max(0,Math.min(view.width,a.x)),top=Math.max(0,Math.min(view.height,a.y));
 const right=Math.max(left,Math.min(view.width,b.x)),bottom=Math.max(top,Math.min(view.height,b.y));
 if(right-left<8||bottom-top<5)return null;
 return {x:left,y:top,width:right-left,height:bottom-top};
}
const zoomCopy={
 en:{auto:'AUTO ZOOM',off:'ZOOM OFF',missing:'Camera zoom unavailable; searching image regions',hint:'Keep the vehicle in view; automatic zoom checks the scene before magnifying'},
 ar:{auto:'زوم تلقائي',off:'الزوم موقوف',missing:'زوم الكاميرا غير متاح؛ كنقلب فمناطق الصورة',hint:'وجّه الكاميرا للسيارة؛ غادي يفتّش ويقرّب تدريجياً'},
 fr:{auto:'ZOOM AUTO',off:'ZOOM ARRÊT',missing:'Zoom caméra indisponible : recherche par zones',hint:'Gardez le véhicule dans le cadre ; recherche et zoom progressifs'}
};
function btn(label,fn){
 const el=document.createElement('button');el.type='button';el.textContent=label;el.setAttribute('aria-label',label);el.addEventListener('click',fn);return el;
}
async function jpegBytes(canvas){
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Image capture failed')),'image/jpeg',0.88));
 return new Uint8Array(await blob.arrayBuffer());
}
export function openPlateScanner({language='en',notify=()=>{},onPlate=async()=>({saved:false}),onMatchPhoto=async()=>null,onMatchAlert=async()=>false,onClose=()=>{}}={}){
 const L=labels[language]||labels.en;
 const layer=document.createElement('div');layer.className='rivo-plate-overlay rivo-live-overlay';
 const panel=document.createElement('section');panel.className='rivo-live-dialog';
 panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',L[0]);
 const header=document.createElement('header');header.className='rivo-live-head';
 const title=document.createElement('strong');title.textContent=L[0];
 const close=btn('✕',()=>stop());close.dataset.scanOverlayClose='true';
 const searchRow=document.createElement('div');searchRow.className='rivo-plate-search-row';
 const search=document.createElement('input');search.type='search';search.className='rivo-plate-search';
 search.placeholder=L[1];search.autocomplete='off';search.spellcheck=false;search.setAttribute('aria-label',L[1]);
 const pinned=document.createElement('div');pinned.className='rivo-plate-watchlist';pinned.hidden=true;
 const watchKey='rivo-plate-watchlist-v1';
 let watch=[];
 try{const saved=JSON.parse(localStorage.getItem(watchKey)||'[]');
  if(Array.isArray(saved))watch=[...new Set(saved.map(normalizePlate).filter(q=>q.length>=3))].slice(0,20);
 }catch{}
 const persistWatch=()=>{try{localStorage.setItem(watchKey,JSON.stringify(watch));}catch{}};
 const renderWatch=()=>{
  pinned.replaceChildren();pinned.hidden=!watch.length;
  for(const [i,number] of watch.entries()){
   const chip=btn(number+' ✕',()=>{watch.splice(i,1);persistWatch();renderWatch();});
   chip.className='rivo-plate-watch-chip';
   chip.title=number;pinned.append(chip);
  }
 };
 const addTarget=btn('＋',()=>{
  const value=normalizePlate(search.value);
  if(value.length<3){search.focus();return;}
  if(!watch.includes(value)&&watch.length<20){watch.push(value);persistWatch();renderWatch();}
  search.value='';search.focus();
 });
 addTarget.title=({en:'Add watch target',ar:'إضافة لوحة للمراقبة',fr:'Ajouter une plaque suivie',es:'Añadir matrícula vigilada',de:'Kennzeichen zur Suche hinzufügen',pt:'Adicionar matrícula à pesquisa',it:'Aggiungi targa da monitorare'})[language]||'Add watch target';
 search.addEventListener('keydown',e=>{
  if(e.key==='Enter'){e.preventDefault();addTarget.click();}
 });
 searchRow.append(search,addTarget);renderWatch();header.append(title,searchRow,close);
 const view=document.createElement('div');view.className='rivo-live-preview';
 const video=document.createElement('video');video.autoplay=true;video.playsInline=true;video.muted=true;
 const guide=document.createElement('div');guide.className='rivo-plate-guide';guide.textContent='▢';
 const detection=document.createElement('div');
 detection.className='rivo-plate-detection';detection.hidden=true;
 detection.setAttribute('aria-hidden','true');
 view.append(video,guide,detection);
 const status=document.createElement('p');status.className='rivo-live-status';status.setAttribute('role','status');status.textContent=L[2];
 const last=document.createElement('strong');last.className='rivo-live-result';last.hidden=true;
 const foot=document.createElement('div');foot.className='rivo-live-actions';
 const count=document.createElement('span');count.className='rivo-plate-count';count.textContent='0';
 const Z=zoomCopy[language]||zoomCopy.en;
 const zoomButton=btn(Z.auto,()=>{
  autoZoomEnabled=!autoZoomEnabled;
  renderZoom();
  if(!autoZoomEnabled&&zoomRange&&zoomCurrent>zoomRange.min+0.05)
   void setCameraZoom(zoomRange.min);
 });
 zoomButton.className='rivo-plate-auto-zoom';
 zoomButton.setAttribute('aria-pressed','true');
 const torch=btn('⚡',()=>toggleTorch());foot.append(count,zoomButton,torch);
 const hint=document.createElement('p');hint.className='rivo-live-help';hint.textContent=L[6]+' · '+Z.hint;
 panel.append(header,pinned,view,status,last,foot,hint);layer.append(panel);document.body.append(layer);
 const observed=new Map(),confirmed=new Map();
 let worker=null,stream=null,closed=false,working=false,foundCount=0,light=false,nextTimer=0,processing=false;
 let zoomRange=null,zoomCurrent=1,zoomBusy=false,autoZoomEnabled=true,missedFrames=0,searchPass=0,verifyRegion=null,lastZoomAt=0;
 function renderZoom(){
  zoomButton.disabled=!zoomRange;
  zoomButton.setAttribute('aria-pressed',String(autoZoomEnabled&&Boolean(zoomRange)));
  zoomButton.textContent=zoomRange
   ?(autoZoomEnabled?Z.auto:Z.off)+' ×'+zoomCurrent.toFixed(1)
   :Z.auto+' · N/A';
  zoomButton.title=zoomRange?Z.hint:Z.missing;
  if(!zoomRange)hint.textContent=L[6]+' · '+Z.missing;
 }
 async function setCameraZoom(target){
  if(closed||zoomBusy||!zoomRange)return false;
  const track=stream?.getVideoTracks()?.[0];
  if(!track||track.readyState==='ended')return false;
  zoomBusy=true;
  try{
   const actual=await applyPlateZoom(track,zoomRange,target);
   if(closed)return false;
   zoomCurrent=actual;lastZoomAt=Date.now();missedFrames=0;observed.clear();searchPass=0;verifyRegion=null;
   renderZoom();
   return true;
  }catch(error){
   console.warn('Camera zoom unavailable; continuing with regional OCR:',error);
   zoomRange=null;
   if(!closed)renderZoom();
   return false;
  }finally{zoomBusy=false;}
 }
 renderZoom();
 const key=e=>{if(e.key==='Escape'||e.key==='Backspace'&&e.target!==search){e.preventDefault();stop();}};
 const stop=()=>{
  if(closed)return;closed=true;clearTimeout(nextTimer);
  stream?.getTracks().forEach(t=>t.stop());
  if(worker)void worker.terminate().catch(()=>{});
  document.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility);layer.remove();onClose();
 };
 const visibility=()=>{if(document.hidden)stop();};
 document.addEventListener('keydown',key);document.addEventListener('visibilitychange',visibility);
 async function toggleTorch(){
  const track=stream?.getVideoTracks()[0];if(!track)return;
  try{light=!light;await track.applyConstraints({advanced:[{torch:light}]});}
  catch{light=false;torch.disabled=true;}
 }
 function snapshot(){
  const canvas=document.createElement('canvas');
  const width=Math.min(2304,video.videoWidth||1280),ratio=width/(video.videoWidth||1280);
  canvas.width=width;canvas.height=Math.max(1,Math.round((video.videoHeight||720)*ratio));
  canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
  return canvas;
 }
 function beep(){
  try{
   const Context=window.AudioContext||window.webkitAudioContext;
   if(!Context)return;
   const ctx=new Context(),osc=ctx.createOscillator(),gain=ctx.createGain();
   osc.frequency.value=860;osc.type='sine';gain.gain.value=0.06;
   osc.connect(gain);gain.connect(ctx.destination);osc.start();
   gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.27);osc.stop(ctx.currentTime+.28);
   osc.onended=()=>void ctx.close();
  }catch{}
 }
 async function recordPlate(plate){
  // Expire old sightings before testing duplicates; the same car may pass again later.
  const now=Date.now(),key=plateComparisonKey(plate);
  for(const [p,time] of confirmed)if(now-time>30000)confirmed.delete(p);
  if(closed||confirmed.has(key))return;
  const match=matchingPlateTargets(plate,[search.value,...watch]).length>0;
  // A brief second OCR confirmation suppresses false alarms/captures.
  confirmed.set(key,now);
  let photoName='';
  if(match){
   // Native alert is reliable after asynchronous OCR when WebAudio autoplay is blocked.
   let alerted=false;
   try{alerted=(await onMatchAlert(plate))===true;}
   catch(error){console.warn('License plate alert fallback:',error);}
   if(!alerted)beep();
   try{
    const bytes=await jpegBytes(snapshot());
    photoName=await onMatchPhoto({plate,bytes})||'';
   }catch(error){notify('Vehicle photo failed: '+String(error?.message||error),true);}
  }
  try{
   const result=await onPlate({value:plate,format:'LICENSE_PLATE',match,photoName});
   if(closed)return;
   foundCount++;count.textContent=String(foundCount);
   last.hidden=false;last.textContent=plate;
   status.textContent=(match&&photoName?L[4]:L[3])+(result?.saved?' ✓':' · Excel not available');
   guide.classList.toggle('matched',match);
  }catch(error){if(!closed)status.textContent='Save failed: '+String(error?.message||error);}
 }
 async function scanFrame(){
  if(closed||processing||!worker||video.readyState<2)return;
  processing=true;
  try{
   // Search full frame and overlapping crops. A phone cannot pan mechanically.
   const canvas=snapshot();
   const verifying=verifyRegion!=null;
   const regionIndex=verifying?verifyRegion:searchPass++;
   verifyRegion=null;
   const roi=plateSearchRoi(canvas.width,canvas.height,regionIndex);
   const scale=Math.min(1.75,1800/Math.max(roi.w,roi.h));
   const small=document.createElement('canvas');
   small.width=Math.max(1,Math.round(roi.w*scale));
   small.height=Math.max(1,Math.round(roi.h*scale));
   small.getContext('2d',{willReadFrequently:true}).drawImage(canvas,
    roi.x,roi.y,roi.w,roi.h,0,0,small.width,small.height);
   // Tesseract 6 disables bounding geometry by default. Explicit blocks=true
   // makes the real OCR line rectangle available without inventing a bounding box.
   const data=(await worker.recognize(small,{}, {blocks:true})).data;
   const candidates=plateCandidates(data.text);
   const now=Date.now();
   let framed=false;
   if(Number(data.confidence)>=40){
    const lines=plateOcrLines(data.blocks);
    for(const plate of candidates){
     const line=lines.find(row=>plateCandidates(row.text).includes(plate));
     if(line){
      const box=plateBoxInView(line.bbox,{...roi,canvasWidth:canvas.width},
       scale,{width:video.videoWidth,height:video.videoHeight},
       {width:view.clientWidth,height:view.clientHeight});
      if(box){
       detection.style.left=box.x+'px';detection.style.top=box.y+'px';
       detection.style.width=box.width+'px';detection.style.height=box.height+'px';
       detection.hidden=false;guide.hidden=true;framed=true;
       detection.classList.toggle('matched',matchingPlateTargets(plate,[search.value,...watch]).length>0);
      }
     }
     const key=plateComparisonKey(plate),seen=observed.get(key);
     const streak=seen&&now-seen.time<10000?seen.streak+1:1;
     observed.set(key,{time:now,streak});
     if(streak>=2)await recordPlate(plate);
    }
   }
   if(!framed){detection.hidden=true;guide.hidden=false;}
   for(const [plate,info] of observed)if(now-info.time>8000)observed.delete(plate);
   const soughtPlateSeen=hasPlateSearchHit(candidates,[search.value,...watch]);
   if(Number(data.confidence)>=40&&candidates.length&&!verifying)
    verifyRegion=regionIndex;
   if(Number(data.confidence)>=40&&soughtPlateSeen){
    missedFrames=0;
   }else{
    // Keep searching/zooming when other cars are recognized but the requested
    // Moroccan plate is still too distant to read.
    missedFrames++;
    if(autoZoomEnabled&&!zoomBusy&&zoomRange){
     const next=planPlateAutoZoom({range:zoomRange,current:zoomCurrent,
      misses:missedFrames,elapsedMs:now-lastZoomAt});
     if(next!=null)await setCameraZoom(next);
    }
   }
  }catch(error){if(!closed)console.warn('License plate OCR:',error);}
  finally{processing=false;if(!closed)nextTimer=setTimeout(scanFrame,650);}
 }
 async function start(){
  try{
   stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{
    facingMode:{ideal:'environment'},width:{ideal:2560},height:{ideal:1440},frameRate:{ideal:24}
   }});
   if(closed){stream.getTracks().forEach(t=>t.stop());return;}
   video.srcObject=stream;await video.play();
   const track=stream.getVideoTracks()[0];
   let capabilities={};
   try{capabilities=track?.getCapabilities?.()||{};}catch{}
   zoomRange=readPlateZoomRange(capabilities,track?.getSettings?.());
   zoomCurrent=zoomRange?.current||1;lastZoomAt=Date.now();
   renderZoom();
   // Optional autofocus: Android WebView devices expose differing controls.
   if(capabilities.focusMode?.includes?.('continuous')){
    try{await track.applyConstraints({advanced:[{focusMode:'continuous'}]});}catch{}
   }
   worker=await createWorker(['eng','ara'],1).catch(()=>createWorker('eng',1));
   if(closed){void worker.terminate();return;}
   working=true;status.textContent=L[2];void scanFrame();
  }catch(error){if(!closed){status.textContent=L[5];console.warn('Plate scanner start:',error);}}
 }
 void start();
 return stop;
}
