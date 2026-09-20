@echo off
title Starting ClubOps AI...
echo ====================================================
echo Starting ClubOps AI (Backend + Frontend)
echo ====================================================

echo Starting Backend API on http://localhost:5000 ...
start "ClubOps AI - Backend" cmd /k "cd /d %~dp0backend && npm.cmd run dev"

echo Waiting 3 seconds for Backend to initialize...
timeout /t 3 /nobreak > nul

echo Starting Frontend on http://localhost:3000 ...
start "ClubOps AI - Frontend" cmd /k "cd /d %~dp0frontend && npm.cmd run dev"

echo ====================================================
echo App is launching!
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000
echo ====================================================
timeout /t 2 /nobreak > nul
start http://localhost:3000
