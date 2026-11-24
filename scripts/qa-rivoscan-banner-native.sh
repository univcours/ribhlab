#!/usr/bin/env bash
set -euo pipefail
OUT="${RUNNER_TEMP}/rivo-banner-evidence"
mkdir -p "$OUT"
trap 'adb logcat -d > "$OUT/logcat.txt" || true; adb exec-out screencap -p > "$OUT/final.png" || true' EXIT
adb wait-for-device
adb shell wm size 393x852
adb shell wm density 160
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell pm grant com.ribhlab.rivoscan android.permission.CAMERA || true
adb logcat -c
adb shell am start -W -n com.ribhlab.rivoscan/.MainActivity
sleep 12
# Dismiss app release notes, without interacting with the reserved ad lane.
adb shell uiautomator dump /sdcard/rivo_qa.xml >/dev/null || true
adb shell cat /sdcard/rivo_qa.xml > "$OUT/initial.xml" || true
python3 - "$OUT/initial.xml" <<'PY'
import sys,re,subprocess
from pathlib import Path
import xml.etree.ElementTree as ET
try: nodes=list(ET.parse(sys.argv[1]).getroot().iter('node'))
except Exception: nodes=[]
if any("What's New in RivoScan" in str(n.attrib) for n in nodes):
    for n in nodes:
        if n.get('text','').strip()=='Got it' or n.get('content-desc','').strip()=='Got it':
            pts=list(map(int,re.findall(r'\d+',n.get('bounds',''))))
            if len(pts)==4:
                subprocess.check_call(['adb','shell','input','tap',str((pts[0]+pts[2])//2),str((pts[1]+pts[3])//2)])
                break
PY
# Wait for SDK events from the real AdMob Android plugin.
for n in $(seq 1 45); do
  adb logcat -d > "$OUT/logcat.txt"
  if grep -Fq '[RIVO_BANNER] IMPRESSION' "$OUT/logcat.txt"; then break; fi
  sleep 4
done
grep -F '[RIVO_BANNER]' "$OUT/logcat.txt" | tail -80 > "$OUT/banner-events.txt" || true
cat "$OUT/banner-events.txt"
grep -Fq '[RIVO_BANNER] CONSENT {"canRequestAds":true}' "$OUT/logcat.txt"
grep -Fq '[RIVO_BANNER] INITIALIZED {"test":true}' "$OUT/logcat.txt"
grep -Fq '[RIVO_BANNER] LOADED' "$OUT/logcat.txt"
grep -Fq '[RIVO_BANNER] IMPRESSION' "$OUT/logcat.txt"
adb exec-out screencap -p > "$OUT/home-with-google-test-banner.png"
adb shell uiautomator dump /sdcard/rivo_qa_after.xml >/dev/null || true
adb shell cat /sdcard/rivo_qa_after.xml > "$OUT/loaded.xml" || true
echo 'PASS: actual Google sample banner SDK load and impression recorded; screenshot saved.'
