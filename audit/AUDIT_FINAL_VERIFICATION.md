# RivoScan 0.45.68 — Final release verification and locale addendum

**Status: tester release VERIFIED. Application-wide audit is PARTIAL, not 100% complete.**

## Verified cloud pipeline
- Source branch: `audit/rivoscan-ultradeep-04568`.
- Successful GitHub Actions run: https://github.com/univcours/ribhlab/actions/runs/45029202419
- Android build: PASS.
- Package: `com.ribhlab.rivoscan`, versionName `0.45.68`, versionCode `183`. APK version and the original upload-key signature verified by the workflow.
- Signed APK: https://github.com/univcours/ribhlab/releases/download/rivoscan-0.45.68-ultradeep-audit/RivoScan-0.45.68-AuditFixes-SIGNED.apk
- Evidence ZIP: https://github.com/univcours/ribhlab/releases/download/rivoscan-0.45.68-ultradeep-audit/RivoScan-UltraDeep-Audit-0.45.68.zip
- Both assets and the CI addendum have been verified as uploaded to GitHub Releases, not merely generated locally.
- Google Play and other stores: **NOT PUBLISHED** in this audit task.

## New post-release Chrome localization audit
- Seven locale settings tested: en, fr, ar, es, de, pt, it.
- Two CSS viewport sizes per locale: 390 × 844 and 320 × 640 (14 total UI cases).
- Each case loaded the production app, set its persistent language preference, reloaded, opened Tools, and inspected visible controls and page width.
- **14/14** had the expected `document.documentElement.lang`.
- **14/14** had correct `dir`: `rtl` for Arabic, `ltr` for the other six locales.
- **0** cases of document-level horizontal scrolling beyond the viewport.
- **0** cases of measured visible controls protruding beyond the viewport horizontally.
- **0** JavaScript exceptions recorded.
- Evidence: `audit/browser/locale_sweep.json`; scripts: `audit/locale_sweep.py`. Screenshot examples: `locale_ar_320.png`, `locale_ar_390.png`, `locale_fr_390.png`.

### Caveat
These are real Chrome DOM/render observations, **not native Android UI tests**. They do not prove complete translation accuracy, every dialog, screen rotation/keyboard, dark mode across every screen, or camera/AdMob functionality.

## Fixes in the tester
1. Book Scan no longer renders duplicate Take photo and Import buttons in the initial empty state (Chrome UI and unit test verified).
2. ID Photo Maker no longer opens an empty Photo settings drawer (Chrome UI and unit test verified).
3. ZXing QR/barcode import works in ESM bundling and on Node/Linux CommonJS packages; verified against generated QR and Code39 image pixels; no device-camera proof.
4. GitHub workflow repaired to handle ZXing Linux environment and Bash release syntax.
5. Auditing inventory includes machine-readable, evidence-linked static and browser matrices; records not individually tested remain UNVERIFIED.

## Remaining critical quality gate
The Windows machine has Android SDK and WHPX acceleration, but **no ADB-connected Android device, configured AVD, installed Android system image, or Java/sdkmanager toolchain**. A real device or a newly configured emulator is needed for native app navigation, file storage, permissions, true AdMob banner and interstitials, autofocus/zoom, background/foreground activity, memory/rotation and keyboard-inset checks. Android SDK packages require Google's SDK license acceptance; this audit did not automatically accept that on the user's behalf.

The full source checklist tracks **13,960 source occurrences across 296 files** (snapshot at `f476783`), and the browser traceability matrix has **428 observations**. These are not equivalent to 13,960 validated UI components.

**FINAL GATE: BLOCKED.** Never claim the application was checked completely or is bug-free until the outstanding checks have reproducible evidence.
