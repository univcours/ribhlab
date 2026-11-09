import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('actual Material 3 Compose launcher presents Figma Home, Tools and Settings',()=>{
 const kt=read('native/android/RivoComposeActivity.kt');
 for(const name of ['class RivoComposeActivity : ComponentActivity()',
   'setContent {','MaterialTheme(colorScheme = RivoColors)',
   'RivoShell(onAction = ::openExistingFeature)',
   'NavigationBar(','HomeContent(','ToolContent(','SettingsContent(',
   'Scan a document','QR / Barcode','From gallery','Quick actions',
   'Recent files','All tools','Scan quality','Privacy & storage']){
   assert.ok(kt.includes(name),name);
 }
 // Example Figma filenames are NOT actual customer documents.
 assert.ok(!kt.includes('Invoice_2026.pdf'));
 assert.ok(kt.includes('View actual saved files on this device'));
});

test('native action IDs match existing PDF and scanner implementations',()=>{
 const kt=read('native/android/RivoComposeActivity.kt');
 const js=read('src/main.js');
 const hub=read('src/tools-hub.js');
 const actualIds=['merge','sign','compress','images'];
 for(const id of actualIds){
   assert.ok(kt.includes('"tool:'+id+'"'),id);
   assert.ok(js.includes("id:'"+id+"'"),id);
 }
 for(const id of ['scanCode','managePages','toWord']){
   assert.ok(hub.includes(id),id);
 }
 for(const route of ['scan','qr','gallery','library','tools','settings',
    'category:convert','hub:managePages']){
   assert.ok(kt.includes('"'+route+'"'),route);
 }
 assert.ok(js.includes('window.rivoNativeRoute=(route)=>'));
 assert.ok(js.includes('RivoUIBridge.consumeRoute().then'));
 assert.ok(js.includes('RivoUIBridge.openNativeHome()'));
});

test('generated Android launcher is Kotlin Compose, exactly one icon, and idempotent on resync',()=>{
 const ps=read('install-live-scanner.ps1');
 const main=read('native/android/MainActivity.kt');
 const plugin=read('native/android/RivoUIBridgePlugin.kt');
 const installer=read('install-rivoscan-android.ps1');
 assert.ok(ps.includes("RivoComposeActivity.kt"));
 assert.ok(ps.includes("RivoUIBridgePlugin.kt"));
 assert.ok(ps.includes("android:name=\".RivoComposeActivity\""));
 assert.ok(ps.includes('Expected one existing MainActivity launcher filter.')===false);
 assert.ok(ps.includes('Compose launch') || ps.includes('Compose'));
 assert.ok(ps.includes('$launcherFilters.Count -eq 0 -and $composeAlreadyLauncher'));
 assert.ok(ps.includes('android.intent.category.LAUNCHER'));
 assert.ok(installer.includes('com.ribhlab.rivoscan.debug/com.ribhlab.rivoscan.RivoComposeActivity'));
 assert.ok(main.includes('registerPlugin(RivoUIBridgePlugin::class.java)'));
 assert.ok(main.includes('override fun onNewIntent'));
 assert.ok(plugin.includes('fun consumeRoute(call: PluginCall)'));
 assert.ok(plugin.includes('fun openNativeHome(call: PluginCall)'));
 assert.ok(plugin.includes('removeExtra(RIVO_NATIVE_ROUTE)'));
});

test('Compose compiler aligns with existing Kotlin and API 36 Android build',()=>{
 const p=read('install-live-scanner.ps1');
 assert.ok(p.includes("org.jetbrains.kotlin:kotlin-gradle-plugin:2.3.10"));
 assert.ok(p.includes("org.jetbrains.kotlin:compose-compiler-gradle-plugin:2.3.10"));
 assert.ok(p.includes("apply plugin: 'org.jetbrains.kotlin.plugin.compose'"));
 assert.ok(p.includes('buildFeatures { compose true }'));
 assert.ok(p.includes('androidx.compose:compose-bom:2026.04.01'));
 assert.ok(p.includes('androidx.compose.material3:material3'));
 assert.ok(p.includes('androidx.activity:activity-compose:1.11.0'));
});

test('web fallback and dialog/pager CSS match approved Figma light Material 3',()=>{
 const css=read('src/rivoscan-premium-native.css');
 assert.ok(css.includes('--rivo-premium-bg:#f7f9fd'));
 assert.ok(css.includes('--rivo-premium-blue:#225be8'));
 assert.ok(css.includes('color-scheme:light'));
 assert.ok(!css.includes('--rivo-premium-bg:#031022'));
 for(const selector of ['.rivo-pages-modal','.rivo-pages-bottom>.rivo-pages-save',
  '.rivo-code-dialog','.rivo-editor-window','.doc-detail-overlay',
  '.bulk-sheet','.rivo-v2-me .settings-row','.rivo-v2-documents',
  '.rivo-tools-hub .rivo-hub-tile'])assert.ok(css.includes(selector),selector);
 assert.ok(css.includes('grid-template-columns:repeat(5,minmax(0,1fr))'));
 assert.ok(css.includes('overflow-y:auto!important'));
});
