import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('premium UI is the final active stylesheet for all screens',()=>{
 const main=read('src/main.js');
 const imports=[...main.matchAll(/import ['"](.+?\.css)['"];?/g)].map(m=>m[1]);
 assert.equal(imports.at(-1),'./rivoscan-premium-native.css');
 const css=read('src/rivoscan-premium-native.css');
 for(const name of ['--rivo-premium-bg','#app .rivo-scan-first .rivo-scan-mode',
  '#app .rivo-tools-hub .rivo-hub-tile','#app .rivo-v2-me .settings-row',
  '.rivo-code-dialog','.bulk-sheet','.rivo-editor-window','.rivo-pages-modal',
  '.doc-detail-overlay','#app .rivo-dark-ui .mobilebar']){
  assert.ok(css.includes(name),name);
 }
});
test('dashboard hero matches Scan Document plus QR and every shortcut performs real work',()=>{
 const js=read('src/main.js');
 const home=js.slice(js.indexOf('function home(){'),js.indexOf('function toolsWorkspace(){'));
 const css=read('src/rivoscan-premium-native.css');
 // The two hero buttons interpolate their action attributes from the
 // scanner model rather than embedding them directly in the HTML template.
 const scan=read('src/scanner-first-model.js');
 assert.ok(scan.includes("attribute:'data-live-camera'"));
 assert.ok(scan.includes('data-import="image"'));
 assert.ok(home.includes("attribute:quickScanActions[0].attribute"));
 assert.ok(home.includes("attribute:quickScanActions[3].attribute"));
 for(const action of ['data-hub-action="scanCode"','data-open-library',
    'data-category="convert"','data-tool="merge"'])
   assert.ok(home.includes(action),action);
 assert.ok(home.includes('rivo-scan-more-tools">'),'secondary tools begin collapsed');
 assert.ok(home.includes('featuredScanModes'));
 assert.ok(home.includes('rivo-scan-mode-qr'));
 assert.ok(css.includes('.rivo-scan-mode-qr'));
 assert.ok(js.includes("document.querySelectorAll('[data-hub-action]')"));
 assert.ok(js.includes("document.querySelectorAll('[data-import]')"));
});
test('page manager actions are compact, no clipped bottom row and reachable Save PDF',()=>{
 const css=read('src/rivoscan-premium-native.css');
 const page=read('src/page-manager.js');
 assert.ok(css.includes('grid-template-columns:repeat(5,minmax(0,1fr))'));
 assert.ok(css.includes('.rivo-pages-bottom>.rivo-pages-save'));
 assert.ok(page.includes('class="rivo-pages-save" data-page-action="save"'));
 assert.ok(page.includes('pages.some(x=>x.removed)'));
 assert.ok(page.includes('i===0||p.removed'));
 assert.ok(page.includes("if(action==='select'&&p&&!p.removed)"));
});
test('typed file cards have their intended icons in premium palette',()=>{
 const css=read('src/rivoscan-premium-native.css');
 const main=read('src/main.js');
 for(const extension of ['ppt','pdf','doc','xls','zip','image']){
  assert.ok(css.includes('.rivo-file-'+extension),extension);
 }
 for(const icon of ['file-slide','file-pdf','file-doc','file-sheet','file-zip']){
  assert.ok(main.includes("icon:'"+icon+"'"),icon);
 }
 assert.ok(main.includes("data-rivo-thumb"));
});
test('Android host compiles Kotlin under explicit JVM target and preserves plugins',()=>{
 const kt=read('native/android/MainActivity.kt');
 const install=read('install-live-scanner.ps1');
 const repair=read('repair-rivoscan-android.ps1');
 assert.ok(kt.includes('class MainActivity : BridgeActivity()'));
 for(const native of ['RivoLiveScannerPlugin','RivoDocumentsPlugin','RivoUVDocPlugin','RivoSurface3DPlugin'])
  assert.ok(kt.includes('registerPlugin('+native+'::class.java)'),native);
 assert.ok(kt.includes('WindowInsetsCompat.Type.statusBars()'));
 assert.ok(install.includes("org.jetbrains.kotlin:kotlin-gradle-plugin:2.3.10"));
 assert.ok(install.includes('JvmTarget.JVM_21'));
 assert.ok(install.includes("MainActivity.java"));
 assert.ok(install.includes('Remove-Item -LiteralPath $obsoleteMain -Force'));
 assert.ok(repair.includes('MainActivity.kt'));
});
test('the native CameraX screen uses real Kotlin premium materials and shared color tokens',()=>{
 const kotlin=read('native/android/RivoPremiumChrome.kt');
 const native=read('native/android/RivoLiveScannerActivity.java');
 const install=read('install-live-scanner.ps1');
 assert.ok(kotlin.includes('object RivoPremiumChrome'));
 assert.ok(kotlin.includes('@JvmField val NAVY: Int'));
 assert.ok(kotlin.includes('fun styleTouchTarget(label: TextView)'));
 assert.ok(kotlin.includes('fun stylePrimaryButton(label: TextView)'));
 for(const token of ['RivoPremiumChrome.styleTouchTarget(label)',
   'RivoPremiumChrome.styleSurface(root)','RivoPremiumChrome.styleToolbar(footer)',
   'RivoPremiumChrome.stylePrimaryButton(done)'])
   assert.ok(native.includes(token),token);
 assert.ok(install.includes("RivoPremiumChrome.kt"));
});
test('new screens retain accessible controls and respect reduced motion',()=>{
 const css=read('src/rivoscan-premium-native.css');
 const js=read('src/main.js');
 assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
 assert.ok(css.includes('button:focus-visible'));
 assert.ok(css.includes('button:disabled'));
 assert.ok(js.includes('data-live-camera'));
 assert.ok(js.includes('data-hub-action'));
 assert.ok(js.includes('data-open-library'));
});
