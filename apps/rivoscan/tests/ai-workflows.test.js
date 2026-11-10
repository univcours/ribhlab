import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAIRequest,parseAIResponse,requestUserAI,AI_ENDPOINT} from '../src/ai-provider.js';
import {readFileSync} from 'node:fs';
test('Document chat stays inside its source and never enables provider storage',()=>{
 const q=buildAIRequest({mode:'chat',question:'What is the invoice date?',sourceText:'[PAGE 1] Invoice date 12/10/2026'});
 assert.equal(q.store,false);
 assert.equal(q.input[0].content[0].type,'input_text');
 assert.ok(q.input[0].content[0].text.includes('[PAGE 1]'));
 assert.ok(q.instructions.includes('Answer only from'));
 assert.throws(()=>buildAIRequest({mode:'chat',question:'Why?',sourceText:''}));
 assert.throws(()=>buildAIRequest({mode:'solver',question:'Solve',imageDataURL:'https://evil.example/file.jpg'}));
});
test('Solver includes an actual input_image instead of fictional OCR',()=>{
 const picture='data:image/jpeg;base64,'+Buffer.from('test').toString('base64');
 const req=buildAIRequest({mode:'solver',question:'Solve the problem',imageDataURL:picture});
 assert.equal(req.input[0].content[1].type,'input_image');
 assert.equal(req.input[0].content[1].image_url,picture);
 assert.equal(req.store,false);
});
test('Adapter uses fixed HTTPS endpoint, per-session caller secret and real AI response',async()=>{
 const req=buildAIRequest({mode:'chat',question:'Summarize',sourceText:'[PAGE 1] Test text'});
 let sent;
 const answer=await requestUserAI({apiKey:'sk-test-personal-123456',request:req,transport:async args=>{
  sent=args;return {ok:true,status:200,data:{output:[{content:[{type:'output_text',text:'Document summary'}]}]}}
 }});
 assert.equal(answer,'Document summary');
 assert.equal(sent.url,AI_ENDPOINT);
 assert.equal(sent.headers.Authorization,'Bearer sk-test-personal-123456');
 assert.equal(sent.request.store,false);
 assert.throws(()=>parseAIResponse({output:[]}));
 const ui=readFileSync(new URL('../src/document-ai.js',import.meta.url),'utf8');
 assert.ok(ui.includes('window.confirm(L[13])'));
 assert.ok(ui.includes("key.type='password'"));
 assert.ok(ui.includes("key.value=''"));
 assert.ok(!ui.includes('localStorage.'));
});
test('Provider errors cannot leak API key in displayed message',async()=>{
 const req=buildAIRequest({mode:'chat',question:'Read',sourceText:'abc'});
 const key='sk-SECRET-DO-NOT-LEAK';
 await assert.rejects(
   requestUserAI({apiKey:key,request:req,transport:async()=>({ok:false,status:401,data:{error:{message:'Bad key '+key}}})}),
   err=>{assert.ok(!err.message.includes(key));return true}
 );
});
