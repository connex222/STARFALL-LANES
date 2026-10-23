@echo off
cd /d "%~dp0"
echo STARFALL LANES - Premium Sound Installer
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-Premium-Audio.ps1"
if errorlevel 1 (
 echo No files have been replaced unless all nine downloads were validated.
 echo If the links expire, use locally saved MP3s with tools\download_mirelo_audio.py --source-dir.
) else (
 echo Audio installed. Upload or redeploy this entire updated game folder for the live game.
)
echo.
pause
