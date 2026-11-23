# RivoScan project state

- Source of truth: GitHub repository `univcours/ribhlab`, branch `fix/rivoscan-04589-documents-import-clarity`.
- Target app version: 0.45.89; Android versionCode 204.
- Latest confirmed signed tester GitHub prerelease: [0.45.88](https://github.com/univcours/ribhlab/releases/tag/rivoscan-0.45.88-master-audit-camera-banner) (signed ARM64/ARM32/Universal APK plus all-ABI AAB, not Play published).
- Latest verified 0.45.88 CI: https://github.com/univcours/ribhlab/actions/runs/45267424630 — JS tests, browser UI QA, APK assembly, ABI parity, signing and AAB verification passed; real Android emulator screenshot job was still running when the checkpoint was written. Re-check conclusion.
- 0.45.89 source fix: generic Documents file importer correctly labeled in seven languages with Material upload icon; automated test added.
- 0.45.89 first CI failed at version gate because workflow expected code 203; workflow corrected to 204 in commit `431cfff7`; new CI MUST be verified. No signed 0.45.89 release claimed yet.
- New release must not reuse 0.45.88 versionName/code/tag.
- Last verified original source state before 0.45.89: 0.45.88 `6e5be687`.
- Important blocker: actual AdMob banner physical display / impressions, Android device-specific FAB and full feature regression are unverified. No fake ad inventory or impression simulation.
- Next exact action: check the newest Actions run for 0.45.89, inspect errors, fix until source QA + signed APK/AAB pass. Then inspect emulator screenshot artifacts and real-device banner diagnostics, update this file with final run/commit.
