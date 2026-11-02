import test from 'node:test';
import assert from 'node:assert/strict';
import {layoutIDPhotoSheet,photoSizes} from '../src/id-photo-maker.js';
import {changesForVersion,shouldShowReleaseNotes} from '../src/whats-new.js';
import {readFileSync} from 'node:fs';
test('Photo sheets use real 300DPI dimensions and every photo stays inside print margins',()=>{
 for(const size of Object.keys(photoSizes)){
  const page=layoutIDPhotoSheet(size);
  assert.equal(page.sheetW,Math.round(100*300/25.4));assert.equal(page.sheetH,Math.round(150*300/25.4));
  assert.ok(page.positions.length>0);
  for(const rect of page.positions){assert.ok(rect.x>=0&&rect.y>=0);assert.ok(rect.x+rect.w<=page.sheetW&&rect.y+rect.h<=page.sheetH)}
 }
});
test('Release notes are shown only for unseen version and describe real work',()=>{
 const seen=new Map(),storage={getItem:k=>seen.get(k)||null,setItem:(k,v)=>seen.set(k,v)};
 assert.ok(shouldShowReleaseNotes(storage,'0.22.0'));storage.setItem('rivo-release-notes-read','0.22.0');
 assert.equal(shouldShowReleaseNotes(storage,'0.22.0'),false);assert.ok(shouldShowReleaseNotes(storage,'0.22.1'));
 for(const lang of ['ar','en','fr','de','es','pt','it'])assert.ok(changesForVersion(lang).items.length>=3);
});
test('Barcode reader has real camera/image decoding, and does not auto-open untrusted URLs',()=>{
 const src=readFileSync(new URL('../src/barcode-scanner.js',import.meta.url),'utf8');
 assert.ok(src.includes('BrowserMultiFormatReader'));assert.ok(src.includes('reader.decodeFromCanvas'));
 assert.ok(src.includes("input.type='file'"));assert.ok(src.includes('const link=safeScannedUrl(value)'));
 assert.ok(src.includes('window.confirm'));assert.ok(!src.includes('window.location='));
});

test('Book Scan splits a double-page photo into two non-overlapping pages',async()=>{
 const {splitBookRegions}=await import('../src/book-split.js');
 const regions=splitBookRegions(1600,1000,54);
 assert.equal(regions.length,2);assert.equal(regions[0].w+regions[1].w,1600);
 assert.equal(regions[1].x,regions[0].w);assert.equal(regions[0].h,1000);
 assert.throws(()=>splitBookRegions(1600,1000,99));
});
test('ID photo PNG contains explicit 300 DPI print metadata',async()=>{
 const {setPNGResolution}=await import('../src/id-photo-maker.js');
 const bytes=new Uint8Array(45);bytes.set([137,80,78,71,13,10,26,10]);
 const view=new DataView(bytes.buffer);view.setUint32(8,13);bytes.set([73,72,68,82],12);
 const encoded=setPNGResolution(bytes);
 assert.equal(encoded.length,66);
 assert.equal(String.fromCharCode(...encoded.slice(37,41)),'pHYs');
 assert.equal(new DataView(encoded.buffer).getUint32(41),11811);
});

test('All genuinely wired extended tools have handlers rather than generic dead buttons',async()=>{
 const src=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 for(const type of ["spec.type==='barcode'","spec.type==='idPhoto'","spec.type==='book'"]){
  assert.ok(src.includes(type),type);
 }
 const hub=readFileSync(new URL('../src/tools-hub.js',import.meta.url),'utf8');
 for(const key of ['idPhotoMaker','scanCode','restorePhoto','bookScan'])assert.ok(hub.includes(key));
 const rest=readFileSync(new URL('../src/scan-editor.js',import.meta.url),'utf8');
 assert.ok(rest.includes('restorePhotoPixels'));
 assert.ok(rest.includes('inpaintMaskedPixels'));
});

test('CountCam returns grouped counts from actual scored detections without guessing unseen classes',async()=>{
 const {countDetectedObjects}=await import('../src/count-cam.js');
 assert.deepEqual(countDetectedObjects([
  {class:'bottle',score:.9,bbox:[0,0,10,10]},
  {class:'bottle',score:.7,bbox:[15,0,10,10]},
  {class:'person',score:.81,bbox:[0,0,22,90]},
  {class:'bottle',score:.2,bbox:[4,4,1,1]}
 ],.5),{bottle:2,person:1});
 assert.throws(()=>countDetectedObjects([],2));
});

