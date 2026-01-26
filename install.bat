@echo off
title Instalador Fluxi Delivery
color 0A

echo.
echo  ========================================
echo       INSTALADOR FLUXI DELIVERY
echo  ========================================
echo.

:: Obtener directorio actual (donde esta el script)
set "FLUXI_DIR=%~dp0"
set "FLUXI_DIR=%FLUXI_DIR:~0,-1%"

echo  [INFO] Directorio de instalacion:
echo         %FLUXI_DIR%
echo.

:: Verificar Node.js
echo  [1/5] Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js no esta instalado.
    echo          Descargalo de: https://nodejs.org
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo         Node.js %NODE_VERSION% encontrado

:: Instalar dependencias del proyecto
echo.
echo  [2/5] Instalando dependencias del proyecto...
cd /d "%FLUXI_DIR%"
call npm install >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Error instalando dependencias
    pause
    exit /b 1
)
echo         Dependencias instaladas

:: Instalar PM2 globalmente
echo.
echo  [3/5] Instalando PM2 (Process Manager)...
call npm list -g pm2 >nul 2>&1
if %errorlevel% neq 0 (
    call npm install -g pm2 >nul 2>&1
    echo         PM2 instalado
) else (
    echo         PM2 ya estaba instalado
)

:: Crear script de inicio dinamico
echo.
echo  [4/5] Configurando inicio automatico...

:: Crear el script de inicio con ruta dinamica
(
echo @echo off
echo cd /d "%%~dp0"
echo pm2 resurrect 2^>nul
echo pm2 describe fluxi-dyalogo-proxy ^>nul 2^>^&1
echo if %%errorlevel%% neq 0 ^(
echo     pm2 start server/dyalogo-proxy.js --name "fluxi-dyalogo-proxy" --watch
echo     pm2 save
echo ^)
) > "%FLUXI_DIR%\start-services.bat"

echo         Script de inicio creado

:: Crear acceso directo en Inicio de Windows
echo.
echo  [5/5] Creando acceso directo en Inicio de Windows...

:: Crear VBScript temporal para el acceso directo
(
echo Set WshShell = CreateObject^("WScript.Shell"^)
echo strStartup = WshShell.SpecialFolders^("Startup"^)
echo Set oShortcut = WshShell.CreateShortcut^(strStartup ^& "\Fluxi-Services.lnk"^)
echo oShortcut.TargetPath = "%FLUXI_DIR%\start-services.bat"
echo oShortcut.WorkingDirectory = "%FLUXI_DIR%"
echo oShortcut.WindowStyle = 7
echo oShortcut.Save
) > "%TEMP%\create_shortcut.vbs"

cscript //nologo "%TEMP%\create_shortcut.vbs" >nul 2>&1
del "%TEMP%\create_shortcut.vbs" >nul 2>&1
echo         Acceso directo creado

:: Iniciar servicios
echo.
echo  ----------------------------------------
echo  Iniciando servicios...
echo  ----------------------------------------
cd /d "%FLUXI_DIR%"
call pm2 start server/dyalogo-proxy.js --name "fluxi-dyalogo-proxy" --watch 2>nul
call pm2 save >nul 2>&1

:: Verificar estado
echo.
call pm2 status

echo.
echo  ========================================
echo       INSTALACION COMPLETADA
echo  ========================================
echo.
echo  La aplicacion esta lista para usar:
echo.
echo  1. Abre en el navegador:
echo     file:///%FLUXI_DIR:\=/%/index.html
echo.
echo  2. O inicia un servidor HTTP:
echo     cd "%FLUXI_DIR%"
echo     npx http-server -p 8000
echo     Luego abre: http://localhost:8000
echo.
echo  El proxy de Dyalogo se iniciara
echo  automaticamente con Windows.
echo.
echo  ========================================
echo.
pause
