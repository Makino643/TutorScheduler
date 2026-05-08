$ErrorActionPreference = "Stop"

function Remove-DirectoryWithRetry {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [int]$MaxAttempts = 6
  )

  for ($i = 1; $i -le $MaxAttempts; $i++) {
    try {
      if (Test-Path $Path) {
        Remove-Item -Recurse -Force $Path
      }
      return $true
    } catch {
      if ($i -eq $MaxAttempts) {
        Write-Warning "Failed to delete '$Path' after $MaxAttempts attempts: $($_.Exception.Message)"
        return $false
      }
      Start-Sleep -Milliseconds 400
    }
  }

  return $false
}

Write-Host "Stopping possible app locks..."
Get-Process -Name "TutorFlow", "electron" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 600

$projectRoot = Get-Location
$releaseDirs = Get-ChildItem -Path $projectRoot -Directory -Filter "release-local-*" -ErrorAction SilentlyContinue
if ($releaseDirs) {
  Write-Host "Cleaning previous local release folders..."
  foreach ($dir in $releaseDirs) {
    [void](Remove-DirectoryWithRetry -Path $dir.FullName)
  }
}

$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$outputDir = "release-local-$stamp"
Write-Host "Building fresh local package into '$outputDir'..."

npm run desktop:build
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

npx electron-builder --publish never --config.directories.output=$outputDir
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

Write-Host "Done. Artifacts are in '$outputDir'."
