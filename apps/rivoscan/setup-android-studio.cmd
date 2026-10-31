@echo off
setlocal
title RivoScan - Android Studio Setup

cd /d "%~dp0" || goto :fail
echo.
echo ===============================================
echo   RivoScan - Setup for Android Studio (Windows)
echo ===============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed. Install Node.js 22 or later from https://nodejs.org
  goto :fail
)
where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm is missing. Reinstall Node.js from https://nodejs.org
  goto :fail
)

echo [1/4] Installing dependencies...
call npm install --no-audit --no-fund
if errorlevel 1 goto :fail

echo [2/4] Building the web assets...
call npm run build
if errorlevel 1 goto :fail

if not exist "android\settings.gradle" (
  echo [3/4] Creating Android native project...
  call npx cap add android
  if errorlevel 1 goto :fail
) else (
  echo [3/4] Existing Android project detected.
)

echo [4/4] Syncing web assets and plugins...
call npx cap sync android
if errorlevel 1 goto :fail

echo.
echo SUCCESS: Android Studio project prepared.
echo Open this folder in Android Studio:
echo %CD%\android
echo.
echo Attempting to open Android Studio automatically...
call npx cap open android
if errorlevel 1 (
  echo Automatic launch unavailable. Open Android Studio manually:
  echo File - Open - select %CD%\android
)
echo.
echo The Git repository remains linked to the GitHub remote.
echo Use Git - Commit / Push in Android Studio (or git commands).
pause
exit /b 0

:fail
echo.
echo Setup stopped. Review the error above; no existing project was deleted.
pause
exit /b 1
