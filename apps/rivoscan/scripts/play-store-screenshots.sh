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
adb shell pm grant com.ribhlab.rivoscan.debug android.permission.CAMERA
adb shell am force-stop com.ribhlab.rivoscan.debug || true
adb shell am start -W -n com.ribhlab.rivoscan.debug/com.ribhlab.rivoscan.MainActivity
sleep 13

# New builds can display a "What's New" sheet. The only interaction here
# dismisses that sheet; capturing the sheet would not showcase product UI.
# On a 1080x1920 / density 420 screen this is the bottom of the sheet.
adb shell input tap 540 1726
sleep 4

adb exec-out screencap -p > "$OUT/01-rivoscan-home.png"

# Persistent navigation: Home | Tools | [Camera] | Documents | Me.
# Use real 1080px positions after the turquoise redesign.
adb shell input tap 332 1780
sleep 6
adb exec-out screencap -p > "$OUT/02-rivoscan-tools.png"
adb shell input swipe 600 1480 600 630 420
sleep 2
adb exec-out screencap -p > "$OUT/03-rivoscan-more-tools.png"

adb shell input tap 748 1780
sleep 6
adb exec-out screencap -p > "$OUT/04-rivoscan-documents.png"

adb shell input tap 963 1780
sleep 6
adb exec-out screencap -p > "$OUT/05-rivoscan-me-camera-visible.png"

python3 - <<'PY'
from pathlib import Path
import struct
import zlib
folder=Path('/tmp/rivoscan-play-screenshots')
for path in sorted(folder.glob('*.png')):
    header=path.read_bytes()[:24]
    if header[:8]!=b'\x89PNG\r\n\x1a\n':
        raise SystemExit('Invalid PNG: '+str(path))
    w,h=struct.unpack('>II',header[16:24])
    print('RIVOSCAN_REAL_SCREENSHOT',path.name,w,h,path.stat().st_size)
    if (w,h)!=(1080,1920) or path.stat().st_size<10000:
        raise SystemExit('Invalid capture dimensions/content: '+str(path))
if len(list(folder.glob('*.png')))!=5:
    raise SystemExit('Expected five genuine screenshots')
# The previous capture script sometimes uploaded Documents twice and labeled
# the second copy 'Me'. Compare the rendered content, not just file sizes.
def png_filtered_center(path):
    raw=path.read_bytes()
    pos=8; parts=[]; metadata=None
    while pos<len(raw):
        size=struct.unpack('>I',raw[pos:pos+4])[0]
        typ=raw[pos+4:pos+8]
        chunk=raw[pos+8:pos+8+size]
        if typ==b'IHDR':metadata=struct.unpack('>IIBBBBB',chunk[:13])
        if typ==b'IDAT':parts.append(chunk)
        pos+=12+size
        if typ==b'IEND':break
    w,h,depth,color,_,_,_=metadata
    if depth!=8 or color not in (2,6):
        raise SystemExit(f'Unsupported screenshot PNG encoding: {depth=} {color=}')
    row=1+w*(4 if color==6 else 3)
    decoded=zlib.decompress(b''.join(parts))
    if len(decoded)!=row*h:raise SystemExit('PNG size mismatch')
    return decoded[row*270:row*1460]
documents=png_filtered_center(folder/'04-rivoscan-documents.png')
me=png_filtered_center(folder/'05-rivoscan-me-camera-visible.png')
changed=sum(a!=b for a,b in zip(documents,me))/len(documents)
print('RIVOSCAN_DOCS_VS_ME_DIFFERENCE',round(changed*100,2),'percent')
if changed<.035:
    raise SystemExit('Navigation failure: Me capture is still Documents; refuse mislabeled screenshot')

PY
echo "PASS: five screen captures from running Android RivoScan, no fabricated UI"
