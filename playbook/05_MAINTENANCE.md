# Stage 5: Maintenance

Use this stage for first-time setup from a resume PDF, evidence refreshes, privacy checks, build troubleshooting, and state cleanup.

For demo runs, use sample files per `playbook/00_INDEX.md`.

## First-Time Setup From Resume PDF

Use this when the user provides a resume PDF under `input/` and asks to create the initial workflow files.

Input:

```text
input/<user-provided-resume>.pdf
```

Outputs:

```text
master_resume.tex
workflow_state/resume_digest.md
workflow_state/bullet_index.md
workflow_state/profile_notes.md
evidence/work/INDEX.md
evidence/work/EVIDENCE_ROUTER.md
evidence/work/E*.md
evidence/projects/INDEX.md
evidence/projects/P*.md
```

Rules:

- Extract only claims present in the resume PDF.
- Do not invent metrics, tools, ownership, employers, projects, or outcomes.
- Create `master_resume.tex` as the editable LaTeX master resume.
- Use `templates/master_resume_template.tex` as the default style unless the user asks to preserve another design.
- Generate `master_resume.tex` using plain `article`-class LaTeX compatible with `pdflatex`.
- Do not use `fontspec`, variable fonts, custom system fonts, or `lualatex`-only packages unless the user explicitly requests them.
- Default style should be ATS-friendly: simple headings, compact bullets, tight margins, no icons, no graphics, no tables for core content, and no custom system font dependency.
- Default font should be standard `pdflatex` font behavior, usually Computer Modern or Latin Modern.
- Create `resume_digest.md` as a compact summary for fit checks.
- Create `bullet_index.md` with stable IDs for current resume bullets.
- Create `profile_notes.md` with any explicit work authorization, location, target role, hard blocker, or preference information present in the resume or provided by the user.
- Create `evidence/work/` files from professional experience bullets.
- Create `evidence/projects/` files from project bullets.
- If the resume does not contain enough detail for a strong evidence file, mark the gaps instead of filling them in.

## Evidence Bank

Keep the public sample evidence fake and small.

For real use, maintain ignored local evidence under:

```text
evidence/work/
evidence/projects/
```

Recommended evidence format:

```text
E01 - Short evidence title
Context: where/when the work happened
Proof: what was built, improved, shipped, fixed, or led
Stack: relevant tools and technologies
Outcome: metric or result, if truthful
Resume use: bullets or roles where this evidence is useful
Risks: claims not supported by this evidence
```

## Resume Digest

Maintain a compact digest so Stage 1 does not need to read the full resume every time.

Recommended ignored local files:

```text
workflow_state/profile_notes.md
workflow_state/resume_digest.md
workflow_state/bullet_index.md
```

## Build Hygiene

Use:

```powershell
.\scripts\run-resume-task.ps1 -TexPath .\sample\sample_resume.tex -CleanArtifacts
```

The build script:
- runs `pdflatex` first, falls back to `latexmk`, then tries `lualatex` only as a later fallback for resumes that explicitly need it
- copies PDFs to `output/pdfs/`
- removes transient LaTeX artifacts after successful builds
- checks page count when `pdfinfo` is installed

If LaTeX is not installed:
- Still create and edit `master_resume.tex` and all Markdown workflow files.
- Tell the user that local PDF build is unavailable.
- Suggest installing MiKTeX for Windows (https://miktex.org/download), TeX Live for macOS/Linux (https://tug.org/texlive/), or using Overleaf to compile the `.tex`.
- Do not treat missing LaTeX as a blocker for fit check, suggest changes, or evidence setup.

## Privacy Check

Before committing:

```powershell
.\scripts\privacy-check.ps1 -ExtraPatterns "Your Real Name","Your Employer","Internal Project Name"
```

Also inspect:

```powershell
git status --short
git diff --cached --name-only
```

Do not commit:
- real resumes
- generated PDFs or DOCX files
- real evidence banks
- real role briefs
- recruiter contact lists
- email tokens
- credentials
- `.env` files

## State Cleanup

`workflow_state/` is intentionally ignored. Use it for local ledgers such as:

- fetched job history
- fresh job tables
- generated JD snapshots
- tailoring counts

If any local state should become public documentation, rewrite it as fake sample data first.

## Output / Next Options

After maintenance or first-time setup, summarize what changed and end with `Next options:`.

Useful options after first-time setup:
- paste a JD for fit check
- add more evidence details to `evidence/work/` or `evidence/projects/`
- review `workflow_state/resume_digest.md`
- build the sample or master resume to verify LaTeX works

Example first-time setup ending:

```text
Created:
- master_resume.tex
- workflow_state/resume_digest.md
- workflow_state/bullet_index.md
- workflow_state/profile_notes.md
- evidence/work/INDEX.md
- evidence/work/EVIDENCE_ROUTER.md
- evidence/work/E01_*.md
- evidence/projects/INDEX.md
- evidence/projects/P01_*.md

Next options:
- paste a JD or link for fit check
- review workflow_state/resume_digest.md
- add more detail to evidence/work/ or evidence/projects/
- build master_resume.tex to verify LaTeX works
```

Useful options after troubleshooting:
- rerun the failed build
- inspect the root-cause error
- run the privacy check
- continue to the next workflow stage

