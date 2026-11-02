import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('AI Solver camera photo is locally resized and selected, then upload requires a separate confirmation',()=>{
 const src=readFileSync(new URL('../src/document-ai.js',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.ok(src.includes("mode==='solver'&&capture"));
 assert.ok(src.includes('const uri=await capture()'));
 assert.ok(src.includes("canvas.toBlob(b=>b?ok(b)"));
 assert.ok(src.includes("lastFile=new File([optimized]"));
 assert.ok(src.includes('window.confirm(L[13])'));
 assert.ok(main.includes("openDocumentAI({mode:spec.type==='aiDocument'?'chat':'solver',language,capture:async()=>"));
 assert.ok(src.indexOf("lastFile=new File([optimized]")<src.indexOf('requestUserAI({apiKey:key.value,request})'));
 assert.ok(src.includes("key.value=''"));
});
