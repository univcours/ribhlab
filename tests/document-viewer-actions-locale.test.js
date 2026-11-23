import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const viewer=readFileSync(new URL('../src/document-viewer.js',import.meta.url),'utf8');
test('Phosphor Scan and Convert buttons remain fully localized',()=>{
 for(const [name,localeLabel,fallback] of [['scan','New Scan','New Scan'],['convert','Convert','Convert']]){
  const line=viewer.split('\n').find(x=>x.includes("actionRow.appendChild(iconButton('"+name+"'"));
  assert.ok(line,'Missing Phosphor '+name+' button');
  assert.ok(line.includes("||'"+fallback+"'"),'Missing fallback '+fallback);
  for(const locale of ['en','ar','fr','es','de','pt','it']){
   assert.ok(line.includes(locale+":'"),'Missing '+locale+' on '+name);
  }
 }
});
