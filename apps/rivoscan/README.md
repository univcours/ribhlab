# RivoScan • Android PDF Toolkit (Beta)

## 0.41.3 field-test features (all unlocked)
The primary Scan action uses Google ML Kit Document Scanner FULL on compatible Android phones (capture, automatic document detection/cropping, native cleanup and review). CameraX remains a fallback and manual corner editor. The unified native scanner provides filter selection including real UVDoc offline ONNX for neural unwarping. Optional Google ML Kit FULL remains available internally as a supported fallback and specialized cleaning engine. Book Scan Pro adds optional ML Kit cleaned page capture and locally varying text-line straighten with review/undo. This does not guarantee true 3D reconstruction of damaged paper or lost text.

Do not uninstall or clear app data to update. No Pro payment or gating is enabled until user device testing is complete and a separate Play Billing release is approved.


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

## 0.41.0 native PerfectScan
Official UVDoc ONNX on Android plus optional relative 3D surface triangulation using 2–4 camera views. Original source preserved, review before save, no paywall until physical QA. See PERFECTSCAN_IMPLEMENTATION.md.

## 0.41.1 scan-review and turquoise release
Every scanned document remains visible for manual corner confirmation and locally computed sharpness/exposure/glare diagnostic; the UI advises Save or Retake instead of silently saving. Processing filters visibly render the source and enhanced output, with explicit user confirmation. The HD document perspective crop uses up to 3300px source detail when supported, while non-HD remains memory-bounded. A matching turquoise SVG, native adaptive icon and automatically generated PNGs replace the old blue palette. Do not uninstall an old signed build to force updates; all Pro tools remain open during field QA.

## 0.41.2 One Scanner UX
One user-visible Scan entry. CameraX captures, analyzes and displays the photo before Save; adjust 4 corners, choose regular high-resolution color, paper-crease or UVDoc neural filter, compare, Save or Retake. Native Save stays disabled until the processed image appears. No approval checkbox, no empty white placeholder, no separate Smart Scan / PerfectScan Pro cards. Optional multi-angle 3D and fusion remains under Scan > Advanced Correction, with mode dropdown instead of checkbox; JPG/PDF integrity copy preserves originals. UVDoc effective AI resolution is bounded to 1024px while Pro Scan retains original HD text detail. Physical document QA pending.

## 0.41.3 — AI Deep Clean is the scanner
The single Scan action from Home, Scan workspace, Tools and ID Card now directly launches Google ML Kit FULL (gallery import allowed), saving the JPEG images that Google returns and creating an optional PDF. The native CameraX document camera is kept only for incompatible Google Play services or explicit manual edit. No separate Smart Scan, Deep Clean or PerfectScan Pro screen appears. Optional fusion, UVDoc and relative 3D are accessible under Scan > Advanced Corrections and in scanner settings. A user cancel never automatically launches backup CameraX. Note ML Kit output JPEGs are the cleaned Google scans; the plugin does not expose raw source photos. No delete/uninstall, no paywall or extra consent checkbox.

## 0.42.0 — AdMob field-test monetization (DEMO ADS ONLY)
- One Android banner, offset away from bottom navigation. No advertising/SDK on the browser build.
- Explicit, dismissible rewarded video grants all advanced tools for **10 minutes**. Only a confirmed Google rewarded callback or returned SDK reward unlocks; cancellation never unlocks.
- After at least **2 successful document saves**, full-screen interstitial is eligible only on a subsequent user-initiated Home/Tools/Me transition, after 2 minutes elapsed, with an **8-minute cooldown and a maximum of 3 per foreground app process**; never during capture or saving. Skips if 10-minute access is active.
- Essential Scan, file library, existing saved documents, imports, share and routine PDF tools stay accessible without a forced video.
- Consent is requested through Google UMP before requesting ads and ad privacy options are available in settings. If Google consent or ad serving is unavailable, no ad is fabricated. Advanced ad-gated tools may be temporarily unavailable.
- All AdMob IDs are **Google demonstration IDs**. They generate **zero real advertising revenue**. Before commercial publication, register the RivoScan app in AdMob, configure valid production IDs via a reviewed release process, verify consent/privacy notice, Play Data Safety, app-ads.txt and complete device QA. Never publish Google demo IDs as revenue units.

