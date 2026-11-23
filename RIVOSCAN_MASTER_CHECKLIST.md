# RivoScan Master Checklist — persistent, evidence-driven

## Signed 0.45.91 single-camera milestone — 2026-11-23

- [x] Single centered `Smart Scan` camera button uses Material Symbols Rounded `photo_camera`; floating duplicate FAB fully removed from render tree.
- [x] Smart Scan main navigation still calls `openSmartScanner()` on Android; no scanner features deliberately removed.
- [x] RivoScan 0.45.91 / Android 206 source + responsive browser tests passed; five signed ABI APKs and signed all-supported-ABI AAB verified, original package/signature retained.
- [x] GitHub tester pre-release: https://github.com/univcours/ribhlab/releases/tag/rivoscan-0.45.91-single-camera ; successful build https://github.com/univcours/ribhlab/actions/runs/45284073142 . **Not a Google Play rollout.**
- [x] Native Android emulator screenshot of Home shows one centered camera and no duplicate floating camera.
- [~] Independent real signed-APK QR/Plate/button navigation smoke re-test in workflow `rivoscan-04591-native-qa.yml` — inspect final outcome and actual screenshots, because original named QR/Plate captures actually displayed Home.
- [ ] Physical device AdMob SDK filled-and-displayed banner/impressions with consent and safe insets verified.
- [ ] Complete phone camera, barcode/QR, ML Kit OCR, export/PDF, rotation, accessibility and RTL regression.

---


## RivoScan 0.45.90 — signed tester milestone (2026-11-23)

- [x] Modern large file-type icons and extension chips shared by Home and Documents; original PDF/photo thumbnails untouched.
- [x] Actual camera glyph on floating FAB and original central Smart Scan icon retained.
- [x] Banner has its own native 320x50 placement above bottom navigation on eligible safe screens; no fake creative and no impression simulation.
- [x] Safe-area and Formula OCR preview/save/footer CSS integrated with status bar non-overlay setting.
- [x] Short landscape disables unsafe native AdMob banner, retains scrollable Home and Tools.
- [x] npm tests, source checks, Vite build and browser responsive UI QA passed in run 45280092598.
- [x] Five signed ABI-specific/universal APK builds, original Android signer, version 0.45.90/code205, model/feature parity, signed all-ABI AAB verified in run 45280092598.
- [x] Tester pre-release assets: https://github.com/univcours/ribhlab/releases/tag/rivoscan-0.45.90-fab-banner-safearea . **No Play Store upload**.
- [~] Android emulator screenshot: inspect final Actions result/artifacts; still in progress when this milestone was recorded.
- [ ] Physically verify AdMob banner load/impression/fill/visibility and placement with real SDK/logcat; correct layout alone cannot guarantee ad inventory.
- [ ] Physical Android regression for camera, QR/barcode, plate, Formula OCR save, PDF exports, keyboard/insets, RTL and accessible fonts.
- [ ] Only publish to Google Play after explicit user authorization and satisfactory device tests.

---


## RivoScan 0.45.89 — verified evidence and open issues (2026-11-23)

- [x] User directive enforced: Material 3 Expressive + bundled Material Symbols Rounded and original RivoScan blue identity.
- [x] Documents generic Import files label in seven languages, new rounded upload icon, original handler preserved; verified in responsive browser screenshot and test.
- [x] Legacy release test suite aligned with Android code 204 and version 0.45.89: npm checks/tests/build and browser QA passed in current GitHub Actions.
- [x] All five signed APK variants built with feature and model parity, package/version/portrait/original signer verified.
- [x] Signed all-ABI Google Play AAB built and original signer verified; **only saved to GitHub tester prerelease, not uploaded to Play**.
- [x] Signed release published: https://github.com/univcours/ribhlab/releases/tag/rivoscan-0.45.89-documents-import-clarity
- [~] Android emulator genuine screenshot attempt: KVM and TCG fallback added. Inspect final Actions run https://github.com/univcours/ribhlab/actions/runs/45271464848 and actual screenshot artifact; do not use browser SAMPLE as Android proof.
- [ ] Real-device SDK evidence of AdMob Banner fill/load/impression, safe inset and visibility, including consent states and no-fill recovery.
- [ ] Device-level QR, ML Kit, document/PDF export, camera FAB and Android back navigation regressions.
- [ ] RTL, accessibility font sizes, and app native UX physical QA.
- [ ] Explicit user approval before any Play Store publication.

