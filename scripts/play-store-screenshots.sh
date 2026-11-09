#!/usr/bin/env bash
# Standalone version: execute from repository root.
set -euo pipefail
APK="android/app/build/outputs/apk/debug/app-debug.apk"
OUTPUT="/tmp/rivoscan-play-screenshots"
PACKAGE="com.ribhlab.rivoscan"
mkdir -p "$OUTPUT"
test -s "$APK"
adb wait-for-device
adb install -r "$APK"
adb shell am start -W -n "$PACKAGE/.MainActivity"
sleep 10
adb shell input keyevent 4 || true
sleep 1
adb shell am start -W -n "$PACKAGE/.MainActivity"
sleep 4
dimensions="$(adb shell wm size | grep -Eo '[0-9]+x[0-9]+' | tail -1)"
width="${dimensions%x*}"
height="${dimensions#*x}"
tap_bottom(){
 local x=$((width*$1/100))
 adb shell input tap "$x" "$((height-42))"
 sleep 2
}
capture(){ adb exec-out screencap -p > "$OUTPUT/$1.png"; test -s "$OUTPUT/$1.png"; }
tap_bottom 11; capture 01-home
tap_bottom 29; capture 02-documents
tap_bottom 71; capture 03-tools
tap_bottom 89; capture 04-settings
for pair in "01-home 02-documents" "02-documents 03-tools" "03-tools 04-settings";do
 set -- $pair
 if cmp -s "$OUTPUT/$1.png" "$OUTPUT/$2.png";then
  echo "ERROR: identical screens for $1 and $2" >&2
  exit 1
 fi
done
