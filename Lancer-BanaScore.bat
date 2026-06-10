@echo off
chcp 65001 >nul
title BanaScore
cd /d "%~dp0"

echo ============================================
echo    Demarrage de BanaScore...
echo ============================================
echo.

rem Installe les dependances au premier lancement uniquement.
if not exist "node_modules" (
  echo Premier lancement : installation des composants ^(quelques minutes^)...
  call npm install
  if errorlevel 1 (
    echo.
    echo ERREUR pendant l'installation. Verifiez que Node.js est installe ^(https://nodejs.org^).
    pause
    exit /b 1
  )
)

rem Construit + lance le serveur, ouvre la page QR automatiquement.
call npm start

echo.
echo BanaScore s'est arrete. Vous pouvez fermer cette fenetre.
pause
