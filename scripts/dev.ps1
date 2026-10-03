$ErrorActionPreference='Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$env:UV_CACHE_DIR='D:\codex\.cache\homework-uv'
$env:UV_PYTHON_INSTALL_DIR='D:\uv\python'
& .\.venv\Scripts\python.exe -m desktop.launcher
