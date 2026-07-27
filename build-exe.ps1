$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$dist = Join-Path $root "dist\TarmalTaskTicketing"
$toolsDir = Join-Path $root ".build-tools"
$nodeDir = Join-Path $toolsDir "node"
$nodeZip = Join-Path $toolsDir "node-portable.zip"
$nodeVersion = "v20.18.0"
$nodeUrl = "https://nodejs.org/dist/$nodeVersion/node-$nodeVersion-win-x64.zip"

function Get-NodeExe {
  if (Get-Command node -ErrorAction SilentlyContinue) {
    return (Get-Command node).Source
  }
  $portable = Join-Path $nodeDir "node-$nodeVersion-win-x64\node.exe"
  if (Test-Path $portable) {
    return $portable
  }
  return $null
}

function Ensure-PortableNode {
  $portable = Join-Path $nodeDir "node-$nodeVersion-win-x64\node.exe"
  if (Test-Path $portable) { return $portable }

  Write-Host "Downloading portable Node.js $nodeVersion..." -ForegroundColor Cyan
  New-Item -ItemType Directory -Path $toolsDir -Force | Out-Null
  Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeZip -UseBasicParsing
  Expand-Archive -Path $nodeZip -DestinationPath $nodeDir -Force
  Remove-Item $nodeZip -Force -ErrorAction SilentlyContinue
  if (-not (Test-Path $portable)) {
    throw "Portable Node download failed."
  }
  return $portable
}

Write-Host "Building Tarmal IT Portal executable package..." -ForegroundColor Cyan

$nodeExe = Get-NodeExe
if (-not $nodeExe) {
  $nodeExe = Ensure-PortableNode
}

$nodeRoot = Split-Path $nodeExe -Parent
$env:PATH = "$nodeRoot;$env:PATH"
$npmCmd = Join-Path $nodeRoot "npm.cmd"
$npxCmd = Join-Path $nodeRoot "npx.cmd"

Push-Location $root
try {
  if (-not (Test-Path "node_modules\pkg")) {
    Write-Host "Installing pkg..."
    & $npmCmd install --no-save pkg@5.8.1
    if ($LASTEXITCODE -ne 0) { throw "npm install pkg failed." }
  }

  Write-Host "Staging app files..."
  & (Join-Path $root "create-portable-zip.ps1")

  Write-Host "Compiling TarmalITPortal.exe..."
  $exePath = Join-Path $dist "TarmalITPortal.exe"
  $exeTempPath = Join-Path $dist "TarmalITPortal.new.exe"
  if (Test-Path $exeTempPath) { Remove-Item $exeTempPath -Force -ErrorAction SilentlyContinue }

  & $npxCmd pkg launcher/server.js --targets node18-win-x64 --output $exeTempPath
  if ($LASTEXITCODE -ne 0) { throw "pkg compile failed." }

  try {
    if (Test-Path $exePath) { Remove-Item $exePath -Force }
    Move-Item $exeTempPath $exePath -Force
  } catch {
    Write-Warning "Could not replace TarmalITPortal.exe because it is running. Close it and run build-exe.ps1 again."
    if (Test-Path $exeTempPath) {
      Move-Item $exeTempPath (Join-Path $dist "TarmalITPortal.new.exe") -Force
      Write-Host "Wrote fresh launcher as TarmalITPortal.new.exe"
    }
  }

  $zipPath = Join-Path $root "dist\TarmalITPortal-Executable.zip"
  if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
  Compress-Archive -Path $dist -DestinationPath $zipPath -Force

  $exeSize = [math]::Round((Get-Item $exePath).Length / 1MB, 1)
  $zipSize = [math]::Round((Get-Item $zipPath).Length / 1MB, 1)

  Write-Host ""
  Write-Host "Executable package ready:" -ForegroundColor Green
  Write-Host "  Folder: $dist"
  Write-Host "  EXE:    $exePath ($exeSize MB)"
  Write-Host "  ZIP:    $zipPath ($zipSize MB)"
  Write-Host ""
  Write-Host "Copy the folder or ZIP to a USB drive."
  Write-Host "On another PC, double-click TarmalITPortal.exe"
  Write-Host ""
}
finally {
  Pop-Location
}
