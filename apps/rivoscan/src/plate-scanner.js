import {createWorker} from 'tesseract.js';

const labels={
 en:['Plate Scanner Pro','Search plate / digits while camera is live','Point camera toward a license plate','Saved plate','Target matched · photo captured','Camera unavailable','OCR model may download on first launch','No target'],
 ar:['قارئ لوحات السيارات Pro','بحث عن لوحة أو أرقام والكاميرا خدامة','وجّه الكاميرا نحو لوحة السيارة','تسجلات اللوحة','مطابقة · تصورات السيارة','الكاميرا غير متاحة','أول مرة يمكن تحتاج تحميل نموذج OCR','بلا بحث'],
 fr:['Scanner de plaques Pro','Rechercher une plaque ou des chiffres en direct','Cadrez une plaque','Plaque enregistrée','Correspondance · photo enregistrée','Caméra indisponible','Le modèle OCR peut se télécharger au premier lancement','Aucune cible']
};
export function normalizePlate(value){
 return String(value??'').normalize('NFKC').replace(/[٠-٩۰-۹]/g,d=>{
  const i='٠١٢٣٤٥٦٧٨٩'.indexOf(d);
  return i>=0?String(i):String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
 }).toUpperCase().replace(/[^A-Z0-9\u0621-\u064A]/g,'');
}
export function plateCandidates(text){
 const raw=String(text||'').normalize('NFKC')
  .replace(/[٠-٩۰-۹]/g,d=>{
   const i='٠١٢٣٤٥٦٧٨٩'.indexOf(d);
   return String(i>=0?i:'۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
  }).toUpperCase();
 const out=[];
 for(const line of raw.split(/\n+/)){
  const patterns=[
   /(?:^|\s)(\d{2,6})[\s\-|]*([A-Z\u0621-\u064A])[\s\-|]*(\d{1,2})(?:\s|$)/g,
   /(?:^|\s)([A-Z]{1,3})[\s\-]*([0-9]{3,6})(?:\s|$)/g
  ];
  for(const pattern of patterns){
   for(const match of line.matchAll(pattern)){
    const plate=normalizePlate(match.slice(1).join(''));
    if(plate.length>=5&&plate.length<=12&&!out.includes(plate))out.push(plate);
   }
  }
 }
 return out;
}
export function matchesPlate(plate,query){
 const p=normalizePlate(plate),q=normalizePlate(query);
 return q.length>=3&&p.includes(q);
}

// Manual search stays live. Pinned targets are local-only, not uploaded.
export function matchingPlateTargets(plate,targets=[]){
 const qs=Array.isArray(targets)?targets:[targets];
 return [...new Set(qs.map(normalizePlate).filter(q=>q.length>=3&&matchesPlate(plate,q)))];
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
 const close=btn('✕',()=>stop());close.dataset.scanOverlayClose='true';header.append(title,close);
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
 addTarget.title=language==='ar'?'إضافة رقم للمراقبة':'Add watch target';
 search.addEventListener('keydown',e=>{
  if(e.key==='Enter'){e.preventDefault();addTarget.click();}
 });
 searchRow.append(search,addTarget);renderWatch();
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
 const torch=btn('⚡',()=>toggleTorch());foot.append(count,torch);
 const hint=document.createElement('p');hint.className='rivo-live-help';hint.textContent=L[6];
 panel.append(header,searchRow,pinned,view,status,last,foot,hint);layer.append(panel);document.body.append(layer);
 const observed=new Map(),confirmed=new Map();
 let worker=null,stream=null,closed=false,working=false,foundCount=0,light=false,nextTimer=0,processing=false;
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
  const width=Math.min(1440,video.videoWidth||1280),ratio=width/(video.videoWidth||1280);
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
  const now=Date.now();
  for(const [p,time] of confirmed)if(now-time>30000)confirmed.delete(p);
  if(closed||confirmed.has(plate))return;
  const match=matchingPlateTargets(plate,[search.value,...watch]).length>0;
  // A brief second OCR confirmation suppresses false alarms/captures.
  confirmed.set(plate,now);
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
   // Focus OCR on the on-screen number-plate target, not the whole vehicle/background.
   const canvas=snapshot();
   const roi={x:Math.round(canvas.width*.10),y:Math.round(canvas.height*.29),
    w:Math.round(canvas.width*.80),h:Math.round(canvas.height*.43)};
   const scale=Math.min(1.35,1100/Math.max(roi.w,roi.h));
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
   if(Number(data.confidence)>=55){
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
     const seen=observed.get(plate);
     const streak=seen&&now-seen.time<6500?seen.streak+1:1;
     observed.set(plate,{time:now,streak});
     if(streak>=2)await recordPlate(plate);
    }
   }
   if(!framed){detection.hidden=true;guide.hidden=false;}
   for(const [plate,info] of observed)if(now-info.time>8000)observed.delete(plate);
  }catch(error){if(!closed)console.warn('License plate OCR:',error);}
  finally{processing=false;if(!closed)nextTimer=setTimeout(scanFrame,650);}
 }
 async function start(){
  try{
   stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}}});
   if(closed){stream.getTracks().forEach(t=>t.stop());return;}
   video.srcObject=stream;await video.play();
   worker=await createWorker(['eng','ara'],1).catch(()=>createWorker('eng',1));
   if(closed){void worker.terminate();return;}
   working=true;status.textContent=L[2];void scanFrame();
  }catch(error){if(!closed){status.textContent=L[5];console.warn('Plate scanner start:',error);}}
 }
 void start();
 return stop;
}
