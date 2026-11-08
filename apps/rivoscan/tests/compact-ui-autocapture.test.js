import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source=(path)=>readFileSync(fileURLToPath(new URL('../'+path,import.meta.url)),'utf8');

test('compact layout loads after existing selection overrides',()=>{
  const main=source('src/main.js');
  const old=main.indexOf("import './selection-compact.css';");
  const next=main.indexOf("import './compact-all-screens.css';");
  assert.ok(old>=0 && next>old,'final CSS must override legacy selected-file layout');
  const css=source('src/compact-all-screens.css');
  for(const screen of ['rivo-scan-first','library-workspace','tool-card','scan-action-primary','settings-row']){
    assert.ok(css.includes(screen),'missing compact layout for '+screen);
  }
  assert.ok(css.includes('.doc-detail-preview'),'document preview must remain visible');
  assert.ok(css.includes('overflow-y:auto'),'long accessible dialogs must not clip buttons');
});

test('selected document uses one edit/rename and a plus action',()=>{
  const bulk=source('src/library-bulk.js');
  assert.match(bulk,/data-doc-edit-rename="\$\{index\}"/);
  assert.match(bulk,/data-doc-add="\$\{index\}"/);
  assert.match(bulk,/rivo-compact-multi/);
  assert.match(bulk,/data-edit-rename-choice="edit"/);
  assert.match(bulk,/data-edit-rename-choice="rename"/);
});

test('auto shutter observes raw detected edges, not smoothed display corners',()=>{
  const native=source('native/android/RivoLiveScannerActivity.java');
  const signal=native.indexOf('final boolean captureStable=autoShutterGate.observe(');
  const smooth=native.indexOf('if(smoothCorners!=null)',signal);
  const trigger=native.indexOf('if(captureStable && !captureInProgress',smooth);
  assert.ok(signal>=0 && smooth>signal && trigger>smooth,'stable gate must run before visual smoothing');
  assert.match(native,/else\s*\{\s*\/\/ Any missed contour breaks the stability streak immediately\./);
  assert.match(native,/autoShutterGate\.reset\(\);\s*if\(analysisStamp-lastValidEdgeTime>650\)/);
  assert.match(native,/awaitingCaptureApproval/,'capture approval / retake must remain present');
});
