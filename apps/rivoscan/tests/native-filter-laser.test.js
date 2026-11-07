import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../native/android/RivoLiveScannerActivity.java',import.meta.url),'utf8');
test('CameraX native preview progressively reveals real filtered bitmap beneath turquoise laser',()=>{
 assert.match(src,/class FilterLaserView extends View/);
 assert.match(src,/canvas\.clipRect\(left,lineY,left\+imageW,top\+imageH\)/);
 assert.match(src,/enhancementImage\.setImageBitmap\(result\);\s*if\(enhancementLaser!=null/);
 assert.match(src,/enhancementLaser\.reveal\(pendingWarp\)/);
 assert.match(src,/RivoDocumentEnhancer\.apply\(image,preset\)/);
});
test('Native laser honours reduced motion and cancels stale animations',()=>{
 assert.match(src,/ValueAnimator\.areAnimatorsEnabled\(\)/);
 assert.match(src,/if\(enhancementLaser!=null\)enhancementLaser\.stop\(\)/);
 assert.match(src,/if\(enhancementLaser!=null\)\{enhancementLaser\.stop\(\);enhancementLaser=null;\}/);
 assert.match(src,/if\(serial!=enhancementSerial\|\|enhancementImage==null\|\|pendingWarp==null\)/);
 assert.match(src,/enhancementSaveButton\.setEnabled\(false\)/);
 assert.match(src,/completeProcessedPage\(completed,serial\)/);
});
