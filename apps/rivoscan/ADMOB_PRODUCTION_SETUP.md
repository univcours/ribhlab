# RivoScan AdMob production setup

RivoScan's REAL AdMob application ID has not yet been verified. Never substitute a publisher ID from AdSense, a different app, Google samples, or an API key.

Set these GitHub Repository Variables in Settings > Secrets and variables > Actions > Variables:

- RIVOSCAN_ADMOB_PRODUCTION = true
- RIVOSCAN_ADMOB_APP_ID = verified Android App ID with tilde: ca-app-pub-...~...
- RIVOSCAN_ADMOB_INTERSTITIAL_ID = real Interstitial unit with slash: ca-app-pub-.../...
- RIVOSCAN_ADMOB_APP_OPEN_ID = optional real App Open unit matching the same publisher; leave blank to disable it

Never enable production without matching IDs. All ad types require UMP consent. Banner and anchor ads remain disabled; no in-content ads.

The AAB workflow will bundle with these public variables and replace the AndroidManifest App ID. Only signed AABs with validated live IDs can be considered for a Play release. Existing signing Secrets RIVOSCAN_PLAY_KEYSTORE_B64, RIVOSCAN_PLAY_KEY_ALIAS, RIVOSCAN_PLAY_STORE_PASSWORD, RIVOSCAN_PLAY_KEY_PASSWORD must also be configured. Without those, the artifact is an UNSIGNED candidate, not Play ready.

Debug and local QA builds intentionally keep sample Google IDs, not live ads. Before rollout verify Play listing linking, app-ads.txt, privacy policy, UMP, and register test devices. Never click live advertisements for testing.
