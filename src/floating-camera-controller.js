/**
 * RivoScan single source of truth for the floating camera button.
 * This controls only the extra FAB, NEVER the bottom Scan navigation action.
 * No per-feature CSS visibility hacks or event handlers that steal QR scans.
 */
export const CAMERA_BLOCKING_OVERLAYS=Object.freeze([
 '.rivo-live-overlay','.rivo-code-overlay','.rivo-plate-overlay',
 '.rivo-editor-overlay','.rivo-shield-overlay','.rivo-perfectscan-overlay',
 '.rivo-perfect-capture-overlay','.rivo-edge-adjust-overlay',
 '.rivo-pages-overlay','.rivo-merged-overlay','.rivo-release-overlay',
 '.bulk-overlay','.busy','[data-rivo-managed-modal="true"]',
 '[role="dialog"][aria-modal="true"]'
]);
export const CAMERA_ALLOWED_ROUTES=Object.freeze(['home','library','tools']);
export function cameraFabDecision({
 route='home',selection=false,busy=false,nativeCapture=false,modal=false,
 permission=false,external=false,bannerCollision=false,foreground=true,keyboard=false
}={}){
 if(!CAMERA_ALLOWED_ROUTES.includes(route))return {visible:false,reason:'route'};
 if(!foreground||external)return {visible:false,reason:'external-app'};
 if(keyboard)return {visible:false,reason:'keyboard'};
 if(nativeCapture||permission)return {visible:false,reason:'camera-or-permission'};
 if(busy)return {visible:false,reason:'processing'};
 if(modal)return {visible:false,reason:'modal-or-other-scanner'};
 if(selection)return {visible:false,reason:'file-selection'};
 if(bannerCollision)return {visible:false,reason:'ad-layout-collision'};
 return {visible:true,reason:'idle'};
}
function elementIsVisible(node){
 if(!node||node.hidden||node.closest('[hidden]'))return false;
 const style=getComputedStyle(node);
 return style.display!=='none'&&style.visibility!=='hidden'&&node.getClientRects().length>0;
}
function overlap(a,b){
 if(!a||!b||a.width<=0||a.height<=0||b.width<=0||b.height<=0)return false;
 return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
}
export function createFloatingCameraController({getState}={}){
 if(typeof getState!=='function')throw new TypeError('Floating camera requires application state');
 let observer=null,scheduled=false,disposed=false,lastReason='';
 const sync=()=>{
  if(disposed||typeof document==='undefined')return {visible:false,reason:'disposed'};
  const button=document.querySelector('#app .rivo-camera-fab');
  if(!button)return {visible:false,reason:'not-rendered'};
  const app=getState()||{};
  const focused=document.activeElement;
  const keyboard=!!focused&&/^(INPUT|TEXTAREA|SELECT)$/.test(focused.tagName);
  const modal=CAMERA_BLOCKING_OVERLAYS.some(selector=>
   [...document.querySelectorAll(selector)].some(elementIsVisible));
  const foreground=document.visibilityState!=='hidden';
  const prelim=cameraFabDecision({...app,modal,keyboard,foreground,bannerCollision:false});
  if(button.hidden===prelim.visible)button.hidden=!prelim.visible;
  let collision=false;
  if(prelim.visible&&document.body.classList.contains('rivo-has-ad-banner')){
   const ad=document.querySelector('#app .rivo-ad-banner-slot');
   if(ad&&elementIsVisible(ad))collision=overlap(button.getBoundingClientRect(),ad.getBoundingClientRect());
  }
  const next=cameraFabDecision({...app,modal,keyboard,foreground,bannerCollision:collision});
  if(button.hidden===next.visible)button.hidden=!next.visible;
  if(button.dataset.cameraVisibilityReason!==next.reason)button.dataset.cameraVisibilityReason=next.reason;
  lastReason=next.reason;
  return next;
 };
 const schedule=()=>{
  if(disposed||scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;sync()});
 };
 const onVisibility=()=>schedule();
 const install=()=>{
  if(disposed||observer||typeof document==='undefined'||!document.body)return;
  observer=new MutationObserver(schedule);
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','open','class']});
  document.addEventListener('visibilitychange',onVisibility);
  document.addEventListener('focusin',onVisibility);
  document.addEventListener('focusout',onVisibility);
  window.addEventListener('resize',onVisibility,{passive:true});
  window.addEventListener('rivo:banner-layout',onVisibility);
  schedule();
 };
 const dispose=()=>{
  disposed=true;observer?.disconnect();observer=null;
  document.removeEventListener('visibilitychange',onVisibility);
  document.removeEventListener('focusin',onVisibility);
  document.removeEventListener('focusout',onVisibility);
  window.removeEventListener('resize',onVisibility);
  window.removeEventListener('rivo:banner-layout',onVisibility);
 };
 return {sync,schedule,install,dispose,getReason:()=>lastReason};
}
