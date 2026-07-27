$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$outDir = Join-Path $root "dist"
$zipPath = Join-Path $outDir "TarmalITPortal-Portable.zip"
$stageDir = Join-Path $outDir "TarmalTaskTicketing"

$includeFiles = @(
  "*.html",
  "*.js",
  "*.css",
  "PORTABLE-README.txt",
  "TarmalTaskTicketing.cmd",
  "TarmalTaskTicketing.vbs",
  "start-network-server.ps1",
  "start-server.bat"
)

$includeDirs = @("assets", "launcher")

$appFiles = @(
  "index.html",
  "login.html",
  "app.js",
  "auth.js",
  "documents.js",
  "assets.js",
  "styles.css",
  "PORTABLE-README.txt",
  "TarmalTaskTicketing.cmd",
  "TarmalTaskTicketing.vbs",
  "start-network-server.ps1",
  "start-server.bat"
)

if (-not (Test-Path $stageDir)) {
  New-Item -ItemType Directory -Path $stageDir -Force | Out-Null
} else {
  Get-ChildItem -Path $stageDir -Force |
    Where-Object { $_.Name -ne "TarmalITPortal.exe" } |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
}

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

foreach ($pattern in $includeFiles) {
  Get-ChildItem -Path $root -Filter $pattern -File -ErrorAction SilentlyContinue | ForEach-Object {
    Copy-Item $_.FullName -Destination $stageDir -Force
  }
}

foreach ($dir in $includeDirs) {
  $source = Join-Path $root $dir
  if (Test-Path $source) {
    Copy-Item $source -Destination (Join-Path $stageDir $dir) -Recurse -Force
  }
}

if (-not (Test-Path (Join-Path $stageDir "assets"))) {
  New-Item -ItemType Directory -Path (Join-Path $stageDir "assets") -Force | Out-Null
}

$missing = @()
foreach ($file in $appFiles) {
  if (-not (Test-Path (Join-Path $stageDir $file))) {
    $missing += $file
  }
}
if ($missing.Count -gt 0) {
  Write-Warning "Missing from package: $($missing -join ', ')"
}

if (-not (Test-Path $outDir)) {
  New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

$zipName = "TarmalITPortal-Portable.zip"
$zipPath = Join-Path $outDir $zipName
if (Test-Path $zipPath) { Remove-Item $zipPath -Force -ErrorAction SilentlyContinue }

$zipItems = Get-ChildItem -Path $stageDir -Force
$lockedExe = Join-Path $stageDir "TarmalITPortal.exe"
$exeLocked = $false
if (Test-Path $lockedExe) {
  try {
    $stream = [System.IO.File]::Open($lockedExe, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::None)
    $stream.Close()
  } catch {
    $exeLocked = $true
  }
}

if ($exeLocked) {
  Write-Warning "TarmalITPortal.exe is running - ZIP will include app files only. Copy the folder for the EXE."
  $zipItems | Where-Object { $_.Name -ne "TarmalITPortal.exe" } | ForEach-Object {
    Compress-Archive -Path $_.FullName -DestinationPath $zipPath -Update
  }
} else {
  Compress-Archive -Path $stageDir -DestinationPath $zipPath -Force
}

Write-Host ""
Write-Host "Portable package ready:" -ForegroundColor Green
Write-Host "  Folder: $stageDir"
Write-Host "  ZIP:    $zipPath"
Write-Host ""
Write-Host "Copy either to a USB drive. On another PC:"
Write-Host "  1. Extract ZIP (if using ZIP) to C:\TarmalITPortal"
Write-Host "  2. Double-click TarmalTaskTicketing.cmd"
Write-Host "  3. Sign in at http://localhost:8080/login.html"
Write-Host ""
