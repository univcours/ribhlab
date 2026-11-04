import {perfectScanRGBA,assessDocumentQualityRGBA,inspectInkChanges} from './perfect-scan-core.js';
import {PDFDocument} from 'pdf-lib';

const dict={
 en:{title:'PerfectScan Pro',subtitle:'Local multi-shot document enhancement · experimental 2D flattening',base:'Source photo',add:'Add shots',capture:'Capture another angle',process:'✦ One-tap PerfectScan',compare:'Hold to compare original',original:'Original photo',processed:'Enhanced copy',save:'Save scan + integrity report',cancel:'Close',privacy:'Never uploads your document. Original pixels and file are preserved.',tip:'Use 2–4 photos of the SAME document, with matching framing. Slightly change lighting or angle. Unmatched photos are rejected.',none:'Choose a source photo first.',choosing:'Choose document photo',ready:'Ready to enhance',working:'Checking alignment and correcting paper...',review:'Please review ALL text, stamps and signatures before saving.',check:'I reviewed the full document and accept this processed copy.',saved:'Scan and integrity report saved. The original was kept.',failed:'Unable to process this document.',geometry:'Correct curved printed lines (2D)',quality:'Contrast safe; strongly folded/missing text cannot be recovered.',frames:'Additional photos',rejected:'Photos rejected (misalignment)',manual:'Manual review required',clean:'Safety checks passed; review still recommended'},
 ar:{title:'PerfectScan Pro',subtitle:'تحسين محلي بصور متعددة وتقويم 2D تجريبي',base:'الصورة الأصلية',add:'زيد صور',capture:'صوّر زاوية أخرى',process:'✦ PerfectScan بضغطة واحدة',compare:'ضغط مطول باش تشوف الأصل',original:'الصورة الأصلية',processed:'الصورة المحسنة',save:'حفظ الصورة وتقرير التحقق',cancel:'إغلاق',privacy:'الوثيقة ما كترفعش للإنترنت. الأصل كيبقى محفوظ.',tip:'صور 2 حتى 4 صور لنفس الوثيقة وبنفس التأطير، مع اختلاف خفيف فالضوء أو الزاوية. الصور غير المتطابقة ما كتستعملش.',none:'اختار الصورة الأصلية أولاً.',choosing:'اختار صورة الوثيقة',ready:'الصور واجدة',working:'كنتحققو من التطابق وكنقوّمو الورقة…',review:'راجع النصوص والكاشيات والتواقيع كاملين قبل الحفظ.',check:'راجعت الوثيقة كاملة وكنوافق على النسخة المحسنة.',saved:'تحفظ السكانير والتقرير وبقات الصورة الأصلية.',failed:'ما قدرناش نعالجو الوثيقة.',geometry:'تقويم انحناء السطور (2D)',quality:'التجاعيد العميقة والحروف المفقودة ماشي مضمون نصلحوها.',frames:'صور إضافية',rejected:'صور مرفوضة (ما متطابقاش)',manual:'خاص مراجعة',clean:'فحص الحبر جيد، والمراجعة لازمة'},
 fr:{title:'PerfectScan Pro',subtitle:'Fusion locale et redressement 2D expérimental',base:'Photo source',add:'Ajouter des prises',capture:'Autre angle',process:'✦ PerfectScan en un clic',compare:'Maintenir pour comparer',original:'Original',processed:'Copie améliorée',save:'Enregistrer et rapport',cancel:'Fermer',privacy:'Aucun transfert réseau. Original préservé.',tip:'2 à 4 photos du MÊME document avec cadrage similaire.',none:'Sélectionnez la photo source.',choosing:'Choisir photo',ready:'Prêt',working:'Alignement et nettoyage...',review:'Vérifiez le texte, les cachets et signatures.',check:"J'ai vérifié toute la page et j'accepte la copie.",saved:'Scan et rapport enregistrés.',failed:'Traitement impossible.',geometry:'Redresser lignes courbes (2D)',quality:'Plis profonds et texte manquant non récupérables.',frames:'Autres prises',rejected:'Prises rejetées',manual:'Vérification manuelle',clean:'Tests de couleur et encre réussis; vérifiez'},
 es:{title:'PerfectScan Pro',subtitle:'Fusión local y corrección 2D experimental',base:'Foto original',add:'Añadir fotos',capture:'Otra toma',process:'✦ PerfectScan en un toque',compare:'Mantener para comparar',original:'Original',processed:'Mejorada',save:'Guardar imagen e informe',cancel:'Cerrar',privacy:'Sin subir imágenes. Original intacto.',tip:'Use 2–4 fotos del MISMO papel con encuadre similar.',none:'Elija una foto.',choosing:'Elegir foto',ready:'Lista',working:'Alineando y corrigiendo...',review:'Revise texto, sellos y firmas.',check:'He revisado la página completa y acepto la copia.',saved:'Imagen e informe guardados.',failed:'No se pudo procesar.',geometry:'Corregir líneas curvas (2D)',quality:'No recupera tinta perdida ni pliegues profundos.',frames:'Fotos añadidas',rejected:'Fotos rechazadas',manual:'Revisión requerida',clean:'Comprobación pasada; revise'},
 de:{title:'PerfectScan Pro',subtitle:'Lokale Fotofusion, experimentelle 2D-Entzerrung',base:'Originalfoto',add:'Aufnahmen hinzufügen',capture:'Weiteren Winkel aufnehmen',process:'✦ PerfectScan',compare:'Halten zum Vergleich',original:'Original',processed:'Bearbeitet',save:'Bild und Bericht speichern',cancel:'Schließen',privacy:'Keine Übertragung. Original bleibt erhalten.',tip:'2–4 Aufnahmen desselben Dokuments bei ähnlicher Ausrichtung.',none:'Foto auswählen.',choosing:'Foto auswählen',ready:'Bereit',working:'Ausrichten und bereinigen...',review:'Text, Stempel und Unterschriften prüfen.',check:'Ich habe das gesamte Dokument geprüft.',saved:'Bild und Bericht gespeichert.',failed:'Bearbeitung nicht möglich.',geometry:'Gekrümmte Zeilen korrigieren (2D)',quality:'Keine Wiederherstellung fehlender Schrift.',frames:'Weitere Fotos',rejected:'Abgewiesene Fotos',manual:'Bitte prüfen',clean:'Prüfung erfolgreich; bitte prüfen'},
 pt:{title:'PerfectScan Pro',subtitle:'Fusão local de fotos e correção 2D experimental',base:'Foto original',add:'Adicionar fotos',capture:'Capturar outro ângulo',process:'✦ PerfectScan',compare:'Manter para comparar',original:'Original',processed:'Melhorada',save:'Guardar digitalização e relatório',cancel:'Fechar',privacy:'Sem upload. Original intacto.',tip:'Use 2–4 fotos do MESMO documento com enquadramento semelhante.',none:'Escolha a foto.',choosing:'Escolher foto',ready:'Pronto',working:'A alinhar e limpar...',review:'Confira texto, carimbos e assinaturas.',check:'Revisei a página completa e aceito a cópia.',saved:'Scan e relatório guardados.',failed:'Não foi possível processar.',geometry:'Corrigir linhas curvas (2D)',quality:'Não recupera texto perdido.',frames:'Fotos extras',rejected:'Fotos rejeitadas',manual:'Verificação necessária',clean:'Verificação aprovada; revise'},
 it:{title:'PerfectScan Pro',subtitle:'Fusione locale e raddrizzamento 2D sperimentale',base:'Foto originale',add:'Aggiungi foto',capture:'Altro angolo',process:'✦ PerfectScan',compare:'Tieni premuto per confrontare',original:'Originale',processed:'Migliorata',save:'Salva immagine e rapporto',cancel:'Chiudi',privacy:'Nessun upload. Originale preservato.',tip:'2–4 scatti dello STESSO documento con inquadratura simile.',none:'Scegli prima una foto.',choosing:'Scegli foto',ready:'Pronto',working:'Allineamento e pulizia...',review:'Controlla testo, timbri e firme.',check:'Ho verificato tutta la pagina e accetto la copia.',saved:'Immagine e rapporto salvati.',failed:'Impossibile elaborare.',geometry:'Correggi righe curve (2D)',quality:'Non recupera testo mancante.',frames:'Scatti extra',rejected:'Foto rifiutate',manual:'Da controllare',clean:'Controlli superati; verificare'}
};
const pdfLabels={
 en:'Also save as PDF',ar:'حفظ PDF حتى هو',fr:'Enregistrer aussi en PDF',
 es:'Guardar también PDF',de:'Auch als PDF speichern',
 pt:'Guardar também PDF',it:'Salva anche PDF'
};
const qualityLabels={
 en:'Quality review',ar:'مراجعة جودة الصورة',fr:'Vérification qualité',
 es:'Revisar calidad',de:'Qualitätsprüfung',pt:'Revisão da qualidade',it:'Controllo qualità'
};
const mlkitLabels={en:'AI Deep Clean · ML Kit',ar:'تنقية AI قوية · ML Kit',fr:'Nettoyage IA · ML Kit',es:'Limpieza IA · ML Kit',de:'KI Tiefenreinigung · ML Kit',pt:'Limpeza IA · ML Kit',it:'Pulizia IA · ML Kit'};
const toBytes=base64=>{const bin=atob(base64);const a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return a};
const sha256=async bytes=>{
 if(typeof crypto==='undefined'||!crypto.subtle)return null;
 const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
 return Array.from(hash,b=>b.toString(16).padStart(2,'0')).join('');
};
const imageCanvas=async(blob,size=null)=>{
 const uri=URL.createObjectURL(blob);
 try{
  const image=await new Promise((resolve,reject)=>{
   const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Unreadable document photo'));img.src=uri;
  });
  const ratio=size?Math.min(size.width/image.naturalWidth,size.height/image.naturalHeight):
   Math.min(1,2100/Math.max(image.naturalWidth,image.naturalHeight),Math.sqrt(4800000/(image.naturalWidth*image.naturalHeight)));
  if(size&&Math.abs(image.naturalWidth/image.naturalHeight-size.width/size.height)>.035)
   throw Error('Extra photo has a different crop. Capture the same whole page.');
  const width=size?size.width:Math.max(1,Math.round(image.naturalWidth*ratio));
  const height=size?size.height:Math.max(1,Math.round(image.naturalHeight*ratio));
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.drawImage(image,0,0,width,height);
  return canvas;
 }finally{URL.revokeObjectURL(uri);}
};
const asJpeg=canvas=>new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('JPEG encoding failed')),'image/jpeg',.96));
const fileExt=(mime,name)=>mime==='image/png'||/\.png$/i.test(name)?'png':mime==='image/webp'||/\.webp$/i.test(name)?'webp':'jpg';
const safeName=name=>String(name||'source').replace(/[^a-z0-9._-]/gi,'_').slice(0,72);