## 0.42.1 — no banner, reliable test ad loading, Android back and responsive files
- **No banner:** AdMob banner loading has been removed. Rewarded video, interstitial and app-open have separate official Google demonstration ad units in development builds.
- **Consent corrected:** the Google UMP request/form runs before Android Mobile Ads SDK initialization; on consent rejection or unavailable ads, no ad appears and no simulated reward is granted.
- **Rewarded video:** user chooses to watch; SDK reward callback or reward item is mandatory for 10-minute access. No video is forced into the editor. Essential scanner, document library, import and share remain available.
- **Interstitial:** preloaded and shown only at an actual home/tools transition after 2 saved outputs, with 8-minute cooldown, 3 per process. No delayed surprise after a new screen renders.
- **App open:** preloaded and shown only on a genuine return from ≥60s background, with at least a 20-minute fullscreen cooldown; never during scanning, editing or after a rewarded unlock.
- **Ad diagnostics:** Me/Settings includes current native status, SDK loading failures, Retry and an explicit test-interstitial trigger. Debug builds do not earn revenue; use the production App ID and ad units only after actual AdMob configuration, privacy review and physical tests.
- **Android navigation:** real Capacitor Android system-back listener, with narrow edge-swipe fallback. Back dismisses selection before leaving Documents, preserves files and does not interrupt saves.
- **Files selection:** bottom fixed toolbar removed. Share/Delete stay side by side and remaining actions wrap inside the Documents panel, above Android gesture navigation bar.
- **Turquoise brand** preserved throughout revised controls.

- Header Back button added to every non-Home page; both left and right edge swipe fallbacks work alongside Android's system back gesture.

## 0.42.2 — back-navigation interstitial placement
- Android hardware Back, system gesture, edge-swipe fallback and visible toolbar Back share the same tool-to-Home route.
- One preloaded interstitial is eligible only after 2 minutes of use and a meaningful tool break (a document saved or 2 real tool returns), with 8-minute fullscreen cooldown and max 3 per app process. Consent and ad readiness are required.
- No ads on exiting/minimizing from Home, dismissing selection or dialogs, during scanner capture, editing, saving, or during a 10-minute rewarded unlock.
- Interstitial *can* be video but may show images; creative cannot be forced to video. Rewarded video remains explicitly optional.

## 0.42.3 — Retake UI label legibility
- Native scan/crop editor header has a full-width Retake control (94 dp, 15 sp) with accessible label. It preserves the existing tap action to resume the camera.
- The web-based scan editor now displays **Retake** instead of **Add / retake** in English, and **رتايك** in Arabic; native Arabic uses **رتايك**, matching the requested wording. Other translations remain localized.
- Premium turquoise design mockup reviewed separately; the mockup is a concept, not a claim that all UI screens have been implemented.

## v0.43.0 — approved turquoise Premium UI implemented
- The Home dashboard now uses a real turquoise AI card, explicitly opt-in Google Rewarded video for 10-minute access (Android only), a clean 3x3 scanning tools layout and a compact recent-files grid. None of the nine tiles are fake actions; they route to existing scanner, import, ID card, flatten, eraser, enhance, books, images-to-PDF and OCR functions.
- A five-position mobile navigation bar keeps the central camera capture action and leaves Android system gesture space unobstructed. Existing safe in-app Back logic remains intact.
- The My Files page has functional All/PDF/Images chips, plus existing search, sort, share, delete, print, selection and long-press actions. Saved files are never migrated or deleted during the UI change.
- The image editor Retake action is clearly labeled and styled in teal; native scanner retains its full Retake label. Premium CSS is loaded last to unify teal/white/gold without fake document thumbnails.
- The Home premium card reflects actual rewarded access state. Web/browser previews do not pretend ads were viewed. The AdMob debug build still uses Google **test IDs** only and generates no revenue; native/device QA is required.

## v0.43.1 — Centered independent floating camera FAB
- Camera is no longer a fifth bottom-navigation button: there are four navigation slots (Home, Documents, Tools, Me).
- A separate 70dp teal circular camera FAB is centered just above the mobile nav, honoring Android safe-area and gesture insets. It opens the existing native scanner via data-live-camera on Home/Documents/Tools.
- FAB hides on non-camera workspaces, file multi-selection, document viewer, editors and modal overlays. Tablet/desktop displays it floating at the lower corner. No change to document storage or AdMob policy.
- Added a regression test for four nav entries, real scanner action, safe insets and overlay behavior.

## v0.43.2 — polished AD badges
- Premium tool tiles, tool hub and Home hero use concise **AD** badges instead of **10m / 10:00 / 10 MIN**. After reward, hero badge shows PRO. All seven localized Home descriptions omit timer marketing language.
- Actual rewarded unlock remains ten minutes, disclosed clearly inside the opt-in video dialog. No change to AdMob test IDs, ad frequency, consent, or scanner behavior.

