/* One conventional (i) per Tool section / modal, with ALL original help
 * copy still available. Grouping avoids clutter from repeated help circles.
 */
const HELP_SELECTOR=[
 '#app .workspace:not(.library-workspace) .work-title p',
 '#app .workspace .page-heading p',
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
const WORDS={en:'Information',ar:'معلومات',fr:'Informations',
 es:'Información',de:'Informationen',pt:'Informações',it:'Informazioni'};
let initialized=false,observer,scheduled=false,active=null,dialog=null,sequence=0;
const groups=new WeakMap();
function word(){return WORDS[document.documentElement.lang]||WORDS.en;}
function groupFor(node){
 return node.closest('.rivo-shield-dialog,.rivo-perfectscan-modal,.rivo-id-dialog,.rivo-code-dialog,.rivo-merged-dialog,.rivo-editor-window')
 ||node.closest('.rivo-peer-workspace')
 ||node.closest('#app .workspace .panel')
 ||node.closest('#app .workspace .work-title')
 ||node.parentElement;
}
function closeInfo(){
 if(active)active.setAttribute('aria-expanded','false');
 active=null;dialog?.remove();dialog=null;
}
function placeInfo(trigger){
 if(!dialog)return;
 const r=trigger.getBoundingClientRect(),vw=document.documentElement.clientWidth,vh=innerHeight;
 const width=Math.min(315,Math.max(220,vw-24));
 const left=Math.max(12,Math.min(vw-width-12,r.left-8));
 const down=r.bottom+6,top=vh-down>=132?down:Math.max(12,r.top-Math.min(205,vh*.42)-8);
 Object.assign(dialog.style,{left:left+'px',top:top+'px',width:width+'px',maxHeight:Math.max(94,Math.min(260,vh-top-16))+'px'});
}
function openInfo(button,section){
 if(active===button){closeInfo();return;}
 closeInfo();active=button;button.setAttribute('aria-expanded','true');
 dialog=document.createElement('aside');
 dialog.id=button.getAttribute('aria-controls');
 dialog.className='rivo-tool-help-popover';
 dialog.setAttribute('role','note');
 dialog.setAttribute('aria-label',word());
 dialog.textContent=section.sources.map(x=>x.textContent.trim()).filter(Boolean).join('\n\n');
 document.body.append(dialog);placeInfo(button);
}
function addTrigger(group){
 const button=document.createElement('button');
 button.className='rivo-tool-help-trigger';button.type='button';button.textContent='i';button.title=word();
 // SVG itself paints a geometrically perfect circle even if an older modal
 // button rule stretches the outer hit target on Android WebView.
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('viewBox','0 0 36 36');
 svg.setAttribute('width','32');svg.setAttribute('height','32');
 svg.setAttribute('preserveAspectRatio','xMidYMid meet');
 svg.setAttribute('focusable','false');svg.setAttribute('aria-hidden','true');
 svg.classList.add('rivo-help-circle-svg');
 const ring=document.createElementNS('http://www.w3.org/2000/svg','circle');
 for(const [key,value] of Object.entries({cx:'18',cy:'18',r:'15.5',fill:'#e7f4ff',stroke:'#1170c6','stroke-width':'1.8'}))
  ring.setAttribute(key,value);
 const dot=document.createElementNS('http://www.w3.org/2000/svg','circle');
 for(const [key,value] of Object.entries({cx:'18',cy:'11.3',r:'2.1',fill:'#1170c6'}))
  dot.setAttribute(key,value);
 const stem=document.createElementNS('http://www.w3.org/2000/svg','path');
 for(const [key,value] of Object.entries({d:'M18 17.3v9.1',stroke:'#1170c6','stroke-width':'3.1','stroke-linecap':'round'}))
  stem.setAttribute(key,value);
 svg.append(ring,dot,stem);
 button.replaceChildren(svg);
 // Same logical pixel hit area in EVERY modal; inline !important beats
 // legacy high-specificity button styles and prevents oval flex stretching.
 for(const property of ['width','min-width','max-width','height','min-height','max-height','inline-size','block-size'])
  button.style.setProperty(property,'36px','important');
 button.style.setProperty('flex','0 0 36px','important');
 button.style.setProperty('aspect-ratio','1 / 1','important');
 button.style.setProperty('padding','0','important');
 button.style.setProperty('border-radius','50%','important');
 button.dataset.rivoTrueCircle='yes';
 const id='rivo-help-'+(++sequence);
 button.setAttribute('aria-label',word());button.setAttribute('aria-controls',id);button.setAttribute('aria-expanded','false');
 let close=group.querySelector(':scope > header [data-merged-close],.rivo-shield-head [data-shield="close"],.rivo-editor-header [data-edit="retake"],.rivo-modal-top .rivo-modal-dismiss,.rivo-perfectscan-modal header [data-perfect="close"]');
 let title=group.querySelector('.page-heading h1,.work-title h1,.panel h3,.rivo-modal-top h2,.rivo-merged-dialog header strong,.rivo-perfectscan-modal header strong');
 if(close)close.before(button);
 else if(title)title.append(button);
 else group.prepend(button);
 return button;
}
function enhance(){
 for(const node of document.querySelectorAll(HELP_SELECTOR)){
  if(node.dataset.rivoHelpApplied)continue;
  if(node.closest('.rivo-tool-help-popover,.rivo-tool-help-trigger'))continue;
  if(node.querySelector('button,a,input,select,textarea,canvas,video'))continue;
  const text=node.textContent.trim();
  if(text.length<21||node.matches('[role="status"],[role="alert"],[aria-live]'))continue;
  const group=groupFor(node);if(!group)continue;
  node.dataset.rivoHelpApplied='yes';node.classList.add('rivo-tool-help-source');node.hidden=true;
  let section=groups.get(group);
  if(!section){
   section={sources:[],button:addTrigger(group)};
   groups.set(group,section);
   section.button.addEventListener('click',()=>openInfo(section.button,section));
  }
  section.sources.push(node);
  section.button.setAttribute('aria-label',word()+': '+section.sources.length+' '+(section.sources.length===1?'note':'notes'));
 }
 if(active&&!document.contains(active))closeInfo();
}
export function refreshToolHelp(){
 if(scheduled)return;
 scheduled=true;queueMicrotask(()=>{scheduled=false;if(document.body)enhance();});
}
export function installToolHelp(){
 if(initialized)return;
 if(!document.body){document.addEventListener('DOMContentLoaded',installToolHelp,{once:true});return;}
 initialized=true;
 observer=new MutationObserver(records=>{
  if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&!n.classList?.contains('rivo-tool-help-popover'))))refreshToolHelp();
 });
 observer.observe(document.body,{childList:true,subtree:true});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active){e.preventDefault();closeInfo();e.stopImmediatePropagation();}});
 document.addEventListener('pointerdown',e=>{
  if(active&&!dialog?.contains(e.target)&&!e.target.closest?.('.rivo-tool-help-trigger'))closeInfo();
 },true);
 window.addEventListener('resize',()=>{if(active)placeInfo(active)},{passive:true});
 refreshToolHelp();
}
