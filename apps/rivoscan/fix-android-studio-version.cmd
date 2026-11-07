@echo off
setlocal
title RivoScan - Repair Android Studio version without deleting data
cd /d "%~dp0" || exit /b 1
echo.
echo ==========================================================
echo    RivoScan Android Studio version repair
echo    Safe update - NEVER uninstall or clear documents
echo ==========================================================
echo.
echo [1/2] Rebuilding and updating the phone safely...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-rivoscan-android.ps1"
if errorlevel 1 goto :failed
echo.
echo [2/2] Verifying generated Gradle always uses RivoScan version metadata...
if not exist "android\app\build.gradle" goto :failed
findstr /c:"rivoscan-version.gradle" "android\app\build.gradle" >nul
if errorlevel 1 goto :failed
echo.
echo SUCCESS: Gradle version aligned. Your phone data was NOT deleted.
echo In Android Studio choose File ^> Sync Project with Gradle Files ONCE.
echo Then press Run (app); do NOT accept any uninstall or downgrade prompt.
exit /b 0
:failed
echo.
echo ERROR: Safe repair failed. NO uninstall was requested.
echo Close Android Studio's install dialog with Cancel and check logs above.
exit /b 1
