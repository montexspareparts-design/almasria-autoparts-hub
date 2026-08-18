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
set "STASH_BEFORE="
for /f %%H in ('git rev-parse -q --verify refs/stash 2^>nul') do set "STASH_BEFORE=%%H"
git stash push -u -m "android-refresh-auto-stash" || goto :fail
set "STASH_AFTER="
for /f %%H in ('git rev-parse -q --verify refs/stash 2^>nul') do set "STASH_AFTER=%%H"
set "STASH_CREATED=0"
if not "%STASH_AFTER%"=="%STASH_BEFORE%" set "STASH_CREATED=1"

echo.
echo [2/7] Pulling latest code from GitHub...
git pull --rebase || goto :pull_fail

echo.
echo [3/7] Restoring local stash (if any was created)...
if "%STASH_CREATED%"=="1" (
  git stash pop || goto :stash_conflict
) else (
  echo    No local changes needed restoring.
)

echo.
echo [4/7] Installing dependencies...
call npm install || goto :fail

echo.
echo [5/7] Cleaning old build output...
if exist dist rmdir /s /q dist
if exist android\app\src\main\assets\public rmdir /s /q android\app\src\main\assets\public

echo.
echo [6/7] Building web app...
call npm run build || goto :fail

echo.
echo [7/7] Syncing Capacitor (android)...
call npx cap sync android || goto :fail

echo.
echo [BUILD] Detecting a working JDK 21 for Gradle...
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

:pull_fail
echo.
echo [X] Git pull failed.
if "%STASH_CREATED%"=="1" (
  echo Restoring your local changes...
  git stash pop
)
goto :fail

:stash_conflict
echo.
echo [X] Git updated successfully, but your local changes conflict with it.
echo Your work is preserved. Resolve the files marked by Git, then run this script again.
goto :fail

:fail
echo.
echo *** FAILED at the step above. Fix the error and re-run. ***
exit /b 1
