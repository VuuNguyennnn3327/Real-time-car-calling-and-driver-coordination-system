' GoRide Silent Background Launcher
' Runs start_backend.bat in hidden window mode (0)
Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")
ScriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)

WshShell.CurrentDirectory = ScriptDir
WshShell.Run "cmd /c start_backend.bat", 0, False
Set WshShell = Nothing
Set FSO = Nothing