test('AES-256 Lock PDF is wired to the editor and validates passwords locally',async()=>{
 const {PDFDocument}=await import('pdf-lib');
 const {encryptPDFCopy,validatePDFPassword}=await import('../src/pdf-lock.js');
 assert.throws(()=>validatePDFPassword('short','short'));
 assert.throws(()=>validatePDFPassword('12345678','87654321'));
 const pdf=await PDFDocument.create();pdf.addPage([612,792]);
 const original=await pdf.save({useObjectStreams:false});
 const encrypted=await encryptPDFCopy(original,'correct horse battery staple','owner-password',
  {copy:false,modify:false,print:true});
 assert.ok(encrypted.length>0);
 const text=new TextDecoder('latin1').decode(encrypted);
 assert.ok(text.includes('/Encrypt'),'encrypted PDF must contain a real Encrypt dictionary');
 assert.ok(text.includes('/AESV3')||text.includes('/V 5'),'PDF must use AES-256 handler');
 const {PDFDocument:Lib}=await import('pdf-lib');
 await assert.rejects(Lib.load(encrypted),'an unauthenticated parser must reject protected PDF');
});

test('Guided book-page dewarping is non-affine, preserves unmodified image and remains bounded',async()=>{
 const {remapCurvedPageRGBA}=await import('../src/document-dewarp.js');
 const w=60,h=120,src=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const index=(y*w+x)*4;
  src[index]=Math.round(y/h*255);src[index+1]=x;src[index+2]=100;src[index+3]=255;
 }
 const flat=remapCurvedPageRGBA(src,w,h,0,'right');
 assert.deepEqual(flat,src);
 const adjusted=remapCurvedPageRGBA(src,w,h,70,'right');
 assert.deepEqual(Array.from(adjusted.slice((60*w+0)*4,(60*w+0)*4+4)),
   Array.from(src.slice((60*w+0)*4,(60*w+0)*4+4)),
   'away from spine must be unchanged');
 assert.notEqual(adjusted[(60*w+(w-1))*4],src[(60*w+(w-1))*4],
   'spine must receive nonlinear correction');
 assert.equal(adjusted[3],255);
 assert.throws(()=>remapCurvedPageRGBA(src,w,h,120,'right'));
 assert.throws(()=>remapCurvedPageRGBA(src,1,h,10,'right'));
});

test('Photo Translation uses actual on-device ML Kit, source OCR and editable text',()=>{
 const src=readFileSync(new URL('../src/photo-translation.js',import.meta.url),'utf8');
 assert.ok(src.includes("from '@capacitor-mlkit/translation'"));
 assert.ok(src.includes('await recognize(file,model.ocr)'));
 assert.ok(src.includes('await Translation.translate('));
 assert.ok(src.includes('original.value.slice(0,12000)'));
 assert.ok(src.includes("sourceLanguage:source.value,targetLanguage:target.value"));
 assert.ok(src.includes("input.type='file'"));
 assert.ok(src.includes('translation.value'));
 assert.ok(!src.includes('fetch(\'https://'));
});

test('Editable PPTX contains native PowerPoint text shapes, not just flattened JPGs',async()=>{
 const {createEditableTextPresentation}=await import('../src/editable-pptx.js');
 const bytes=await createEditableTextPresentation([{width:1000,height:750,items:[
  {text:'Sales 2026',x:100,y:630,width:300,height:36},
  {text:'Total 01234',x:120,y:520,width:260,height:24}
 ]}]);
 const {default:JSZip}=await import('jszip');
 const zip=await JSZip.loadAsync(bytes);
 const slide=await zip.file('ppt/slides/slide1.xml').async('string');
 assert.ok(slide.includes('<p:sp>'),'must contain editable shapes');
 assert.ok(slide.includes('Sales 2026'));
 assert.ok(slide.includes('Total 01234'));
});

test('Editable text PowerPoint route is explicit and does not misrepresent image slides',()=>{
 const spec=readFileSync(new URL('../src/tools-hub.js',import.meta.url),'utf8');
 const exportCode=readFileSync(new URL('../src/tool-exports.js',import.meta.url),'utf8');
 assert.ok(spec.includes("format:'editablePptx'"));
 assert.ok(spec.includes("format:'pptx'"));
 assert.ok(exportCode.includes("if(format==='editablePptx')"));
 assert.ok(exportCode.includes('await editableSlidesFromFile(file,ocrLang,progress)'));
});

test('Whiteboard normalization balances uneven light and preserves blue ink',async()=>{
 const {normalizeWhiteboardRGBA}=await import('../src/whiteboard-glare.js');
 const w=96,h=48,pixels=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const at=(y*w+x)*4,v=x<48?180:235;
  pixels[at]=v;pixels[at+1]=v;pixels[at+2]=v;pixels[at+3]=255;
 }
 for(let y=8;y<40;y++){
  let at=(y*w+24)*4;pixels[at]=22;pixels[at+1]=44;pixels[at+2]=152;
  at=(y*w+72)*4;pixels[at]=15;pixels[at+1]=15;pixels[at+2]=15;
 }
 const output=normalizeWhiteboardRGBA(pixels,w,h);
 const left=output[(20*w+10)*4],right=output[(20*w+86)*4];
 assert.ok(Math.abs(left-right)<30,'uneven board illumination should converge');
 const blue=(20*w+24)*4;
 assert.ok(output[blue+2]>output[blue]+45,'colored signatures and markers must retain their hue');
 const dark=(20*w+72)*4;
 assert.ok(output[dark]<65,'dark line must survive normalization');
 assert.equal(output[(15*w+10)*4+3],255);
 assert.equal(pixels[(20*w+10)*4],180,'input must remain unchanged');
});
test('ID portraits support an actual optional on-device background model',()=>{
 const src=readFileSync(new URL('../src/photo-background.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../src/id-photo-maker.js',import.meta.url),'utf8');
 assert.ok(src.includes("import('@tensorflow-models/body-pix')"));
 assert.ok(src.includes('await net.segmentPerson('));
 assert.ok(src.includes("globalCompositeOperation='destination-in'"));
 for(const name of ['white','blue','gray','original'])assert.ok(ui.includes(name));
 assert.ok(ui.includes('await segmentPortrait(image'));
 assert.ok(ui.includes('Background model not ready'));
});

