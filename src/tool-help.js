/* Accessible RivoScan tool explanations – informative text only.
 * Preserve all original text; it is shown through a conventional (i) button.
 * The data owner can still read essential processing/format warnings on demand.
 */
const HELP_SELECTOR=[
 '#app .workspace:not(.library-workspace) .work-title p',
 '#app .workspace .hint',
 '#app .workspace .dropzone > span',
 '#app .workspace .privacy',
 '.rivo-merged-dialog > p',
 '.rivo-shield-head small',
 '.rivo-shield-hint',
 '.rivo-shield-note',
 '.rivo-perfectscan-modal header small',
 '.rivo-code-dialog .rivo-code-help',
 '.rivo-id-dialog p.rivo-id-hint',
 '.rivo-editor-tip'
].join(',');
const WORDS={
 en:'Information',ar:'معلومات',fr:'Informations',es:'Información',
 de:'Informationen',pt:'Informações',it:'Informazioni'
};
let initialized=false,observer=null,scheduled=false,active=null,dialog=null,sequence=0;
function words(){return WORDS[document.documentElement.lang]||WORDS.en;}
function closeInfo(){
 if(active)active.setAttribute('aria-expanded','false');
 active=null;
 dialog?.remove();dialog=null;
}
function placeInfo(trigger){
 if(!dialog)return;
 const rect=trigger.getBoundingClientRect();
 const viewW=document.documentElement.clientWidth,viewH=window.innerHeight;
 const w=Math.min(310,Math.max(220,viewW-24));
 const x=Math.max(12,Math.min(viewW-w-12,rect.left-8));
 dialog.style.width=w+'px';
 dialog.style.left=x+'px';
 const desired=Math.max(12,rect.bottom+6),spaceDown=viewH-desired;
 const y=spaceDown>=125?desired:Math.max(12,rect.top-Math.min(180,viewH*.4)-7);
 dialog.style.top=y+'px';
 dialog.style.maxHeight=Math.max(90,Math.min(220,viewH-y-16))+'px';
}
function openInfo(trigger,source){
 if(active===trigger){closeInfo();return;}
 closeInfo();active=trigger;
 trigger.setAttribute('aria-expanded','true');
 dialog=document.createElement('aside');
 dialog.id=trigger.getAttribute('aria-controls');
 dialog.className='rivo-tool-help-popover';
 dialog.setAttribute('role','note');
 dialog.setAttribute('aria-label',words());
 dialog.textContent=source.textContent.trim();
 document.body.append(dialog);
 placeInfo(trigger);
}
function enhance(){
 for(const node of document.querySelectorAll(HELP_SELECTOR)){
  if(node.dataset.rivoHelpApplied)continue;
  if(node.closest('.rivo-tool-help-popover,.rivo-tool-help-trigger'))continue;
  if(node.querySelector('button,a,input,textarea,select,canvas,video'))continue;
  const message=node.textContent.trim();
  if(message.length<21)continue;
  // Dynamic status messages need to stay visible and must never be collapsed.
  if(node.matches('[role="status"],[role="alert"],[aria-live]'))continue;
  node.dataset.rivoHelpApplied='yes';
  node.classList.add('rivo-tool-help-source');
  node.hidden=true;
  const button=document.createElement('button');
  button.type='button';
  button.className='rivo-tool-help-trigger';
  button.textContent='ⓘ';
  const id='rivo-help-'+(++sequence);
  button.title=words();
  button.setAttribute('aria-label',words()+': '+message.slice(0,90));
  button.setAttribute('aria-expanded','false');
  button.setAttribute('aria-controls',id);
  node.after(button);
  button.addEventListener('click',()=>openInfo(button,node));
 }
 if(active&&!document.contains(active))closeInfo();
}
export function refreshToolHelp(){
 if(scheduled)return;
 scheduled=true;
 queueMicrotask(()=>{
  scheduled=false;
  if(document.body)enhance();
 });
}
export function installToolHelp(){
 if(initialized)return;
 if(!document.body){document.addEventListener('DOMContentLoaded',installToolHelp,{once:true});return;}
 initialized=true;
 observer=new MutationObserver(records=>{
  if(records.some(record=>[...record.addedNodes].some(node=>node.nodeType===1&&!node.classList?.contains('rivo-tool-help-popover'))))
   refreshToolHelp();
 });
 observer.observe(document.body,{childList:true,subtree:true});
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&active){closeInfo();event.stopPropagation();}
 });
 document.addEventListener('pointerdown',event=>{
  if(active&&!dialog?.contains(event.target)&&!event.target.closest?.('.rivo-tool-help-trigger'))closeInfo();
 },true);
 window.addEventListener('resize',()=>{if(active)placeInfo(active)},{passive:true});
 refreshToolHelp();
}
