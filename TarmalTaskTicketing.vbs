Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
appDir = fso.GetParentFolderName(WScript.ScriptFullName)

exePath = appDir & "\TarmalITPortal.exe"
nodeServer = appDir & "\launcher\server.js"

If fso.FileExists(exePath) Then
  shell.Run """" & exePath & """", 1, False
ElseIf fso.FileExists(nodeServer) Then
  shell.Run "cmd /c node """ & nodeServer & """", 1, False
Else
  shell.Run "powershell.exe -ExecutionPolicy Bypass -File """ & appDir & "\start-network-server.ps1""", 1, False
End If
