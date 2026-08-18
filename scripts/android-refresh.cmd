@echo off
REM ===========================================================
REM  ALMASRIA GROUP - Android full refresh (one command)
REM  Usage:  scripts\android-refresh.cmd
REM  Guarantees Android Studio runs the LATEST web build.
REM ===========================================================
setlocal

cd /d "%~dp0.."

echo.
echo [1/6] Pulling latest code from GitHub...
git pull --rebase || goto :fail

echo.
echo [2/6] Installing dependencies...
call npm install || goto :fail

echo.
echo [3/6] Cleaning old build output...
if exist dist rmdir /s /q dist
if exist android\app\src\main\assets\public rmdir /s /q android\app\src\main\assets\public

echo.
echo [4/6] Building web app...
call npm run build || goto :fail

echo.
echo [5/6] Syncing Capacitor (android)...
call npx cap sync android || goto :fail

echo.
echo [6/6] Detecting a working JDK for Gradle...
REM Find any valid JDK 21 or 17 installation on this machine.
REM Order matters: 21 preferred, then 17 (both work with Gradle 8.14).
set "FOUND_JDK="
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
  "C:\Program Files\Microsoft\jdk-21"
  "C:\Program Files\Java\jdk-17"
  "C:\Program Files\Java\jdk-17.0.0"
  "C:\Program Files\Eclipse Adoptium\jdk-17.0.0-hotspot"
  "C:\Program Files\Eclipse Adoptium\jdk-17.0.1-hotspot"
  "C:\Program Files\Eclipse Adoptium\jdk-17.0.2-hotspot"
  "C:\Program Files\Eclipse Adoptium\jdk-17.0.3-hotspot"
  "C:\Program Files\Eclipse Adoptium\jdk-17.0.4-hotspot"
  "C:\Program Files\Eclipse Adoptium\jdk-17.0.5-hotspot"
  "C:\Program Files\Eclipse Adoptium\jdk-17.0.6-hotspot"
  "C:\Program Files\Microsoft\jdk-17"
) do (
  if not defined FOUND_JDK (
    if exist "%%~P\bin\java.exe" (
      set "FOUND_JDK=%%~P"
    )
  )
)

if not defined FOUND_JDK (
  echo    [X] No JDK 21 or 17 found in the usual Windows locations.
  echo.
  echo    Please install Eclipse Temurin JDK 21 from:
  echo    https://adoptium.net/temurin/releases/?version=21^&os=windows
  echo.
  echo    Or if you already have JDK 21/17 elsewhere, run the build with:
  echo    set "JAVA_HOME=C:\Path\To\Your\jdk-21" ^&^& gradlew.bat bundleRelease
  echo.
  echo    The Android Studio bundled JBR may not work with this Gradle version.
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
