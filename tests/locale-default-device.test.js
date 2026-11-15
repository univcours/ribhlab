import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 deviceLanguage,savedLanguagePreference,initialLanguage,
 effectiveLanguage,isAutoLanguage,supportedRivoLanguages
} from '../src/locale-auto.js';

function storage(){
 const values=new Map();
 return {
  getItem:k=>values.get(k)??null,
  setItem:(k,v)=>values.set(k,v),
  removeItem:k=>values.delete(k)
 };
}

test('English is the safe default when primary device language is unsupported or unknown',()=>{
 assert.equal(deviceLanguage([]),'en');
 assert.equal(deviceLanguage(['ja-JP']),'en');
 assert.equal(deviceLanguage(['ja-JP']),'en');
 assert.equal(deviceLanguage(['zh-CN']),'en');
 assert.equal(initialLanguage(null,['xx-XX']),'en');
});
test('first supported phone locale determines language, including region variants',()=>{
 for(const [locale,expected] of [
  ['ar-MA','ar'],['en-US','en'],['fr-MA','fr'],['es-ES','es'],
  ['de-DE','de'],['pt-BR','pt'],['it-IT','it']
 ])assert.equal(deviceLanguage([locale]),expected,locale);
 assert.equal(new Set(supportedRivoLanguages).size,7);
});
test('explicit user choice overrides device locale until auto is selected again',()=>{
 const store=storage();
 assert.equal(isAutoLanguage(store),true);
 assert.equal(initialLanguage(savedLanguagePreference(store),['ar-MA']),'ar');
 store.setItem('rivo-language','de');
 assert.equal(isAutoLanguage(store),false);
 assert.equal(initialLanguage(savedLanguagePreference(store),['ar-MA']),'de');
 assert.equal(effectiveLanguage({saved:savedLanguagePreference(store),browserLanguages:['fr-FR'],androidLanguage:'ar-MA'}),'de');
 store.removeItem('rivo-language');
 assert.equal(isAutoLanguage(store),true);
 assert.equal(effectiveLanguage({saved:savedLanguagePreference(store),browserLanguages:['fr-FR'],androidLanguage:'ar-MA'}),'ar');
});
test('native Android device locale is authoritative over the WebView browser locale',()=>{
 assert.equal(effectiveLanguage({saved:null,browserLanguages:['en-US'],androidLanguage:'fr-FR'}),'fr');
 assert.equal(effectiveLanguage({saved:null,browserLanguages:['fr-FR'],androidLanguage:'zh-CN'}),'en');
 assert.equal(effectiveLanguage({saved:null,browserLanguages:['ar-MA']}),'ar');
});
test('interface has visible Automatic setting and native language is refreshed on resume',()=>{
 const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const java=readFileSync(new URL('../native/android/RivoDocumentsPlugin.java',import.meta.url),'utf8');
 assert.ok(source.includes('initialLanguage(savedLanguagePreference(localStorage),browserLanguages())'));
 assert.ok(source.includes('void refreshSystemLanguage()'));
 assert.ok(source.includes("localStorage.removeItem('rivo-language')"));
 assert.ok(source.includes("localStorage.setItem('rivo-language',language)"));
 assert.ok(source.includes("RivoDocuments.getDeviceLanguage()"));
 assert.ok(source.includes("chosen==='auto'"));
 assert.ok(source.includes("appStateChange"));
 assert.ok(java.includes('public void getDeviceLanguage(PluginCall call)'));
});
