# RivoScan — standalone Android scanner
This branch is a self-contained, **root-level source export** of the app formerly in `apps/rivoscan/` on the monorepo branch.
It is **not yet a separate private repository**. The GitHub connector in this chat can update existing repositories but cannot create a new one.
It does not remove source from the original public repository.

## New private repository import
1. Download only this branch's ZIP and extract it.
2. Create a new **Private** repository in your GitHub account (suggested name `rivoscan-android`).
3. Import the extracted files at the repository root, starting from a fresh history (this excludes the other monorepo projects' git history).
4. Verify the CI workflow and Android debug APK compile before deleting anything from the old public repository.

## Build and checks
```sh
npm install
npm run check
npm test
npm run build
npx cap add android
npx cap sync android
```
Android native scanner registration and branding are described in `install-live-scanner.ps1` and `apply-rivoscan-branding.ps1` (PowerShell).
This repository contains source only; do not commit secret keystores or AdMob credentials.
