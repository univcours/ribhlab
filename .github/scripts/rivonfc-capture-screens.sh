#!/usr/bin/env bash
set -euo pipefail

APK="signed/RivoNFC-0.6.1-RivoScan-SIGNED.apk"
DEST="rivonfc-real-screens"
mkdir -p "$DEST"
test -s "$APK"
adb install -r "$APK"
adb shell pm path com.ribhlab.rivonfc | grep -F 'package:'
adb shell settings put global window_animation_scale 0
adb shell settings put global transition_animation_scale 0
adb shell settings put global animator_duration_scale 0
adb shell am start -n com.ribhlab.rivonfc/.MainActivity
sleep 10
adb shell pidof com.ribhlab.rivonfc
adb shell wm size

capture() {
  local name="$1"
  sleep 3
  adb shell pidof com.ribhlab.rivonfc >/dev/null
  adb exec-out screencap -p > "$DEST/$name.png"
  test "$(stat -c %s "$DEST/$name.png")" -gt 10000
  python3 - "$DEST/$name.png" <<'PY'
import struct,sys
with open(sys.argv[1],'rb') as f:
    h=f.read(24)
assert h[:8]==bytes.fromhex('89504e470d0a1a0a'), 'Not a PNG'
w,hgt=struct.unpack('>II',h[16:24])
assert w>=320 and hgt>=600, (w,hgt)
print(f'Captured native Android screenshot {sys.argv[1]}: {w}x{hgt}')
PY
}

tap_tab() {
  local label="$1"
  adb shell uiautomator dump /sdcard/rivonfc-window.xml >/dev/null 2>&1 || true
  adb shell cat /sdcard/rivonfc-window.xml > "$DEST/window.xml" 2>/dev/null || true
  local xy
  xy="$(python3 - "$label" "$DEST/window.xml" <<'PY'
import pathlib,re,sys,xml.etree.ElementTree as ET
p=pathlib.Path(sys.argv[2])
if p.is_file():
 try:
  root=ET.fromstring(p.read_text(encoding='utf-8'))
  for node in root.iter('node'):
   if node.get('text')==sys.argv[1] or node.get('content-desc')==sys.argv[1]:
    b=node.get('bounds','')
    v=[int(x) for x in re.findall(r'\d+',b)]
    if len(v)==4:
     print((v[0]+v[2])//2,(v[1]+v[3])//2)
     break
 except Exception:pass
PY
)"
  if [[ -z "$xy" ]]; then
    local size
    size="$(adb shell wm size | tail -1 | sed -nE 's/.* ([0-9]+)x([0-9]+).*/\1 \2/p')"
    read -r width height <<< "$size"
    local ix=0
    case "$label" in Scan) ix=0;; Write) ix=1;; Tools) ix=2;; History) ix=3;; *) exit 1;; esac
    xy="$((width*(2*ix+1)/8)) $((height-190))"
  fi
  echo "Selecting $label at $xy"
  adb shell input tap $xy
}

capture "RivoNFC-0.6.1-real-scan"
tap_tab Write
capture "RivoNFC-0.6.1-real-write"
tap_tab Tools
capture "RivoNFC-0.6.1-real-tools"
tap_tab History
capture "RivoNFC-0.6.1-real-history"

python3 - <<'PY'
from pathlib import Path
import hashlib
paths=sorted(Path('rivonfc-real-screens').glob('*.png'))
assert len(paths)==4
hashes=[hashlib.sha256(p.read_bytes()).hexdigest() for p in paths]
assert len(set(hashes))>=3,'Screenshots too similar; do not misrepresent navigation'
for p,h in zip(paths,hashes):
    print(f'{p.name}: {p.stat().st_size} bytes, SHA256 {h}')
PY
