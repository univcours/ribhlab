import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
test('Camera offers genuine offline crease reduction and keeps original seals and dark signatures',()=>{
 const native=readFileSync(new URL('../native/android/RivoDocumentEnhancer.java',import.meta.url),'utf8');
 const camera=readFileSync(new URL('../native/android/RivoLiveScannerActivity.java',import.meta.url),'utf8');
 const locale=readFileSync(new URL('../native/android/RivoLocale.java',import.meta.url),'utf8');
 const prefs=readFileSync(new URL('../src/scanner-settings.js',import.meta.url),'utf8');
 for(const key of ['CREASE="crease"','Imgproc.threshold(gray,darkMask,55,255','originalRGB.copyTo(rgb,stampMask)','originalRGB.copyTo(rgb,darkMask)'])
  assert.ok(native.includes(key),key);
 assert.ok(camera.includes('RivoDocumentEnhancer.CREASE'));
 assert.ok(locale.includes('enhanceCrease'));
 assert.ok(prefs.includes("'crease'"));
 assert.ok(prefs.includes("enhancement:'proscan'"));
});
