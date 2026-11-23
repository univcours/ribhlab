# RivoScan — Persistent project handoff

## LATEST VERIFIED CHECKPOINT — RivoScan 0.45.90 (2026-11-23)

- **Signed tester pre-release available, NOT uploaded to Play:** https://github.com/univcours/ribhlab/releases/tag/rivoscan-0.45.90-fab-banner-safearea . Signed ARM64, ARM32, Universal APK and all-ABI AAB present (package `com.ribhlab.rivoscan`, versionName `0.45.90`, code `205`, original signing identity checked).
- **CI evidence:** https://github.com/univcours/ribhlab/actions/runs/45280092598 . Verified passing: npm check + all Node tests + bundle, responsive browser QA in portrait and 640x360 landscape, signed multi-ABI APK build, APK feature/class parity, original signer/version checks, AAB all-ABI signature checks and GitHub pre-release publication. Native Android emulator screenshot job was still running at this checkpoint; its completion and actual native AdMob delivery are NOT verified.
- **Primary source branch:** `fix/rivoscan-04590-fab-banner-safearea`. Icon commit `63aa5d4f`; signed built source includes later viewport QA corrections through `a0c06fe1`.
- **New file-type icons:** In both Home and Documents, non-previewable TXT/MD/DOC/XLS/ZIP/QR/Barcode/other file placeholders now use 38px self-hosted Material Symbols Rounded, distinct colors and a visible file-extension chip; actual PDF/photo page thumbnail images are preserved. Code: `src/main.js` + `src/rivo-file-icons-04590.css`. Current user specifically objected that TXT/file glyphs were too small and primitive; this is the implemented correction.
- **Other 0.45.90 improvements:** FAB icon is `photo_camera` (bottom Scan keeps document scanner icon); native AdMob 320x50 UI lane is reserved after consent/initialization even on NO_FILL, separate from bottom nav; banner hides behind full-screen tools. Formula OCR empty preview collapses, status bar/footer boundaries protected, native WebView viewport uses `window.innerHeight`. Short landscape suppresses unsafe ad and restores Home/Tools scrolling.
- **Remaining real-device QA:** actual AdMob SDK Loaded/Impression + screenshot and banner fill, scanner/QR/plate/Formula save interaction and camera permissions on physical device; authentic emulator screenshots. Browser screenshot QA is SAMPLE, not native phone proof. Do not claim 0.45.90 already Play-published.

---


## LATEST VERIFIED CHECKPOINT — RivoScan 0.45.89 (2026-11-23)

