# Privacy

This workflow is designed to keep all real personal and job-search data local and out of Git.

## Do Not Commit

- Real resumes or resume PDFs under `input/`
- Real job descriptions pasted into `JD Text.md`
- Generated PDFs or DOCX files
- Populated evidence files (`evidence/work/E*.md`, `evidence/projects/P*.md`)
- Populated role briefs (`Gmail/role_briefs/`)
- Recruiter contacts or outreach notes
- Job-search history (`workflow_state/jobs_fetched_history.md`)
- Tailored count files (`workflow_state/tailored_count.md`)
- Credentials, tokens, or `.env` files

## Before Committing

Run the privacy check script:

```powershell
.\scripts\privacy-check.ps1 -ExtraPatterns "Your Real Name","Your Employer","Internal Project Name"
```

Also inspect untracked files:

```powershell
git status --short
```

## What Is Safe to Commit

- Workflow rules and playbook files
- Template files (no real data)
- Sample files under `sample/` (fake demo data only)
- Scripts and docs
- `JD Text.md` as an empty template (restore the template before committing if you pasted a real JD)

## How the Repo Is Structured for Privacy

Real populated files are gitignored by default. The repo only tracks templates, rules, scripts, and fake sample data. The reusable part is the system — not the evidence.
