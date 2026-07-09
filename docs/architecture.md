# Architecture

This repo separates public workflow logic from private candidate data while preserving the same folder shape used by the real workflow.

## Public Layer

Committed files:

```text
CHAT_BOOTSTRAP.md
AGENTS.md
CLAUDE.md
playbook/
sample/
input/README.md
templates/
evidence/README.md
evidence/**/*TEMPLATE*
Gmail/*.md
Gmail/role_briefs/*TEMPLATE*
workflow_state/*.template.md
scripts/
docs/
README.md
LICENSE
.gitignore
```

Purpose:
- explain the workflow
- provide stage routing
- provide fake sample data
- show the real folder structure through templates
- provide the default LaTeX master resume template
- provide reusable build/privacy scripts

## Local Private Layer

Local files inside the mirrored workflow structure:

```text
input/<your-resume-file>.pdf
master_resume.tex
JD Text.md
evidence/work/INDEX.md
evidence/work/EVIDENCE_ROUTER.md
evidence/work/EVIDENCE_CHEATSHEET.md
evidence/work/evidence_manifest.json
evidence/work/E*.md
evidence/projects/INDEX.md
evidence/projects/P*.md
Gmail/role_briefs/*.md
workflow_state/*.md
workflow_state/fresh_job_jds/
output/
scripts/build-task.json
```

Purpose:
- hold default resume input, generated master resume source, JD input, evidence, role briefs, generated outputs, and workflow state
- hold real evidence banks in the same shape as the workflow
- hold real job descriptions and fetched job snapshots
- hold real role briefs and recruiter notes
- hold generated tailored `.tex` and `.pdf` files
- hold fetched-job ledgers and local state
- hold local build queues that may contain real role filenames

Note: `JD Text.md` is committed as a public template. Restore it before committing if you paste a real JD into it.

### Optional: Learned Patterns Layer

Two more local, private, optional files can feed into Stage 2 via `query_evidence`, on top of the evidence bank:

```text
Shared Memory/tailoring_patterns.md    (or wherever you point it)
Shared Memory/winning_patterns.json    (or wherever you point it)
```

`tailoring_patterns.md` holds reusable trigger-based rules distilled from past tailoring sessions. `winning_patterns.json` holds a log of applications that produced a real callback, with the JD signals and resume choices that likely contributed. Both are read-only from `query_evidence`'s perspective - nothing in the public build writes or curates them for you. See [patterns-setup.md](patterns-setup.md) for file formats, how to turn the flags on, and how to keep them current as your own job search progresses.

## Workflow Data Flow

```text
Job Description
      |
      v
First-Time Setup <--- input/<your-resume-file>.pdf
      |
      v
master_resume.tex + workflow_state + evidence
      |
      v
Stage 1: Fit Check
      |
      v
Stage 2: Suggest Changes <--- evidence/work + evidence/projects
      |
      v
Stage 3: Tailor + Build <--- master_resume.tex
      |
      v
Tailored TEX + PDF
      |
      v
Stage 4: Outreach Drafts <--- Gmail/role_briefs
```

## Stage Responsibilities

Stage 1 decides whether a role is worth time.

Stage 2 decides what should change and why.

Stage 3 applies approved changes and builds the resume.

Stage 4 drafts outreach from role-specific evidence.

Stage 5 creates initial workflow files from a resume PDF and keeps evidence, build tools, and privacy checks healthy.

Stage 6 finds new roles and records private search state.

## Why This Design

- The public repo teaches the process without exposing sensitive details.
- The mirrored folders make the repo look like the real workflow without committing populated private files.
- The sample folder lets anyone test the workflow immediately.
- The playbook keeps AI behavior consistent across fresh chats.
- Build scripts keep LaTeX output repeatable and clean.

