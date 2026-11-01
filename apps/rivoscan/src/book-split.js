import {PDFDocument} from 'pdf-lib';
import {dewarpBookCanvas,estimateBookCurvature} from './document-dewarp.js';

const dict={
 en:['Book Scan — split facing pages','Take photo','Import a book photo','Spine location','Save 2-page PDF','Close','Adjust the center separator and guided curvature until text lines look straighter. This is a real non-rigid correction, not automatic 3D reconstruction.'],
 ar:['مسح كتاب — فصل الصفحتين','تصوير الكتاب','استيراد صورة الكتاب','موقع وسط الكتاب','حفظ PDF بجوج صفحات','إغلاق','حرك خط وسط الكتاب وضبط انحناء الصفحة حتى تبان السطور مستقيمة. التقويم هندسي غير خطي ولكن ماشي إعادة بناء أوتوماتيكية ثلاثية الأبعاد.'],
 fr:['Livre — séparer deux pages','Photographier','Importer photo','Reliure','Enregistrer PDF (2 pages)','Fermer','Déplacez la séparation centrale. Le redressement des courbures reste indisponible.'],
 es:['Libro — separar páginas','Fotografiar','Importar foto','Lomo','Guardar PDF (2 páginas)','Cerrar','Ajuste el centro. La corrección de curvaturas aún no está disponible.'],
 de:['Buch — Doppelseite trennen','Foto aufnehmen','Bild importieren','Buchfalz','2-seitiges PDF speichern','Schließen','Mittelsteg anpassen. Biegungen werden nicht entzerrt.'],
 pt:['Livro — separar páginas','Fotografar','Importar foto','Lombada','Guardar PDF de 2 páginas','Fechar','Ajuste o centro. Ainda não corrige curvaturas.'],
 it:['Libro — separa pagine','Fotografa','Importa foto','Piega centrale','Salva PDF a 2 pagine','Chiudi','Regola il centro. Non corregge le curve della carta.']
};
export function splitBookRegions(width,height,spine=50){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<100||height<100)throw Error('Invalid book photo');
 if(!Number.isFinite(spine)||spine<25||spine>75)throw Error('Spine must be between 25% and 75%');
 const cut=Math.max(1,Math.min(width-1,Math.round(width*spine/100)));
 return [{x:0,y:0,w:cut,h:height},{x:cut,y:0,w:width-cut,h:height}];
}
function makeButton(parent,title,callback){
 const b=document.createElement('button');b.type='button';b.textContent=title;b.addEventListener('click',callback);parent.append(b);return b;
}
export function openBookSplitter({language='en',save,capture}={}){
 const L=dict[language]||dict.en,overlay=document.createElement('div');
 overlay.className='rivo-id-overlay';
 const panel=document.createElement('section');panel.className='rivo-id-dialog';panel.setAttribute('role','dialog');
 panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',L[0]);
 const title=document.createElement('h2');title.textContent=L[0];panel.append(title);
 const actions=document.createElement('div');actions.className='rivo-code-actions';panel.append(actions);
 const fileInput=document.createElement('input');fileInput.type='file';fileInput.accept='image/*';fileInput.hidden=true;panel.append(fileInput);
 const preview=document.createElement('canvas');preview.className='rivo-id-preview';panel.append(preview);
 const location=document.createElement('label');location.className='rivo-id-row';location.textContent=L[3];
 const slider=document.createElement('input');slider.type='range';slider.min='25';slider.max='75';slider.value='50';location.append(slider);panel.append(location);
 const warpLabel=document.createElement('label');warpLabel.className='rivo-id-row';
 warpLabel.textContent=({ar:'تقويم انحناء الورق (يدوي)',en:'Guided curved-page flattening',fr:'Correction guidée de la courbure',es:'Corregir curvatura manualmente',de:'Manuelle Krümmungskorrektur',pt:'Correção manual da curvatura',it:'Correzione manuale curva'})[language]||'Guided curved-page flattening';
 const warpSlider=document.createElement('input');warpSlider.type='range';warpSlider.min='-100';warpSlider.max='100';warpSlider.value='0';warpSlider.step='5';
 warpLabel.append(warpSlider);panel.append(warpLabel);
 const autoButton=document.createElement('button');autoButton.type='button';autoButton.className='rivo-auto-curvature';
 autoButton.textContent=({ar:'اكتشف الانحناء تلقائياً (تجريبي)',en:'Estimate curvature automatically (beta)',fr:'Estimer la courbure automatiquement (bêta)',es:'Estimar curvatura automáticamente (beta)',de:'Krümmung automatisch schätzen (Beta)',pt:'Estimar curvatura automaticamente (beta)',it:'Stima curva automatica (beta)'})[language]||'Auto curvature (beta)';
 panel.append(autoButton);
 const info=document.createElement('p');info.textContent=L[6];info.className='rivo-id-hint';panel.append(info);
 const status=document.createElement('p');status.setAttribute('role','status');panel.append(status);
 const saveAction=document.createElement('div');saveAction.className='rivo-code-actions';panel.append(saveAction);
 let image=null,objectURL=null,closed=false,busy=false;
 const cleanup=()=>{closed=true;overlay.remove();if(objectURL)URL.revokeObjectURL(objectURL)};
 const load=async src=>{
  const img=new Image();img.src=src;
  await new Promise((ok,bad)=>{img.onload=ok;img.onerror=bad;if(img.complete&&img.naturalWidth)ok()});
  if(!closed){image=img;draw()}
 };
 const draw=()=>{
  if(!image)return;
  const scale=Math.min(1,700/Math.max(image.naturalWidth,image.naturalHeight));
  preview.width=Math.round(image.naturalWidth*scale);preview.height=Math.round(image.naturalHeight*scale);
  const ctx=preview.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,preview.width,preview.height);
  const center=Math.round(preview.width*(+slider.value/100));
  if(+warpSlider.value!==0){
   for(const [x,w,side] of [[0,center,'right'],[center,preview.width-center,'left']]){
    if(w<2)continue;
    const section=document.createElement('canvas');section.width=w;section.height=preview.height;
    section.getContext('2d').drawImage(preview,x,0,w,preview.height,0,0,w,preview.height);
    dewarpBookCanvas(section,+warpSlider.value,side);
    ctx.drawImage(section,x,0);
   }
  }
  ctx.strokeStyle='#04bcf7';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(center,0);ctx.lineTo(center,preview.height);ctx.stroke();
 };
 makeButton(actions,L[1],async()=>{
  if(!capture)return;
  try{const photo=await capture();if(photo)await load(photo)}catch(error){status.textContent=error?.message||String(error)}
 });
 makeButton(actions,L[2],()=>fileInput.click());
 makeButton(actions,L[5],cleanup);
 fileInput.addEventListener('change',async()=>{
  const file=fileInput.files?.[0];fileInput.value='';if(!file)return;
  if(objectURL)URL.revokeObjectURL(objectURL);objectURL=URL.createObjectURL(file);
  try{await load(objectURL)}catch{status.textContent='Cannot read book image'}
 });
 autoButton.addEventListener('click',()=>{
  if(!image||busy)return;
  warpSlider.value='0';draw();
  const mid=Math.round(preview.width*(+slider.value/100));
  const samples=[];
  for(const [x,w,side] of [[0,mid,'right'],[mid,preview.width-mid,'left']]){
   if(w<80||preview.height<100)continue;
   const pixels=preview.getContext('2d',{willReadFrequently:true}).getImageData(x,0,w,preview.height);
   const estimate=estimateBookCurvature(pixels.data,w,preview.height,side);
   if(estimate.confidence>.24)samples.push(estimate);
  }
  if(!samples.length){
   status.textContent=({ar:'ما قدرناش نقدرو الانحناء بثقة؛ ضبطو يدوياً.',en:'Not enough readable text lines for automatic estimate; adjust manually.'})[language]||'Manual curvature adjustment required';
   return;
  }
  const total=samples.reduce((a,x)=>a+x.confidence,0);
  const estimate=samples.reduce((a,x)=>a+x.curvature*x.confidence,0)/total;
  warpSlider.value=String(Math.max(-100,Math.min(100,Math.round(estimate/5)*5)));
  draw();
  status.textContent='Auto curvature: '+warpSlider.value+'% · '+Math.round(total/samples.length*100)+'%';
 });
 slider.addEventListener('input',draw);
 warpSlider.addEventListener('input',draw);
 makeButton(saveAction,L[4],async()=>{
  if(!image||busy)return;busy=true;
  try{
   const pdf=await PDFDocument.create(),regions=splitBookRegions(image.naturalWidth,image.naturalHeight,+slider.value);
   for(const [regionIndex,rect] of regions.entries()){
    const scale=Math.min(1,1800/Math.max(rect.w,rect.h));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(rect.w*scale));canvas.height=Math.max(1,Math.round(rect.h*scale));
    canvas.getContext('2d').drawImage(image,rect.x,rect.y,rect.w,rect.h,0,0,canvas.width,canvas.height);
    dewarpBookCanvas(canvas,+warpSlider.value,regionIndex===0?'right':'left');
    const blob=await new Promise((ok,bad)=>canvas.toBlob(b=>b?ok(b):bad(Error('JPEG failed')),'image/jpeg',.91));
    const pic=await pdf.embedJpg(await blob.arrayBuffer());
    const page=pdf.addPage([595,842]),pad=15;
    const ratio=Math.min((595-pad*2)/pic.width,(842-pad*2)/pic.height);
    const w=pic.width*ratio,h=pic.height*ratio;page.drawImage(pic,{x:(595-w)/2,y:(842-h)/2,width:w,height:h});
   }
   await save(new Uint8Array(await pdf.save({useObjectStreams:true})),'RivoScan_Book_'+Date.now()+'.pdf','application/pdf');
   if(!closed)cleanup();
  }catch(error){status.textContent=error?.message||String(error)}
  finally{busy=false}
 });
 overlay.append(panel);document.body.append(overlay);
 return cleanup;
}
