@echo off
setlocal
title RivoScan - Download updates and install Scanner + Logo
cd /d "%~dp0" || goto :fail

echo ==============================================
echo       RivoScan - FULL ANDROID REFRESH
echo ==============================================
echo.
where git >nul 2>nul || (echo Git not found.& goto :fail)
where npm >nul 2>nul || (echo Node.js/npm not found.& goto :fail)
set "REPO=%CD%\..\.."
for /f "delims=" %%i in ('git -C "%REPO%" branch --show-current') do set "BRANCH=%%i"
if /I not "%BRANCH%"=="feat/rivoscan-android-beta" (
  echo WRONG BRANCH: %BRANCH%
  echo Switch to feat/rivoscan-android-beta in Android Studio first.
  goto :fail
)
echo [1/6] Get the newest version from GitHub...
git -C "%REPO%" pull --ff-only origin feat/rivoscan-android-beta
if errorlevel 1 goto :fail

echo [2/6] Install Android + scanner dependencies...
call npm install --no-audit --no-fund
if errorlevel 1 goto :fail

echo [3/6] Build updated RivoScan interface...
call npm run build
if errorlevel 1 goto :fail

if not exist "android\settings.gradle" (
  echo Android project missing. Running Capacitor initialization...
  call npx cap add android
  if errorlevel 1 goto :fail
)
echo [4/6] Sync latest web app into Android...
call npx cap sync android
if errorlevel 1 goto :fail

echo [5/6] Install live document scanner and new launcher icon...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-live-scanner.ps1"
if errorlevel 1 goto :fail

echo [6/6] Check Android app branding is installed...
if not exist "android\app\src\main\res\drawable-nodpi\rivoscan_icon.png" (
  echo ERROR: Launcher icon not found.
  goto :fail
)
findstr /C:"RivoLiveScannerPlugin" "android\app\src\main\java\com\ribhlab\rivoscan\MainActivity.java" >nul
if errorlevel 1 (
  echo ERROR: Live scanner plugin not registered.
  goto :fail
)
echo.
echo SUCCESS: RivoScan source, native scanner and launcher icon updated.
echo Return to Android Studio: File - Sync Project with Gradle Files, then RUN.
echo Keep the Samsung phone connected to install the updated app.
pause
exit /b 0

:fail
echo.
echo Update was not completed. Read the error above; do not delete your files.
pause
exit /b 1
