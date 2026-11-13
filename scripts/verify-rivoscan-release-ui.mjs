#!/usr/bin/env node
// Inspect the compiled production JavaScript, not only unbundled source.
// A development-only diagnostics panel must not leak into any Android release.
import {readdirSync,readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
const folder='dist/assets';
if(!existsSync(folder))throw Error('Missing production bundle: run npm run build first');
const jsFiles=readdirSync(folder).filter(name=>name.endsWith('.js'));
if(!jsFiles.length)throw Error('No compiled JavaScript was found');
const bundle=jsFiles.map(name=>readFileSync(join(folder,name),'utf8')).join('\n');
const privateTokens=[
 'rivo-ad-diagnostics',
 'Ad diagnostics',
 'AdMob not ready',
 'Retry ads',
 'Publisher misconfiguration',
 'App launches',
 'LIVE AdMob inventory',
 'data-ad-retry',
 'data-ad-test'
];
const exposed=privateTokens.filter(token=>bundle.includes(token));
if(exposed.length){
 console.error('Release safety check failed. Private developer controls in production:',exposed);
 process.exit(1);
}
if(!bundle.includes('Privacy choices')&&!bundle.includes('Choix de confidentialité')){
 throw Error('Privacy choices entry point missing from production UI');
}
console.log('PASS: compiled RivoScan bundle has no developer AdMob diagnostics or debug controls');
