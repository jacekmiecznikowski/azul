# Sintra Glass: start unlimited self-play in background, at below-normal CPU priority.
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $root
$folder = Join-Path $root 'reports\selfplay'
New-Item -ItemType Directory -Force -Path $folder | Out-Null
$pidFile = Join-Path $folder 'process.pid'
if (Test-Path $pidFile) {
  $previous = Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1
  $running = Get-Process -Id $previous -ErrorAction SilentlyContinue
  if ($running) { Write-Host "Trening już działa (PID $previous)."; exit 0 }
}
Write-Host "Przygotowuję silnik (bez animacji z przeglądarki)..."
& node scripts/compileTraining.cjs
if ($LASTEXITCODE -ne 0) { throw 'Nie udało się skompilować silnika treningowego.' }
$node = (Get-Command node).Source
$log = Join-Path $folder 'training.log'
$errors = Join-Path $folder 'training-errors.log'
$proc = Start-Process -FilePath $node -ArgumentList @('scripts/learnSelfPlay.cjs','--forever') -WorkingDirectory $root -WindowStyle Hidden -PassThru -RedirectStandardOutput $log -RedirectStandardError $errors
try { $proc.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::BelowNormal } catch {}
Write-Host "Trening uruchomiony w tle. PID: $($proc.Id)"
Write-Host "Postęp: $log"
Write-Host "Raport: reports\selfplay\strategy.md"
Write-Host "Zatrzymanie: npm.cmd run learn:stop"
