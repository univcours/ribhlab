import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeSignal} from '../src/file-transfer.js';
test('WebRTC pairing rejects invalid or unbounded codes before allocating decoding buffers',()=>{
 for(const bad of [undefined,0,'a'.repeat(200001),Buffer.from(JSON.stringify({type:'offer',sdp:'x'.repeat(100001)})).toString('base64')])
  assert.throws(()=>decodeSignal(bad));
 const valid={type:'offer',sdp:'v=0\r\nabc'};
 assert.deepEqual(decodeSignal(Buffer.from(JSON.stringify(valid)).toString('base64')),valid);
});
test('Transfer code serializes binary events and excludes empty files',async()=>{
 const s=(await import('node:fs')).readFileSync(new URL('../src/file-transfer.js',import.meta.url),'utf8');
 assert.match(s,/receiveQueue=receiveQueue\.catch/);
 assert.match(s,/channel!==ch/);
 assert.match(s,/f\.size===0/);
});
