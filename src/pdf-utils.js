/** Parse one-based page numbers and ranges into zero-based indices. */
export function parsePages(spec,total,{allowEmpty=false,requireUnique=false}={}) {
  if (!Number.isInteger(total) || total < 1) throw new Error('PDF must contain at least one page.');
  if (typeof spec !== 'string') throw new Error('Page selection must be text.');
  if (!spec.trim() && allowEmpty) return Array.from({length:total},(_,i)=>i);
  if (!spec.trim()) throw new Error('Enter the page numbers first.');
  const result=[];
  for(const token of spec.split(',')) {
    const m=token.trim().match(/^(\d+)\s*(?:-\s*(\d+))?$/);
    if(!m) throw new Error(`Invalid page range: ${token}`);
    const a=Number(m[1]),b=m[2]?Number(m[2]):a;
    if(!Number.isSafeInteger(a)||!Number.isSafeInteger(b)||a<1||b<a||b>total)
      throw new Error(`Page range outside 1–${total}: ${token}`);
    for(let n=a;n<=b;n++) result.push(n-1);
  }
  if(requireUnique&&new Set(result).size!==result.length) throw new Error('Each page can be listed only once.');
  return result;
}
