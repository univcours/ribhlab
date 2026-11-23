# RivoScan — Latest user-approved design override

**Effective: 2026-11-23. Higher priority than the older Phosphor/Minimal Premium language in the original 419-line `RIVOSCAN_MASTER_SPEC.md`.** Preserve the original spec verbatim for traceability.

## Latest instruction

**“استعمل Material 3 Expressive مع أيقونات Material Symbols Rounded”** — Use **Material 3 Expressive** UI/UX throughout RivoScan, and **Google Material Symbols Rounded** for all functional app icons. This explicitly supersedes every earlier instruction to use Phosphor Icons, Phosphor Duotone or Lucide.

Required implementation decisions:
- Material 3 Expressive inspired adaptive tonal surfaces, accessible touch targets, rounded expressive shapes, intuitive states/motion, and visual hierarchy, while **preserving RivoScan's original blue brand and logo**.
- Bundle Material Symbols Rounded **offline** in the Android APK, not from a CDN or network-loaded Google Fonts. The current implementation uses `@fontsource-variable/material-symbols-rounded/full.css` and `src/material-symbols.js` with a central, explicit semantic mapping.
- Update every icon caller (including scanner, QR/barcode, PDF, page manager, Privacy Shield and editor), not only Home; **no broken buttons, icon cropping, text ligatures or missing fonts**.
- Document rows in Home/My Documents MUST have real and identical file thumbnails; all six actions visible, external-only file opening, no eye/internal viewer or long-press menus.
- **Very important correction from user:** the redundant control was **Import Images in My Documents**, **NOT Scan**. Generic file Import remains; bottom Scan navigation must remain. Camera FAB is separate and managed centrally, hidden in QR/barcode/active camera/permission/dialog/selection/busy contexts and must not obscure AdMob.
- Preserve ML Kit/OCR/translation/PDF/scan, app ID, signer, offline function, landscape/portrait original restrictions, original saved files and data, accessible RTL and all Android architectures supported by the build.
- AdMob Banner actual visibility is NOT confirmed from code; capture genuine device SDK/logcat results before claiming it fixed. Do not inject fake ad impressions/clicks.
- Do not deploy to Google Play without a fresh explicit request. Only verified signed GitHub test APKs may be published after CI passes.

## Current branch and status

- Development: `fix/rivoscan-04587-material3-expressive-rounded`
- Version planned: `0.45.87`, Android versionCode `202`.
- Signed CI: `.github/workflows/rivoscan-04587-material3-rounded.yml`.
- Latest verified stable GitHub test release before this new work: `rivoscan-0.45.85-external-open-unclipped-actions` (not published on Play).
- 0.45.87 CI and Android emulator screenshots must be verified before stating release success.

## Implementation files

- `src/material-symbols.js` — central Google Rounded ligature map/renderer; whitelisted symbols.
- `src/material3-auto-icons.js` — convert remaining legacy text glyphs without changing listeners.
- `src/rivo-material3-expressive-04587.css` — final Material 3 Expressive design layer.
- `src/main.js` — imports locally packaged variable font/CSS and Material renderer.
- `src/phosphor-icons.js` and `src/phosphor-auto-icons.js` — backward-compatibility shims only, **do not display Phosphor artwork**.
- Main tool modules now import `materialSymbol` directly (files, page manager, editor, QR/barcode, camera, Privacy Shield, etc.).
- Package `@fontsource-variable/material-symbols-rounded` self-hosts icon font offline.
- Existing `src/floating-camera-controller.js` and `src/banner-diagnostics.js` remain in use.

## Continuation

Read `RIVOSCAN_MASTER_SPEC.md`, this override, `RIVOSCAN_HANDOFF.md`, `RIVOSCAN_MASTER_CHECKLIST.md`, and check current GitHub source/CI/releases. The latest explicit user instruction (Material 3 Expressive/Rounded symbols) overrides old Phosphor requirements. Continue from latest verified code and user corrections, not from memory guesses.
