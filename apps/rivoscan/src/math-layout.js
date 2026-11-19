/**
 * Conservative layout suggestions from actual OCR glyph boxes (no remote AI).
 * It intentionally abstains when the 2D geometry is unclear. The suggested
 * LaTeX is always editable and must be verified against the photographed math.
 */
export function suggestPrintedMathLayout(blocks){
 if(!Array.isArray(blocks))return null;
 const words=[];
 for(const block of blocks.slice(0,80))for(const paragraph of (block?.paragraphs||[]).slice(0,90))
  for(const line of (paragraph?.lines||[]).slice(0,90))
   for(const word of (line?.words||[]).slice(0,90)){
    const b=word?.bbox,t=String(word?.text||'').trim();
    if(!t||!b||!['x0','x1','y0','y1'].every(k=>Number.isFinite(b[k]))||
      b.x1<=b.x0||b.y1<=b.y0||b.x0<0||b.y0<0)continue;
    words.push({text:t,x0:b.x0,x1:b.x1,y0:b.y0,y1:b.y1,
      midX:(b.x0+b.x1)/2,height:b.y1-b.y0,width:b.x1-b.x0});
    if(words.length>250)return null;
   }
 const atom=t=>/^[A-Za-z0-9αβθπ+\-().]+$/.test(t);
 const asLatex=t=>t.replace(/π/g,'\\pi ').replace(/θ/g,'\\theta ')
   .replace(/α/g,'\\alpha ').replace(/β/g,'\\beta ');
 // A visibly horizontal, thin OCR glyph with a numerator and denominator
 // aligned above and below supports a stacked-fraction suggestion.
 for(const bar of words){
  if(!/^[-—–―_=]+$/.test(bar.text)||bar.width<20||bar.width/bar.height<3)continue;
  const near=word=>Math.abs(word.midX-bar.midX)<=bar.width*.58&&word!==bar;
  const top=words.filter(w=>near(w)&&w.y1<=bar.y0+2&&bar.y0-w.y1<=Math.max(55,bar.height*6)&&atom(w.text));
  const bottom=words.filter(w=>near(w)&&w.y0>=bar.y1-2&&w.y0-bar.y1<=Math.max(55,bar.height*6)&&atom(w.text));
  if(top.length<1||top.length>3||bottom.length<1||bottom.length>3)continue;
  top.sort((a,b)=>a.x0-b.x0);bottom.sort((a,b)=>a.x0-b.x0);
  const numerator=top.map(w=>asLatex(w.text)).join('');
  const denominator=bottom.map(w=>asLatex(w.text)).join('');
  if(numerator.length>60||denominator.length>60)continue;
  return {latex:'\\frac{'+numerator+'}{'+denominator+'}',confidence:'review',kind:'stacked-fraction'};
 }
 // Superscript/subscript requires a smaller glyph at the right edge of a
 // clearly larger baseline glyph; never infer complex handwriting structure.
 const candidates=words.filter(w=>atom(w.text)&&w.text.length<=6).sort((a,b)=>a.x0-b.x0);
 for(const base of candidates){
  for(const adjacent of candidates){
   if(base===adjacent||base.height<13||adjacent.height>base.height*.78||
      adjacent.x0<base.x1-2||adjacent.x0>base.x1+base.height*.7)continue;
   if(adjacent.y1<base.y0+base.height*.62&&adjacent.y0<base.y0+base.height*.22)
    return {latex:asLatex(base.text)+'^{'+asLatex(adjacent.text)+'}',confidence:'review',kind:'superscript'};
   if(adjacent.y0>base.y0+base.height*.64)
    return {latex:asLatex(base.text)+'_{'+asLatex(adjacent.text)+'}',confidence:'review',kind:'subscript'};
  }
 }
 return null;
}