Persistent branch-local next actions: `docs/agent/TASKS.md` on `fix/rivoscan-04589-documents-import-clarity`. 

---


## Verified 0.45.88 milestone and outstanding QA — 2026-11-23

- [x] Build 0.45.88 / code 203 with Material 3 Expressive and bundled Material Symbols Rounded source.
- [x] Browser responsive screenshot and layout checks passed in the 0.45.88 GitHub Actions run (320, 360, 393, 480, 768 CSS px); test fixtures clearly labeled SAMPLE.
- [x] Source checks, npm tests and Vite build passed in the same run.
- [x] All five signed APK builds, ABI parity, manifest/version and original signer verified by CI.
- [x] All-ABI signed AAB built and verified; saved to Actions and GitHub prerelease, not published to Play.
- [x] GitHub signed tester prerelease: https://github.com/univcours/ribhlab/releases/tag/rivoscan-0.45.88-master-audit-camera-banner .
- [~] Native Android emulator screenshot step still running at checkpoint; read https://github.com/univcours/ribhlab/actions/runs/45267424630 for final conclusion and evidence.
- [ ] Physically verify AdMob Banner loaded AND visible/positioned outside controls, with SDK/logcat/impression evidence; source-level fixes do not prove ad delivery.
- [ ] Physically test camera FAB transitions, native permissions, QR/barcode/ML Kit, file export, PDF, thumbnail display, and full Android back-stack/RTL/accessibility regression.
- [ ] Inspect all authentic emulator screenshots, note every defect and resolve regressions without deleting features.
- [ ] Refresh this list after actual device QA; never claim a store release because one has not occurred.

This latest milestone supersedes only the historical **status** entries below, not their outstanding acceptance criteria. Latest explicit Material 3 directive overrides the previous Phosphor design instruction.

---


> **LATEST OVERRIDE:** User now requires **Material 3 Expressive + Material Symbols Rounded** instead of earlier Phosphor/Minimal Premium. Read [RIVOSCAN_DESIGN_OVERRIDE.md](./RIVOSCAN_DESIGN_OVERRIDE.md) for the exact decision and current v0.45.87 branch, **not** the older 0.45.86 design requirement.

## Material 3 Expressive migration (2026-11-23)
- [x] Development branch `fix/rivoscan-04587-material3-expressive-rounded`; version `0.45.87`, versionCode `202`.
- [x] Install self-hosted `@fontsource-variable/material-symbols-rounded` with full variable axes; no CDN/network.
- [x] Material semantic icon renderer covers >120 app icon roles; shared Home/Tools/action icons and 13 scanner/editor modules migrated to it directly.
- [x] Replace animated neon/gloss with Material 3 Expressive rounded shapes, tonal blue surfaces, responsive FAB/navigation and file actions.
- [~] Browser QA for font rendering, icon clipping, RTL and all target viewport sizes — **CI not yet verified**.
- [ ] Fully passing source tests, production build, real Android screenshots and signed APK release verified.
- [ ] Confirm every remaining native/web icon path including Android system controls, avoid generic fallback/ligature text.
- [ ] Confirm no regression to verified Home/My Documents thumbnails, external file viewer, original Scan and Import behavior.

_Read [RIVOSCAN_MASTER_SPEC.md](./RIVOSCAN_MASTER_SPEC.md) for **all** 419 lines of the original user instructions; read [RIVOSCAN_HANDOFF.md](./RIVOSCAN_HANDOFF.md) for branch and CI pointers. This list is not a substitute for the full spec._

Status legend: [x] code change confirmed, [ ] pending, [~] partly done / real-device verification missing. An unchecked requirement MUST NOT be reported as completed.

## Release, backup and provenance
- [x] Verify latest original signed GitHub tester release 0.45.85 code 200, not a Play update.
- [x] Isolate new work on branch `fix/rivoscan-04586-comprehensive-ui-fab-banner-audit`.
- [x] Set code 201, version 0.45.86, preserve original APK signing workflow and package.
- [x] Keep user's original 419-line prompt verbatim in GitHub default branch.
- [ ] Final CI fully green for 0.45.86 and signed artifacts verified.
- [ ] Actual Android emulator and physical device workflows audited.
- [ ] All Android ABI variants and Play-compatible AAB byte-level and signature checks passed.
- [ ] No Google Play or other store publication without new explicit permission.

