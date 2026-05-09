$ErrorActionPreference = "Stop"

"[1/2] Install dependencies"
npm install
if (-not $?) { throw "npm install failed" }

"[2/2] Build app"
npm run build
if (-not $?) { throw "npm run build failed" }

"Preflight OK"
