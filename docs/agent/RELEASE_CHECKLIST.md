# RivoScan 0.45.89 — release readiness checks

- [x] Target versionName 0.45.89, versionCode 204, package com.ribhlab.rivoscan.
- [x] Original signing identity verified for ABI-specific APKs and AAB.
- [x] Node source check, all regression tests and Vite build.
- [x] Responsive browser QA, including 320/360/393/480/768 and localized layout.
- [x] All six document action glyphs fully visible in browser SAMPLE fixtures.
- [x] Documents "Import files" text/icon corrected in seven languages.
- [x] All five ABI APKs built and model/class/resource parity checked.
- [x] Universal ARM64/ARM32 tester APKs plus all-ABI AAB are on verified GitHub pre-release.
- [ ] Genuine Android emulator capture **validated** (an overall green CI run with skipped/error-ignored emulator is NOT enough).
- [ ] Native AdMob banner SDK loaded and physically visible, safe inset and real impressions.
- [ ] Device-level QR, barcode, ML Kit, PDF save/export, back stack, permission flows.
- [ ] Real Android accessibility/RTL verification.
- [ ] Google Play publication, only after explicit user permission and completion of the above.

Verified release: https://github.com/univcours/ribhlab/releases/tag/rivoscan-0.45.89-documents-import-clarity
Verified CI stages: https://github.com/univcours/ribhlab/actions/runs/45271464848
