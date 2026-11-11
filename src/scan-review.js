/** Post-Google scan review: four editable crimson corners, real native
 * Clean/B&W/Original before-after preview, and one final PDF confirmation.
 * Google already cropped the source; lost pixels cannot be recovered here.
 */
export const defaultCorners=()=>[[.025,.025],[.975,.025],[.975,.975],[.025,.975]];
export function validateCorners(points){
 if(!Array.isArray(points)||points.length!==4)return false;
 if(!points.every(p=>Array.isArray(p)&&p.length===2&&p.every(v=>Number.isFinite(v)&&v>=0&&v<=1)))return false;
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);
 if(!points.every((p,i)=>cross(p,points[(i+1)%4],points[(i+2)%4])>.003))return false;
 const area=Math.abs(points.reduce((sum,p,i)=>sum+p[0]*points[(i+1)%4][1]-p[1]*points[(i+1)%4][0],0))/2;
 return area>.15;
}
const labels={
 en:['Review scan','Drag crimson corners if needed. Google has already cropped the page.','Original','Clean Pro','Black & white','Before','After','Cancel','Save PDF','Previous','Next','Page','Loading scan…','Processing preview…','Preview unavailable'],
 ar:['مراجعة الوثيقة','حرك الزوايا القرمزية عند الحاجة. Google سبق وقص الورقة.','الأصل','Clean Pro','أبيض وأسود','قبل','بعد','إلغاء','حفظ PDF','السابق','التالي','الصفحة','جاري التحميل…','جاري تنظيف المعاينة…','المعاينة غير متاحة'],
 fr:['Vérifier le scan','Déplacez les quatre coins cramoisis si besoin. Google a déjà recadré la page.','Original','Clean Pro','Noir et blanc','Avant','Après','Annuler','Enregistrer PDF','Précédent','Suivant','Page','Chargement…','Nettoyage…','Aperçu indisponible'],
 es:['Revisar escaneo','Ajuste las cuatro esquinas carmesí. Google ya recortó la página.','Original','Clean Pro','Blanco y negro','Antes','Después','Cancelar','Guardar PDF','Anterior','Siguiente','Página','Cargando…','Procesando…','Vista no disponible'],
 de:['Scan prüfen','Bei Bedarf die vier karminroten Ecken ziehen. Google hat die Seite schon zugeschnitten.','Original','Clean Pro','Schwarzweiß','Vorher','Nachher','Abbrechen','PDF speichern','Zurück','Weiter','Seite','Laden…','Verarbeitung…','Vorschau nicht verfügbar'],
 pt:['Rever digitalização','Arraste os quatro cantos carmesim. O Google já recortou a página.','Original','Clean Pro','Preto e branco','Antes','Depois','Cancelar','Guardar PDF','Anterior','Seguinte','Página','A carregar…','A tratar…','Pré-visualização indisponível'],
 it:['Controlla scansione','Sposta i quattro angoli cremisi. Google ha già ritagliato la pagina.','Originale','Clean Pro','Bianco e nero','Prima','Dopo','Annulla','Salva PDF','Indietro','Avanti','Pagina','Caricamento…','Elaborazione…','Anteprima non disponibile']
};
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function openMlKitReview({images,readImage,bridge,language='en',initialMode='clean'}={}){
 if(!Array.isArray(images)||!images.length)return Promise.resolve({mode:'original',edits:[]});
 const t=labels[language]||labels.en;
 return new Promise(resolve=>{
  const overlay=document.createElement('section');
  overlay.className='rivo-mlkit-review';overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',t[0]);
  overlay.innerHTML='<div class="rivo-review-header"><strong>'+escape(t[0])+'</strong><span data-review-count></span></div>'+
   '<p class="rivo-review-hint">'+escape(t[1])+'</p>'+
   '<div class="rivo-review-frame-wrap"><div class="rivo-review-frame">'+
   '<img data-review-original alt="" draggable="false"><img data-review-after alt="" hidden draggable="false">'+
   '<svg class="rivo-review-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polygon data-review-polygon></polygon></svg>'+
   [0,1,2,3].map(i=>'<button type="button" class="rivo-review-corner" data-review-corner="'+i+'" aria-label="Adjust corner '+(i+1)+'"></button>').join('')+
   '</div></div><div class="rivo-review-status" role="status" aria-live="polite"></div>'+
   '<div class="rivo-review-controls">'+
     '<div class="rivo-review-modes" role="group" aria-label="Scan quality">'+
       [['original',t[2]],['clean',t[3]],['bw',t[4]]].map(x=>'<button type="button" data-review-mode="'+x[0]+'">'+escape(x[1])+'</button>').join('')+
     '</div><button type="button" class="rivo-review-compare" data-review-compare>'+escape(t[5])+'</button>'+
     '<div class="rivo-review-nav"><button type="button" data-review-prev>'+escape(t[9])+'</button><button type="button" data-review-next>'+escape(t[10])+'</button></div>'+
     '<div class="rivo-review-actions"><button type="button" data-review-cancel>'+escape(t[7])+'</button>'+
      '<button type="button" data-review-save>'+escape(t[8])+'</button></div>'+
   '</div>';
  document.body.appendChild(overlay);document.body.classList.add('rivo-review-open');
  const frame=overlay.querySelector('.rivo-review-frame');
  const original=overlay.querySelector('[data-review-original]');
  const enhanced=overlay.querySelector('[data-review-after]');
  const status=overlay.querySelector('.rivo-review-status');
  const save=overlay.querySelector('[data-review-save]');
  const polygon=overlay.querySelector('[data-review-polygon]');
  const prev=overlay.querySelector('[data-review-prev]');
  const next=overlay.querySelector('[data-review-next]');
  const compare=overlay.querySelector('[data-review-compare]');
  const quads=images.map(()=>defaultCorners()),adjusted=images.map(()=>false);
  let index=0,mode=['clean','bw','original'].includes(initialMode)?initialMode:'clean';
  let before=false,closed=false,loading=false,objectUrl=null,loadId=0,previewId=0,dragging=-1;
  const payload=()=>adjusted[index]?quads[index].flat():null;
  const release=()=>{if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=null};
  const finish=value=>{
   if(closed)return;closed=true;window.removeEventListener('keydown',handleKey);
   window.removeEventListener('resize',resizeImage);release();overlay.remove();
   document.body.classList.remove('rivo-review-open');resolve(value);
  };
  const handleKey=e=>{if(e.key==='Escape'){e.preventDefault();finish(null)}};
  window.addEventListener('keydown',handleKey);
  function placeCorners(){
   polygon.setAttribute('points',quads[index].map(p=>p[0]*100+','+p[1]*100).join(' '));
   overlay.querySelectorAll('[data-review-corner]').forEach((el,i)=>{
    el.style.left=quads[index][i][0]*100+'%';
    el.style.top=quads[index][i][1]*100+'%';
   });
  }
  function resizeImage(){
   if(!original.naturalWidth||!original.naturalHeight)return;
   const maxW=Math.max(210,Math.min(window.innerWidth-28,640));
   const maxH=Math.max(230,Math.min(window.innerHeight*.48,650));
   const scale=Math.min(maxW/original.naturalWidth,maxH/original.naturalHeight);
   frame.style.width=Math.round(original.naturalWidth*scale)+'px';
   frame.style.height=Math.round(original.naturalHeight*scale)+'px';placeCorners();
  }
  window.addEventListener('resize',resizeImage);
  function showMode(){
   overlay.querySelectorAll('[data-review-mode]').forEach(btn=>{
    const active=btn.dataset.reviewMode===mode;
    btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));
   });
   compare.textContent=before?t[6]:t[5];
  }
  async function preview(){
   const generation=++previewId,uri=images[index];
   if(before||(mode==='original'&&!adjusted[index])){
    original.hidden=false;enhanced.hidden=true;status.textContent='';return;
   }
   status.textContent=t[13];original.hidden=false;enhanced.hidden=true;
   try{
    const result=await bridge.previewCleanScan({uri,cleanMode:mode,quad:payload()});
    if(closed||generation!==previewId)return;
    if(!result?.base64||!(/^[A-Za-z0-9+/=]+$/.test(result.base64)))throw Error('Invalid preview');
    enhanced.src='data:image/jpeg;base64,'+result.base64;
    enhanced.hidden=false;original.hidden=true;status.textContent='';
   }catch(error){
    if(closed||generation!==previewId)return;
    status.textContent=t[14];console.warn('PerfectClean preview:',error);
   }
  }
  async function openPage(page){
   if(closed)return;const id=++loadId;previewId++;loading=true;save.disabled=true;
   index=page;status.textContent=t[12];original.hidden=false;enhanced.hidden=true;
   release();
   overlay.querySelector('[data-review-count]').textContent=t[11]+' '+(index+1)+' / '+images.length;
   prev.disabled=index===0;next.disabled=index===images.length-1;placeCorners();showMode();
   try{
    const file=await readImage(images[index],index);
    if(closed||id!==loadId)return;
    objectUrl=URL.createObjectURL(file);
    await new Promise((ok,fail)=>{
     original.onload=ok;original.onerror=()=>fail(Error('Cannot load Google page'));
     original.src=objectUrl;
    });
    if(closed||id!==loadId)return;
    loading=false;save.disabled=false;resizeImage();status.textContent='';
    await preview();
   }catch(error){
    if(closed||id!==loadId)return;
    loading=false;save.disabled=false;status.textContent=t[14];console.warn(error);
   }
  }
  overlay.querySelectorAll('[data-review-corner]').forEach(button=>{
   button.addEventListener('pointerdown',e=>{
    if(loading)return;dragging=Number(button.dataset.reviewCorner);
    button.setPointerCapture(e.pointerId);before=true;showMode();void preview();e.preventDefault();
   });
   button.addEventListener('pointermove',e=>{
    if(dragging!==Number(button.dataset.reviewCorner))return;
    const r=frame.getBoundingClientRect();
    const x=Math.max(.003,Math.min(.997,(e.clientX-r.left)/r.width));
    const y=Math.max(.003,Math.min(.997,(e.clientY-r.top)/r.height));
    const proposal=quads[index].map(p=>p.slice());
    proposal[dragging]=[x,y];
    if(validateCorners(proposal)){quads[index]=proposal;adjusted[index]=true;placeCorners()}
   });
   const end=()=>{if(dragging===Number(button.dataset.reviewCorner)){
    dragging=-1;before=false;showMode();void preview();
   }};
   button.addEventListener('pointerup',end);button.addEventListener('pointercancel',end);
  });
  overlay.querySelectorAll('[data-review-mode]').forEach(button=>button.addEventListener('click',()=>{
   mode=button.dataset.reviewMode;before=false;showMode();void preview();
  }));
  compare.addEventListener('click',()=>{before=!before;showMode();void preview()});
  prev.addEventListener('click',()=>{if(index>0)void openPage(index-1)});
  next.addEventListener('click',()=>{if(index<images.length-1)void openPage(index+1)});
  overlay.querySelector('[data-review-cancel]').addEventListener('click',()=>finish(null));
  save.addEventListener('click',()=>{
   if(loading)return;
   const edits=quads.map((p,i)=>adjusted[i]?p.flat():null);
   finish({mode,edits});
  });
  showMode();void openPage(0);
 });
}
