import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('camera maps true corners onto preview while hiding fake guide',()=>{const s=read('native/android/RivoLiveScannerActivity.java'),g=s.slice(s.indexOf('private static final class LiveEdges'));for(const k of ['points==null)return','float contentWidth=imageWidth*scale','float contentHeight=imageHeight*scale','sx[i]=offsetX+screenX(points[i])*contentWidth'])assert.ok(g.includes(k),k);assert.ok(!g.includes('RivoEdgeDetector.fallback()'));assert.ok(!g.includes('DashPathEffect'));});

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
