/**
 * PerfectScan Pro's OWN post-capture document review.
 * This runs only AFTER a photo has been taken, BEFORE PerfectScan processing or saving.
 * It does not change the independent "Readjust edges" button on saved documents.
 */
import {perspectiveCropImageData,validEdgeQuadrilateral,cornerLoupeLayout,paddedEdgeCanvas,paddedEdgePoint} from './edge-adjustment.js';
const clip=(v,a,b)=>Math.min(b,Math.max(a,v));
const defaultCorners=()=>[[.07,.07],[.93,.07],[.93,.93],[.07,.93]];
const textByLang={
 en:{title:'Review document edges',description:'Move each corner before processing or saving.',found:'Document boundaries detected. You can adjust all four corners.',missing:'No reliable edge detection. Select the corners manually or keep the full photo.',manual:'Adjust corners',reset:'Detect again',original:'Keep full photo',continue:'Continue',cancel:'Cancel',saving:'Preparing crop…',invalid:'Move the corners to the four document edges.',failure:'Cannot prepare document photo.'},
 ar:{title:'مراجعة حواف المستند',description:'حرّك الزوايا الأربع قبل معالجة الصورة أو حفظها.',found:'تم تحديد حدود المستند تلقائيًا. يمكنك تعديل الزوايا الأربع.',missing:'تعذّر تحديد الحواف بدقة. حدّدها يدويًا أو احتفظ بالصورة كاملة.',manual:'ضبط الحواف يدويًا',reset:'إعادة الكشف',original:'الاحتفاظ بالصورة كاملة',continue:'متابعة',cancel:'إلغاء',saving:'جارٍ تجهيز القص…',invalid:'ضع الزوايا الأربع على حدود المستند.',failure:'تعذّر تجهيز صورة المستند.'},
 fr:{title:'Vérifier les bords',description:'Déplacez les quatre coins avant le traitement ou la sauvegarde.',found:'Bords détectés. Vous pouvez déplacer les quatre coins.',missing:'Contours incertains : ajustez manuellement ou conservez la photo entière.',manual:'Ajuster les coins',reset:'Détection auto',original:'Photo entière',continue:'Continuer',cancel:'Annuler',saving:'Recadrage…',invalid:'Placez les coins sur les bords.',failure:'Impossible de préparer la photo.'},
 es:{title:'Revisar bordes',description:'Ajusta las cuatro esquinas antes de procesar o guardar.',found:'Bordes detectados. Puedes ajustarlos.',missing:'Bordes inciertos. Ajusta manualmente o conserva la foto.',manual:'Ajustar esquinas',reset:'Detectar de nuevo',original:'Foto completa',continue:'Continuar',cancel:'Cancelar',saving:'Recortando…',invalid:'Coloca las esquinas en los bordes.',failure:'No se pudo preparar la foto.'},
 de:{title:'Dokumentränder prüfen',description:'Vor Verarbeitung oder Speichern alle vier Ecken verschieben.',found:'Ränder erkannt. Sie können die Ecken anpassen.',missing:'Kanten unsicher. Manuell anpassen oder vollständiges Foto behalten.',manual:'Ecken anpassen',reset:'Erneut erkennen',original:'Ganzes Foto',continue:'Weiter',cancel:'Abbrechen',saving:'Zuschneiden…',invalid:'Ecken auf die Dokumentränder setzen.',failure:'Foto konnte nicht vorbereitet werden.'},
 pt:{title:'Rever limites',description:'Mova os quatro cantos antes de processar ou guardar.',found:'Limites detetados. Pode ajustar os cantos.',missing:'Limites incertos. Ajuste manualmente ou mantenha a foto completa.',manual:'Ajustar cantos',reset:'Detetar novamente',original:'Foto completa',continue:'Continuar',cancel:'Cancelar',saving:'A recortar…',invalid:'Posicione os cantos nos limites.',failure:'Falha na preparação da foto.'},
 it:{title:'Controlla i bordi',description:'Sposta i quattro angoli prima di elaborare o salvare.',found:'Bordi rilevati. Puoi regolare gli angoli.',missing:'Bordi incerti. Regola manualmente o conserva la foto intera.',manual:'Regola angoli',reset:'Rileva ancora',original:'Foto intera',continue:'Continua',cancel:'Annulla',saving:'Ritaglio…',invalid:'Posiziona gli angoli sui bordi.',failure:'Impossibile preparare la foto.'}
};

/** Conservative bright-paper segmentation from the captured photo.
 * Confidence is deliberately conservative. On ambiguous images, return
 * null and require manual choice rather than claiming an arbitrary rectangle.
 * Pixels are sampled at low resolution and never uploaded.
 */
