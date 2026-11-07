import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const scanner=readFileSync(new URL('../native/android/RivoLiveScannerActivity.java',import.meta.url),'utf8');
const part=(start,end)=>scanner.slice(scanner.indexOf(start),scanner.indexOf(end,scanner.indexOf(start)+start.length));
test('Changing scan type after first saved page is blocked, without deleting the pages',()=>{
 const handler=part('String[] modesList={"Document","ID Card","Whiteboard"};','if(!basicCameraMode)footer.addView(modes');
 assert.match(handler,/!savedImages\.isEmpty\(\)&&!scanMode\.equals\(mode\)/);
 assert.match(handler,/Toast\.makeText\(this/);
 assert.ok(handler.indexOf('return;')<handler.indexOf('scanMode=mode;'));
 assert.doesNotMatch(handler,/savedImages\.clear\(/);
});
test('ID card always keeps batch capture even when Single is tapped',()=>{
 const handler=part('private void setBatch(boolean next)','private void updateBatchButtons()');
 assert.match(handler,/"ID Card"\.equals\(scanMode\)&&!next/);
 assert.ok(handler.indexOf('return;')<handler.indexOf('batchMode=next;'));
});
test('Finishing one-sided ID offers explicit keep or capture reverse side',()=>{
 const handler=part('private void finishWithPages()','@Override public void onBackPressed()');
 assert.match(handler,/"ID Card"\.equals\(scanMode\)&&savedImages\.size\(\)==1/);
 assert.match(handler,/setNegativeButton\(trNative\("retake"\),\(dialog,which\)->showCamera\(\)\)/);
 assert.match(handler,/setPositiveButton\(trNative\("finish"\),\(dialog,which\)->deliverSavedPages\(\)\)/);
 assert.match(handler,/out\.putStringArrayListExtra\("images",savedImages\)/);
 assert.doesNotMatch(handler,/savedImages\.clear\(/);
});