const nativeModeLabels={
 en:{uvdoc:'UVDoc AI flatten · offline Android',surface:'Relative 3D surface · 2–4 different camera angles (beta)'},
 ar:{uvdoc:'UVDoc تقويم ذكي على الهاتف بلا إنترنت',surface:'سطح 3D نسبي · صور من زوايا مختلفة (تجريبي)'},
 fr:{uvdoc:'UVDoc IA · correction locale Android',surface:'Surface 3D relative · 2–4 angles (bêta)'},
 es:{uvdoc:'UVDoc IA · corrección local Android',surface:'Superficie 3D relativa · 2–4 ángulos (beta)'},
 de:{uvdoc:'UVDoc KI · lokale Android-Korrektur',surface:'Relative 3D-Oberfläche · 2–4 Ansichten (Beta)'},
 pt:{uvdoc:'UVDoc IA · correção Android offline',surface:'Superfície 3D relativa · 2–4 ângulos (beta)'},
 it:{uvdoc:'UVDoc IA · correzione Android offline',surface:'Superficie 3D relativa · 2–4 angoli (beta)'}
};

export async function openPerfectScan({doc=null,bridge,getLanguage=()=> 'en',onSave,onRefresh=async()=>{},notify=()=>{},onDeepClean=null,onUVDoc=null,onSurface3D=null}){
 const lang=getLanguage(),t=dict[lang]||dict.en;
 // Advanced correction is part of the single Scan workspace, not a second scanner.
 const modeTitle=({en:'Scan · Multi-angle',ar:'السكان · زوايا متعددة',fr:'Scan · Plusieurs angles',
  es:'Escanear · Varios ángulos',de:'Scan · Mehrere Winkel',pt:'Digitalizar · Vários ângulos',
  it:'Scansione · Più angoli'})[lang]||'Scan · Multi-angle';
 const root=document.createElement('div');root.className='rivo-perfectscan-overlay';
 root.dir=lang==='ar'?'rtl':'ltr';
 root.innerHTML='<section class="rivo-perfectscan-modal" role="dialog" aria-modal="true" aria-label="'+modeTitle+'">'+
 '<header><div><strong>'+modeTitle+'</strong><small>'+t.subtitle+'</small></div><button type="button" data-perfect="close" aria-label="'+t.cancel+'">✕</button></header>'+
 '<div class="rivo-perfectscan-toolbar">'+
 '<button type="button" data-perfect="base">'+t.choosing+'</button>'+
 '<button type="button" data-perfect="add">'+t.add+'</button>'+
 '<button type="button" data-perfect="camera">'+t.capture+'</button>'+
 (onDeepClean?'<button type="button" class="rivo-perfectscan-mlkit" data-perfect="mlkit">✦ '+mlkitLabels[lang]+'</button>':'')+'</div>'+
 '<input class="rivo-perfect-file" type="file" accept="image/*" hidden>'+
 '<input class="rivo-perfect-extras" type="file" accept="image/*" multiple hidden>'+
 '<input class="rivo-perfect-camera" type="file" accept="image/*" capture="environment" hidden>'+
 '<p class="rivo-perfectscan-tip">'+t.tip+'</p>'+
 '<div class="rivo-perfectscan-preview" hidden role="img" aria-label="'+t.original+'"><canvas></canvas><span class="rivo-perfectscan-tag">'+t.original+'</span></div>'+
 '<div class="rivo-perfectscan-control">'+
 '<label class="rivo-scan-method"><span>'+({en:'Correction method',ar:'طريقة التصحيح',fr:'Méthode de correction',
 es:'Método de corrección',de:'Korrekturmethode',pt:'Método de correção',
 it:'Metodo di correzione'})[lang]+'</span><select data-perfect-mode aria-label="Correction method">'+
 (onUVDoc?'<option value="uvdoc">'+(nativeModeLabels[lang]||nativeModeLabels.en).uvdoc+'</option>':'')+
 '<option value="geometry">'+t.geometry+'</option>'+
 (onSurface3D?'<option value="surface3d">'+(nativeModeLabels[lang]||nativeModeLabels.en).surface+'</option>':'')+
 '</select></label>'+
 '<button data-perfect="compare" hidden disabled>'+t.compare+'</button></div>'+
 '<p class="rivo-perfectscan-status" role="status">'+t.none+'</p>'+
 '<p class="rivo-perfectscan-warning">'+t.quality+'</p>'+
 '<footer class="rivo-perfectscan-actions" hidden><button data-perfect="process" disabled>'+t.process+'</button>'+
 '<button data-perfect="save" hidden disabled>'+t.save+'</button></footer>'+
 '<p class="rivo-perfectscan-privacy">'+t.privacy+'</p></section>';
 document.body.appendChild(root);
 const sourceInput=root.querySelector('.rivo-perfect-file'),extrasInput=root.querySelector('.rivo-perfect-extras'),cameraInput=root.querySelector('.rivo-perfect-camera');
 const canvas=root.querySelector('.rivo-perfectscan-preview canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
 const status=root.querySelector('.rivo-perfectscan-status');
 const tag=root.querySelector('.rivo-perfectscan-tag');
 const save=root.querySelector('[data-perfect="save"]'),process=root.querySelector('[data-perfect="process"]');
 const compare=root.querySelector('[data-perfect="compare"]');
 const actions=root.querySelector('.rivo-perfectscan-actions');
 const preview=root.querySelector('.rivo-perfectscan-preview');
 let base=null,extra=[],result=null,closed=false,working=false;
 const setStatus=(message,alert=false)=>{status.textContent=message;status.classList.toggle('rivo-warning',alert)};
 const close=()=>{if(closed)return;closed=true;root.remove()};
 const previewPixels=(rgba,w,h,label)=>{
  if(closed)return;
  preview.hidden=false;
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
  const data=ctx.createImageData(w,h);data.data.set(rgba);ctx.putImageData(data,0,0);tag.textContent=label;
 };
 const resetOutput=()=>{
  result=null;save.disabled=true;save.hidden=true;
  compare.disabled=true;compare.hidden=true;
  process.hidden=!base;process.disabled=!base;actions.hidden=!base;
 };
 async function setBase(blob,name,bytes=null,mime='image/jpeg',fromLibrary=false){
  if(!blob||blob.size>20*1024*1024)throw Error('Maximum source photo: 20 MB');
  const c=await imageCanvas(blob),image=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height);
  base={data:image.data,width:c.width,height:c.height,bytes:bytes||new Uint8Array(await blob.arrayBuffer()),
   name,mime,fromLibrary};extra=[];resetOutput();process.disabled=false;
  previewPixels(base.data,base.width,base.height,t.original);
  const captureQuality=assessDocumentQualityRGBA(base.data,base.width,base.height);
  setStatus(t.ready+(captureQuality.warnings.length?' · '+qualityLabels[lang]+': '+captureQuality.warnings.join('; '):''),captureQuality.reviewRecommended);
 }
 async function addShots(files){
  if(!base){setStatus(t.none,true);return}
  for(const file of Array.from(files).slice(0,3-extra.length)){
   if(file.size>20*1024*1024){setStatus('Photo over 20 MB',true);continue}
   try{
    const c=await imageCanvas(file,{width:base.width,height:base.height});
    const a=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height).data;
    extra.push({data:a,name:file.name,sha256:await sha256(new Uint8Array(await file.arrayBuffer()))});
   }catch(error){setStatus(error.message,true)}
  }
  resetOutput();setStatus(t.frames+': '+extra.length+' / 3');
 }
 function disableDuring(value){
  working=value;
  root.querySelectorAll('button,input').forEach(el=>{el.disabled=value;});
  if(!value){
   process.disabled=!base;process.hidden=!base||!!result;
   save.disabled=!result;save.hidden=!result;
   compare.disabled=!result;compare.hidden=!result;
   actions.hidden=!base;
  }
 }
 async function run(){
  if(!base||working)return;
  disableDuring(true);setStatus(t.working);
  // Yield to paint progress before the CPU-bound local pixel pipeline.
  await new Promise(done=>setTimeout(done,40));
  try{
   const frames=extra.map(({data})=>({data}));
   const started=performance.now();
   const method=root.querySelector('[data-perfect-mode]').value;
   const uvdocRequested=!!onUVDoc&&method==='uvdoc';
   const surface3dRequested=!!onSurface3D&&method==='surface3d';
   if(surface3dRequested&&extra.length<1)
     throw Error(({en:'Add another photo of this page from a different angle.',
       ar:'زيد صورة أخرى لنفس الورقة من زاوية مختلفة.',
       fr:'Ajoutez une autre photo de la même page sous un autre angle.'})[lang]||
       'Add another photo from a different angle.');
   const processed=perfectScanRGBA(base.data,base.width,base.height,{
    extraFrames:frames,creaseStrength:80,
    // UVDoc and a triangulated 3D surface each do their own non-rigid warp.
    geometry:method==='geometry'
   });
   processed.surface3DAttempted=surface3dRequested;
   if(surface3dRequested){
    try{
     const surface=await onSurface3D(base.data,processed.pixels,extra.map(frame=>frame.data),
       base.width,base.height);
     if(!surface?.physical3DRelative||surface.pixels?.length!==base.data.length)
       throw Error('Insufficient 3D paper surface evidence');
     processed.pixels=surface.pixels;
     processed.surface3DApplied=true;
     processed.surface3DPointCount=surface.points;
     processed.surface3DConfidence=surface.confidence;
     processed.surface3DRelativeDepthSpread=surface.relativeDepthSpread;
     processed.surface3DCameraCalibrationApproximate=surface.calibrationAssumed;
     processed.surface3DEffectiveResolution=[surface.effectiveWidth,surface.effectiveHeight];
     processed.requiresReview=true;
    }catch(error){
     // Reject instead of pretending to have flattened a 3D sheet.
     processed.surface3DRejectedReason=String(error.message||error);
    }
   }
   if(uvdocRequested){
    const neural=await onUVDoc(processed.pixels,base.width,base.height);
    if(neural?.pixels?.length!==base.data.length||!neural.modelSha256)
      throw Error('UVDoc returned invalid Android inference; uncheck UVDoc to use safe offline 2D mode');
    processed.pixels=neural.pixels;
    processed.neuralUvdocApplied=true;
    processed.neuralModelSha256=neural.modelSha256;
    processed.neuralEffectiveResolution=[neural.effectiveWidth,neural.effectiveHeight];
    processed.neuralRuntime=neural.engine;
    processed.neuralInferenceMs=neural.inferenceMs;
    processed.integrity=inspectInkChanges(base.data,neural.pixels,base.width,base.height);
    processed.requiresReview=true;
   }
   const elapsed=Math.round(performance.now()-started);
   result={...processed,sourceName:base.name,extraCount:extra.length,elapsed};
   previewPixels(processed.pixels,base.width,base.height,t.processed);
   const summary=t.frames+': '+processed.usedFrames+'/'+extra.length+
     (processed.rejectedFrames.length?' · '+t.rejected+': '+processed.rejectedFrames.length:'')+
     ' · 2D: '+(processed.geometryApplied?'yes':'no')+
     (processed.neuralUvdocApplied?' · UVDoc ONNX Android ✓':'')+
     (processed.surface3DApplied?' · relative 3D surface ✓':
        processed.surface3DRejectedReason?' · 3D abstained: '+processed.surface3DRejectedReason:'')+
     ' · '+(processed.requiresReview?t.manual:t.clean)+
     (processed.quality.warnings.length?' · '+qualityLabels[lang]+': '+processed.quality.warnings.join('; '):'')+
     ' · '+elapsed+' ms';
   setStatus(summary,processed.requiresReview||processed.rejectedFrames.length>0);
  }catch(e){result=null;setStatus(t.failed+' '+e.message,true)}
  finally{disableDuring(false)}
 }
 async function writeResult(){
  if(!base||!result||working)return;
  disableDuring(true);
  try{
   const temp=document.createElement('canvas');temp.width=base.width;temp.height=base.height;
   const c=temp.getContext('2d',{willReadFrequently:true});
   const image=c.createImageData(base.width,base.height);image.data.set(result.pixels);c.putImageData(image,0,0);
   const blob=await asJpeg(temp),out=new Uint8Array(await blob.arrayBuffer()),time=new Date().toISOString();
   const stamp=time.replace(/[-:.TZ]/g,'');
   const name='RivoScan_Scan_'+stamp+'.jpg';
   const baseHash=await sha256(base.bytes),outHash=await sha256(out);
   if(!base.fromLibrary){
    await onSave(base.bytes,'RivoScan_Original_'+stamp+'_'+safeName(base.name).replace(/\.[^.]*$/,'')+'.'+fileExt(base.mime,base.name),base.mime);
   }
   await onSave(out,name,'image/jpeg');
   let pdfName=null,pdfSha256=null;
   {
    // PDF is produced automatically with the scan; no extra checkbox.
    const pdf=await PDFDocument.create();
    const image=await pdf.embedJpg(out);
    // A document page stays proportional to the photograph, rather than
    // stretching a signature, seal or printed text into a different shape.
    const pageWidth=base.width>=base.height?842:595;
    const pageHeight=pageWidth*base.height/base.width;
    const sheet=pdf.addPage([pageWidth,pageHeight]);
    sheet.drawImage(image,{x:0,y:0,width:pageWidth,height:pageHeight});
    pdf.setTitle('RivoScan Document Scan');
    pdf.setProducer('RivoScan');
    const pdfBytes=await pdf.save();
    pdfName='RivoScan_PerfectScan_'+stamp+'.pdf';
    pdfSha256=await sha256(pdfBytes);
    await onSave(pdfBytes,pdfName,'application/pdf');
   }
   const audit={
    product:'RivoScan Document Scan',version:1,createdUTC:time,
    processing:result.surface3DApplied?
      'Native OpenCV multi-view relative 3D triangulation + neural UVDoc optional; approximate camera calibration, not metric certified depth':
      'UVDoc neural 2D unwarp and/or 2D enhancement; no 3D reconstruction; not certified forensic authenticity',
    surface3DAttempted:!!result.surface3DAttempted,
    relativeSurface3DApplied:!!result.surface3DApplied,
    relativeSurface3DConfidence:result.surface3DConfidence||null,
    relativeSurface3DPoints:result.surface3DPointCount||0,
    relativeDepthSpread:result.surface3DRelativeDepthSpread||null,
    relativeSurface3DRejectedReason:result.surface3DRejectedReason||null,
    surface3DCameraCalibrationApproximate:!!result.surface3DCameraCalibrationApproximate,
    relativeSurface3DEffectiveResolution:result.surface3DEffectiveResolution||null,
    uvdocAndroidInference:!!result.neuralUvdocApplied,
    uvdocModelSha256:result.neuralModelSha256||null,
    uvdocEffectiveModelResolution:result.neuralEffectiveResolution||null,
    uvdocRuntime:result.neuralRuntime||null,
    uvdocInferenceMs:result.neuralInferenceMs||null,
    originalName:base.name,originalSha256:baseHash,processedName:name,processedSha256:outHash,
    processedPdfName:pdfName,processedPdfSha256:pdfSha256,
    SHA256Available:!!baseHash&&!!outHash,
    extraFramesSelected:result.extraCount,extraFramesAligned:result.usedFrames,
    additionalSources:extra.map(item=>({name:item.name,sha256:item.sha256})),
    rejectedFrames:result.rejectedFrames,frameOffsets:result.alignment,
    geometry2DApplied:result.geometryApplied,geometryConfidence:result.geometryConfidence,
    inkFidelity:result.integrity,captureQuality:result.quality,
    manualReviewRecommended:result.requiresReview,
    userSavedResult:true,originalKept:true,noUploadByPerfectScan:true
   };
   await onSave(new TextEncoder().encode(JSON.stringify(audit,null,2)),'RivoScan_PerfectScan_'+stamp+'_integrity.json','application/json');
   await onRefresh();notify(t.saved);close();
  }catch(error){setStatus(error.message,true);notify(error.message,true);disableDuring(false)}
 }
 root.addEventListener('click',e=>{
  const action=e.target.closest('[data-perfect]')?.dataset.perfect;
  if(working)return;
  if(action==='close'){close();return;}
  if(action==='mlkit'&&onDeepClean){close();onDeepClean();return;}
  if(action==='base')sourceInput.click();
  else if(action==='add')extrasInput.click();
  else if(action==='camera')cameraInput.click();
  else if(action==='process')run();
  else if(action==='save')writeResult();
 });
 sourceInput.addEventListener('change',async()=>{
  const file=sourceInput.files?.[0];sourceInput.value='';if(!file)return;
  try{await setBase(file,file.name,null,file.type||'image/jpeg')}catch(e){setStatus(e.message,true)}
 });
 extrasInput.addEventListener('change',async()=>{const files=[...extrasInput.files];extrasInput.value='';await addShots(files)});
 cameraInput.addEventListener('change',async()=>{const files=[...cameraInput.files];cameraInput.value='';await addShots(files)});
 // One select ensures mutually exclusive AI/2D/3D corrections.
 root.querySelector('[data-perfect-mode]').addEventListener('change',()=>{
  resetOutput();if(base)previewPixels(base.data,base.width,base.height,t.original);
 });
 const before=()=>{if(base)previewPixels(base.data,base.width,base.height,t.original)};
 const after=()=>{if(result)previewPixels(result.pixels,base.width,base.height,t.processed)};
 compare.addEventListener('pointerdown',before);
 compare.addEventListener('pointerup',after);
 compare.addEventListener('pointercancel',after);
 compare.addEventListener('pointerleave',after);
 compare.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter')before()});
 compare.addEventListener('keyup',after);
 if(doc){
  try{
   const source=await bridge.readFile({uri:doc.uri});
   if(!source.base64)throw Error('Cannot read original photo');
   const bytes=toBytes(source.base64),mime=doc.mimeType||source.mimeType||'image/jpeg';
   await setBase(new Blob([bytes],{type:mime}),doc.name,bytes,mime,true);
  }catch(error){setStatus(error.message,true)}
 }
 return close;
}
