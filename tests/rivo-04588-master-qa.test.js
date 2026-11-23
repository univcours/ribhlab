import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cameraFabDecision,CAMERA_BLOCKING_OVERLAYS,nativeBannerBounds} from '../src/floating-camera-controller.js';
import {formatBannerError,classifyBannerError,describeBanner} from '../src/banner-diagnostics.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('FAB hides during every image scanner, including Book Scan, ID Photo, OCR and translation',()=>{
 for(const overlay of ['.rivo-id-overlay','.rivo-id-dialog','.rivo-code-overlay','.rivo-plate-overlay','.rivo-editor-overlay','.rivo-shield-overlay'])
  assert.ok(CAMERA_BLOCKING_OVERLAYS.includes(overlay),overlay);
 for(const state of [
  {route:'home',modal:true},{route:'home',nativeCapture:true},
  {route:'library',selection:true},{route:'tools',keyboard:true},
  {route:'home',bannerCollision:true},{route:'home',external:true}
 ]) assert.equal(cameraFabDecision(state).visible,false,JSON.stringify(state));
 assert.deepEqual(cameraFabDecision({route:'home'}),{visible:true,reason:'idle'});
 const main=read('src/main.js');
 const guard=main.slice(main.indexOf('async function captureMlkitDocumentPhoto(){'),
  main.indexOf('async function openHubAction(id){'));
 assert.match(guard,/nativeCaptureDepth\+\+/);
 assert.match(guard,/finally\{nativeCaptureDepth=Math.max\(0,nativeCaptureDepth-1\)/);
 assert.match(main,/openSmartScanner\([\s\S]*?nativeCaptureDepth\+\+/);
});
test('FAB checks REAL native Android ad rectangle instead of WebView banner placeholder',()=>{
 const rect=nativeBannerBounds({viewportWidth:393,viewportHeight:852,margin:110});
 assert.deepEqual(rect,{left:36.5,top:692,right:356.5,bottom:742,width:320,height:50});
 assert.equal(nativeBannerBounds({viewportWidth:393,viewportHeight:852,margin:NaN}),null);
 const source=read('src/floating-camera-controller.js');
 assert.match(source,/nativeBannerBounds\(/);
 assert.doesNotMatch(source,/querySelector\('#app \.rivo-ad-banner-slot'\)/);
});
test('AdMob errors show exact native codes and do not masquerade as missing ad inventory',()=>{
 assert.equal(formatBannerError({code:3,message:'ad unavailable'}),'AdMob code 3: ad unavailable');
 assert.equal(classifyBannerError({code:3,message:'ad unavailable'}),'NO_FILL');
 assert.equal(classifyBannerError({errorCode:2,message:'request failed'}),'NETWORK_ERROR');
 assert.equal(classifyBannerError({code:1,message:'invalid unit'}),'SDK_ERROR');
 const common={android:true,enabled:true,initialized:true,consent:true};
 assert.equal(describeBanner({...common,bannerError:'AdMob code 3: unavailable'}).status,'NO_FILL');
 assert.equal(describeBanner({...common,bannerError:'AdMob code 2: timeout'}).status,'NETWORK_ERROR');
 assert.equal(describeBanner({...common,loaded:true}).verifiedOnDevice,false);
 const ads=read('src/monetization.js');
 assert.match(ads,/adStats.lastBannerError=formatBannerError\(e\)/);
 assert.match(ads,/state.bannerError=formatBannerError\(error\)/);
});
test('latest code retains document selection, external opening, original signing and portrait mode',()=>{
 const main=read('src/main.js'),bulk=read('src/library-bulk.js');
 assert.match(main,/data-doc-external/);
 assert.doesNotMatch(main,/createDocumentViewer|docViewerUI/);
 assert.doesNotMatch(bulk,/function longPress\(|function wireLongPress\(/);
 assert.match(main,/renderSavedFileRow\(doc,index\)/);
 assert.match(main,/renderSavedFileRow\(item,index\)/);
 assert.match(read('rivoscan-version.properties'),/^versionCode=204$/m);
 assert.match(read('rivoscan-version.properties'),/^versionName=0\.45\.89$/m);
 assert.equal(JSON.parse(read('package.json')).version,'0.45.89');
});
