@echo off
cd /d "%~dp0"

echo Pulling latest changes...
git pull origin main

echo Done.
pause