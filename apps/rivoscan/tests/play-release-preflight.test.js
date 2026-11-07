import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {inspectSource,parseVersions,verifyBundle} from '../scripts/play-release-preflight.mjs';
const fixture=()=>({
 packageJson:{version:'0.44.18',private:true},
 capacitor:{appId:'com.ribhlab.rivoscan',appName:'RivoScan'},
 properties:'versionCode=94\nversionName=0.44.18',
 privacyPolicy:'com.ribhlab.rivoscan PDF documents. Google AdMob ads and optional OpenAI AI.'
});
test('Current package, privacy and Android version are coherent',()=>{
 const result=inspectSource(fixture());
 assert.equal(result.ok,true);
 assert.equal(result.versionCode,94);
});
test('Accidental Android appId change is blocked',()=>{
 const f=fixture();f.capacitor.appId='com.example.debug';
 assert.equal(inspectSource(f).ok,false);
});
test('Android and npm version drift is blocked',()=>{
 const f=fixture();f.properties='versionCode=94\nversionName=0.44.17';
 assert.match(inspectSource(f).errors.join(' '),/version mismatch/);
});
test('Regressed Android versionCode is blocked',()=>{
 const f=fixture();f.properties='versionCode=93\nversionName=0.44.18';
 assert.match(inspectSource(f).errors.join(' '),/regressed/);
});
test('Duplicate Android version keys throw',()=>{
 assert.throws(()=>parseVersions('versionCode=94\nversionCode=95'),/Duplicate/);
});
test('Ads and optional AI provider require honest privacy disclosures',()=>{
 const f=fixture();f.privacyPolicy='com.ribhlab.rivoscan PDF documents';
 assert.ok(inspectSource(f).errors.some(e=>e.includes('AdMob')));
 assert.ok(inspectSource(f).errors.some(e=>e.includes('cloud AI')));
});
test('Missing Android bundle cannot pass as uploaded release',()=>{
 assert.equal(verifyBundle('/nonexistent-rivoscan.aab').ok,false);
});
test('Damaged AAB fails even when it has .aab extension',()=>{
 const dir=mkdtempSync(join(tmpdir(),'rivo-test-'));
 try{
  const file=join(dir,'broken.aab');writeFileSync(file,Buffer.alloc(110000));
  const result=verifyBundle(file,{run:()=>({status:1,stdout:'',stderr:'broken'})});
  assert.equal(result.ok,false);
  assert.ok(result.errors.some(x=>x.includes('ZIP integrity')));
 }finally{rmSync(dir,{recursive:true,force:true})}
});
test('Unsigned ZIP cannot pass signed Play release gate',()=>{
 const dir=mkdtempSync(join(tmpdir(),'rivo-test-'));
 try{
  const file=join(dir,'unsigned.aab');writeFileSync(file,Buffer.alloc(110000));
  const run=(cmd,args)=>{
   if(cmd==='unzip'&&args[0]==='-t')return {status:0,stdout:'OK'};
   if(cmd==='unzip')return {status:0,stdout:'BundleConfig.pb\nbase/manifest/AndroidManifest.xml\nbase/dex/classes.dex\n'};
   return {status:0,stdout:'jar is unsigned'};
  };
  assert.match(verifyBundle(file,{expectSigned:true,run}).errors.join(' '),/not signed/);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
