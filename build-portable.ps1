$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$dist = Join-Path $root "dist\TarmalTaskTicketing"

Write-Host "Building Tarmal Task Ticketing portable package..." -ForegroundColor Cyan

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "Node.js/npm is required to build the .exe. Install from https://nodejs.org then run this script again."
}

Push-Location $root
try {
  if (-not (Test-Path "node_modules\pkg")) {
    Write-Host "Installing build tools..."
    npm install --no-save pkg@5.8.1
  }

  if (Test-Path $dist) {
    Remove-Item $dist -Recurse -Force
  }
  New-Item -ItemType Directory -Path $dist -Force | Out-Null

  Write-Host "Compiling TarmalTaskTicketing.exe..."
  npx pkg launcher/server.js --targets node18-win-x64 --output "$dist\TarmalTaskTicketing.exe"

  $include = @(
    "*.html",
    "*.js",
    "*.css",
    "*.json",
    "assets",
    "PORTABLE-README.txt"
  )

  foreach ($pattern in $include) {
    Get-ChildItem -Path $root -Filter $pattern -ErrorAction SilentlyContinue | ForEach-Object {
      Copy-Item $_.FullName -Destination $dist -Recurse -Force
    }
  }

  if (-not (Test-Path (Join-Path $dist "assets"))) {
    New-Item -ItemType Directory -Path (Join-Path $dist "assets") -Force | Out-Null
  }

  Write-Host ""
  Write-Host "Done. Portable package:" -ForegroundColor Green
  Write-Host "  $dist"
  Write-Host ""
  Write-Host "Copy the whole TarmalTaskTicketing folder to any Windows PC."
  Write-Host "Double-click TarmalTaskTicketing.exe to start."
}
finally {
  Pop-Location
}
