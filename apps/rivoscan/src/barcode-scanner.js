import {BrowserMultiFormatReader} from '@zxing/browser';

const LABELS={
 en:['Scan QR / Barcode','Take a photo','Choose an image','Scanned code','Copy','Open website','Close','No readable code found. Try a sharper, brighter photo.','Scanning locally…','Camera unavailable: choose an image instead.','Result is text; links are never opened automatically.'],
 ar:['قراءة QR والباركود','تصوير الكود','اختيار صورة','الكود المقروء','نسخ','فتح الموقع','إغلاق','ما لقيناش كود مقروء. جرب صورة أوضح وإضاءة مزيانة.','جاري القراءة محلياً…','الكاميرا غير متاحة، اختار صورة.','النتيجة نص؛ الروابط ما كتتحلش تلقائياً.'],
 fr:['Lire QR / Code-barres','Photographier','Choisir une image','Code lu','Copier','Ouvrir le site','Fermer','Code illisible. Essayez une image plus nette.','Lecture locale…','Caméra indisponible : choisir une image.','Un lien ne sera jamais ouvert automatiquement.'],
 es:['Leer QR / Código','Fotografiar','Elegir imagen','Código detectado','Copiar','Abrir sitio','Cerrar','Código ilegible. Prueba una foto nítida.','Lectura local…','Cámara no disponible. Elige imagen.','Los enlaces nunca se abren automáticamente.'],
 de:['QR / Barcode lesen','Foto aufnehmen','Bild wählen','Erkannter Code','Kopieren','Webseite öffnen','Schließen','Code nicht lesbar. Schärfer fotografieren.','Lokal scannen…','Kamera nicht verfügbar. Bild wählen.','Links werden nie automatisch geöffnet.'],
 pt:['Ler QR / Código','Tirar foto','Escolher imagem','Código lido','Copiar','Abrir site','Fechar','Código ilegível. Fotografe com mais luz.','A ler localmente…','Câmara indisponível. Escolha imagem.','Os links nunca abrem automaticamente.'],
 it:['Leggi QR / Barcode','Scatta foto','Scegli immagine','Codice letto','Copia','Apri sito','Chiudi','Codice illeggibile. Scatta una foto nitida.','Lettura locale…','Fotocamera non disponibile. Scegli immagine.','I link non vengono aperti automaticamente.']
};
export const safeScannedUrl=value=>{
 const raw=String(value??'').trim();
 if(raw.length>2048 || !/^https?:\/\//i.test(raw))return null;
 try{const url=new URL(raw);if(!['http:','https:'].includes(url.protocol)||!url.hostname)return null;return url.href;}
 catch{return null}
};
function button(parent,caption,action){
 const b=document.createElement('button');b.type='button';b.textContent=caption;b.addEventListener('click',action);parent.append(b);return b;
}
const EXTRA={
 en:{live:'Live camera',again:'Scan next',saved:'Saved to code database',pending:'Code saved; retry Excel sync',excel:'Sync / export Excel',clear:'Clear all codes',confirm:'Delete ALL scanned codes and the Excel database?',recent:'Recent scans',count:'scans',error:'Unable to save code',ready:'Point camera at a QR or barcode',empty:'No scans stored yet'},
 ar:{live:'الكاميرا المباشرة',again:'مسح الكود التالي',saved:'تحفظ الكود في قاعدة البيانات',pending:'تحفظ الكود؛ خاص إعادة مزامنة Excel',excel:'مزامنة / تصدير Excel',clear:'تفريغ جميع الأكواد',confirm:'واش متأكد باغي تمسح جميع الأكواد وملف Excel؟',recent:'آخر الأكواد',count:'كود',error:'تعذر حفظ الكود',ready:'وجه الكاميرا نحو QR أو Barcode',empty:'مازال ما تحفظ حتى كود'},
 fr:{live:'Caméra directe',again:'Scanner le suivant',saved:'Code enregistré',pending:'Code conservé ; synchroniser Excel',excel:'Synchroniser / exporter Excel',clear:'Effacer les codes',confirm:'Supprimer tous les codes et le fichier Excel ?',recent:'Derniers scans',count:'scans',error:'Enregistrement impossible',ready:'Visez le QR ou code-barres',empty:'Aucun code enregistré'}
};
export async function decodeCodeImage(image,reader=new BrowserMultiFormatReader()){
 const longSide=Math.max(image.naturalWidth,image.naturalHeight);
 if(!longSide)throw Error('Invalid image.');
 // Try original orientation and quarter-turns at readable resolutions. This
 // handles portrait barcodes and photos taken with incorrect EXIF rotation.
 let lastError;
 for(const cap of [2800,1600]){
  const scale=Math.min(1,cap/longSide);
  const w=Math.max(1,Math.round(image.naturalWidth*scale));
  const h=Math.max(1,Math.round(image.naturalHeight*scale));
  for(const deg of [0,90,270,180]){
   const rotate=deg===90||deg===270;
   const canvas=document.createElement('canvas');
   canvas.width=rotate?h:w;canvas.height=rotate?w:h;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});
   ctx.translate(canvas.width/2,canvas.height/2);
   ctx.rotate(deg*Math.PI/180);
   ctx.drawImage(image,-w/2,-h/2,w,h);
   try{return reader.decodeFromCanvas(canvas);}
   catch(error){lastError=error;}
   finally{canvas.width=0;canvas.height=0;}
  }
 }
 throw lastError||Error('Code not found.');
}
export function openBarcodeScanner({language='en',capture,notify=()=>{},ledger}={}){
 const L=LABELS[language]||LABELS.en;
 const T=EXTRA[language]||EXTRA.en;
 const overlay=document.createElement('div');overlay.className='rivo-code-overlay';
 const box=document.createElement('section');box.className='rivo-code-dialog';
 box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label',L[0]);
 const title=document.createElement('h2');title.textContent=L[0];box.append(title);
 const video=document.createElement('video');video.className='rivo-code-video';
 video.autoplay=true;video.playsInline=true;video.muted=true;video.hidden=true;
 box.append(video);
 const buttons=document.createElement('div');buttons.className='rivo-code-actions';box.append(buttons);
 const preview=document.createElement('img');preview.className='rivo-code-preview';preview.alt='';preview.hidden=true;box.append(preview);
 const status=document.createElement('p');status.setAttribute('role','status');status.className='rivo-code-status';
 status.textContent=T.ready;box.append(status);
 const result=document.createElement('pre');result.className='rivo-code-result';result.hidden=true;box.append(result);
 const resultActions=document.createElement('div');resultActions.className='rivo-code-actions';box.append(resultActions);
 const history=document.createElement('section');history.className='rivo-code-history';history.hidden=true;box.append(history);
 const help=document.createElement('p');help.className='rivo-code-help';help.textContent=L[10];box.append(help);
 const input=document.createElement('input');input.type='file';input.accept='image/*';input.hidden=true;box.append(input);
 const reader=new BrowserMultiFormatReader(undefined,{delayBetweenScanAttempts:250,delayBetweenScanSuccess:500});
 let closed=false,pending=false,objectUrl=null,controls=null,videoSession=0;
 const stopLive=()=>{
  ++videoSession;
  if(controls){try{void controls.stop();}catch{}controls=null;}
  try{video.pause();}catch{}
  if(video.srcObject)for(const track of video.srcObject.getTracks())track.stop();
  video.srcObject=null;video.hidden=true;
 };
 const escape=event=>{if(event.key==='Escape')cleanup();};
 const cleanup=()=>{
  if(closed)return;
  closed=true;stopLive();
  if(objectUrl)URL.revokeObjectURL(objectUrl);
  document.removeEventListener('keydown',escape);
  overlay.remove();
 };
 const readHistory=async()=>{
  if(!ledger?.list){history.hidden=true;return;}
  const entries=await ledger.list();
  history.hidden=entries.length===0;history.replaceChildren();
  if(!entries.length)return;
  const heading=document.createElement('div');heading.className='rivo-code-history-head';
  const count=document.createElement('strong');count.textContent=T.recent+' · '+entries.length+' '+T.count;
  heading.append(count);history.append(heading);
  const actions=document.createElement('div');actions.className='rivo-code-actions rivo-code-ledger-actions';history.append(actions);
  button(actions,T.excel,async()=>{
   if(pending)return;
   pending=true;try{
    const info=await ledger.export();
    status.textContent=info.empty?T.empty:T.saved+' · '+info.total+' '+T.count;
    notify(status.textContent);
   }catch(error){status.textContent=String(error?.message||error);}
   finally{pending=false;}
  });
  button(actions,T.clear,async()=>{
   if(pending||!window.confirm(T.confirm))return;
   pending=true;stopLive();
   try{
    const response=await ledger.clear();
    status.textContent=T.empty;result.hidden=true;resultActions.replaceChildren();
    await readHistory();notify(String(response.cleared)+' '+T.count);
   }catch(error){status.textContent=String(error?.message||error);}
   finally{pending=false;}
  });
  const list=document.createElement('ol');list.className='rivo-code-history-list';
  for(const entry of entries.slice(-5).reverse()){
   const row=document.createElement('li');
   const code=document.createElement('strong');code.textContent=entry.code;
   const date=document.createElement('small');date.textContent=entry.format+' · '+new Date(entry.scannedAt).toLocaleString(language);
   row.append(code,date);list.append(row);
  }
  history.append(list);
 };
 const accept=async value=>{
  if(closed||pending)return;
  pending=true;
  stopLive();
  const text=String(value.getText());
  result.textContent=text;result.hidden=false;
  resultActions.replaceChildren();
  const type=String(value.getBarcodeFormat?.()??'UNKNOWN');
  status.textContent=L[3]+' · '+type;
  button(resultActions,L[4],async()=>{
   try{await navigator.clipboard.writeText(text);notify(L[4]+' ✓');}
   catch{window.prompt(L[4],text);}
  });
  button(resultActions,T.again,()=>{void startLive();});
  const link=safeScannedUrl(text);
  if(link)button(resultActions,L[5],()=>{
   if(window.confirm(L[5]+'?\n'+link))window.open(link,'_blank','noopener,noreferrer');
  });
  try{
   if(!ledger?.append)throw Error('Code database is unavailable.');
   const saved=await ledger.append(text,type);
   if(closed)return;
   status.textContent=(saved.synced?T.saved:T.pending)+' · '+saved.total+' '+T.count;
   if(!saved.synced)status.textContent+=' · '+saved.error;
   await readHistory();
  }catch(error){
   if(!closed)status.textContent=T.error+': '+String(error?.message||error);
  }finally{pending=false;}
 };
 const startLive=async()=>{
  if(closed||pending)return;
  stopLive();preview.hidden=true;
  const token=videoSession;
  status.textContent=T.ready;video.hidden=false;
  try{
   const active=await reader.decodeFromVideoDevice(undefined,video,(decoded,err,scannerControls)=>{
    if(!decoded||closed||token!==videoSession||pending)return;
    try{void scannerControls.stop();}catch{}
    void accept(decoded);
   });
   if(closed||token!==videoSession)void active.stop();
   else controls=active;
  }catch(error){
   video.hidden=true;
   if(!closed)status.textContent=L[9]+': '+String(error?.message||error);
  }
 };
 const decodePhoto=async uri=>{
  if(closed||pending)return;
  stopLive();
  status.textContent=L[8];preview.hidden=true;
  const image=new Image();image.decoding='async';
  await new Promise((resolve,reject)=>{
   image.onload=resolve;image.onerror=()=>reject(Error(L[7]));
   image.src=uri;if(image.complete&&image.naturalWidth)resolve();
  });
  if(closed)return;
  preview.src=uri;preview.hidden=false;
  let code;
  try{code=await decodeCodeImage(image,reader);}
  catch{status.textContent=L[7];return;}
  await accept(code);
 };
 button(buttons,T.live,()=>{void startLive();});
 button(buttons,L[1],async()=>{
  if(pending)return;
  stopLive();
  try{const uri=await capture?.();if(!uri)throw Error(L[9]);await decodePhoto(uri);}
  catch(error){if(!closed)status.textContent=String(error?.message||error);}
 });
 button(buttons,L[2],()=>{stopLive();input.click();});
 button(buttons,L[6],cleanup).dataset.rivoDialogClose='true';
 input.addEventListener('change',()=>{
  const file=input.files?.[0];input.value='';
  if(!file)return;
  if(objectUrl)URL.revokeObjectURL(objectUrl);
  objectUrl=URL.createObjectURL(file);
  void decodePhoto(objectUrl).catch(error=>{if(!closed)status.textContent=String(error?.message||error);});
 });
 overlay.append(box);document.body.append(overlay);
 overlay.addEventListener('click',event=>{if(event.target===overlay)cleanup();});
 document.addEventListener('keydown',escape);
 // Video capture begins in the same user click that opened the scanner.
 void readHistory().catch(error=>{status.textContent=String(error?.message||error);});
 void startLive();
 return cleanup;
}
