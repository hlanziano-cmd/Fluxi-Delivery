' Script para configurar inicio automatico de Fluxi
' Funciona en cualquier PC - usa rutas relativas

Dim WshShell, strStartup, oShortcut, strScriptPath, strFluxiDir

Set WshShell = CreateObject("WScript.Shell")

' Obtener directorio del script (carpeta scripts)
strScriptPath = WScript.ScriptFullName
strFluxiDir = Left(strScriptPath, InStrRev(strScriptPath, "\") - 1)
strFluxiDir = Left(strFluxiDir, InStrRev(strFluxiDir, "\") - 1)

' Obtener carpeta de inicio de Windows
strStartup = WshShell.SpecialFolders("Startup")

' Crear acceso directo
Set oShortcut = WshShell.CreateShortcut(strStartup & "\Fluxi-Services.lnk")
oShortcut.TargetPath = strFluxiDir & "\start-services.bat"
oShortcut.WorkingDirectory = strFluxiDir
oShortcut.WindowStyle = 7  ' Minimizado
oShortcut.Description = "Inicia los servicios de Fluxi Delivery"
oShortcut.Save

WScript.Echo "Inicio automatico configurado correctamente." & vbCrLf & _
             "Ubicacion: " & strStartup & "\Fluxi-Services.lnk" & vbCrLf & _
             "Carpeta Fluxi: " & strFluxiDir
