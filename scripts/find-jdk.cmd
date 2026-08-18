@echo off
REM ===========================================================
REM  find-jdk.cmd - Search for a usable JDK 21 on Windows
REM  Usage:  scripts\find-jdk.cmd
REM ===========================================================
setlocal enabledelayedexpansion

set "FOUND_JDK="
set "FOUND_VER="
set "_TEST_JAVA="

REM --- Common root folders that may contain a JDK ---
set "JDK_ROOTS=C:\Program Files\Java;C:\Program Files\Eclipse Adoptium;C:\Program Files\Microsoft;%LOCALAPPDATA%\Programs\Eclipse Adoptium;%LOCALAPPDATA%\Programs\Java"

for %%R in (%JDK_ROOTS%) do (
  if exist "%%~R" (
    for /d %%D in ("%%~R\jdk-21*") do (
      if not defined FOUND_JDK (
        set "_TEST_JAVA=%%~D\bin\java.exe"
        if exist "!_TEST_JAVA!" (
          "!_TEST_JAVA!" -version 2>nul
          if !errorlevel! equ 0 (
            set "FOUND_JDK=%%~D"
            for /f "usebackq tokens=3" %%v in (`"!_TEST_JAVA!" -version 2^>^&1 ^| find "version"`) do set "FOUND_VER=%%v"
          )
        )
      )
    )
  )
)

REM --- Exact fallback list for common JDK 21 paths ---
if not defined FOUND_JDK (
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
    "C:\Program Files\Eclipse Adoptium\jdk-21.0.7-hotspot"
    "C:\Program Files\Eclipse Adoptium\jdk-21.0.8-hotspot"
    "C:\Program Files\Eclipse Adoptium\jdk-21.0.9-hotspot"
    "C:\Program Files\Eclipse Adoptium\jdk-21.0.10-hotspot"
    "C:\Program Files\Eclipse Adoptium\jdk-21.0.11-hotspot"
    "C:\Program Files\Eclipse Adoptium\jdk-21.0.12-hotspot"
    "C:\Program Files\Microsoft\jdk-21"
    "%LOCALAPPDATA%\Programs\Eclipse Adoptium\jdk-21.0.12-hotspot"
  ) do (
    if not defined FOUND_JDK (
      set "_TEST_JAVA=%%~P\bin\java.exe"
      if exist "!_TEST_JAVA!" (
        "!_TEST_JAVA!" -version 2>nul
        if !errorlevel! equ 0 (
          set "FOUND_JDK=%%~P"
          for /f "usebackq tokens=3" %%v in (`"!_TEST_JAVA!" -version 2^>^&1 ^| find "version"`) do set "FOUND_VER=%%v"
        )
      )
    )
  )
)

if not defined FOUND_JDK (
  echo.
  echo [X] No usable JDK 21 found on this machine.
  echo.
  echo This project requires JDK 21 for Gradle 8.14 / Capacitor 8.
  echo JDK 17 will NOT work — it produces the error:
  echo    "error: invalid source release: 21"
  echo.
  echo Solution: Download Eclipse Temurin JDK 21 for Windows:
  echo https://adoptium.net/temurin/releases/?version=21^&os=windows
  echo.
  echo Install it, then run this script again.
  goto :eof
)

echo.
echo [OK] Usable JDK 21 found:
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
