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
sleep 12
# Cold Pixel 6 emulators can throw "Pixel Launcher isn't responding" (system ANR)
# *before* the app receives touch. Detect a dimmed background before tapping,
# dismiss system "Wait", then close RivoScan release notes at their real location.
for retry in 1 2 3; do
  adb shell screencap -p /sdcard/rivo-preflight.png
  adb pull /sdcard/rivo-preflight.png "$OUT/00-preflight.png" >/dev/null
  if python3 - "$OUT/00-preflight.png" <<'PY'
from PIL import Image
import sys
a=Image.open(sys.argv[1]).convert('RGB')
r,g,b=a.getpixel((10,175))
print('Preflight background RGB:',r,g,b)
sys.exit(0 if min(r,g,b)>=150 else 1)
PY
  then
    echo 'App foreground is not dimmed: preflight ready.'
    break
  fi
  # The launcher ANR uses a "Wait" button near (100,485). If there is only
  # a release note sheet, this is a harmless tap on its body.
  adb shell input tap 104 485
  sleep 2
  adb shell input tap 353 87
  adb shell input tap 193 690
  sleep 3
done
# Make sure release notes are closed even when no ANR occurred.
adb shell input tap 353 87
sleep 2
capture 01-home
python3 - "$OUT/01-home.png" <<'PY'
from PIL import Image
import sys
im=Image.open(sys.argv[1]).convert('RGB')
assert min(im.getpixel((10,175)))>=150, (
  'Android system ANR/release modal still covers the app: do not label a tap smoke as a scanner failure')
PY
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
