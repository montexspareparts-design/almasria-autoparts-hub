@echo off
REM ===========================================================
REM  find-jdk.cmd - Search for a usable JDK 21/17 on Windows
REM  Usage:  scripts\find-jdk.cmd
REM ===========================================================
setlocal enabledelayedexpansion

set "FOUND_JDK="
set "FOUND_VER="

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
  "C:\Program Files\Android\Android Studio\jbr"
  "%LOCALAPPDATA%\Programs\Android Studio\jbr"
) do (
  if exist "%%~P\bin\java.exe" (
    "%%~P\bin\java.exe" -version 2>nul
    if !errorlevel! equ 0 (
      if not defined FOUND_JDK (
        set "FOUND_JDK=%%~P"
        for /f "usebackq tokens=3" %%v in (`"%%~P\bin\java.exe" -version 2^>^&1 ^| find "version"`) do set "FOUND_VER=%%v"
      )
    )
  )
)

if not defined FOUND_JDK (
  echo.
  echo [X] No usable JDK found on this machine.
  echo.
  echo Solution: Download Eclipse Temurin JDK 21 for Windows:
  echo https://adoptium.net/temurin/releases/?version=21^&os=windows
  echo.
  echo Install it, then run this script again.
  goto :eof
)

echo.
echo [OK] Usable JDK found:
echo    Path: %FOUND_JDK%
echo    Version: %FOUND_VER%
echo.
echo To build with this JDK, run:
echo.
echo    set "JAVA_HOME=%FOUND_JDK%"
echo    set "PATH=%%JAVA_HOME%%\bin;%%PATH%%"
echo    cd android
echo    gradlew.bat clean bundleRelease
echo.

endlocal
