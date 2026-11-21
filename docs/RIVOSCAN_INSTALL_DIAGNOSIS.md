# RivoScan 0.45.49 — safe Android installation diagnosis

Do not uninstall RivoScan or clear app storage to solve an installation error. Saved
documents and settings may be lost.

The package is com.ribhlab.rivoscan. Its Google Play upload-key SHA-1 is
E9:B3:E2:77:95:75:BA:08:A9:13:72:FC:38:85:EB:A0:1D:D3:E7:3E.

A GitHub APK signed with the upload certificate may NOT update an app installed
through Google Play. With Play App Signing, Google signs distributed installations
with the app-signing certificate, which may differ from the developer's upload
certificate. Android then reports INSTALL_FAILED_UPDATE_INCOMPATIBLE.

A debug APK uses a separate debug certificate and is not a production update.
A lower versionCode also cannot replace a newer version without a prohibited
downgrade. An APK may additionally require a newer Android API than the phone has.

To diagnose without deleting data, connect the phone with authorized USB debugging.
Compare the APK version via aapt dump badging, inspect the SHA-256 signing
certificate of the new APK with apksigner verify --print-certs, and compare it
with the installed package's signing certificate. Use adb devices first, then
adb shell pm path com.ribhlab.rivoscan and adb shell dumpsys package
com.ribhlab.rivoscan to inspect the installed package. Read-only inspection is
safe. Do not use adb uninstall, pm clear, or adb install -d.

If the certificates differ, deliver the signed AAB through Google Play Console
and update in the Play Store. Do not try to bypass Android's signature verification.
If no phone is connected, the true install-failure reason is still unconfirmed.
