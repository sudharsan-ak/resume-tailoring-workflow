param()

$ErrorActionPreference = 'Stop'

$taskPath = Join-Path $PSScriptRoot 'build-task.json'
$templatePath = Join-Path $PSScriptRoot 'build-task.template.json'
if (-not (Test-Path $taskPath)) {
  if (Test-Path $templatePath) {
    Copy-Item -LiteralPath $templatePath -Destination $taskPath -Force
    throw 'Created local scripts/build-task.json from scripts/build-task.template.json. Add tex_paths, then rerun build-pdfs.ps1.'
  }

  throw "Missing task file: $taskPath"
}

$task = Get-Content $taskPath -Raw | ConvertFrom-Json
$texPaths = @()
if ($task.tex_paths) {
  $texPaths = @($task.tex_paths | ForEach-Object { [string]$_ } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
}

if ($texPaths.Count -eq 0) {
  throw 'build-task.json has no tex_paths. Populate it before running build-pdfs.ps1.'
}

$clean = $true
if ($null -ne $task.clean_artifacts) {
  $clean = [bool]$task.clean_artifacts
}

& (Join-Path $PSScriptRoot 'run-resume-task.ps1') -TexPaths $texPaths -CleanArtifacts:$clean

$task.tex_paths = @()
$task | ConvertTo-Json -Depth 4 | Set-Content -Path $taskPath -Encoding UTF8
