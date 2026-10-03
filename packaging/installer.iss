[Setup]
AppId={{F6682A6E-953C-41BB-B93C-02B2F7A96511}
AppName=课序 - 电子作业管理系统
AppVersion=0.1.0
DefaultDirName={autopf}\HomeworkManager
DefaultGroupName=课序
PrivilegesRequired=lowest
OutputDir=..\artifacts
OutputBaseFilename=Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayIcon={app}\HomeworkManager.exe
[Files]
Source: "..\dist\HomeworkManager\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
[Icons]
Name: "{group}\课序"; Filename: "{app}\HomeworkManager.exe"
Name: "{autodesktop}\课序"; Filename: "{app}\HomeworkManager.exe"
[Run]
Filename: "{app}\HomeworkManager.exe"; Description: "启动课序"; Flags: nowait postinstall skipifsilent
