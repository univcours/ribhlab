#!/usr/bin/env bash
# Android emulator smoke for *actual signed* RivoScan 0.45.92 tester APK.
# Tests live Google ML Kit -> system photo chooser -> native camera launch.
# Does not simulate an advertisement or claim real ML Kit OCR/physical-camera success.
set -euo pipefail
APP="com.ribhlab.rivoscan"
OUT="${RIVO_NATIVE_QA_DIR:-${RUNNER_TEMP:-/tmp}/rivo-04592-fallback}"
APK="${RIVO_SIGNED_APK:?must specify signed 0.45.92 universal APK}"
mkdir -p "$OUT"
capture(){
  adb shell screencap -p "/sdcard/rivo-$1.png"
  adb pull "/sdcard/rivo-$1.png" "$OUT/$1.png" >/dev/null
  echo "Captured $1"
}
adb wait-for-device
adb shell wm size 393x852
adb shell wm density 160
adb install -r "$APK"
adb shell pm grant "$APP" android.permission.CAMERA || true
adb shell monkey -p "$APP" -c android.intent.category.LAUNCHER 1
sleep 13
# Dismiss first-launch release notes. The modal's "Got it" is near (190,780).
adb shell input tap 190 780
sleep 3
capture 01-home
# The unique Material photo_camera action is centered in the persistent bottom nav.
adb shell input tap 195 745
sleep 7
capture 02-system-photo-chooser
# The stock Android Photo chooser is a sheet with "Take Picture" at y~790.
adb shell input tap 77 790
sleep 6
capture 03-after-take-picture
adb logcat -d -t 4500 > "$OUT/03-fallback-logcat.txt" || true

python3 - "$OUT" <<'PY'
from pathlib import Path
from PIL import Image,ImageChops
import json,sys
out=Path(sys.argv[1])
names=['01-home','02-system-photo-chooser','03-after-take-picture']
ims={name:Image.open(out/(name+'.png')).convert('RGB') for name in names}
assert len({im.size for im in ims.values()})==1, 'Camera screenshot dimensions inconsistent'
def changed(base,new):
  a=base.crop((12,100,381,826));b=new.crop((12,100,381,826))
  pixels=ImageChops.difference(a,b).getdata()
  return round(sum(1 for r,g,b in pixels if max(r,g,b)>24)/(a.width*a.height),5)
report={
 'signed_package':'RivoScan 0.45.92 universal',
 'opening_system_photo_chooser':changed(ims[names[0]],ims[names[1]]),
 'take_picture_transition':changed(ims[names[1]],ims[names[2]]),
 'physical_camera_or_pdf_saved':'NOT VERIFIED',
 'admob_impression':'NOT VERIFIED'
}
(out/'fallback-observation.json').write_text(json.dumps(report,indent=2)+'\n')
print('RivoScan 0.45.92 native fallback observation:',report)
if report['opening_system_photo_chooser']<0.09:
 raise SystemExit('Smart Scan did not display a distinct fallback chooser screen')
if report['take_picture_transition']<0.09:
 raise SystemExit('Take Picture did not transition away from the chooser. Inspect 03 screenshot and logcat.')
PY
