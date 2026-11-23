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
