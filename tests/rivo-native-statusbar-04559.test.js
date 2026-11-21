import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('native system Status Bar uses readable dark OS icons on the existing light background',()=>{
 const ps=get('install-live-scanner.ps1');
 assert.match(ps,/WindowCompat\.setDecorFitsSystemWindows\(getWindow\(\), false\)/);
 assert.match(ps,/getWindow\(\)\.clearFlags\(WindowManager\.LayoutParams\.FLAG_FULLSCREEN\)/);
 assert.match(ps,/private void restoreVisibleNativeStatusBar\(\)/);
 assert.match(ps,/WindowCompat\.getInsetsController\(getWindow\(\), decor\)/);
 assert.match(ps,/controller\.setAppearanceLightStatusBars\(true\)/);
 assert.match(ps,/controller\.show\(WindowInsetsCompat\.Type\.statusBars\(\)\)/);
 assert.match(ps,/<item name="android:windowLightStatusBar">true<\/item>/);
 assert.match(ps,/<item name="android:statusBarColor">#E9F5FB<\/item>/);
 assert.match(ps,/content\.setBackgroundColor\(Color\.rgb\(233,245,251\)\)/);
 assert.match(ps,/ViewCompat\.setOnApplyWindowInsetsListener\(content/);
 assert.ok(ps.indexOf('super.onCreate(savedInstanceState);')<ps.indexOf('        restoreVisibleNativeStatusBar();'),'system icon tint must be applied AFTER bridge setup');
});
test('system status icons get restored after app resume or camera returns focus',()=>{
 const ps=get('install-live-scanner.ps1');
 assert.match(ps,/content\.post\(this::restoreVisibleNativeStatusBar\)/);
 assert.match(ps,/@Override public void onResume\(\)\s*\{\s*super\.onResume\(\);\s*restoreVisibleNativeStatusBar\(\);/);
 assert.match(ps,/@Override public void onWindowFocusChanged\(boolean hasFocus\)\s*\{\s*super\.onWindowFocusChanged\(hasFocus\);\s*if\(hasFocus\) restoreVisibleNativeStatusBar\(\);/);
 assert.match(ps,/int bottom = Math\.max\(bars\.bottom, keyboard\.bottom\)/);
 assert.match(ps,/View\.SYSTEM_UI_FLAG_FULLSCREEN/);
 assert.match(ps,/View\.SYSTEM_UI_FLAG_IMMERSIVE_STICKY/);
 assert.match(ps,/<item name="android:windowFullscreen">false<\/item>/);
 assert.doesNotMatch(ps,/FLAG_FULLSCREEN\);[\s\S]*getWindow\(\)\.addFlags\(WindowManager\.LayoutParams\.FLAG_FULLSCREEN\)/);
});
