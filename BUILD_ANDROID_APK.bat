@echo off
setlocal
cd /d "%~dp0"
where npm >nul 2>&1 || (echo FEHLER: Node.js/npm fehlt.& exit /b 1)
where java >nul 2>&1 || (echo FEHLER: JDK fehlt.& exit /b 1)
call npm install || exit /b 1
call npm run build:mobile || exit /b 1
if not exist "android\gradlew.bat" (
  call npx cap add android || exit /b 1
)
call npx cap sync android || exit /b 1
py -3 scripts\patch_android.py || exit /b 1
cd android
call gradlew.bat assembleDebug || exit /b 1
echo APK: %CD%\app\build\outputs\apk\debug\app-debug.apk
pause
