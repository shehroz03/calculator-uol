@echo off
echo Building Web Assets...
call npm run build
echo Syncing Capacitor...
call npx cap sync
echo Building Android APK...
cd android
call gradlew assembleDebug
echo.
echo If the build succeeded, your APK is located at:
echo android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo If it failed with JAVA_HOME error, please install Android Studio first.
pause
