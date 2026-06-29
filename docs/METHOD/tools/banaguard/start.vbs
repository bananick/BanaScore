' BanaGuard Silent Launcher
' Runs the PowerShell watchdog hidden (no console window)
Set objShell = CreateObject("WScript.Shell")
objShell.Run "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & Replace(WScript.ScriptFullName, "start.vbs", "banaguard.ps1") & """ -Hidden", 0, False
