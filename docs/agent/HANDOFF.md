# RivoScan latest handoff: 0.45.92 (24 Nov 2026)

User asked to keep working without losing project state. Read `docs/agent/PROJECT_STATE.md`, `docs/agent/TASKS.md` and `docs/agent/RESUME.md` in this branch first. The current Android source is `fix/rivoscan-04592-smartscan-native-fallback`, **not** the RibhLab website main branch.
- 0.45.92 / code 207 original-signed APK and AAB GitHub TESTER PRE-RELEASE: https://github.com/univcours/ribhlab/releases/tag/rivoscan-0.45.92-smartscan-fallback . Signed build/CI passed https://github.com/univcours/ribhlab/actions/runs/45293517830 . No Google Play upload.
- Single real `photo_camera` centered in Bottom Navigation, floating duplicate removed. Material 3 Expressive + Material Symbols Rounded mandatory. All existing PDF, camera, ML Kit functions preserved.
- Google ML Kit-first smart scanning falls back to Capacitor CameraSource.Prompt after a technical **launch failure only**, not cancellation nor post-capture PDF processing errors; native system picker is proven by screenshot and native Camera2 Activity proved by signed-APK CI https://github.com/univcours/ribhlab/actions/runs/45298720342 .
- Shutter and PDF save are not yet proven; `rivoscan-04592-native-fallback-qa.yml` adds actual emulator shutter test. Check newest Actions result and screens; a passing pixel-diff alone does not prove PDF was saved.
- AdMob code 3 NO_FILL seen on emulator, physical device real inventory/impression not verified. Do not simulate ad fill or invent earnings.
- Do not merge to main or publish to Google Play without explicit request. Most recent changes after signed release are *QA scripts/docs*, not changed Android app bytes.

---

# Latest RivoScan handoff 0.45.91 — 2026-11-23

This heading supersedes older 0.45.89 and 0.45.90 statuses below (do not discard historical notes). Current active app branch `fix/rivoscan-04591-single-scan-action`; Android code 206; original signing, five ABI packages, GitHub pre-release https://github.com/univcours/ribhlab/releases/tag/rivoscan-0.45.91-single-camera . Do not publish Play without explicit user request.

User explicitly required **ONE** camera button, with true Material Symbols Rounded `photo_camera` inside center Bottom Navigation; old floating camera overlay was removed (not merely hidden). Signed package and original APK workflow succeeded: https://github.com/univcours/ribhlab/actions/runs/45284073142 .

Independent signed APK emulator QA https://github.com/univcours/ribhlab/actions/runs/45291128570 **PASS for QR and Plate launches**; verified image center-diff ratios 52.643% and 42.233%. **Smart Scan center tap remained visually Home (0.004% changed)**; opening/capturing with ML Kit on actual device not proven. Do not claim Smart Scan works merely because the click routes to `openSmartScanner()`. Inspect available Google Play Services, logcat, cancellation and real phone before changing core behavior. Real AdMob impression also unverified.

Future improvement must preserve Material 3 Expressive, image/PDF tools, scanner/Google ML Kit and thumbnails. Next task: diagnose real Smart Scan open/save on an authorized Android phone or test emulator with Play Services, and verify native AdMob banner display.

---

# RivoScan verified handoff — 0.45.89 (23 Nov 2026)

**Current artifact:** [RivoScan 0.45.89 signed GitHub pre-release](https://github.com/univcours/ribhlab/releases/tag/rivoscan-0.45.89-documents-import-clarity). Contains signed ARM64, ARM32, Universal APKs and all-ABI AAB. No Google Play publication. Version 0.45.89 code 204, original RivoScan app ID/signing.

**Verified CI:** https://github.com/univcours/ribhlab/actions/runs/45271464848; browser QA and all Android packaging verification successful. Emulator check remains uncertain until actual screenshots/logs inspected. 0.45.88 emulator failed because -accel off unsupported; 0.45.89 KVM fix and TCG fallback are now present.

**User decisions:** keep Material 3 Expressive and Material Symbols Rounded; keep complete icons uncut, one smart floating camera FAB hidden in barcode/QR/camera/modal/processing; keep Google AdMob banner without overlap; remove useless back/duplicate buttons. Duplicate **Import Images** in Documents was not the bottom Scan button. Generic Import files button now uses upload icon and localized text.

**Open acceptance gates:** actual native Android screenshots, SDK AdMob banner visibility/impression and real phone camera/ML Kit/PDF regression. No unsupported assertion of physical device success.

**Next exact step:** check newest Actions state and assets, read actual emulator failure or capture, identify any native defects, then fix/test/commit. Continue from `docs/agent/RESUME.md`; never recreate repository or publish Play without request.
