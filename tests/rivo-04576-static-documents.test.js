import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ui=get('src/rivo-camscanner-static-04576.css');
const main=get('src/main.js');
const id=get('src/id-photo-maker.js');

test('latest user-approved static stylesheet wins over old animated icon layers',()=>{
 const last=main.lastIndexOf("import './rivo-camscanner-static-04576.css';");
 assert.ok(last>main.lastIndexOf("import './rivo-icon-identity-04575.css';"));
 assert.match(ui,/\.rivo-feature-tile,\.rivo-hub-tile,\.rivo-premium-tile/);
 assert.match(ui,/animation:none!important/);
 assert.match(ui,/\.rivo-nav-scan-ring::before/);
 assert.match(ui,/animation:rivo-orbit-border 3\.8s linear infinite!important/);
 assert.match(ui,/--rivo-icon-glow-alpha:\.12/);
});
test('launcher-rounded brand appears in every managed feature dialog and app header',()=>{
 const modal=get('src/modal-shell.js');
 assert.match(modal,/brand\.className='rivo-modal-app-icon'/);
 assert.match(modal,/brand\.src='\/rivoscan-header-mark\.png'/);
 assert.match(ui,/border-radius:24%!important/);
 assert.match(main,/class="topbar-brand-icon"/);
});
test('ID Photo Maker has only ONE camera and ONE image import button on the same side',()=>{
 assert.match(id,/railButton\(leftRail,'photo',takePhotoLabel/);
 assert.match(id,/railButton\(leftRail,'gallery',L\[1\]/);
 assert.match(id,/workspace\.dock\.append\(leftRail,rightRail,input\)/);
 assert.doesNotMatch(id,/previewImport=document\.createElement/);
 assert.match(id,/Camera\.getPhoto/);
 assert.match(id,/setPNGResolution/);
});
test('Documents keeps general Import, removes duplicate Import Images, preserves scanner gallery',()=>{
 assert.match(main,/data-import="file"/);
 assert.doesNotMatch(main,/data-import-images/); // user removed duplicate Import Images
 assert.match(main,/chooseLibraryFiles\(el.dataset.import\)/); // universal Import stays functional
 assert.match(main,/id="scanner-gallery"/); // distinct Scan gallery remains available
 assert.match(main,/id="open-storage-folder"/);
 assert.match(ui,/\.library-heading-actions/);
});
test('obsolete PDF preview, internal page thumbnail window and eye menus have been removed',()=>{
 assert.doesNotMatch(main,/createDocumentViewer|docViewerUI|previewSavedDocument/);
 assert.match(main,/getThumbnail\(\{uri,width:136,height:184\}\)/);
 assert.match(main,/data-doc-external/);
 assert.doesNotMatch(main,/ico\('eye',17\)/);
 const native=get('native/android/RivoDocumentsPlugin.java');
 assert.match(native,/Intent\.createChooser\(open/);
});
test('external file opening and original document actions invoke real native hooks',()=>{
 assert.match(main,/async function openSavedDocumentExternally\(doc\)/);
 assert.match(main,/return RivoDocuments\.openFile\(\{uri:doc\.uri\}\)/);
 assert.ok(main.includes("openSmartScanner()"),'Document scanner remains accessible from Scan and Tools');
 for(const action of ['data-doc-share','data-doc-rename','data-doc-delete','data-doc-edges','data-doc-shield'])
  assert.ok(main.includes(action),'Missing real document action '+action);
});

test('Signed release is monotonic 0.45.94 code 209',()=>{
 assert.equal(JSON.parse(get('package.json')).version,'0.45.94');
 assert.match(get('rivoscan-version.properties'),/^versionCode=209$/m);
 assert.match(get('rivoscan-version.properties'),/^versionName=0\.45\.94$/m);
});
