import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('After shutter show draggable corners before automatic filter preview',()=>{
 const s=source('native/android/RivoLiveScannerActivity.java');
 const area=s.slice(s.indexOf('private void showCaptureReview('),s.indexOf('private void openEditor('));
 assert.match(area,/editor=new RivoCropEditor\(this\)/);
 assert.match(area,/requestCropEdges\(bitmap,editor,false\)/);
 assert.match(area,/current=photo;\s*prepareEnhancementPreview\(\)/);
});
test('Edges retry reports failure honestly and runs off UI thread',()=>{
 const s=source('native/android/RivoLiveScannerActivity.java');
 assert.match(s,/requestCropEdges\(current,editor,true\)/);
 assert.match(s,/requestCropEdges\(bitmap,editor,true\)/);
 assert.match(s,/No reliable edges/);
 assert.match(s,/analyzer\.execute\(\(\)->\{/);
});
test('Live guide visible without detected edges, dashed not solid',()=>{
 const s=source('native/android/RivoLiveScannerActivity.java');
 assert.match(s,/Point\[\] drawn=found\?points:RivoEdgeDetector\.fallback\(\)/);
 assert.match(s,/android\.graphics\.DashPathEffect/);
});
test('Manual corner drag is preserved against stale analysis',()=>{
 const s=source('native/android/RivoCropEditor.java');
 assert.match(s,/manuallyAdjusted=true/);
 assert.match(s,/!forced&&manuallyAdjusted/);
 assert.match(s,/public Bitmap getDocument\(\)/);
});
