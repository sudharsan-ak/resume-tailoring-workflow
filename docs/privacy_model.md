# Privacy Model

The repo is designed around an allowlist approach: commit workflow logic, fake samples, and templates; keep populated real data local.

## Public By Default

These are safe to commit:

- `README.md`
- `CHAT_BOOTSTRAP.md`
- `AGENTS.md`
- `CLAUDE.md`
- `LICENSE`
- `playbook/*.md`
- `docs/*.md`
- `scripts/*.ps1`
- `scripts/*.template.json`
- `sample/*`
- `templates/*.tex`
- `input/README.md`
- `evidence/**/README.md`
- `evidence/**/*TEMPLATE*.md`
- `evidence/**/*.template.json`
- `Gmail/*.md`
- `Gmail/role_briefs/README.md`
- `Gmail/role_briefs/*TEMPLATE*.md`
- `workflow_state/README.md`
- `workflow_state/*.template.md`
- `.gitignore`
- `.gitattributes`

## Private By Default

These should not be committed:

- real resumes
- resume PDFs under `input/`
- real PDFs or DOCX files
- real evidence banks
- internal project notes
- real job descriptions saved during a search
- recruiter names, emails, or LinkedIn URLs
- populated role briefs
- Gmail drafts or tokens
- credentials
- generated tailored resumes
- generated PDFs
- local workflow ledgers
- local build queues such as `scripts/build-task.json`

## Local Workflow Paths

Use these paths for local workflow data:

```text
input/<your-resume-file>.pdf
master_resume.tex
JD Text.md
evidence/work/
evidence/projects/
Gmail/role_briefs/
workflow_state/
output/
scripts/build-task.json
```

`JD Text.md` is a committed public template. If you paste a real JD into it, restore the template before committing.

Populated evidence, role briefs, workflow state, input PDFs, and output files are ignored by `.gitignore`. Keep real resumes out of commits by storing them outside the repo, adding the exact filename to `.gitignore`, or using a local-only filename pattern such as `*.local.tex`.

## First Commit Checklist

Run:

```powershell
git status --short
.\scripts\privacy-check.ps1 -ExtraPatterns "Your Real Name","Your Employer","Internal Project Name"
```

Then inspect:

```powershell
git diff --cached --name-only
```

Only commit files that belong to the public layer.

## Common Leak Paths

Watch for:

- copied master resume files
- generated PDFs in random folders
- role briefs copied from private outreach
- evidence IDs that mention real employers or internal tools
- screenshots with personal data
- `.env`, `credentials.json`, or `token.json`
- shell history or editor state

## Redaction Guidance

Bad public sample:

```text
Built the real internal payment reconciliation tool for Actual Employer.
```

Better public sample:

```text
Built a workflow automation tool for a fake B2B SaaS product.
```

The public repo should teach the method. It should not prove your private work history.

