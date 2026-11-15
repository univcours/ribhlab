/** Device-language is automatic unless a user explicitly overrides it.
 * English is the safe fallback for unsupported and unavailable locales.
 */
export const supportedRivoLanguages=Object.freeze(['en','ar','fr','es','de','pt','it']);
export function deviceLanguage(languages=[]){
 // Respect the phone's ordered language preferences, choosing the first
 // supported one. If none are available, the application defaults to English.
 const list=Array.isArray(languages)?languages:[languages];
 for(const value of list){
  const first=String(value||'').toLowerCase().split(/[-_]/)[0];
  if(supportedRivoLanguages.includes(first))return first;
 }
 return 'en';
}
export function savedLanguagePreference(storage){
 const code=storage?.getItem?.('rivo-language');
 return supportedRivoLanguages.includes(code)?code:null;
}
export function initialLanguage(saved,deviceLanguages){
 return supportedRivoLanguages.includes(saved)?saved:deviceLanguage(deviceLanguages);
}
export function effectiveLanguage({saved=null,browserLanguages=[],androidLanguage=null}={}){
 if(supportedRivoLanguages.includes(saved))return saved;
 if(androidLanguage)return deviceLanguage([androidLanguage]);
 return deviceLanguage(browserLanguages);
}
export function isAutoLanguage(storage){
 return savedLanguagePreference(storage)===null;
}
