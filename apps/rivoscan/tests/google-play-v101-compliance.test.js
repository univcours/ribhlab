import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const file=p=>readFileSync(new URL(p,root),'utf8');

test('Play v102 bumps matching source, Android release name, and Studio signing path',()=>{
 const p=Object.fromEntries(file('rivoscan-version.properties').split(/\r?\n/)
   .filter(x=>/^(versionName|versionCode)=/.test(x)).map(x=>x.split('=')));
 assert.equal(p.versionName,'0.44.26');
 assert.equal(Number(p.versionCode),102);
 assert.equal(JSON.parse(file('package.json')).version,p.versionName);
 assert.match(file('prepare-rivoscan-production-android-studio.ps1'),/-lt 102/);
 assert.equal(JSON.parse(file('capacitor.config.json')).appId,'com.ribhlab.rivoscan');
});
test('Google Play candidate v101 embeds honest current advertising and AI policy',()=>{
 const privacy=file('public/privacy.html');
 for(const token of ['com.ribhlab.rivoscan','AdMob','OpenAI','consent','STUN',
                     'API key','device information','diagnostics','sharing','November 7, 2026'])
   assert.ok(privacy.includes(token),'Missing privacy disclosure '+token);
 assert.doesNotMatch(privacy,/(?:no ads|contains no advertising|no cloud AI|Privacy Policy — Draft)/i);
 const ads=file('src/monetization.js');
 assert.doesNotMatch(ads,/prepareRewardVideoAd|showRewardVideoAd/);
 assert.ok(ads.includes('AdmobConsentStatus'));
});
test('Owner-approved green launcher remains used for release',()=>{
 const iconScript=file('scripts/create-turquoise-icon.mjs');
 assert.ok(iconScript.includes('67cd03f1d7e91e50ed398cc03c0a77482721e23053831df13984dbe3dffd9ce3'));
 assert.ok(iconScript.includes('rivoscan-original-green-icon-512.png'));
});
