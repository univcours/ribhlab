#!/usr/bin/env node
// Production only. Validate true AdMob IDs and patch AndroidManifest after Capacitor sync.
import {readFileSync,writeFileSync} from 'node:fs';
const e=process.env,app=e.VITE_RIVO_ADMOB_APP_ID||'',inter=e.VITE_RIVO_ADMOB_INTERSTITIAL_ID||'';
const banner=e.VITE_RIVO_ADMOB_BANNER_ID||'';
const owner=id=>id.split(/[~/]/)[0],demo='ca-app-pub-3940256099942544';
// RivoScan's approved AdMob Application ID never changes with the app version.
export const RIVO_APPROVED_ADMOB_APP_ID='ca-app-pub-7945572016731367~1509328607';
if(e.VITE_RIVO_ADMOB_MODE!=='live')throw Error('Must explicitly enable live AdMob for release');
if(app!==RIVO_APPROVED_ADMOB_APP_ID)throw Error('Incorrect RivoScan AdMob application ID; never modify it during version bumps');
if(!/^ca-app-pub-\d{16}~\d+$/.test(app)||!/^ca-app-pub-\d{16}\/\d+$/.test(inter))throw Error('Real AdMob app ID and interstitial unit ID required');
if(banner&&!/^ca-app-pub-\d{16}\/\d+$/.test(banner))throw Error('Invalid AdMob Banner ID');
if(!banner)console.warn('WARNING: Banner ID not configured, only the Banner placement will be disabled.');
if(owner(app)===demo||owner(inter)!==owner(app)||(banner&&owner(banner)!==owner(app)))throw Error('Demo or mismatched AdMob publisher ID');
if(!process.argv.includes('--check-only')){
 const f='android/app/src/main/AndroidManifest.xml';
 let xml=readFileSync(f,'utf8');
 const exp=/(<meta-data\s+android:name="com\.google\.android\.gms\.ads\.APPLICATION_ID"\s+android:value=")[^"]+("\s*\/>)/g;
 if([...xml.matchAll(exp)].length!==1)throw Error('Expected one existing Android AdMob App ID');
 xml=xml.replace(exp,'$1'+app+'$2');
 if(!xml.includes('android:value="'+app+'"'))throw Error('AdMob manifest patch verification failed');
 writeFileSync(f,xml);
}
console.log('PASS: production Banner + Interstitial IDs verified (no Google demo identifiers)');
