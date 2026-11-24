# RibhMeasure — قياس المسافات والمساحة والطول

A native Android application written in Java for RibhLab. Arabic/English UI. Package ID: `com.ribhlab.ribhmeasure`.

## Actual features in v1.0.0

- **GPS Area**: record corner positions manually or collect an outdoor walking path; compute area (m²) and closed perimeter. Offline schematic line drawing, **not** a satellite map. Approximate consumer GPS only, not survey-grade.
- **GPS Distance**: route length, straight-line distance and GPS accuracy.
- **Camera measurement**: open the system camera to capture a *full-resolution* image, place four points for a known reference and target; result uses pixel-length ratio, suitable for person height or object dimensions ONLY when both are in the same depth plane. This is **not ARCore automatic depth measurement**.
- **Screen ruler**: drag endpoints, use display DPI and calibrate with an 85.60 mm ID-1 card.
- **Bubble level**: accelerometer-based tilt estimate.
- English/Arabic locale, metric/imperial display, local history and CSV export.
- AdMob **test mode by default**, UMP consent before requesting ads; ad banner on home and results, interstitial capped to one per four saved measures with a two-minute cooldown. No ad in an in-progress measurement. No children's targeting configured.

## Build

Open the directory in Android Studio (JDK 17, Android SDK 36, AGP 8.13.2, Gradle 8.13), or use:

```bash
gradle :app:testDebugUnitTest :app:assembleDebug :app:lintDebug
```

The repo's GitHub Actions workflow installs the SDK and Gradle, builds a **debug APK** and attaches it as an artifact. A debug APK is **not** a signed Google Play Store release. Release AAB requires your own signing and Play Console upload/review.

## Register a new AdMob Android app before going live

Publisher `pub-7945572016731367` is already used in RibhLab's `app-ads.txt`, but **RivoScan / NovaGrid ad units cannot be reused** as this app's own ad units. In the RibhLab AdMob account:

1. Add **RibhMeasure** as a new Android app with package `com.ribhlab.ribhmeasure`.
2. Create a banner unit and an interstitial unit specifically for this new app.
3. Configure the UMP message and link the Play Store app after it goes live.
4. Set your real IDs in your local (not committed) `~/.gradle/gradle.properties`, or pass `-P` flags to Gradle:

```properties
ADMOB_APP_ID=ca-app-pub-7945572016731367~YOUR_APP_ID
ADMOB_BANNER_ID=ca-app-pub-7945572016731367/YOUR_BANNER_ID
ADMOB_INTERSTITIAL_ID=ca-app-pub-7945572016731367/YOUR_INTERSTITIAL_ID
```

**Never invent IDs** or send production traffic to test units. Do not deploy with Google's test app ID; verify it is not present in a production build. UMP may need a working privacy policy and Google Play Data safety declarations.

## Google Play

- Suggested store title: **RibhMeasure: GPS & Camera Ruler**.
- Short English description: **Measure land area, GPS distance, object size, height and level.**
- Arabic: **قياس مساحة الأرض والمسافة والطول بالـGPS والكاميرا ومسطرة الهاتف.**
- All Android permissions have explicit user-facing uses: foreground location only for GPS capture. No background tracking, no camera permission because the system camera app performs the capture.
- Create a Play listing, verify privacy policy, add screenshots and data safety declaration (AdMob SDK data collection must be disclosed), sign an AAB and submit for Google review.

## Limitations

The device is an approximate instrument. GPS can be wrong by several meters, especially around buildings. Camera estimates cannot be precise without a same-depth reference. The ruler depends on calibration; the level depends on accelerometer calibration. Do not use this app for legal boundaries, medical measurements or safety-critical work.

## Privacy

See `PRIVACY_POLICY.md` in this project. RibhMeasure itself stores photo in the app's external cache and saved results in local SharedPreferences; users can delete history or export CSV. Ads are served by Google's SDK only after the appropriate consent procedure. Verify actual SDK data practices with current Play Console disclosures before publication.

## Sign with original RivoScan Play upload key

Release signing can be enabled only in an authorized private CI runner, using
`RIBHMEASURE_SIGNING_KEYSTORE` (absolute path to a PKCS12 keystore) and
`RIBHMEASURE_SIGNING_PASSWORD`, with alias `key0`. The automated job MUST
verify SHA1 `E9:B3:E2:77:95:75:BA:08:A9:13:72:FC:38:85:EB:A0:1D:D3:E7:3E`
before producing and distributing a bundle. This is the original RivoScan
**upload key certificate**, not necessarily its Play app-signing certificate.
Do not commit, upload, or print the private keystore or passwords.

A signed release AAB is not equivalent to Google Play publication. Register
RibhMeasure separately in Play Console and AdMob, provide real app-specific
AdMob IDs, and complete listing, consent, data-safety, and review requirements.
