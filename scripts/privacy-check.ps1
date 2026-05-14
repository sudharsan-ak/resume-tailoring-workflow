param(
  [string[]]$ExtraPatterns = @()
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$selfPath = $MyInvocation.MyCommand.Path

function Get-RelativePath {
  param(
    [Parameter(Mandatory=$true)][string]$BasePath,
    [Parameter(Mandatory=$true)][string]$TargetPath
  )

  $baseUri = New-Object System.Uri (($BasePath.TrimEnd('\') + '\'))
  $targetUri = New-Object System.Uri $TargetPath
  return [System.Uri]::UnescapeDataString($baseUri.MakeRelativeUri($targetUri).ToString()).Replace('/', '\')
}

function Test-IsExcluded {
  param([Parameter(Mandatory=$true)][string]$FullName)

  $relative = Get-RelativePath -BasePath $repoRoot -TargetPath $FullName

  if ($relative -like '.git\*' -or $relative -like 'output\*') {
    return $true
  }

  if ($relative -like 'input\*') {
    return -not ($relative -eq 'input\README.md')
  }

  if ($relative -eq 'master_resume.tex' -or $relative -like '*.local.tex') {
    return $true
  }

  if ($relative -eq 'scripts\build-task.json') {
    return $true
  }

  if ($relative -like 'workflow_state\*') {
    return -not (
      $relative -eq 'workflow_state\.gitkeep' -or
      $relative -eq 'workflow_state\README.md' -or
      $relative -like 'workflow_state\*.template.md' -or
      $relative -eq 'workflow_state\fresh_job_jds\.gitkeep'
    )
  }

  if ($relative -like 'evidence\*') {
    return -not (
      $relative -eq 'evidence\README.md' -or
      $relative -like 'evidence\*\README.md' -or
      $relative -like 'evidence\*\*TEMPLATE*.md' -or
      $relative -like 'evidence\*\*.template.json'
    )
  }

  if ($relative -like 'Gmail\role_briefs\*') {
    return -not (
      $relative -eq 'Gmail\role_briefs\README.md' -or
      $relative -like 'Gmail\role_briefs\*TEMPLATE*.md'
    )
  }

  return $false
}

$files = Get-ChildItem -Path $repoRoot -Recurse -File -Force |
  Where-Object { -not (Test-IsExcluded -FullName $_.FullName) }

$blockedFileNames = @('credentials.json','token.json')
$blockedExtensions = @('.pdf','.docx','.pem','.key','.p12','.pfx')

$riskyFiles = @()
foreach ($file in $files) {
  if ($blockedFileNames -contains $file.Name.ToLowerInvariant() -or $blockedExtensions -contains $file.Extension.ToLowerInvariant()) {
    $riskyFiles += $file
  }
}

$templateWarnings = @()
$jdTemplatePath = Join-Path $repoRoot 'JD Text.txt'
if (Test-Path $jdTemplatePath) {
  $jdText = Get-Content -LiteralPath $jdTemplatePath -Raw -ErrorAction SilentlyContinue
  if ($jdText -notlike '*PUBLIC TEMPLATE - DO NOT COMMIT A REAL JOB DESCRIPTION IN THIS FILE*') {
    $templateWarnings += 'JD Text.txt no longer contains the public template marker. Restore it before committing.'
  }
}

$patterns = @()
$patterns += $ExtraPatterns | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }

$findings = @()
if ($patterns.Count -gt 0) {
  foreach ($file in $files) {
    if ($file.FullName -eq $selfPath) {
      continue
    }

    foreach ($pattern in $patterns) {
      $matches = Select-String -LiteralPath $file.FullName -Pattern $pattern -SimpleMatch -ErrorAction SilentlyContinue
      foreach ($match in $matches) {
        $findings += [PSCustomObject]@{
          Path = Get-RelativePath -BasePath $repoRoot -TargetPath $file.FullName
          Line = $match.LineNumber
          Pattern = $pattern
        }
      }
    }
  }
}

if ($riskyFiles.Count -gt 0 -or $findings.Count -gt 0 -or $templateWarnings.Count -gt 0) {
  Write-Host 'Privacy check failed.'

  if ($riskyFiles.Count -gt 0) {
    Write-Host ''
    Write-Host 'Risky filenames:'
    foreach ($file in $riskyFiles) {
      Write-Host ("- " + (Get-RelativePath -BasePath $repoRoot -TargetPath $file.FullName))
    }
  }

  if ($findings.Count -gt 0) {
    Write-Host ''
    Write-Host 'Sensitive string matches:'
    foreach ($finding in $findings) {
      Write-Host ("- {0}:{1} matched '{2}'" -f $finding.Path, $finding.Line, $finding.Pattern)
    }
  }

  if ($templateWarnings.Count -gt 0) {
    Write-Host ''
    Write-Host 'Template warnings:'
    foreach ($warning in $templateWarnings) {
      Write-Host ("- " + $warning)
    }
  }

  exit 1
}

Write-Host 'Privacy check passed. No risky public files or configured sensitive strings found.'
