/** Local pointer/touch zoom. Never modifies, re-encodes or uploads a document. */
export const MIN_ZOOM=1,MAX_ZOOM=6;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function limitZoom(s,cw,ch,vw,vh){
 const scale=clamp(Number(s.scale)||1,MIN_ZOOM,MAX_ZOOM);
 const maxX=Math.max(0,(Math.max(1,cw)*scale-Math.max(1,vw))/2);
 const maxY=Math.max(0,(Math.max(1,ch)*scale-Math.max(1,vh))/2);
 return {scale,x:maxX?clamp(Number(s.x)||0,-maxX,maxX):0,y:maxY?clamp(Number(s.y)||0,-maxY,maxY):0};
}
export function createViewerZoom({viewport,stage,onChange=()=>{}}){
 if(!viewport||!stage)throw Error('Missing document zoom viewport');
 let state={scale:1,x:0,y:0},previous=null,lastTap=null,closed=false;
 const pointers=new Map();
 const coords=e=>{const b=viewport.getBoundingClientRect();return {x:e.clientX-b.left-b.width/2,y:e.clientY-b.top-b.height/2}};
 const center=()=>{const [a,b]=[...pointers.values()];return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,d:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))}};
 function apply(){
  state=limitZoom(state,stage.offsetWidth||1,stage.offsetHeight||1,viewport.clientWidth||1,viewport.clientHeight||1);
  stage.style.transform='translate3d('+state.x+'px,'+state.y+'px,0) scale('+state.scale+')';
  onChange(state.scale);
 }
 const zoomAt=(next,at={x:0,y:0})=>{
  const scale=clamp(next,MIN_ZOOM,MAX_ZOOM),ratio=scale/state.scale;
  state={scale,x:at.x-(at.x-state.x)*ratio,y:at.y-(at.y-state.y)*ratio};apply();
 };
 const down=e=>{
  if(e.button!==undefined&&e.button!==0)return;
  e.preventDefault();pointers.set(e.pointerId,coords(e));
  try{viewport.setPointerCapture(e.pointerId)}catch{}
  previous=pointers.size===2?center():[...pointers.values()][0];
 };
 const move=e=>{
  if(!pointers.has(e.pointerId))return;
  e.preventDefault();const p=coords(e);pointers.set(e.pointerId,p);
  if(pointers.size===2){
   const next=center();
   if(previous?.d){
    const scale=clamp(state.scale*next.d/previous.d,MIN_ZOOM,MAX_ZOOM),ratio=scale/state.scale;
    state={scale,x:next.x-(previous.x-state.x)*ratio,y:next.y-(previous.y-state.y)*ratio};apply();
   }
   previous=next;
  }else if(previous){
   state={...state,x:state.x+p.x-previous.x,y:state.y+p.y-previous.y};
   previous=p;apply();
  }
 };
 const up=e=>{
  const p=pointers.get(e.pointerId);pointers.delete(e.pointerId);
  try{if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId)}catch{}
  if(!pointers.size){
   previous=null;
   if(e.pointerType==='touch'&&p){
    const now=Date.now(),q=coords(e);
    if(lastTap&&now-lastTap.time<310&&Math.hypot(q.x-lastTap.x,q.y-lastTap.y)<28){
     zoomAt(state.scale>1.4?1:2.5,q);lastTap=null;
    }else lastTap={time:now,...q};
   }
  }else previous=pointers.size===2?center():[...pointers.values()][0];
 };
 const wheel=e=>{e.preventDefault();zoomAt(state.scale*(e.deltaY<0?1.18:1/1.18),coords(e))};
 const dbl=e=>{e.preventDefault();zoomAt(state.scale>1.4?1:2.5,coords(e))};
 for(const [event,listener] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['dblclick',dbl]])viewport.addEventListener(event,listener);
 viewport.addEventListener('wheel',wheel,{passive:false});viewport.style.touchAction='none';apply();
 return {
  zoomIn:()=>zoomAt(state.scale*1.5),zoomOut:()=>zoomAt(state.scale/1.5),
  reset:()=>{pointers.clear();previous=null;state={scale:1,x:0,y:0};apply()},
  destroy:()=>{if(closed)return;closed=true;for(const [event,listener] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['dblclick',dbl]])viewport.removeEventListener(event,listener);viewport.removeEventListener('wheel',wheel);viewport.style.touchAction='';pointers.clear()}
 };
}
