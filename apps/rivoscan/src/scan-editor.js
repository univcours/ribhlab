import {recognize} from 'tesseract.js';
import {inpaintMaskedPixels} from './smart-erase.js';
import {restorePhotoPixels} from './photo-restore.js';
import {normalizeWhiteboardRGBA} from './whiteboard-glare.js';
import {coloredMarkMask} from './colored-mark-erase.js';

/** Offline editor: crop/retake are delegated to the native camera; editing saves a new copy. */
export async function openScanEditor({doc,bridge,getLanguage,onSave,onCrop,onRetake,onRefresh,notify,preset='enhance'}){
 const labels={
  en:['Edit scan','Add / retake','Original','Enhance','Magic','Remove shadow','Grayscale','Black & white','Whiteboard','Compare','Rotate left','Rotate right','Crop','Extract text','Save copy','Brightness','Contrast','Original / edited','Cancel','Processing photo…','Saving a new copy; original stays unchanged.'],
  ar:['تعديل الوثيقة','إعادة التصوير','الأصلية','تحسين','تحسين ذكي','حذف الظلال','رمادي','أبيض وأسود','سبورة','مقارنة','دور لليسار','دور لليمين','قص الحواف','استخراج النص','حفظ نسخة','الإضاءة','التباين','قبل / بعد','إلغاء','كنصلحو الصورة…','غادي نحفظ نسخة جديدة والأصل يبقى كيفما هو.'],
  fr:['Modifier le scan','Reprendre','Original','Améliorer','Optimisation','Supprimer ombres','Gris','Noir & blanc','Tableau blanc','Comparer','Tourner à gauche','Tourner à droite','Recadrer','Extraire texte','Enregistrer une copie','Luminosité','Contraste','Avant / après','Annuler','Traitement…','Une nouvelle copie est créée; original intact.'],
  es:['Editar escaneo','Retomar','Original','Mejorar','Mejora rápida','Quitar sombras','Grises','Blanco y negro','Pizarra','Comparar','Izquierda','Derecha','Recortar','Extraer texto','Guardar copia','Brillo','Contraste','Antes/después','Cancelar','Procesando…','Se guarda una copia; el original queda intacto.'],
  de:['Scan bearbeiten','Erneut scannen','Original','Verbessern','Smart Enhance','Schatten entfernen','Graustufen','Schwarzweiß','Whiteboard','Vergleichen','Links drehen','Rechts drehen','Zuschneiden','Text erkennen','Kopie speichern','Helligkeit','Kontrast','Vorher / Nachher','Abbrechen','Verarbeitung…','Original bleibt unverändert.'],
  pt:['Editar digitalização','Refazer','Original','Melhorar','Realce inteligente','Remover sombras','Cinzentos','Preto e branco','Quadro branco','Comparar','Rodar esquerda','Rodar direita','Cortar','Extrair texto','Guardar cópia','Brilho','Contraste','Antes / depois','Cancelar','A processar…','O original mantém-se; guarda uma cópia.'],
  it:['Modifica scansione','Ripeti','Originale','Migliora','Ottimizza','Rimuovi ombre','Grigio','Bianco e nero','Lavagna','Confronta','Ruota sinistra','Ruota destra','Ritaglia','Estrai testo','Salva copia','Luminosità','Contrasto','Prima / dopo','Annulla','Elaborazione…','Il documento originale rimane invariato.']
 };
 const tr=index=>(labels[getLanguage()]||labels.en)[index];
 const value=await bridge.readFile({uri:doc.uri});
 if(!/^image\//.test(doc.mimeType||value.mimeType||''))throw new Error('Scan enhancement supports images; open a PDF page with PDF tools.');
 if((doc.size||0)>16*1024*1024)throw new Error('Image too large for this editor (16 MB).');
 const base64=value.base64;if(!base64)throw new Error('Image cannot be read.');
 const mime=doc.mimeType||'image/jpeg',url='data:'+mime+';base64,'+base64;
 const image=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('Could not decode image'));i.src=url;});
 const max=2100,ratio=Math.min(1,max/Math.max(image.naturalWidth,image.naturalHeight));
 const original=document.createElement('canvas');original.width=Math.max(1,Math.round(image.naturalWidth*ratio));original.height=Math.max(1,Math.round(image.naturalHeight*ratio));
 const originalContext=original.getContext('2d',{willReadFrequently:true});originalContext.fillStyle='#fff';originalContext.fillRect(0,0,original.width,original.height);originalContext.drawImage(image,0,0,original.width,original.height);
 const shell=document.createElement('div');shell.className='rivo-editor-overlay';shell.dir=getLanguage()==='ar'?'rtl':'ltr';
 shell.innerHTML=`<div class="rivo-editor-window" role="dialog" aria-modal="true" aria-label="${tr(0)}">
   <header class="rivo-editor-header"><button data-edit="cancel" aria-label="${tr(18)}">✕</button>
     <strong title="${String(doc.name).replace(/[&<>"]/g,'')}">${tr(0)}</strong><button data-edit="retake">${tr(1)}</button></header>
   <div class="rivo-editor-picture"><canvas id="rivo-editor-preview" aria-label="${tr(0)}"></canvas>
     <div class="rivo-compare-note">${tr(17)}</div></div>
   <div class="rivo-editor-filters" role="group">
     ${['original','enhance','magic','shadow','gray','bw','whiteboard','restore'].map((id,i)=>`<button type="button" class="rivo-filter-choice ${i===1?'active':''}" data-filter="${id}"><span class="rivo-filter-thumb"></span><small>${id==='restore'?({en:'Restore',ar:'ترميم',fr:'Restaurer',es:'Restaurar',de:'Restaurieren',pt:'Restaurar',it:'Restauro'})[getLanguage()]||'Restore':tr(i+2)}</small></button>`).join('')}
   </div>
   <div class="rivo-editor-sliders"><label>${tr(15)} <input type="range" data-adjust="brightness" min="-35" max="35" value="0" step="1"></label>
     <label>${tr(16)} <input type="range" data-adjust="contrast" min="-35" max="35" value="0" step="1"></label></div>
   <div class="rivo-eraser-control" hidden><label>${({ar:'حجم الممحاة',fr:'Taille de gomme',es:'Tamaño borrador',de:'Pinselgröße',pt:'Tamanho borracha',it:'Dimensione gomma',en:'Brush size'})[getLanguage()]||'Brush size'}
     <input type="range" min="10" max="90" step="5" value="36" data-brush-size></label><label data-erase-color-label><select data-erase-color>
<option value="all">All colors</option><option value="auto-colored">Colored ink (inside brush)</option><option value="blue">Blue ink</option>
<option value="red">Red ink</option><option value="green">Green ink</option>
<option value="light-gray">Light-gray watermark</option></select></label>
<small data-erase-help></small>
<button type="button" data-edit="undoErase">↶ Undo brush</button></div>
   <p class="rivo-editor-tip">${tr(20)}</p>
   <nav class="rivo-editor-actions">
     <button data-edit="compare">${tr(9)}</button><button data-edit="left">${tr(10)}</button>
     <button data-edit="right">${tr(11)}</button><button data-edit="crop">${tr(12)}</button>
     <button data-edit="ocr">${tr(13)}</button>
     <button data-edit="eraser">✎ ${({ar:'ممحاة ذكية (تحديد يدوي)',fr:'Gomme intelligente (sélection manuelle)',es:'Borrador inteligente (manual)',de:'Smart-Radierer (manuell)',pt:'Apagador inteligente (manual)',it:'Gomma intelligente (manuale)',en:'Smart Erase (select area)'})[getLanguage()]||'Smart Erase'}</button>
     <button data-edit="date">◷ ${({ar:'تاريخ',fr:'Date',es:'Fecha',de:'Datum',pt:'Data',it:'Data',en:'Date'})[getLanguage()]||'Date'}</button>
     <button data-edit="save" class="rivo-editor-save">✓ ${tr(14)}</button>
   </nav>
 </div>`;
 const preview=shell.querySelector('#rivo-editor-preview');
 const ctx=preview.getContext('2d',{willReadFrequently:true});
 const filters=['original','enhance','magic','shadow','gray','bw','whiteboard','restore'];
 let filter=filters.includes(preset)?preset:'enhance';
 let angle=0,brightness=0,contrast=0,rendering=false,closed=false,renderCount=0;
 let eraserActive=preset==='eraser'||preset.startsWith('erase:'),timestampOn=preset==='timestamp',brushSize=36,drawing=false,lastPoint=null;
  let eraseColor=preset.startsWith('erase:')?preset.slice(6):'all';
 const strokes=[];let strokeBatch=0;
 const abs=n=>Math.max(0,Math.min(255,n));
 const close=()=>{closed=true;shell.remove();document.body.classList.remove('rivo-editing');};
 function drawOriginal(){
  const rotated=angle%180!==0;preview.width=rotated?original.height:original.width;preview.height=rotated?original.width:original.height;
  ctx.fillStyle='#fff';ctx.fillRect(0,0,preview.width,preview.height);
  ctx.save();ctx.translate(preview.width/2,preview.height/2);ctx.rotate(angle*Math.PI/180);
  ctx.drawImage(original,-original.width/2,-original.height/2);ctx.restore();
 }
 async function paint(){
  if(closed||rendering)return;rendering=true;renderCount++;
  try{
   drawOriginal();
   if(filter==='original'&&brightness===0&&contrast===0&&!timestampOn&&!strokes.length)return;
   const base=filter==='magic'?'contrast(1.34) saturate(1.22) brightness(1.07)':filter==='enhance'?'contrast(1.19) saturate(1.06) brightness(1.05)':filter==='gray'?'grayscale(1) contrast(1.11)':filter==='bw'?'grayscale(1) contrast(1.6)':filter==='whiteboard'?'none':filter==='shadow'?'contrast(1.11)':'none';
   const current=ctx.getImageData(0,0,preview.width,preview.height);
   const auxiliary=document.createElement('canvas');auxiliary.width=preview.width;auxiliary.height=preview.height;
   const other=auxiliary.getContext('2d',{willReadFrequently:true});other.filter=base;
   other.putImageData(current,0,0); // apply the CSS filter by drawing an intermediary
   ctx.clearRect(0,0,preview.width,preview.height);
   ctx.filter=base;ctx.drawImage(auxiliary,0,0);ctx.filter='none';
   if(filter==='shadow'||filter==='bw'){
    const source=ctx.getImageData(0,0,preview.width,preview.height),data=source.data;
    const sw=64,sh=64,small=document.createElement('canvas');small.width=sw;small.height=sh;
    const bg=small.getContext('2d',{willReadFrequently:true});
    bg.drawImage(auxiliary,0,0,sw,sh);
    const bgData=bg.getImageData(0,0,sw,sh).data;
    const threshold=filter==='bw'?167:filter==='whiteboard'?175:0;
    for(let y=0;y<preview.height;y++){
     const sy=Math.min(sh-1,Math.floor(y*sh/preview.height));
     for(let x=0;x<preview.width;x++){
      const i=4*(y*preview.width+x);
      if(filter==='shadow'||filter==='whiteboard'){
       const sx=Math.min(sw-1,Math.floor(x*sw/preview.width)),j=4*(sy*sw+sx);
       const local=.2126*bgData[j]+.7152*bgData[j+1]+.0722*bgData[j+2];
       const gain=Math.min(1.9,Math.max(1,245/Math.max(115,local)));
       for(let k=0;k<3;k++)data[i+k]=abs(data[i+k]*gain);
      }
      if(filter==='bw'||filter==='whiteboard'){
       const light=.299*data[i]+.587*data[i+1]+.114*data[i+2];
       const v=light>threshold?255:0;data[i]=data[i+1]=data[i+2]=v;
      }
     }
    }
    ctx.putImageData(source,0,0);
   }
   if(filter==='whiteboard'){
    const scan=ctx.getImageData(0,0,preview.width,preview.height);
    scan.data.set(normalizeWhiteboardRGBA(scan.data,preview.width,preview.height));
    ctx.putImageData(scan,0,0);
   }
   if(filter==='restore'){
    const scan=ctx.getImageData(0,0,preview.width,preview.height);
    scan.data.set(restorePhotoPixels(scan.data,preview.width,preview.height));
    ctx.putImageData(scan,0,0);
   }
   if(brightness||contrast){
    const pixels=ctx.getImageData(0,0,preview.width,preview.height),d=pixels.data;
    const c=(259*(255+contrast*3))/(255*(259-contrast*3));
    for(let i=0;i<d.length;i+=4){
     for(let j=0;j<3;j++)d[i+j]=abs(c*(d[i+j]-128)+128+brightness*2);
    }
    ctx.putImageData(pixels,0,0);
   }
   // Reconstruct ONLY user-painted mask regions from nearby source pixels.
   // No handwriting/signature is removed unless the user explicitly brushes it.
   if(strokes.length){
     const painted=ctx.getImageData(0,0,preview.width,preview.height);
     const selected=new Uint8Array(preview.width*preview.height);
     // Each brush action retains its original selected color. Switching color
     // does not retroactively change the pixels selected by prior strokes.
     const groups=new Map();
     for(const stroke of strokes){
       if(!groups.has(stroke.color))groups.set(stroke.color,[]);
       groups.get(stroke.color).push(stroke);
     }
     for(const [color,group] of groups){
       const maskCanvas=document.createElement('canvas');
       maskCanvas.width=preview.width;maskCanvas.height=preview.height;
       const maskCtx=maskCanvas.getContext('2d',{willReadFrequently:true});
       maskCtx.strokeStyle='#fff';maskCtx.fillStyle='#fff';maskCtx.lineCap='round';maskCtx.lineJoin='round';
       for(const stroke of group){
         maskCtx.lineWidth=stroke.size;maskCtx.beginPath();
         if(stroke.a[0]===stroke.b[0]&&stroke.a[1]===stroke.b[1]){
           maskCtx.arc(stroke.a[0],stroke.a[1],stroke.size/2,0,Math.PI*2);maskCtx.fill();
         }else{
           maskCtx.moveTo(stroke.a[0],stroke.a[1]);maskCtx.lineTo(stroke.b[0],stroke.b[1]);maskCtx.stroke();
         }
       }
       const coverage=maskCtx.getImageData(0,0,preview.width,preview.height).data;
       const brushMask=new Uint8Array(preview.width*preview.height);
       for(let i=0;i<brushMask.length;i++)brushMask[i]=coverage[i*4+3];
       const region=coloredMarkMask(painted.data,brushMask,preview.width,preview.height,color);
       for(let i=0;i<selected.length;i++)if(region[i])selected[i]=255;
     }
     painted.data.set(inpaintMaskedPixels(painted.data,selected,preview.width,preview.height));
     ctx.putImageData(painted,0,0);
   }
   if(timestampOn){
     const text=new Date().toLocaleString(getLanguage());
     const fontSize=Math.max(15,Math.min(34,Math.round(preview.width/28)));
     ctx.save();ctx.font='bold '+fontSize+'px sans-serif';
     const pad=Math.round(fontSize*.65),width=Math.ceil(ctx.measureText(text).width)+pad*2;
     const x=Math.max(0,preview.width-width-14),y=preview.height-fontSize-28;
     ctx.fillStyle='rgba(0,0,0,.72)';ctx.fillRect(x,y,width,fontSize*1.8);
     ctx.fillStyle='#ffffff';ctx.fillText(text,x+pad,y+fontSize*1.2);ctx.restore();
   }
  }finally{rendering=false;}
 }
 // Small real-document previews under each filter, not decorative stock artwork.
 const thumb=document.createElement('canvas');thumb.width=64;thumb.height=70;
 thumb.getContext('2d').drawImage(original,0,0,thumb.width,thumb.height);
 const thumbUrl=thumb.toDataURL('image/jpeg',.65);
 shell.querySelectorAll('[data-filter]').forEach(node=>node.classList.toggle('active',node.dataset.filter===filter));
 shell.querySelector('.rivo-eraser-control').hidden=!eraserActive;
 shell.querySelectorAll('.rivo-filter-thumb').forEach((node,i)=>{
  node.style.backgroundImage=`url("${thumbUrl}")`;
  node.style.filter=['none','contrast(1.2) brightness(1.07)','contrast(1.4) saturate(1.3)','brightness(1.3) contrast(1.2)','grayscale(1)','grayscale(1) contrast(2)','grayscale(1) contrast(1.8) brightness(1.2)','brightness(1.04) contrast(1.12)'][i];
 });
 const labelsByLang={
  en:['Color in brushed area','All colors','Colored ink (brushed only)','Blue ink','Red ink','Green ink','Light-gray watermark','Brush the mark: color-only selection is not handwriting recognition.','Undo stroke'],
  ar:['اللون داخل المنطقة','جميع الألوان','حبر ملون داخل التحديد','حبر أزرق','حبر أحمر','حبر أخضر','علامة رمادية خفيفة','حدد العلامة بالفرشاة؛ اختيار اللون ماشي تعرّف تلقائي على الخط اليدوي.','تراجع عن الضربة'],
  fr:['Couleur dans la région','Toutes','Encre colorée (zone brossée)','Bleu','Rouge','Vert','Filigrane gris clair','Sélection de couleur dans la zone brossée; pas de reconnaissance manuscrite.','Annuler le trait'],
  es:['Color seleccionado','Todos','Tinta coloreada (área marcada)','Azul','Rojo','Verde','Marca gris clara','Selección por color solo en el área marcada, no reconoce escritura.','Deshacer trazo'],
  de:['Markierungsfarbe','Alle','Farbige Tinte (markierter Bereich)','Blau','Rot','Grün','Hellgrau','Farbwahl nur im markierten Bereich, keine Handschrifterkennung.','Strich rückgängig'],
  pt:['Cor selecionada','Todas','Tinta colorida (área pintada)','Azul','Vermelho','Verde','Marca cinzenta','Seleção de cor só na área pintada; não reconhece escrita manual.','Desfazer traço'],
  it:['Colore selezionato','Tutti','Inchiostro colorato (area pennello)','Blu','Rosso','Verde','Filigrana grigia','Selezione per colore nell’area del pennello, non riconosce scrittura.','Annulla tratto']
 };
 const labelText=labelsByLang[getLanguage()]||labelsByLang.en;
 shell.querySelector('[data-erase-color-label]').prepend(document.createTextNode(labelText[0]+' '));
 const opts=shell.querySelector('[data-erase-color]').options;
 for(let i=0;i<opts.length;i++)opts[i].textContent=labelText[i+1];
 shell.querySelector('[data-erase-help]').textContent=labelText[7];
 shell.querySelector('[data-edit="undoErase"]').textContent='↶ '+labelText[8];
 shell.querySelector('[data-erase-color]').value=eraseColor;
 shell.querySelector('[data-erase-color]').addEventListener('change',e=>{eraseColor=e.target.value});
 document.body.appendChild(shell);document.body.classList.add('rivo-editing');
 await paint();
 const apply=async action=>{
  if(action==='cancel'){close();return;}
  if(action==='left'||action==='right'){angle=(angle+(action==='left'?270:90))%360;await paint();return;}
  if(action==='crop'){close();await onCrop(doc);return;}
  if(action==='retake'){close();await onRetake();return;}
  if(action==='compare')return;
  if(action==='eraser'){
    eraserActive=!eraserActive;
    shell.querySelector('.rivo-eraser-control').hidden=!eraserActive;
    shell.querySelector('[data-edit="eraser"]').classList.toggle('active',eraserActive);return;
  }
  if(action==='undoErase'){
    if(strokes.length){const lastBatch=strokes.at(-1).batch;
      while(strokes.length&&strokes.at(-1).batch===lastBatch)strokes.pop();}
    await paint();return;
  }
  if(action==='date'){timestampOn=!timestampOn;await paint();return;}
  if(action==='save'){
   const output=await new Promise((resolve,reject)=>preview.toBlob(b=>b?resolve(b):reject(Error('Image export failed')),'image/jpeg',.92));
   const bytes=new Uint8Array(await output.arrayBuffer());
   await onSave(bytes,`RivoScan_Enhanced_${Date.now()}.jpg`,'image/jpeg');
   close();await onRefresh();return;
  }
  if(action==='ocr'){
   notify(tr(19));
   const lang=({en:'eng',fr:'fra',ar:'ara',es:'spa',de:'deu',pt:'por',it:'ita'})[getLanguage()]||'eng';
   const text=(await recognize(preview,lang)).data.text||'';
   await onSave(new TextEncoder().encode(text),`RivoScan_OCR_${Date.now()}.txt`,'text/plain');
   await onRefresh();notify(tr(14));return;
  }
 };
 shell.addEventListener('click',async e=>{
  const preset=e.target.closest('[data-filter]');
  if(preset){filter=preset.dataset.filter; shell.querySelectorAll('[data-filter]').forEach(el=>el.classList.toggle('active',el===preset));await paint();return;}
  const button=e.target.closest('[data-edit]');if(!button)return;
  try{button.disabled=true;await apply(button.dataset.edit);}
  catch(error){notify(error?.message||String(error),true);}
  finally{button.disabled=false;}
 });
 let compare=false;
 const btn=shell.querySelector('[data-edit="compare"]');
 const before=()=>{if(compare)return;compare=true;drawOriginal();};
 const after=()=>{if(!compare)return;compare=false;paint();};
 btn.addEventListener('pointerdown',before);btn.addEventListener('pointerup',after);btn.addEventListener('pointercancel',after);
 btn.addEventListener('pointerleave',after);
 shell.querySelector('[data-brush-size]').addEventListener('input',e=>{brushSize=Number(e.target.value)});
 preview.style.touchAction='none';
 const xy=e=>{const rect=preview.getBoundingClientRect();return [
  Math.max(0,Math.min(preview.width,(e.clientX-rect.left)/rect.width*preview.width)),
  Math.max(0,Math.min(preview.height,(e.clientY-rect.top)/rect.height*preview.height))
 ]};
 preview.addEventListener('pointerdown',e=>{
   if(!eraserActive)return;e.preventDefault();drawing=true;lastPoint=xy(e);strokeBatch++;
   strokes.push({a:lastPoint,b:lastPoint,size:brushSize,color:eraseColor,batch:strokeBatch});
   preview.setPointerCapture(e.pointerId);
 });
 preview.addEventListener('pointermove',e=>{
   if(!drawing||!eraserActive)return;
   const next=xy(e);strokes.push({a:lastPoint,b:next,size:brushSize,color:eraseColor,batch:strokeBatch});
   ctx.save();ctx.strokeStyle='#fff';ctx.lineWidth=brushSize;ctx.lineCap='round';
   ctx.beginPath();ctx.moveTo(lastPoint[0],lastPoint[1]);ctx.lineTo(next[0],next[1]);ctx.stroke();ctx.restore();
   lastPoint=next;
 });
 preview.addEventListener('pointerup',()=>{drawing=false;lastPoint=null;if(strokes.length)paint()});
 preview.addEventListener('pointercancel',()=>{drawing=false;lastPoint=null;if(strokes.length)paint()});
 shell.querySelectorAll('[data-adjust]').forEach(input=>input.addEventListener('input',async()=>{
  brightness=Number(shell.querySelector('[data-adjust="brightness"]').value);
  contrast=Number(shell.querySelector('[data-adjust="contrast"]').value);
  await paint();
 }));
 return close;
}
