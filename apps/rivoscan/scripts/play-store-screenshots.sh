#!/usr/bin/env bash
# Produce genuine Android-emulator captures of the actual installed RivoScan UI.
# No AI-generated or mock app screens are used for Play listing screenshots.
set -euo pipefail

APK="apps/rivoscan/android/app/build/outputs/apk/debug/app-debug.apk"
OUT="/tmp/rivoscan-play-screenshots"
test -s "$APK"
mkdir -p "$OUT"

adb wait-for-device
adb shell wm size 1080x1920
adb shell wm density 420
adb install -r "$APK"
# Grant the scanner's normal runtime CAMERA permission in the isolated
# emulator before launch, to avoid photographing an Android permission sheet.
adb shell pm grant com.ribhlab.rivoscan android.permission.CAMERA
adb shell am force-stop com.ribhlab.rivoscan || true
adb shell am start -W -n com.ribhlab.rivoscan/.MainActivity
sleep 13

# New builds can display a "What's New" sheet. The only interaction here
# dismisses that sheet; capturing the sheet would not showcase product UI.
# On a 1080x1920 / density 420 screen this is the bottom of the sheet.
adb shell input tap 540 1726
sleep 4

adb exec-out screencap -p > "$OUT/01-rivoscan-home.png"

# Bottom navigation: Home | Documents | Tools | Me
# Capture the real app's Tools view and user document library.
adb shell input tap 681 1850
sleep 3
adb exec-out screencap -p > "$OUT/02-rivoscan-tools.png"
adb shell input swipe 600 1480 600 630 420
sleep 2
adb exec-out screencap -p > "$OUT/03-rivoscan-more-tools.png"

adb shell input tap 404 1850
sleep 3
adb exec-out screencap -p > "$OUT/04-rivoscan-documents.png"

python3 - <<'PY'
from pathlib import Path
import struct
folder=Path('/tmp/rivoscan-play-screenshots')
for path in sorted(folder.glob('*.png')):
    header=path.read_bytes()[:24]
    if header[:8]!=b'\x89PNG\r\n\x1a\n':
        raise SystemExit('Invalid PNG: '+str(path))
    w,h=struct.unpack('>II',header[16:24])
    print('RIVOSCAN_REAL_SCREENSHOT',path.name,w,h,path.stat().st_size)
    if (w,h)!=(1080,1920) or path.stat().st_size<10000:
        raise SystemExit('Invalid capture dimensions/content: '+str(path))
if len(list(folder.glob('*.png')))!=4:
    raise SystemExit('Expected four genuine screenshots')
PY
echo "PASS: four screen captures from running Android RivoScan, no fabricated UI"
