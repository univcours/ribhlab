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
test('automatic crop runs off UI thread and preserves manual corrections',()=>{const s=source('native/android/RivoLiveScannerActivity.java');for(const k of ['requestCropEdges(bitmap,editor,false)','target.getCornerRevision()!=cornerRevision','if(result==null){','analyzer.execute(()->{'])assert.ok(s.includes(k),k);assert.ok(!s.includes('button(trNative("enhanceBack"),this::reopenCrop)'));});

test('live camera draws only real non-yellow green contours',()=>{const s=source('native/android/RivoLiveScannerActivity.java');const g=s.slice(s.indexOf('private static final class LiveEdges'));for(const k of ['points==null)return','screenX(points[i])','paint.setPathEffect(null)'])assert.ok(g.includes(k),k);assert.ok(!/DashPathEffect|Color.rgb\(255,207,99\)|RivoEdgeDetector.fallback/.test(g));});

test('Manual corner drag is preserved against stale analysis',()=>{
 const s=source('native/android/RivoCropEditor.java');
 assert.match(s,/manuallyAdjusted=true/);
 assert.match(s,/!forced&&manuallyAdjusted/);
 assert.match(s,/public Bitmap getDocument\(\)/);
});
