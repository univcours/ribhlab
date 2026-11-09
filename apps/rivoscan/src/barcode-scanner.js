import {BrowserMultiFormatReader} from '@zxing/browser';

const I18N={
 en:['QR / Barcode','Live camera · automatic QR or barcode detection','Point the camera at a QR or barcode…','Detected','Copy','Choose photo','Torch','Camera not available. Choose a photo.','Saved to TXT + Excel','Could not save: ','Close','No code found — nothing captured'],
 ar:['QR / Barcode','الكاميرا كتتعرف تلقائياً على QR والباركود','وجّه الكاميرا نحو QR أو الباركود…','تم التعرف على','نسخ','اختيار صورة','ضوء','الكاميرا غير متاحة. اختار صورة.','تحفظ فـTXT وExcel','تعذر الحفظ: ','إغلاق','ما تلقا حتى كود — ما تصور وما تحفظ والو'],
 fr:['QR / Barcode','Reconnaissance automatique QR et code-barres','Cadrez un QR ou code-barres…','Détecté','Copier','Choisir photo','Torche','Caméra indisponible. Choisissez une photo.','Enregistré en TXT + Excel','Enregistrement impossible : ','Fermer','Aucun code détecté — rien capturé']
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
export function newScanDeduplicator({gapMs=1800,clock=()=>Date.now()}={}){
 let lastValue='',lastSeen=0;
 return {
  accept(value){
   const now=clock(),next=String(value??'');
   const duplicate=next===lastValue&&now-lastSeen<gapMs;
   lastValue=next;lastSeen=now;
   return !duplicate;
  },
  absence(){if(clock()-lastSeen>gapMs){lastValue='';lastSeen=0;}}
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
export function openBarcodeScanner({language='en',notify=()=>{},onScan=async()=>({saved:false}),onClose=()=>{}}={}){
 const L=I18N[language]||I18N.en;
 const overlay=document.createElement('div');overlay.className='rivo-code-overlay rivo-live-overlay';
 const box=document.createElement('section');box.className='rivo-live-dialog';
 box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label',L[0]);
 const head=document.createElement('header');head.className='rivo-live-head';
 const title=document.createElement('strong');title.textContent=L[0];
 const close=iconButton('✕',()=>stop());close.dataset.scanOverlayClose='true';
 head.append(title,close);
 const camera=document.createElement('div');camera.className='rivo-live-preview';
 const video=document.createElement('video');video.autoplay=true;video.muted=true;video.playsInline=true;
 const outline=document.createElement('canvas');outline.className='rivo-detection-outline';outline.setAttribute('aria-hidden','true');
 camera.append(video,outline);
 const help=document.createElement('p');help.className='rivo-live-help';help.textContent=L[1];
 const status=document.createElement('p');status.className='rivo-live-status';status.setAttribute('role','status');status.textContent=L[2];
 const result=document.createElement('pre');result.className='rivo-live-result';result.hidden=true;
 const actions=document.createElement('div');actions.className='rivo-live-actions';
 const copy=iconButton(L[4],()=>navigator.clipboard?.writeText(result.textContent||'').catch(()=>notify('Copy unavailable',true)));
 copy.hidden=true;
 const torch=iconButton('⚡ '+L[6],()=>toggleTorch());
 const file=iconButton(L[5],()=>picker.click());
 actions.append(torch,file,copy);
 const picker=document.createElement('input');picker.type='file';picker.accept='image/*';picker.hidden=true;
 box.append(head,help,camera,status,result,actions,picker);overlay.append(box);document.body.append(overlay);
 const reader=new BrowserMultiFormatReader();
 const dedup=newScanDeduplicator(),streams=[],temporaryURLs=[];
 let control=null,closed=false,light=false,lastDetectionAt=0;
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
 async function deliver(decoded){
  if(closed)return;
  const entry=recognizedCode(decoded);
  // No valid decoded symbol = no photo, no outline, no capture, no log.
  if(!entry)return;
  if(!dedup.accept(entry.value))return;
  lastDetectionAt=Date.now();
  drawOutline(outline,video,decoded.getResultPoints?.()||[]);
  playDetectedAnimation();
  result.textContent=entry.value;result.hidden=false;copy.hidden=false;
  status.textContent=L[3]+' · '+entry.format;
  try{
   // Auto-save decoded TEXT only. Never take a still photo from empty frames.
   const saved=await onScan(entry);
   if(!closed)status.textContent=(saved?.saved?L[8]:L[9]+(saved?.reason||'Local export unavailable'))+' · '+entry.format;
  }catch(error){if(!closed){status.textContent=L[9]+String(error?.message||error);notify(status.textContent,true);}}
 }
 picker.addEventListener('change',async()=>{
  const item=picker.files?.[0];picker.value='';if(!item)return;
  const url=URL.createObjectURL(item);temporaryURLs.push(url);
  try{
   const image=new Image();image.src=url;await image.decode();
   const canvas=document.createElement('canvas'),s=Math.min(1,2400/Math.max(image.naturalWidth,image.naturalHeight));
   canvas.width=Math.max(1,Math.round(image.naturalWidth*s));canvas.height=Math.max(1,Math.round(image.naturalHeight*s));
   canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
   const found=reader.decodeFromCanvas(canvas);await deliver(found);
  }catch{status.textContent=L[11];clearDetectionOutline();}
 });
 async function start(){
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});
   if(closed){stream.getTracks().forEach(t=>t.stop());return;}
   streams.push(...stream.getTracks());video.srcObject=stream;await video.play();
   control=await reader.decodeFromVideoElement(video,(decoded,error)=>{
    if(closed)return;
    if(decoded){void deliver(decoded);}
    else {
     if(error)dedup.absence();
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
