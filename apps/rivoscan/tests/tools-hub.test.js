import test from 'node:test';
import assert from 'node:assert/strict';
import {toolGroups,hubSpecial,hubGroupLabel,hubLabel,hubLanguages} from '../src/tools-hub.js';

const kept=['idcard','idPhotoMaker','scanCode','plateScanner','photoTranslation','formulaOcr','ocr','bookScan',
 'toWord','toWordTables','toExcel','toPptEditable','pdftoimages','images','extractText',
 'sign','watermark','enhance','manualErase','merge','bundle','managePages','lockPdf','compress','metadata','numbers','text',
 'peerTransfer','shareFiles'];
const hidden=['documentFlatten','slideScan','whiteboard','timestamp','importImages','importFiles',
 'toCSV','toPpt','pdfLong','restorePhoto','eraseColoredMarks','eraseLightWatermark',
 'split','reorder','rotate','delete','aiChat','solverAI','countCam','printPdf'];

test('Tools shows only useful categories without duplicated import/print actions',()=>{
 assert.deepEqual(toolGroups.map(g=>g.id),['scan','convert','edit','utilities']);
 const entries=toolGroups.flatMap(g=>g.entries);
 assert.equal(entries.length,29);
 assert.equal(entries.length,new Set(entries).size);
 assert.deepEqual(new Set(entries),new Set(kept));
 for(const id of hidden){
  assert.ok(!entries.includes(id),id+' must not be a separate tile');
 }
 for(const id of ['scanCode','plateScanner','toWord','toExcel','managePages','bookScan','lockPdf','photoTranslation']){
  assert.ok(entries.includes(id),id+' is a core feature that must remain visible');
 }
});
test('Hidden tiles do not destroy reversible feature implementations',()=>{
 for(const id of ['documentFlatten','slideScan','whiteboard','toCSV','toPpt','pdfLong','restorePhoto',
 'eraseColoredMarks','eraseLightWatermark','countCam','aiChat','solverAI','printPdf'])
  assert.ok(hubSpecial[id],id+' must remain recoverable in source');
});
test('Visible categories are correctly translated despite removed Import tab',()=>{
 const expected={
  en:['Scan','Convert','Edit','Utilities'],
  ar:['المسح','التحويل','التعديل','أدوات إضافية'],
  fr:['Scanner','Convertir','Modifier','Utilitaires']
 };
 for(const [lang,labels] of Object.entries(expected)){
  assert.deepEqual(toolGroups.map(g=>hubGroupLabel(lang,g.id)),labels);
 }
 for(const lang of hubLanguages()){
  for(const g of toolGroups)assert.ok(hubGroupLabel(lang,g.id));
  for(const id of kept)assert.ok(hubLabel(lang,id));
 }
});
test('Preserved conversion implementations remain distinguishable',()=>{
 assert.equal(hubSpecial.toCSV.format,'csv');
 assert.equal(hubSpecial.toExcel.format,'xlsx');
 assert.equal(hubSpecial.toPpt.format,'pptx');
 assert.equal(hubSpecial.toPptEditable.format,'editablePptx');
});
