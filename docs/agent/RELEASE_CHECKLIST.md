# RivoScan signed release acceptance

- [ ] Source branch versionCode 204 / versionName 0.45.89 / package.json 0.45.89 / exact GitHub tag agree.
- [ ] `npm run check`, `npm test`, `npm run build` all green.
- [ ] Responsive browser tests with 320 / 360 / 393 / 480 / 768, RTL, keyboard and M3 symbols pass. SAMPLE captures correctly labeled.
- [ ] Verify generic Documents import says Import files, uses Material upload glyph and is fully functional.
- [ ] Android APK assembly and native ABI parity checks pass; original signing fingerprint, permissions and portrait confirmed.
- [ ] Full-ABI signed AAB pass; downloadable ARM64/ARM32/Universal signed APKs exist on GitHub prerelease.
- [ ] Genuine Android emulator screenshots captured and inspected for app launch, Home, Documents, Tools, QR and FAB.
- [ ] Physical device checks for camera, QR, ML Kit, gallery, PDF save and external opener.
- [ ] Real AdMob SDK consent, load/error code, size, display and impression checked on device; no policy violations.
- [ ] No Play Store deployment until explicitly authorized by user.

Do not represent a skipped, failing or unrun test as passed.
