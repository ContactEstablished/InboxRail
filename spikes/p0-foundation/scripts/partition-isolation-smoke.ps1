$ErrorActionPreference = 'Stop'

$spikeRoot = Split-Path -Parent $PSScriptRoot
$outPath = Join-Path $spikeRoot 'out'
$executables = @(Get-ChildItem -LiteralPath $outPath -Filter 'inboxrail-p0-foundation-spike.exe' -File -Recurse)

if ($executables.Count -ne 1) {
    throw "Expected exactly one packaged spike executable under $outPath; found $($executables.Count)."
}

$tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$workPath = [System.IO.Path]::GetFullPath(
    (Join-Path $tempRoot "inboxrail-partition-smoke-$PID-$([System.Guid]::NewGuid().ToString('N'))")
)
$workLeaf = Split-Path -Leaf $workPath

if (-not $workPath.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase) -or
    -not $workLeaf.StartsWith('inboxrail-partition-smoke-', [System.StringComparison]::Ordinal)) {
    throw 'Refusing to use an unverified partition-smoke temporary path.'
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
$listener.Start()
$fixturePort = ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
$listener.Stop()

$previousDiagnostic = $env:INBOXRAIL_PARTITION_SMOKE_DIAGNOSTIC
$previousPort = $env:INBOXRAIL_PARTITION_SMOKE_PORT
$previousUserData = $env:INBOXRAIL_PARTITION_SMOKE_USER_DATA

New-Item -ItemType Directory -Path $workPath | Out-Null
$diagnosticPath = Join-Path $workPath 'diagnostic.jsonl'
$env:INBOXRAIL_PARTITION_SMOKE_DIAGNOSTIC = $diagnosticPath
$env:INBOXRAIL_PARTITION_SMOKE_PORT = $fixturePort.ToString([System.Globalization.CultureInfo]::InvariantCulture)
$env:INBOXRAIL_PARTITION_SMOKE_USER_DATA = Join-Path $workPath 'user-data'

try {
    foreach ($mode in @('seed', 'verify')) {
        $process = Start-Process `
            -FilePath $executables[0].FullName `
            -ArgumentList "--inboxrail-partition-smoke=$mode" `
            -PassThru `
            -WindowStyle Hidden

        if (-not $process.WaitForExit(60000)) {
            Stop-Process -Id $process.Id -Force
            throw "Partition-isolation $mode run did not finish within 60 seconds."
        }

        if ($process.ExitCode -ne 0) {
            $diagnostic = if (Test-Path -LiteralPath $diagnosticPath) {
                (Get-Content -LiteralPath $diagnosticPath) -join ', '
            }
            else {
                'No packaged-main diagnostic was produced.'
            }
            throw "Partition-isolation $mode run exited with code $($process.ExitCode). Phases: $diagnostic"
        }

        Write-Output "Partition-isolation $mode run passed in the packaged application."
    }

    Write-Output 'Two UUID-backed persistent partitions retained distinct cookie and local-storage identities across a full restart.'
}
finally {
    if ($null -eq $previousDiagnostic) {
        Remove-Item Env:INBOXRAIL_PARTITION_SMOKE_DIAGNOSTIC -ErrorAction SilentlyContinue
    }
    else {
        $env:INBOXRAIL_PARTITION_SMOKE_DIAGNOSTIC = $previousDiagnostic
    }
    if ($null -eq $previousPort) {
        Remove-Item Env:INBOXRAIL_PARTITION_SMOKE_PORT -ErrorAction SilentlyContinue
    }
    else {
        $env:INBOXRAIL_PARTITION_SMOKE_PORT = $previousPort
    }
    if ($null -eq $previousUserData) {
        Remove-Item Env:INBOXRAIL_PARTITION_SMOKE_USER_DATA -ErrorAction SilentlyContinue
    }
    else {
        $env:INBOXRAIL_PARTITION_SMOKE_USER_DATA = $previousUserData
    }

    $resolvedWorkPath = [System.IO.Path]::GetFullPath($workPath)
    if ($resolvedWorkPath.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase) -and
        (Split-Path -Leaf $resolvedWorkPath).StartsWith('inboxrail-partition-smoke-', [System.StringComparison]::Ordinal)) {
        Remove-Item -LiteralPath $resolvedWorkPath -Recurse -Force -ErrorAction SilentlyContinue
    }
}
