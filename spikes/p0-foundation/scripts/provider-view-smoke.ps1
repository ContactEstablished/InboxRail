$ErrorActionPreference = 'Stop'

$spikeRoot = Split-Path -Parent $PSScriptRoot
$outPath = Join-Path $spikeRoot 'out'
$executables = @(Get-ChildItem -LiteralPath $outPath -Filter 'inboxrail-p0-foundation-spike.exe' -File -Recurse)

if ($executables.Count -ne 1) {
    throw "Expected exactly one packaged spike executable under $outPath; found $($executables.Count)."
}

foreach ($provider in @('gmail', 'microsoft')) {
    $diagnosticPath = Join-Path ([System.IO.Path]::GetTempPath()) "inboxrail-provider-smoke-$PID-$provider.json"
    $previousDiagnosticValue = $env:INBOXRAIL_PROVIDER_SMOKE_DIAGNOSTIC
    $env:INBOXRAIL_PROVIDER_SMOKE_DIAGNOSTIC = $diagnosticPath

    try {
        $process = Start-Process `
            -FilePath $executables[0].FullName `
            -ArgumentList "--inboxrail-provider-view-smoke=$provider" `
            -PassThru `
            -WindowStyle Hidden

        if (-not $process.WaitForExit(60000)) {
            Stop-Process -Id $process.Id -Force
            $diagnostic = if (Test-Path -LiteralPath $diagnosticPath) {
                Get-Content -LiteralPath $diagnosticPath -Raw
            }
            else {
                'No packaged-main diagnostic was produced.'
            }
            throw "$provider provider view did not render within 60 seconds. Startup: $diagnostic"
        }

        if ($process.ExitCode -ne 0) {
            $meaning = switch ($process.ExitCode) {
                3 { 'provider sign-in origin did not finish loading' }
                4 { 'captured render surface was empty or execution was not packaged' }
                5 { 'render-surface capture timed out' }
                6 { 'packaged main-process startup failed' }
                default { 'unexpected provider-view failure' }
            }
            $diagnostic = if (Test-Path -LiteralPath $diagnosticPath) {
                (Get-Content -LiteralPath $diagnosticPath) -join ', '
            }
            else {
                'No packaged-main diagnostic was produced.'
            }
            throw "$provider provider view smoke exited with code $($process.ExitCode): $meaning. Phases: $diagnostic"
        }

        Write-Output "$provider sign-in rendered in the packaged secure WebContentsView."
    }
    finally {
        Remove-Item -LiteralPath $diagnosticPath -ErrorAction SilentlyContinue
        if ($null -eq $previousDiagnosticValue) {
            Remove-Item Env:INBOXRAIL_PROVIDER_SMOKE_DIAGNOSTIC -ErrorAction SilentlyContinue
        }
        else {
            $env:INBOXRAIL_PROVIDER_SMOKE_DIAGNOSTIC = $previousDiagnosticValue
        }
    }
}
