// Shared modal header, lifecycle-safe dismiss, keyboard and right-to-left gesture.
const labels={en:'Close',ar:'إغلاق',fr:'Fermer',es:'Cerrar',de:'Schließen',pt:'Fechar',it:'Chiudi'};
let bound=false;
export function mountDialogControls({overlay,panel,close,language='en'}={}){
 if(!overlay||!panel||typeof close!=='function')throw Error('Invalid modal');
 if(overlay.dataset.rivoManagedModal)return;
 overlay.dataset.rivoManagedModal='true';
 panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
 const top=document.createElement('header');top.className='rivo-modal-top';
 const title=panel.querySelector(':scope > h2');if(title)top.append(title);
 const x=document.createElement('button');x.type='button';x.dataset.rivoModalClose='true';x.className='rivo-modal-dismiss';
 x.setAttribute('aria-label',labels[language]||labels.en);x.textContent='×';
 const previous=document.activeElement;
 const dismiss=()=>{close();if(!overlay.isConnected&&previous?.isConnected)previous.focus?.({preventScroll:true})};
 x.addEventListener('click',dismiss);top.append(x);panel.prepend(top);
 let touch=null;
 overlay.addEventListener('touchstart',e=>{
  touch=null;if(e.touches.length!==1)return;
  const t=e.touches[0];if(t.clientX<window.innerWidth-76)return;
  if(e.target?.closest?.('button,a,input,select,textarea,label,canvas,[contenteditable],.rivo-code-actions'))return;
  touch={x:t.clientX,y:t.clientY};
 },{passive:true});
 overlay.addEventListener('touchend',e=>{
  if(!touch||e.changedTouches.length!==1){touch=null;return;}
  const t=e.changedTouches[0],dx=t.clientX-touch.x,dy=t.clientY-touch.y;touch=null;
  if(dx>-90||Math.abs(dy)>55||Math.abs(dx)<Math.abs(dy)*1.6)return;
  e.stopPropagation();dismiss();
 },{passive:true});
 overlay.addEventListener('touchcancel',()=>{touch=null},{passive:true});
 if(!bound){document.addEventListener('keydown',e=>{
  if(e.key!=='Escape'&&e.key!=='Backspace')return;
  if(e.target?.closest?.('input,textarea,select,[contenteditable]'))return;
  const list=document.querySelectorAll('[data-rivo-managed-modal]');
  const modal=list[list.length-1];if(!modal)return;
  const button=modal.querySelector('[data-rivo-modal-close]');
  if(button){e.preventDefault();e.stopPropagation();button.click();}
 });bound=true;}
}
