# RivoScan • Android PDF Toolkit (Beta)

**RivoScan** is a privacy-oriented PDF toolbox from RibhLab. This repository provides an editable, installable Android/Capacitor starter plus a responsive web interface. It is **not yet a tested or published Play Store release**.

## Implemented source code

1. Scan photos with camera, reorder pages, rotate previews, and create PDF.
2. Images → PDF.
3. Merge PDFs.
4. Extract specified pages.
5. Rotate PDF pages.
6. Delete pages.
7. Reorder PDF pages with numeric sequence.
8. Page numbers.
9. Text watermarks.
10. Text annotations.
11. Hand-drawn visual signatures (NOT certificate-based digital signing).
12. PDF → JPG/PNG exported as ZIP.
13. Selectable PDF text → TXT.
14. OCR → TXT in English, French, Arabic, Spanish, German, Portuguese, Italian (language packs may download on first use).
15. Compress scanned PDFs by rasterization (may lose selectable text, links, forms; size reduction not guaranteed).
16. Clear common PDF metadata (NOT secure redaction).

### Android Studio: prevent the "phone already has a newer version" uninstall dialog

If Android Studio offers to **uninstall** the existing application, select **Cancel**. Never use the IDE uninstall/downgrade option, since it can erase local documents or settings.

**Root cause:** The native `android/` Gradle project is generated locally by Capacitor; Android Studio can retain a stale `app/build.gradle` versionCode even after the safe ADB installer upgraded the phone.

**Permanent fix:** RivoScan has one tracked authoritative `rivoscan-version.properties`, and `rivoscan-version.gradle` is appended LAST to the generated `android/app/build.gradle` by `apply-rivoscan-branding.ps1`, automatically on every Capacitor sync. Android Studio reads the correct version during Gradle sync and Run. Do not manually edit generated versionCodes.

From the repository root in Windows PowerShell:
```powershell
git switch feat/rivoscan-android-beta
git pull --ff-only origin feat/rivoscan-android-beta
.\apps\rivoscan\fix-android-studio-version.cmd
```
Then select **File > Sync Project with Gradle Files** in Android Studio once, and use **Run (app)**. The repair script safely builds and updates the app without uninstalling or clearing data. If the phone already has a higher versionCode than the locally built APK, installation is skipped.

**Beta safeguard:** selected files are limited to 30 MB each / 90 MB combined to reduce memory pressure. Basic page selection has automated unit tests.

All core editing and conversion runs inside the device/browser, with no document-upload backend. **OCR language data** may be fetched from the library's training-data host on first use; no document needs to be sent to a remote server. Test this behavior before any privacy claim in production.



## Native live edge scanner (new experimental implementation)

The current Android beta includes a custom native CameraX + OpenCV document camera, in addition to the existing Google ML Kit scanner. The custom mode **shows a moving blue four-sided outline during camera preview**. Press **Capture** to use a high-resolution photo; the app opens an editor with **four draggable corner handles**. Adjust all four corners, press **Save page**, scan more pages if needed, then press **Done** to return the cropped images to the Scan Document tool. Press **Process & Save** to create one multi-page PDF.

The **Gallery** button inside the live camera also imports images and opens the **same editable four-corner crop interface**. The main Scan Document screen exposes a separate **Import Photo · Adjust 4 Corners** action. Selecting images via Scan Document's file input also routes them through the Android native crop editor. The perspective warp uses OpenCV and can correct skewed quadrilaterals. If detection fails, a default quadrilateral appears; manually move the corners to cover the paper.

**Important:** This is beta code, not a claim of verified CamScanner parity. Live contour recognition can fail in low light, low contrast, or complex backgrounds; the detected green polygon may not be perfectly aligned on all camera aspect ratios. The crop editor lets the user correct it. Test this feature on physical Samsung/Android devices. No continuous auto-shutter is implemented; press Capture manually.

### Update an existing Android Studio installation

