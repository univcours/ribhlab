#!/usr/bin/env bash
# Capture actual installed Android RivoScan screens, never generated mockups.
set -euo pipefail
APK="apps/rivoscan/android/app/build/outputs/apk/debug/app-debug.apk"
OUTPUT="/tmp/rivoscan-play-screenshots"
PACKAGE="com.ribhlab.rivoscan"
mkdir -p "$OUTPUT"
test -s "$APK"
adb wait-for-device
adb install -r "$APK"
adb shell am start -W -n "$PACKAGE/.MainActivity"
sleep 10
# Release notes may appear on first launch. Dismiss with Android Back,
# then re-enter app if Back minimized it.
adb shell input keyevent 4 || true
sleep 1
adb shell am start -W -n "$PACKAGE/.MainActivity"
sleep 4
test -n "$(adb shell pidof "$PACKAGE" | tr -d '\r')"
dimensions="$(adb shell wm size | grep -Eo '[0-9]+x[0-9]+' | tail -1)"
width="${dimensions%x*}"
height="${dimensions#*x}"
test "$width" -gt 200
test "$height" -gt 400
tap_bottom(){
  local fraction="$1"
  local x=$((width*fraction/100))
  local y=$((height-34))
  adb shell input tap "$x" "$y"
  sleep 2
}
capture(){
  local name="$1"
  adb exec-out screencap -p > "$OUTPUT/$name.png"
  test -s "$OUTPUT/$name.png"
}
# Four real screens. Side-by-side images can then be inspected for clipping/overlap.
# The camera occupies the middle notch; tap the actual nav slots, not the notch.
tap_bottom 11; capture 01-home
tap_bottom 29; capture 02-documents
tap_bottom 71; capture 03-tools
tap_bottom 89; capture 04-settings
# Prevent false-green screenshots: previously Tools and Documents were identical!
for pair in "01-home 02-documents" "02-documents 03-tools" "03-tools 04-settings"; do
  set -- $pair
  if cmp -s "$OUTPUT/$1.png" "$OUTPUT/$2.png"; then
    echo "ERROR: duplicate navigation screenshot: $1 and $2" >&2
    exit 1
  fi
done
# Do not overwrite, publish or expose user documents; this is a clean emulator.
echo "CAPTURED: $(ls "$OUTPUT"/*.png | wc -l) Android screenshots at ${width}x${height}."
