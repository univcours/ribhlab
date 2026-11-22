import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('../src/book-split.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/rivo-ui-04567.css',import.meta.url),'utf8');
test('Book Scan has one visible pair of source actions when preview is empty',()=>{
 assert.match(code,/secondaryPhotoAction=makeButton\(actions,L\[1\]/);
 assert.match(code,/secondaryImportAction=makeButton\(actions,L\[2\]/);
 assert.match(code,/secondaryPhotoAction\.hidden=true/);
 assert.match(code,/secondaryImportAction\.hidden=true/);
 assert.match(code,/if\(secondaryPhotoAction\)secondaryPhotoAction\.hidden=false/);
 assert.match(code,/if\(secondaryImportAction\)secondaryImportAction\.hidden=false/);
 assert.match(code,/emptyActions\.hidden=true/);
 assert.match(css,/\.rivo-book-dialog \.rivo-code-actions button\[hidden\]\s*\{\s*display:none!important/);
});