export function detectCaptureCorners(image){
 const {width:w,height:h,data}=image||{};
 if(!Number.isFinite(w)||!Number.isFinite(h)||w<80||h<80||!data||data.length<w*h*4)return null;
 const ratio=Math.min(1,240/Math.max(w,h));
 const sw=Math.max(32,Math.round(w*ratio)),sh=Math.max(32,Math.round(h*ratio));
 const size=sw*sh,luma=new Uint8Array(size),samples=[];
 for(let y=0;y<sh;y++){
  const sy=Math.min(h-1,Math.floor((y+.5)*h/sh));
  for(let x=0;x<sw;x++){
   const sx=Math.min(w-1,Math.floor((x+.5)*w/sw)),i=(sy*w+sx)*4;
   const brightness=Math.round(.2126*data[i]+.7152*data[i+1]+.0722*data[i+2]);
   luma[y*sw+x]=brightness;
   if(x<sw*.08||x>sw*.92||y<sh*.08||y>sh*.92)samples.push(brightness);
  }
 }
 if(samples.length<50)return null;
 samples.sort((a,b)=>a-b);
 const bg=samples[Math.floor(samples.length/2)];
 const sorted=Array.from(luma).sort((a,b)=>a-b),p90=sorted[Math.floor(sorted.length*.9)];
 const contrast=p90-bg;
 if(contrast<37)return null;
 const cutoff=clip(bg+Math.max(21,contrast*.40),45,245);
 const mask=new Uint8Array(size);
 for(let i=0;i<size;i++)mask[i]=luma[i]>cutoff?1:0;
 const seen=new Uint8Array(size),queue=new Int32Array(size);
 let winner=null,largest=0;
 const dirs=[-1,1,-sw,sw];
 for(let y=1;y<sh-1;y++)for(let x=1;x<sw-1;x++){
  const start=y*sw+x;if(!mask[start]||seen[start])continue;
  seen[start]=1;queue[0]=start;let head=0,tail=1;
  let tl=[Infinity,null],tr=[-Infinity,null],br=[-Infinity,null],bl=[Infinity,null];
  let touches=0;
  while(head<tail){
   const idx=queue[head++],cy=Math.floor(idx/sw),cx=idx%sw;
   const sum=cx+cy,diff=cx-cy;
   if(sum<tl[0])tl=[sum,idx];
   if(diff>tr[0])tr=[diff,idx];
   if(sum>br[0])br=[sum,idx];
   if(diff<bl[0])bl=[diff,idx];
   if(cx<2||cx>=sw-2||cy<2||cy>=sh-2)touches++;
   for(const delta of dirs){
    const next=idx+delta;
    if(next<0||next>=size||seen[next]||!mask[next])continue;
    if((delta===-1&&cx===0)||(delta===1&&cx===sw-1))continue;
    seen[next]=1;queue[tail++]=next;
   }
  }
  if(tail>largest){winner={indices:[tl[1],tr[1],br[1],bl[1]],area:tail,touches};largest=tail;}
 }
 if(!winner||winner.area<size*.12||winner.area>size*.86||winner.touches>size*.022)return null;
 const points=winner.indices.map(idx=>[(idx%sw+.5)/sw,(Math.floor(idx/sw)+.5)/sh]);
 if(!validEdgeQuadrilateral(points))return null;
 const shapeArea=Math.abs(points.reduce((a,p,i)=>a+p[0]*points[(i+1)%4][1]-points[(i+1)%4][0]*p[1],0))/2;
 if(shapeArea<.12||shapeArea>.93)return null;
 return {points,confidence:Math.round(clip((contrast-20)/120,0,1)*100)/100,source:'light-paper'};
}
/** Returns {file,original,detected,cropped,corners}|null when cancelled.
 * The original captured photo remains unchanged and is separately saved
 * by PerfectScan's normal original-preservation path on final Save.
 */
