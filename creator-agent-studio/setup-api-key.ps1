$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $MyInvocation.MyCommand.Path
$envFile = Join-Path $project '.env'

Write-Host ''
Write-Host 'Creator Agent Studio - OpenAI API Setup' -ForegroundColor Cyan
Write-Host 'The key stays in the local .env file and is excluded from Git.'
Write-Host 'Paste the key ONLY after the secure prompt below appears.' -ForegroundColor Yellow
Write-Host 'Do NOT paste it after a normal PS C:\...> prompt.' -ForegroundColor Yellow
Write-Host ''

$secure = Read-Host 'Paste NEW OPENAI_API_KEY here (input is hidden)' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
$key = $null

try {
    $key = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    if ([string]::IsNullOrWhiteSpace($key)) {
        throw 'The key is empty.'
    }
    if (-not $key.StartsWith('sk-')) {
        throw 'Invalid key format. An OpenAI API key normally starts with sk-.'
    }
    $content = @(
        ('OPENAI_API_KEY=' + $key),
        'OPENAI_MODEL=gpt-5.6',
        'PORT=3210',
        'HTTP_PROXY=',
        'HTTPS_PROXY=',
        'NO_PROXY=localhost,127.0.0.1'
    )
    [IO.File]::WriteAllLines($envFile, $content, [Text.UTF8Encoding]::new($false))
    Write-Host ''
    Write-Host 'SUCCESS: API key saved. Return to Codex and say setup succeeded.' -ForegroundColor Green
}
finally {
    if ($ptr -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }
    $key = $null
}

Write-Host ''
Read-Host 'Press Enter to close'
