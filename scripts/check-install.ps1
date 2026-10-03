param([int]$Port=8766)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$install=Join-Path $root 'artifacts\minimal-install'
$data=Join-Path $root 'artifacts\minimal-data'
$setup=Join-Path $root 'artifacts\Setup.exe'
if(Test-Path -LiteralPath $install){throw '请使用新的独立安装目录'}
$installer=Start-Process -FilePath $setup -ArgumentList '/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/NOICONS',"/DIR=$install" -WindowStyle Hidden -PassThru -Wait
if($installer.ExitCode -ne 0){throw '安装失败'}
$exe=Join-Path $install 'HomeworkManager.exe'
$child=Start-Process -FilePath $exe -ArgumentList '--no-browser','--data-dir',$data,'--port',"$Port" -WindowStyle Hidden -PassThru
try {
  $healthy=$false
  for($i=0;$i -lt 30;$i++){
    Start-Sleep -Milliseconds 500
    if($child.HasExited){throw "安装后的程序退出：$($child.ExitCode)"}
    try{$health=Invoke-RestMethod "http://127.0.0.1:$Port/api/health/"; if($health.status -eq 'ok'){$healthy=$true;break}}catch{}
  }
  if(-not $healthy){throw '启动健康检查超时'}
  $page=Invoke-WebRequest "http://127.0.0.1:$Port/" -UseBasicParsing
  if($page.StatusCode -ne 200){throw '页面未加载'}
  [PSCustomObject]@{health=$health;page_status=$page.StatusCode;installed_exe=$exe;database_exists=(Test-Path (Join-Path $data 'homework.sqlite3'));setup_sha256=(Get-FileHash -LiteralPath $setup -Algorithm SHA256).Hash}|ConvertTo-Json -Depth 4
} finally {
  # Stop only the child created by this script, never a listener discovered by port.
  if(-not $child.HasExited){Stop-Process -Id $child.Id; $child.WaitForExit()}
}
