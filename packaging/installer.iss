[Setup]
AppId={{F6682A6E-953C-41BB-B93C-02B2F7A96511}
AppName=课序 - 电子作业管理系统
AppVersion=0.1.0
LicenseFile=..\LICENSE
DefaultDirName={code:ProgramDirectory}
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

[Code]
var
  DataPage: TInputDirWizardPage;

function ProgramDirectory(Param: String): String;
begin
  if DirExists('D:\') then Result := 'D:\Apps\HomeworkManager'
  else Result := ExpandConstant('{localappdata}\Programs\HomeworkManager');
end;

procedure InitializeWizard;
var
  DefaultData: String;
begin
  DataPage := CreateInputDirPage(wpSelectDir,
    '选择作业数据目录', '数据库、报告和代码将保存在这里',
    '请选择独立于程序安装位置的目录。卸载程序不会删除作业数据。', False, '');
  DataPage.Add('数据目录');
  if DirExists('D:\') then DefaultData := 'D:\homework-data'
  else DefaultData := ExpandConstant('{localappdata}\HomeworkManager');
  DataPage.Values[0] := ExpandConstant('{param:DATADIR|' + DefaultData + '}');
end;

function NextButtonClick(CurPageID: Integer): Boolean;
var
  InstallDir, DataDir: String;
begin
  Result := True;
  if CurPageID = DataPage.ID then begin
    InstallDir := AddBackslash(Lowercase(ExpandFileName(WizardDirValue)));
    DataDir := AddBackslash(Lowercase(ExpandFileName(DataPage.Values[0])));
    if (Pos(InstallDir, DataDir) = 1) or (Pos(DataDir, InstallDir) = 1) then begin
      MsgBox('程序目录与数据目录应相互独立，请重新选择。', mbError, MB_OK);
      Result := False;
    end;
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  DataLines: TArrayOfString;
begin
  if CurStep = ssPostInstall then begin
    SetArrayLength(DataLines, 1);
    DataLines[0] := DataPage.Values[0];
    if not SaveStringsToUTF8File(ExpandConstant('{app}\data-dir.txt'), DataLines, False) then
      RaiseException('无法保存数据目录配置，请检查程序目录的写入权限。');
  end;
end;
