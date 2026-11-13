#!/usr/bin/env node
// Production only. Validate true AdMob IDs and patch AndroidManifest after Capacitor sync.
import {readFileSync,writeFileSync} from 'node:fs';
const e=process.env,app=e.VITE_RIVO_ADMOB_APP_ID||'',inter=e.VITE_RIVO_ADMOB_INTERSTITIAL_ID||'',open=e.VITE_RIVO_ADMOB_APP_OPEN_ID||'';
const banner=e.VITE_RIVO_ADMOB_BANNER_ID||'';
const owner=id=>id.split(/[~/]/)[0],demo='ca-app-pub-3940256099942544';
if(e.VITE_RIVO_ADMOB_MODE!=='live')throw Error('Must explicitly enable live AdMob for release');
if(!/^ca-app-pub-\d{16}~\d+$/.test(app)||!/^ca-app-pub-\d{16}\/\d+$/.test(inter))throw Error('Real AdMob app ID and interstitial unit ID required');
if(open&&!/^ca-app-pub-\d{16}\/\d+$/.test(open))throw Error('Invalid App Open unit ID');
if(banner&&!/^ca-app-pub-\d{16}\/\d+$/.test(banner))throw Error('Invalid AdMob Banner ID');
if(!banner)console.warn('WARNING: Banner ID not configured, only the Banner placement will be disabled.');
if(owner(app)===demo||owner(inter)!==owner(app)||(open&&owner(open)!==owner(app))||(banner&&owner(banner)!==owner(app)))throw Error('Demo or mismatched AdMob publisher ID');
if(!process.argv.includes('--check-only')){
 const f='android/app/src/main/AndroidManifest.xml';
 let xml=readFileSync(f,'utf8');
 const exp=/(<meta-data\s+android:name="com\.google\.android\.gms\.ads\.APPLICATION_ID"\s+android:value=")[^"]+("\s*\/>)/g;
 if([...xml.matchAll(exp)].length!==1)throw Error('Expected one existing Android AdMob App ID');
 xml=xml.replace(exp,'$1'+app+'$2');
 if(!xml.includes('android:value="'+app+'"'))throw Error('AdMob manifest patch verification failed');
 writeFileSync(f,xml);
}
console.log('PASS: production Banner + Interstitial + App Open IDs verified (no Google demo identifiers)');
