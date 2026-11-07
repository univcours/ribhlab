import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Always-visible left checkboxes select one or multiple files, without long press',()=>{
 const m=get('src/main.js'),b=get('src/library-bulk.js'),c=get('src/premium-home.css');
 assert.ok(m.includes('${bulkUI.checkbox(item,index)}'));
 assert.ok(m.includes('class="doc-select-box rivo-recent-check"'));
 assert.ok(c.includes('Explicit left-side checkbox selection'));
 assert.ok(b.includes('if(mode&&selected.size===1&&doc&&chosen(doc))'));
 assert.ok(b.includes("if(!mode||selected.size<2)return ''"));
 assert.ok(!m.includes('bulkUI.wireLongPress(el)'));
 assert.ok(!b.includes('function wireLongPress('));
 assert.ok(!b.includes('function longPress('));
});
test('File tap opens Android chooser, falling back to the RivoScan preview',()=>{
 const m=get('src/main.js'),n=get('native/android/RivoDocumentsPlugin.java'),ps=get('install-live-scanner.ps1');
 assert.ok(m.includes('RivoDocuments.openFile({uri:doc.uri})'));
 assert.ok(m.includes('outcome?.opened!==false'));
 assert.ok(m.includes('await docViewerUI.open(doc)'));
 assert.ok(n.includes('queryIntentActivities(open,'));
 assert.ok(n.includes('fallback.put("opened",false)'));
 assert.ok(n.includes('Intent.createChooser(open, localized("openDocument"))'));
 assert.ok(ps.includes('android.intent.action.VIEW'));
 assert.ok(ps.includes('android:mimeType="*/*"'));
});
test('Capture shows checkmark only, Done saves immediately, then Add Page or Save',()=>{
 const cam=get('native/android/RivoLiveScannerActivity.java');
 assert.ok(cam.includes('Button confirm=button("✓",this::approveCapturedPhoto)'));
 assert.ok(cam.includes('private void showPostSaveChoices()'));
 assert.ok(cam.includes('else showPostSaveChoices()'));
 assert.ok(cam.includes('.setNegativeButton(add,'));
 assert.ok(cam.includes('.setPositiveButton("✓ "+localizedCapture("save")'));
 const done=cam.slice(cam.indexOf('private void saveEnhancedPage(){'),cam.indexOf('/** Explicit ✓ applies'));
 assert.ok(done.includes('commitEnhancedPage()'));
 assert.ok(!done.includes('new android.app.AlertDialog.Builder'));
});
