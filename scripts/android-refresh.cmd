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
echo [6/6] Cleaning Gradle build cache...
cd android
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
