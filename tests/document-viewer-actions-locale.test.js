import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const viewer=readFileSync(new URL('../src/document-viewer.js',import.meta.url),'utf8');

test('Document viewer Scan and Convert buttons are fully localized',()=>{
  const scan=viewer.match(/'⊞ '\+\(\(\{([^\n]+)\}\)\[lang\(\)\]\|\|'New Scan'\)/);
  const convert=viewer.match(/'⇄ '\+\(\(\{([^\n]+)\}\)\[lang\(\)\]\|\|'Convert'\)/);
  assert.ok(scan,'New Scan needs a fallback inside the parenthesized label expression');
  assert.ok(convert,'Convert needs a fallback inside the parenthesized label expression');
  for(const locale of ['en','ar','fr','es','de','pt','it']){
    assert.match(scan[1],new RegExp('(?:^|,)'+locale+':\\x27[^\\x27]+\\x27'),'Scan '+locale);
    assert.match(convert[1],new RegExp('(?:^|,)'+locale+':\\x27[^\\x27]+\\x27'),'Convert '+locale);
  }
});
