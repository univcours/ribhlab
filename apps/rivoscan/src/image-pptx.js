/** Standards-compliant image-backed PPTX; images are embedded without stretching. */
export async function createImageSlideDeck(images){
 if(!Array.isArray(images)||images.length<1||images.length>30)
  throw Error('PowerPoint requires between 1 and 30 pages');
 const {default:PptxGen}=await import('pptxgenjs');
 const pptx=new PptxGen();
 pptx.layout='LAYOUT_WIDE';
 pptx.author='RivoScan';
 pptx.subject='Document pages exported to image slides';
 pptx.title='RivoScan scanned document';
 const W=13.333, H=7.5;
 let totalBytes=0;
 for(const page of images){
  if(!(page?.bytes instanceof Uint8Array)||page.bytes.length<8||
    !Number.isFinite(page.width)||!Number.isFinite(page.height)||
    page.width<=0||page.height<=0)
   throw Error('Invalid image or slide dimensions');
  if(page.bytes[0]!==0xFF||page.bytes[1]!==0xD8||
     page.bytes[page.bytes.length-2]!==0xFF||page.bytes[page.bytes.length-1]!==0xD9)
   throw Error('Slide image must be a complete JPEG');
  totalBytes+=page.bytes.length;
  if(totalBytes>40*1024*1024)throw Error('PowerPoint export limit: 40 MB of images');
  let binary='';
  for(let p=0;p<page.bytes.length;p+=16384)
   binary+=String.fromCharCode(...page.bytes.subarray(p,p+16384));
  const data='data:image/jpeg;base64,'+btoa(binary);
  const ratio=page.width/page.height;
  const w=Math.min(W,H*ratio),h=w/ratio;
  const slide=pptx.addSlide();
  slide.background={color:'FFFFFF'};
  slide.addImage({data,x:(W-w)/2,y:(H-h)/2,w,h});
 }
 return new Uint8Array(await pptx.write({outputType:'arraybuffer',compression:true}));
}
