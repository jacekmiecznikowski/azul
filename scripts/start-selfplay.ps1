# ASCII-only so Windows PowerShell 5.1 reads the file correctly without UTF-8 BOM.
# Start headless self-play in a hidden, below-normal-priority Node process.
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root
$folder = Join-Path $root 'reports\selfplay'
New-Item -ItemType Directory -Force -Path $folder | Out-Null
$pidFile = Join-Path $folder 'process.pid'
if (Test-Path $pidFile) {
  $previous = Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1
  $previousId = 0
  if ([int]::TryParse([string]$previous, [ref]$previousId) -and $previousId -gt 0) {
    $running = Get-Process -Id $previousId -ErrorAction SilentlyContinue
    if ($running -and $running.ProcessName -match 'node') {
      Write-Host "Trening juz dziala (PID $previousId)."
      Write-Host "Sprawdz: npm.cmd run learn:status"
      exit 0
    }
  }
}
Write-Host 'Kompilowanie silnika (bez opoznien animacyjnych)...'
& node scripts/compileTraining.cjs
if ($LASTEXITCODE -ne 0) { throw 'Nie udalo sie skompilowac silnika treningowego.' }
$node = (Get-Command node -ErrorAction Stop).Source
$log = Join-Path $folder 'training.log'
$errors = Join-Path $folder 'training-errors.log'
$proc = Start-Process -FilePath $node -ArgumentList @('scripts/learnSelfPlay.cjs','--forever') -WorkingDirectory $root -WindowStyle Hidden -PassThru -RedirectStandardOutput $log -RedirectStandardError $errors
try { $proc.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::BelowNormal } catch {}
Write-Host "Trening uruchomiony w tle. PID: $($proc.Id)"
Write-Host 'Sprawdz postep: npm.cmd run learn:status'
Write-Host 'Zatrzymaj: npm.cmd run learn:stop'
Write-Host 'Log: reports\selfplay\training.log'
