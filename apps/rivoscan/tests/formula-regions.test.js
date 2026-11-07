import test from 'node:test';
import assert from 'node:assert/strict';
import {findFormulaRegions,formulaRegionLayout} from '../src/formula-regions.js';
import {readFileSync} from 'node:fs';
const word=(text,x,y,w=32,h=17)=>({text,bbox:{x0:x,y0:y,x1:x+w,y1:y+h}});
test('Extracts math image regions using actual OCR coordinates, not guesses',()=>{
 const blocks=[{paragraphs:[{lines:[
  {words:[word('The',10,10),word('date',55,10),word('2026',105,10)]},
  {words:[word('x',20,60),word('=',62,60),word('a/b',104,60)]},
  {words:[word('√',20,107),word('x+1',56,107)]}
 ]}]}];
 const regions=findFormulaRegions(blocks,280,220);
 assert.equal(regions.length,2);
 assert.ok(regions[0].x<=20&&regions[0].y<=60);
 assert.ok(regions[1].y>regions[0].y);
 const layout=formulaRegionLayout(regions,280,220);
 assert.equal(layout.parts.length,2);
 assert.ok(layout.parts[0].dy<layout.parts[1].dy);
 assert.ok(layout.width>regions[0].w);
});
test('Blank text and nonmath lines abstain; cannot read outside source image',()=>{
 assert.deepEqual(findFormulaRegions([],500,500),[]);
 assert.deepEqual(findFormulaRegions([{paragraphs:[{lines:[{words:[word('Hello',10,10)]}]}]}],500,500),[]);
 assert.throws(()=>formulaRegionLayout([{x:495,y:0,w:30,h:20}],500,500));
 assert.throws(()=>findFormulaRegions([],0,500));
});
test('Tesseract v6 blocks-based OCR is wired to marked preview and lossless region export',()=>{
 const src=readFileSync(new URL('../src/formula-ocr.js',import.meta.url),'utf8');
 assert.ok(src.includes("worker.recognize(selected,{}, {blocks:true})"));
 assert.ok(src.includes('findFormulaRegions(result.data.blocks||[]'));
 assert.ok(src.includes('ctx.strokeRect('));
 assert.ok(src.includes('formulaRegionLayout(formulaRegions'));
 assert.ok(src.includes("sheet.toBlob(b=>b?ok(b):bad(Error('PNG failed')),'image/png')"));
 assert.ok(src.includes('await worker.terminate()'));
});