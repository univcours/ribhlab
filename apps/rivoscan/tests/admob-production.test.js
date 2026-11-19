import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveAdMobConfig,SAMPLE_ADMOB_APP_ID} from '../src/admob-config.js';
import {RIVOSCAN_ADMOB_APP_ID,RIVOSCAN_INTERSTITIAL_ID,RIVOSCAN_APP_OPEN_ID,RIVOSCAN_REWARDED_ID} from '../src/admob-production-ids.js';
import {readFileSync} from 'node:fs';
const live={VITE_RIVOSCAN_ADMOB_PRODUCTION:'true',
 VITE_RIVOSCAN_ADMOB_APP_ID:RIVOSCAN_ADMOB_APP_ID,
 VITE_RIVOSCAN_ADMOB_INTERSTITIAL_ID:RIVOSCAN_INTERSTITIAL_ID,
 VITE_RIVOSCAN_ADMOB_APP_OPEN_ID:RIVOSCAN_APP_OPEN_ID};
test('Verified original RivoScan IDs from 2026-11-06 remain distinct from demo IDs',()=>{
 assert.equal(RIVOSCAN_ADMOB_APP_ID,'ca-app-pub-7945572016731367~1509328607');
 assert.equal(RIVOSCAN_INTERSTITIAL_ID,'ca-app-pub-7945572016731367/5608742752');
 assert.equal(RIVOSCAN_APP_OPEN_ID,'ca-app-pub-7945572016731367/6270875707');
 assert.equal(RIVOSCAN_REWARDED_ID,'ca-app-pub-7945572016731367/4148993879');
});
test('Debug uses only Google sample IDs and cannot show banner',()=>{
 const cfg=resolveAdMobConfig({});
 assert.equal(cfg.androidAppId,SAMPLE_ADMOB_APP_ID);
 assert.equal(cfg.testMode,true);assert.equal(cfg.production,false);
 assert.equal(cfg.bannerEnabled,false);
});
test('Production accepts only recovered original RivoScan App ID and ad units',()=>{
 const cfg=resolveAdMobConfig(live);
 assert.equal(cfg.testMode,false);assert.equal(cfg.production,true);
 assert.equal(cfg.androidAppId,RIVOSCAN_ADMOB_APP_ID);
 assert.equal(cfg.interstitial,RIVOSCAN_INTERSTITIAL_ID);
 assert.equal(cfg.appOpen,RIVOSCAN_APP_OPEN_ID);
 assert.equal(cfg.rewarded,null,'No rewarded paywall is enabled; avoid an unwanted gating change');
 assert.equal(cfg.bannerEnabled,false);
});
test('Refuse mismatched, demo or other-app AdMob IDs on production builds',()=>{
 const errors=[
  {VITE_RIVOSCAN_ADMOB_PRODUCTION:'true'},
  {...live,VITE_RIVOSCAN_ADMOB_APP_ID:SAMPLE_ADMOB_APP_ID},
  {...live,VITE_RIVOSCAN_ADMOB_APP_ID:'ca-app-pub-7945572016731367~1688423435'},
  {...live,VITE_RIVOSCAN_ADMOB_INTERSTITIAL_ID:'ca-app-pub-7945572016731367/8117339646'},
  {...live,VITE_RIVOSCAN_ADMOB_INTERSTITIAL_ID:'ca-app-pub-3940256099942544/1033173712'},
  {...live,VITE_RIVOSCAN_ADMOB_APP_OPEN_ID:'ca-app-pub-7945572016731367/5391382225'}
 ];
 for(const env of errors)assert.throws(()=>resolveAdMobConfig(env),/AdMob|unit/);
});
test('App Open unit can be explicitly omitted without replacing it with a sample ID',()=>{
 const cfg=resolveAdMobConfig({...live,VITE_RIVOSCAN_ADMOB_APP_OPEN_ID:''});
 assert.equal(cfg.appOpen,null);
});
test('Release AAB selects archived real IDs, not unverifiable external settings',()=>{
 const workflow=readFileSync(new URL('../../../.github/workflows/rivoscan-play-aab.yml',import.meta.url),'utf8');
 assert.match(workflow,/write-admob-production-env[.]mjs/);
 assert.doesNotMatch(workflow,/vars[.]RIVOSCAN_ADMOB_APP_ID/);
});

test('Play AAB env generator emits real RivoScan IDs and production mode',async()=>{
 const {mkdtemp,readFile,rm,writeFile}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');
 const {join}=await import('node:path');
 const {spawnSync}=await import('node:child_process');
 const {fileURLToPath}=await import('node:url');
 const temp=await mkdtemp(join(tmpdir(),'rivo-admob-'));
 try{
  const output=join(temp,'github-env');
  await writeFile(output,'');
  const script=fileURLToPath(new URL('../scripts/write-admob-production-env.mjs',import.meta.url));
  const result=spawnSync(process.execPath,[script],{env:{...process.env,GITHUB_ENV:output},encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const parsed=Object.fromEntries((await readFile(output,'utf8')).trim().split('\n').map(line=>line.split('=')));
  assert.equal(parsed.VITE_RIVOSCAN_ADMOB_PRODUCTION,'true');
  assert.equal(parsed.VITE_RIVOSCAN_ADMOB_APP_ID,RIVOSCAN_ADMOB_APP_ID);
  assert.equal(parsed.VITE_RIVOSCAN_ADMOB_INTERSTITIAL_ID,RIVOSCAN_INTERSTITIAL_ID);
  assert.equal(parsed.VITE_RIVOSCAN_ADMOB_APP_OPEN_ID,RIVOSCAN_APP_OPEN_ID);
  assert.equal(resolveAdMobConfig(parsed).testMode,false);
 }finally{await rm(temp,{recursive:true,force:true});}
});
