#!/usr/bin/env bash
set -euo pipefail
mkdir -p store-assets/rivotalk
adb wait-for-device
adb shell wm size 1080x1920
adb shell wm density 420
adb install -r "$RUNNER_TEMP/rivotalk-apk/"*.apk
adb shell pm grant com.ribhlab.rivotalk android.permission.RECORD_AUDIO
adb shell pm grant com.ribhlab.rivotalk android.permission.BLUETOOTH_CONNECT
adb shell pm grant com.ribhlab.rivotalk android.permission.POST_NOTIFICATIONS || true
adb shell svc wifi disable
adb shell svc data disable
adb shell am start -n com.ribhlab.rivotalk/.MainActivity
sleep 7
adb shell uiautomator dump /sdcard/rivo.xml
adb pull /sdcard/rivo.xml "$RUNNER_TEMP/rivo-home.xml"
python3 - "$RUNNER_TEMP/rivo-home.xml" <<'PY'
import sys,xml.etree.ElementTree as ET
root=ET.parse(sys.argv[1])
texts=[x.attrib.get('text','') for x in root.iter('node')]
assert any('Ready to connect' in t for t in texts),texts
assert any('Create group' in t for t in texts),texts
PY
adb exec-out screencap -p > store-assets/rivotalk/01-home.png
read -r X Y < <(python3 - "$RUNNER_TEMP/rivo-home.xml" <<'PY'
import sys,re,xml.etree.ElementTree as ET
for n in ET.parse(sys.argv[1]).iter('node'):
    if n.attrib.get('text')=='Diagnostics':
        a,b,c,d=map(int,re.findall(r'\d+',n.attrib['bounds']))
        print((a+c)//2,(b+d)//2)
        break
else: raise RuntimeError('Diagnostics button not found')
PY
)
adb shell input tap "$X" "$Y"
sleep 2
adb shell uiautomator dump /sdcard/rivo.xml
adb pull /sdcard/rivo.xml "$RUNNER_TEMP/rivo-diagnostics.xml"
python3 - "$RUNNER_TEMP/rivo-diagnostics.xml" <<'PY'
import sys,xml.etree.ElementTree as ET
texts=[x.attrib.get('text','') for x in ET.parse(sys.argv[1]).iter('node')]
assert any('Payload bytes sent' in t for t in texts),texts
assert any('Payload bytes received' in t for t in texts),texts
PY
adb exec-out screencap -p > store-assets/rivotalk/02-diagnostics.png
