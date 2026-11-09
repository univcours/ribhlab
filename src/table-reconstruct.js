/**
 * Rebuild aligned Excel columns from position-bearing PDF text fragments.
 * Pages with repeated x-column anchors are handled as tables; plain text
 * pages fall back to a single editable text cell per visual row.
 */
export function reconstructPositionedTable(items,{rowTolerance=5,columnTolerance=16,maxColumns=32}={}){
 if(!Array.isArray(items))throw Error('Text items must be an array');
 const tokens=items.filter(it=>String(it?.str??'').trim()&&Number.isFinite(it.x)&&Number.isFinite(it.y))
  .map(it=>({str:String(it.str).trim().slice(0,32767),x:it.x,y:it.y}));
 if(!tokens.length)return [];
 if(tokens.length>15000)throw Error('Too many PDF text fragments');
 tokens.sort((a,b)=>b.y-a.y||a.x-b.x);
 const groups=[];
 for(const token of tokens){
  const row=groups.find(entry=>Math.abs(entry.y-token.y)<=rowTolerance);
  if(row){row.text.push(token);row.y=(row.y*(row.text.length-1)+token.y)/row.text.length}
  else groups.push({y:token.y,text:[token]});
 }
 groups.sort((a,b)=>b.y-a.y);
 for(const row of groups)row.text.sort((a,b)=>a.x-b.x);
 const anchors=[];
 for(const row of groups){
  for(const token of row.text){
   let best=null,distance=Infinity;
   for(const cluster of anchors){
    const gap=Math.abs(token.x-cluster.x);
    if(gap<=columnTolerance&&gap<distance){best=cluster;distance=gap}
   }
   if(best){best.x=(best.x*best.hits+token.x)/(best.hits+1);best.hits++;best.rows.add(row)}
   else anchors.push({x:token.x,hits:1,rows:new Set([row])});
  }
 }
 // Columns require repeat evidence across rows; one-off indents are not tables.
 let repeated=anchors.filter(x=>x.rows.size>=Math.max(2,Math.ceil(groups.length*.23)))
  .sort((a,b)=>a.x-b.x);
 if(repeated.length<2||groups.length<2){
  return groups.map(row=>[row.text.map(t=>t.str).join(' ')]);
 }
 // Nearby columns from fragmented words are merged into one table column.
 const consolidated=[];
 for(const col of repeated){
  const prior=consolidated[consolidated.length-1];
  if(prior&&col.x-prior.x<columnTolerance*1.5){
   prior.x=(prior.x+col.x)/2;
  }else consolidated.push({x:col.x});
 }
 repeated=consolidated.slice(0,maxColumns);
 return groups.map(row=>{
  const values=Array.from({length:repeated.length},()=>[]);
  for(const token of row.text){
   let best=0,distance=Infinity;
   for(let i=0;i<repeated.length;i++){
    const gap=Math.abs(token.x-repeated[i].x);
    if(gap<distance){distance=gap;best=i}
   }
   values[best].push(token.str);
  }
  return values.map(parts=>parts.join(' '));
 });
}
