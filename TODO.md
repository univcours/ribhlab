# TODO.md — verified outstanding RivoScan work

## Open (prioritized)
- [ ] **P0 AdMob:** on authorized Android phone or emulator, record consent state, `[RIVO_BANNER]` REQUEST/LOADED/SIZE/FAILED/IMPRESSION events, Google Mobile Ads logcat, actual native 320x50 geometry and screenshot. Distinguish correct ID, NO_FILL (code 3), network/Google Play Services, and app layout. Never click or simulate live ads. A green release build is NOT proof of ad display.
- [ ] **P1 End-to-end scan:** on actual signed 0.45.95 APK, check center Smart Scan, ML Kit primary / Camera2 fallback, shutter, image confirm, PDF save, Documents thumbnail, external viewer, Android Back and permission behavior. Preserve previously working QR/Plate.
- [ ] **P1 Store verification:** verify Play Console production version 210 and public availability/review separately; inspect 7/6/6 en-US published genuine screenshots for quality, legibility and uniqueness; replace only if a documented flaw is found. Screenshot edit and production upload were already committed; don't re-run.
- [ ] **P2 Native regression:** OCR/PDF/export, banner with system insets & navigation, RTL/large fonts/accessibility, permissions, offline/online and privacy flows on device.
- [ ] **P2 QA infrastructure:** finish the in-progress RDC official Android 14 image setup, if still needed. Older native ad-demo CI was blocked by Maven Central HTTP 429; prefer verified local/CI cache or a Google mirror; run a fresh test only if it exercises unverified current behavior.

## Completed — don't repeat
- [x] Source release 0.45.95 / code 210, correct AdMob banner ID `...9190`, production AAB/APK original-key signed and ABI checks (CI 45481094710).
- [x] Play Android Publisher API production release 210 committed (CI 45481179896, job production).
- [x] Original publisher replaced all existing en-US phone/tablet screenshots with newly captured verified native screens: 7 phone, 6 tablet7, 6 tablet10 (same successful workflow).

## Safety
- No developer secrets, signing passwords, keystores or service-account JSON in source/docs/logs. New release only after evidence, versionCode increase and verified original signing identity.