export async function reviewPerfectScanCapture(file,{language='en'}={}){
 if(!(file instanceof Blob)||!/^image\//i.test(file.type))throw Error('Choose a document image.');
 if(file.size>20*1024*1024)throw Error('Document image exceeds 20 MB.');
 const tr=textByLang[language]||textByLang.en;
 let sourceURL=URL.createObjectURL(file),overlay=null;
 try{
  const img=new Image();img.src=sourceURL;await img.decode();
  const factor=Math.min(1,2400/Math.max(img.naturalWidth,img.naturalHeight),Math.sqrt(3800000/(img.naturalWidth*img.naturalHeight)));
  const source=document.createElement('canvas');
  source.width=Math.max(1,Math.round(img.naturalWidth*factor));
  source.height=Math.max(1,Math.round(img.naturalHeight*factor));
  const sourceContext=source.getContext('2d',{willReadFrequently:true});
  sourceContext.fillStyle='#fff';sourceContext.fillRect(0,0,source.width,source.height);
  sourceContext.drawImage(img,0,0,source.width,source.height);
  const pixels=sourceContext.getImageData(0,0,source.width,source.height);
  const detected=detectCaptureCorners(pixels),copyCorners=x=>x?.map(p=>p.slice())||null;
  let corners=copyCorners(detected?.points),selected=-1,busy=false,closed=false;
  overlay=document.createElement('div');overlay.className='rivo-perfect-capture-overlay';
  overlay.dir=language==='ar'?'rtl':'ltr';
  overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',tr.title);
  overlay.innerHTML='<section class="rivo-perfect-capture-panel"><header><strong>'+tr.title+'</strong><button data-capture-action="cancel" type="button" aria-label="'+tr.cancel+'">✕</button></header>'+
   '<p class="rivo-perfect-capture-hint">'+tr.description+'</p>'+
   '<div class="rivo-perfect-capture-stage"><canvas class="rivo-perfect-capture-canvas" aria-label="'+tr.description+'"></canvas></div>'+
   '<small class="rivo-perfect-capture-message" role="status"></small>'+
   '<nav class="rivo-perfect-capture-controls"><button type="button" data-capture-action="manual">'+tr.manual+'</button><button type="button" data-capture-action="reset">'+tr.reset+'</button><button type="button" data-capture-action="original">'+tr.original+'</button></nav>'+
   '<footer><button type="button" data-capture-action="cancel">'+tr.cancel+'</button><button type="button" data-capture-action="continue">'+tr.continue+'</button></footer></section>';
  document.body.appendChild(overlay);
  const canvas=overlay.querySelector('.rivo-perfect-capture-canvas'),status=overlay.querySelector('.rivo-perfect-capture-message');
  const submit=overlay.querySelector('[data-capture-action="continue"]');
  const init=Math.min(1,1250/Math.max(source.width,source.height));
  const frame=paddedEdgeCanvas(Math.max(1,Math.round(source.width*init)),
    Math.max(1,Math.round(source.height*init)));
  canvas.width=frame.canvasWidth;canvas.height=frame.canvasHeight;
  const context=canvas.getContext('2d');
  function paint(){
   context.fillStyle='#071f34';context.fillRect(0,0,canvas.width,canvas.height);
   context.drawImage(source,frame.x,frame.y,frame.width,frame.height);
   if(corners){
    context.save();
    context.strokeStyle=validEdgeQuadrilateral(corners)?'#00ead8':'#ee7777';
    context.fillStyle='rgba(9,173,200,.13)';
    context.lineWidth=Math.max(2,canvas.width/360);
    context.beginPath();
    corners.forEach((p,i)=>{const [x,y]=paddedEdgePoint(frame,p);
     if(!i)context.moveTo(x,y);else context.lineTo(x,y)});
    context.closePath();context.fill();context.stroke();
    corners.forEach((p,i)=>{
     const [x,y]=paddedEdgePoint(frame,p);
     context.beginPath();context.arc(x,y,Math.max(9,canvas.width/100),0,Math.PI*2);
     context.fillStyle='#fff';context.fill();context.strokeStyle='#0086c9';context.lineWidth=2;context.stroke();
    });
    context.restore();
   }
   if(selected>=0&&corners)drawLoupe(corners[selected]);
   const valid=!corners||validEdgeQuadrilateral(corners);
   submit.disabled=busy||!valid;
   status.textContent=!valid?tr.invalid:(detected?tr.found:tr.missing);
  }
  function drawLoupe(p){
   const touch=paddedEdgePoint(frame,p);
   const {radius,centerX:cx,centerY:cy,zoom}=cornerLoupeLayout(canvas.width,canvas.height,
     [touch[0]/canvas.width,touch[1]/canvas.height]);
   const x=p[0]*source.width,y=p[1]*source.height;
   const rx=radius*source.width/frame.width/zoom,ry=radius*source.height/frame.height/zoom;
   const sx0=clip(x-rx,0,source.width),sy0=clip(y-ry,0,source.height);
   const sx1=clip(x+rx,0,source.width),sy1=clip(y+ry,0,source.height);
   if(sx1<=sx0||sy1<=sy0)return;
   context.save();context.beginPath();context.arc(cx,cy,radius,0,2*Math.PI);context.clip();
   context.fillStyle='#ebf5ff';context.fillRect(cx-radius,cy-radius,2*radius,2*radius);
   context.drawImage(source,sx0,sy0,sx1-sx0,sy1-sy0,
    cx+(sx0-x)/rx*radius,cy+(sy0-y)/ry*radius,(sx1-sx0)/rx*radius,(sy1-sy0)/ry*radius);
   context.strokeStyle='white';context.lineWidth=1.5;context.beginPath();
   context.moveTo(cx-radius,cy);context.lineTo(cx+radius,cy);
   context.moveTo(cx,cy-radius);context.lineTo(cx,cy+radius);context.stroke();
   context.beginPath();context.arc(cx,cy,4,0,2*Math.PI);context.fillStyle='#07b8c2';context.fill();
   context.restore();
   context.beginPath();context.arc(cx,cy,radius+3,0,2*Math.PI);
   context.lineWidth=5;context.strokeStyle='#00e3cc';context.stroke();
   context.beginPath();context.arc(cx,cy,radius+7,0,2*Math.PI);
   context.lineWidth=2;context.strokeStyle='#fff';context.stroke();
  }
  function point(e){
   const b=canvas.getBoundingClientRect();
   const x=(e.clientX-b.left)*canvas.width/b.width,y=(e.clientY-b.top)*canvas.height/b.height;
   return [clip((x-frame.x)/frame.width,0,1),clip((y-frame.y)/frame.height,0,1)];
  }
  canvas.addEventListener('pointerdown',e=>{
   if(!corners||busy)return;
   const p=point(e),box=canvas.getBoundingClientRect();
   const scaleX=frame.width*box.width/canvas.width,scaleY=frame.height*box.height/canvas.height;
   const distances=corners.map(q=>Math.hypot((p[0]-q[0])*scaleX,(p[1]-q[1])*scaleY));
   const min=Math.min(...distances);
   if(min>Math.max(32,scaleX*.12))return;
   selected=distances.indexOf(min);
   try{canvas.setPointerCapture(e.pointerId)}catch{}
   paint();e.preventDefault();
  });
  canvas.addEventListener('pointermove',e=>{
   if(selected<0||busy||!corners)return;
   corners[selected]=point(e).map(v=>clip(v,.001,.999));paint();e.preventDefault();
  });
  for(const action of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(action,()=>{
   if(selected>=0){selected=-1;paint()}
  });
  paint();
  return await new Promise(resolve=>{
   const onKey=e=>{if(e.key==='Escape'){e.stopPropagation();e.preventDefault();finish(null)}};
   document.addEventListener('keydown',onKey,true);
   function finish(result){
    if(closed)return;
    closed=true;document.removeEventListener('keydown',onKey,true);
    overlay.remove();resolve(result);
   }
   overlay.addEventListener('click',async e=>{
    const button=e.target.closest('[data-capture-action]');if(!button||busy)return;
    const action=button.dataset.captureAction;
    if(action==='cancel'){finish(null);return}
    if(action==='manual'){corners=corners||defaultCorners();selected=-1;paint();return}
    if(action==='reset'){corners=copyCorners(detected?.points);selected=-1;paint();return}
    if(action==='original'){corners=null;selected=-1;paint();return}
    if(action==='continue'){
     if(corners&&!validEdgeQuadrilateral(corners)){status.textContent=tr.invalid;return}
     busy=true;submit.disabled=true;status.textContent=tr.saving;
     try{
      if(!corners){finish({file,original:file,detected:Boolean(detected),cropped:false,corners:null});return}
      const cropped=perspectiveCropImageData(pixels,corners);
      const result=document.createElement('canvas');result.width=cropped.width;result.height=cropped.height;
      result.getContext('2d').putImageData(new ImageData(cropped.data,cropped.width,cropped.height),0,0);
      const blob=await new Promise((res,rej)=>result.toBlob(value=>value?res(value):rej(Error('Image encoding failed')),'image/jpeg',.94));
      const name=String(file.name||'Document').replace(/\.[^.]+$/,'')+'_Reviewed.jpg';
      const adjusted=new File([blob],name,{type:'image/jpeg',lastModified:Date.now()});
      finish({file:adjusted,original:file,detected:Boolean(detected),cropped:true,corners:copyCorners(corners)});
     }catch(error){busy=false;paint();status.textContent=tr.failure+' '+String(error?.message||error)}
    }
   });
  });
 }finally{URL.revokeObjectURL(sourceURL);}
}
