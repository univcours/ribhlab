/** Offline safety checks for RivoScan Android releases; never touches Play API or secrets. */
import {readFileSync, statSync, existsSync, appendFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
export const APP_ID='com.ribhlab.rivoscan';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export function parseVersions(input){
 const values=Object.create(null);
 for(const line of String(input).split(/\r?\n/)){
  const found=/^(versionCode|versionName)\s*=\s*([^#\s]+)\s*$/.exec(line.trim());
  if(found){
   if(Object.hasOwn(values,found[1]))throw Error('Duplicate '+found[1]+' in version file');
   values[found[1]]=found[2];
  }
 }
 return values;
}
export function inspectSource({packageJson,capacitor,properties,privacyPolicy}){
 const errors=[],warnings=[],versions=parseVersions(properties),code=Number(versions.versionCode);
 if(capacitor.appId!==APP_ID)errors.push('Capacitor appId does not match Play Console');
 if(capacitor.appName!=='RivoScan')errors.push('Unexpected app display name');
 if(!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(packageJson.version||''))errors.push('Invalid npm semantic version');
 if(versions.versionName!==packageJson.version)errors.push('Android/npm version mismatch');
 if(!/^[1-9][0-9]*$/.test(versions.versionCode||'')||!Number.isSafeInteger(code)||code<94)
  errors.push('Invalid or regressed Android versionCode; expected at least 94');
 if(packageJson.private!==true)warnings.push('NPM package should be private');
 const policy=String(privacyPolicy);
 if(!policy.includes(APP_ID))errors.push('Packaged privacy policy must name RivoScan appId');
 if(!/AdMob/i.test(policy))errors.push('Privacy policy does not mention AdMob');
 if(!/OpenAI/i.test(policy))errors.push('Privacy policy does not disclose optional cloud AI');
 if(!/document|PDF/i.test(policy))errors.push('Privacy policy does not discuss documents');
 return {ok:errors.length===0,errors,warnings,packageName:APP_ID,
  versionName:versions.versionName||null,versionCode:Number.isSafeInteger(code)?code:null};
}
export function verifyBundle(file,{expectSigned=false,run=spawnSync}={}){
 if(!existsSync(file))return{ok:false,errors:['Android App Bundle missing']};
 const errors=[];
 if(statSync(file).size<100000)errors.push('AAB is suspiciously small');
 const zip=run('unzip',['-t',file],{encoding:'utf8',maxBuffer:1048576});
 if(zip.error||zip.status!==0)errors.push('Android bundle ZIP integrity check failed');
 const list=run('unzip',['-Z','-1',file],{encoding:'utf8',maxBuffer:1048576});
 if(list.error||list.status!==0)errors.push('Cannot list bundle contents');
 const entries=new Set(String(list.stdout||'').split(/\r?\n/));
 for(const p of ['BundleConfig.pb','base/manifest/AndroidManifest.xml'])
  if(!entries.has(p))errors.push('Bundle missing '+p);
 if(![...entries].some(p=>/^base\/dex\/classes[0-9]*\.dex$/.test(p)))
  errors.push('Bundle missing compiled code');
 if(expectSigned){
  const sign=run('jarsigner',['-verify',file],{encoding:'utf8',maxBuffer:1048576});
  const output=String(sign.stdout||'')+String(sign.stderr||'');
  if(sign.error||sign.status!==0||!/jar verified/i.test(output)||/jar is unsigned/i.test(output))
   errors.push('AAB is not signed with a verifiable upload key');
 }
 return {ok:errors.length===0,errors,signedCheck:expectSigned,bytes:statSync(file).size};
}
function main(){
 const args=process.argv.slice(2),index=args.indexOf('--bundle');
 const signed=args.includes('--expect-signed');
 if(signed&&index<0)throw Error('--expect-signed requires --bundle');
 if(index>=0&&!args[index+1])throw Error('--bundle requires a path');
 if(args.some((a,i)=>!(a==='--bundle'||a==='--expect-signed'||(index>=0&&i===index+1))))
  throw Error('Unknown release preflight argument');
 const source=inspectSource({
  packageJson:JSON.parse(readFileSync(resolve(root,'package.json'),'utf8')),
  capacitor:JSON.parse(readFileSync(resolve(root,'capacitor.config.json'),'utf8')),
  properties:readFileSync(resolve(root,'rivoscan-version.properties'),'utf8'),
  privacyPolicy:readFileSync(resolve(root,'public/privacy.html'),'utf8')
 });
 const bundle=index>=0?verifyBundle(resolve(root,args[index+1]),{expectSigned:signed}):null;
 const ok=source.ok&&(!bundle||bundle.ok);
 const report={status:ok?'PASS':'FAIL',source,...(bundle?{bundle}:{}),
  note:'Offline checks are not a Google Play content-policy approval or publication.'};
 console.log(JSON.stringify(report,null,2));
 if(process.env.GITHUB_STEP_SUMMARY){
  const lines=['### RivoScan release preflight',
   '- Result: '+report.status,
   '- Application ID: '+source.packageName,
   '- Android version: '+source.versionName+' (code '+source.versionCode+')',
   '- Bundle structure inspected: '+(bundle?'yes':'not built yet'),
   '- Signed artifact verification: '+(signed?'requested':'not requested'),
   '- Play Console declarations and first-upload review remain separate',
   ...[...source.errors,...(bundle?.errors||[])].map(e=>'- FAIL: '+e),''];
  appendFileSync(process.env.GITHUB_STEP_SUMMARY,lines.join('\n'),'utf8');
 }
 if(!ok)process.exitCode=1;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{main()}catch(error){console.error('RivoScan preflight failed: '+error.message);process.exitCode=1}
}
