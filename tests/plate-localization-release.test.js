import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hubLabel} from '../src/tools-hub.js';
const get=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Plate Scanner labels and camera messages follow all seven app locales',()=>{
 const title={en:'Plate Scanner',ar:'قارئ اللوحات',fr:'Lecteur de plaques',
  es:'Lector de matrículas',de:'Kennzeichenleser',
  pt:'Leitor de matrículas',it:'Lettore targhe'};
 const main=get('src/main.js'),plate=get('src/plate-scanner.js'),
  updates=get('src/play-updates.js');
 for(const [lang,label] of Object.entries(title)){
  assert.equal(hubLabel(lang,'plateScanner'),label);
  for(const source of [main,plate,updates])
   assert.match(source,new RegExp('\\n '+lang+':\\{'),lang+' missing locale');
  assert.ok(plate.includes(label),lang+' missing plate dialog title');
 }
 assert.match(main,/featureText\(f\.label\)/);
 assert.match(main,/compactFeatureLabel\(f\.id\)/);
 assert.doesNotMatch(plate,/Moroccan Plate Scanner|قارئ لوحات السيارات المغربية|Scanner des plaques marocaines/);
});
test('New release only increases 0.45.43 original Play version without removing local files',()=>{
 const version=get('rivoscan-version.properties');
 assert.match(version,/^versionCode=158$/m);
 assert.match(version,/^versionName=0\.45\.54$/m);
 assert.equal(JSON.parse(get('package.json')).version,'0.45.54');
 const main=get('src/main.js');
 assert.ok(main.includes('createScanLedger'));
 assert.ok(main.includes('loadLibrary'));
 assert.ok(main.includes("readScanPrefs"));
 assert.ok(!main.includes('launchPerfectScan('));
});
