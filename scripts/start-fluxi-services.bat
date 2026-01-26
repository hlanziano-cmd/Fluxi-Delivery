@echo off
echo ========================================
echo   Iniciando Servicios Fluxi Delivery
echo ========================================
echo.

:: Verificar si PM2 esta corriendo
pm2 list >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] PM2 no esta corriendo, iniciando...
    pm2 resurrect
) else (
    echo [OK] PM2 ya esta corriendo
)

:: Verificar el proxy de Dyalogo
pm2 describe fluxi-dyalogo-proxy >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Proxy Dyalogo no encontrado, iniciando...
    cd /d "c:\Users\alanz\Desktop\Fluxi\Fluxi Delivery\Fluxi_New-main"
    pm2 start server/dyalogo-proxy.js --name "fluxi-dyalogo-proxy" --watch
    pm2 save
) else (
    echo [OK] Proxy Dyalogo activo
)

echo.
echo ========================================
echo   Servicios Fluxi listos
echo ========================================
pm2 status
