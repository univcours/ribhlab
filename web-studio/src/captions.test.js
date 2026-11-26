import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSubtitles,toSrt,toVtt,toTxt,stamp,seconds,clock,activeCue,clean,rgba,transcriptChunksToCues} from './captions.js';
test('SRT Arabic French round trip',()=>{
 const original=[{id:'a',start:.2,end:1.6,text:'الدارجة ça va'},{id:'b',start:2,end:3.4,text:'مرحبا'}];
 assert.deepEqual(parseSubtitles(toSrt(original)).map(x=>x.text),original.map(x=>x.text));
});
test('WebVTT produces parseable timestamps',()=>{
 const data=[{start:3.125,end:4.5,text:'Bonjour'}];
 assert.equal(parseSubtitles(toVtt(data))[0].start,3.125);
});
test('invalid cues skipped and input sanitized',()=>{
 assert.equal(parseSubtitles('1\n00:00:03,000 --> 00:00:02,000\nBad')[0],undefined);
 assert.equal(clean([{start:-1,end:2,text:'ok'},{start:1,end:1,text:'bad'}]).length,1);
});
test('time functions preserve milliseconds',()=>{
 assert.equal(stamp(3601.234),'01:00:01,234');
 assert.equal(seconds('01:00:01,234'),3601.234);
 assert.equal(clock(70),'01:10');
});
test('active caption and unicode text export',()=>{
 const cues=[{id:'x',start:0,end:1,text:'الدارجة'}, {id:'y',start:1,end:3,text:'français'}];
 assert.equal(activeCue(cues,1.1).text,'français');
 assert.ok(toTxt(cues).includes('الدارجة'));
});
test('timestamped inference chunks become cues without inventing words',()=>{
 const cues=transcriptChunksToCues([{text:'bonjour',timestamp:[.25,.9]}],3);
 assert.equal(cues.length,1);assert.equal(cues[0].start,.25);assert.equal(cues[0].text,'bonjour');
});
test('safe color conversion',()=>assert.equal(rgba('#abcdef',.4),'rgba(171,205,239,0.4)'));
