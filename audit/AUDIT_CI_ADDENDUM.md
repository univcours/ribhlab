# RivoScan 0.45.68 — Addendum: cross-platform ZXing compatibility

**Context:** The original 45-file audit ZIP documents the source snapshot at commit `f476783cc4ee281295d5237fa93772e66e6f32f9`, with 3 fixes, 13,960 discovered occurrences and 14 areas remaining open. It is an evidence snapshot, not a 100% certification.

## Newly confirmed issue — CI-001

A fresh GitHub Actions run on Ubuntu [45028354849](https://github.com/univcours/ribhlab/actions/runs/45028354849) failed 4 Node test modules because `@zxing/library` was resolved as CommonJS and direct named imports raised `Named export 'BinaryBitmap' not found`.

**Fix:** `src/code-multi-scan.js` now imports the module namespace and resolves actual exported classes from either a native ESM namespace or a CommonJS container. No direct nonexistent `default` export is referenced. `tests/audit-zxing-esm.test.js` uses the same cross-platform resolution, tests genuine QR pixels, Code39 barcode pixels, a blank image, and a simulated CommonJS namespace.

**Verification completed locally:** 365/365 automated tests passed, and the production web build passed without the absent ZXing default-export warning.

**Verification requiring GitHub:** Consult the latest audit branch GitHub Actions run for Ubuntu/Linux test and Android signing evidence. A local test alone does not demonstrate cloud success.

## Outstanding limitations

The audit remains **PARTIAL**. Android hardware, camera auto-focus/zoom, real AdMob banner/interstitial, storage migration, all applicable 18 states, physical printed ID sheets, and comprehensive locale/rotation/keyboard testing are **NOT TESTED** on an actual Android device.

No Google Play or external store publication is performed.

## Additional CI release-pipeline finding — CI-002

GitHub Actions run [45028685063](https://github.com/univcours/ribhlab/actions/runs/45028685063) confirmed **success** for Ubuntu source tests, the original-signed Android APK, versionCode 183 signature validation, audit ZIP SHA-256 reassembly, and both uploaded workflow artifacts. The final GitHub Release publication step failed on Bash syntax: a missing `fi` closing an `if/else` block. The workflow has been corrected, and the release shell block was independently checked by `bash -n` on Windows Git Bash. The next GitHub Actions run must confirm publication.

This is an independent CI packaging issue, not proof of any untested Android runtime functionality.
