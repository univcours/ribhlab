import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../src/rivo-design-system.css',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const official=css.slice(css.indexOf('/* RivoScan official navy/royal-blue palette'));

test('The last UI layer declares the official RivoScan blue tokens',()=>{
 assert.ok(main.includes("import './rivo-design-system.css'"));
 const expected={
  '--rivo-official-primary':'#07479b',
  '--rivo-official-dark':'#053472',
  '--rivo-official-bg':'#f1f5fa',
  '--rivo-official-surface':'#ffffff',
  '--rivo-official-ink':'#122640',
  '--rivo-official-border':'#c6d4e6',
  '--rivo-official-focus':'#135ebf'
 };
 for(const [token,value] of Object.entries(expected))
  assert.ok(official.includes(token+':'+value),token+' should be '+value);
});

test('Every main edit and utility window receives the official blue chrome',()=>{
 for(const cls of ['rivo-code-dialog','rivo-id-dialog','rivo-release-dialog',
  'rivo-merged-dialog','rivo-shield-dialog','rivo-reward-dialog',
  'rivo-perfectscan-modal','rivo-pages-modal','rivo-editor-window'])
  assert.ok(official.includes('.'+cls),cls+' must use official palette');
 assert.ok(official.includes('.doc-detail-overlay'));
 assert.ok(official.includes('.rivo-live-dialog'));
 assert.ok(official.includes('background:var(--rivo-official-primary)!important'));
});

test('Settings drawers and save actions use the palette without recoloring source pixels',()=>{
 for(const cls of ['rivo-workspace-settings-toggle','rivo-workspace-task.active',
  'rivo-book-dialog .rivo-edit-bottom-bar button',
  'rivo-editor-save-dock .rivo-editor-save'])
  assert.ok(official.includes('.'+cls));
 assert.ok(official.includes('keep dark video stage'));
 assert.ok(official.includes('scan/photo content keeps its own pixels'));
});
