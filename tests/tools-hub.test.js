import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {toolGroups,hubSpecial,hubGroupLabel,hubLabel,hubLanguages} from '../src/tools-hub.js';
import {mergedToolDefinitions,mergedToolOptions} from '../src/merged-tools.js';

const groups=toolGroups.flatMap(g=>g.entries);
test('RivoScan has nineteen unique high-value Tools, not repeated tiles for the same output',()=>{
 assert.deepEqual(toolGroups.map(g=>g.id),['scan','convert','edit','utilities']);
 assert.equal(groups.length,19);
 assert.equal(new Set(groups).size,19);
 for(const required of ['scanCode','plateScanner','ocr','bookScan','convertDocument','photoStudio',
 'combineFiles','managePages','annotatePdf','pdfPrivacy','perfectScanQuality','privacyShield','peerTransfer','shareFiles'])
  assert.ok(groups.includes(required),required+' stays accessible');
 for(const hidden of ['smartAutoCapture','toWord','toWordTables','toExcel','toCSV','toPpt','toPptEditable','images',
 'pdftoimages','pdfLong','extractText','manualErase','enhance','restorePhoto','eraseColoredMarks',
 'eraseLightWatermark','merge','bundle','sign','watermark','numbers','text','metadata','lockPdf'])
  assert.ok(!groups.includes(hidden),hidden+' is not a separate tile');
});
test('One converter exposes all original Word, Excel, CSV, PPT and PDF/Image variants',()=>{
 const expected=['toWord','toWordTables','toExcel','toCSV','toPptEditable','toPpt','images','pdftoimages','pdfLong','extractText'];
 assert.deepEqual(mergedToolDefinitions.convertDocument.choices,expected);
 for(const option of expected){
  const action=hubSpecial[option];
  if(action)assert.equal(action.type,'export');
 }
 const actions=mergedToolOptions('convertDocument','ar');
 assert.equal(actions.length,10);
 assert.ok(actions.every(o=>o.label&&o.action));
});
test('Photo Studio and Combine use the original functional editor and PDF+images composer',()=>{
 assert.deepEqual(hubSpecial.photoStudio,{icon:'image',color:'green',type:'photo',preset:'enhance'});
 assert.equal(hubSpecial.combineFiles.toolId,'bundle');
 const editor=readFileSync(new URL('../src/scan-editor.js',import.meta.url),'utf8');
 for(const feature of ["'restore'","data-edit=\"eraser\"","value=\"auto-colored\"","value=\"light-gray\"","data-edit=\"date\""])
  assert.ok(editor.includes(feature),feature);
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.ok(main.includes("spec.type==='legacyTool'"));
 assert.ok(main.includes("await openTool(spec.toolId)"));
});
test('PDF annotate and privacy retain original signature, text, page numbers and password protection',()=>{
 assert.deepEqual(mergedToolDefinitions.annotatePdf.choices,['sign','watermark','text','numbers']);
 assert.deepEqual(mergedToolDefinitions.pdfPrivacy.choices,['lockPdf','metadata']);
 assert.equal(hubSpecial.lockPdf.type,'pdfLock');
 assert.equal(mergedToolOptions('pdfPrivacy','fr').length,2);
});
test('Merged tool labels retain all seven supported languages and category order',()=>{
 const translations={en:['Scan','Convert','Edit','Utilities'],ar:['المسح','التحويل','التعديل','أدوات إضافية'],fr:['Scanner','Convertir','Modifier','Utilitaires']};
 for(const [lang,expected] of Object.entries(translations))
  assert.deepEqual(toolGroups.map(g=>hubGroupLabel(lang,g.id)),expected);
 for(const lang of hubLanguages()){
  for(const id of groups)assert.ok(hubLabel(lang,id));
  for(const id of Object.keys(mergedToolDefinitions))
   assert.ok(mergedToolOptions(id,lang).every(choice=>choice.label));
 }
});
test('Merged dialog opens only approved original operations and supports Back',()=>{
 const ui=readFileSync(new URL('../src/merged-tools.js',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.ok(ui.includes("if(!def.choices.includes(action))return"));
 assert.ok(ui.includes("onChoose(action)"));
 assert.ok(ui.includes("dataset.mergedClose='true'"));
 assert.ok(main.includes("if(spec.type==='mergedDialog')"));
 assert.ok(main.includes("openMergedToolDialog({id,language,onChoose:action=>openHubAction(action)"));
 assert.ok(main.includes("document.querySelector('.rivo-merged-overlay')"));
 assert.ok(main.includes("[data-merged-close]"));
});
