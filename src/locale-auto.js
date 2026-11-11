/** Use Android/WebView device locale at first launch; manual choice always wins. */
export const supportedRivoLanguages=Object.freeze(['en','ar','fr','es','de','pt','it']);
export function deviceLanguage(languages=[]){
 const list=Array.isArray(languages)?languages:[languages];
 for(const value of list){
  const first=String(value||'').toLowerCase().split(/[-_]/)[0];
  if(supportedRivoLanguages.includes(first))return first;
 }
 return 'en';
}
export function initialLanguage(saved,deviceLanguages){
 return supportedRivoLanguages.includes(saved)?saved:deviceLanguage(deviceLanguages);
}
