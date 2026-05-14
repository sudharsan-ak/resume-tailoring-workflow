param(
  [string]$TexPath,
  [string[]]$TexPaths,
  [string]$PdfDestPath,
  [string[]]$PdfDestPaths,
  [switch]$CleanArtifacts
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent

function Get-DerivedPdfDestPath {
  param([Parameter(Mandatory=$true)][string]$InputTexPath)

  $fullTexPath = [System.IO.Path]::GetFullPath($InputTexPath)
  $pdfName = [System.IO.Path]::ChangeExtension([System.IO.Path]::GetFileName($fullTexPath), '.pdf')

  if ($fullTexPath -like '*\output\tailored_tex\*') {
    return ($fullTexPath -replace '\\output\\tailored_tex\\', '\output\pdfs\' -replace '\.tex$', '.pdf')
  }

  return (Join-Path (Join-Path $repoRoot 'output\pdfs') $pdfName)
}

function Invoke-Build {
  param(
    [Parameter(Mandatory=$true)][string[]]$ResolvedTexPaths,
    [string[]]$ResolvedPdfDestPaths,
    [switch]$ShouldCleanArtifacts
  )

  if ($ResolvedPdfDestPaths -and $ResolvedPdfDestPaths.Count -gt 0 -and $ResolvedPdfDestPaths.Count -ne $ResolvedTexPaths.Count) {
    throw 'When passing PdfDestPaths, the number of PDF paths must match the number of TEX paths.'
  }

  for ($i = 0; $i -lt $ResolvedTexPaths.Count; $i++) {
    $currentTexPath = $ResolvedTexPaths[$i]
    $currentPdfDestPath = if ($ResolvedPdfDestPaths -and $ResolvedPdfDestPaths.Count -gt 0) {
      $ResolvedPdfDestPaths[$i]
    } else {
      Get-DerivedPdfDestPath -InputTexPath $currentTexPath
    }

    & (Join-Path $PSScriptRoot 'resume-build.ps1') -TexPath $currentTexPath -PdfDestPath $currentPdfDestPath -CleanArtifacts:$ShouldCleanArtifacts
  }
}

$allTexPaths = @()
if (-not [string]::IsNullOrWhiteSpace($TexPath)) {
  $allTexPaths += $TexPath
}
if ($TexPaths) {
  $allTexPaths += $TexPaths
}

if ($allTexPaths.Count -eq 0) {
  throw 'run-resume-task.ps1 requires -TexPath or -TexPaths.'
}

$allPdfDestPaths = @()
if (-not [string]::IsNullOrWhiteSpace($PdfDestPath)) {
  $allPdfDestPaths += $PdfDestPath
}
if ($PdfDestPaths) {
  $allPdfDestPaths += $PdfDestPaths
}

Invoke-Build -ResolvedTexPaths $allTexPaths -ResolvedPdfDestPaths $allPdfDestPaths -ShouldCleanArtifacts:$CleanArtifacts
