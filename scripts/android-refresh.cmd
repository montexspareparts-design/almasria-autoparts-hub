@echo off
REM ===========================================================
REM  ALMASRIA GROUP - Android full refresh (one command)
REM  Usage:  scripts\android-refresh.cmd
REM  Guarantees Android Studio runs the LATEST web build.
REM ===========================================================
setlocal

cd /d "%~dp0.."

echo.
echo [1/7] Stashing any local changes so we can pull cleanly...
git stash push -u -m "android-refresh-auto-stash" || goto :fail

echo.
echo [2/7] Pulling latest code from GitHub...
git pull --rebase || goto :restore_fail

echo.
echo [3/7] Restoring local stash (if any was created)...
git stash pop

echo.
echo [4/7] Installing dependencies...
call npm install || goto :fail

echo.
echo [5/7] Cleaning old build output...
if exist dist rmdir /s /q dist
if exist android\app\src\main\assets\public rmdir /s /q android\app\src\main\assets\public

echo.
echo [4/6] Building web app...
call npm run build || goto :fail

echo.
echo [5/6] Syncing Capacitor (android)...
call npx cap sync android || goto :fail

echo.
echo [6/6] Detecting a working JDK 21 for Gradle...
set "FOUND_JDK="

REM --- 1) Wildcard search for any JDK 21 installation ---
for /d %%P in (
  "C:\Program Files\Java\jdk-21*"
  "C:\Program Files\Eclipse Adoptium\jdk-21*"
  "C:\Program Files\Microsoft\jdk-21*"
  "%LOCALAPPDATA%\Programs\Eclipse Adoptium\jdk-21*"
) do (
  if not defined FOUND_JDK (
    if exist "%%~P\bin\java.exe" (
      set "FOUND_JDK=%%~P"
    )
  )
)

REM --- 2) Exact fallback list for known JDK 21 paths ---
for %%P in (
  "C:\Program Files\Java\jdk-21"
  "C:\Program Files\Java\jdk-21.0.0"
  "C:\Program Files\Eclipse Adoptium\jdk-21.0.0-hotspot"
  "C:\Program Files\Eclipse Adoptium\jdk-21.0.1-hotspot"
  "C:\Program Files\Eclipse Adoptium\jdk-21.0.2-hotspot"
  "C:\Program Files\Eclipse Adoptium\jdk-21.0.3-hotspot"
  "C:\Program Files\Eclipse Adoptium\jdk-21.0.4-hotspot"
  "C:\Program Files\Eclipse Adoptium\jdk-21.0.5-hotspot"
  "C:\Program Files\Eclipse Adoptium\jdk-21.0.6-hotspot"
  "C:\Program Files\Eclipse Adoptium\jdk-21.0.12-hotspot"
  "C:\Program Files\Microsoft\jdk-21"
) do (
  if not defined FOUND_JDK (
    if exist "%%~P\bin\java.exe" (
      set "FOUND_JDK=%%~P"
    )
  )
)

if not defined FOUND_JDK (
  echo    [X] No JDK 21 found in the usual Windows locations.
  echo.
  echo    This project requires JDK 21 for Gradle 8.14 / Capacitor 8.
  echo    Please install Eclipse Temurin JDK 21 from:
  echo    https://adoptium.net/temurin/releases/?version=21^&os=windows
  echo.
  echo    Or if you already have JDK 21 elsewhere, set JAVA_HOME manually:
  echo    set "JAVA_HOME=C:\Path\To\Your\jdk-21" ^&^& gradlew.bat bundleRelease
  echo.
  goto :fail
)


echo    Using JDK: %FOUND_JDK%
set "JAVA_HOME=%FOUND_JDK%"
set "PATH=%FOUND_JDK%\bin;%PATH%"

cd android
REM Run a quick Gradle clean to verify the JDK actually works
call gradlew.bat --version ^>nul 2^>^&1
if errorlevel 1 (
  echo    [X] JDK found at %FOUND_JDK% but Gradle refused it. It may be 32-bit or corrupt.
  goto :fail
)

echo    Running Gradle clean...
call gradlew.bat clean
cd ..


echo.
echo ===========================================================
echo  DONE. Now press Run in Android Studio.
echo  If the old UI still shows: uninstall the app from the
echo  phone first, then Run again.
echo ===========================================================
goto :eof

:fail
echo.
echo *** FAILED at the step above. Fix the error and re-run. ***
exit /b 1
