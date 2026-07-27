# Run once as Administrator if other devices cannot connect (firewall only)
$port = 8080
$ruleName = "Tarmal Task Ticketing"

$rule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if (-not $rule) {
  New-NetFirewallRule `
    -DisplayName $ruleName `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort $port `
    -Action Allow `
    -Profile Private,Domain | Out-Null
  Write-Output "Added firewall rule for TCP port $port"
} else {
  Write-Output "Firewall rule already exists"
}

Write-Output "Other devices can use: http://YOUR-IP:$port/login.html"
