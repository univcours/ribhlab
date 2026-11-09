import test from 'node:test';import assert from 'node:assert/strict';
import {suggestPrintedMathLayout} from '../src/math-layout.js';
import {readFileSync} from 'node:fs';
const word=(text,x0,y0,x1,y1)=>({text,bbox:{x0,y0,x1,y1}});
const blocks=words=>[{paragraphs:[{lines:[{words}]}]}];
test('Identifies a stacked printed fraction only when OCR glyph geometry supports it',()=>{
 const v=suggestPrintedMathLayout(blocks([word('x',75,28,93,46),word('—',58,58,130,62),word('y',77,72,95,89)]));
 assert.equal(v?.latex,'\\frac{x}{y}');assert.equal(v.kind,'stacked-fraction');
});
test('Uses relative bbox sizes to suggest raised powers, not arbitrary text',()=>{
 const v=suggestPrintedMathLayout(blocks([word('x',20,45,35,72),word('2',37,32,46,44)]));
 assert.equal(v?.latex,'x^{2}');
 assert.equal(suggestPrintedMathLayout(blocks([word('hello',20,45,62,65),word('world',68,45,115,65)])),null);
 assert.equal(suggestPrintedMathLayout([]),null);
});
test('Math UI clearly labels editable geometric suggestion without replacing originals',()=>{
 const s=readFileSync(new URL('../src/formula-ocr.js',import.meta.url),'utf8');
 assert.ok(s.includes('suggestPrintedMathLayout(result.data.blocks||[])'));
 assert.ok(s.includes('layout?.latex'));
});
