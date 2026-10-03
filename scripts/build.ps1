$ErrorActionPreference='Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
& npm.cmd --prefix frontend run build
if($LASTEXITCODE -ne 0){throw '前端构建失败'}
& .\.venv\Scripts\python.exe -m pytest -q
if($LASTEXITCODE -ne 0){throw '测试失败'}
