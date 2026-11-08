import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import crypto from 'node:crypto';

const out='/tmp/rivoscan-play-screenshots';
const report={method:'Installed Android WebView via Chrome DevTools',checks:[],buttons:[],scenes:[]};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const adb=(...args)=>execFileSync('adb',args,{timeout:20000,maxBuffer:30000000});
function log(msg){console.log('RIVO_UI_AUDIT '+msg)}
function screenshot(name){
 const raw=adb('exec-out','screencap','-p');
 if(raw.length<10000)throw new Error('Screen capture too small: '+name);
 fs.writeFileSync(out+'/'+name+'.png',raw);
 report.scenes.push({name,bytes:raw.length,sha256:crypto.createHash('sha256').update(raw).digest('hex')});
 log('CAPTURE '+name+' '+raw.length);
}
function tinyPdf(title){
 const stream='BT /F1 24 Tf 70 700 Td ('+title+') Tj ET';
 const obj=[
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  '<< /Length '+Buffer.byteLength(stream)+' >>\nstream\n'+stream+'\nendstream'
 ];
 let pdf='%PDF-1.4\n';let offsets=[0];
 obj.forEach((body,i)=>{offsets.push(Buffer.byteLength(pdf));pdf+=(i+1)+' 0 obj\n'+body+'\nendobj\n'});
 const offset=Buffer.byteLength(pdf);
 pdf+='xref\n0 6\n0000000000 65535 f \n';
 offsets.slice(1).forEach(n=>{pdf+=String(n).padStart(10,'0')+' 00000 n \n'});
 pdf+='trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+offset+'\n%%EOF\n';
 return Buffer.from(pdf,'utf8').toString('base64');
}
async function connection(){
 const pid=adb('shell','pidof','com.ribhlab.rivoscan.debug').toString().trim().split(/\s+/)[0];
 if(!pid)throw new Error('RivoScan debug process not running');
 adb('forward','tcp:9223','localabstract:webview_devtools_remote_'+pid);
 const pages=await fetch('http://127.0.0.1:9223/json').then(r=>r.json());
 const target=pages.find(p=>p.webSocketDebuggerUrl && (p.type==='page'||p.type==='webview'))||pages.find(p=>p.webSocketDebuggerUrl);
 if(!target)throw new Error('WebView DevTools target not advertised; cannot perform real DOM QA');
 const ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((yes,no)=>{
  ws.addEventListener('open',yes,{once:true});
  ws.addEventListener('error',()=>no(new Error('WebView CDP connect failed')),{once:true});
 });
 const pending=new Map();let id=0;
 ws.addEventListener('message',event=>{
  let data;try{data=JSON.parse(String(event.data))}catch{return}
  if(!data.id||!pending.has(data.id))return;
  const h=pending.get(data.id);pending.delete(data.id);
  if(data.error)h.reject(new Error(JSON.stringify(data.error)));else h.resolve(data.result);
 });
 const query=(method,params={})=>new Promise((resolve,reject)=>{
  const callId=++id;pending.set(callId,{resolve,reject});
  ws.send(JSON.stringify({id:callId,method,params}));
  setTimeout(()=>{if(pending.has(callId)){pending.delete(callId);reject(new Error('CDP timeout: '+method))}},12000);
 });
 const evaluate=async expr=>{
  const answer=await query('Runtime.evaluate',{expression:expr,awaitPromise:true,returnByValue:true});
  if(answer.exceptionDetails)throw new Error(answer.exceptionDetails.text||'WebView JS exception');
  return answer.result?.value;
 };
 return {evaluate,close:()=>ws.close(),target:target.url};
}
// Capture every visibly rendered button and dialogue controls with true
// layout metrics. Report blank/unreadable controls instead of pretending they pass.
async function auditVisibleButtons(cd,scene){
 const result=await cd.evaluate(`(()=>{
  const selected=[...document.querySelectorAll('button')].filter(b=>{
   const r=b.getBoundingClientRect(),style=getComputedStyle(b);
   return r.width>0&&r.height>0&&style.visibility!=='hidden'&&
     style.display!=='none'&&r.right>0&&r.bottom>0&&r.left<innerWidth&&r.top<innerHeight;
  });
  const buttons=selected.map(b=>{
   const r=b.getBoundingClientRect(),text=(b.innerText||'').trim();
   const icon=!!b.querySelector('svg,img,.rivo-action-icon');
   const style=getComputedStyle(b);
   return {name:b.getAttribute('aria-label')||b.getAttribute('title')||text.slice(0,100),
    text:text.slice(0,150),icon,x:Math.round(r.x),y:Math.round(r.y),
    width:Math.round(r.width),height:Math.round(r.height),
    background:style.backgroundColor,blank:!text&&!icon,
    clipped:r.left<0||r.right>innerWidth||r.top<0||r.bottom>innerHeight,
    narrowLabel:text.length>8&&r.width<80};
  });
  const overlays=[...document.querySelectorAll('.rivo-code-overlay,.rivo-id-overlay,.rivo-pages-overlay,.rivo-perfectscan-overlay,.rivo-editor-overlay,.bulk-overlay,.doc-detail-overlay,.rivo-release-overlay')]
    .filter(o=>o.getBoundingClientRect().width>0&&getComputedStyle(o).display!=='none')
    .map(o=>o.className);
  return {viewport:{w:innerWidth,h:innerHeight},buttons,overlays,
    blank:buttons.filter(b=>b.blank).map(b=>b.name),
    clipped:buttons.filter(b=>b.clipped).map(b=>b.name),
    narrow:buttons.filter(b=>b.narrowLabel).map(b=>b.name)};
 })()`);
 report.checks.push({name:'UI buttons '+scene,result});
 report.buttons.push(...result.buttons.map(x=>({scene,...x})));
 log('AUDIT '+scene+' buttons='+result.buttons.length+
     ' blank='+result.blank.length+' clipped='+result.clipped.length+
     ' narrow='+result.narrow.length+' dialogs='+result.overlays.join(';'));
 return result;
}
let cd;
try {
 cd=await connection();
 log('CONNECTED '+cd.target);
 report.checks.push({name:'CDP WebView',result:'connected'});
 const caps=await cd.evaluate('({native:!!window.Capacitor?.nativePromise,plugins:Object.keys(window.Capacitor?.Plugins||{})})');
 report.checks.push({name:'Capacitor bridge',result:caps});
 log('CAPABILITIES '+JSON.stringify(caps));
 if(caps?.native){
  for(const [n,title] of [['Alpha','RivoScan QA Alpha'],['Beta','RivoScan QA Beta']]){
   const data=tinyPdf(title);
   const expr='window.Capacitor.nativePromise("RivoDocuments","saveFile",'+JSON.stringify({name:'RivoScan_Visual_QA_'+n+'.pdf',mimeType:'application/pdf',base64:data})+')';
   try{
    const value=await cd.evaluate(expr);
    report.checks.push({name:'Seed '+n+' via RivoDocuments.saveFile',result:value});
   }catch(e){report.checks.push({name:'Seed '+n,result:'FAILED '+e.message})}
  }
  await sleep(2000);
  const nativeDocs=await cd.evaluate('window.Capacitor.nativePromise("RivoDocuments","listFiles",{}).then(x=>({count:x.files?.length||0,names:(x.files||[]).map(f=>f.name)}))');
  report.checks.push({name:'Real library',result:nativeDocs});
  log('LIBRARY '+JSON.stringify(nativeDocs));
 }
 await cd.evaluate('location.reload()');
 await sleep(9000);
 screenshot('34-home-ui-all-buttons');
 await auditVisibleButtons(cd,'home');
 await cd.evaluate('document.querySelector(".mobilebar [data-open-library]")?.click();true');
 await sleep(4000);
 let rows=await cd.evaluate('({entries:[...document.querySelectorAll("#library-list .document-entry")].map(x=>x.textContent.trim().slice(0,130)),boxes:document.querySelectorAll("#library-list input.doc-select-box").length})');
 report.checks.push({name:'Visible document rows',result:rows});
 log('DOCS '+JSON.stringify(rows));
 screenshot('30-real-documents-loaded');
 await auditVisibleButtons(cd,'documents');
 if(rows.boxes>0){
  await cd.evaluate('document.querySelector("#library-list input.doc-select-box")?.click();true');
  await sleep(700);
  await cd.evaluate('document.querySelector("#library-list .doc-selected")?.scrollIntoView({block:"center",behavior:"instant"});true');
  await sleep(1300);
  const selection=await cd.evaluate('(()=>{const bar=document.querySelector("#library-list .doc-selected .rivo-selection-inline");if(!bar)return {present:false};const r=bar.getBoundingClientRect();const buttons=[...bar.querySelectorAll("button")].map(b=>{const q=b.getBoundingClientRect();return {label:b.getAttribute("aria-label"),x:Math.round(q.x),y:Math.round(q.y),w:Math.round(q.width),h:Math.round(q.height),icon:!!b.querySelector("svg")}});return {present:true,grid:getComputedStyle(bar).gridTemplateColumns,rows:getComputedStyle(bar).gridTemplateRows,rect:{x:r.x,y:r.y,w:r.width,h:r.height},buttons,oneRow:buttons.length===6&&Math.max(...buttons.map(b=>b.y))-Math.min(...buttons.map(b=>b.y))<3}})()');
  report.checks.push({name:'Checkbox single row, all six buttons',result:selection});
  log('SELECTION '+JSON.stringify(selection));
  screenshot('31-checkbox-six-buttons-on-right');
  await auditVisibleButtons(cd,'selected-document');
  if(selection.present){
   const check=await cd.evaluate('(()=>{const q=document.querySelector("#library-list .doc-selected .rivo-selection-inline");return [...q.querySelectorAll("button")].map(b=>({name:b.title,icon:b.querySelector("svg")?.outerHTML?.slice(0,70),visible:getComputedStyle(b).visibility!=="hidden"}))})()');
   report.buttons.push(...check);
   if(rows.boxes>1){
    await cd.evaluate('document.querySelectorAll("#library-list input.doc-select-box")[1]?.click();true');
    await sleep(1100);
    const second=await cd.evaluate('(()=>{const bar=document.querySelector(".library-selection-toolbar");return {present:!!bar,buttons:[...bar?.querySelectorAll("button")||[]].map(b=>({label:b.getAttribute("aria-label"),icon:!!b.querySelector("svg")}))}})()');
    report.checks.push({name:'Two PDFs selected, group toolbar',result:second});
    screenshot('33-two-selected-group-toolbar');
   }
  }
 }else log('NO_DOCS_SELECTION: QA files failed to appear in the real app');
 // Real tool opening tests. Each shot is from the installed Android app.
 const tools=await cd.evaluate('(()=>{document.querySelector(".mobilebar [data-tab=tools]")?.click();return [...document.querySelectorAll(".rivo-hub-tile[data-hub-action]")].map(b=>({id:b.dataset.hubAction,label:b.innerText.trim(),icon:!!b.querySelector("svg")}))})()');
 report.buttons.push(...tools);
 if(Array.isArray(tools)){
  const seen=new Set();
  let consecutiveErrors=0;
  for(const entry of tools){
   if(!entry?.id||seen.has(entry.id))continue;seen.add(entry.id);
   try{
    adb('shell','am','start','-n','com.ribhlab.rivoscan.debug/com.ribhlab.rivoscan.MainActivity');
    await sleep(600);
    await cd.evaluate('document.querySelector(".mobilebar [data-tab=tools]")?.click();true');
    await sleep(450);
    const clicked=await cd.evaluate('(()=>{const b=document.querySelector("[data-hub-action='+JSON.stringify(entry.id)+']");if(!b)return false;b.click();return true})()');
    if(!clicked){report.checks.push({name:'Open '+entry.id,result:'BUTTON NOT FOUND'});continue}
    await sleep(900);
    const scene='tool-'+String(entry.id).replace(/[^A-Za-z0-9_-]/g,'_');
    screenshot(scene);
    const audit=await auditVisibleButtons(cd,scene);
    report.checks.push({name:'Open '+entry.id,result:{
     captured:true,overlays:audit.overlays,blank:audit.blank,clipped:audit.clipped,
     requiresRealInput:audit.overlays.length===0
    }});
    consecutiveErrors=0;
    adb('shell','input','keyevent','4');
    await sleep(650);
    const after=await cd.evaluate('([...document.querySelectorAll(".rivo-code-overlay,.rivo-id-overlay,.rivo-pages-overlay,.rivo-perfectscan-overlay,.rivo-editor-overlay,.bulk-overlay,.doc-detail-overlay")].filter(x=>x.getBoundingClientRect().width>0).map(x=>x.className))');
    report.checks.push({name:'Android Back '+entry.id,result:{remainingModals:after}});
    log('BACK '+entry.id+' remaining='+JSON.stringify(after));
   }catch(e){
     consecutiveErrors++;
     report.checks.push({name:'Open '+entry.id,result:'FAILED '+e.message});
     log('FAILED_TOOL '+entry.id+' '+e.message);
     if(consecutiveErrors>=4){log('STOP_TOOL_LOOP repeated WebView failures');break}
    }
  }
 }
} catch(error) {
 report.checks.push({name:'Extended WebView audit',result:'UNAVAILABLE '+error.message});
 log('CDP_UNAVAILABLE '+error.message);
} finally{
 try{cd?.close()}catch{}
 fs.writeFileSync(out+'/qa-webview-audit.json',JSON.stringify(report,null,2));
 log('SAVED '+report.scenes.length+' actual screenshots, '+report.buttons.length+' audited buttons');
 const docs=report.checks.filter(x=>x.name.startsWith('Open '));
 log('TOOL_COVERAGE '+docs.length+'/48; screenshot != functionality verified');
}
