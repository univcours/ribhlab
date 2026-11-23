# RivoScan — Persistent handoff / استمرارية المشروع

> **Source of truth:** GitHub repo `univcours/ribhlab`, not the ChatGPT message history.
> **Working branch:** `fix/rivoscan-04588-master-qa-camera-banner` (based on `fix/rivoscan-04587-material3-expressive-rounded`).
> **Target under validation:** RivoScan **0.45.88**, Android **versionCode 203**.
> **Last confirmed public downloadable tester:** 0.45.85; do **NOT** claim that 0.45.88 is downloadable until its signed GitHub Release assets are confirmed.
> **Store distribution:** No Google Play upload authorized by this handoff.

## User's non-negotiable requirements

- Professional, consistent, **clear and complete** icons, no clipped icons or pale low-contrast labels.
- Prefer the most recent user-approved expressive Material 3 UI, while the earlier attached master brief specified Phosphor Duotone. **This is a specification conflict to resolve explicitly; never silently reverse a newer change.**
- Keep original RivoScan identity, all Google ML Kit capabilities, OCR, QR/barcode and PDF features.
- Both Home and My Documents use the **same row renderer** and the current full-frame thumbnail dimensions; selection actions remain entirely visible within the row beside the thumbnail.
- File **long press and associated menu are removed**. Eye/in-app PDF viewer is removed. Opening saved files uses a native Android external app chooser with read permission.
- Remove unnecessary in-app Back and redundant **Import Images in Documents** (not Scan's legitimate import). Preserve Android system Back gesture and essential scanning entry points.
- The primary camera action is a context-aware FAB. Never show it during QR/Barcode/plate scans, native camera, OCR or translation capture, image editor, modal dialogs, ID Photo, book scanner, file selection, keyboard, or when overlapping a native AdMob banner.
- AdMob banner must reflect actual SDK and consent state. **NO_FILL is not a CSS failure.** Never invent revenue or a displayed ad from mere SDK initialization.
- Portrait orientation, original signing certificate, supported Android architectures, light per-ABI APKs and a Universal fallback. Do not remove functionality to save bytes.
- Show **verified real screenshots here** (browser/test screenshots must be labelled SAMPLE). Provide verified signed APK links whenever a new APK is actually ready.

## Previous work and last verified facts

- RivoScan 0.45.85 signed tester APK (ARM64, ARM32, Universal) and AAB are in GitHub Releases.
- 0.45.86 introduced `src/floating-camera-controller.js`, `src/banner-diagnostics.js` and `src/rivo-minimal-premium-04586.css`.
- 0.45.87 moved the interface to self-hosted Material Symbols Rounded and Material 3 Expressive. Its last GitHub Actions run **failed source checks** because a legacy test still expected `phosphorIcon()` in Book Scan, while code now renders `materialSymbol()`. Its APK release had not been confirmed when this handoff was drafted.
- Existing deep static audit `audit/AUDIT_MASTER_CHECKLIST.md` is a **source inventory**, not evidence of full Android runtime QA.

## Work completed on current branch 0.45.88

- New branch isolated from 0.45.87; package version and Android versionCode bumped to 0.45.88/203.
- Added `.rivo-id-overlay` and ID-photo modal visibility guards to central FAB state.
- Wrapped ML Kit/Camera capture for OCR, translation and document-AI in try/finally nativeCaptureDepth lifecycle tracking.
- Changed FAB/banner collision test to calculate **native Android 320×50 banner rectangle** from the actual margin, not the decorative HTML banner placeholder.
- Added structured native AdMob error formatting: error code 3 → NO_FILL, code 2 → NETWORK_ERROR; retain the real error text.
- Added `tests/rivo-04588-master-qa.test.js` and updated version assertions/legacy Book Scan icon expectation.
- Reviewed main navigation, Home/Documents shared renderer, scanner functions and native banner lifecycle.
- **PENDING VALIDATION:** source unit tests, responsive UI screenshots, Android APK/AAB build and native emulator; no success claim until the run completes.

## Continue safely in a fresh ChatGPT conversation

1. Fetch this file again from the exact branch, then inspect head commit and latest 0.45.88 GitHub Actions run.
2. Check for conflicts / files modified by other chats before writing. Never overwrite a newer branch blindly.
3. Run `npm run check`, `npm test`, `npm run build`, browser QA and Android Gradle release workflow.
4. Diagnose failures from actual CI logs and fix them; do not weaken tests just to get green.
5. Verify signer SHA-1/SHA-256, package `com.ribhlab.rivoscan`, versionCode 203, ABI parity, Portrait, and real APK artifacts.
6. Identify any remaining items from `RIVOSCAN_MASTER_CHECKLIST.md` as **UNVERIFIED**, not complete.
7. Update this handoff and checklist with the exact new commit/run IDs, signed release links and screenshots after verification.

Never treat a screenshot from a browser with SAMPLE documents as actual Android or real AdMob delivery. Never publish on app stores without explicit user approval.
