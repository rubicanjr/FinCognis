param(
  [Parameter(Mandatory = $true)]
  [string]$ServiceId,

  [int]$PollIntervalSeconds = 10,
  [int]$MaxWaitMinutes = 20,

  [string]$RenderExe = "render"
)

$ErrorActionPreference = "Stop"

function Resolve-RenderExe {
  param([string]$Candidate)
  try {
    $cmd = Get-Command $Candidate -ErrorAction Stop
    return $cmd.Source
  }
  catch {
    $fallback = "$env:LOCALAPPDATA\Programs\render-cli\render.exe"
    if (Test-Path -LiteralPath $fallback) {
      return $fallback
    }
    throw "Render CLI bulunamadı. Önce scripts/install-render-cli.ps1 çalıştırın."
  }
}

$render = Resolve-RenderExe -Candidate $RenderExe

if (-not $env:RENDER_API_KEY) {
  throw "RENDER_API_KEY ortam değişkeni tanımlı değil."
}

"Trigger deploy for service: $ServiceId"
$deployJson = & $render deploys create $ServiceId --output json --confirm
if (-not $?) { throw "Deploy trigger başarısız oldu." }

$deploy = $deployJson | ConvertFrom-Json
$deployId = $deploy.id
if (-not $deployId) {
  throw "Deploy ID parse edilemedi. Çıktı: $deployJson"
}

"Deploy started: $deployId"

$deadline = (Get-Date).AddMinutes($MaxWaitMinutes)
while ((Get-Date) -lt $deadline) {
  Start-Sleep -Seconds $PollIntervalSeconds
  $listJson = & $render deploys list $ServiceId --output json --confirm
  if (-not $?) { throw "Deploy list çağrısı başarısız oldu." }
  $list = $listJson | ConvertFrom-Json
  $current = $list | Where-Object { $_.id -eq $deployId } | Select-Object -First 1

  if (-not $current) {
    "Deploy henüz listede görünmüyor, polling devam..."
    continue
  }

  $status = "$($current.status)"
  "Deploy status: $status"

  if ($status -in @("live", "succeeded", "success")) {
    "Deploy başarılı: $deployId"
    exit 0
  }

  if ($status -in @("failed", "canceled", "cancelled")) {
    "Deploy başarısız: $deployId"
    "Son loglar alınıyor..."
    & $render logs $ServiceId --output text --confirm
    exit 1
  }
}

"Deploy timeout: $deployId"
exit 2
