@echo off
REM ===========================================================
REM  find-jdk.cmd - Search for a usable JDK 21 on Windows
REM  Usage:  scripts\find-jdk.cmd
REM ===========================================================
setlocal

set "FOUND_JDK="
REM Keep every wildcard quoted. Unquoted "Program Files" paths are parsed as
REM commands by cmd.exe and caused the previous 'C:\Program' error.
for /d %%D in (
  "C:\Program Files\Eclipse Adoptium\jdk-21*"
  "C:\Program Files\Java\jdk-21*"
  "C:\Program Files\Microsoft\jdk-21*"
  "%LOCALAPPDATA%\Programs\Eclipse Adoptium\jdk-21*"
  "%LOCALAPPDATA%\Programs\Java\jdk-21*"
) do if not defined FOUND_JDK if exist "%%~fD\bin\java.exe" set "FOUND_JDK=%%~fD"

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
echo.
echo To build with this JDK, run:
echo.
echo    set "JAVA_HOME=%FOUND_JDK%"
echo    set "PATH=%%JAVA_HOME%%\bin;%%PATH%%"
echo    cd android
echo    gradlew.bat clean bundleRelease
echo.

endlocal
