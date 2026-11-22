import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('global native safe zone covers every RivoScan modal category',()=>{
 const css=get('src/rivo-polish-04566.css');
 for(const selector of [
  '.rivo-id-overlay','.rivo-code-overlay','.rivo-plate-overlay',
  '.rivo-release-overlay','.rivo-merged-overlay','.rivo-edge-adjust-overlay',
  '.rivo-editor-overlay','.rivo-pages-overlay','.rivo-shield-overlay',
  '.rivo-perfectscan-overlay','.rivo-perfect-capture-overlay',
  '.rivo-viewer-layer','.doc-detail-overlay','.bulk-overlay',
  '.rivo-reward-overlay','.rivo-update-gate','.rivo-ad-launch-loading','.busy'
 ])assert.ok(css.includes(selector),'Unprotected overlay: '+selector);
 assert.match(css,/bottom:var\(--rivo-content-bottom,98px\)!important/);
 assert.match(css,/height:auto!important/);
 const main=get('src/main.js');
 assert.ok(main.includes("import './rivo-polish-04566.css';"));
 const ads=get('src/monetization.js');
 assert.match(ads,/function bannerObstructed\(\)\{[\s\S]*?return false;/);
 assert.match(get('src/rivo-ui-04567.css'),/\.rivo-id-overlay/);
});

test('back buttons animate with reduced-motion support and save dialog contrast',()=>{
 const css=get('src/rivo-polish-04566.css');
 assert.match(css,/rivo-back-soft-glow/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/\.busy-inner p\{color:#345779/);
});

test('document file badges survive a native thumbnail replacing fallback icon',()=>{
 const main=get('src/main.js');
 // 0.45.44 My Documents hides the badge while Home retains its typed file badge.
 assert.equal(main.split('class="rivo-file-kind-badge"').length-1,1);
 const myDocs=main.slice(main.indexOf('function renderLibraryRows('),main.indexOf('function libraryWorkspace('));
 assert.doesNotMatch(myDocs,/rivo-file-kind-badge/);
 assert.match(myDocs,/data-thumb-uri=/);
 assert.match(main,/if\(typeBadge\)el\.append\(typeBadge\)/);
 assert.match(main,/code:'PLATE',klass:'plate'/);
 assert.match(main,/const fields=\[visualFileType\(doc\)\.code,formatSize/);
});

test('ID Photo Maker offers actual camera and preview-based image picker',()=>{
 const id=get('src/id-photo-maker.js');
 assert.match(id,/Camera\.getPhoto/);
 assert.match(id,/source:CameraSource\.Camera/);
 assert.match(id,/workspace\.dock\.append\(leftRail,rightRail,input\)/);
 assert.match(id,/input\.className='rivo-id-native-file-picker'/);
});
test('book scan empty preview has functional photo/import actions',()=>{
 const book=get('src/book-split.js');
 assert.match(book,/rivo-book-empty-actions/);
 assert.match(book,/if\(photos\)await loadCaptured\(photos\)/);
 assert.match(book,/emptyActions\.hidden=true/);
});
