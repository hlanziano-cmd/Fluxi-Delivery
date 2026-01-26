Set WshShell = CreateObject("WScript.Shell")
strStartup = WshShell.SpecialFolders("Startup")
Set oShortcut = WshShell.CreateShortcut(strStartup & "\Fluxi-Services.lnk")
oShortcut.TargetPath = "C:\Users\alanz\Desktop\Fluxi\Fluxi Delivery\Fluxi_New-main\scripts\start-fluxi-services.bat"
oShortcut.WorkingDirectory = "C:\Users\alanz\Desktop\Fluxi\Fluxi Delivery\Fluxi_New-main"
oShortcut.WindowStyle = 7
oShortcut.Save
WScript.Echo "Acceso directo creado en: " & strStartup & "\Fluxi-Services.lnk"
