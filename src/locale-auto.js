/** Device-language is automatic unless a user explicitly overrides it.
 * English is the safe fallback for unsupported and unavailable locales.
 */
export const supportedRivoLanguages=Object.freeze(['en','ar','fr','es','de','pt','it']);
export function deviceLanguage(languages=[]){
 // Follow only the primary phone language. If that locale is unavailable,
 // English is the fallback; a secondary browser preference must not silently
 // replace the selected device language.
 const primary=Array.isArray(languages)?languages[0]:languages;
 const first=String(primary||'').toLowerCase().split(/[-_]/)[0];
 return supportedRivoLanguages.includes(first)?first:'en';
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