## Correct duplicate and Back controls (USER-CLARIFIED)
- [x] Remove **duplicate Import Images in Documents** only; keep generic file Import and Scan's image/gallery import.
- [x] Keep Scan entry in bottom navigation; user explicitly says Scan is **NOT** duplicate.
- [x] Remove redundant visible in-app header Back.
- [~] Preserve Android Back and edge-swipe navigation; native smoke verification still needed.
- [ ] Audit all other genuinely redundant Back buttons without removing necessary Close/Cancel or navigation.

## UI: Minimal Premium, Phosphor Duotone, file rows
- [x] New final `rivo-minimal-premium-04586.css` reduces strong glow/rotating neon around Home/Tools cards.
- [x] Preserve RivoScan blue identity/logo, reuse offline official Phosphor SVG library.
- [~] All screens use one icon visual system; full exhaustive per-window icon inventory still pending.
- [~] Home and Documents use same row and true PDF/photo thumbnails; native display not verified on device.
- [~] Six inline file action icons visible in 3×2 grid; current responsive QA is browser-based with SAMPLE fixtures.
- [x] No eye button or in-app saved-file preview; Android external ACTION_VIEW file chooser present.
- [x] File long-press action and menu removed; checkbox selection retained.
- [ ] Audit every tooltip, overlay, dialog, tool card, icon clipping, keyboard, RTL/large fonts and 320/360/393/480/768 px layouts on actual emulator.

## Floating camera (FAB)
- [x] Central `floating-camera-controller.js`, activated from app state; existing bottom Scan button not removed.
- [x] Hide FAB on modal, code/QR/barcode/plate/live scanner overlays, busy/capture/permission/selection/external app.
- [x] Handle ad banner geometry, keyboard focus, re-render and app lifecycle.
- [~] Position FAB above native AdMob reserved slot using content-bottom variable; actual device positioning needs check.
- [ ] Test open/close transitions, fast navigation, scanner permission, restoration after cancellation, single FAB and no flashes.
- [ ] Test FAB and Banner together on Android with real SDK/ad placements and safe areas.

## AdMob Banner
- [x] Verify existing real AdMob App ID, Banner and Interstitial IDs in signed workflow (no fake traffic).
- [x] Add SDK-derived `banner-diagnostics.js` to distinguish NO_FILL, network, SDK, consent, layout, loading and paused.
- [x] Expose status and error in Me/Settings without forcing fake ad visibility.
- [~] Existing native banner geometry and fit check reviewed; may require device-specific DPI/unit investigation.
- [ ] **UNKNOWN ROOT CAUSE of user's missing banner.** Capture actual logcat, SDK events, consent, layout and impressions. Do not claim resolved from source checks.
- [ ] Test in foreground, background/re-entry, returning from external applications, network/consent/no fill and multiple screen sizes.
- [ ] Confirm no native ad overlays on important controls or FAB and no policy-violating fake requests.

## Feature-by-feature regression
- [ ] Native camera/X/ML Kit document scanner, first-scan save, cancel, orientation.
- [ ] QR, barcode and plate scanning, torch, zoom, alert, scan logs.
- [ ] OCR and translation, online/offline and language variants.
- [ ] PDF merge/split/reorder/rotate/lock/compress/print/export.
- [ ] Photo editor, smart-clean, edges, book split, ID-photo, Privacy Shield.
- [ ] Saved documents persistent storage, permissions, import/share/rename/delete/multiselect and external chooser.
- [ ] No code duplicates, memory leaks, dead click handlers, CSS conflicts or performance degradation.
- [ ] Screen-reader focus, high contrast, RTL, all translations.

## Required QA and handoff discipline
- [~] Added `tests/rivo-04586-fab-banner-minimal.test.js` including duplicate Import Images correctness and FAB state transitions.
- [~] Reconciled stale version/UI assumptions in legacy tests. Last check was running; verify current GitHub Actions after any change.
- [ ] Inspect Android emulator screenshot artifacts; mark SAMPLE browser screenshots accurately.
- [ ] Save signed APK download links and actual sizes only after verifying GitHub Release assets.
- [ ] Update `RIVOSCAN_HANDOFF.md` and this checklist on main at every major milestone.
