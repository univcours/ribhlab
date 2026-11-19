/**
 * Image-based object counting with a locally executed COCO-SSD model.
 * The model weights download on first use; photos stay on the phone.
 * Counts are approximate detections among 80 known classes, not inventory totals.
 */
const translations={
 en:['CountCam — object counter','Take photo','Choose image','Detect and count','Close','Load model (internet needed first time)','No image selected','Approximate counts','Only common COCO object classes are recognized. Counts are estimates; small/overlapping objects may be missed. Your photo is processed on this device.','Detection failed: '],
 ar:['CountCam — عدّ الأشياء','تصوير','اختيار صورة','تعرف وعدّ','إغلاق','تحميل النموذج (الإنترنت مطلوب أول مرة)','ما تختارات حتى صورة','أعداد تقريبية','كيعرف غير أصناف COCO الشائعة (80 صنف). الأعداد تقريبية، والأشياء الصغيرة أو المتراكبة ممكن ما تتعرفش. الصورة كتبقى فالهاتف.','خطأ فالتعرف: '],
 fr:['CountCam — comptage','Prendre photo','Choisir image','Détecter et compter','Fermer','Charger modèle (Internet au premier usage)','Aucune photo','Comptage estimatif','80 catégories COCO courantes; les petits objets peuvent être omis. La photo reste sur votre appareil.','Échec : '],
 es:['CountCam — contador','Fotografiar','Elegir imagen','Detectar y contar','Cerrar','Cargar modelo (Internet inicial)','Sin foto','Conteo aproximado','Reconoce 80 clases comunes. Los objetos pequeños pueden omitirse. La imagen permanece en el dispositivo.','Error: '],
 de:['CountCam — Objekte zählen','Foto aufnehmen','Bild wählen','Erkennen und zählen','Schließen','Modell laden (erstmals online)','Kein Bild','Geschätzte Zählung','Nur häufige COCO-Klassen. Kleine Objekte können fehlen. Fotos bleiben lokal.','Fehler: '],
 pt:['CountCam — contar','Fotografar','Escolher imagem','Detetar e contar','Fechar','Carregar modelo (Internet inicial)','Sem foto','Contagem estimada','80 classes COCO comuns. Objetos pequenos podem falhar. A foto fica no aparelho.','Erro: '],
 it:['CountCam — conteggio','Fotografa','Scegli immagine','Rileva e conta','Chiudi','Carica modello (prima volta online)','Nessuna foto','Conteggio stimato','80 classi COCO comuni. Piccoli oggetti possono mancare. La foto resta sul dispositivo.','Errore: ']
};
/**
 * Camera model can return overlapping candidate boxes for one physical
 * object. Per-class nonmaximum suppression removes only strong duplicates.
 * It does not discover unseen objects or certify inventory counts.
 */
export function deduplicateDetections(detections,iouThreshold=.60){
 if(!Array.isArray(detections)||!Number.isFinite(iouThreshold)||iouThreshold<=0||iouThreshold>=1)
  throw Error('Invalid detections or overlap threshold');
 const candidates=detections.filter(p=>
  typeof p?.class==='string'&&p.class.length>0&&Array.isArray(p.bbox)&&p.bbox.length===4&&
  p.bbox.every(Number.isFinite)&&p.bbox[2]>0&&p.bbox[3]>0&&
  Number.isFinite(p.score)&&p.score>=0&&p.score<=1);
 candidates.sort((a,b)=>b.score-a.score);
 const kept=[];
 const iou=(a,b)=>{
  const x1=Math.max(a[0],b[0]),y1=Math.max(a[1],b[1]);
  const x2=Math.min(a[0]+a[2],b[0]+b[2]),y2=Math.min(a[1]+a[3],b[1]+b[3]);
  const intersection=Math.max(0,x2-x1)*Math.max(0,y2-y1);
  return intersection/(a[2]*a[3]+b[2]*b[3]-intersection);
 };
 for(const candidate of candidates){
  if(kept.every(x=>x.class!==candidate.class||iou(x.bbox,candidate.bbox)<iouThreshold))
   kept.push(candidate);
 }
 return kept;
}

