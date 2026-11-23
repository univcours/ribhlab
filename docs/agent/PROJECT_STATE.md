# CURRENT: RivoScan 0.45.91 native verified checkpoint (2026-11-23)

- Release: https://github.com/univcours/ribhlab/releases/tag/rivoscan-0.45.91-single-camera ; original-signed ARM64/ARM32/Universal APKs and AAB; Android code 206. No Google Play publication.
- Signed release CI fully passed: https://github.com/univcours/ribhlab/actions/runs/45284073142 . One central `photo_camera` Smart Scan button in bottom nav; redundant floating FAB removed from render tree.
- Independent **real installed signed APK** Android emulator navigation workflow passed: https://github.com/univcours/ribhlab/actions/runs/45291128570 . Pixel comparisons versus 01-home: QR / Barcode content changed 52.643%, Plate Scanner content changed 42.233%; screenshot artifacts: `RivoScan-0.45.91-ACTUAL-Emulator-Navigation-QA`.
- **Unresolved:** center Smart Scan button tap changed only 0.004% of central content after 7 seconds; it looked like Home, so actual native ML Kit document scanner opening/saving is NOT verified. This may be a Google Play Services/emulator limitation OR a real flow issue; investigate Android logcat and physical device before claiming fix. Do not confuse a bound click handler with an accepted scanner launch.
- Screenshots of 0.45.91 QR and Plate show real scanner overlays and the new central camera symbol. Original 0.45.91 release workflow's QR/Plate-named screenshots were incorrectly Home due stale tap coordinates; independent test corrected the coordinates and compared images. No evidence of real AdMob impressions on phone; browser SAMPLE is not proof.
- Design instruction remains Material 3 Expressive + Material Symbols Rounded. Source branch is `fix/rivoscan-04591-single-scan-action`. Do not recreate repo or reintroduce floating camera.

---

# RivoScan 0.45.89 — latest verified state (23 Nov 2026)

- **Repository:** univcours/ribhlab. RivoScan Android branch `fix/rivoscan-04589-documents-import-clarity`, source implementation commit `c498001aab2a285850ded759bf1e9ae79742056b`. Later documentation-only commits must not be mistaken for new Android binaries.
- **Signed release:** https://github.com/univcours/ribhlab/releases/tag/rivoscan-0.45.89-documents-import-clarity — published as GitHub **pre-release**, NOT Google Play. Signed ARM64/ARM32/Universal APK and all-ABI AAB assets verified on GitHub.
- **versionName:** `0.45.89`, **versionCode:** `204`, **package:** `com.ribhlab.rivoscan`. Same original signing identity was checked in CI.
- **CI:** https://github.com/univcours/ribhlab/actions/runs/45271464848. Successfully passed source checks/npm tests/build, responsive/browser QA 320/360/393/480/768, all five signed ABI APK builds, feature/class/model parity, manifest original signer verification, AAB build and all-ABI signature verification. Android emulator capture step was still running at this documentation checkpoint. Inspect its outcome and artifacts, not just overall job conclusion (the capture step is configured continue-on-error).
- **Resolved:** Documents generic import mislabeled "Import images" fixed to "Import files" across 7 languages, with Material Symbols Rounded upload icon, no deletion of import handler, Scan nav or camera FAB. 19 legacy test assertions fixed to current release metadata and CI workflow branch.
- **Design:** Material 3 Expressive + Material Symbols Rounded, bundled locally, is the latest instruction; ignore superseded Phosphor text.
- **Android emulator:** 0.45.88 screenshot attempt failed with `Software CPU emulation (-accel off) is not supported`, no actual emulator screenshots were produced. In 0.45.89 workflow, new KVM permissions and TCG fallback attempt was added. Verify actual emulator results.
- **Unverified:** real native AdMob banner display/impression, exact SDK no-fill error on physical device, ML Kit/camera/QR/PDF end-to-end on phone, accessibility/RTL native screenshots. Don't assert these are solved.
- **Next action:** read current 0.45.89 emulator logs/artifacts, fix emulator if no genuine screenshots, inspect true Android screens, verify banner on physical authorized device, then re-run only needed QA. Never publish Google Play absent explicit instruction.
