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
adb shell settings put global show_first_crash_dialog 0
adb shell settings put global anr_show_background 0
adb shell am force-stop com.google.android.apps.nexuslauncher || true
for attempt in 1 2 3 4 5; do
  adb shell am start -W -n com.ribhlab.rivotalk/.MainActivity || true
  sleep 8
  adb shell uiautomator dump /sdcard/rivo.xml || continue
  adb pull /sdcard/rivo.xml "$RUNNER_TEMP/rivo-home.xml" || continue
  if grep -q 'Ready to connect' "$RUNNER_TEMP/rivo-home.xml"; then break; fi
  # Close a system launcher ANR dialog if it appears; never capture it.
  adb shell input keyevent 4 || true
  adb shell am force-stop com.google.android.apps.nexuslauncher || true
done
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

# Extra screens: only capture real, verified visible UI states.
function tap_text() {
  adb shell uiautomator dump /sdcard/rivo.xml >/dev/null
  adb pull /sdcard/rivo.xml "$RUNNER_TEMP/rivo-current.xml" >/dev/null
  local coords
  coords=$(python3 - "$RUNNER_TEMP/rivo-current.xml" "$1" <<'PY'
import sys,re,xml.etree.ElementTree as ET
for n in ET.parse(sys.argv[1]).iter('node'):
    if n.attrib.get('text')==sys.argv[2]:
        a,b,c,d=map(int,re.findall(r'\d+',n.attrib['bounds']))
        if c>a and d>b:
            print((a+c)//2,(b+d)//2);break
else: sys.exit(1)
PY
) || return 1
  adb shell input tap $coords
  sleep 2
}
function capture_verified() {
  adb shell uiautomator dump /sdcard/rivo.xml >/dev/null
  adb pull /sdcard/rivo.xml "$RUNNER_TEMP/rivo-current.xml" >/dev/null
  python3 - "$RUNNER_TEMP/rivo-current.xml" "$2" <<'PY'
import sys,xml.etree.ElementTree as ET
texts=[x.attrib.get('text','') for x in ET.parse(sys.argv[1]).iter('node')]
assert any(sys.argv[2] in t for t in texts),texts
PY
  adb exec-out screencap -p > "store-assets/rivotalk/$1.png"
}
tap_text 'Close'
if tap_text 'Privacy'; then
  capture_verified '03-privacy' 'Audio and messages travel through encrypted local Bluetooth links'
  tap_text 'Close'
fi
# Try the real group creation path. Bluetooth support varies by emulator.
if tap_text 'Create group'; then
  sleep 3
  if capture_verified '04-group' 'Channel available'; then
    adb shell input swipe 540 1580 540 550 500
    sleep 1
    capture_verified '05-members' 'Members' || true
    adb shell input swipe 540 1580 540 450 500
    sleep 1
    capture_verified '06-messages' 'Group messages' || true
    if tap_text 'Blocked devices (0)'; then
      capture_verified '07-blocked' 'No blocked devices' || true
      tap_text 'Close' || true
    fi
    tap_text 'Leave session' || adb shell am force-stop com.ribhlab.rivotalk
  else
    echo 'Emulator cannot host a real Bluetooth session; no simulated group screenshots produced.'
  fi
fi
# Capture the real permission-request screen from a reset installation.
adb shell am force-stop com.ribhlab.rivotalk
adb shell pm clear com.ribhlab.rivotalk
adb shell am start -n com.ribhlab.rivotalk/.MainActivity
sleep 4
capture_verified '08-permissions' 'Grant permissions' || true

# Real tablet layouts: emulate tablet-sized Android configurations, not resized phone PNGs.
mkdir -p store-assets/rivotalk/tablet7 store-assets/rivotalk/tablet10
for spec in 'tablet7 1440x2560 320' 'tablet10 1440x2560 240'; do
  read -r folder dims density <<< "$spec"
  adb shell am force-stop com.ribhlab.rivotalk
  adb shell wm size "$dims"
  adb shell wm density "$density"
  adb shell pm grant com.ribhlab.rivotalk android.permission.RECORD_AUDIO
  adb shell pm grant com.ribhlab.rivotalk android.permission.BLUETOOTH_CONNECT
  adb shell pm grant com.ribhlab.rivotalk android.permission.POST_NOTIFICATIONS || true
  adb shell am start -W -n com.ribhlab.rivotalk/.MainActivity
  sleep 6
  capture_verified "$folder/01-home" 'Ready to connect'
  tap_text 'Diagnostics'
  capture_verified "$folder/02-diagnostics" 'Payload bytes sent'
  tap_text 'Close'
  if tap_text 'Privacy'; then
    capture_verified "$folder/03-privacy" 'Audio and messages travel through encrypted local Bluetooth links'
    tap_text 'Close'
  fi
done
