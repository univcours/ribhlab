// Mark bundled advertising mode before Capacitor copies dist into Android.
// Gradle refuses to compile against web assets of the wrong build type.
import {writeFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve,join} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const dist=join(root,'dist');
if(!existsSync(dist))throw new Error('Missing Vite dist; refusing unmarked build');
const mode=process.env.VITE_RIVOSCAN_ADMOB_PRODUCTION==='true'?'production':'debug';
if(mode==='production'&&process.env.RIVOSCAN_ADMOB_PRODUCTION!=='true')
 throw new Error('AdMob production flags disagree; refusing unsafe bundle');
writeFileSync(join(dist,'rivoscan-build-mode.txt'),mode+'\n','utf8');
console.log('[RivoScan] Web assets marked '+mode+'. Mixed native builds are blocked.');
