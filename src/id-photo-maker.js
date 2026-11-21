import {mountDialogControls} from './modal-shell.js';
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
 if(columns<1||rows<1)throw Error('Photo does not fit the sheet');
 const gridWidth=columns*photoW+(columns-1)*gap;
 const gridHeight=rows*photoH+(rows-1)*gap;
 const left=Math.floor((sheetW-gridWidth)/2);
 const top=Math.floor((sheetH-gridHeight)/2);
 const result=[];
 for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
  result.push({x:left+x*(photoW+gap),y:top+y*(photoH+gap),w:photoW,h:photoH});
 }
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
 ar:['صور شخصية للطباعة','اختر صورة شخصية','المقاس','أعلى وأسفل','يمين ويسار','إعداد صفحة الطباعة','حفظ PNG · ١٠ × ١٥ سم · ٣٠٠ نقطة/بوصة','إغلاق','تغيير الخلفية اختياري ومحلي بعد تحميل النموذج. راجع حواف الشخص؛ قبول الصورة غير مضمون.','تعذر فتح الصورة.'],
 fr:['Photos d’identité','Choisir portrait','Format','Hauteur','Gauche / Droite','Créer planche','Enregistrer PNG · 10×15 cm, 300 DPI','Fermer','Détourage local facultatif après téléchargement du modèle. Vérifiez le résultat; aucune garantie officielle.','Image illisible.'],
 es:['Fotos de carné','Elegir foto','Tamaño','Altura','Izquierda / derecha','Crear hoja','Guardar PNG · 10×15 cm, 300 DPI','Cerrar','Cambio de fondo local facultativo. Compruebe los bordes; aceptación no garantizada.','Imagen inválida.'],
 de:['Passfotos','Portrait wählen','Größe','Höhe','Links / Rechts','Blatt erstellen','PNG · 10×15 cm, 300 DPI','Schließen','Optionaler lokaler Hintergrundwechsel. Ränder prüfen; keine behördliche Garantie.','Bild ungültig.'],
 pt:['Fotos de identificação','Escolher retrato','Tamanho','Altura','Esquerda / direita','Criar folha','Guardar PNG · 10×15 cm, 300 DPI','Fechar','Mudança de fundo local opcional. Verifique contornos; aceitação não garantida.','Imagem inválida.'],
 it:['Foto tessera','Scegli ritratto','Formato','Altezza','Sinistra / destra','Crea foglio','Salva PNG · 10×15 cm, 300 DPI','Chiudi','Sostituzione locale opzionale. Controlla i bordi; nessuna garanzia ufficiale.','Immagine non valida.']
};
const sheetLabels={
 en:{source:'Photo',adjust:'Size & crop',background:'Background',prints:'photos',processing:'Preparing the portrait background…'},
 ar:{source:'الصورة',adjust:'المقاس والتأطير',background:'الخلفية',prints:'صور',processing:'جارٍ تجهيز خلفية الصورة…'},
 fr:{source:'Photo',adjust:'Cadrage',background:'Fond',prints:'photos',processing:'Préparation du fond du portrait…'},
 es:{source:'Foto',adjust:'Tamaño y recorte',background:'Fondo',prints:'fotos',processing:'Preparando el fondo del retrato…'},
 de:{source:'Foto',adjust:'Format & Zuschnitt',background:'Hintergrund',prints:'Fotos',processing:'Fotohintergrund wird vorbereitet…'},
 pt:{source:'Foto',adjust:'Tamanho e corte',background:'Fundo',prints:'fotos',processing:'A preparar o fundo do retrato…'},
 it:{source:'Foto',adjust:'Formato e ritaglio',background:'Sfondo',prints:'foto',processing:'Preparazione dello sfondo del ritratto…'}
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
 const labels=sheetLabels[language]||sheetLabels.en;
 const overlay=document.createElement('div');overlay.className='rivo-id-overlay';
 const panel=document.createElement('section');panel.className='rivo-id-dialog';panel.setAttribute('role','dialog');
 panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',L[0]);
 const title=document.createElement('h2');title.textContent=L[0];panel.append(title);
 const select=document.createElement('select');
 for(const [key,size] of Object.entries(photoSizes)){
  const opt=document.createElement('option');opt.value=key;
  opt.textContent=language==='ar'?'\u2066'+size.label+'\u2069':size.label;
  select.append(opt);
 }
 const input=document.createElement('input');input.type='file';input.accept='image/*';input.setAttribute('aria-label',L[1]);
 const x=document.createElement('input');x.type='range';x.min='-100';x.max='100';x.value='0';
 const y=document.createElement('input');y.type='range';y.min='-100';y.max='100';y.value='0';
 const canvas=document.createElement('canvas');canvas.className='rivo-id-preview';canvas.hidden=true;
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
 row(labels.background,bgSelect);
 panel.append(canvas,hint,status,actions);overlay.append(panel);document.body.append(overlay);
 let image=null,cutout=null,closed=false,processing=false,workspace=null,saveButton=null;
 let selection=0;
 const update=()=>{
  if(!image)return;
  canvas.hidden=false;
  const dims=layoutIDPhotoSheet(select.value);
  if(canvas.width!==dims.sheetW||canvas.height!==dims.sheetH){
   canvas.width=dims.sheetW;canvas.height=dims.sheetH;
  }
  const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);
  for(const rect of dims.positions){
   if(bgSelect.value!=='original'){
    ctx.fillStyle={white:'#ffffff',blue:'#d9efff',gray:'#e6e6e6'}[bgSelect.value];
    ctx.fillRect(rect.x,rect.y,rect.w,rect.h);
   }
   cropImage(ctx,bgSelect.value==='original'?image:(cutout||image),rect,+x.value,+y.value);
  }
  saveButton.disabled=bgSelect.value!=='original'&&!cutout;
  if(saveButton.disabled)return;
  const dimensions=document.createElement('bdi');
  dimensions.dir='ltr';dimensions.textContent=photoSizes[select.value].label;
  status.replaceChildren(dims.positions.length+' '+labels.prints+' · ',dimensions);
 };
 const close=()=>{closed=true;overlay.remove()};
 const button=(name,callback)=>{
  const b=document.createElement('button');b.type='button';b.textContent=name;b.addEventListener('click',callback);actions.append(b);
 };
 const applyBackground=async()=>{
  if(!image||closed)return;
  if(bgSelect.value==='original'||cutout){update();return}
  saveButton.disabled=true;
  status.textContent=labels.processing;
  if(processing)return;
  const portrait=image;
  processing=true;
  try{
   const result=await segmentPortrait(portrait);
   if(closed||image!==portrait)return;
   cutout=result;update();
  }catch(error){
   if(closed||image!==portrait||bgSelect.value==='original')return;
   bgSelect.value='original';update();status.textContent=error?.message||String(error);
  }finally{if(image===portrait)processing=false}
 };
 bgSelect.addEventListener('change',applyBackground);
 button(L[5],update);
 button(L[6],async()=>{
  if(!image||closed||saveButton.disabled)return;
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
  const current=++selection;
  image=null;cutout=null;processing=false;
  canvas.hidden=true;saveButton.disabled=true;status.textContent='';
  workspace.clear();
  const url=URL.createObjectURL(file);
  try{
   const next=new Image();next.src=url;await next.decode();
   if(closed||selection!==current)return;
   image=next;workspace.loaded();update();
   if(bgSelect.value!=='original')await applyBackground();
  }catch{if(!closed&&selection===current)status.textContent=L[9]}
  finally{URL.revokeObjectURL(url)}
 };
 input.addEventListener('change',load);select.addEventListener('change',update);x.addEventListener('input',update);y.addEventListener('input',update);
 mountDialogControls({overlay,panel,close,language});
 const rows=[...panel.querySelectorAll(':scope > .rivo-id-row')];
 if(rows.length!==5)throw Error('ID Photo controls unexpectedly changed');
 const [makeSheet,saveControl]=actions.querySelectorAll('button');
 saveButton=saveControl;saveButton.disabled=true;
 workspace=mountPreviewFirstWorkspace({
  panel,preview:canvas,language,defaultSection:'source',
  sections:[
   {id:'source',label:labels.source,nodes:[rows[0]]},
   {id:'adjust',label:labels.adjust,
    nodes:[rows[1],rows[2],rows[3],makeSheet]},
   {id:'background',label:labels.background,nodes:[rows[4],hint]}
  ],alwaysVisible:[status],footer:[saveButton]
 });
 status.classList.add('rivo-workspace-status');
 overlay.addEventListener('click',event=>{if(event.target===overlay)close()});
 return close;
}
