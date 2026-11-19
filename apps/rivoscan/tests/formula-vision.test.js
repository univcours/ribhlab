import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildAIRequest,requestUserAI} from '../src/ai-provider.js';
test('AI Math OCR sends a real image, requests faithful transcription and disables provider storage',async()=>{
 const image='data:image/jpeg;base64,'+Buffer.from('test-photo').toString('base64');
 const req=buildAIRequest({mode:'formula',question:'Read as LaTeX',imageDataURL:image});
 assert.equal(req.store,false);
 assert.equal(req.input[0].content[1].type,'input_image');
 assert.equal(req.input[0].content[1].image_url,image);
 assert.ok(req.instructions.includes('without solving'));
 let sent;
 const answer=await requestUserAI({apiKey:'sk-example-key-12345',request:req,transport:async arg=>{
  sent=arg;return {ok:true,status:200,data:{output:[{content:[{type:'output_text',text:'\\frac{x}{y}'}]}]}}}});
 assert.equal(answer,'\\frac{x}{y}');
 assert.equal(sent.request.store,false);
 assert.throws(()=>buildAIRequest({mode:'formula',question:'Read',imageDataURL:'http://unsafe/image'}));
});
test('Math vision UI makes user confirm every request and never saves a key',()=>{
 const s=readFileSync(new URL('../src/formula-ocr.js',import.meta.url),'utf8');
 assert.ok(s.includes("secret.type='password'"));
 assert.ok(s.includes('window.confirm(confirmText)'));
 assert.ok(s.includes("mode:'formula'"));
 assert.ok(s.includes("secret.value=''"));
 assert.ok(!s.includes('localStorage'));
});