The native Java sources live under \`apps/rivoscan/native/android/\`. They must be copied into the generated native Android wrapper. From \`apps/rivoscan\`:

\`\`\`powershell
npm install
npm run build
npx cap sync android
.\install-live-scanner.cmd
\`\`\`

The provided \`setup-android-studio.cmd\` and \`start-rivoscan-autosync.cmd\` pipeline also invoke \`install-live-scanner.ps1\` automatically after Capacitor synchronization. Then in Android Studio use **Sync Project with Gradle Files** and **Run** to install the new APK on the phone.

Native integration adds CameraX 1.6.2 and OpenCV Android 4.12.0 to \`android/app/build.gradle\`, declares Camera permission and the private scanner Activity in \`AndroidManifest.xml\`, and registers \`RivoLiveScanner\` in \`MainActivity.java\`. Because these are Android-native changes, simply copying web files without re-syncing and rebuilding is not enough.

## Android camera compatibility (RivoScan 0.10 beta)

Camera selection is **not tied to Samsung or a specific device model**.
On compatible Android devices, the default rear camera is selected at startup.
Tap **Cameras ▾** in the native scanner for the cameras that Android's CameraX backend actually exposes, including the front camera. When a rear camera is not present, the scanner tries the front camera or another available camera. If the phone cannot bind live edge analysis and high-resolution photo capture together, it falls back to ordinary preview/capture. When OpenCV is unavailable, it can still capture photographs without automatic edge correction.

Physical lenses are not guaranteed to appear individually: Samsung, Xiaomi, Redmi, Oppo, Vivo, Pixel, Motorola, OnePlus and other vendors may expose a combined/logical camera to apps instead of all physical sensors. This is determined by the phone's camera HAL/OS. The app cannot repair a damaged physical camera or override cameras blocked by Android.

**Android only:** This Capacitor project produces an Android APK; iOS requires a separate iOS native project and camera implementation. The persistent public Downloads/RivoScan library currently relies on Android 10+ MediaStore; on earlier compatible Android versions, storage capabilities and app permissions differ.

For Windows, after pulling the branch, run:
```powershell
cd apps\rivoscan
.\install-rivoscan-android.cmd
```

The older `install-rivoscan-on-samsung.cmd` remains an alias but is no longer brand-locked. If more than one authorized Android device is connected, select the intended serial first via `$env:RIVOSCAN_DEVICE_SERIAL = 'your-adb-device-id'` to prevent deploying to the wrong device. Installation replaces the existing build only when signing permits and does not uninstall or wipe user data.

**QA:** Verify camera chooser/front/rear fallback, manual corners, batch PDF, torch/no-flash behavior and storage separately on multiple actual phones. A successful CI build is not a substitute for device tests.

## New in 0.2 beta: smart scans, document bundles and transfer

- **Smart Scanner (Android):** Uses the maintained `@capacitor-mlkit/document-scanner` (Capacitor 8) plugin and the Google ML Kit Document Scanner UI. It supports automatic document edge detection and perspective correction, manual adjustment in the system scanner, filters, multi-page scanning (up to 20), and **photo-gallery import**. The basic fallback camera and basic web image picker do not automatically crop edges. Google Play services may first need to download the scanner module.
- **Multi-document bundle:** `Combine Documents` accepts mixed PDF/JPG/PNG/WebP files and combines their pages into one PDF in the selected order. `Scan Document` also supports accumulating multiple ML Kit scanned pages before exporting one PDF. `Merge PDF` remains available for PDF-only inputs.
- **Share Any File:** Android native share sheet sends multiple selected files using the supported installed apps, including PDF, JPG, TXT, ZIP, Office files, etc. Actual recipient/file-type handling depends on the receiving Android app. The browser fallback uses Web Share API where supported.
- **Direct File Transfer (Beta):** Manual offer/answer pairing over encrypted WebRTC, then file bytes travel device-to-device. No user accounts or file upload service; no TURN relay is supplied. Two devices must exchange codes through another channel, and some networks/NATs will block connection. Max 15 MB per file / 60 MB per batch. The recipient selects where to save/share received files.
- **Privacy:** Smart Scanner UI and models are delivered by Google Play services; network access may be needed on the first use. WebRTC optionally uses Google's public STUN service for network discovery. Connection codes may reveal IP/network details and should be exchanged privately. Files themselves are not intentionally sent to STUN or an application backend.

### Updating a previously generated Android Studio project

After fetching `feat/rivoscan-android-beta`, go to `apps/rivoscan` and run:

```powershell
npm install
npm run check
npm test
npm run build
npx cap sync android
```

Then in Android Studio, click **Sync Project with Gradle Files**, select the phone, and **Run**. `npm install` + `npx cap sync android` are essential to register the new document scanning native plugin. When using the RivoScan auto-sync watcher, it runs the dependency install on `package.json` changes.

**Testing status:** Feature code is a Beta integration. Validate the gallery flow, multi-page edge correction, mixed bundles, Android file share sheet, and two-device WebRTC transfer on real phones before marking them production-ready. No guarantee of connection across NATs and no one-tap nearby discovery yet.

## Requirements

- Node.js 22+
- Android SDK and Android Studio for native development (or GitHub Actions)
- GitHub Actions for building debug APK
- Google Play Console developer account for production publishing

## Setup

```bash
cd apps/rivoscan
npm install
npm run dev
npm test
```

To build Android locally:

```bash
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

