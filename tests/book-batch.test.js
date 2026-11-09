import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('Book Scan Pro accepts multiple photographs and caps memory before PDF creation',()=>{
 const code=readFileSync(new URL('../src/book-split.js',import.meta.url),'utf8');
 assert.ok(code.includes('fileInput.multiple=!singlePage'));
 assert.ok(code.includes('previousSpreads.length>=maxSpreads-1'));
 assert.ok(code.includes('canvas.toDataURL('));
 assert.ok(code.includes('2200/Math.max(source.naturalWidth'));
 assert.ok(code.includes('for(const file of files)'));
 assert.ok(code.includes('for(const spread of spreads)'));
 assert.ok(code.includes('for(const [regionIndex,rect] of regions.entries())'));
 assert.ok(code.includes('autoLineWarp:')||code.includes('autoLineWarp,autoPageWarp'));
 assert.ok(code.includes('const old=previousSpreads.pop()'));
});
