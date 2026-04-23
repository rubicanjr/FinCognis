param(
  [int]$Port = 4173
)

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

Write-Host "[keepalive] FinCognis keep-alive basladi. Port=$Port"
Write-Host "[keepalive] Cikis icin pencereyi kapatin."

while ($true) {
  Write-Host "[keepalive] Server baslatiliyor..."
  powershell -NoProfile -ExecutionPolicy Bypass -File "scripts/start-local.ps1" -Port $Port
  $code = $LASTEXITCODE
  Write-Host "[keepalive] Server durdu. Cikis kodu: $code. 2 sn sonra tekrar denenecek."
  Start-Sleep -Seconds 2
}
