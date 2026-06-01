# Resume Tailoring Workflow

A privacy-first workflow for turning a default resume into a role-specific LaTeX PDF using an AI coding assistant.

The assistant acts like a skeptical recruiter or hiring manager: it scores honestly, challenges weak fit, and tailors only from evidence the resume can actually defend.

Works with Claude Code, Codex, or any AI coding assistant that can read and edit local files.

---

## Start Here

Open a new AI chat from this repo and say:

```text
Read CHAT_BOOTSTRAP.md first and follow it for this workflow.
```

The assistant routes your request through the correct playbook stage automatically.

`CHAT_BOOTSTRAP.md` is the assistant's behavior prompt: it tells the AI to act like a skeptical recruiter or hiring manager, avoid invented claims, and follow the workflow rules.

If the workflow feels hard to follow at first, ask the assistant to read the repo files and walk you through the process step by step before you start tailoring.

---

## What It Does

| Stage | Trigger | Output |
|---|---|---|
| Fit Check | `Fit check this role.` | Score table: Initial, Tailored, Verdict |
| Suggest Changes | `Suggest changes.` | Angle, bullet swaps, skill cuts, gaps |
| Tailor + Build | `Tailor the PDF.` | Role-specific `.tex` + compiled PDF |
| Recruiter Outreach | `Draft recruiter outreach.` | Role brief + outreach draft |
| Fresh Job Search | `Find 10 fresh roles.` | Scored list, no duplicates |

---

## First-Time Setup

You start with your existing resume PDF. The AI generates all workflow files from it.

1. Drop your resume PDF into `input/`
2. Ask the AI:

```text
Read CHAT_BOOTSTRAP.md first. Use the resume PDF in input/ to create my initial workflow files.
Only use evidence present in the resume. Do not invent claims.
```

3. Review the generated files and correct anything wrong or too vague.

See [docs/first-time-setup.md](docs/first-time-setup.md) for the full file list and what each file does.

---

## Folder Structure

```text
CHAT_BOOTSTRAP.md        Start here in every new AI chat
playbook/                Stage-by-stage workflow rules
input/                   Drop your resume PDF here for setup
JD Text.md               Template for role and JD input
templates/               Default LaTeX master resume style
sample/                  Fake demo resume, JD, evidence, role brief
evidence/                Templates for work and project evidence
Gmail/                   Optional outreach rules and role-brief template
workflow_state/          Templates and local workflow state files
output/                  Generated tailored TEX and PDF files (gitignored)
scripts/                 Optional helper scripts
docs/                    Setup, LaTeX options, privacy, architecture
```

---

## Privacy

Real resumes, evidence, job descriptions, generated PDFs, and recruiter notes stay local and are gitignored.

Before committing, run:

```powershell
.\scripts\privacy-check.ps1 -ExtraPatterns "Your Real Name","Your Employer"
```

See [docs/privacy.md](docs/privacy.md) for the full do-not-commit list.

---

## LaTeX Setup

| Option | What you need |
|---|---|
| Local (recommended) | MiKTeX (Windows) or TeX Live (macOS/Linux) |
| Dev Container | Docker Desktop + VS Code |
| No install | Overleaf (compile online) |

See [docs/latex-setup.md](docs/latex-setup.md) for install steps and compiler options.

---

## Quick Demo

Try the workflow with no private data:

```text
Use the sample files. Fit check sample/sample_job_description.md against the sample resume.
```

---

## Built With

- [Claude Code](https://claude.ai/code) — Anthropic
- [Codex](https://platform.openai.com/docs/codex) — OpenAI
