# RivoScan 0.45.8 Play Release + AdMob
RivoScan package: com.ribhlab.rivoscan; versionCode 112. The normal compact debug APK uses Google demo ads only.
The production workflow is .github/workflows/rivoscan-play-signed-release.yml. It requires real AdMob IDs and a private upload key, never embeds them into Git history.

## GitHub Actions repository secrets
Open Settings > Secrets and variables > Actions > New repository secret and create:
- RIVO_ADMOB_APP_ID — true RivoScan Android AdMob App ID, format ca-app-pub-...~...
- RIVO_ADMOB_INTERSTITIAL_ID — true RivoScan interstitial unit, format ca-app-pub-.../...
- RIVO_ADMOB_APP_OPEN_ID — optional real App Open unit; leave empty to disable.
- RIVO_UPLOAD_KEYSTORE_BASE64 — base64 of the original PKCS12 upload keystore, kept PRIVATE.
- RIVO_UPLOAD_STORE_PASSWORD — password for the keystore.
- RIVO_UPLOAD_KEY_PASSWORD — password for the private signing key.
- RIVO_UPLOAD_KEY_ALIAS — key0 for the supplied file, unless verified otherwise.

On your Windows PowerShell, use this to obtain the PRIVATE keystore base64, then store it only in the encrypted GitHub Secret (never in chat or a git commit):
[Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path '.\\keynovagrid')))

GitHub > Actions > RivoScan signed Play AAB with live AdMob > Run workflow. On success, download the RivoScan-0.45.8-signed-Play-AAB artifact and upload the contained app-release.aab to the Play Console testing track.

## Play/AdMob prerequisites
Before publishing, verify that the upload certificate matches the existing RivoScan Play Console upload key (if any). Uploading the NovaGrid key is safe only if the RivoScan entry is new or its accepted upload certificate matches; otherwise use the Play Console upload-key reset procedure.
Publish a verified public privacy-policy URL and complete Play Data Safety plus Ads disclosure. Configure a developer website on the Play listing and publish app-ads.txt at its domain root with your AdMob publisher ID. Test on a registered AdMob test device; never generate invalid ad traffic.

The workflow intentionally fails if genuine AdMob identifiers or key passwords are missing.