Android package ID: `com.ribhlab.rivoscan` (verify uniqueness and branding before release).

To get a **debug APK**, run GitHub Actions → **RivoScan Android debug build** → **Run workflow**. Download the artifact `RivoScan-debug-APK`. It is for QA only, **not a signed release AAB for Google Play**. Dependencies are installed at build time; commit a lockfile before production releases for reproducibility.

## Before Google Play release

- Test every tool on actual Android devices, including large files, Arabic OCR and Native Share.
- Brand native launcher with the included `assets/icon.png.b64`; workflow applies it during build.
- Add native image edge detection / perspective crop and true automatic scanner detection; current version uses enhance/grayscale filters, not automatic perspective correction.
- Build a properly signed **release AAB** using upload key stored in GitHub Actions secrets; never commit keystore, JSON service account, or passwords.
- Create the Play Console app entry, confirm package ID, app icon, and supported targets.
- Prepare privacy policy at publicly accessible URL; check Data Safety, permissions, screenshots and declarations against real behavior.
- Confirm RivoScan trademark/name availability. Avoid impersonating competitors.
- Integrate Google Play publishing in a restricted test track once app and signing are ready; approval cannot be guaranteed.

## Roadmap (NOT implemented)

- True PDF → Word/Excel with layout reconstruction.
- AI translation / summary / PDF chat (requires explicitly opt-in network backend and pricing/privacy consent).
- Cryptographic signatures, encryption and redaction.
- Camera auto-edge detection, perspective correction and live document framing.
- In-app purchases, AdMob ads and subscription entitlement checks.
- Fully translated tool UI (7 locales currently cover primary navigation, not every action label).

## Security

Never share service-account JSON, release keystore or Play Console password in chat. Avoid assigning admin access to CI when the narrower release permissions suffice. Do not release this beta before independent QA.

## RivoScan 0.20.0 — restored CamScanner-like controls

Open **Me > Scanner preferences** for nine persistent controls:
- Auto-clean on ✓ (default on), enhancement preset (Auto / Enhance / Magic / No Shadow / Whiteboard / B&W / Original), optional original JPG backup in `Documents/RivoScan/Originals`.
- Single vs. batch capture default, HD vs. SD camera, saved JPG quality (78/88/94%).
- Output PDF quality (65/85/95%), A4 vs. US Letter paper, automatic PDF creation or manual page review before export.

Settings are stored locally (no cloud account) and passed into the **native CameraX scanner**. PDF creation does not repeat enhancement on already-cleaned native scans. Existing OCR and PDF tools remain available.

The ID Card tool now captures a front and back photograph and arranges both on ONE A4 PDF page. The PDF Print action uses Android's actual print dialog for a RivoScan PDF (requires printer setup). Scanner results, stamp visibility and physical folds still need testing on a real phone; this is not equivalent to a non-rigid dewarping or generative restoration engine.

Known gaps versus CamScanner: no advanced AI handwriting removal, nonrigid book dewarping, formula solver, photo translation, secure PDF encryption, public cloud sharing link, full Word/Excel layout recreation or semantic object repair. These are explicitly unimplemented, not silently advertised as working.