## v0.43.3 — reserve Premium/PRO for a future paid offer
- Ad-funded tools and the unlock card have **AD** before watching a video, **ON** when access is active; toolbar badge is AD, not PRO. The Tools navigation uses a grid icon rather than a paid-subscription crown.
- Visible scan-filter labels Paper Scan, Book Scan and PerfectScan drop misleading Pro branding. The actual filtering, rewarded 10-minute access window, consent and documents are unchanged.
- This is not a paid subscription. Do not show Premium/PRO branding unless a real premium subscription product is launched and its purchase/entitlement flow is implemented.

## v0.43.4 — compact advanced AI drawer and lower full-circle scan FAB
- Replaces oversized home AI/ad hero with a 57px compact turquoise AI control. Its accessible tap-to-expand details preserve ad choice, real rewarded-video activation and unlocked state; header AD shortcut opens the same drawer rather than firing a video unexpectedly.
- The mobile navigation retains four real tabs with a new central 76px empty notch, and the distinct 70px camera FAB is moved down to 26px above Android's bottom safe inset. Full circular border, camera icon and click area remain visible; no overlap with Home/Documents/Tools/Me tabs.
- The FAB still hides on selection and modal overlays, the scanner action remains native, saved files are untouched, and no Premium/PRO purchase branding is added.

## v0.43.5 — concise ADS labels
- All ad-funded tool badges, toolbar and compact AI drawer use **ADS** rather than AD or a timer label.
- Opt-in rewarded video CTA uses **ADS** across seven dashboard languages and three ad dialog languages. The dialog body discloses the actual ten-minute reward before viewing; no misleading countdown badges remain.
- Reward duration, consent, actual SDK reward callback, navigation and existing document storage unchanged.

## v0.44.0 — Scanner-first workflow, CamScanner-inspired experience
- Original RivoScan teal identity (no competitor names, logos, art or copied design).
- Prioritizes four working scan modes: Document (native Google ML Kit with fallback), ID, Book (ADS gate) and Gallery import.
- Recent saved documents moved above advanced tools and displayed as compact one-row entries, with actual local file counts, search and All/PDF/Images navigation to filtered Documents.
- Nine extended tools remain inside collapsed More tools; the full Tools screen remains available. The small AI/ADS drawer and visible, centered camera FAB remain unchanged.
- Documents, share, PDF creation and local storage remain preserved; no fake cloud sync features or unsupported OCR claims.

## v0.44.1 — Real previews in Recent and Documents
- Adds Android RivoDocuments.getThumbnail() restricted to verified RivoScan/legacy RivoScan folders. Uses PdfRenderer for the **first page only**, sampled image decode plus EXIF rotation, downsizes to at most 220px and exports only small JPEG preview bytes, off the main/UI thread.
- WebView requests images lazily as they enter view, at most 2 native thumbnail calls in parallel, 64 cache entries, with file-type icon fallback on errors. Prevents pulling full 16MB PDF source into Home and does not touch source bytes or their metadata.
- Real previews work on Recent and Documents lists without claiming any fake imagery or a cloud sync feature. Existing AD/ADS choices, floating camera and stored documents remain unchanged.

## v0.44.2 — Consistent offline document search and filters
- Both Home and Documents now use the same local filename matcher. French/Latin accents and Arabic vowel marks/tatweel are ignored for searching only; original filenames and stored files are untouched.
- PDF and image chips now detect common file extensions even when Android reports an empty/generic MIME type, matching the existing document-type icons and real thumbnails.
- Added tests for accented French, Arabic harakat, missing MIME types, mixed-case extensions, safe null values, and shared matcher usage. No new permissions, ads, data migrations or document deletion.

## v0.44.3 — Safe ID-card and multipage capture flow
- A document scan session now locks its mode after the first saved page. Switching between Document, ID Card and Whiteboard cannot reinterpret previously saved pages.
- ID Card mode cannot accidentally switch to Single capture. On finishing with only the front side, users can continue capturing the back or explicitly export the single saved side; neither action deletes existing pages.
- Added source-level regression tests for page preservation and mode guards. Native build/emulator checks are required to validate the actual Android interaction.

## v0.44.4 — Safer multipage rotation and consistent scanner design
- The native Manage Pages screen now uses RivoScan turquoise rather than unrelated dark blue.
- Rotating pages now decodes a sampled bitmap (long edge ≤3600px, estimated pixels ≤12MP) instead of loading a full-resolution 50MP+ photo into memory; originals and published copies remain untouched. This may reduce rotation output resolution for very large photos, a deliberate tradeoff to avoid out-of-memory crashes.
- If the scanner Activity closes while a page-edit thread is finishing, newly generated temporary rotated files are deleted rather than orphaned. CI source guards and regression tests added.

