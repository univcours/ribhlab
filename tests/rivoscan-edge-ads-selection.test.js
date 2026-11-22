import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {edgeAdjustableDocument,validEdgeQuadrilateral,projectiveSquareToQuad,perspectiveCropImageData} from '../src/edge-adjustment.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('PDF and real document images support edge adjustment; TXT, QR, barcode and spreadsheets do not',()=>{
 for(const type of [
  {name:'RS_Doc_20261115.pdf',mimeType:'application/pdf'},
  {name:'photo.jpg',mimeType:'image/jpeg'},
  {name:'scan.png',mimeType:'image/png'}
 ])assert.equal(edgeAdjustableDocument(type),true);
 for(const type of [
  {name:'RS_QR.txt',mimeType:'text/plain'},
  {name:'RS_Bar.txt',mimeType:'text/plain'},
  {name:'table.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'},
  {name:'notes.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}
 ])assert.equal(edgeAdjustableDocument(type),false);
});

test('perspective coordinates map all four corners and reject crossed polygons',()=>{
 const quadrilateral=[[.10,.15],[.91,.07],[.82,.94],[.12,.85]];
 assert.equal(validEdgeQuadrilateral(quadrilateral),true);
 const project=projectiveSquareToQuad(quadrilateral);
 for(const [u,v,i] of [[0,0,0],[1,0,1],[1,1,2],[0,1,3]]){
  const xy=project(u,v);
  assert.ok(Math.abs(xy[0]-quadrilateral[i][0])<1e-6);
  assert.ok(Math.abs(xy[1]-quadrilateral[i][1])<1e-6);
 }
 assert.equal(validEdgeQuadrilateral([[0,0],[1,1],[1,0],[0,1]]),false);
 assert.throws(()=>projectiveSquareToQuad([[0,0],[1,1],[1,0],[0,1]]));
});
test('perspective crop renders from original pixels without modifying source',()=>{
 const width=130,height=130,src=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const idx=(y*width+x)*4;src[idx]=x;src[idx+1]=y;src[idx+2]=40;src[idx+3]=255;
 }
 const sourceCopy=src.slice();
 const result=perspectiveCropImageData({width,height,data:src},[[.1,.1],[.9,.1],[.9,.9],[.1,.9]]);
 assert.ok(result.width>=120&&result.height>=120);
 assert.deepEqual(src,sourceCopy);
 const midpoint=Math.floor(result.height/2)*result.width*4+Math.floor(result.width/2)*4;
 assert.ok(Math.abs(result.data[midpoint]-65)<3,'center x remains mapped');
 assert.ok(Math.abs(result.data[midpoint+1]-65)<3,'center y remains mapped');
 assert.equal(result.data[midpoint+3],255);
});
test('only supported documents offer edge adjustment in row menu, bulk tools still require two',()=>{
 const main=read('src/main.js'),bulk=read('src/library-bulk.js');
 assert.ok(main.includes('edgeAdjustableDocument(doc)'));
 assert.ok(main.includes('edgeAdjustableDocument(item)'));
 assert.ok(main.includes('data-doc-edges'));
 assert.ok(main.includes("ico('edges',15)"));
 assert.match(main,/openEdgeAdjustment\(\{/);
 assert.match(main,/onSave:saveOut/);
 assert.match(bulk,/selected\.size<2/);
 assert.match(bulk,/function selectBanner\(\)\{return '';?\}/);
});
test('PDF adjustment saves a new PDF with all other original pages unchanged',()=>{
 const edges=read('src/edge-adjustment.js');
 assert.ok(edges.includes('pdf.removePage(pdfPage-1)'));
 assert.ok(edges.includes('pdf.insertPage(pdfPage-1'));
 assert.ok(edges.includes("await onSave(await pdf.save()"));
 assert.ok(edges.includes("await onSave(correctedBytes"));
 assert.doesNotMatch(edges,/bridge\.deleteFile|bridge\.renameFile/);
});
test('native Banner and regular Interstitial respect editor overlay without Rewarded or app-open ads',()=>{
 const ads=read('src/monetization.js');
 assert.match(ads,/AdMob\.showBanner\(/);
 assert.match(ads,/AdMob\.prepareInterstitial\(/);
 assert.match(ads,/AdMob\.showInterstitial\(/);
 assert.match(read('src/rivo-ui-04567.css'),/\.rivo-edge-adjust-overlay/);
 assert.doesNotMatch(ads,/(?:prepareReward|showReward|RewardAdPluginEvents|rivo-reward-watch)/);
 assert.doesNotMatch(ads,/AdMob\.(?:loadAppOpen|showAppOpen)/);
});
