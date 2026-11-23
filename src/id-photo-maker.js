import {materialSymbol} from './material-symbols.js';
import {mountDialogControls} from './modal-shell.js';
import {Camera,CameraResultType,CameraSource} from '@capacitor/camera';
import {mountPreviewFirstWorkspace} from './preview-workspace.js';
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
 ar:['صور شخصية للطباعة','اختر صورة شخصية','المقاس','أعلى وأسفل','يمين ويسار','إعداد صفحة الطباعة','حفظ PNG · 10×15 سم بدقة 300 DPI','إغلاق','تغيير الخلفية اختياري ومحلي بعد تحميل النموذج. راجع حواف الشخص؛ قبول الصورة غير مضمون.','تعذر فتح الصورة.'],
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
export async function openIDPhotoMaker({language='en',save,notify=()=>{},onClose=()=>{}}={}){
 const L=strings[language]||strings.en;
 const overlay=document.createElement('div');overlay.className='rivo-id-overlay';
 const panel=document.createElement('section');panel.className='rivo-id-dialog';panel.setAttribute('role','dialog');
 panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',L[0]);
 const title=document.createElement('h2');title.textContent=L[0];panel.append(title);
 const select=document.createElement('select');for(const [key,size] of Object.entries(photoSizes)){const opt=document.createElement('option');opt.value=key;opt.textContent=size.label;select.append(opt)}
 const input=document.createElement('input');input.type='file';input.accept='image/*';input.setAttribute('aria-label',L[1]);input.className='rivo-id-native-file-picker';input.hidden=true;
 const x=document.createElement('input');x.type='range';x.min='-100';x.max='100';x.value='0';
 const y=document.createElement('input');y.type='range';y.min='-100';y.max='100';y.value='0';
 const canvas=document.createElement('canvas');canvas.className='rivo-id-preview';canvas.hidden=true;
 const hint=document.createElement('p');hint.textContent=L[8];hint.className='rivo-id-hint';
 const status=document.createElement('p');status.setAttribute('role','status');
 const actions=document.createElement('div');actions.className='rivo-code-actions';
 const row=(caption,control)=>{const label=document.createElement(control.tagName==='BUTTON'?'div':'label');label.className='rivo-id-row';label.textContent=caption;label.append(control);panel.append(label)};
 // The preview itself is the ONLY photo picker; remove redundant settings buttons.
 const takePhotoLabel=({ar:'التقاط صورة',fr:'Prendre une photo',en:'Take Photo'})[language]||'Take Photo';
 row(L[2],select);row(L[3],y);row(L[4],x);
 const bgSelect=document.createElement('select');
 const names=({ar:['الأصلية','بيضاء','زرقاء','رمادية'],fr:['Original','Blanc','Bleu','Gris'],es:['Original','Blanco','Azul','Gris'],de:['Original','Weiß','Blau','Grau'],pt:['Original','Branco','Azul','Cinzento'],it:['Originale','Bianco','Blu','Grigio'],en:['Original','White','Light blue','Gray']})[language]||['Original','White','Light blue','Gray'];
 for(const [i,key] of ['original','white','blue','gray'].entries()){
  const opt=document.createElement('option');opt.value=key;opt.textContent=names[i];bgSelect.append(opt);
 }
 row(({ar:'الخلفية (النموذج يتحمل أول مرة)',en:'Background (first-use model download)',fr:'Fond (premier téléchargement)'})[language]||'Background / downloaded model',bgSelect);
 panel.append(canvas,hint,status,actions);overlay.append(panel);document.body.append(overlay);
 let image=null,cutout=null,blobURL=null,closed=false,processing=false,workspace=null,saveButton=null,previewImport=null;
 const moveButtons=[];
 const update=()=>{
  if(!image)return;
  canvas.hidden=false;
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
 const close=()=>{if(closed)return;closed=true;overlay.remove();if(blobURL)URL.revokeObjectURL(blobURL);onClose()};
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
 const applyNewImage=async(src,objectURL=null)=>{
  try{
   const next=new Image();next.src=src;
   await new Promise((ok,bad)=>{next.onload=ok;next.onerror=bad});
   if(closed){if(objectURL)URL.revokeObjectURL(objectURL);return}
   const previous=blobURL;blobURL=objectURL;
   image=next;cutout=null;x.value='0';y.value='0';
   workspace?.loaded();if(saveButton)saveButton.disabled=false;
   for(const b of moveButtons){b.disabled=false;b.setAttribute('aria-disabled','false');}
   if(previewImport)previewImport.textContent=({ar:'تغيير الصورة',fr:'Changer la photo',en:'Change Photo'})[language]||'Change Photo';
   if(previous)URL.revokeObjectURL(previous);
   if(bgSelect.value!=='original')await applyBackground();else update();
  }catch{if(objectURL)URL.revokeObjectURL(objectURL);if(!closed)status.textContent=L[9]}
 };
 const capture=async()=>{
  if(closed||processing)return;
  try{
   const result=await Camera.getPhoto({quality:92,resultType:CameraResultType.Uri,
    source:CameraSource.Camera,correctOrientation:true});
   if(result?.webPath)await applyNewImage(result.webPath);
  }catch(error){
   if(/cancel/i.test(String(error?.message||'')))return;
   if(!closed)status.textContent=error?.message||L[9];
  }
 };
 const load=async()=>{
  const file=input.files?.[0];if(!file)return;
  const url=URL.createObjectURL(file);
  await applyNewImage(url,url);
 };
 input.addEventListener('change',()=>{void load()});select.addEventListener('change',update);x.addEventListener('input',update);y.addEventListener('input',update);
 mountDialogControls({overlay,panel,close,language});
 const rows=[...panel.querySelectorAll(':scope > .rivo-id-row')];
 if(rows.length!==4)throw Error('ID Photo controls unexpectedly changed');
 const [makeSheet,saveControl]=actions.querySelectorAll('button');
 saveButton=saveControl;saveButton.disabled=true;
 // Two compact sliders share one line, freeing space for the portrait preview.
 const compactAdjust=document.createElement('div');compactAdjust.className='rivo-id-compact-adjust';
 compactAdjust.append(rows[1],rows[2]);
 workspace=mountPreviewFirstWorkspace({
  panel,preview:canvas,language,defaultSection:'adjust',
  sections:[
   {id:'adjust',label:({ar:'المقاس والتأطير',fr:'Cadrage',en:'Size & crop'})[language]||'Size & crop',
    nodes:[rows[0],compactAdjust,makeSheet]},
   {id:'background',label:({ar:'الخلفية',fr:'Fond',en:'Background'})[language]||'Background',nodes:[rows[3],hint]}
  ],alwaysVisible:[status],footer:[saveButton]
 });
 workspace.show(false); // Only the preview is initially visible; settings open on demand.
 // Use the empty margins on BOTH sides of the actual photo, not a second
 // row of controls below it. Keep every icon wholly inside its button.

 const railNames={
  en:['Photo','Size & crop','Background','Move up','Move down','Move left','Move right','Reset position'],
  ar:['الصورة','المقاس والتأطير','الخلفية','فوق','تحت','يسار','يمين','إرجاع الوسط'],
  fr:['Photo','Cadrage','Fond','Haut','Bas','Gauche','Droite','Centrer']
 };
 const namesForLang=railNames[language]||railNames.en;
 const leftRail=document.createElement('div'),rightRail=document.createElement('div');
 leftRail.className='rivo-id-side-rail rivo-id-side-left';
 rightRail.className='rivo-id-side-rail rivo-id-side-right';
 const railButton=(rail,icon,label,fn)=>{
  const b=document.createElement('button');b.type='button';b.className='rivo-id-side-action';
  b.title=label;b.setAttribute('aria-label',label);
  b.innerHTML=materialSymbol(icon,23);
  b.addEventListener('click',fn);rail.append(b);return b;
 };
 // Keep exactly one camera and one Import/Change Photo control together.
 // No floating button covering the page preview.
 railButton(leftRail,'photo',takePhotoLabel,()=>{void capture()});
 railButton(leftRail,'gallery',L[1],()=>{input.value='';input.click()});
 for(const [section,icon,label] of [
  ['adjust','crop',namesForLang[1]],['background','background',namesForLang[2]]
 ]){
  railButton(leftRail,icon,label,()=>{workspace.choose(section);workspace.show(true)});
 }
 const move=(control,step)=>{
  if(!image)return;
  control.value=String(Math.max(Number(control.min),Math.min(Number(control.max),Number(control.value)+step)));
  update();
 };
 moveButtons.push(railButton(rightRail,'up',namesForLang[3],()=>move(y,-10)));
 moveButtons.push(railButton(rightRail,'down',namesForLang[4],()=>move(y,10)));
 moveButtons.push(railButton(rightRail,'left',namesForLang[5],()=>move(x,-10)));
 moveButtons.push(railButton(rightRail,'right',namesForLang[6],()=>move(x,10)));
 moveButtons.push(railButton(rightRail,'reset',namesForLang[7],()=>{if(!image)return;x.value='0';y.value='0';update()}));
  for(const b of moveButtons){b.disabled=!image;b.setAttribute('aria-disabled',String(!image));}
 workspace.dock.append(leftRail,rightRail,input);
 workspace.empty.hidden=true; // No text behind the central Import Photo button.
 status.classList.add('rivo-workspace-status');
 overlay.addEventListener('click',event=>{if(event.target===overlay)close()});
 return close;
}
