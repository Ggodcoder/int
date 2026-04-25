Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step($Message) {
  Write-Host "[int] $Message"
}

function Command-Output($Command, $Arguments) {
  $output = & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Command $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
  }
  return ($output | Select-Object -First 1)
}

function Remove-IfInside($Path, $AllowedRoot, $Label) {
  if ([string]::IsNullOrWhiteSpace($Path) -or !(Test-Path -LiteralPath $Path)) {
    return
  }

  $target = [System.IO.Path]::GetFullPath($Path)
  $root = [System.IO.Path]::GetFullPath($AllowedRoot).TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
  $rootWithSeparator = "$root$([System.IO.Path]::DirectorySeparatorChar)"
  if ($target -ne $root -and !$target.StartsWith($rootWithSeparator, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to remove $Label outside $root`: $target"
  }

  Write-Step "Removing stale $Label`: $target"
  Remove-Item -LiteralPath $target -Recurse -Force
}

Write-Step "Checking npm"
$npmRoot = Command-Output "npm" @("root", "-g")
$npmPrefix = Command-Output "npm" @("prefix", "-g")
$npmBin = $npmPrefix

Write-Step "Stopping running Int CLI processes"
$intProcesses = Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -eq "node.exe" -and
    $_.CommandLine -and
    ($_.CommandLine -like "*int-cli*src*cli.mjs*" -or $_.CommandLine -like "*\int-cli\src\cli.mjs*")
  }

foreach ($process in $intProcesses) {
  Write-Step "Stopping process $($process.ProcessId)"
  Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
}

Write-Step "Cleaning stale global package state"
Remove-IfInside (Join-Path $npmRoot "int-cli") $npmRoot "int-cli package"
Remove-IfInside (Join-Path $npmPrefix "int") $npmPrefix "int shim"
Remove-IfInside (Join-Path $npmPrefix "int.cmd") $npmPrefix "int.cmd shim"
Remove-IfInside (Join-Path $npmPrefix "int.ps1") $npmPrefix "int.ps1 shim"

Get-ChildItem -LiteralPath $npmRoot -Force -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like ".int-cli-*" -or $_.Name -like "int-cli-*" } |
  ForEach-Object { Remove-IfInside $_.FullName $npmRoot "npm temp folder" }

Write-Step "Verifying npm cache"
npm cache verify
if ($LASTEXITCODE -ne 0) {
  throw "npm cache verify failed with exit code $LASTEXITCODE"
}

Write-Step "Installing Int CLI from GitHub"
npm install -g github:Ggodcoder/int
if ($LASTEXITCODE -ne 0) {
  throw "npm install failed with exit code $LASTEXITCODE"
}

$env:Path = "$npmBin;$env:Path"
$intCandidates = @(
  (Join-Path $npmBin "int.cmd"),
  (Join-Path $npmBin "int.ps1"),
  (Join-Path $npmBin "int")
)
$intCommand = $intCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if ([string]::IsNullOrWhiteSpace($intCommand)) {
  $found = Get-Command int -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($found) {
    $intCommand = $found.Source
  }
}
if ([string]::IsNullOrWhiteSpace($intCommand)) {
  throw "Install finished, but the int executable was not found. Expected one of: $($intCandidates -join ', '). npm prefix: $npmPrefix. npm root: $npmRoot. PATH: $env:Path"
}

Write-Step "Verifying Int CLI"
& $intCommand --smoke
if ($LASTEXITCODE -ne 0) {
  throw "int --smoke failed with exit code $LASTEXITCODE"
}

Write-Step "Done. Run int to start."
