import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const main=read('src/main.js'),book=read('src/book-split.js');
const vision=read('src/rivo-mlkit-vision.js'),code=read('src/barcode-scanner.js');
const styles=read('src/rivo-mlkit-04577.css');
test('Android Book Scan takes up to six real Google ML Kit pages with crop review',()=>{
 assert.match(main,/pageLimit:spec\.type==='flatten'\?1:6,resultFormats:'JPEG',scannerMode:'FULL'/);
 assert.match(main,/DocumentScanner\.scanDocument/);
 assert.match(main,/readScannedImage\(uris\[i\],i\)/);
 assert.match(book,/const loadCaptured=async photos/);
 assert.match(book,/photo instanceof Blob\?URL\.createObjectURL\(photo\):photo/);
});
test('photo-powered document, formula and translation capture defaults to ML Kit on Android',()=>{
 assert.match(main,/async function captureMlkitDocumentPhoto\(\)/);
 const usages=main.match(/capture:\(\)=>captureMlkitDocumentPhoto\(\)/g)||[];
 assert.equal(usages.length,3);
 assert.match(vision,/TextRecognition\.processImage\(\{path,script:Script\.Latin\}\)/);
 assert.match(read('src/photo-translation.js'),/recognizeMlkitLatin/);
 assert.match(read('src/formula-ocr.js'),/recognizeMlkitLatin/);
});
test('real QR camera frames and imported images use ML Kit native decoding',()=>{
 assert.match(code,/readMlkitBarcodes\(frame\)/);
 assert.match(code,/readMlkitBarcodes\(item\)/);
 assert.match(code,/adaptMlkitBarcode/);
 assert.match(vision,/BarcodeScanner\.readBarcodesFromImage\(\{path\}\)/);
 assert.match(vision,/Filesystem\.deleteFile/);
});
test('interface uses light legible cards, vivid zoom ratio, vector book controls',()=>{
 assert.match(styles,/#fff,#f1f6fd/);
 assert.match(styles,/\.rivo-code-zoom-label/);
 assert.match(styles,/#123e6c/);
 assert.match(book,/tab\.innerHTML='<svg/);
 assert.doesNotMatch(book,/const icons=\{source:'▧'/);
});
test('0.45.78 uses unique monotonic Android code 192 and both ML Kit plugins',()=>{
 const pkg=JSON.parse(read('package.json'));
 assert.equal(pkg.version,'0.45.78');
 assert.equal(pkg.dependencies['@capacitor-mlkit/barcode-scanning'],'8.2.1');
 assert.equal(pkg.dependencies['@capacitor-mlkit/text-recognition'],'8.2.1');
 assert.match(read('rivoscan-version.properties'),/^versionCode=193$/m);
});