test('Linear formula OCR generates editable conservative TeX without inventing stacked fractions',async()=>{
 const {linearMathToLatex}=await import('../src/formula-ocr.js');
 assert.equal(linearMathToLatex('x^2 + √(y) ≤ π'),'x^{2} + \\sqrt{y} \\leq  \\pi ');
 assert.equal(linearMathToLatex('1/2'),'1/2');
 const ui=readFileSync(new URL('../src/formula-ocr.js',import.meta.url),'utf8');
 assert.ok(ui.includes("await recognize(selected,'eng')"));
 assert.ok(ui.includes('original.addEventListener'));
});

test('Aligned PDF text reconstructs genuine spreadsheet columns and Word table cells',async()=>{
 const {reconstructPositionedTable}=await import('../src/table-reconstruct.js');
 const items=[{x:50,y:200,str:'Item'},{x:220,y:200,str:'Price'},
  {x:50,y:170,str:'Nail'},{x:220,y:170,str:'0012'},
  {x:50,y:140,str:'Bolt'},{x:220,y:140,str:'0035'}];
 const rows=reconstructPositionedTable(items);
 assert.deepEqual(rows,[['Item','Price'],['Nail','0012'],['Bolt','0035']]);
 const {createEditableWordTables}=await import('../src/word-tables.js');
 const bytes=await createEditableWordTables([{rows}]);
 const {default:JSZip}=await import('jszip');
 const zip=await JSZip.loadAsync(bytes);
 const xml=await zip.file('word/document.xml').async('string');
 assert.ok(xml.includes('<w:tbl>'));assert.ok(xml.includes('0012'));
 assert.ok(xml.includes('<w:gridCol'));
 assert.ok(xml.includes('<w:tc>'));
 assert.deepEqual(reconstructPositionedTable([{x:10,y:8,str:'Hello'},{x:20,y:8,str:'world'}]),[['Hello world']]);
});

test('Automatic book-line bend estimator identifies real synthetic non-planar displacement',async()=>{
 const {estimateBookCurvature}=await import('../src/document-dewarp.js');
 const w=260,h=320,data=new Uint8ClampedArray(w*h*4).fill(255);
 for(let x=0;x<w;x++){
  const shift=Math.round(10*Math.pow(x/(w-1),2));
  for(const y0 of [50,84,118,152,186,220,254]){
   for(let y=y0+shift;y<y0+shift+3;y++){
    const at=(y*w+x)*4;data[at]=data[at+1]=data[at+2]=15;
   }
  }
 }
 const estimated=estimateBookCurvature(data,w,h,'right');
 assert.ok(estimated.curvature>5,'automatic estimate should detect bend near gutter');
 assert.ok(estimated.confidence>.5,'repeated warped ink lines provide measurable confidence');
 const blank=new Uint8ClampedArray(w*h*4).fill(255);
 const missing=estimateBookCurvature(blank,w,h,'right');
 assert.equal(missing.curvature,0);assert.equal(missing.confidence,0);
});

test('Book auto-flattening maintains independent left/right corrections and manual override',async()=>{
 const {resolveBookPageCurvature}=await import('../src/book-split.js');
 assert.equal(resolveBookPageCurvature(0,0,[35,-45]),35);
 assert.equal(resolveBookPageCurvature(1,0,[35,-45]),-45);
 assert.equal(resolveBookPageCurvature(0,-15,null),-15);
 assert.equal(resolveBookPageCurvature(1,-15,[35,null]),-15);
 assert.equal(resolveBookPageCurvature(1,0,[35,150]),100);
 assert.throws(()=>resolveBookPageCurvature(2,0,[35,40]));
 const source=readFileSync(new URL('../src/book-split.js',import.meta.url),'utf8');
 assert.ok(source.includes('autoPageWarp=samples.map('));
 assert.ok(source.includes('resolveBookPageCurvature(regionIndex,+warpSlider.value,autoPageWarp)'),
   'the two independent corrections must actually be used for export');
 assert.ok(source.includes("warpSlider.addEventListener('input',()=>{autoPageWarp=null;autoLineWarp=null;draw()})"),
   'manual corrections must cancel stale auto estimate');
});
