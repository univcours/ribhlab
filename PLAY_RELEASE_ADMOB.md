# RivoScan 0.45.8 Play Release + AdMob
RivoScan package: com.ribhlab.rivoscan; versionCode 112. The normal compact debug APK uses Google demo ads only.
The production workflow is .github/workflows/rivoscan-play-signed-release.yml. It requires real AdMob IDs and a private upload key, never embeds them into Git history.

## GitHub Actions repository secrets
Open Settings > Secrets and variables > Actions > New repository secret and create:
- AdMob Android app ID is public and configured: ca-app-pub-7945572016731367~1509328607. No RIVO_ADMOB_APP_ID GitHub Secret is required.
- Interstitial unit is public and already set to ca-app-pub-7945572016731367/5608742752.
- App Open unit is public and already set to ca-app-pub-7945572016731367/6270875707.
- RIVO_UPLOAD_KEYSTORE_BASE64 — base64 of the original PKCS12 upload keystore, kept PRIVATE.
- The existing GitHub Secret PASSEKEY contains the PKCS12 store password; never print its value.
- The existing GitHub Secret PASSEKEY is also used as the private-key password (typical PKCS12 behavior).
- RIVO_UPLOAD_KEY_ALIAS — key0 for the supplied file, unless verified otherwise.

On your Windows PowerShell, use this to obtain the PRIVATE keystore base64, then store it only in the encrypted GitHub Secret (never in chat or a git commit):
[Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path '.\\keynovagrid')))

GitHub > Actions > RivoScan signed Play AAB with live AdMob > Run workflow. On success, download the RivoScan-0.45.8-signed-Play-AAB artifact and upload the contained app-release.aab to the Play Console testing track.

## Play/AdMob prerequisites
Before publishing, verify that the upload certificate matches the existing RivoScan Play Console upload key (if any). Uploading the NovaGrid key is safe only if the RivoScan entry is new or its accepted upload certificate matches; otherwise use the Play Console upload-key reset procedure.
Publish a verified public privacy-policy URL and complete Play Data Safety plus Ads disclosure. Configure a developer website on the Play listing and publish app-ads.txt at its domain root with your AdMob publisher ID. Test on a registered AdMob test device; never generate invalid ad traffic.

The workflow intentionally fails if genuine AdMob identifiers or key passwords are missing.

The RivoScan-specific AdMob App ID has been verified from the supplied AdMob App Settings screenshot: ca-app-pub-7945572016731367~1509328607. Never reuse NovaGrid's AdMob App ID for this app. GitHub needs the uploaded keystore's base64 bytes in RIVO_UPLOAD_KEYSTORE_BASE64 before signing; password alone is insufficient.
Rewarded ad unit ca-app-pub-7945572016731367/4148993879 is known but will not be displayed until an opt-in rewarded feature is implemented.
