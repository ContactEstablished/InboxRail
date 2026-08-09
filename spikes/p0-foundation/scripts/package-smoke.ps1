$ErrorActionPreference = 'Stop'

$spikeRoot = Split-Path -Parent $PSScriptRoot
$outPath = Join-Path $spikeRoot 'out'
$executables = @(Get-ChildItem -LiteralPath $outPath -Filter 'inboxrail-p0-foundation-spike.exe' -File -Recurse)

if ($executables.Count -ne 1) {
    throw "Expected exactly one packaged spike executable under $outPath; found $($executables.Count)."
}

$previousSmokeValue = $env:INBOXRAIL_PACKAGE_SMOKE
$env:INBOXRAIL_PACKAGE_SMOKE = '1'

try {
    $process = Start-Process -FilePath $executables[0].FullName -PassThru -WindowStyle Hidden

    if (-not $process.WaitForExit(20000)) {
        Stop-Process -Id $process.Id -Force
        throw 'Packaged spike did not exit within 20 seconds.'
    }

    if ($process.ExitCode -ne 0) {
        throw "Packaged spike exited with code $($process.ExitCode)."
    }
}
finally {
    if ($null -eq $previousSmokeValue) {
        Remove-Item Env:INBOXRAIL_PACKAGE_SMOKE -ErrorAction SilentlyContinue
    }
    else {
        $env:INBOXRAIL_PACKAGE_SMOKE = $previousSmokeValue
    }
}

Write-Output "Packaged spike launched its bundled renderer and exited successfully: $($executables[0].Name)"
