#!/usr/bin/env bash
set -euo pipefail
adb wait-for-device
adb shell wm size 1080x1920
adb shell wm density 420
adb install -r "$RUNNER_TEMP/rivotalk-apk/"*.apk
adb shell settings put global show_first_crash_dialog 0
adb shell settings put global anr_show_background 0
adb shell am force-stop com.google.android.apps.nexuslauncher || true
adb shell svc wifi disable
adb shell svc data disable
adb shell svc bluetooth enable || true
adb shell pm grant com.ribhlab.rivotalk android.permission.RECORD_AUDIO
adb shell pm grant com.ribhlab.rivotalk android.permission.BLUETOOTH_CONNECT
adb shell pm grant com.ribhlab.rivotalk android.permission.POST_NOTIFICATIONS || true
dump() {
  adb shell uiautomator dump /sdcard/rivo-video.xml >/dev/null
  adb pull /sdcard/rivo-video.xml "$RUNNER_TEMP/rivo-video.xml" >/dev/null
}
coords() {
  dump
  python3 - "$RUNNER_TEMP/rivo-video.xml" "$1" <<'PY'
import sys,re,xml.etree.ElementTree as E
nodes=list(E.parse(sys.argv[1]).iter('node'))
for n in nodes:
    a=n.attrib
    if any(re.search(sys.argv[2],a.get(k,''),re.I) for k in ('text','content-desc')):
        x,y,x2,y2=map(int,re.findall(r'\d+',a['bounds']))
        if x2>x and y2>y:
            print((x+x2)//2,(y+y2)//2)
            break
else:
    print([(n.attrib.get('text'),n.attrib.get('content-desc')) for n in nodes],file=sys.stderr)
    sys.exit(1)
PY
}
tap() { local p; p=$(coords "$1") || return 1; adb shell input tap $p; sleep 2; }
for i in 1 2 3 4; do
  adb shell am start -W -n com.ribhlab.rivotalk/.MainActivity || true
  sleep 7
  if dump && grep -q 'Ready to connect' "$RUNNER_TEMP/rivo-video.xml"; then break; fi
  adb shell input keyevent 4 || true
  adb shell am force-stop com.google.android.apps.nexuslauncher || true
done
grep -q 'Ready to connect' "$RUNNER_TEMP/rivo-video.xml"
mkdir -p store-assets/rivotalk/review
adb shell rm -f /sdcard/rivotalk-fgs.mp4
adb shell screenrecord --size 720x1280 --bit-rate 3500000 --time-limit 120 /sdcard/rivotalk-fgs.mp4 &
record_pid=$!
trap 'adb shell pkill -2 screenrecord || true; wait "$record_pid" || true' EXIT
sleep 3
tap '^Create group$'
sleep 4
dump
grep -q 'Channel available' "$RUNNER_TEMP/rivo-video.xml"
adb shell dumpsys activity services com.ribhlab.rivotalk > "$RUNNER_TEMP/rivo-fgs-active.txt"
grep -Ei 'isForeground=true|foregroundId=[1-9]' "$RUNNER_TEMP/rivo-fgs-active.txt"
# Record the actual press-and-hold UI, if exposed on the host screen.
p=$(coords '^(hold to talk|hold to speak|push.to.talk|press and hold to talk|talk|speak)$') || p=''
if [ -z "$p" ]; then
  adb shell input swipe 540 1550 540 650 500
  sleep 1
  p=$(coords 'hold.*talk|hold.*speak|push.to.talk|press.*talk') || p=''
fi
if [ -n "$p" ]; then
  read -r x y <<< "$p"
  adb shell input swipe "$x" "$y" "$x" "$y" 6000 &
  press_pid=$!
  sleep 2
  adb shell dumpsys audio > "$RUNNER_TEMP/rivo-audio.txt"
  adb shell dumpsys media.audio_flinger > "$RUNNER_TEMP/rivo-audioflinger.txt"
  wait "$press_pid"
  sleep 2
fi
# The user leaves the UI while the real foreground service is active.
adb shell input keyevent KEYCODE_HOME
sleep 4
adb shell dumpsys activity services com.ribhlab.rivotalk > "$RUNNER_TEMP/rivo-fgs-background.txt"
grep -Ei 'isForeground=true|foregroundId=[1-9]' "$RUNNER_TEMP/rivo-fgs-background.txt"
adb shell cmd statusbar expand-notifications
sleep 5
dump
python3 - "$RUNNER_TEMP/rivo-video.xml" <<'PY'
import sys,xml.etree.ElementTree as E
texts=[n.attrib.get('text','') for n in E.parse(sys.argv[1]).iter('node')]
assert any('RivoTalk' in t for t in texts), texts
print('Verified RivoTalk notification visible')
PY
# Stop from the actual foreground notification action, or scroll to Leave.
if ! tap '^Leave session$'; then
  adb shell cmd statusbar collapse
  adb shell am start -W -n com.ribhlab.rivotalk/.MainActivity
  sleep 4
  for i in 1 2 3 4; do
    if tap '^Leave session$'; then break; fi
    adb shell input swipe 540 1510 540 470 450
    sleep 1
  done
fi
sleep 3
adb shell dumpsys activity services com.ribhlab.rivotalk > "$RUNNER_TEMP/rivo-fgs-stopped.txt"
adb shell pkill -2 screenrecord || true
wait "$record_pid" || true
trap - EXIT
adb pull /sdcard/rivotalk-fgs.mp4 "$RUNNER_TEMP/rivotalk-fgs-raw.mp4"
cp "$RUNNER_TEMP/rivotalk-fgs-raw.mp4" store-assets/rivotalk/review/rivotalk-fgs-demo.mp4
test -s store-assets/rivotalk/review/rivotalk-fgs-demo.mp4; ls -l store-assets/rivotalk/review/rivotalk-fgs-demo.mp4
if grep -Ei 'isForeground=true|foregroundId=[1-9]' "$RUNNER_TEMP/rivo-fgs-stopped.txt"; then
  echo 'Foreground service remains active after attempted user exit' >&2; exit 1
fi
echo 'Actual single-emulator demonstration; no second physical device or remote audio transfer verified.'
