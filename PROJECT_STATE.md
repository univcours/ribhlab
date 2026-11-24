# PROJECT_STATE.md — RivoScan verified handoff

Updated: 2026-11-24 after GitHub Actions run 45481179896, before any new on-device ad verification.

## Current release and sources
- Android source: `univcours/ribhlab`, branch `release/rivoscan-04595-banner-id`, SHA `aca01755407489b8f79e55fd9a4e2b53859f57e3`.
- Signed GitHub release: https://github.com/univcours/ribhlab/releases/tag/rivoscan-0.45.95-banner-id — versionName `0.45.95`, versionCode `210`, package `com.ribhlab.rivoscan`, original upload certificate; release workflow SUCCESS: https://github.com/univcours/ribhlab/actions/runs/45481094710 . Contains signed arm64, arm32, universal APK and supported-ABI AAB. The release itself explicitly says GitHub only; a **separate publisher** then uploaded to Play.
- Google Play **production upload completed in Android Publisher API** at 2026-11-24 20:35 UTC; track `production`, versionCode `210`, release status `completed` in original publisher logs. Workflow https://github.com/ribhlab/ribhlab.github.io/actions/runs/45481179896 success; release upload used `tools/play-publisher/rivoscan_04595_prod_only_preserve_images.py`. Store review/public visibility may lag; avoid assuming immediate user availability.
- The same successful publisher workflow captured signed-APK native Android screens on phone/tablet7/tablet10 and committed **en-US** screenshot replacements at ~20:40 UTC: phone **7**, seven-inch **6**, ten-inch **6**; old screenshots removed via API. `icon` and `featureGraphic` preserved. Logs and source verify distinct files, dimensions, SHA256, accessibility XML and actual installed 0.45.95. Artifacts in run 45481179896; only en-US had custom screenshots.

## Banner and native behavior
- AdMob corrected Banner unit: `ca-app-pub-7945572016731367/4841809190`; previous production source mistake ended `9191`. Exact corrected value and forbidden old value were checked in signed bundle and publisher before the Play upload. SDK callback/load, physical visibility and genuine `AdImpression` on real device are **NOT VERIFIED**. Earlier emulator reported code 3 NO_FILL; a separate 0.45.94 native demo-ad QA was blocked by Maven Central HTTP 429 before launching emulator. Do NOT assert actual fill.
- Signed 0.45.92 native emulator QA previously verified a Smart Scan Camera2 launch fallback, but shutter -> PDF saved to Documents on current 0.45.95 is NOT independently verified. QR and Plate screen navigation was previously verified on 0.45.91.
- Design: Material 3 Expressive + Material Symbols Rounded, one central camera button; no duplicate floating FAB.

## RDC state
- Desktop Commander online authorized Windows device: `DESKTOP-6NT8UN7`. Android SDK/emulator CLI and Java 21 installed; WHPX usable. Android 14 Google APIs x86_64 official image download was actively in progress when this checkpoint was written. No successful local emulator boot or in-app Banner screenshot yet. Don't confuse GitHub Actions native captures (already succeeded) with this still-pending RDC install.

## Source-of-truth distinction
- `univcours/ribhlab` is the Android app source (its default `main` is a multi-product website); `ribhlab/ribhlab.github.io` hosts the **original** working production and screenshot publisher. Do not redo uploads that workflow already committed.
- This docs branch is based on the exact signed 0.45.95 source and contains documentation only.

## Actual visual review of downloaded Play screenshot artifacts
- Downloaded all three original GitHub Actions artifacts from run 45481179896 and inspected contact sheets (7 phone / 6 tablet7 / 6 tablet10). Screens are real, distinct captures of 0.45.95 and show Material 3 blue UI.
- **Quality caveat:** Home/Documents show empty fresh-install document lists; Formula OCR, Book Scan, Photo Translation and ID Photo are unpopulated tool states. Tablet10 has extensive unused white space and a narrow left-oriented content column. These pass authenticity checks but do not yet demonstrate processed documents. Treat populated screenshots/tablet UX enhancement as an optional future **new improvement**, not as a reason to re-upload the already-committed identical assets.
- Ads are intentionally not visible in screenshot artifacts because the capture script enabled airplane mode; screenshots cannot validate actual AdMob banners.