**Current target Android source:** `fix/rivoscan-04589-documents-import-clarity` (not the website `main`). Signed GitHub tester pre-release [RivoScan 0.45.89](https://github.com/univcours/ribhlab/releases/tag/rivoscan-0.45.89-documents-import-clarity) now has signed ARM64, ARM32 and Universal APKs plus signed all-ABI AAB; Android `versionCode=204`, `versionName=0.45.89`, unchanged app package and signing. It was **not** uploaded to Google Play. 

CI run: https://github.com/univcours/ribhlab/actions/runs/45271464848 — source checks/tests, browser responsive layout QA, five APK assemblies/ABI model parity/original signing checks and signed AAB verification passed. Android emulator capture was in progress at checkpoint; verify its final outcome and screenshots separately, as browser SAMPLE screenshots do not constitute native proof. Earlier 0.45.88 emulator failed to boot because KVM acceleration was unavailable and software emulation was disabled; 0.45.89 adds KVM permission setup and explicit TCG fallback.

RivoScan 0.45.89 fixes misleading generic `Import images` button in Documents to localized **Import files** and Material Symbols Rounded upload icon (seven languages), without deleting Scan, file import or other features. Source version expectations in 17 existing test suites were updated to code 204, and all source checks and browser UI verification passed. Design is **Material 3 Expressive + Material Symbols Rounded**, never restore historical Phosphor directive. Real AdMob loaded/displayed/impression evidence and full on-device scanning/PDF/RTL accessibility QA remain unverified: do not claim a launch-ready production release.

**For continuation:** read `docs/agent/RESUME.md`, `docs/agent/TASKS.md`, `docs/agent/PROJECT_STATE.md` on branch `fix/rivoscan-04589-documents-import-clarity`; check latest Actions/Release first. 

---


## LATEST VERIFIED CHECKPOINT — RivoScan 0.45.88 (2026-11-23)

**This section supersedes the older 0.45.86 / 0.45.87 branch-status references below. Do not read those historical statuses as current.**

- Active source branch: `fix/rivoscan-04588-master-qa-camera-banner`; verified commit `6e5be687977e84283585a12c0565a98f8a9686d6`; app `0.45.88`, versionCode `203`.
- CI: https://github.com/univcours/ribhlab/actions/runs/45267424630 . Verified successful in this run: npm source checks and tests, browser UI QA at 320/360/393/480/768, signed Android APK assembly, ABI feature-parity check, APK version/original-signer verification, signed AAB assembly and verification. **Inspect run conclusion again**: native emulator screenshot job was still in progress at this checkpoint.
- Verified GitHub **pre-release** (NOT Google Play): https://github.com/univcours/ribhlab/releases/tag/rivoscan-0.45.88-master-audit-camera-banner . Three signed tester APKs (ARM64, ARM32 and Universal) plus an all-ABI signed AAB exist as release assets; exact artifact names/sizes are on that release.
- Earlier failed CI jobs were blocked by Maven Central HTTP 429; the 0.45.88 branch adds a Google-hosted Maven Central mirror and Gradle caching, and the above run passed the actual Android signing, APK and AAB stages.
- Latest UI directive is **Material 3 Expressive + self-hosted Material Symbols Rounded**, not older Phosphor. Preserve original `com.ribhlab.rivoscan`, signer, document thumbnails, ML Kit and all PDF/editor features.
- Correct user-specific UI requirements: remove only duplicate **Import Images** in Documents; preserve generic Import, Scan entry in bottom nav, and central camera FAB, which must hide during QR/barcode/active scanner/permissions/dialogs/selection/processing.
- **Open QA, do not falsely mark done:** Android emulator screenshots/interactions must be reviewed; actual Android physical-device AdMob banner display/impression/consent and UI-safe inset are NOT verified; exhaustive feature-by-feature device regression and accessibility/RTL remain pending. Browser SAMPLE screenshots are not physical Android proof.
- Next concrete action: read latest Actions conclusion and signed Release, inspect authentic emulator screenshot artifacts/logcat, test real AdMob on a test device if available, fix any discovered failures on a new versioned branch, and update this checkpoint. No Google Play publishing without explicit request.

---


> READ THIS FILE AT THE START OF EVERY NEW CHAT. The full user-approved master specification is [RIVOSCAN_MASTER_SPEC.md](./RIVOSCAN_MASTER_SPEC.md) (419 original user-provided lines; preserved verbatim). Check GitHub branch, CI and Releases again before acting. This document is a checkpoint, not evidence that any test passed.

> **LATEST USER OVERRIDE (2026-11-23): Use Material 3 Expressive with Material Symbols Rounded, NOT Phosphor. Read [RIVOSCAN_DESIGN_OVERRIDE.md](./RIVOSCAN_DESIGN_OVERRIDE.md) BEFORE applying the older spec. Current development branch is `fix/rivoscan-04587-material3-expressive-rounded`, planned app `0.45.87` / versionCode `202`. Verify GitHub Actions and signed Release assets before claiming readiness.**

## Repository and source of truth

- GitHub: `univcours/ribhlab`. Default branch: `main`, **not** necessarily latest app source.
- Last verified published signed GitHub tester release: `rivoscan-0.45.85-external-open-unclipped-actions`; version `0.45.85`, code `200`; ARM64, ARM32, Universal APKs and Play-compatible AAB. Released Nov 23, 2026. **Not published on Google Play**.
- CURRENT development branch: `fix/rivoscan-04587-material3-expressive-rounded` (supersedes 0.45.86).
- Target version: **0.45.87**, versionCode **202**. CI workflow: `.github/workflows/rivoscan-04587-material3-rounded.yml`. Signed release tag planned: `rivoscan-0.45.87-material3-expressive-rounded`.
- As of this handoff checkpoint, 0.45.87 is **IN DEVELOPMENT**, not independently verified as successful. Check latest Actions run before reporting a release.

## Most important user clarification (DO NOT MISINTERPRET)

**The duplicate button is `Import Images` in My Documents, NOT Scan. The user explicitly corrected this.** Only remove redundant `data-import-images` from the Documents heading and its duplicate listener; PRESERVE generic `data-import="file"` (any files) and all other legitimate image import routes (Scan gallery and Tools). PRESERVE bottom navigation Scan button `rivo-nav-scan`; do not delete it as a guessed duplicate. The user wants the separate camera FAB floating, with centralized intelligent visibility.

## Current modifications on the 0.45.86 branch (inspect current code)

- `src/main.js`: redundant Documents `Import Images` button and handler removed; generic Import retained; redundant visible header Back removed but Android system Back / edge swipe preserved; preserved Scan navigation; installed `createFloatingCameraController` with app state and native-capture/processing updates; imported final `rivo-minimal-premium-04586.css`. User's 0.45.85 no-eye/external-viewer changes remain.
- `src/floating-camera-controller.js`: central state-driven FAB decisions for Home/Documents/Tools, QR/barcode/live/plate/editor/dialog overlays, active capture, busy, selection, keyboard, external app/background, and native banner collision. Bottom Scan navigation is deliberately untouched.
- `src/rivo-minimal-premium-04586.css`: minimal Phosphor Duotone tiles, less neon/glow, restrained RivoScan blue identity, ad-safe FAB positioning and hide behavior. Old CSS still exists but final layer overrides it.
- `src/banner-diagnostics.js` and `src/monetization.js`: SDK-backed diagnostic states (`NOT_INITIALIZED`, `CONSENT_PENDING`, `REQUESTING`, `DISPLAYED` [SDK expected only], `NO_FILL`, `NETWORK_ERROR`, `SDK_ERROR`, `HIDDEN_BY_LAYOUT`, `PAUSED`); no fake ad inventory. Settings exposes diagnostic status. Banner visibility on a physical device remains UNCONFIRMED.
- Current release workflow provides original signing key, real AdMob ID configuration, Play-compatible AAB and signed APKs. Do NOT upload to app stores without explicit user request.
- Tests: `tests/rivo-04586-fab-banner-minimal.test.js`; release-version and removed UI expectations updated in previous test files.

## Features to preserve unconditionally

- ML Kit FULL document scanner, native live scanner where available, ID card, QR/barcode, license plate, OCR, translation, PDF tools, image editing, Privacy Shield, import/export, sharing, print, file management, localization (EN/AR/FR/ES/DE/PT/IT), portrait orientation, original package `com.ribhlab.rivoscan` and original signing certificate.
- Home and My Documents use the same actual image/PDF thumbnails and file rows, six Phosphor actions fully visible in a compact grid by the thumbnail; remove long-press file menu, keep checkbox multi-select; eye and internal saved-PDF viewer removed, external Android ACTION_VIEW chooser with read URI permissions used instead.
- ARM64, ARM32 and Universal variants retain feature parity, plus AAB for supported Android architectures. Do not claim support for every device if OS, permissions or Play Services are incompatible.

## Important AdMob warning

Actual real IDs were found in the GitHub signing/build workflow; however **banner disappeared on the user's device and no root cause has yet been proven from Android logs**. A loaded SDK event is not proof of actual physical visibility, and `NO_FILL` is not a CSS bug. Diagnose live on device/emulator, consent, showBanner events, geometry/margin, safe areas, bottom nav, SDK errors, native `SizeChanged`, resume after external apps, and actual impressions; never make synthetic ad views/clicks or assert it is fixed solely from static tests.

## Last known QA state

- Early 0.45.86 Actions run had 19 failed tests, predominantly stale assertions for version 0.45.85 and obsolete Import Images / topbar Back. Tests were reconciled to current 0.45.86 behavior. **The newer run must still finish and be checked.**
- Existing browser screenshot tests use SAMPLE fixtures; DO NOT confuse with genuine Android emulator/device captures. Native scanner and real AdMob monetization are not fully validated by browser QA.
- Failures should be fixed at their cause; do not disable tests or weaken feature checks. Mark unresolved device-specific issues honestly.

## Next-chat exact continuation instructions

1. Read this file and `RIVOSCAN_MASTER_SPEC.md` from **main**.
2. Inspect latest branch `fix/rivoscan-04586-comprehensive-ui-fab-banner-audit`, current version, Actions results, GitHub release assets and screenshots.
3. Correct all actual failing tests and code regressions, especially FAB visibility on QR/barcode, banner geometry and duplicated controls.
4. Audit all windows/buttons per 419-line spec, capture real Android emulator/device screenshots where tooling permits. Confirm native AdMob only from actual SDK/logcat/device evidence.
5. Validate original signer, all ABI packages, no feature loss; publish **GitHub tester release** only after signed tests. Do not publish to Google Play without an explicit new user request.
6. Update this handoff and `RIVOSCAN_MASTER_CHECKLIST.md` on main after each milestone. Never say a release/test succeeded unless independently verified.

Prompt for a fresh chat: **“كمل RivoScan من آخر نقطة؛ قرا RIVOSCAN_HANDOFF.md وRIVOSCAN_MASTER_SPEC.md وRIVOSCAN_MASTER_CHECKLIST.md من main، وشوف آخر GitHub branch/Actions، وكمل الخدمة بلا ما تعاود البداية.”**
