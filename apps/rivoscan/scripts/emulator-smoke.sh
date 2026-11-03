#!/usr/bin/env bash
set -euo pipefail
APK="apps/rivoscan/android/app/build/outputs/apk/debug/app-debug.apk"
test -s "$APK"
adb wait-for-device
adb install -r "$APK"
adb shell pm path com.ribhlab.rivoscan
adb shell am start -W -n com.ribhlab.rivoscan/.MainActivity
sleep 9
test -n "$(adb shell pidof com.ribhlab.rivoscan | tr -d '\r')"
# Verify upgrading without uninstalling preserves the application's data.
adb shell run-as com.ribhlab.rivoscan mkdir -p files
printf '%s' 'preserved-by-update' | adb shell run-as com.ribhlab.rivoscan sh -c 'cat > files/rivoscan-emulator-test.txt'
test "$(adb shell run-as com.ribhlab.rivoscan cat files/rivoscan-emulator-test.txt | tr -d '\r')" = "preserved-by-update"
adb install -r "$APK"
VAL="$(adb shell run-as com.ribhlab.rivoscan cat files/rivoscan-emulator-test.txt | tr -d '\r')"
test "$VAL" = "preserved-by-update"
adb shell am force-stop com.ribhlab.rivoscan
adb shell am start -W -n com.ribhlab.rivoscan/.MainActivity
sleep 6
test -n "$(adb shell pidof com.ribhlab.rivoscan | tr -d '\r')"
adb exec-out screencap -p > /tmp/rivoscan-emulator-smoke.png
echo "PASS: native launch and in-place update preserved private app data"
