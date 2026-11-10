// Capacitor CLI executes this hook after 'npx cap sync android'.
// Keep the CameraX live-edge plugin and adaptive RivoScan launcher aligned with web updates.
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const android = join(root, 'android', 'app', 'build.gradle');
const platform = (process.env.CAPACITOR_PLATFORM_NAME || '').trim().toLowerCase();
if (platform && platform !== 'android') {
  console.log('[RivoScan] Skipping Android native integration on platform ' + platform);
  process.exit(0);
}
if (!existsSync(android)) {
  console.log('[RivoScan] Android wrapper not generated; skipping native integration.');
  process.exit(0);
}
const isWin = process.platform === 'win32';
const exe = isWin ? 'powershell.exe' : 'pwsh';
const installer = join(root, 'install-live-scanner.ps1');
if (!existsSync(installer)) {
  console.error('[RivoScan] Missing native installer at ' + installer);
  process.exit(1);
}
console.log('[RivoScan] Automatically installing/validating native CameraX scanner and adaptive launcher...');
const res = spawnSync(exe, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', installer], {
  cwd: root, stdio: 'inherit', windowsHide: true
});
if (res.error) {
  console.error('[RivoScan] Native installer failed:', res.error.message);
  process.exit(1);
}
if (res.status !== 0) {
  console.error('[RivoScan] Native scanner install returned failure: '+res.status);
  process.exit(res.status || 1);
}
console.log('[RivoScan] Native Android integration complete.');
