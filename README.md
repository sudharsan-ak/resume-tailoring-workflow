# Resume Tailoring Workflow

A reusable, privacy-first workflow for using an AI coding assistant to turn a default resume into a role-specific LaTeX resume and PDF.

This repo proves the workflow. It should not publish a real resume, real work evidence, job history, recruiter notes, generated PDFs, or private candidate details.

The workflow is meant to work with Codex, Claude Code, or any AI coding assistant that can read and edit local files.

Core behavior: the assistant should act like a ruthless recruiter or hiring manager for the specific role. It should score honestly, challenge weak fit, and tailor only from evidence the resume can defend.

## Start Here

Open a new AI chat from this repo and say:

```text
Read CHAT_BOOTSTRAP.md first and follow it for this workflow.
```

The assistant will route your request through the correct playbook stage.

If this README feels too detailed, do not try to follow every section manually. Ask the AI to guide you:

```text
Read README.md and CHAT_BOOTSTRAP.md, then guide me through first-time setup step by step. Tell me what files you need before creating anything.
```

## First-Time Setup

Start with your existing resume PDF. You do **not** manually fill every Markdown file from scratch.

1. Put your resume PDF in the `input/` folder. The filename can be anything.

```text
input/<your-resume-file>.pdf
```

2. Ask the AI assistant:

```text
Read CHAT_BOOTSTRAP.md first. Use the resume PDF in input/ to create my initial workflow files:

- master_resume.tex
- workflow_state/resume_digest.md
- workflow_state/bullet_index.md
- workflow_state/profile_notes.md
- evidence/work/INDEX.md
- evidence/work/EVIDENCE_ROUTER.md
- evidence/work/E*.md
- evidence/projects/INDEX.md
- evidence/projects/P*.md

Only use evidence present in the resume. Do not invent claims.
```

3. Review the generated files and tighten anything that is wrong or too vague.

Default LaTeX style:
- `master_resume.tex` should use the simple ATS-friendly style in `templates/master_resume_template.tex` unless you ask the AI to preserve a different style.
- The default template uses plain `article`-class LaTeX compatible with `pdflatex`: tight margins, simple section rules, compact bullets, and no custom system font dependency.
- The default font is the standard LaTeX font chosen by `pdflatex`, usually Computer Modern or Latin Modern.
- Do not use `fontspec`, variable fonts, custom system fonts, or `lualatex`-only packages unless you explicitly ask for them.
- If you want a custom visual style or specific fonts, install those fonts locally and ask the AI to customize the LaTeX. Advanced font handling usually requires `lualatex` and `fontspec`.
- If LaTeX is not installed, the AI can still create `master_resume.tex` and all Markdown workflow files. It just cannot build a PDF locally until you install a LaTeX distribution or use an external compiler such as Overleaf.

After setup, the AI should summarize the files it created and end with next options, for example:

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

What those files mean:

- `master_resume.tex`: local LaTeX version of the default resume, ignored by Git
- `workflow_state/resume_digest.md`: compact summary of the default resume for low-token fit checks
- `workflow_state/bullet_index.md`: stable bullet IDs so the assistant can discuss exact changes
- `workflow_state/profile_notes.md`: target roles, hard blockers, work authorization, location preferences, and claims to avoid
- `evidence/work/`: evidence extracted from professional experience bullets
- `evidence/projects/`: evidence extracted from project bullets

The Markdown files are generated from the default resume first. You can enrich them later with better evidence as you use the workflow.

## Local Files To Populate

After first-time setup, your local workflow usually looks like this:

```text
input/
  <your-resume-file>.pdf

JD Text.txt
master_resume.tex

evidence/
  work/
    INDEX.md
    EVIDENCE_ROUTER.md
    E01_local_work_evidence.md
  projects/
    INDEX.md
    P01_local_project.md

workflow_state/
  profile_notes.md
  resume_digest.md
  bullet_index.md
  tailored_count.md
  jobs_fetched_history.md
```

Helpful templates:

```text
templates/master_resume_template.tex
evidence/work/E00_TEMPLATE.md
evidence/projects/P00_TEMPLATE.md
workflow_state/profile_notes.template.md
workflow_state/resume_digest.template.md
workflow_state/bullet_index.template.md
workflow_state/tailored_count.template.md
```

Real populated files stay local. Do not commit them.

## Real Workflow

### 1. Add The Role

Use any one of these:

- paste the JD directly into the AI chat
- paste a JD link into the AI chat and ask the assistant to read it, if browsing/tool access is available
- paste the role into `JD Text.txt`

`JD Text.txt` is included as a public template:

```text
Company:
Role:
Job Link:
Apply Link:
Job Description:
```

If you paste a real JD into `JD Text.txt`, restore the template before committing.

### 2. Fit Check

Ask:

```text
Fit check this role.
```

What happens:

