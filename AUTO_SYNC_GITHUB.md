# RivoScan: GitHub updates appear automatically in Android Studio

**One-time activation for Windows** (for the branch `feat/rivoscan-android-beta`):

1. Open the `ribhlab` repository in Android Studio, check the branch is `feat/rivoscan-android-beta`.
2. Once, use Android Studio **Git > Pull** to get the latest files (you must do this once because the auto-sync files were just added).
3. In Windows Explorer open `ribhlab\apps\rivoscan`.
4. Double-click **start-rivoscan-autosync.cmd**. Leave its PowerShell window running.
5. Optional: double-click **enable-rivoscan-autostart.cmd** to start the watcher whenever you sign in to Windows. To disable this later, run **disable-rivoscan-autostart.cmd** and close the watcher window.

The watcher checks the GitHub branch every **90 seconds**. When an update is available, it only fast-forwards the branch if your tracked local files are unchanged (no overwriting or forced reset). If app code changed, it runs `npm run build` and `npx cap sync android`; it runs `npm install` first when dependencies changed. The native Android project must already exist (run `setup-android-studio.cmd` once).

### What updates automatically?

- GitHub sources under the `feat/rivoscan-android-beta` branch appear in your local Android Studio project.
- Web UI / PDF tools are built and synchronized into `apps/rivoscan/android`.
- **A running app on an emulator/phone is NOT automatically reinstalled**. Press **Run** in Android Studio to see changes on a device.
- When native dependency or Gradle settings change, Android Studio may request **Sync Project with Gradle Files**.
- The Android Studio editor normally detects changed disk files; you can use **File > Synchronize** if needed.

### Safety / troubleshooting

- The watcher skips updates when tracked local edits are present. First commit or stash them; the next poll tries again.
- It refuses a diverged branch and never uses force pull, stash, reset or pushes.
- It only follows the exact branch `feat/rivoscan-android-beta`. Updates merged to `main` alone won't appear unless also updated on this feature branch.
- It doesn't publish anything to Google Play or operate when the computer is off.
- The watcher is not part of Android Studio itself; it runs in a separate PowerShell window. Close this window or use Ctrl+C to stop.
- Do not commit keystores, service-account credentials, access tokens or personal data. A compromise of GitHub could make remote build scripts malicious, so only trust repository authors.
- If the watcher can't find `npm.cmd`, install Node.js 22+, reopen the console and try again.
- If Android Studio is running a Gradle sync or building, avoid modifying native files simultaneously; rerun a Gradle sync/build if the IDE reports an interrupted build.

Expected root directory: `C:\Users\rachi\AndroidStudioProjects\ribhlab\apps\rivoscan` on the current computer.

**Stop at sign-in:** double-click `disable-rivoscan-autostart.cmd` and close the watcher window.

See also: `ANDROID_STUDIO_GITHUB.md`.
