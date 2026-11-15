import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deviceLanguage,effectiveLanguage,savedLanguagePreference,isAutoLanguage,initialLanguage} from '../src/locale-auto.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}};
test('uses the telephone language automatically and English if unsupported',()=>{
 assert.equal(initialLanguage(null,['ar-MA','fr-FR']),'ar');
 assert.equal(initialLanguage(null,['fr-CA']),'fr');
 assert.equal(initialLanguage(null,['ja-JP']),'en');
 assert.equal(initialLanguage(null,[]),'en');
 assert.equal(deviceLanguage(['es-MX','en-US']),'es');
 assert.equal(effectiveLanguage({browserLanguages:['it-IT'],androidLanguage:'de-DE'}),'de');
 assert.equal(effectiveLanguage({browserLanguages:['it-IT'],androidLanguage:'ja-JP'}),'en');
});
test('explicit language wins over Android and survives changing phone language',()=>{
 const s=storage();
 assert.equal(isAutoLanguage(s),true);
 s.setItem('rivo-language','en');
 assert.equal(isAutoLanguage(s),false);
 assert.equal(savedLanguagePreference(s),'en');
 assert.equal(effectiveLanguage({saved:savedLanguagePreference(s),androidLanguage:'ar-MA'}),'en');
 s.setItem('rivo-language','fr');
 assert.equal(effectiveLanguage({saved:savedLanguagePreference(s),androidLanguage:'de-DE'}),'fr');
 s.removeItem('rivo-language');
 assert.equal(isAutoLanguage(s),true);
 assert.equal(effectiveLanguage({saved:savedLanguagePreference(s),androidLanguage:'ar-MA'}),'ar');
});
test('both controls expose automatic language and Native Android device locale is checked',()=>{
 const main=read('src/main.js'),java=read('native/android/RivoDocumentsPlugin.java');
 assert.ok(main.includes('id="header-language"'));
 assert.ok(main.includes('value="auto"'));
 assert.ok(main.includes('getDeviceLanguage()'));
 assert.ok(main.includes('publishNativeLanguage()'));
 assert.ok(main.includes("localStorage.removeItem('rivo-language')"));
 assert.ok(main.includes("localStorage.setItem('rivo-language',language)"));
 assert.ok(java.includes('public void getDeviceLanguage(PluginCall call)'));
 assert.ok(java.includes('getConfiguration().getLocales()'));
});
test('Arabic native scanner text excludes colloquial Moroccan phrases',()=>{
 const native=read('native/android/RivoLocale.java');
 for(const phrase of ['كنختارو','ديال','غادي','ما كايناش','حط الوثيقة','رتايك','اختار التحسين','المعاينة ما خداماش']){
  assert.equal(native.includes(phrase),false,phrase);
 }
});
