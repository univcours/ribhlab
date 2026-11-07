import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { tt, toolTitle } from './i18n-extra.js';
import { createViewerZoom } from './viewer-zoom.js';

pdfjs.GlobalWorkerOptions.workerSrc=pdfWorkerUrl;
const pdfType=(doc)=>/pdf/i.test(doc.mimeType||'')||/\.pdf$/i.test(doc.name||'');
const imageType=(doc)=>/^image\//i.test(doc.mimeType||'')||/\.(png|jpg|jpeg|webp)$/i.test(doc.name||'');
function button(label,cls,fn){
  const el=document.createElement('button');
  el.type='button';el.className=cls;el.textContent=label;
  el.addEventListener('click',fn);return el;
}
function tag(tagName,cls,content){
  const node=document.createElement(tagName);
  node.className=cls||'';
  if(content!==undefined)node.textContent=String(content);
  return node;
}
function fromBase64(encoded){
  const raw=atob(encoded),out=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);
  return out;
}
export function createDocumentViewer({bridge,getLanguage,onChanged,onEdit,onError,onShare,getImageItems=()=>[]}){
  let current=null,root=null,content=null,buttons=null,page=1,pdf=null,bytes=null,imageUrl=null,request=0,zoom=null;
  const lang=()=>getLanguage();
  const word=(key)=>tt(lang(),key);
  const feedback=(error)=>onError(error?.message||String(error));
  const clean=()=>{
    request++;
    if(zoom){zoom.destroy();zoom=null;}
    if(pdf){try{pdf.destroy()}catch(e){console.warn(e)}pdf=null;}
    if(imageUrl){URL.revokeObjectURL(imageUrl);imageUrl=null;}
    bytes=null;page=1;
  };
  const close=()=>{
    clean();current=null;
    if(root){root.remove();root=null;}
    document.body.classList.remove('document-sheet-active');
    window.removeEventListener('keydown',onKeyDown);
  };
  const onKeyDown=(event)=>{
    if(event.target?.closest?.('input,textarea,[contenteditable]'))return;
    if(event.key==='Escape'||event.key==='Backspace'){event.preventDefault();close();}
    else if(event.key==='+'||event.key==='='){event.preventDefault();zoom?.zoomIn();}
    else if(event.key==='-'){event.preventDefault();zoom?.zoomOut();}
    else if(event.key==='0'){event.preventDefault();zoom?.reset();}
    else if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
      event.preventDefault();
      if(imageType(current))navigateImage(event.key==='ArrowLeft'?-1:1);
      else if(pdf){page+=event.key==='ArrowLeft'?-1:1;showPage();}
    }
  };
  const navigateImage=async(direction)=>{
    if(!current||!imageType(current))return;
    const items=getImageItems().filter(imageType);
    const index=items.findIndex(item=>item.uri===current.uri);
    if(index<0)return;
    const next=items[index+direction];
    if(next)await open(next);
  };
  const zoomed=(element)=>{
    zoom?.destroy();
    const stage=tag('div','doc-zoom-stage');
    stage.appendChild(element);
    content.replaceChildren(stage);
    zoom=createViewerZoom({viewport:content,stage,onChange:scale=>{
      const indicator=root?.querySelector('.doc-zoom-label');
      if(indicator)indicator.textContent=Math.round(scale*100)+'%';
    }});
  };
  const placeholder=(label)=>{
    if(!content)return;
    content.replaceChildren(tag('div','doc-blank-symbol','▤'),tag('p','doc-blank-caption',label));
  };
  const load=async()=>{
    if(!current)return;
    const req=++request;
    clean(); // revoke any earlier image or PDF
    const active=++request;
    placeholder(word('loading'));
    if(!pdfType(current)&&!imageType(current)){placeholder(word('notSupported'));return;}
    try{
      const result=await bridge.readFile({uri:current.uri});
      if(active!==request||!root)return;
      bytes=fromBase64(result.base64);
      if(pdfType(current)){
        pdf=await pdfjs.getDocument({data:bytes.slice()}).promise;
        if(active!==request||!root)return;
      } else {
        imageUrl=URL.createObjectURL(new Blob([bytes],{type:current.mimeType||'image/jpeg'}));
      }
      await showPage();
    }catch(error){
      if(active!==request||!root)return;
      placeholder(String(error?.message||'').includes('PREVIEW_TOO_LARGE')?word('tooLarge'):word('unable'));
    }
  };
  const showPage=async()=>{
    if(!root||!current||!content)return;
    const pageActions=root.querySelector('.doc-page-navigation');
    if(imageUrl){
      const image=document.createElement('img');
      image.className='doc-preview-picture';image.src=imageUrl;image.alt=word('preview');
      zoomed(image);
      image.addEventListener('load',()=>zoom?.reset(),{once:true});
      pageActions.hidden=true;return;
    }
    if(!pdf){pageActions.hidden=true;return;}
    page=Math.max(1,Math.min(page,pdf.numPages));
    pageActions.hidden=pdf.numPages<2;
    root.querySelector('.doc-page-label').textContent=word('page')+' '+page+' / '+pdf.numPages;
    root.querySelector('.doc-page-previous').disabled=page===1;
    root.querySelector('.doc-page-next').disabled=page===pdf.numPages;
    const requestedPage=page,req=request;
    try{
      const pdfPage=await pdf.getPage(page);
      if(req!==request||requestedPage!==page||!root)return;
      const base=pdfPage.getViewport({scale:1});
      const usableWidth=Math.max(190,Math.min(content.clientWidth-20,690));
      const pixelRatio=Math.min(window.devicePixelRatio||1,2);
      const viewport=pdfPage.getViewport({scale:usableWidth/base.width*pixelRatio});
      const canvas=document.createElement('canvas');
      canvas.className='doc-pdf-canvas';
      canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
      canvas.style.width=Math.round(viewport.width/pixelRatio)+'px';
      canvas.style.height=Math.round(viewport.height/pixelRatio)+'px';
      const ctx=canvas.getContext('2d');
      zoomed(canvas);
      await pdfPage.render({canvasContext:ctx,viewport,canvas}).promise;
    }catch(error){if(req===request)placeholder(word('unable'));}
  };
  const rename=()=>{
    const existing=root.querySelector('.doc-rename-form');
    if(existing){existing.remove();return;}
    const form=document.createElement('form');form.className='doc-rename-form';
    form.appendChild(tag('label','',word('renamePrompt')));
    const row=tag('div','doc-rename-controls');
    const input=document.createElement('input');
    input.required=true;input.maxLength=90;input.autocomplete='off';
    input.value=current.name;
    row.appendChild(input);
    const submit=document.createElement('button');submit.type='submit';
    submit.textContent=word('save');row.appendChild(submit);form.appendChild(row);
    form.addEventListener('submit',async(event)=>{
      event.preventDefault();
      submit.disabled=true;
      try{
        const trimmed=input.value.trim();
        const oldExt=(current.name.match(/\.[^.]+$/)||[])[0]||'';
        const newName=oldExt&&!/\.[^.]+$/.test(trimmed)?trimmed+oldExt:trimmed;
        const response=await bridge.renameFile({uri:current.uri,name:newName});
        current.name=response.name;
        root.querySelector('.doc-viewer-title').textContent=response.name;
        form.remove();
        await onChanged();
      }catch(error){feedback(error);submit.disabled=false;}
    });
    root.querySelector('.doc-detail-actions').after(form);input.focus();
  };
  const edit=()=>{
    const existing=root.querySelector('.doc-edit-options');
    if(existing){existing.remove();return;}
    const chooser=tag('div','doc-edit-options');
    chooser.appendChild(tag('strong','',word('chooseEdit')));
    const grid=tag('div','doc-edit-grid');
    const options=pdfType(current)?[
      ['managePages','managePages'],
      ['rotate','rotate'],['sign','sign'],['text','text'],['watermark','watermark'],['reorder','reorder'],['split','extract']
    ]:imageType(current)?[['enhance','enhance'],['scan','crop'],['images','imagePdf']]:[];
    for(const [toolId,label] of options){
      grid.appendChild(button(label==='managePages'?({en:'Manage Pages',ar:'إدارة الصفحات',fr:'Gérer les pages',es:'Gestionar páginas',de:'Seiten verwalten',pt:'Gerir páginas',it:'Gestisci pagine'})[getLanguage()]||'Manage Pages':word(label),'doc-edit-choice',async()=>{
        if(!current)return;
        if(!bytes && toolId!=='scan'){feedback(word('tooLarge'));return;}
        const selected={...current};
        const copy=bytes?.slice();
        close();
        try{await onEdit(toolId,selected,copy);}catch(error){feedback(error);}
      }));
    }
    chooser.appendChild(grid);
    root.querySelector('.doc-detail-actions').after(chooser);
  };
  const open=async(doc)=>{
    close();
    current={...doc};
    root=tag('section','doc-detail-overlay');
    root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
    root.setAttribute('aria-label',word('preview'));
    const header=tag('header','doc-viewer-header');
    header.appendChild(button('‹','doc-viewer-back',close));
    const title=tag('div','doc-viewer-title',current.name);header.appendChild(title);
    header.appendChild(button('⋯','doc-viewer-menu',()=>{
      if(imageType(current))edit();
      else root.querySelector('.doc-detail-actions').scrollIntoView({block:'end',behavior:'smooth'});
    }));
    const closeButton=button('✕','doc-viewer-close',close);
    closeButton.setAttribute('aria-label','Close document');
    header.appendChild(closeButton);
    root.appendChild(header);
    root.appendChild(tag('p','doc-viewer-subtitle',word('storage')+' · '+Math.round((doc.size||0)/1024)+' KB'));
    const body=tag('div','doc-detail-preview');
    content=tag('div','doc-detail-paper');body.appendChild(content);
    const zoomControls=tag('div','doc-zoom-actions');
    zoomControls.setAttribute('role','toolbar');
    zoomControls.setAttribute('aria-label','Document zoom and navigation');
    const zoomButton=(text,cls,label,handler)=>{
      const b=button(text,cls,handler);b.setAttribute('aria-label',label);return b;
    };
    zoomControls.appendChild(zoomButton('−','doc-zoom-out','Zoom out',()=>zoom?.zoomOut()));
    zoomControls.appendChild(tag('span','doc-zoom-label','100%'));
    zoomControls.appendChild(zoomButton('+','doc-zoom-in','Zoom in',()=>zoom?.zoomIn()));
    zoomControls.appendChild(zoomButton('⤢','doc-zoom-reset','Fit to screen',()=>zoom?.reset()));
    if(imageType(current)){
      zoomControls.appendChild(zoomButton('‹','doc-image-previous','Previous image',()=>navigateImage(-1)));
      zoomControls.appendChild(zoomButton('›','doc-image-next','Next image',()=>navigateImage(1)));
    }
    body.appendChild(zoomControls);
    const pages=tag('div','doc-page-navigation');pages.hidden=true;
    pages.appendChild(button('‹','doc-page-previous',()=>{page--;showPage();}));
    pages.appendChild(tag('span','doc-page-label',''));
    pages.appendChild(button('›','doc-page-next',()=>{page++;showPage();}));
    body.appendChild(pages);root.appendChild(body);
    const actionRow=tag('div','doc-detail-actions');
    actionRow.appendChild(button('✎ '+word('edit'),'doc-action doc-edit',imageType(current)?async()=>{
      if(!bytes){feedback(word('tooLarge'));return;}
      const selected={...current},copy=bytes.slice();close();
      try{await onEdit('enhance',selected,copy);}catch(error){feedback(error)}
    }:edit));
    actionRow.appendChild(button('↗ '+word('share'),'doc-action',async()=>{try{if(onShare)await onShare(current);else await bridge.shareFile({uri:current.uri});}catch(e){feedback(e);}}));
    actionRow.appendChild(button('⌫ '+word('delete'),'doc-action doc-action-danger',async()=>{
      if(!window.confirm(word('confirm')))return;
      try{
        await bridge.deleteFile({uri:current.uri});
        close();await onChanged();
      }catch(e){feedback(e);}
    }));
    actionRow.appendChild(button('▤ '+word('rename'),'doc-action',rename));
    root.appendChild(actionRow);
    root.appendChild(button('↗ '+word('external'),'doc-external-open',async()=>{try{await bridge.openFile({uri:current.uri});}catch(e){feedback(e);}}));
    document.body.appendChild(root);
    document.body.classList.add('document-sheet-active');
    window.addEventListener('keydown',onKeyDown);
    await load();
  };
  return {open,close};
}