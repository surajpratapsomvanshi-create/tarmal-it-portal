$ErrorActionPreference = "Stop"
$basePort = if ($env:TARMAL_PORT) { [int]$env:TARMAL_PORT } else { 8080 }
$maxTries = 10
$root = $PSScriptRoot

function Get-LanAddresses {
  Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.IPAddress -notlike "127.*" -and
      $_.IPAddress -notlike "169.254.*" -and
      $_.InterfaceAlias -notlike "*Loopback*"
    } |
    Select-Object -ExpandProperty IPAddress -Unique
}

function Get-ContentType([string]$filePath) {
  switch ([IO.Path]::GetExtension($filePath).ToLower()) {
    ".html" { return "text/html; charset=utf-8" }
    ".css"  { return "text/css; charset=utf-8" }
    ".js"   { return "application/javascript; charset=utf-8" }
    ".png"  { return "image/png" }
    ".jpg"  { return "image/jpeg" }
    ".jpeg" { return "image/jpeg" }
    ".svg"  { return "image/svg+xml" }
    ".ico"  { return "image/x-icon" }
    default { return "application/octet-stream" }
  }
}

function Send-HttpResponse($stream, [int]$statusCode, [string]$statusText, [byte[]]$body, [string]$contentType) {
  $header = "HTTP/1.1 $statusCode $statusText`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
  $headerBytes = [Text.Encoding]::ASCII.GetBytes($header)
  $stream.Write($headerBytes, 0, $headerBytes.Length)
  if ($body.Length -gt 0) {
    $stream.Write($body, 0, $body.Length)
  }
}

function Handle-Client($client, [string]$appRoot) {
  try {
    $stream = $client.GetStream()
    $reader = New-Object System.IO.StreamReader($stream, [Text.Encoding]::ASCII, $false, 8192, $true)
    $requestLine = $reader.ReadLine()

    if (-not $requestLine) {
      return
    }

    while ($null -ne ($line = $reader.ReadLine()) -and $line -ne "") { }

    $parts = $requestLine.Split(" ")
    if ($parts.Length -lt 2 -or $parts[0] -ne "GET") {
      $body = [Text.Encoding]::UTF8.GetBytes("Method Not Allowed")
      Send-HttpResponse $stream 405 "Method Not Allowed" $body "text/plain; charset=utf-8"
      return
    }

    $path = [System.Uri]::UnescapeDataString($parts[1].Split("?")[0])
    if ($path -eq "/" -or $path -eq "") {
      $path = "/login.html"
    }

    $relativePath = $path.TrimStart("/").Replace("/", [IO.Path]::DirectorySeparatorChar)
    $filePath = [IO.Path]::GetFullPath((Join-Path $appRoot $relativePath))

    if (-not $filePath.StartsWith($appRoot, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path $filePath -PathType Leaf)) {
      $body = [Text.Encoding]::UTF8.GetBytes("Not Found")
      Send-HttpResponse $stream 404 "Not Found" $body "text/plain; charset=utf-8"
      return
    }

    $bytes = [IO.File]::ReadAllBytes($filePath)
    Send-HttpResponse $stream 200 "OK" $bytes (Get-ContentType $filePath)
  } catch {
  } finally {
    if ($client) {
      $client.Close()
    }
  }
}

if (-not (Test-Path (Join-Path $root "login.html") -PathType Leaf)) {
  Write-Error "App files were not found in: $root"
  exit 1
}

$listener = $null
$port = $basePort

for ($try = 0; $try -lt $maxTries; $try++) {
    $candidate = $basePort + $try
    $candidateListener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $candidate)
    try {
        $candidateListener.Start()
        $listener = $candidateListener
        $port = $candidate
        break
    } catch {
        if ($try -eq ($maxTries - 1)) {
            Write-Error "Could not start server. Port $candidate is in use. Close other copies of Tarmal IT Portal or set TARMAL_PORT=8081."
            exit 1
        }
        Write-Host "Port $candidate is busy, trying $($candidate + 1)..." -ForegroundColor Yellow
    }
}

Write-Output "SERVER_READY"
Write-Output "Local:   http://localhost:$port/login.html"
foreach ($address in @(Get-LanAddresses)) {
  Write-Output "Network: http://${address}:$port/login.html"
}
Write-Output ""
Write-Output "Login uses users from Google Sheet (AppUsers tab)."
Write-Output "Keep this window open. Press Ctrl+C to stop."
Write-Output ""

Start-Process "http://localhost:$port/login.html" | Out-Null

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    Handle-Client $client $root
  }
} finally {
  if ($listener) {
    $listener.Stop()
  }
}
