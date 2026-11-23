/* Replace only legacy text-glyph icons in interactive controls; preserve every
 * existing click handler, label and action. Dynamically created tool windows
 * receive the same official Phosphor SVGs without a runtime network request. */
import {phosphorIcon} from './phosphor-icons.js';
const glyphs=new Map([
 ['✕','close'],['✖','close'],['×','close'],['✗','close'],
 ['‹','back'],['❮','back'],['›','next'],['❯','next'],
 ['⋯','more'],['…','more'],['⚙','settings'],['⚙️','settings'],
 ['✎','pencil'],['✏','pencil'],['✏️','pencil'],
 ['⇄','convert'],['↔','convert'],['⟲','rotate'],['⟳','refresh'],
 ['↗','external'],['⤴','share'],['⇧','upload'],
 ['⌫','trash'],['🗑','trash'],['🗑️','trash'],
 ['⊞','scan'],['▤','file'],['▧','book'],['◫','split'],['⌁','refresh'],
 ['⤢','maximize'],['⤡','maximize'],['＋','plus'],['+','plus'],['−','minus'],['-','minus'],
 ['✓','check'],['✔','check'],['✔️','check'],['☑','all'],['✚','plus'],
 ['⚡','flash'],['⚡️','flash'],['✦','magic'],['✨','magic'],['◈','filter'],['☷','adjust'],
 ['◷','date'],['↶','undo'],['↷','redo'],['↩','undo'],['↑','up'],['↓','down'],
 ['▣','file'],['▢','scan'],['▾','chevron-down'],['⌄','chevron-down'],['⌃','chevron-up'],
 ['⚙','settings'],['⚙️','settings'],['🔍','search'],['📷','camera'],
 ['📁','folder'],['📄','file'],['🔒','lock'],['🔗','share']
]);
const ordered=[...glyphs.keys()].sort((a,b)=>b.length-a.length);
function upgrade(button){
 if(!button||button.hasAttribute('data-phosphor-auto')||button.querySelector('svg,input,canvas,img'))return;
 const textNode=[...button.childNodes].find(n=>n.nodeType===3&&n.textContent.trim());
 if(!textNode)return;
 const raw=textNode.textContent||'';
 const prefix=raw.match(/^\s*/)?.[0]||'';
 const remaining=raw.slice(prefix.length);
 const token=ordered.find(g=>remaining.startsWith(g)
   &&(!remaining.slice(g.length)||/^\s|[\p{L}]/u.test(remaining.slice(g.length))||remaining.slice(g.length).startsWith('(')));
 if(!token)return;
 const after=remaining.slice(token.length);
 // This only substitutes the graphical prefix. The button stays the same
 // DOM element: no listener, disabled state or click behaviour is rewritten.
 textNode.textContent=(prefix+after).trimStart();
 const fragment=document.createElement('span');
 fragment.className='rivo-auto-glyph';fragment.innerHTML=phosphorIcon(glyphs.get(token),19);
 button.insertBefore(fragment,textNode);
 button.setAttribute('data-phosphor-auto','true');
 if(!button.hasAttribute('aria-label')&&!button.textContent.trim())button.setAttribute('aria-label',button.title||glyphs.get(token));
}
export function installPhosphorAutoIcons(root=document){
 const walk=node=>{
  if(!node||node.nodeType!==1)return;
  if(node.matches?.('button, [role="button"]'))upgrade(node);
  node.querySelectorAll?.('button, [role="button"]').forEach(upgrade);
 };
 walk(root===document?document.documentElement:root);
 if(root!==document)return()=>{};
 const observer=new MutationObserver(records=>{
  for(const record of records)
   for(const node of record.addedNodes)walk(node);
 });
 observer.observe(document.documentElement,{subtree:true,childList:true});
 return ()=>observer.disconnect();
}
