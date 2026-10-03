param([int]$Port=8766,[string]$Instance='final-install',[switch]$KeepRunning)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$install=Join-Path $root "artifacts\$Instance"
$data=Join-Path $root "artifacts\$Instance 作业数据"
$setup=Join-Path $root 'artifacts\Setup.exe'
if(Test-Path -LiteralPath $install){throw '请使用新的独立安装目录'}
$installer=Start-Process -FilePath $setup -ArgumentList '/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/NOICONS',"/DIR=`"$install`"","/DATADIR=`"$data`"" -WindowStyle Hidden -PassThru -Wait
if($installer.ExitCode -ne 0){throw '安装失败'}
$exe=Join-Path $install 'HomeworkManager.exe'
$savedData=[IO.File]::ReadAllText((Join-Path $install 'data-dir.txt')).Trim()
if($savedData -ne $data){throw '安装程序未正确记录数据目录'}
$originalPath=$env:PATH
$env:PATH="$env:SystemRoot\System32;$env:SystemRoot"
try{$child=Start-Process -FilePath $exe -ArgumentList '--no-browser','--port',"$Port" -WindowStyle Hidden -PassThru}
finally{$env:PATH=$originalPath}
try {
  $healthy=$false
  for($i=0;$i -lt 30;$i++){
    Start-Sleep -Milliseconds 500
    if($child.HasExited){throw "安装后的程序退出：$($child.ExitCode)"}
    try{$health=Invoke-RestMethod "http://127.0.0.1:$Port/api/health/" -TimeoutSec 2; if($health.status -eq 'ok'){$healthy=$true;break}}catch{$lastFailure=$_.Exception.Message}
  }
  if(-not $healthy){throw "启动健康检查超时：$lastFailure"}
  $page=Invoke-WebRequest "http://127.0.0.1:$Port/" -UseBasicParsing
  if($page.StatusCode -ne 200){throw '页面未加载'}
  $evidence=[PSCustomObject]@{health=$health;page_status=$page.StatusCode;installed_exe=$exe;data_directory=$data;pid=$child.Id;database_exists=(Test-Path (Join-Path $data 'homework.sqlite3'));setup_sha256=(Get-FileHash -LiteralPath $setup -Algorithm SHA256).Hash;path_contains_developer_tools=$false;clean_machine=$false}
  $evidence|ConvertTo-Json -Depth 4|Set-Content -LiteralPath (Join-Path $root 'artifacts\installed-evidence.json') -Encoding utf8
  $evidence|ConvertTo-Json -Depth 4
} finally {
  # Stop only the child created by this script, never a listener discovered by port.
  if(-not $KeepRunning -and -not $child.HasExited){$child.Kill(); $child.WaitForExit()}
}