export function countDetectedObjects(detections,minScore=.5){
 if(!Array.isArray(detections)||!Number.isFinite(minScore)||minScore<0||minScore>1)throw Error('Invalid detections');
 const totals={};
 for(const p of detections){
  if(typeof p?.class!=='string'||!Array.isArray(p.bbox)||p.bbox.length!==4||!(p.score>=minScore))continue;
  totals[p.class]=(totals[p.class]||0)+1;
 }
 return totals;
}
export function openCountCam({language='en',capture}={}){
 const L=translations[language]||translations.en;
 const overlay=document.createElement('div');overlay.className='rivo-code-overlay';
 const panel=document.createElement('section');panel.className='rivo-code-dialog';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
 const title=document.createElement('h2');title.textContent=L[0];panel.append(title);
 const toolbar=document.createElement('div');toolbar.className='rivo-code-actions';panel.append(toolbar);
 const input=document.createElement('input');input.type='file';input.accept='image/*';input.hidden=true;panel.append(input);
 const view=document.createElement('canvas');view.className='rivo-count-preview';panel.append(view);
 const status=document.createElement('p');status.setAttribute('role','status');panel.append(status);
 const results=document.createElement('ul');panel.append(results);
 const notes=document.createElement('p');notes.className='rivo-code-help';notes.textContent=L[8];panel.append(notes);
 let image=null,objectURL=null,closed=false,working=false,modelPromise=null,model=null;
 const close=()=>{closed=true;overlay.remove();if(objectURL)URL.revokeObjectURL(objectURL);try{model?.dispose?.()}catch{}};
 const action=(text,callback)=>{
  const button=document.createElement('button');button.type='button';button.textContent=text;button.addEventListener('click',callback);
  toolbar.append(button);return button;
 };
 const draw=(detections=[])=>{
  if(!image)return;
  const scale=Math.min(1,1000/Math.max(image.naturalWidth,image.naturalHeight));
  view.width=Math.round(image.naturalWidth*scale);view.height=Math.round(image.naturalHeight*scale);
  const ctx=view.getContext('2d');ctx.drawImage(image,0,0,view.width,view.height);
  ctx.strokeStyle='#04bcf7';ctx.lineWidth=3;ctx.font='bold 16px sans-serif';
  for(const d of detections){
   const [x,y,w,h]=d.bbox;
   ctx.strokeRect(x*scale,y*scale,w*scale,h*scale);
   ctx.fillStyle='#087dfa';const label=d.class+' '+Math.round(d.score*100)+'%';
   const tw=ctx.measureText(label).width+12;
   ctx.fillRect(x*scale,Math.max(0,y*scale-22),tw,22);
   ctx.fillStyle='white';ctx.fillText(label,x*scale+5,Math.max(16,y*scale-6));
  }
 };
 const load=async source=>{
  const img=new Image();img.src=source;
  await new Promise((ok,bad)=>{img.onload=ok;img.onerror=bad;if(img.complete&&img.naturalWidth)ok()});
  if(closed)return;image=img;draw();status.textContent=L[6];results.replaceChildren();
 };
 action(L[1],async()=>{
  if(!capture)return;
  try{const source=await capture();if(source)await load(source)}
  catch(error){status.textContent=error?.message||L[9]}
 });
 action(L[2],()=>input.click());
 action(L[3],async()=>{
  if(!image||working)return;
  working=true;status.textContent=L[5];
  try{
   if(!modelPromise)modelPromise=(async()=>{
    const tf=await import('@tensorflow/tfjs');await tf.ready();
    const coco=await import('@tensorflow-models/coco-ssd');
    return coco.load({base:'lite_mobilenet_v2'});
   })();
   model=await modelPromise;
   if(closed)return;
   const preds=await model.detect(image,60,.55);
   if(closed)return;
   const valid=deduplicateDetections(preds.filter(p=>p.score>=.55));draw(valid);
   const counts=countDetectedObjects(valid,.55);
   results.replaceChildren();
   for(const [klass,count] of Object.entries(counts).sort((a,b)=>b[1]-a[1])){
    const item=document.createElement('li');item.textContent=klass+': '+count;results.append(item);
   }
   status.textContent=L[7]+' · '+Object.values(counts).reduce((a,b)=>a+b,0);
  }catch(error){modelPromise=null;if(!closed)status.textContent=L[9]+(error?.message||String(error))}
  finally{working=false}
 });
 action(L[4],close);
 input.addEventListener('change',async()=>{
  const file=input.files?.[0];input.value='';if(!file)return;
  if(objectURL)URL.revokeObjectURL(objectURL);objectURL=URL.createObjectURL(file);
  try{await load(objectURL)}catch{status.textContent=L[9]}
 });
 overlay.append(panel);document.body.append(overlay);return close;
}
