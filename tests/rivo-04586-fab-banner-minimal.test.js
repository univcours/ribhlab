import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cameraFabDecision,CAMERA_BLOCKING_OVERLAYS,CAMERA_ALLOWED_ROUTES} from '../src/floating-camera-controller.js';
import {describeBanner,classifyBannerError,BANNER_STATUSES} from '../src/banner-diagnostics.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const main=read('src/main.js'),css=read('src/rivo-minimal-premium-04586.css');
const ads=read('src/monetization.js');

test('Documents duplicate Import Images removed; legitimate universal Import retained',()=>{
 assert.ok(main.includes('data-import="file"'));
 assert.ok(!main.includes('data-import-images'));
 assert.ok(main.includes('chooseLibraryFiles(el.dataset.import)'));
 assert.ok(main.includes('function chooseLibraryFiles('));
 assert.ok(main.includes('rivo-nav-scan')); // user explicitly says Scan is not the duplicate
 assert.ok(main.includes('data-live-camera'));
 assert.ok(!main.includes('data-inapp-back'));
 assert.ok(!main.includes('rivo-header-back'));
});
test('camera FAB is governed by central application state, never split CSS hacks',()=>{
 assert.ok(main.includes("import {createFloatingCameraController} from './floating-camera-controller.js'"));
 assert.ok(main.includes('floatingCameraController.install()'));
 assert.ok(main.includes('floatingCameraController?.schedule()'));
 assert.ok(main.includes("import './rivo-minimal-premium-04586.css'"));
 assert.deepEqual(CAMERA_ALLOWED_ROUTES,['home','library','tools']);
 for(const route of CAMERA_ALLOWED_ROUTES)assert.deepEqual(cameraFabDecision({route}),{visible:true,reason:'idle'});
 const disallow=[
  {route:'home',modal:true},{route:'home',nativeCapture:true},{route:'library',selection:true},
  {route:'tools',busy:true},{route:'home',permission:true},{route:'home',external:true},
  {route:'home',keyboard:true},{route:'home',foreground:false},{route:'home',bannerCollision:true},
  {route:'scan'},{route:'barcode'},{route:'ocr'},{route:'me'}
 ];
 for(const item of disallow)assert.equal(cameraFabDecision(item).visible,false,JSON.stringify(item));
 for(const className of ['.rivo-code-overlay','.rivo-plate-overlay','.rivo-live-overlay','.rivo-editor-overlay','.rivo-shield-overlay','.rivo-perfectscan-overlay'])
  assert.ok(CAMERA_BLOCKING_OVERLAYS.includes(className),className);
});
test('Phosphor Minimal Premium removes neon/gloss and FAB cannot cover native ad',()=>{
 assert.match(css,/background:#f8fbff!important/);
 assert.match(css,/animation:none!important/);
 assert.match(css,/button\.rivo-camera-fab\[hidden\]/);
 assert.match(css,/bottom:calc\(var\(--rivo-content-bottom,95px\) \+ 13px\)!important/);
 assert.match(css,/\.rivo-ad-banner-slot/);
 assert.match(css,/svg\[data-phosphor-icon\]/);
 assert.ok(main.includes('rivo-file-actions-unclipped-04585.css'));
});
test('AdMob classifies real SDK states; a loaded banner is not proof of visible impression',()=>{
 for(const status of ['NO_FILL','NETWORK_ERROR','SDK_ERROR','HIDDEN_BY_LAYOUT','DISPLAYED','CONSENT_PENDING'])
  assert.ok(BANNER_STATUSES.includes(status),status);
 assert.equal(classifyBannerError('No fill (error code: 3)'),'NO_FILL');
 assert.equal(classifyBannerError('Network timeout'),'NETWORK_ERROR');
 assert.equal(classifyBannerError('invalid Ad Unit ID'),'SDK_ERROR');
 const ready={android:true,enabled:true,initialized:true,consent:true};
 assert.equal(describeBanner({...ready,loading:true}).status,'REQUESTING');
 assert.equal(describeBanner({...ready,loaded:true}).status,'DISPLAYED');
 assert.equal(describeBanner({...ready,loaded:true}).verifiedOnDevice,false);
 assert.equal(describeBanner({...ready,layoutValid:false,layoutReason:'No room'}).status,'HIDDEN_BY_LAYOUT');
 assert.equal(describeBanner({...ready,bannerError:'No fill'}).status,'NO_FILL');
 assert.equal(describeBanner({...ready,bannerError:'network error'}).status,'NETWORK_ERROR');
 assert.equal(describeBanner({...ready,foreground:false}).status,'PAUSED');
 assert.equal(describeBanner({...ready,consent:false}).status,'CONSENT_PENDING');
 assert.ok(ads.includes('getBannerDiagnostics()'));
 assert.ok(ads.includes('BannerAdPluginEvents.FailedToLoad'));
 assert.ok(ads.includes('BannerAdPluginEvents.AdImpression'));
 assert.ok(ads.includes('rivo:banner-layout'));
 assert.ok(main.includes('rivo-banner-live-diagnostics'));
});
test('file selection, Android external opener and scanner features are preserved',()=>{
 assert.ok(main.includes('data-doc-external'));
 assert.ok(!main.includes('createDocumentViewer'));
 assert.ok(main.includes('data-doc-rename'));
 assert.ok(main.includes('data-doc-share'));
 assert.ok(main.includes('data-doc-delete'));
 assert.ok(main.includes("DocumentScanner.scanDocument("));
 assert.ok(main.includes('openBarcodeScanner({'));
 assert.ok(main.includes('openPlateScanner({'));
 assert.ok(read('src/library-bulk.js').includes('function toolbar()'));
 assert.ok(read('rivoscan-version.properties').includes('versionCode=203'));
 assert.equal(JSON.parse(read('package.json')).version,'0.45.88');
});
