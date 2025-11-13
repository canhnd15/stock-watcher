# Quick stop script for Stock Watcher services on Windows

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$DeployScript = Join-Path $ScriptDir "deploy.ps1"
& $DeployScript stop

