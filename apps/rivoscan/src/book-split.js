import {PDFDocument} from 'pdf-lib';
import {dewarpBookCanvas,estimateBookCurvature} from './document-dewarp.js';
import {estimateBookSpine} from './book-spine.js';
import {estimateLineWarp,applyLineWarpCanvas} from './line-aware-dewarp.js';

const dict={
 en:['Book Scan — split facing pages','Take photo','Import a book photo','Spine location','Save 2-page PDF','Close','Adjust the center separator and guided curvature until text lines look straighter. This is a real non-rigid correction, not automatic 3D reconstruction.'],
 ar:['مسح كتاب — فصل الصفحتين','تصوير الكتاب','استيراد صورة الكتاب','موقع وسط الكتاب','حفظ PDF بجوج صفحات','إغلاق','حرك خط وسط الكتاب وضبط انحناء الصفحة حتى تبان السطور مستقيمة. التقويم هندسي غير خطي ولكن ماشي إعادة بناء أوتوماتيكية ثلاثية الأبعاد.'],
 fr:['Livre — séparer deux pages','Photographier','Importer photo','Reliure','Enregistrer PDF (2 pages)','Fermer','Ajustez la reliure et la courbure. Estimation automatique expérimentale, avec correction manuelle.'],
 es:['Libro — separar páginas','Fotografiar','Importar foto','Lomo','Guardar PDF (2 páginas)','Cerrar','Ajuste el lomo y la curvatura. Estimación automática experimental con ajuste manual.'],
 de:['Buch — Doppelseite trennen','Foto aufnehmen','Bild importieren','Buchfalz','2-seitiges PDF speichern','Schließen','Buchfalz und Krümmung anpassen. Experimentelle automatische Schätzung mit manueller Korrektur.'],
 pt:['Livro — separar páginas','Fotografar','Importar foto','Lombada','Guardar PDF de 2 páginas','Fechar','Ajuste a lombada e a curvatura. Estimativa automática experimental com controlo manual.'],
 it:['Libro — separa pagine','Fotografa','Importa foto','Piega centrale','Salva PDF a 2 pagine','Chiudi','Regola il dorso e la curvatura. Stima automatica sperimentale, regolazione manuale.']
};
export function splitBookRegions(width,height,spine=50){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<100||height<100)throw Error('Invalid book photo');
 if(!Number.isFinite(spine)||spine<25||spine>75)throw Error('Spine must be between 25% and 75%');
 const cut=Math.max(1,Math.min(width-1,Math.round(width*spine/100)));
 return [{x:0,y:0,w:cut,h:height},{x:cut,y:0,w:width-cut,h:height}];
}
/** Resolve independent left/right book-page warps; manual slider overrides auto. */
export function resolveBookPageCurvature(pageIndex,manualCurvature,autoPageWarp=null){
 if(!Number.isInteger(pageIndex)||pageIndex<0||pageIndex>1||
   !Number.isFinite(manualCurvature)||Math.abs(manualCurvature)>100)
  throw Error('Invalid book curvature');
 const estimate=autoPageWarp?.[pageIndex];
 return Number.isFinite(estimate) ? Math.max(-100,Math.min(100,estimate)) : manualCurvature;
}
function makeButton(parent,title,callback){
 const b=document.createElement('button');b.type='button';b.textContent=title;b.addEventListener('click',callback);parent.append(b);return b;
}
export function openBookSplitter({language='en',save,capture,singlePage=false}={}){
 const L=dict[language]||dict.en,overlay=document.createElement('div');
 overlay.className='rivo-id-overlay';
 const panel=document.createElement('section');panel.className='rivo-id-dialog';panel.setAttribute('role','dialog');
 panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',L[0]);
 const title=document.createElement('h2');
 title.textContent=singlePage?({en:'Document Flattening — correct curved paper',ar:'تقويم الوثائق — تصحيح الورق المنحني',fr:'Aplatir le document — corriger la courbure',es:'Aplanar documento — corregir curvas',de:'Dokument glätten — gewelltes Papier',pt:'Achatar documento — corrigir curvas',it:'Appiattisci documento — correggi curvature'})[language]||'Document Flattening':L[0];
 panel.append(title);
 const actions=document.createElement('div');actions.className='rivo-code-actions';panel.append(actions);
 const fileInput=document.createElement('input');fileInput.type='file';fileInput.accept='image/*';fileInput.multiple=!singlePage;fileInput.hidden=true;panel.append(fileInput);
 const spreadCount=document.createElement('p');spreadCount.className='rivo-id-hint';
 if(!singlePage)panel.append(spreadCount);
 const preview=document.createElement('canvas');preview.className='rivo-id-preview';panel.append(preview);
 const location=document.createElement('label');location.className='rivo-id-row';location.textContent=L[3];
 const slider=document.createElement('input');slider.type='range';slider.min='25';slider.max='75';slider.value='50';location.append(slider);panel.append(location);
 const autoSpine=document.createElement('button');autoSpine.type='button';autoSpine.className='rivo-auto-spine';
 autoSpine.textContent=({ar:'اكتشف وسط الكتاب (تجريبي)',en:'Find book spine (beta)',fr:'Trouver la reliure (bêta)',es:'Buscar el lomo (beta)',de:'Buchfalz erkennen (Beta)',pt:'Encontrar lombada (beta)',it:'Trova dorso (beta)'})[language]||'Find spine (beta)';
 panel.append(autoSpine);
 if(singlePage){location.hidden=true;autoSpine.hidden=true;}
 const warpLabel=document.createElement('label');warpLabel.className='rivo-id-row';
 warpLabel.textContent=({ar:'تقويم انحناء الورق (يدوي)',en:'Guided curved-page flattening',fr:'Correction guidée de la courbure',es:'Corregir curvatura manualmente',de:'Manuelle Krümmungskorrektur',pt:'Correção manual da curvatura',it:'Correzione manuale curva'})[language]||'Guided curved-page flattening';
 const warpSlider=document.createElement('input');warpSlider.type='range';warpSlider.min='-100';warpSlider.max='100';warpSlider.value='0';warpSlider.step='5';
 warpLabel.append(warpSlider);panel.append(warpLabel);
 const autoButton=document.createElement('button');autoButton.type='button';autoButton.className='rivo-auto-curvature';
 autoButton.textContent=({ar:'اكتشف الانحناء تلقائياً (تجريبي)',en:'Estimate curvature automatically (beta)',fr:'Estimer la courbure automatiquement (bêta)',es:'Estimar curvatura automáticamente (beta)',de:'Krümmung automatisch schätzen (Beta)',pt:'Estimar curvatura automaticamente (beta)',it:'Stima curva automatica (beta)'})[language]||'Auto curvature (beta)';
 panel.append(autoButton);
 const lineButton=document.createElement('button');lineButton.type='button';lineButton.className='rivo-line-curvature';
 lineButton.textContent=({en:'Straighten text rows (beta)',ar:'تقويم سطور الكتاب تلقائياً (تجريبي)',fr:'Redresser les lignes (bêta)',es:'Enderezar líneas (beta)',de:'Textzeilen begradigen (Beta)',pt:'Endireitar linhas (beta)',it:'Raddrizza righe (beta)'})[language]||'Straighten text rows (beta)';
 panel.append(lineButton);
 if(singlePage){lineButton.hidden=true;autoButton.hidden=true;}
 const autoAll=document.createElement('button');autoAll.type='button';autoAll.className='rivo-auto-all';
 autoAll.textContent=({en:'Auto straighten (beta)',ar:'تقويم تلقائي (تجريبي)',fr:'Redresser automatiquement (bêta)',es:'Enderezar automáticamente (beta)',de:'Automatisch begradigen (Beta)',pt:'Endireitar automaticamente (beta)',it:'Raddrizza automaticamente (beta)'})[language]||'Auto straighten';
 panel.append(autoAll);
 const compare=document.createElement('button');compare.type='button';compare.className='rivo-compare';
 compare.textContent=({en:'Compare original / corrected',ar:'قارن الأصلية مع المصححة',fr:'Comparer original et corrigé',es:'Comparar original y corrección',de:'Original / Korrektur vergleichen',pt:'Comparar original / corrigido',it:'Confronta originale / corretto'})[language]||'Compare';
 panel.append(compare);
 const info=document.createElement('p');info.textContent=singlePage?
  ({en:'Straighten one document using detected text-line curvature; adjust manually if detection is uncertain. Not 3D fold reconstruction.',ar:'كيقوّم صفحة وحدة بتحليل سطور النص، وإذا النتيجة ما واضحةش يمكن تصحيحها يدوياً. ماشي إعادة بناء 3D كاملة.',fr:'Redressement par lignes de texte, à vérifier. Ce n’est pas une reconstruction 3D.'})[language]||'Guided flattening':L[6];info.className='rivo-id-hint';panel.append(info);
 const status=document.createElement('p');status.setAttribute('role','status');panel.append(status);
 const saveAction=document.createElement('div');saveAction.className='rivo-code-actions';panel.append(saveAction);
 let image=null,objectURL=null,closed=false,busy=false,autoPageWarp=null,autoLineWarp=null,showOriginal=false;
 const previousSpreads=[],maxSpreads=6;
 const countSpreads=()=>{if(!singlePage)spreadCount.textContent=
  (({en:'Book spreads',ar:'صور صفحات الكتب',fr:'Doubles pages',es:'Páginas dobles',de:'Doppelseiten',pt:'Páginas duplas',it:'Pagine doppie'})[language]||'Book spreads')+': '+(previousSpreads.length+(image?1:0))+' / '+maxSpreads};
 countSpreads();
 const cleanup=()=>{closed=true;overlay.remove();if(objectURL)URL.revokeObjectURL(objectURL)};
 const load=async src=>{
  if(!singlePage&&image&&previousSpreads.length>=maxSpreads-1)
   throw Error('Book Scan maximum: '+maxSpreads+' spreads (12 pages).');
  const source=new Image();source.src=src;
  await new Promise((ok,bad)=>{source.onload=ok;source.onerror=bad;if(source.complete&&source.naturalWidth)ok()});
  // Ingest downsized copies to bound memory across a book. Originals stay untouched.
  const scale=Math.min(1,2200/Math.max(source.naturalWidth,source.naturalHeight));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(source.naturalWidth*scale));
  canvas.height=Math.max(1,Math.round(source.naturalHeight*scale));
  canvas.getContext('2d').drawImage(source,0,0,canvas.width,canvas.height);
  const img=new Image();img.src=canvas.toDataURL('image/jpeg',.90);
  await new Promise((ok,bad)=>{img.onload=ok;img.onerror=bad;if(img.complete&&img.naturalWidth)ok()});
  if(closed)return;
  if(!singlePage&&image)previousSpreads.push({
   image,spine:+slider.value,curvature:+warpSlider.value,
   autoPageWarp,autoLineWarp
  });
  image=img;slider.value='50';autoPageWarp=null;autoLineWarp=null;showOriginal=false;warpSlider.value='0';
  draw();autoFix();countSpreads();
 };
 const draw=()=>{
  if(!image)return;
  const scale=Math.min(1,700/Math.max(image.naturalWidth,image.naturalHeight));
  preview.width=Math.round(image.naturalWidth*scale);preview.height=Math.round(image.naturalHeight*scale);
  const ctx=preview.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,preview.width,preview.height);
  if(showOriginal)return;
  const center=Math.round(preview.width*(+slider.value/100));
  const parts=singlePage?[[0,0,preview.width,'right']]:[[0,0,center,'right'],[1,center,preview.width-center,'left']];
  for(const [pageIndex,x,w,side] of parts){
   if(w<2)continue;
   const curvature=resolveBookPageCurvature(pageIndex,+warpSlider.value,autoPageWarp);
   if(curvature===0&&!autoLineWarp?.[pageIndex]?.anchors?.length)continue;
   const section=document.createElement('canvas');section.width=w;section.height=preview.height;
   section.getContext('2d').drawImage(preview,x,0,w,preview.height,0,0,w,preview.height);
   dewarpBookCanvas(section,curvature,side);
   if(autoLineWarp?.[pageIndex])applyLineWarpCanvas(section,autoLineWarp[pageIndex]);
   ctx.drawImage(section,x,0);
  }
  if(!singlePage){ctx.strokeStyle='#04bcf7';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(center,0);ctx.lineTo(center,preview.height);ctx.stroke();}
 };
 const autoFix=()=>{
  if(!image||busy)return;
  autoPageWarp=null;autoLineWarp=null;warpSlider.value='0';showOriginal=false;
  draw();
  const width=preview.width,height=preview.height;
  const ctx=preview.getContext('2d',{willReadFrequently:true});
  if(!singlePage&&width>=160&&height>=100){
   const whole=ctx.getImageData(0,0,width,height);
   const gutter=estimateBookSpine(whole.data,width,height);
   if(gutter.confidence>=.25){slider.value=String(gutter.spine);draw()}
  }
  const center=Math.round(width*(+slider.value/100));
  const pages=singlePage?[[0,0,width,'right']]:[[0,0,center,'right'],[1,center,width-center,'left']];
  const line=[null,null],curve=[null,null];
  let reliable=0;
  for(const [idx,x,w,side] of pages){
   if(w<80||height<100)continue;
   const pixels=ctx.getImageData(x,0,w,height);
   if(w>=140&&height>=120){
    const result=estimateLineWarp(pixels.data,w,height,side);
    if(result.confidence>=.5){line[idx]=result;reliable++;continue}
   }
   const estimate=estimateBookCurvature(pixels.data,w,height,side);
   if(estimate.confidence>=.48){curve[idx]=Math.max(-100,Math.min(100,estimate.curvature));reliable++}
  }
  autoLineWarp=line;
  autoPageWarp=curve;
  draw();
  status.textContent=reliable?
    (({en:'Auto beta: review the result and compare with the original before saving.',ar:'تقويم تجريبي: راجع النتيجة وقارنها مع الأصل قبل الحفظ.',fr:'Correction bêta : vérifiez le résultat et comparez avec l’original.'})[language]||'Review auto correction'):
    (({en:'No reliable text lines found. Original preserved; use manual correction.',ar:'ما لقيناش سطور واضحة باش نصححو تلقائياً. الأصلية محفوظة؛ استعمل التقويم اليدوي.',fr:'Aucune ligne fiable ; utilisez le réglage manuel.'})[language]||'Manual correction required');
 };
 autoAll.addEventListener('click',autoFix);
 compare.addEventListener('click',()=>{showOriginal=!showOriginal;draw()});
 makeButton(actions,L[1],async()=>{
  if(!capture)return;
  try{const photo=await capture();if(photo)await load(photo)}catch(error){status.textContent=error?.message||String(error)}
 });
 makeButton(actions,L[2],()=>fileInput.click());
 if(!singlePage)makeButton(actions,
  (({en:'Undo last spread',ar:'رجّع الصفحة السابقة',fr:'Revenir à la double page précédente',es:'Volver a página anterior',de:'Letzte Doppelseite zurück',pt:'Voltar à página anterior',it:'Torna alla pagina precedente'})[language]||'Previous spread'),()=>{
   if(busy||!previousSpreads.length)return;
   const old=previousSpreads.pop();
   image=old.image;slider.value=String(old.spine);warpSlider.value=String(old.curvature);
   autoPageWarp=old.autoPageWarp;autoLineWarp=old.autoLineWarp;showOriginal=false;
   draw();countSpreads();
  });
 makeButton(actions,L[5],cleanup);
 fileInput.addEventListener('change',async()=>{
  const files=[...(fileInput.files||[])];fileInput.value='';
  for(const file of files){
   if(!file.type.startsWith('image/')||file.size>18*1024*1024){
    status.textContent='Unsupported or oversized photo (max 18 MB each)';break;
   }
   const url=URL.createObjectURL(file);
   try{await load(url)}
   catch(error){status.textContent=error?.message||String(error);break}
   finally{URL.revokeObjectURL(url)}
  }
 });
 autoSpine.addEventListener('click',()=>{
  if(!image||busy)return;
  const canvas=document.createElement('canvas'),factor=Math.min(1,700/Math.max(image.naturalWidth,image.naturalHeight));
  canvas.width=Math.max(1,Math.round(image.naturalWidth*factor));
  canvas.height=Math.max(1,Math.round(image.naturalHeight*factor));
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(image,0,0,canvas.width,canvas.height);
  try{
   const result=estimateBookSpine(ctx.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height);
   if(result.confidence<.25){
    status.textContent=({ar:'وسط الكتاب ما واضحش؛ حرك الخط يدوياً.',en:'Gutter uncertain; use manual separator.'})[language]||'Manual separator required';return;
   }
   slider.value=String(result.spine);autoPageWarp=null;autoLineWarp=null;draw();
   status.textContent='Spine beta '+result.spine+'% · confidence '+Math.round(result.confidence*100)+'%';
  }catch(error){status.textContent=error?.message||String(error)}
 });
 autoButton.addEventListener('click',()=>{
  if(!image||busy)return;
  // Estimate each page independently: pages may curve by different amounts
  // and even in opposite directions. Never average their warps.
  autoPageWarp=null;autoLineWarp=null;warpSlider.value='0';draw();
  const mid=Math.round(preview.width*(+slider.value/100));
  const samples=[null,null];
  for(const [pageIndex,x,w,side] of [[0,0,mid,'right'],[1,mid,preview.width-mid,'left']]){
   if(w<80||preview.height<100)continue;
   const pixels=preview.getContext('2d',{willReadFrequently:true}).getImageData(x,0,w,preview.height);
   const estimate=estimateBookCurvature(pixels.data,w,preview.height,side);
   if(estimate.confidence>.24)samples[pageIndex]=estimate;
  }
  if(!samples.some(Boolean)){
   status.textContent=({ar:'ما قدرناش نقدرو الانحناء بثقة؛ ضبطو يدوياً.',en:'Not enough readable text lines for automatic estimate; adjust manually.'})[language]||'Manual curvature adjustment required';
   return;
  }
  autoPageWarp=samples.map(estimate=>estimate
   ?Math.max(-100,Math.min(100,Math.round(estimate.curvature/5)*5)):0);
  draw();
  status.textContent='Auto beta · '+autoPageWarp.map((v,i)=>
   'Page '+(i+1)+': '+v+'%'+(samples[i]?' ('+Math.round(samples[i].confidence*100)+'% confidence)':' (manual adjustment needed)')).join(' · ');
 });
 lineButton.addEventListener('click',()=>{
  if(!image||busy)return;
  autoLineWarp=null;autoPageWarp=null;showOriginal=false;warpSlider.value='0';draw();
  const mid=Math.round(preview.width*(+slider.value/100)),found=[null,null];
  for(const [i,x,w,side] of [[0,0,mid,'right'],[1,mid,preview.width-mid,'left']]){
   if(w<140||preview.height<120)continue;
   const raw=preview.getContext('2d',{willReadFrequently:true}).getImageData(x,0,w,preview.height);
   const estimate=estimateLineWarp(raw.data,w,preview.height,side);
   if(estimate.confidence>=.25)found[i]=estimate;
  }
  if(!found.some(Boolean)){
   status.textContent=({ar:'السطور ما واضحةش كفاية، استعمل التقويم اليدوي.',en:'Not enough reliable text rows; use guided curvature slider.'})[language]||'Manual correction required';return;
  }
  autoLineWarp=found;draw();
  status.textContent=({ar:'تقويم تجريبي اعتماداً على السطور: راجع النتيجة قبل الحفظ.',en:'Line-aware beta: review page previews before saving.'})[language]||'Check correction before saving';
 });
 slider.addEventListener('input',()=>{autoPageWarp=null;autoLineWarp=null;draw()});
 warpSlider.addEventListener('input',()=>{autoPageWarp=null;autoLineWarp=null;draw()});
 makeButton(saveAction,singlePage?
  (({en:'Save flattened PDF copy',ar:'حفظ PDF مصحح',fr:'Enregistrer PDF aplati',es:'Guardar PDF corregido',de:'Korrigiertes PDF speichern',pt:'Guardar PDF corrigido',it:'Salva PDF corretto'})[language]||'Save flattened PDF'):
  L[4],async()=>{
  if(!image||busy)return;busy=true;
  try{
   const pdf=await PDFDocument.create();
   const spreads=singlePage?[{image,spine:+slider.value,curvature:+warpSlider.value,autoLineWarp,autoPageWarp}]:
    [...previousSpreads,{image,spine:+slider.value,curvature:+warpSlider.value,autoLineWarp,autoPageWarp}];
   for(const spread of spreads){
    const src=spread.image;
    const regions=singlePage?[{x:0,y:0,w:src.naturalWidth,h:src.naturalHeight}]:
      splitBookRegions(src.naturalWidth,src.naturalHeight,spread.spine);
    for(const [regionIndex,rect] of regions.entries()){
     const scale=Math.min(1,1800/Math.max(rect.w,rect.h));
     const canvas=document.createElement('canvas');
     canvas.width=Math.max(1,Math.round(rect.w*scale));canvas.height=Math.max(1,Math.round(rect.h*scale));
     canvas.getContext('2d').drawImage(src,rect.x,rect.y,rect.w,rect.h,0,0,canvas.width,canvas.height);
     dewarpBookCanvas(canvas,resolveBookPageCurvature(regionIndex,spread.curvature,spread.autoPageWarp),regionIndex===0?'right':'left');
     if(spread.autoLineWarp?.[regionIndex])applyLineWarpCanvas(canvas,spread.autoLineWarp[regionIndex]);
     const blob=await new Promise((ok,bad)=>canvas.toBlob(b=>b?ok(b):bad(Error('JPEG failed')),'image/jpeg',.91));
     const pic=await pdf.embedJpg(await blob.arrayBuffer());
     const page=pdf.addPage([595,842]),pad=15;
     const ratio=Math.min((595-pad*2)/pic.width,(842-pad*2)/pic.height);
     const w=pic.width*ratio,h=pic.height*ratio;
     page.drawImage(pic,{x:(595-w)/2,y:(842-h)/2,width:w,height:h});
    }
   }
   await save(new Uint8Array(await pdf.save({useObjectStreams:true})),(singlePage?'RivoScan_Flatten_':'RivoScan_Book_')+Date.now()+'.pdf','application/pdf');
   if(!closed)cleanup();
  }catch(error){status.textContent=error?.message||String(error)}
  finally{busy=false}
 });
 overlay.append(panel);document.body.append(overlay);
 return cleanup;
}
