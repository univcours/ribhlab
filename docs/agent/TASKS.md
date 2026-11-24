# RivoScan 0.45.92 current release QA (24 November 2026)

| Task | State | Evidence |
|---|---|---|
| Duplicate floating camera removed, single center photo_camera | VERIFIED source/browser/native UI | CI 45293517830 |
| ML Kit Document Scanner remains primary | VERIFIED source, actual success on updated phone UNTESTED | source `openSmartScanner` first awaits `DocumentScanner.scanDocument` |
| On launch failure fallback offers Camera/Photos, not on cancel | VERIFIED native emulator | 05-smartscan-open.png and https://github.com/univcours/ribhlab/actions/runs/45298720342 |
| From system chooser "Take Picture" opens actual Android Camera2 | VERIFIED signed APK on AOSP emulator | `com.android.camera2/com.android.camera.CaptureActivity` resumed; CI 45298720342 |
| Camera2 shutter, photo approval and native PDF save | IN PROGRESS, not claimed successful | `rivoscan-04592-native-fallback-qa.yml` shutter smoke + physical device |
| Real AdMob banner display/impression | NOT VERIFIED | Emulator code 3 NO_FILL, physical consent/ad fill required |
| QR/Plate scanner native launch | VERIFIED on signed 0.45.91 emulator | CI 45291128570 |
| Formula OCR safe areas / Save not overlapped | Browser QA PASSED, physical phone pending | 45293517830 |
| Full phone ML Kit, OCR, image/PDF export, RTL/accessibility regression | TODO | Device evidence |
| Deploy Google Play | NOT AUTHORIZED | user explicitly asks first |

Signed GitHub release: https://github.com/univcours/ribhlab/releases/tag/rivoscan-0.45.92-smartscan-fallback . Earlier status below historical, not current.

---

# Current 0.45.91 tasks (supersedes historical 0.45.89 checklist below)

| Work | State | Evidence |
|---|---|---|
| Remove overlapping duplicate FAB; bottom camera icon is Material Symbols Rounded photo_camera | VERIFIED | 0.45.91 source/CI/native screenshots |
| Signed original-key ARM64/ARM32/Universal APK and all-ABI AAB | VERIFIED | 45284073142, signed GitHub pre-release |
| QR / Barcode opens from Home button | VERIFIED in Android emulator | 45291128570 content changed 52.643% |
| Plate Scanner opens from Home button | VERIFIED in Android emulator | 45291128570 content changed 42.233% |
| Primary Smart Scan opens ML Kit document scanner | NOT VERIFIED | emulator press returned Home visually, changed 0.004%; physical phone/logcat investigation needed |
| AdMob Banner real visible physical impression and consent/no-fill | NOT VERIFIED | real-device SDK evidence required |
| End-to-end capture → PDF save → external viewer → thumbnails | NOT VERIFIED | device scenarios required |
| Google Play rollout | NOT AUTHORIZED | explicit user request required |

Independent true-native QA: https://github.com/univcours/ribhlab/actions/runs/45291128570 . Release: https://github.com/univcours/ribhlab/releases/tag/rivoscan-0.45.91-single-camera .

---

# RivoScan 0.45.89 — verification tasks

| Item | State | Evidence/criterion |
|---|---|---|
| Preserve original package, signing, portrait and all features | VERIFIED in CI/static, runtime QA outstanding | 0.45.89 workflow signed APK and AAB verify |
| Material 3 Expressive + rounded symbols across UI | VERIFIED in browser tests, native QA outstanding | Responsive screenshots, icon box tests |
| Remove misleading Documents generic Import Images label | VERIFIED in browser tests | Localized Import files and upload icon across 7 languages |
| Preserve generic importer and bottom Scan navigation | VERIFIED in JS/static; native QA outstanding | Tests confirm handlers and navigation remain |
| Smart FAB hide during scanning/modal/processing | VERIFIED in browser/source; device QA outstanding | Browser overlay tests, native remains untested |
| Source/npm/test/build and responsive snapshots | VERIFIED | GitHub Actions 45271464848 |
| Five APK and AAB signed, feature ABI parity | VERIFIED | GitHub Actions 45271464848 |
| GitHub signed tester pre-release | VERIFIED | https://github.com/univcours/ribhlab/releases/tag/rivoscan-0.45.89-documents-import-clarity |
| Native Android emulator screenshots | IN_PROGRESS / must re-check | GitHub Actions 45271464848, 0.45.88 attempt failed boot |
| Native AdMob Banner actually visible and impressions | BLOCKED without device evidence | SDK loaded+screen+layout and logcat/event proof |
| QR/ML Kit/PDF/native back full phone regressions | BLOCKED until real Android runtime testing | Actual device/emulator captures and functions |
| RTL, large fonts and accessibility on device | TODO | Real native UI inspection |
| Publish Google Play | NOT AUTHORIZED | Explicit user request required |

Statuses represent evidence, not confidence. Keep exact run/commit references in future handoffs.
