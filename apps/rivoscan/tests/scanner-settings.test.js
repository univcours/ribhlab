import test from 'node:test';
import assert from 'node:assert/strict';
import {
 DEFAULT_SCAN_PREFS,SCAN_PREF_KEY,SCAN_PREF_FIELDS,
 normalizeScanPrefs,readScanPrefs,updateScanPref,scanPrefsText,
 formatScanSettingValue
} from '../src/scanner-settings.js';

const memory=()=>{
 const items=new Map();
 return {getItem:k=>items.get(k)??null,setItem:(k,v)=>items.set(k,v)};
};
test('Scanner defaults preserve documents with one-tap auto-clean',()=>{
 const prefs=normalizeScanPrefs();
 assert.equal(prefs.autoClean,true);
 assert.equal(prefs.keepOriginal,true);
 assert.equal(prefs.enhancement,'auto');
 assert.equal(prefs.jpegQuality,94);
 assert.equal(prefs.pageSize,'a4');
 assert.equal(prefs.autoSavePdf,true);
});
test('Persistent camera settings survive reload and reject invalid values',()=>{
 const store=memory();
 updateScanPref(store,'batch',true);
 updateScanPref(store,'jpegQuality',88);
 updateScanPref(store,'enhancement','shadow');
 updateScanPref(store,'pdfQuality',0.95);
 updateScanPref(store,'pageSize','letter');
 assert.equal(JSON.parse(store.getItem(SCAN_PREF_KEY)).jpegQuality,88);
 assert.deepEqual({...readScanPrefs(store)},{
  ...DEFAULT_SCAN_PREFS,batch:true,jpegQuality:88,enhancement:'shadow',pdfQuality:0.95,pageSize:'letter'
 });
 assert.throws(()=>updateScanPref(store,'jpegQuality',4),/Unsupported/);
 assert.throws(()=>updateScanPref(store,'arbitrary','value'),/Unknown/);
 const pref=readScanPrefs(store);
 assert.equal(pref.jpegQuality,88);
});
test('Malformed storage falls back safely without disabling backups',()=>{
 const bad={getItem:()=>'{broken json'};
 assert.deepEqual(readScanPrefs(bad),{...DEFAULT_SCAN_PREFS});
 assert.deepEqual(normalizeScanPrefs({autoClean:'false',keepOriginal:0,enhancement:'delete',jpegQuality:400}),{...DEFAULT_SCAN_PREFS});
});
test('All requested scanner controls have labels and finite options in seven languages',()=>{
 for(const lang of ['en','ar','fr','es','de','pt','it']){
  const dict=scanPrefsText(lang);
  for(const field of SCAN_PREF_FIELDS){
   assert.ok(dict[field.key],lang+' missing '+field.key);
   if(field.options)for(const value of field.options)assert.ok(formatScanSettingValue(lang,field.key,value));
  }
 }
});
