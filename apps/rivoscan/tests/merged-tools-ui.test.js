import test from 'node:test';
import assert from 'node:assert/strict';
import {openMergedToolDialog} from '../src/merged-tools.js';

class Element{
 constructor(type){this.type=type;this.children=[];this.listeners={};this.attributes={};this.dataset={};this.hidden=false;this.value='';this.parent=null;this.textContent='';this.className='';}
 append(...nodes){for(const n of nodes){n.parent=this;this.children.push(n)}}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(e=>e!==this);this.parent=null;}
 setAttribute(k,v){this.attributes[k]=v;}
 addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}
 querySelector(selector){const queue=[...this.children];while(queue.length){const node=queue.shift();if(selector==='.rivo-merged-overlay'&&node.className==='rivo-merged-overlay')return node;if(selector==='[data-merged-close]'&&node.dataset.mergedClose)return node;queue.push(...node.children)}return null;}
 focus(){this.focused=true;}
 fire(key,p={}){const e={preventDefault(){e.prevented=true},target:this,...p};for(const fn of this.listeners[key]||[])fn(e);return e;}
}
function mount(){
 const previous=globalThis.document;
 const body=new Element('body'),listeners={};
 globalThis.document={body,createElement:tag=>new Element(tag),
  querySelector:selector=>body.querySelector(selector),
  addEventListener:(k,fn)=>{(listeners[k]??=[]).push(fn)},
  removeEventListener:(k,fn)=>{listeners[k]=(listeners[k]||[]).filter(f=>f!==fn)},
  dispatch(k,e){for(const fn of listeners[k]||[])fn(e);}
 };
 return {body,listeners,restore:()=>{globalThis.document=previous}};
}
const find=(root,tag)=>{const queue=[root];while(queue.length){const el=queue.shift();if(el.type===tag)return el;queue.push(...el.children)}return null};

test('Merged converter runs an actual selected original action in the same gesture',()=>{
 const dom=mount();
 try{
  const chosen=[];
  openMergedToolDialog({id:'convertDocument',language:'ar',onChoose:id=>{chosen.push(id)}});
  const dialog=dom.body.children[0];
  const select=find(dialog,'select'),form=find(dialog,'form');
  assert.equal(select.children.length,10);
  assert.equal(select.focused,true);
  select.value='toExcel';
  form.fire('submit');
  assert.deepEqual(chosen,['toExcel']);
  assert.equal(dom.body.children.length,0);
  assert.equal((dom.listeners.keydown||[]).length,0);
 }finally{dom.restore()}
});
test('Merged selector ignores unlisted operations, closes using Back and does not touch files',()=>{
 const dom=mount();
 try{
  const chosen=[];
  openMergedToolDialog({id:'pdfPrivacy',language:'fr',onChoose:id=>chosen.push(id)});
  let select=find(dom.body,'select'),form=find(dom.body,'form');
  assert.equal(select.children.length,2);
  select.value='deleteAllFiles';form.fire('submit');
  assert.deepEqual(chosen,[]);
  assert.equal(dom.body.children.length,1);
  dom.listeners.keydown[0]({key:'Escape',target:select,preventDefault(){}});
  assert.equal(dom.body.children.length,0);
  assert.equal((dom.listeners.keydown||[]).length,0);
 }finally{dom.restore()}
});
