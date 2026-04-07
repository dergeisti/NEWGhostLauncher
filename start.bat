@echo off
setlocal

echo =====================================
echo   GhostClient Setup Starter
echo =====================================
echo.

:: Pruefen, ob Bun installiert ist
where bun >nul 2>nul
if %errorlevel% neq 0 (
    echo [FEHLER] Bun ist nicht installiert oder nicht im PATH!
    echo Bitte installiere Bun: https://bun.sh/
    pause
    exit /b 1
)

echo [OK] Bun gefunden.
echo.

:: Abhaengigkeiten installieren
echo [1/3] Installiere Abhaengigkeiten...
bun install
if %errorlevel% neq 0 (
    echo [FEHLER] Installation fehlgeschlagen!
    pause
    exit /b 1
)

echo [OK] Abhaengigkeiten installiert.
echo.

:: Projekt bauen
echo [2/3] Baue Projekt...
bun run build
if %errorlevel% neq 0 (
    echo [FEHLER] Build fehlgeschlagen!
    pause
    exit /b 1
)

echo [OK] Build erfolgreich.
echo.

:: Injection ausfuehren
echo [3/3] Fuehre Injection aus...
bun scripts/inject.js
if %errorlevel% neq 0 (
    echo [FEHLER] Injection fehlgeschlagen!
    pause
    exit /b 1
)

echo.
echo =====================================
echo   Fertig! Starte jetzt Discord neu.
echo =====================================
pause