#!/usr/bin/env bash
# Real Android emulator navigation smoke test for the signed RivoScan 0.45.91 APK.
# Every image is produced by adb screencap, never from Playwright/browser SAMPLE.
# Avoid uiautomator XML dumps: they triggered emulator stalls in the first run.
# No assertion about AdMob filled inventory or physical device camera availability.
set -euo pipefail
APP="com.ribhlab.rivoscan"
OUT="${RIVO_NATIVE_QA_DIR:-${RUNNER_TEMP:-/tmp}/rivoscan-04591-native-actions}"
mkdir -p "$OUT"
capture(){
 local name="$1"
 adb shell screencap -p "/sdcard/rivo-$name.png"
 adb pull "/sdcard/rivo-$name.png" "$OUT/$name.png" >/dev/null
}
home(){
 adb shell input keyevent KEYCODE_BACK || true
 adb shell input tap 40 743
 sleep 3
}
adb wait-for-device
adb shell wm size 393x852
adb shell wm density 160
adb install -r "${RIVO_SIGNED_APK:?Path to official signed APK required}"
adb shell pm grant "$APP" android.permission.CAMERA || true
adb shell monkey -p "$APP" -c android.intent.category.LAUNCHER 1
sleep 12
# Dismiss first-launch release notes when present. If absent this tap is harmless.
adb shell input tap 188 730
sleep 3
capture 01-home
# Main screen QR / Barcode button, actual tile center at 393x852.
adb shell input tap 278 200
sleep 5
capture 02-qr-after-press
home
# Main screen Plate Scanner tile, not the privacy banner or app toolbar.
adb shell input tap 92 265
sleep 5
capture 03-plate-after-press
home
# Tap the exact single centered photo_camera icon on the mobile navigation.
adb shell input tap 195 746
sleep 7
capture 04-primary-camera-after-press
python3 - "$OUT" <<'PY'
from pathlib import Path
from PIL import Image, ImageChops
import json,sys
root=Path(sys.argv[1])
home=Image.open(root/'01-home.png').convert('RGB')
results={}
for name in ['02-qr-after-press','03-plate-after-press','04-primary-camera-after-press']:
    img=Image.open(root/(name+'.png')).convert('RGB')
    if img.size!=home.size:
        raise SystemExit(f'Image size mismatch for {name}: {img.size} != {home.size}')
    # Ignore status clock, dynamic ads, sound/notifications and bottom navigation.
    # A genuine scanner/modal must materially change the application content.
    a=home.crop((14,115,379,644))
    b=img.crop((14,115,379,644))
    diff=ImageChops.difference(a,b)
    changed=sum(1 for p in diff.getdata() if max(p)>22)
    ratio=round(changed/(a.width*a.height),5)
    results[name]={'content_changed_fraction':ratio,'different_from_home':ratio>=0.04}
    print(f'{name}: center-content changed fraction = {ratio:.2%}')
(root/'comparison.json').write_text(json.dumps(results,indent=2))
# The central camera route may depend on Google Play Services/camera capabilities.
# Record it independently rather than misrepresent a 0px diff as proof of a scan.
required=['02-qr-after-press','03-plate-after-press']
fail=[name for name in required if not results[name]['different_from_home']]
if fail:
    raise SystemExit('Native tile tap did not change content: '+', '.join(fail)
                  +'. Inspect screenshot/XML and update coordinates or fix routing.')
PY
