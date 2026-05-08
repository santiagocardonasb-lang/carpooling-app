@echo off
echo Iniciando Carpooling App...

start "Backend" cmd /k "cd /d "D:\SANTIAGO\APP CARPOOLING\backend" && node src/index.js"

timeout /t 2 /nobreak >nul

start "Frontend" cmd /k "cd /d "D:\SANTIAGO\APP CARPOOLING\frontend" && npm run dev"

timeout /t 5 /nobreak >nul

start http://localhost:3000

echo App iniciada en http://localhost:3000
