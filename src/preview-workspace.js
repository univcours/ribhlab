import {materialSymbol} from './material-symbols.js';
/**
 * Preview-first editing pattern for RivoScan image tools.
 * Move existing DOM nodes, never clone them, so existing handlers keep working.
 * The image is always visible while only the active tool's settings scroll.
 */
const words={
 en:{settings:'Settings',source:'Photo',adjust:'Adjust',result:'Result',advanced:'Advanced',empty:'Take or import a photo to see it here'},
 ar:{settings:'الإعدادات',source:'الصورة',adjust:'الضبط',result:'النتيجة',advanced:'متقدم',empty:'صوّر أو استورد صورة باش تبان هنا'},
 fr:{settings:'Réglages',source:'Photo',adjust:'Ajuster',result:'Résultat',advanced:'Avancé',empty:'Photographiez ou importez une photo'}
};
export function mountPreviewFirstWorkspace({panel,preview,sections=[],footer=[],hiddenNodes=[],alwaysVisible=[],language='en',defaultSection=null}={}){
 if(!panel||!preview||!sections.length)throw Error('Invalid preview workspace');
 const lang=words[language]||words.en;
 const header=panel.querySelector(':scope > .rivo-modal-top')||panel.querySelector(':scope > header');
 if(!header)throw Error('A modal header is required for preview-first settings');
 panel.classList.add('rivo-preview-first-dialog','rivo-shared-preview-dialog');
 header.classList.add('rivo-workspace-header');
 const gear=document.createElement('button');gear.type='button';
 gear.className='rivo-workspace-settings-toggle';
 gear.innerHTML=materialSymbol('settings',20);gear.setAttribute('aria-label',lang.settings);
 gear.setAttribute('aria-expanded','false');
 header.insertBefore(gear,header.lastElementChild);
 const dock=document.createElement('div');
 dock.className='rivo-edit-preview-dock rivo-shared-preview-dock';
 const empty=document.createElement('p');empty.className='rivo-workspace-empty';
 empty.textContent=lang.empty;
 dock.append(preview,empty);
 const drawer=document.createElement('div');
 drawer.className='rivo-edit-settings-scroll rivo-workspace-settings';
 const nav=document.createElement('div');nav.className='rivo-workspace-taskbar';
 const panels=new Map(),tabs=new Map();
 for(const {id,label,nodes=[]} of sections){
  if(!id||panels.has(id))throw Error('Duplicate or missing settings category');
  const tab=document.createElement('button');tab.type='button';
  tab.className='rivo-workspace-task';tab.dataset.previewTask=id;
  tab.innerHTML=materialSymbol(({source:'source',photo:'photo',adjust:'adjust',result:'check-circle',advanced:'settings',background:'background',crop:'crop',filters:'filter',tools:'tools'})[id]||'settings',18)+'<span>'+(label||lang[id]||id)+'</span>';nav.append(tab);
  const group=document.createElement('div');group.className='rivo-workspace-task-panel';
  group.dataset.previewPanel=id;group.hidden=true;
  nodes.filter(Boolean).forEach(node=>group.append(node));
  panels.set(id,group);tabs.set(id,tab);
 }
 drawer.append(nav,...panels.values());
 const actionBar=document.createElement('div');actionBar.className='rivo-edit-bottom-bar rivo-workspace-bottom';
 footer.filter(Boolean).forEach(el=>actionBar.append(el));
 panel.replaceChildren(header,dock,...alwaysVisible.filter(Boolean),drawer,...(footer.length?[actionBar]:[]),...hiddenNodes.filter(Boolean));
 let selected=defaultSection||sections[0].id,open=true;
 function choose(id){
  if(!panels.has(id))return;
  selected=id;
  for(const [name,group] of panels){
   group.hidden=name!==id;
   const tab=tabs.get(name);tab.classList.toggle('active',name===id);
   tab.setAttribute('aria-pressed',String(name===id));
  }
 }
 function show(visible){
  open=!!visible;drawer.hidden=!open;gear.classList.toggle('active',open);
  gear.setAttribute('aria-expanded',String(open));
 }
 for(const [id,tab] of tabs)tab.addEventListener('click',()=>choose(id));
 gear.addEventListener('click',()=>show(!open));
 const loaded=()=>{empty.hidden=true;dock.classList.add('rivo-workspace-has-image');show(false)};
 choose(selected);show(true);
 return {choose,show,loaded,drawer,dock,gear,empty};
}
