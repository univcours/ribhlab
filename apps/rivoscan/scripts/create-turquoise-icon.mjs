/** Preserve the original owner-provided green RivoScan icon byte-for-byte.
 * Called before Vite build and during Android native integration. Never generate
 * a substitute blue/turquoise launcher or silently recolor the official logo.
 */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const EXPECTED_SHA256='67cd03f1d7e91e50ed398cc03c0a77482721e23053831df13984dbe3dffd9ce3';
const official=join(root,'assets/rivoscan-original-green-icon-512.png');
const publicIcon=join(root,'public/rivoscan-icon.png');
const source=readFileSync(official);
const hash=buf=>createHash('sha256').update(buf).digest('hex');
if(source.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||
   source.readUInt32BE(16)!==512||source.readUInt32BE(20)!==512)
 throw Error('Official RivoScan green logo must be 512x512 PNG');
if(hash(source)!==EXPECTED_SHA256||hash(readFileSync(publicIcon))!==EXPECTED_SHA256)
 throw Error('RivoScan official green logo mismatch: do not overwrite owner branding');
const destination=join(root,'node_modules/.cache/rivoscan/icon.png.b64');
mkdirSync(dirname(destination),{recursive:true});
writeFileSync(destination,source.toString('base64')+'\n','ascii');
console.log('[RivoScan] Official original green launcher loaded: 512x512 PNG');