- reads the JD from chat, link, `JD Text.txt`, or `workflow_state/fresh_job_jds/`
- reads `workflow_state/profile_notes.md` and `workflow_state/resume_digest.md`
- scores the role like a skeptical recruiter or hiring manager
- does not treat visa, sponsorship, clearance, location, or other preferences as blockers unless you put them in `profile_notes.md` or state them in chat
- calls out hard blockers, matches, gaps, and whether tailoring is worth it

Output is in chat:

```text
Company | Role | Initial | Tailored | Verdict
```

### 3. Suggest Changes

Ask:

```text
Suggest changes.
```

What happens:

- maps the JD to evidence in `evidence/work/` and `evidence/projects/`
- uses `workflow_state/bullet_index.md` to discuss current resume bullets by ID
- opens `master_resume.tex` only if exact verification is needed
- recommends truthful changes without inventing experience

Output is in chat:

```text
Angle
Remove
Change
Skills remove/add
Order
Projects
Gaps
```

For copy-ready bullet text, ask:

```text
Show exact bullet changes.
```

### 4. Tailor And Build

Ask:

```text
Tailor the PDF.
```

What happens with full filesystem/tool access:

- the assistant copies `master_resume.tex`
- creates a role-specific `.tex` in `output/tailored_tex/`
- applies the approved changes
- runs LaTeX directly
- writes the PDF to `output/pdfs/`
- cleans temporary build files

The scripts are optional helpers. They are useful for manual builds or fallback execution, but a capable coding assistant with full access can run the workflow directly.

Manual build command:

```powershell
.\scripts\run-resume-task.ps1 -TexPath .\output\tailored_tex\company-role.tex -CleanArtifacts
```

Expected output:

```text
output/tailored_tex/company-role.tex
output/pdfs/company-role.pdf
```

### 5. Optional Recruiter Outreach

If you want outreach support later, create a role brief under:

```text
Gmail/role_briefs/
```

Then ask:

```text
Draft recruiter outreach for this role.
```

The assistant uses the Gmail rules and role brief to draft concise outreach. It should not send anything without explicit confirmation.

### 6. Optional Fresh Job Search

Ask:

```text
Find 10 fresh roles posted in the last 24 hours.
```

The assistant should read real JDs before scoring them, avoid duplicates, and keep local history under:

```text
workflow_state/
```

## Folder Tour

```text
CHAT_BOOTSTRAP.md        Start here in a new AI chat
playbook/                Stage-by-stage workflow rules
input/                   Put your resume PDF here for setup
JD Text.txt              Public template for role/JD input
templates/               Default LaTeX master resume style
sample/                  Fake demo resume, JD, evidence, and role brief
evidence/                Templates for real work/project evidence
Gmail/                   Optional outreach rules and role-brief template
workflow_state/          Templates and local workflow state
output/                  Ignored generated tailored TEX/PDF files
scripts/                 Optional helper scripts
docs/                    Extra architecture/privacy walkthroughs
```

## Quick Demo

Try the workflow without private data:

```text
Use the sample files. Fit check sample/sample_job_description.md against the sample resume.
```

Then:

```text
Suggest changes for the sample role.
```

To test the sample LaTeX build:

```powershell
.\scripts\run-resume-task.ps1 -TexPath .\sample\sample_resume.tex -CleanArtifacts
```

The PDF goes to:

```text
output/pdfs/
```

## Privacy Rules

Do not commit:

- real resumes or resume PDFs under `input/`
- real job descriptions pasted into `JD Text.txt`
- generated PDFs or DOCX files
- populated evidence files
- populated role briefs
- recruiter contacts
- job-search history
- credentials, tokens, or `.env` files

Before committing, run:

```powershell
.\scripts\privacy-check.ps1 -ExtraPatterns "Your Real Name","Your Employer","Internal Project Name"
```

Also inspect:

```powershell
git status --short
```

## Requirements

- Any AI coding assistant that can read local files
- PowerShell for the helper scripts. On macOS/Linux, install PowerShell 7 or compile the `.tex` files manually with your LaTeX tools.
- LaTeX is only required if you want local PDF builds.
- If LaTeX is not installed, the AI can still create and edit `master_resume.tex`, workflow state files, evidence files, and tailored `.tex` files.
- `pdflatex` is the baseline compiler. `lualatex` is optional for users who explicitly want advanced font handling.
- For local PDF builds, install a full LaTeX distribution:
  - Windows: [MiKTeX](https://miktex.org/download)
  - macOS/Linux: [TeX Live](https://tug.org/texlive/)
- For custom resume fonts, install the font files on your system and ask the AI to update the LaTeX style. This may require `lualatex` plus `fontspec`.
- `latexmk` and `pdfinfo` are optional helper tools. `latexmk` can manage multi-pass builds, and `pdfinfo` lets the script verify the output page count.
- If you do not want to install LaTeX locally, use the workflow through fit check and tailoring text, then compile the `.tex` later with Overleaf or another LaTeX service.

## What To Publish

Publish the workflow, templates, docs, scripts, and fake samples.

Do not publish real evidence. The reusable part is the system for turning truthful evidence into role-specific resumes.

