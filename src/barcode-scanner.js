import {BrowserMultiFormatReader} from '@zxing/browser';
import {scanMultipleCanvas,verifiedUniqueCodes} from './code-multi-scan.js';

const I18N={
 en:['QR / Barcode UltraScan','Live camera · automatic QR or barcode detection','Point the camera at a QR or barcode…','Detected','Copy','Choose photo','Torch','Camera not available. Choose a photo.','Saved to daily TXT','Could not save: ','Close','No code found — nothing captured'],
 ar:['QR / Barcode UltraScan','الكاميرا كتتعرف تلقائياً على QR والباركود','وجّه الكاميرا نحو QR أو الباركود…','تم التعرف على','نسخ','اختيار صورة','ضوء','الكاميرا غير متاحة. اختار صورة.','تحفظ فملف TXT حسب التاريخ والنوع','تعذر الحفظ: ','إغلاق','ما تلقا حتى كود — ما تصور وما تحفظ والو'],
 fr:['QR / Barcode UltraScan','Reconnaissance automatique QR et code-barres','Cadrez un QR ou code-barres…','Détecté','Copier','Choisir photo','Torche','Caméra indisponible. Choisissez une photo.','Enregistré dans le TXT du jour','Enregistrement impossible : ','Fermer','Aucun code détecté — rien capturé']
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
 const xs=valid.map(x=>offX+x.getX()*scale),ys=valid.map(x=>offY+x.getY()*scale);
 const minX=Math.max(4,Math.min(...xs)-14),maxX=Math.min(w-4,Math.max(...xs)+14);
 const minY=Math.max(4,Math.min(...ys)-14),maxY=Math.min(h-4,Math.max(...ys)+14);
 if(maxX<=minX||maxY<=minY)return false;
 ctx.strokeStyle='#2CF2D5';ctx.lineWidth=3;ctx.shadowColor='#2CF2D5';ctx.shadowBlur=7;
 ctx.strokeRect(minX,minY,maxX-minX,maxY-minY);
 return true;
}
export function openBarcodeScanner({language='en',notify=()=>{},onScan=async()=>({saved:false}),onSuccess=()=>{},onClose=()=>{}}={}){
 const L=I18N[language]||I18N.en;
 const overlay=document.createElement('div');overlay.className='rivo-code-overlay rivo-live-overlay';
 const box=document.createElement('section');box.className='rivo-live-dialog';
 box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label',L[0]);
 const head=document.createElement('header');head.className='rivo-live-head';
 const title=document.createElement('strong');title.textContent=L[0];
 const counter=document.createElement('span');counter.className='rivo-code-count';counter.textContent='0';counter.setAttribute('aria-label','Saved codes');
 const close=iconButton('✕',()=>stop());close.dataset.scanOverlayClose='true';
 head.append(title,counter,close);
 const camera=document.createElement('div');camera.className='rivo-live-preview';
 const video=document.createElement('video');video.autoplay=true;video.muted=true;video.playsInline=true;
 const outline=document.createElement('canvas');outline.className='rivo-detection-outline';outline.setAttribute('aria-hidden','true');
 const guide=document.createElement('div');guide.className='rivo-code-target-guide';guide.setAttribute('aria-hidden','true');
 camera.append(video,guide,outline);
 const help=document.createElement('p');help.className='rivo-live-help';help.textContent=L[1];
 const status=document.createElement('p');status.className='rivo-live-status';status.setAttribute('role','status');status.textContent=L[2];
 const result=document.createElement('pre');result.className='rivo-live-result';result.hidden=true;
 const actions=document.createElement('div');actions.className='rivo-live-actions';
 const copy=iconButton(L[4],()=>navigator.clipboard?.writeText(result.textContent||'').catch(()=>notify('Copy unavailable',true)));
 copy.hidden=true;
 const torch=iconButton('⚡ '+L[6],()=>toggleTorch());
 const file=iconButton(L[5],()=>picker.click());
 const zoomMinus=iconButton('−',()=>manualZoom(-1)),zoomPlus=iconButton('+',()=>manualZoom(1));
 const autoZoom=iconButton('AUTO',()=>{zoom.auto=!zoom.auto;lastCodeAt=Date.now()-2500;updateZoomUI();});
 const zoomLabel=document.createElement('span');zoomLabel.className='rivo-code-zoom-label';zoomLabel.setAttribute('aria-live','polite');
 const zoomActions=document.createElement('div');zoomActions.className='rivo-code-zoom-controls';
 zoomMinus.setAttribute('aria-label','Zoom out');zoomPlus.setAttribute('aria-label','Zoom in');
 autoZoom.setAttribute('aria-label','Automatic camera zoom');
 zoomActions.append(zoomMinus,zoomLabel,zoomPlus,autoZoom);
 actions.append(torch,file,copy);
 const picker=document.createElement('input');picker.type='file';picker.accept='image/*';picker.hidden=true;
 box.append(head,help,camera,status,result,zoomActions,actions,picker);overlay.append(box);document.body.append(overlay);
 const reader=new BrowserMultiFormatReader();
 const dedup=newScanDeduplicator(),streams=[],temporaryURLs=[];
 let control=null,closed=false,light=false,lastDetectionAt=0;
 let multiTimer=null,multiActive=false,multiFrameCount=0;
 let successful=0;
 const multiCanvas=document.createElement('canvas');
 const codeHistory=new Map();
 const updateCount=()=>{counter.textContent=String(successful);counter.title=successful+' codes saved';};

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
  // No verified symbol = no photo, no outline, no capture, no log.
  if(!entry)return;
  // Scanner sees both QR and ordinary barcode without changing any modes.
  if(!dedup.accept(entry.format+'\u0000'+entry.value))return;
  if(fromPhoto){
   // Photo result points belong to the imported image, NOT to the live
   // camera preview: drawing those there would be a misleading overlay.
   lastDetectionAt=0;clearDetectionOutline();
  }else{
   lastDetectionAt=Date.now();
   if(drawOutline(outline,video,decoded.getResultPoints?.()||[]))
    playDetectedAnimation();
  }
  codeHistory.set(entry.format+'\u0000'+entry.value,entry);
  result.textContent=[...codeHistory.values()].slice(-8).map(v=>v.format+' · '+v.value).join('\n');
  result.hidden=false;copy.hidden=false;
  status.textContent=L[3]+' · '+entry.format;
  try{
   // Auto-save decoded TEXT only. Never take a still photo from empty frames.
   const saved=await onScan(entry);
   if(saved?.saved){
    successful++;updateCount();
    try{onSuccess(entry);}catch(error){console.warn('Scan success feedback:',error);}
    try{navigator.vibrate?.(55);}catch{}
   }
   if(!closed)status.textContent=(saved?.saved?L[8]:L[9]+(saved?.reason||'Local export unavailable'))+' · '+entry.format;
  }catch(error){if(!closed){status.textContent=L[9]+String(error?.message||error);notify(status.textContent,true);}}
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
    for(const {result:decoded} of found){if(closed)break;await deliver(decoded,{fromPhoto:true});}
    if(!closed)status.textContent=found.length+' code(s) found on page · '+successful+' saved';
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
   const decoded=scanMultipleCanvas(multiCanvas,{maxResults:22,fine:false});
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
    for(const {result:found} of codes){if(closed)break;await deliver(found);}
    if(!closed&&codes.length>1)status.textContent=codes.length+' code(s) detected · '+successful+' saved';
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