## 0.44.5 — live document counts and thumbnails
- After saving/scanning, batch edits, search and expansion, the Home file list and the All/PDF/Images counters now refresh together without resetting the search query, current selection or view.
- Real local PDF/photo thumbnails are rehydrated for the updated rows (lazy/size-limited); original documents are unchanged.
- The scanner-first workflow, AD labels, 4 bottom tabs and center floating camera remain unchanged. Added regression coverage.

## 0.44.6 — faster local multilingual filename search
- Search across Home and Documents now treats filename punctuation, underscores, and hyphens as word separators; multiple search terms match regardless of order (e.g. `client invoice` finds `Invoice_2026-11_client.pdf`).
- Arabic Alef/Hamza spelling variants are folded for search only. Saved names, PDFs, and document contents are never modified; no cloud or OCR indexing is introduced.
- Added regression tests for Arabic spelling, French accent handling, multiword filenames, and type filters. CI checks versionCode 82/versionName 0.44.6.

## RivoScan 0.44.11 — compact selection
- Removed standalone ADS header button. ADS labels remain only on ad-supported features.
- A single selected document displays compact Share, PDF, View, Delete actions in its own card, with no bottom batch tray; PDF checkboxes are visible too.
- Two or more selected files show a compact six-action bottom tray in three columns and two rows (safe-area aware), not a giant overlay. Buttons and quick-scan tools become horizontal rounded rectangles; centered camera FAB stays round.

## 0.44.12 — safe production AdMob build path (not enabled without publisher IDs)
- Default debug, automated CI and Play QA runs continue using official Google demo App ID and three demo ad units: NO paid impressions. Real ads are never fabricated.
- To create a production-ads AAB, configure all secrets in GitHub Actions: `RIVOSCAN_ADMOB_APP_ID` (`~` App ID), `RIVOSCAN_ADMOB_REWARDED_ID`, `RIVOSCAN_ADMOB_INTERSTITIAL_ID`, `RIVOSCAN_ADMOB_APP_OPEN_ID` (`/` ad units, same publisher), and existing Play upload signing secrets. Select **Actions → RivoScan Play candidate AAB → Run workflow → production_ads=true**. The validator fails closed if any ID is missing, malformed, mismatched or a Google demo ID.
- `apply-rivoscan-branding.ps1` writes the verified production APP ID to AndroidManifest; `monetization.js` uses production ad units only for explicit production builds. Default release candidates still use demo ads. Rewarded unlock still requires an actual rewarded video event, with consent checked before any ad. No banners.
- Updated privacy page to describe optional Google advertising and local document storage. Verify public privacy URL, Google Play Data safety, consent status, app-ads.txt and AdMob app review and test real advertising only on registered test devices before publishing. Signed AAB alone does not publish to Play Store.

### v0.44.12 corrective QA
- Reconnected all three Home file type shortcuts to open the actual filtered Documents tab after removing the header ADS shortcut. The previous legacy test expectation that PDFs were not selectable is now replaced by PDF/image parity tests.

## 0.44.13 — confirmed RivoScan production AdMob ad units
- AdMob publisher evidence (06 November 2026) confirms **Interstitial `ca-app-pub-7945572016731367/5608742752`** and **App Open `ca-app-pub-7945572016731367/6270875707`** for RivoScan, declared in `src/admob-production-ids.js`. These public identifiers are only injected when `production_ads=true`.
- Still required before enabling paid ads: **RivoScan's own actual AdMob App ID** (uses `~`); set as GitHub Actions secret `RIVOSCAN_ADMOB_APP_ID`. Never copy the App ID from NovaGrid, another app or a Google sample. The App ID is checked against the pictured publisher number.
- No RivoScan **Rewarded** ad unit was shown. It is optional: if `RIVOSCAN_ADMOB_REWARDED_ID` is absent, the production build does not show fake reward ADS badges, and ad-gated tools are temporarily FREE instead of inaccessible. Once created, set GitHub Actions secret `RIVOSCAN_ADMOB_REWARDED_ID` to enable genuine opt-in rewarded video.
- CI Play release workflow uses those two confirmed units automatically in production, while debug builds retain Google test identifiers. Production release still requires the App ID, signing key, consent policy, Play QA, app-ads.txt, and AdMob review; an AAB build does not automatically publish to Google Play.
