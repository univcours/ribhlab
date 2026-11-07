# RivoScan Production 0.44.26 / Android code 102

This is the real Production application `com.ribhlab.rivoscan`, not the separate Android Studio DEV package. The current verified Samsung production installation was `0.43.4` (code 74). The latest build source is `0.44.26` (code 102), and recent Android CI passed. No Android app was removed or installed by ChatGPT remotely.

## Create a signed Production APK and Google Play AAB on Windows

Keep your **existing** RivoScan keystore safe. Never create or use a new certificate to update an installed app, never share the keystore or password in chat, and do not uninstall the app to fix a certificate mismatch.

From `C:\Users\rachi\ribhlab\apps\rivoscan`, run:

```powershell
git pull --ff-only origin feat/rivoscan-android-beta
powershell.exe -NoProfile -ExecutionPolicy Bypass -File '.\build-rivoscan-production-signed.ps1' -InstallIfCompatible
```

The script asks **on your own PC** for the keystore file path, key alias and passwords, re-prepares latest Production with real AdMob IDs, then builds and signs both APK and AAB. Outputs are written to a timestamped folder under `Downloads`.

When connected to one Samsung phone over ADB Wi-Fi, the script checks the certificate SHA-256 fingerprint of the existing installed `base.apk` against the newly signed APK **before installing**. Only if they match and the installed versionCode is older does it ask for explicit final authorization before `adb install -r`. It NEVER does `adb uninstall`, `pm clear`, `install -d`, nor silently replaces an incompatible app. You can omit `-InstallIfCompatible` to only build signed files.

If the certificate differs, as is often the case when Google Play App Signing is enabled and you use the Play **upload** key locally, direct installation is blocked. **Use the signed AAB with Google Play Console > Testing**, then update RivoScan from Play Store on your phone. The AAB must be signed with the original Play **upload** key; only Google Play can deliver a Play-app-signing-key-compatible update. Do not upload unsigned AAB files from Actions.

A successful local build does not imply the file has already been published on Play or installed on Samsung. Keep your documents backed up before any release process.
