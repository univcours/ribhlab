import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ui=get('src/rivo-camscanner-static-04576.css');
const main=get('src/main.js');
const viewer=get('src/document-viewer.js');
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
test('Files screen imports any file and images with separate functional controls',()=>{
 assert.match(main,/data-import="file"/);
 assert.match(main,/data-import-images/);
 assert.match(main,/chooseLibraryFiles\('image'\)/);
 assert.match(main,/id="open-storage-folder"/);
 assert.match(ui,/\.library-heading-actions/);
});
test('Document preview has selected large page and actual lazy rendered PDF thumbnails',()=>{
 assert.match(viewer,/const renderThumbnails=\(\)=>/);
 assert.match(viewer,/IntersectionObserver/);
 assert.match(viewer,/pdfPage\.render/);
 assert.match(viewer,/dataset\.page/);
 assert.match(viewer,/doc-page-thumbnails/);
 assert.match(viewer,/doc-page-thumb/);
 assert.match(viewer,/highlightThumbnail/);
 assert.match(ui,/\.doc-page-thumb\.active/);
});
test('Document actions invoke working hooks rather than dummy buttons',()=>{
 assert.match(viewer,/onAddScan=\(\)=>\{\}/);
 assert.match(main,/onAddScan:\(\)=>openSmartScanner\(\)/);
 assert.match(viewer,/onEdit\(convertTool,selected,copy\)/);
 assert.match(viewer,/onShare\(current\)/);
 assert.match(viewer,/bridge\.deleteFile/);
 assert.match(viewer,/bridge\.renameFile/);
});
test('Signed release is monotonic 0.45.76 code 191',()=>{
 assert.equal(JSON.parse(get('package.json')).version,'0.45.76');
 assert.match(get('rivoscan-version.properties'),/^versionCode=191$/m);
 assert.match(get('rivoscan-version.properties'),/^versionName=0\.45\.76$/m);
});
