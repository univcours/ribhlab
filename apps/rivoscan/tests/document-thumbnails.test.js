import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {supportsThumbnail,createDocumentThumbnailService} from '../src/document-thumbnails.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Only real local image/PDF URIs are eligible for preview',()=>{
 assert.ok(supportsThumbnail({uri:'content://media/abc',name:'scan.pdf'}));
 assert.ok(supportsThumbnail({uri:'content://media/abc',mimeType:'image/jpeg'}));
 assert.equal(supportsThumbnail({name:'a.pdf'}),false);
 assert.equal(supportsThumbnail({uri:'u',name:'file.exe'}),false);
 assert.equal(supportsThumbnail(null),false);
});
test('Native thumbnail service deduplicates requests and bounds active reads',async()=>{
 let active=0,maxActive=0,calls=0;
 const service=createDocumentThumbnailService(async({uri})=>{
  calls++;active++;maxActive=Math.max(maxActive,active);
  await new Promise(resolve=>setTimeout(resolve,5));
  active--;return {base64:'abcdefghij1234567890'+uri};
 },{maxCached:2,concurrency:2});
 const a={uri:'a',name:'a.pdf'},b={uri:'b',name:'b.pdf'},c={uri:'c',name:'c.jpg'};
 const [p,q,r,s]=await Promise.all([service.get(a),service.get(a),service.get(b),service.get(c)]);
 assert.equal(p,q);
 assert.ok(r.startsWith('data:image/jpeg;base64,'));
 assert.ok(s.startsWith('data:image/jpeg;base64,'));
 assert.equal(calls,3);
 assert.ok(maxActive<=2);
 service.clear();
 await service.get(a);
 assert.equal(calls,4);
});
test('Thumbnail failures do not break documents, and stay contained',async()=>{
 let count=0;
 const service=createDocumentThumbnailService(async()=>{count++;throw Error('damaged PDF')});
 const doc={uri:'x',mimeType:'application/pdf'};
 assert.equal(await service.get(doc),null);
 assert.equal(await service.get(doc),null);
 assert.equal(count,1);
});
test('Native preview uses URI safety checks, scales image and first PDF page',()=>{
 const java=read('native/android/RivoDocumentsPlugin.java');
 for(const keyword of ['public void getThumbnail(PluginCall call)','verifiedUri(call)',
  'PdfRenderer.Page','BitmapFactory.Options','maxDimension=220',
  'new ExifInterface(in)','Bitmap.CompressFormat.JPEG','new Thread('])
  assert.ok(java.includes(keyword),keyword);
 const main=read('src/main.js');
 assert.ok(main.includes("createDocumentThumbnailService"));
 assert.ok(main.includes("data-rivo-thumb="));
 assert.ok(main.includes("hydrateDocumentThumbnails()"));
 assert.ok(main.includes("IntersectionObserver"));
 assert.ok(!main.includes("RivoDocuments.readFile({uri:doc.uri})")||main.includes("RivoDocuments.getThumbnail(args)"));
});
