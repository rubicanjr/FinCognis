param(
  [string]$InstallDir = "$env:LOCALAPPDATA\Programs\render-cli"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $InstallDir)) {
  New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

$releaseUrl = "https://api.github.com/repos/render-oss/cli/releases/latest"
$release = Invoke-RestMethod -Uri $releaseUrl -Headers @{ "User-Agent" = "render-cli-installer" }

$asset = $release.assets | Where-Object { $_.name -match "windows_amd64\.zip$" } | Select-Object -First 1
if (-not $asset) {
  throw "Windows amd64 asset not found in latest release."
}

$zipPath = Join-Path $InstallDir "render-cli.zip"
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zipPath
Expand-Archive -LiteralPath $zipPath -DestinationPath $InstallDir -Force

$exe = Get-ChildItem -LiteralPath $InstallDir -Filter "cli_*.exe" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $exe) {
  throw "Render CLI executable not found after extraction."
}

$targetExe = Join-Path $InstallDir "render.exe"
Copy-Item -LiteralPath $exe.FullName -Destination $targetExe -Force

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$InstallDir*") {
  setx PATH "$userPath;$InstallDir" | Out-Null
}

& $targetExe --version
"Render CLI installed at: $targetExe"
