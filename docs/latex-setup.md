# LaTeX Setup

LaTeX is only required for local PDF builds. The AI can still create and edit all `.tex` and Markdown files without it.

## Option 1: Local LaTeX (Recommended)

Install a LaTeX distribution and run builds directly.

- Windows: [MiKTeX](https://miktex.org/download)
- macOS / Linux: [TeX Live](https://tug.org/texlive/)

Build command:

```powershell
.\scripts\run-resume-task.ps1 -TexPath .\output\tailored_tex\company-role.tex -CleanArtifacts
```

## Option 2: Dev Container (Docker Desktop Required)

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. Open the repo folder in VS Code
3. VS Code will prompt "Reopen in Container" — click it
4. The container starts with TeX Live, PowerShell, `pdflatex`, `xelatex`, and `lualatex` pre-installed
5. Run the scripts exactly as you would locally

**Custom fonts (Inter, etc.):**

1. Download your font files (`.ttf` or `.otf`)
2. Drop them into the `fonts/` folder (gitignored — stays local)
3. Rebuild the container — it auto-installs the fonts via `fc-cache`
4. Use `xelatex` or `lualatex` as your compiler in the LaTeX Workshop recipe picker

## Option 3: Overleaf (No Install)

1. Let the AI generate your tailored `.tex` file as normal
2. Go to [overleaf.com](https://www.overleaf.com) and create a free account
3. Click **New Project -> Blank Project**
4. Replace the default content with your `.tex` file
5. If using custom fonts, upload your font files to the Overleaf project
6. Click **Compile** — download the PDF

Overleaf supports `pdflatex`, `xelatex`, and `lualatex`. Switch compilers under **Menu -> Compiler**.

## Compilers

| Compiler | When to use |
|---|---|
| `pdflatex` | Default. No custom fonts. Fast. |
| `lualatex` | Required for `fontspec` and variable/system fonts. |
| `xelatex` | Alternative for custom fonts. Slower than `lualatex`. |

## Helper Tools (Optional)

- `latexmk` — manages multi-pass builds automatically
- `pdfinfo` — lets the build script verify the output page count

## Requirements Summary

- PowerShell is required for the helper scripts. On macOS/Linux, install PowerShell 7 or compile `.tex` files manually.
- `pdflatex` is the baseline compiler. `lualatex` is needed only if you use custom fonts via `fontspec`.
