@echo off
:: Script de inicio de servicios Fluxi Delivery
:: Usa rutas relativas - funciona en cualquier PC

cd /d "%~dp0"

:: Verificar si PM2 esta corriendo
pm2 list >nul 2>&1
if %errorlevel% neq 0 (
    pm2 resurrect 2>nul
)

:: Verificar el proxy de Dyalogo
pm2 describe fluxi-dyalogo-proxy >nul 2>&1
if %errorlevel% neq 0 (
    pm2 start server/dyalogo-proxy.js --name "fluxi-dyalogo-proxy" --watch
    pm2 save
)
