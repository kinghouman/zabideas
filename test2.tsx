$projectRoot = (Get-Location).Path
$undoStamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$safetyRoot = Join-Path $projectRoot "ProjectDeltaBackups\BeforeUndo-$undoStamp"

foreach ($row in $rows | Where-Object Status -eq 'Overwritten') {
    $currentFile = Join-Path $projectRoot $row.RelativePath
    $backupFile = Join-Path $backupRoot $row.RelativePath
    $safetyFile = Join-Path $safetyRoot $row.RelativePath

    if (-not (Test-Path -LiteralPath $backupFile -PathType Leaf)) {
        throw "Missing backup: $backupFile"
    }

    if (Test-Path -LiteralPath $currentFile -PathType Leaf) {
        New-Item -ItemType Directory `
            -Path (Split-Path -Parent $safetyFile) `
            -Force | Out-Null

        Copy-Item -LiteralPath $currentFile `
            -Destination $safetyFile `
            -Force
    }

    New-Item -ItemType Directory `
        -Path (Split-Path -Parent $currentFile) `
        -Force | Out-Null

    Copy-Item -LiteralPath $backupFile `
        -Destination $currentFile `
        -Force

    $backupHash = (Get-FileHash -LiteralPath $backupFile -Algorithm SHA256).Hash
    $restoredHash = (Get-FileHash -LiteralPath $currentFile -Algorithm SHA256).Hash

    if ($backupHash -ne $restoredHash) {
        throw "Restore verification failed: $($row.RelativePath)"
    }

    Write-Host "Restored: $($row.RelativePath)"
}
