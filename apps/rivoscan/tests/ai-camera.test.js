import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('AI Solver can capture an actual photo without automatic upload',()=>{
 const src=read('src/document-ai.js'),main=read('src/main.js');
 assert.ok(src.includes("mode==='solver'&&capture"));
 assert.ok(src.includes('const uri=await capture()'));
 assert.ok(src.includes('new File([blob]'));
 assert.ok(main.includes("openDocumentAI({mode:spec.type==='aiDocument'?'chat':'solver',language,capture:async()=>"));
 assert.ok(src.includes('window.confirm(L[13])'));
 const selectedIndex=src.indexOf('const uri=await capture()');
 const uploadIndex=src.indexOf('requestUserAI({apiKey:key.value,request})');
 assert.ok(selectedIndex>=0&&uploadIndex>selectedIndex,'image selection does not send AI request');
 assert.ok(src.includes("key.value=''"));
});
