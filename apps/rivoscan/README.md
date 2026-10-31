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

**Beta safeguard:** selected files are limited to 30 MB each / 90 MB combined to reduce memory pressure. Basic page selection has automated unit tests.

All core editing and conversion runs inside the device/browser, with no document-upload backend. **OCR language data** may be fetched from the library's training-data host on first use; no document needs to be sent to a remote server. Test this behavior before any privacy claim in production.


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
