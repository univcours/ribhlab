/** Optional on-device portrait cutout for printable ID sheets. */
import {segmentPortrait} from './photo-background.js';
export const MM_TO_PX_300=300/25.4;
export const photoSizes={
 '35x45':{label:'35 × 45 mm',w:35,h:45},
 '30x40':{label:'30 × 40 mm',w:30,h:40},
 '40x50':{label:'40 × 50 mm',w:40,h:50},
 '2x2':{label:'2 × 2 in (US)',w:50.8,h:50.8}
};
export function layoutIDPhotoSheet(preset='35x45'){
 const size=photoSizes[preset];if(!size)throw Error('Unsupported photo size');
 const sheetW=Math.round(100*MM_TO_PX_300),sheetH=Math.round(150*MM_TO_PX_300);
 const photoW=Math.round(size.w*MM_TO_PX_300),photoH=Math.round(size.h*MM_TO_PX_300);
 const gap=Math.round(3*MM_TO_PX_300),margin=Math.round(5*MM_TO_PX_300);
 const columns=Math.floor((sheetW-2*margin+gap)/(photoW+gap));
 const rows=Math.floor((sheetH-2*margin+gap)/(photoH+gap));
 const result=[];
 for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
  result.push({x:margin+x*(photoW+gap),y:margin+y*(photoH+gap),w:photoW,h:photoH});
 }
 if(!result.length)throw Error('Photo does not fit the sheet');
 return {sheetW,sheetH,photoW,photoH,positions:result};
}
// PNG pHYs chunk records 300 DPI so photo kiosks honor the 10 x 15 cm layout.
export function setPNGResolution(bytes,dpi=300){
 const pixelsPerMeter=Math.round(dpi/0.0254);
 if(!Number.isSafeInteger(pixelsPerMeter)||pixelsPerMeter<1||pixelsPerMeter>0xffffffff)
  throw Error('Invalid print resolution');
 const src=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
 const png=[137,80,78,71,13,10,26,10];
 if(src.length<33||png.some((v,i)=>src[i]!==v))throw Error('Not a valid PNG');
 const view=new DataView(src.buffer,src.byteOffset,src.byteLength);
 if(view.getUint32(8)!==13||String.fromCharCode(...src.slice(12,16))!=='IHDR')throw Error('Invalid PNG header');
 const chunk=new Uint8Array(21),ch=new DataView(chunk.buffer);
 ch.setUint32(0,9);chunk.set([112,72,89,115],4);ch.setUint32(8,pixelsPerMeter);ch.setUint32(12,pixelsPerMeter);chunk[16]=1;
 let crc=0xffffffff;for(let i=4;i<=16;i++){
  crc^=chunk[i];for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);
 }
 ch.setUint32(17,(crc^0xffffffff)>>>0);
 const out=new Uint8Array(src.length+21);out.set(src.subarray(0,33),0);
 out.set(chunk,33);out.set(src.subarray(33),54);return out;
}
const strings={
 en:['ID Photo Maker','Choose portrait','Photo size','Headroom','Left / Right','Make sheet','Save PNG · 10×15 cm at 300 DPI','Close','Optional local portrait background replacement uses a model download. Review the cutout; acceptance is not guaranteed.','Image could not be loaded.'],
 ar:['صور شخصية للطباعة','اختار صورة شخصية','المقاس','الفوق والتحت','يمين ويسار','وجد الورقة','حفظ PNG · 10×15 سم بدقة 300 DPI','إغلاق','تغيير الخلفية اختياري ومحلي بعد تحميل النموذج. راجع حواف الشخص؛ قبول الصورة ماشي مضمون.','تعذر فتح الصورة.'],
 fr:['Photos d’identité','Choisir portrait','Format','Hauteur','Gauche / Droite','Créer planche','Enregistrer PNG · 10×15 cm, 300 DPI','Fermer','Détourage local facultatif après téléchargement du modèle. Vérifiez le résultat; aucune garantie officielle.','Image illisible.'],
 es:['Fotos de carné','Elegir foto','Tamaño','Altura','Izquierda / derecha','Crear hoja','Guardar PNG · 10×15 cm, 300 DPI','Cerrar','Cambio de fondo local facultativo. Compruebe los bordes; aceptación no garantizada.','Imagen inválida.'],
 de:['Passfotos','Portrait wählen','Größe','Höhe','Links / Rechts','Blatt erstellen','PNG · 10×15 cm, 300 DPI','Schließen','Optionaler lokaler Hintergrundwechsel. Ränder prüfen; keine behördliche Garantie.','Bild ungültig.'],
 pt:['Fotos de identificação','Escolher retrato','Tamanho','Altura','Esquerda / direita','Criar folha','Guardar PNG · 10×15 cm, 300 DPI','Fechar','Mudança de fundo local opcional. Verifique contornos; aceitação não garantida.','Imagem inválida.'],
 it:['Foto tessera','Scegli ritratto','Formato','Altezza','Sinistra / destra','Crea foglio','Salva PNG · 10×15 cm, 300 DPI','Chiudi','Sostituzione locale opzionale. Controlla i bordi; nessuna garanzia ufficiale.','Immagine non valida.']
};
function cropImage(ctx,image,rect,offsetX,offsetY){
 const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
 const wanted=rect.w/rect.h,actual=iw/ih;
 let sw,sh;if(actual>wanted){sh=ih;sw=sh*wanted}else{sw=iw;sh=sw/wanted}
 const horizontal=(iw-sw)*(.5+offsetX/200);
 const vertical=(ih-sh)*(.5+offsetY/200);
 ctx.drawImage(image,Math.max(0,Math.min(iw-sw,horizontal)),
    Math.max(0,Math.min(ih-sh,vertical)),sw,sh,
    rect.x,rect.y,rect.w,rect.h);
}
export async function openIDPhotoMaker({language='en',save,notify=()=>{}}={}){
 const L=strings[language]||strings.en;
 const overlay=document.createElement('div');overlay.className='rivo-id-overlay';
 const panel=document.createElement('section');panel.className='rivo-id-dialog';panel.setAttribute('role','dialog');
 panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',L[0]);
 const title=document.createElement('h2');title.textContent=L[0];panel.append(title);
 const select=document.createElement('select');for(const [key,size] of Object.entries(photoSizes)){const opt=document.createElement('option');opt.value=key;opt.textContent=size.label;select.append(opt)}
 const input=document.createElement('input');input.type='file';input.accept='image/*';input.setAttribute('aria-label',L[1]);
 const x=document.createElement('input');x.type='range';x.min='-100';x.max='100';x.value='0';
 const y=document.createElement('input');y.type='range';y.min='-100';y.max='100';y.value='0';
 const canvas=document.createElement('canvas');canvas.className='rivo-id-preview';
 const hint=document.createElement('p');hint.textContent=L[8];hint.className='rivo-id-hint';
 const status=document.createElement('p');status.setAttribute('role','status');
 const actions=document.createElement('div');actions.className='rivo-code-actions';
 const row=(caption,control)=>{const label=document.createElement('label');label.className='rivo-id-row';label.textContent=caption;label.append(control);panel.append(label)};
 row(L[1],input);row(L[2],select);row(L[3],y);row(L[4],x);
 const bgSelect=document.createElement('select');
 const names=({ar:['الأصلية','بيضاء','زرقاء','رمادية'],fr:['Original','Blanc','Bleu','Gris'],es:['Original','Blanco','Azul','Gris'],de:['Original','Weiß','Blau','Grau'],pt:['Original','Branco','Azul','Cinzento'],it:['Originale','Bianco','Blu','Grigio'],en:['Original','White','Light blue','Gray']})[language]||['Original','White','Light blue','Gray'];
 for(const [i,key] of ['original','white','blue','gray'].entries()){
  const opt=document.createElement('option');opt.value=key;opt.textContent=names[i];bgSelect.append(opt);
 }
 row(({ar:'الخلفية (النموذج يتحمل أول مرة)',en:'Background (first-use model download)',fr:'Fond (premier téléchargement)'})[language]||'Background / downloaded model',bgSelect);
 panel.append(canvas,hint,status,actions);overlay.append(panel);document.body.append(overlay);
 let image=null,cutout=null,blobURL=null,closed=false,processing=false;
 const update=()=>{
  if(!image)return;
  const dims=layoutIDPhotoSheet(select.value);
  canvas.width=dims.sheetW;canvas.height=dims.sheetH;
  const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);
  for(const rect of dims.positions){
   if(bgSelect.value!=='original'){
    ctx.fillStyle={white:'#ffffff',blue:'#d9efff',gray:'#e6e6e6'}[bgSelect.value];
    ctx.fillRect(rect.x,rect.y,rect.w,rect.h);
   }
   cropImage(ctx,bgSelect.value==='original'?image:(cutout||image),rect,+x.value,+y.value);
  }
  status.textContent=dims.positions.length+' × '+photoSizes[select.value].label;
 };
 const close=()=>{closed=true;overlay.remove();if(blobURL)URL.revokeObjectURL(blobURL)};
 const button=(name,callback)=>{
  const b=document.createElement('button');b.type='button';b.textContent=name;b.addEventListener('click',callback);actions.append(b);
 };
 const applyBackground=async()=>{
  if(!image||closed)return;
  if(bgSelect.value==='original'||cutout){update();return}
  if(processing)return;
  processing=true;
  status.textContent=({ar:'كنعزلو الشخص محلياً... أول مرة خاص الإنترنت',en:'On-device background removal; first use needs internet…'})[language]||'Loading portrait segmentation model…';
  try{
   cutout=await segmentPortrait(image,{onProgress:msg=>{if(!closed)status.textContent=msg}});
   if(!closed)update();
  }catch(error){
   bgSelect.value='original';if(!closed){update();status.textContent=error?.message||String(error)}
  }finally{processing=false}
 };
 bgSelect.addEventListener('change',applyBackground);
 button(L[5],()=>{if(!processing)update()});
 button(L[6],async()=>{
  if(!image||closed||processing)return;
  if(bgSelect.value!=='original'&&!cutout){status.textContent='Background model not ready';return}
  try{
   update();
   const blob=await new Promise((ok,bad)=>canvas.toBlob(v=>v?ok(v):bad(Error(L[9])),'image/png'));
   await save(setPNGResolution(new Uint8Array(await blob.arrayBuffer())),'RivoScan_ID_Photo_'+Date.now()+'.png','image/png');
   if(!closed)notify('PNG ✓');
  }catch(error){if(!closed)status.textContent=error?.message||L[9]}
 });
 button(L[7],close);
 const load=async()=>{
  const file=input.files?.[0];if(!file)return;
  if(blobURL)URL.revokeObjectURL(blobURL);
  blobURL=URL.createObjectURL(file);
  try{
   const next=new Image();next.src=blobURL;
   await new Promise((ok,bad)=>{next.onload=ok;next.onerror=bad});
   if(closed)return;image=next;cutout=null;
    if(bgSelect.value!=='original')await applyBackground();else update();
  }catch{status.textContent=L[9]}
 };
 input.addEventListener('change',load);select.addEventListener('change',update);x.addEventListener('input',update);y.addEventListener('input',update);
 overlay.addEventListener('click',event=>{if(event.target===overlay)close()});
 return close;
}
