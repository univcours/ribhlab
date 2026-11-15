import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cornerLoupeLayout,validEdgeQuadrilateral,projectiveSquareToQuad} from '../src/edge-adjustment.js';
import {persistMlKitPdf} from '../src/mlkit-scan-flow.js';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('loupe appears at the opposite corner and 6x magnifies real source pixels',()=>{
 const w=400,h=600;
 const tl=cornerLoupeLayout(w,h,[.05,.07]);
 const br=cornerLoupeLayout(w,h,[.95,.93]);
 assert.equal(tl.zoom,6);
 assert.equal(tl.side,'right');
 assert.equal(br.side,'left');
 assert.ok(tl.centerX>tl.fingerX+tl.radius,'left edge finger has loupe immediately to its right');
 assert.ok(br.centerX<br.fingerX-br.radius,'right edge finger has loupe immediately to its left');
 assert.ok(tl.centerY<300,'top corner loupe stays near the touch instead of jumping to opposite bottom corner');
 assert.ok(br.centerY>300,'bottom corner loupe stays near the touch instead of jumping to opposite top corner');
 assert.ok(tl.centerX+tl.radius<=w);
 assert.ok(tl.centerY+tl.radius<=h);
 assert.ok(br.centerX-br.radius>=0);
 assert.ok(br.centerY-br.radius>=0);
 const src=source('src/edge-adjustment.js');
 assert.match(src,/if\(drag>=0&&drag<4\)drawMagnifyingLoupe/);
 assert.match(src,/drawImage\(image,sx0,sy0,sx1-sx0,sy1-sy0,dx,dy,dw,dh\)/);
 assert.match(src,/drag=distances\.indexOf\(min\);\s*try\{canvas\.setPointerCapture\(e\.pointerId\)\}catch\{\}\s*draw\(\)/);
 assert.match(src,/drag=-1;draw\(\)/);
});
test('first-use transient Google PDF file gets saved after a bounded retry',async()=>{
 const scan={pdf:{uri:'content://google/document/first',pageCount:1},scannedImages:['content://google/image/first']};
 const seen=[];let calls=0;
 const saved=await persistMlKitPdf(scan,{now:()=>1763252000000,importPdf:async payload=>{
  calls++;seen.push({...payload});
  if(calls===1)throw Error('Scanner returned no PDF data.');
  return {uri:'content://media/external/file/first',name:payload.name};
 }});
 assert.equal(calls,2);
 assert.equal(saved.uri,'content://media/external/file/first');
 assert.equal(seen.length,2);
 assert.equal(seen[0].uri,scan.pdf.uri);
 assert.deepEqual(seen[0],seen[1]);
});
test('a permanent native save error is not retried and successful save is not duplicated',async()=>{
 let calls=0;
 await assert.rejects(persistMlKitPdf({pdf:{uri:'content://google/saved'}},{
  importPdf:async()=>{calls++;throw Error('Unauthorized document access.')}
 }),/Unauthorized/);
 assert.equal(calls,1);
 calls=0;
 await persistMlKitPdf({pdf:{uri:'content://google/saved'}},{
  importPdf:async()=>{calls++;return {uri:'content://media/123'};}
 });
 assert.equal(calls,1);
});
test('first scanner session retains JPG images when PDF URI is not ready and never silently drops scan',()=>{
 const main=source('src/main.js');
 assert.match(main,/const imageUris=Array\.isArray\(result\?\.scannedImages\)/);
 assert.match(main,/if\(mlkitFull&&result\?\.scanMode!=='ID Card'\)/);
 assert.match(main,/if\(typeof result\?\.pdf\?\.uri==='string'&&result\.pdf\.uri\)/);
 assert.match(main,/Google scanner returned JPEG pages without PDF on first capture/);
 assert.match(main,/for\(let attempt=0;attempt<3;attempt\+\+\)/);
 assert.match(main,/const stored=await saveOut\(pdf,/);
 assert.match(main,/if\(Capacitor\.isNativePlatform\(\)&&!stored\?\.uri\)/);
 assert.doesNotMatch(main,/if\(!result\?\.pdf\?\.uri && !result\?\.scannedImages\?\.length\)return;/);
});
test('native first-scan storage checks published files and retries ONLY source input',()=>{
 const java=source('native/android/RivoDocumentsPlugin.java');
 assert.match(java,/openScannerPdfWhenReady\(ContentResolver resolver,Uri source\)/);
 assert.match(java,/Thread\.sleep\(attempt==0\?180L:480L\)/);
 assert.match(java,/try \(java\.io\.BufferedInputStream scan = openScannerPdfWhenReady\(resolver,source\)\)/);
 assert.match(java,/if\(resolver\.update\(target, visible, null, null\)<1\)/);
 assert.match(java,/throw new IllegalStateException\("Saved document could not be published\."\)/);
});
test('My Documents title shares a responsive row with search; no redundant My files button',()=>{
 const main=source('src/main.js'),css=source('src/rivo-documents-heading-search.css'),audit=source('scripts/visual-ui-audit.mjs');
 const workspace=main.slice(main.indexOf('function libraryWorkspace(){'),main.indexOf('async function loadLibrary('));
 assert.match(workspace,/class="rivo-library-title-search"/);
 assert.match(workspace,/class="library-search rivo-library-heading-search"/);
 assert.match(workspace,/id="library-search"/);
 assert.match(workspace,/data-import="file"/);
 assert.equal((workspace.match(/data-import=/g)||[]).length,1);
 assert.doesNotMatch(workspace,/<div class="storage-actions"|class="rivo-library-command-row"/);
 assert.match(workspace,/id="open-storage-folder"/);
 assert.match(workspace,/id="refresh-documents"/);
 assert.match(css,/flex-direction:row!important/);
 assert.match(audit,/My Documents title and search share one row/);
});
test('perspective crop core still validates boundaries after loupe addition',()=>{
 const valid=[[.05,.05],[.95,.05],[.95,.95],[.05,.95]];
 assert.equal(validEdgeQuadrilateral(valid),true);
 const project=projectiveSquareToQuad(valid);
 assert.ok(Math.abs(project(0,0)[0]-.05)<1e-6);
});
