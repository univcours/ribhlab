# RivoScan Google Play signing and release verification

The offline release preflight validates app ID, Android version, privacy-policy coverage, AAB structure, and optionally the upload signature. It never contacts Google or publishes anything.

## One-time signing setup (trusted Windows PC)

Requires Java JDK 21 (keytool) and GitHub CLI (gh). First authenticate with `gh auth login` as a GitHub user authorized to manage secrets for univcours/ribhlab.

Run exactly one PowerShell command inside apps/rivoscan:

- NEW app key (only if RivoScan has never registered an upload key with Play Console):
  `./setup-rivoscan-play-signing.ps1 -CreateNew`
- EXISTING app key (reuse the exact original upload keystore):
  `./setup-rivoscan-play-signing.ps1 -ExistingKeystore 'C:\\Secure\\rivoscan-upload.p12'`

The script prompts locally for a strong password and securely configures four GitHub Actions secrets:
`RIVOSCAN_PLAY_KEYSTORE_B64`, `RIVOSCAN_PLAY_KEY_ALIAS`,
`RIVOSCAN_PLAY_STORE_PASSWORD`, `RIVOSCAN_PLAY_KEY_PASSWORD`.

The script does not print the password, commit a keystore, or upload a bundle to Google Play. It supports existing keystores only when their alias key password equals the store password.

**Back up the .p12 file safely outside Git, and save its password in your password manager.** GitHub secrets are write-only; losing the original signing material may block future app updates until an upload-key reset is approved. Never send passwords or keys in chat.

## Automated checks

- `npm run check:play`: verifies RivoScan package, version coherence and privacy policy.
- `npm test`: includes release and scanning-flow tests.
- `RivoScan Play candidate AAB` GitHub workflow: compiles the bundle, checks ZIP integrity, compiled code and manifest, then verifies its signature if signing secrets exist.
- Signed artifacts are clearly named `RivoScan-SIGNED-AAB-NEEDS-PLAY-TEST`; unsigned builds remain marked `RivoScan-UNSIGNED-AAB-NOT-PLAY-READY`.

A successful check or signed AAB is **not Google Play approval**. Physical Android QA, completed Data Safety/ads disclosures and the first signed bundle upload are separate requirements. No public publication is automatic.
