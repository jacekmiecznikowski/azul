# Request a graceful stop. The Node process saves the checkpoint at the next completed batch.
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$folder = Join-Path $root 'reports\selfplay'
if (!(Test-Path (Join-Path $folder 'process.pid'))) {
  Write-Host 'Trening w tle nie jest uruchomiony.'
  exit 0
}
Set-Content -Path (Join-Path $folder 'stop.flag') -Value 'stop' -Encoding ascii
Write-Host 'Wysłano polecenie bezpiecznego zatrzymania.'
Write-Host 'Proces zapisze checkpoint po aktualnej partii, a potem się zakończy.'
Write-Host 'Sprawdź postęp: npm.cmd run learn:status'
