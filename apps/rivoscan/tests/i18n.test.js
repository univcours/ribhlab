import test from 'node:test';
import assert from 'node:assert/strict';
import { tt, translateStatus, localizeStaticUI } from '../src/i18n-extra.js';

const languages=['ar','fr','es','de','pt','it'];
test('document actions and status messages are localized for every supported language',()=>{
  for(const language of languages){
    assert.notEqual(tt(language,'preview'),'Document preview',language);
    assert.notEqual(translateStatus(language,'WORKSPACE'),'WORKSPACE',language);
    assert.notEqual(translateStatus(language,'Smart Scanner'),'Smart Scanner',language);
    assert.notEqual(translateStatus(language,'Connected securely — ready to exchange files.'),
      'Connected securely — ready to exchange files.',language);
    assert.notEqual(translateStatus(language,'Preparing connection code…'),'Preparing connection code…',language);
    assert.notEqual(translateStatus(language,'Files exceed 90 MB total. Try fewer files.'),
      'Files exceed 90 MB total. Try fewer files.',language);
  }
});
test('file names and user document contents are never translated',()=>{
  for(const language of languages){
    assert.equal(translateStatus(language,'invoice-2026.pdf'),'invoice-2026.pdf');
    assert.equal(translateStatus(language,'Personal note for accounting'),'Personal note for accounting');
  }
});
test('English remains a predictable fallback',()=>{
  assert.equal(translateStatus('en','WORKSPACE'),'WORKSPACE');
  assert.equal(translateStatus('xx','File downloaded successfully.'),'File downloaded successfully.');
  assert.equal(typeof localizeStaticUI,'function');
});
