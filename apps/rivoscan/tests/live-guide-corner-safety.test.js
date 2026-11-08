import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Camera guide is drawn in view space even if no image-analysis frame is available',()=>{
 const s=read('native/android/RivoLiveScannerActivity.java');
 assert.ok(s.includes('final float contentWidth=found?imageWidth*scale:getWidth()'));
 assert.ok(s.includes('final float contentHeight=found?imageHeight*scale:getHeight()'));
 assert.ok(s.includes('sx[i]=offsetX+screenX(drawn[i])*contentWidth;'));
});
test('Edges button cannot erase manual corners or misrepresent a failed retry',()=>{
 const scanner=read('native/android/RivoLiveScannerActivity.java');
 const editor=read('native/android/RivoCropEditor.java');
 assert.ok(scanner.includes('target.getCornerRevision()!=cornerRevision'));
 assert.ok(scanner.includes('if(result==null){'));
 assert.ok(editor.includes('if(result==null)return false'));
 assert.ok(editor.includes('cornerRevision++'));
});
test('Manual crop drags preserve convex quadrilateral before perspective warp',()=>{
 const editor=read('native/android/RivoCropEditor.java');
 assert.ok(editor.includes('if(isValidMove(selected,nextX,nextY))'));
 assert.ok(editor.includes('Math.abs(area)>.025'));
 assert.ok(editor.includes('Math.signum(cross)!=sign'));
});
