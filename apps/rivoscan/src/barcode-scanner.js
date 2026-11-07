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
export function openBarcodeScanner({language='en',capture,notify=()=>{}}={}){
 const L=LABELS[language]||LABELS.en;
 const overlay=document.createElement('div');overlay.className='rivo-code-overlay';
 const box=document.createElement('section');box.className='rivo-code-dialog';
 box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label',L[0]);
 const title=document.createElement('h2');title.textContent=L[0];box.append(title);
 const buttons=document.createElement('div');buttons.className='rivo-code-actions';box.append(buttons);
 const preview=document.createElement('img');preview.className='rivo-code-preview';preview.alt='';preview.hidden=true;box.append(preview);
 const status=document.createElement('p');status.setAttribute('role','status');box.append(status);
 const result=document.createElement('pre');result.className='rivo-code-result';result.hidden=true;box.append(result);
 const resultActions=document.createElement('div');resultActions.className='rivo-code-actions';box.append(resultActions);
 const help=document.createElement('p');help.className='rivo-code-help';help.textContent=L[10];box.append(help);
 const input=document.createElement('input');input.type='file';input.accept='image/*';input.hidden=true;box.append(input);
 let closed=false,pending=false,objectUrl=null;
 const cleanup=()=>{closed=true;if(objectUrl)URL.revokeObjectURL(objectUrl);overlay.remove()};
 const decode=async url=>{
  if(closed||pending)return;
  pending=true;status.textContent=L[8];result.hidden=true;resultActions.replaceChildren();
  try{
   const reader=new BrowserMultiFormatReader();
   const image=new Image();image.decoding='async';image.src=url;
   await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error(L[7]));if(image.complete&&image.naturalWidth)resolve()});
   if(closed)return;
   preview.src=url;preview.hidden=false;
   const code=reader.decodeFromCanvas(toCanvas(image));
   if(closed)return;
   const value=code.getText();result.textContent=value;result.hidden=false;
   status.textContent=L[3]+' · '+String(code.getBarcodeFormat?.()??'');
   button(resultActions,L[4],async()=>{
    try{await navigator.clipboard.writeText(value);notify(L[4]+' ✓')}
    catch{notify(L[4]+': '+value)}
   });
   const link=safeScannedUrl(value);
   if(link)button(resultActions,L[5],()=>{if(window.confirm(L[5]+'?\n'+link))window.open(link,'_blank','noopener,noreferrer')});
  }catch(error){if(!closed)status.textContent=L[7]}
  finally{pending=false}
 };
 button(buttons,L[1],async()=>{
  if(pending)return;
  try{const uri=await capture?.();if(!uri)throw Error(L[9]);await decode(uri)}
  catch(error){if(!closed)status.textContent=error?.message||L[9]}
 });
 button(buttons,L[2],()=>input.click());
 button(buttons,L[6],cleanup);
 input.addEventListener('change',()=>{
  const file=input.files?.[0];input.value='';
  if(!file)return;
  if(objectUrl)URL.revokeObjectURL(objectUrl);
  objectUrl=URL.createObjectURL(file);decode(objectUrl);
 });
 overlay.append(box);document.body.append(overlay);
 overlay.addEventListener('click',event=>{if(event.target===overlay)cleanup()});
 const escape=event=>{if(event.key==='Escape'){cleanup();document.removeEventListener('keydown',escape)}};
 document.addEventListener('keydown',escape);
 return cleanup;
}
function toCanvas(image){
 const max=2400,scale=Math.min(1,max/Math.max(image.naturalWidth,image.naturalHeight));
 const canvas=document.createElement('canvas');
 canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
 canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
 const ctx=canvas.getContext('2d',{willReadFrequently:true});
 ctx.drawImage(image,0,0,canvas.width,canvas.height);
 return canvas;
}
