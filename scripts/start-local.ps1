param(
  [int]$Port = 4173,
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

Write-Host "[start-local] Proje: $projectRoot"
Write-Host "[start-local] Port: $Port"

$listeners = cmd /c "netstat -ano | findstr LISTENING | findstr :$Port"
if ($listeners) {
  $pids = @()
  foreach ($line in $listeners) {
    $parts = ($line -split "\s+") | Where-Object { $_ -ne "" }
    if ($parts.Count -ge 5) {
      $candidate = $parts[-1]
      if ($candidate -match "^\d+$") {
        $pids += [int]$candidate
      }
    }
  }

  $pids = $pids | Select-Object -Unique
  foreach ($processId in $pids) {
    try {
      $proc = Get-Process -Id $processId -ErrorAction Stop
      if ($proc.ProcessName -eq "node") {
        Write-Host "[start-local] Portu kullanan eski node sureci durduruluyor: PID=$processId"
        Stop-Process -Id $processId -Force
      } else {
        Write-Host "[start-local] Portu node disi bir surec kullaniyor: PID=$processId ($($proc.ProcessName)). Elle kapatin."
        exit 1
      }
    } catch {
      Write-Host "[start-local] PID okunamadi: $processId"
    }
  }
}

if (-not $SkipBuild) {
  Write-Host "[start-local] Next.js build baslatiliyor (guvenli mod: her acilista rebuild)..."
  cmd /c npm run build
  if ($LASTEXITCODE -ne 0) {
    Write-Host "[start-local] Build basarisiz."
    exit $LASTEXITCODE
  }
} else {
  Write-Host "[start-local] Build atlandi (SkipBuild)."
}

Write-Host "[start-local] Sunucu baslatiliyor: http://127.0.0.1:$Port/tools"
cmd /c npm run start -- -p $Port
