# ASCII-only for Windows PowerShell 5.1 (UTF-8 without BOM is unsafe).
# Request a graceful stop; the Node process finishes its current training batch.
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$folder = Join-Path $root 'reports\selfplay'
$pidFile = Join-Path $folder 'process.pid'
if (!(Test-Path $pidFile)) {
  Write-Host 'Trening w tle nie jest uruchomiony.'
  exit 0
}
Set-Content -Path (Join-Path $folder 'stop.flag') -Value 'stop' -Encoding ascii
Write-Host 'Wyslano sygnal bezpiecznego zatrzymania.'
Write-Host 'Trening zapisze checkpoint po aktualnej partii i zakonczy prace.'
Write-Host 'Sprawdz: npm.cmd run learn:status'
