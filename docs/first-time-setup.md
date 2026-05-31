# First-Time Setup

You do not manually fill every Markdown file from scratch. Start with your existing resume PDF and let the AI generate the workflow files from it.

## Steps

1. Put your resume PDF in the `input/` folder. The filename can be anything.

```text
input/<your-resume-file>.pdf
```

2. Open a new AI chat and ask:

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

3. Review the generated files and correct anything wrong or too vague.

## What Each File Does

| File | Purpose |
|---|---|
| `master_resume.tex` | Local LaTeX version of the default resume. Gitignored. |
| `workflow_state/resume_digest.md` | Compact summary of the resume for low-token fit checks. |
| `workflow_state/bullet_index.md` | Stable bullet IDs so the assistant can reference exact bullets. |
| `workflow_state/profile_notes.md` | Target roles, hard blockers, work authorization, location, claims to avoid. |
| `evidence/work/` | Evidence extracted from professional experience bullets. |
| `evidence/projects/` | Evidence extracted from project bullets. |

## Local File Layout After Setup

```text
input/
  <your-resume-file>.pdf

JD Text.md
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

## Available Templates

```text
templates/master_resume_template.tex
evidence/work/E00_TEMPLATE.md
evidence/projects/P00_TEMPLATE.md
workflow_state/profile_notes.template.md
workflow_state/resume_digest.template.md
workflow_state/bullet_index.template.md
workflow_state/tailored_count.template.md
```

## LaTeX Style Notes

- `master_resume.tex` uses the ATS-friendly style in `templates/master_resume_template.tex` by default.
- The default template uses plain `article`-class LaTeX compatible with `pdflatex`: tight margins, simple section rules, compact bullets, no custom font dependency.
- If you want custom fonts or a different visual style, install the fonts locally and ask the AI to customize the LaTeX. Advanced font handling requires `lualatex` and `fontspec`.
- If LaTeX is not installed yet, the AI can still create all the Markdown and `.tex` files. You just cannot build a PDF locally until you install a LaTeX distribution or use Overleaf.

## After Setup

The AI should confirm what it created and end with next options, for example:

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

The Markdown files are generated from the default resume first. Enrich them with better evidence as you use the workflow.
