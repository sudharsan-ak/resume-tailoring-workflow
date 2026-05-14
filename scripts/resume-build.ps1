param(
  [Parameter(Mandatory=$true)][string]$TexPath,
  [Parameter(Mandatory=$true)][string]$PdfDestPath,
  [switch]$CleanArtifacts
)

$ErrorActionPreference = 'Stop'

$resolvedTexPath = (Resolve-Path $TexPath).Path
$resolvedPdfDestPath = [System.IO.Path]::GetFullPath($PdfDestPath)
$pdfDestDir = Split-Path $resolvedPdfDestPath -Parent
if (-not [string]::IsNullOrWhiteSpace($pdfDestDir) -and -not (Test-Path $pdfDestDir)) {
  New-Item -ItemType Directory -Path $pdfDestDir -Force | Out-Null
}

$texFile = Split-Path $resolvedTexPath -Leaf
$workdir = Split-Path $resolvedTexPath -Parent
$baseName = [System.IO.Path]::GetFileNameWithoutExtension($texFile)
$capturedFiles = New-Object System.Collections.Generic.List[string]

function Get-RootCauseLine {
  param([string[]]$Lines)

  if ($null -eq $Lines -or $Lines.Count -eq 0) {
    return 'Build failed'
  }

  $candidates = $Lines |
    Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
    Select-Object -Last 250

  $match = $candidates |
    Where-Object { $_ -match '(?i)\b(fatal|error|undefined control sequence|missing package)\b|^!' } |
    Select-Object -Last 1

  if ($null -ne $match) {
    return (($match -replace '\s+', ' ').Trim())
  }

  $last = $candidates | Select-Object -Last 1
  if ($null -ne $last) {
    return (([string]$last -replace '\s+', ' ').Trim())
  }

  return 'Build failed'
}

function Invoke-ProcessQuiet {
  param(
    [Parameter(Mandatory=$true)][string]$FilePath,
    [Parameter(Mandatory=$true)][string[]]$ArgumentList,
    [Parameter(Mandatory=$true)][string]$StdoutPath,
    [Parameter(Mandatory=$true)][string]$StderrPath
  )

  $capturedFiles.Add($StdoutPath) | Out-Null
  $capturedFiles.Add($StderrPath) | Out-Null

  $argString = ($ArgumentList | ForEach-Object {
    $arg = [string]$_
    if ($arg -match '\s') {
      '"' + ($arg -replace '"','\"') + '"'
    } else {
      $arg
    }
  }) -join ' '

  $process = Start-Process -FilePath $FilePath -ArgumentList $argString -Wait -PassThru -NoNewWindow `
    -RedirectStandardOutput $StdoutPath -RedirectStandardError $StderrPath

  return $process.ExitCode
}

function Invoke-LatexAttempt {
  param(
    [Parameter(Mandatory=$true)][string]$Tool,
    [Parameter(Mandatory=$true)][string[]]$Args,
    [Parameter(Mandatory=$true)][string]$Label
  )

  $stdoutPath = Join-Path $workdir "$baseName.$Label.stdout.txt"
  $stderrPath = Join-Path $workdir "$baseName.$Label.stderr.txt"
  $exitCode = Invoke-ProcessQuiet -FilePath $Tool -ArgumentList $Args -StdoutPath $stdoutPath -StderrPath $stderrPath
  return $exitCode
}

Push-Location $workdir
try {
  $attempted = $false
  $buildOk = $false

  $pdflatex = Get-Command pdflatex -ErrorAction SilentlyContinue
  if ($null -ne $pdflatex) {
    $attempted = $true
    $exit = Invoke-LatexAttempt -Tool $pdflatex.Source -Args @('-interaction=nonstopmode','-halt-on-error','-file-line-error',$texFile) -Label 'pdflatex'
    if ($exit -eq 0) { $buildOk = $true }
  }

  if (-not $buildOk) {
    $latexmk = Get-Command latexmk -ErrorAction SilentlyContinue
    if ($null -ne $latexmk) {
      $attempted = $true
      $latexmkArgs = @('-pdf','-interaction=nonstopmode','-halt-on-error','-file-line-error',$texFile)
      $exit = Invoke-LatexAttempt -Tool $latexmk.Source -Args $latexmkArgs -Label 'latexmk'
      if ($exit -eq 0) { $buildOk = $true }
    }
  }

  if (-not $buildOk) {
    $lualatex = Get-Command lualatex -ErrorAction SilentlyContinue
    if ($null -ne $lualatex) {
      $attempted = $true
      $exit = Invoke-LatexAttempt -Tool $lualatex.Source -Args @('-interaction=nonstopmode','-halt-on-error','-file-line-error',$texFile) -Label 'lualatex'
      if ($exit -eq 0) { $buildOk = $true }
    }
  }

  if (-not $attempted) {
    throw 'No LaTeX build tool found. Install pdflatex through MiKTeX or TeX Live.'
  }

  if (-not $buildOk) {
    $lines = @()
    foreach ($path in $capturedFiles) {
      if (Test-Path $path) {
        $lines += Get-Content $path -ErrorAction SilentlyContinue
      }
    }
    $rootCause = Get-RootCauseLine -Lines $lines
    throw "Build failed: $rootCause"
  }

  $sourcePdfPath = [System.IO.Path]::GetFullPath((Join-Path $workdir ([System.IO.Path]::ChangeExtension($texFile, '.pdf'))))
  if (-not (Test-Path $sourcePdfPath)) {
    throw "Build finished but no PDF was produced: $sourcePdfPath"
  }

  if ($sourcePdfPath -ne $resolvedPdfDestPath) {
    Copy-Item -LiteralPath $sourcePdfPath -Destination $resolvedPdfDestPath -Force
  }

  $pdfinfo = Get-Command pdfinfo -ErrorAction SilentlyContinue
  if ($null -ne $pdfinfo) {
    $infoOutput = & $pdfinfo.Source $resolvedPdfDestPath
    $pagesLine = $infoOutput | Where-Object { $_ -match '^Pages:\s+(\d+)' } | Select-Object -First 1
    if ($pagesLine -and $pagesLine -match '^Pages:\s+(\d+)') {
      $pageCount = [int]$Matches[1]
      if ($pageCount -ne 1) {
        throw "Expected 1 page but found $pageCount pages in $resolvedPdfDestPath"
      }
    }
  }

  $basePath = [System.IO.Path]::Combine($workdir, $baseName)
  foreach ($ext in @('.aux','.bbl','.bcf','.blg','.fdb_latexmk','.fls','.log','.out','.run.xml','.synctex.gz','.xdv')) {
    $artifact = $basePath + $ext
    if (Test-Path $artifact) {
      Remove-Item -LiteralPath $artifact -Force
    }
  }

  foreach ($path in $capturedFiles) {
    if ($path -and (Test-Path $path)) {
      Remove-Item -LiteralPath $path -Force
    }
  }

  $texput = Join-Path $workdir 'texput.log'
  if (Test-Path $texput) {
    Remove-Item -LiteralPath $texput -Force
  }

  if ($CleanArtifacts -and (Test-Path $sourcePdfPath) -and ($sourcePdfPath -ne $resolvedPdfDestPath)) {
    Remove-Item -LiteralPath $sourcePdfPath -Force
  }

  Write-Host "Built: $resolvedPdfDestPath"
}
finally {
  Pop-Location
}
