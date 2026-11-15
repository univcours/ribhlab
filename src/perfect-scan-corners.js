import {validEdgeQuadrilateral,perspectiveCropImageData,cornerLoupeLayout} from './edge-adjustment.js';
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const defaultCorners=()=>[[.045,.045],[.955,.045],[.955,.955],[.045,.955]];
const langs={
 en:['Adjust document edges','Drag the four corners onto the paper edges. A magnifier appears while moving.','Apply crop','Back to photo','Detect again','Please correct crossed corners','Estimated edges: review before saving','Adjust the four corners manually'],
 ar:['تعديل حواف المستند','اسحب الزوايا الأربع نحو حدود الورقة. تظهر عدسة مكبّرة أثناء التحريك.','تطبيق القص','العودة إلى الصورة','إعادة اكتشاف الحواف','يُرجى تصحيح الزوايا المتقاطعة','حواف مقدّرة تلقائيًا: راجعها قبل الحفظ','اضبط الزوايا الأربع يدويًا'],
 fr:['Ajuster les bords','Déplacez les quatre coins sur les bords; une loupe apparaît au glissement.','Appliquer','Retour à la photo','Détecter à nouveau','Corrigez les coins croisés','Bords estimés : vérifiez avant de sauvegarder','Ajustez les quatre coins'],
 es:['Ajustar bordes','Mueve las cuatro esquinas. Aparece una lupa al arrastrar.','Aplicar recorte','Volver a la foto','Detectar de nuevo','Las esquinas no deben cruzarse','Bordes estimados: revisa antes de guardar','Ajusta las cuatro esquinas'],
 de:['Dokumentränder anpassen','Ziehen Sie die vier Ecken auf den Papierrand. Beim Ziehen erscheint eine Lupe.','Zuschneiden','Zurück zum Foto','Erneut erkennen','Ecken dürfen sich nicht kreuzen','Geschätzte Ränder: vor dem Speichern prüfen','Ecken manuell anpassen'],
 pt:['Ajustar bordas','Arraste os quatro cantos. Uma lupa aparece durante o arrasto.','Aplicar corte','Voltar à foto','Detetar novamente','Os cantos não podem cruzar-se','Limites estimados: confirme antes de guardar','Ajuste os quatro cantos'],
 it:['Regola i bordi','Trascina i quattro angoli. Durante il movimento compare una lente.','Applica ritaglio','Torna alla foto','Rileva di nuovo','Gli angoli non devono incrociarsi','Bordi stimati: verifica prima di salvare','Regola manualmente gli angoli']
};
function median(v){return v.slice().sort((a,b)=>a-b)[Math.floor(v.length/2)];}
export function estimatePerfectScanCorners({data,width:w,height:h}){
 if(!data||w<80||h<80||data.length<w*h*4)return {corners:defaultCorners(),detected:false};
 const light=(x,y)=>{const i=(clamp(Math.round(y),0,h-1)*w+clamp(Math.round(x),0,w-1))*4;
  return (77*data[i]+150*data[i+1]+29*data[i+2])/256;};
 const pick=(horizontal,fixed,left)=>{
  const n=horizontal?w:h,other=horizontal?h:w,delta=Math.max(2,Math.round(n*.007));
  const from=Math.round(n*(left?.035:.55)),to=Math.round(n*(left?.45:.965));
  let score=0,pos=0;
  for(let i=from;i<to;i+=Math.max(1,Math.round(n/360))){
   const a=horizontal?light(i-delta,fixed*other):light(fixed*other,i-delta);
   const b=horizontal?light(i+delta,fixed*other):light(fixed*other,i+delta);
   const d=Math.abs(b-a);if(d>score){score=d;pos=i}
  }
  return score>28?pos/n:null;
 };
 const left=[],right=[],top=[],bottom=[];
 for(const v of [.16,.32,.48,.64,.80]){
  const a=pick(true,v,true),b=pick(true,v,false),c=pick(false,v,true),d=pick(false,v,false);
  if(a!==null)left.push(a);
  if(b!==null)right.push(b);
  if(c!==null)top.push(c);
  if(d!==null)bottom.push(d);
 }
 if([left,right,top,bottom].some(a=>a.length<3))return {corners:defaultCorners(),detected:false};
 const l=median(left),r=median(right),t=median(top),b=median(bottom);
 const corners=[[l,t],[r,t],[r,b],[l,b]];
 if(r-l<.32||b-t<.32||!validEdgeQuadrilateral(corners))return {corners:defaultCorners(),detected:false};
 return {corners,detected:true};
}
export function perfectScanCornerHit(points,p,width,height){
 const radius=Math.max(28,Math.min(55,Math.min(width,height)*.085));
 const distances=points.map(c=>Math.hypot((p[0]-c[0])*width,(p[1]-c[1])*height));
 const smallest=Math.min(...distances);return smallest<radius?distances.indexOf(smallest):-1;
}
function drawLoupe(ctx,source,corner,width,height){
 const {centerX:x,centerY:y,radius:r,zoom}=cornerLoupeLayout(width,height,corner);
 const px=corner[0]*source.width,py=corner[1]*source.height;
 const sx=r*source.width/(width*zoom),sy=r*source.height/(height*zoom);
 const x0=clamp(px-sx,0,source.width),x1=clamp(px+sx,0,source.width);
 const y0=clamp(py-sy,0,source.height),y1=clamp(py+sy,0,source.height);
 if(x1<=x0||y1<=y0)return;
 ctx.save();ctx.beginPath();ctx.arc(x,y,r+5,0,Math.PI*2);ctx.fillStyle='#052d46';ctx.fill();
 ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.clip();
 ctx.fillStyle='#fff';ctx.fillRect(x-r,y-r,r*2,r*2);
 ctx.drawImage(source,x0,y0,x1-x0,y1-y0,x+(x0-px)/sx*r,y+(y0-py)/sy*r,(x1-x0)/sx*r,(y1-y0)/sy*r);
 ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-r,y);ctx.lineTo(x+r,y);ctx.moveTo(x,y-r);ctx.lineTo(x,y+r);ctx.stroke();
 ctx.fillStyle='#0875c1';ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();ctx.restore();
 ctx.strokeStyle='#04ebd2';ctx.lineWidth=4;ctx.beginPath();ctx.arc(x,y,r+3,0,Math.PI*2);ctx.stroke();
}
/** No MediaStore or onSave calls: the user confirms BEFORE processing. */
export function openPerfectScanCornerReview({imageData,language='en',onApply=()=>{},onCancel=()=>{}}){
 const {width:w,height:h,data}=imageData||{};
 if(!w||!h||!data?.length)throw Error('Captured document pixels are required');
 const tr=langs[language]||langs.en;
 const source=document.createElement('canvas');source.width=w;source.height=h;
 source.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(data),w,h),0,0);
 const overlay=document.createElement('div');overlay.className='rivo-perfect-corners-overlay';
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.dir=language==='ar'?'rtl':'ltr';
 const panel=document.createElement('section');panel.className='rivo-perfect-corners-panel';
 const title=document.createElement('h2');title.textContent=tr[0];
 const tip=document.createElement('p');tip.textContent=tr[1];
 const detection=document.createElement('p');detection.className='rivo-perfect-corners-detection';
 const frame=document.createElement('div');frame.className='rivo-perfect-corners-frame';
 const canvas=document.createElement('canvas');canvas.className='rivo-perfect-corners-canvas';
 const ratio=Math.min(1,1200/Math.max(w,h));canvas.width=Math.max(1,Math.round(w*ratio));canvas.height=Math.max(1,Math.round(h*ratio));frame.append(canvas);
 const controls=document.createElement('footer');
 const apply=document.createElement('button');apply.type='button';apply.dataset.perfectCorner='apply';apply.textContent=tr[2];
 const cancel=document.createElement('button');cancel.type='button';cancel.dataset.perfectCorner='cancel';cancel.textContent=tr[3];
 const reset=document.createElement('button');reset.type='button';reset.dataset.perfectCorner='reset';reset.textContent=tr[4];
 controls.append(cancel,reset,apply);const status=document.createElement('p');status.className='rivo-perfect-corners-status';status.setAttribute('role','status');
 panel.append(title,tip,detection,frame,status,controls);overlay.append(panel);document.body.append(overlay);
 let current=estimatePerfectScanCorners(imageData),corners=current.corners.map(p=>p.slice()),drag=-1,busy=false,closed=false;
 const previousFocus=document.activeElement,ctx=canvas.getContext('2d');
 detection.textContent=current.detected?tr[6]:tr[7];
 const draw=()=>{
  if(closed)return;
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(source,0,0,canvas.width,canvas.height);
  ctx.beginPath();corners.forEach((p,i)=>i?ctx.lineTo(p[0]*canvas.width,p[1]*canvas.height):ctx.moveTo(p[0]*canvas.width,p[1]*canvas.height));
  ctx.closePath();ctx.fillStyle='rgba(0,200,160,.13)';ctx.fill();
  const valid=validEdgeQuadrilateral(corners);
  ctx.strokeStyle=valid?'#08e4ca':'#e45a5a';ctx.lineWidth=3;ctx.stroke();
  corners.forEach((p,i)=>{const x=p[0]*canvas.width,y=p[1]*canvas.height,r=Math.max(10,canvas.width/90);
   ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();
   ctx.strokeStyle='#0379b4';ctx.lineWidth=2;ctx.stroke();
   ctx.fillStyle='#003f6d';ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(i+1),x,y);
  });
  if(drag>=0)drawLoupe(ctx,source,corners[drag],canvas.width,canvas.height);
  apply.disabled=!valid||busy;status.textContent=valid?'':tr[5];
 };
 function end(cancelled){
  if(closed)return;closed=true;overlay.remove();document.removeEventListener('keydown',handleEscape,true);
  if(cancelled)onCancel();try{previousFocus?.focus?.()}catch{}
 }
 function handleEscape(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();end(true)}}
 document.addEventListener('keydown',handleEscape,true);
 cancel.addEventListener('click',()=>end(true));
 const position=e=>{const r=canvas.getBoundingClientRect();return [clamp((e.clientX-r.left)/r.width,0,1),clamp((e.clientY-r.top)/r.height,0,1)]};
 canvas.addEventListener('pointerdown',e=>{
  if(busy)return;const box=canvas.getBoundingClientRect();
  drag=perfectScanCornerHit(corners,position(e),box.width,box.height);
  if(drag<0)return;
  try{canvas.setPointerCapture(e.pointerId)}catch{}draw();e.preventDefault();
 });
 canvas.addEventListener('pointermove',e=>{
  if(drag<0||busy)return;corners[drag]=position(e);draw();e.preventDefault();
 });
 const release=()=>{if(drag>=0){drag=-1;draw()}};
 for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,release);
 reset.addEventListener('click',()=>{if(busy)return;current=estimatePerfectScanCorners(imageData);corners=current.corners.map(p=>p.slice());detection.textContent=current.detected?tr[6]:tr[7];draw()});
 apply.addEventListener('click',async()=>{
  if(busy||!validEdgeQuadrilateral(corners))return;busy=true;apply.disabled=true;
  await new Promise(resolve=>setTimeout(resolve,0));
  try{
   const result=perspectiveCropImageData(imageData,corners);
   await onApply({...result,corners:corners.map(p=>p.slice())});
   end(false);
  }catch(error){busy=false;draw();status.textContent=String(error?.message||error);}
 });
 draw();cancel.focus();
 return {close:()=>end(true),isOpen:()=>!closed};
}
