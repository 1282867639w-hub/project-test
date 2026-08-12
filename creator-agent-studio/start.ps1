$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $MyInvocation.MyCommand.Path
$envFile = Join-Path $project '.env'

if (Test-Path -LiteralPath $envFile) {
    foreach ($line in [IO.File]::ReadAllLines($envFile)) {
        if ($line -match '^([A-Z0-9_]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
        }
    }
}

Set-Location $project
& node --use-env-proxy src/server.js
