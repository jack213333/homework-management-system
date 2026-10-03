param([int]$Port=8844)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$pidFile=Join-Path $root '.superpowers\sdd\2026-10-03-homework-management\qa-pid.txt'
if(Test-Path -LiteralPath $pidFile){
  $ownedId=[int](Get-Content -LiteralPath $pidFile)
  $processes=Get-CimInstance Win32_Process -Filter "Name='python.exe'"
  $owned=$processes | Where-Object {($_.ProcessId -eq $ownedId -or $_.ParentProcessId -eq $ownedId) -and $_.CommandLine -like '*desktop.launcher*' -and $_.CommandLine -like "*$Port*" -and ($_.ExecutablePath -like "$root\.venv\*" -or $_.ExecutablePath -like 'D:\uv\python\*')}
  foreach($item in ($owned | Sort-Object ParentProcessId -Descending)){
    $p=Get-Process -Id $item.ProcessId -ErrorAction SilentlyContinue
    if($p){try{$p.Kill()}catch{if(-not $p.HasExited){throw}}}
  }
}
New-Item -ItemType Directory -Force -Path "$root\artifacts" | Out-Null
$child=Start-Process -FilePath "$root\.venv\Scripts\python.exe" -ArgumentList '-m','desktop.launcher','--no-browser','--port',"$Port",'--data-dir','data' -WorkingDirectory $root -WindowStyle Hidden -PassThru -RedirectStandardOutput "$root\artifacts\server-qa.log" -RedirectStandardError "$root\artifacts\server-qa-error.log"
Set-Content -LiteralPath $pidFile -Value $child.Id
Write-Output "QA service started: PID $($child.Id), port $Port"
