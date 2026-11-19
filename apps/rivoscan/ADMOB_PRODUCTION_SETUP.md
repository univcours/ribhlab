# RivoScan real AdMob setup (2026-11-19)

The original RivoScan Android AdMob identifiers are restored from the repository's
2026-11-06 publisher screenshot / 2026-11-07 verified source on
feat/rivoscan-play-release-qa-20261107 (src/admob-production-ids.js).
These are NOT the IDs for TradingFiew, NovaGrid or another app.

AAB release workflow now sets the verified RivoScan Android App ID, Interstitial
and App Open IDs automatically from src/admob-production-ids.js, using
scripts/write-admob-production-env.mjs. Production is always true for this
release-only AAB job, and both build-time config and Android Manifest are
validated. Debug APKs stay on Google SAMPLE IDs. No banner, no surprise rewarded
paywall. The archived Rewarded ID is retained for possible future opt-in use,
but no rewarded ad is enabled by this change.

Play production still needs upload-signing GitHub Secrets:
RIVOSCAN_PLAY_KEYSTORE_B64, RIVOSCAN_PLAY_KEY_ALIAS,
RIVOSCAN_PLAY_STORE_PASSWORD and RIVOSCAN_PLAY_KEY_PASSWORD.
If any are unavailable, the workflow produces an UNSIGNED AAB for inspection
only. It does not publish to Google Play.

Before rollout, verify AdMob ownership and linking to com.ribhlab.rivoscan,
app-ads.txt, privacy/UMP consent, test-device ad requests, Play data safety,
and a Play versionCode higher than the currently published version.
Never click your own production ads. A successful build does not guarantee ads
will serve or generate revenue.
