@echo off
title מסע התווים - Note Quest
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo  ========================================
echo      NOTE QUEST - Loading the game...
echo  ========================================
echo.

REM --- Check Node is installed ---
where node >nul 2>nul
if errorlevel 1 (
    echo  [!] Node.js is not installed.
    echo      Please install it from https://nodejs.org  ^(LTS version^)
    echo      then double-click this file again.
    echo.
    pause
    exit /b 1
)

REM --- Install dependencies on first run ---
if not exist "node_modules" (
    echo  First run: installing dependencies. This happens only once...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo  [!] Install failed. Check your internet connection and try again.
        pause
        exit /b 1
    )
)

echo.
echo  Starting the game server...
echo  A browser window will open automatically.
echo.
echo  To STOP the game: close this black window.
echo  ========================================
echo.

REM --- Open the browser shortly after the server starts ---
start "" /b cmd /c "timeout /t 3 >nul & start http://localhost:5173/"

REM --- Run the dev server (keeps this window open) ---
call npm run dev

pause
