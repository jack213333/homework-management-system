param([string]$Compiler='D:\codex\.tools\inno\ISCC.exe',[switch]$SkipBuild)
$ErrorActionPreference='Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if(-not $SkipBuild){& $PSScriptRoot\build.ps1}
& .\.venv\Scripts\python.exe -m PyInstaller --noconfirm packaging\homework-manager.spec
if($LASTEXITCODE -ne 0){throw 'PyInstaller 失败'}
& $Compiler packaging\installer.iss
if($LASTEXITCODE -ne 0){throw 'Inno Setup 失败'}
