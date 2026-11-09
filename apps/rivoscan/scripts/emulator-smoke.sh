#!/usr/bin/env bash
set -euo pipefail
APK="apps/rivoscan/android/app/build/outputs/apk/debug/app-debug.apk"
test -s "$APK"
adb wait-for-device
adb install -r "$APK"
adb shell pm path com.ribhlab.rivoscan.debug
adb shell am start -W -n com.ribhlab.rivoscan.debug/com.ribhlab.rivoscan.RivoComposeActivity
sleep 9
test -n "$(adb shell pidof com.ribhlab.rivoscan.debug | tr -d '\r')"
# Verify upgrading without uninstalling preserves the application's data.
# Use an absolute app-private path: an adb "run-as sh -c" process need not
# keep the same cwd as an earlier run-as mkdir.
PRIVATE_FILE="/data/user/0/com.ribhlab.rivoscan.debug/files/rivoscan-emulator-test.txt"
adb shell run-as com.ribhlab.rivoscan.debug mkdir -p /data/user/0/com.ribhlab.rivoscan.debug/files
# Touch app-owned private data directly through run-as. Avoid a shell
# redirection parsed before run-as, which would execute as the unprivileged
# Android shell user and fail even though the application itself is healthy.
adb shell run-as com.ribhlab.rivoscan.debug touch "$PRIVATE_FILE"
adb shell run-as com.ribhlab.rivoscan.debug ls -l "$PRIVATE_FILE"
adb install -r "$APK"
adb shell run-as com.ribhlab.rivoscan.debug ls -l "$PRIVATE_FILE"
adb shell am force-stop com.ribhlab.rivoscan.debug
adb shell am start -W -n com.ribhlab.rivoscan.debug/com.ribhlab.rivoscan.RivoComposeActivity
sleep 6
test -n "$(adb shell pidof com.ribhlab.rivoscan.debug | tr -d '\r')"
adb exec-out screencap -p > /tmp/rivoscan-emulator-smoke.png
echo "PASS: native launch and in-place update preserved private app data"
