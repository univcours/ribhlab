# RivoScan — Android Studio + GitHub (Windows)

The RivoScan source lives in the GitHub repository **univcours/ribhlab**, currently on the branch **feat/rivoscan-android-beta** in **apps/rivoscan**. The app uses Vite + Capacitor 8. The Android native folder is generated locally; it is not yet tracked in the repository.

## Required once

- Android Studio with a compatible Android SDK: https://developer.android.com/studio
- Node.js 22 or newer: https://nodejs.org
- Git for Windows: https://git-scm.com/download/win
- Access to the GitHub account that can edit `univcours/ribhlab`.

## Get the repository from GitHub

In Android Studio Welcome screen, choose **Get from VCS** (or **File > New > Project from Version Control**) and paste:

```text
https://github.com/univcours/ribhlab.git
```

After cloning, switch to **feat/rivoscan-android-beta** using **Git > Branches** (it is not yet merged into `main`). If the IDE complains about no Gradle project in the repository root, that's expected; follow the preparation step next.

Alternatively, use a terminal:

```powershell
git clone -b feat/rivoscan-android-beta https://github.com/univcours/ribhlab.git
```

## Prepare and open RivoScan in Android Studio

In Windows Explorer, open the repository's `apps\rivoscan` folder and double-click **setup-android-studio.cmd**. This script installs npm dependencies, builds the web assets, generates the Android project when missing, synchronizes Capacitor, and attempts to open Android Studio.

Manual commands (from the repository root):

```powershell
cd apps/rivoscan
npm install
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

The `npx cap add android` command must run **only the first time**. On later runs, use `npm run build` and `npx cap sync android`. If Android Studio does not launch automatically, open **File > Open** and select **apps/rivoscan/android**.

The native Android folder must exist before opening it as a Gradle project; do not point Android Studio at `apps/rivoscan` as if it were a Gradle root.

## Edit, sync, run, commit

- Edit web features in `apps/rivoscan/src`.
- After web changes, run `npm run build` then `npx cap sync android` (or re-run `setup-android-studio.cmd`).
- In Android Studio, select an Android emulator or connected phone and press **Run**.
- When you make changes, use Android Studio **Git > Commit**, then **Git > Push** (or `git add`, `git commit`, `git push` at the repository root). Ensure the Git root is the cloned `ribhlab` repository, not a newly initialized Git repository inside `android`.
- The generated `android/` project may show as new/untracked files. Review and commit needed native project sources when you want Android Studio changes tracked; never commit local keystores, credentials, generated build directories, or `local.properties`.

## Build APK via GitHub Actions

The workflow `.github/workflows/rivoscan-android.yml` builds a **debug APK** when pushed to the feature branch, or when manually dispatched from Actions. This is not a signed production AAB. Play Console release requires additional signing and testing.

## Troubleshooting

- No `node`: install Node.js 22+ and reopen terminal/Android Studio.
- Gradle Sync error: verify Android SDK installation and run **File > Sync Project with Gradle Files** in Android Studio.
- `npx cap open android` fails to launch: use **File > Open** and select the generated `android` folder.
- New web edits don't show up: run `npm run build` followed by `npx cap sync android`.
- Branch absent: make sure you're on **feat/rivoscan-android-beta**, not `main`.
- `Git > Push` fails: sign in to GitHub through Android Studio or the system Git credential manager.

Never share GitHub tokens, Google Play service account JSON keys, or Android upload keystores in chat. GitHub access inside ChatGPT does not remotely control your locally installed Android Studio.
