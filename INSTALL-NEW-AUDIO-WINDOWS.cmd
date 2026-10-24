@echo off
cd /d "%~dp0"
where py >nul 2>&1
if errorlevel 1 (echo Python 3 is required. Install it, then retry. & pause & exit /b 1)
where ffprobe >nul 2>&1
if errorlevel 1 (echo FFmpeg / ffprobe is required on your PATH. & pause & exit /b 1)
py -3 tools\install_plugin_audio.py
if errorlevel 1 (echo No changes were made to your original audio because a download or validation failed. & pause & exit /b 1)
py -3 tools\install_plugin_audio.py --verify
if errorlevel 1 (echo Installed audio verification failed. & pause & exit /b 1)
echo All 13 new audio recordings have been installed and checked successfully.
pause
