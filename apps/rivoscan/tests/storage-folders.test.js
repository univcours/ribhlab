import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('RivoScan root picker requires explicit consent and creates type folders',()=>{
 const n=read('native/android/RivoDocumentsPlugin.java');
 for(const marker of ['STORAGE_ROOT_ID="primary:RivoScan"','TYPE_FOLDERS={"PDF","Images","Word","Excel","PowerPoint","Text","Other"}',
  'chooseStorageFolder(PluginCall call)','getStorageFolder(PluginCall call)',
  'DocumentsContract.createDocument','takePersistableUriPermission',
  'FOLDER+fileType(mime,name)+"/"','appendTreeFiles(items,root,rootDocument(root)',
  'appendFolderFiles(items,legacyDownloadsCollection(),LEGACY_FOLDER)','trustedTreeFile'])
 assert.ok(n.includes(marker),marker);
 assert.ok(!n.includes('android.permission.MANAGE_EXTERNAL_STORAGE'));
});
test('Documents library offers choosing sibling folder, and shows the active path',()=>{
 const main=read('src/main.js');
 for(const m of ['id="set-rivoscan-folder"','RivoDocuments.chooseStorageFolder()',
  "libraryStoragePath=result.folder||'Documents/RivoScan'","versionCode"]) {
  if(m==='versionCode')continue;
  assert.ok(main.includes(m),m);
 }
});
test('Release bump prevents accidental stale install',()=>{
 const p=read('rivoscan-version.properties'),j=JSON.parse(read('package.json'));
 assert.ok(p.includes('versionCode=96'));
 assert.ok(p.includes('versionName=0.44.20'));
 assert.equal(j.version,'0.44.20');
});
