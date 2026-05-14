# Resume Playbook Index

Use this index to select the smallest stage document needed for the user's current request.

## Hard Rules

- The public repo contains workflow logic and fake samples only.
- Real resumes, real evidence, real role briefs, generated PDFs, recruiter notes, tokens, and credentials stay outside Git.
- Prefer `sample/` files for demos and the mirrored ignored workflow folders for real local runs.
- Be honest about fit. Do not turn weak alignment into resume theater.
- Never invent experience, metrics, tools, scope, titles, companies, education, awards, or sponsorship status.
- Use token budget on decisions that change the final artifact.

## Stage Selection

- Fit check / ranking: `01_FIT_CHECK.md`
  - Triggers: `check next roles`, `rank these roles`, `fit check`
- Suggest changes: `02_SUGGEST_CHANGES.md`
  - Triggers: `suggest changes`, `exact bullet changes`, `show the table`
- Tailor + build PDF: `03_TAILOR_BUILD.md`
  - Triggers: `tailor the pdf`, `generate pdf`, `build pdf`, `tailor all N`
- Recruiter outreach: `04_GMAIL_OUTREACH.md`
  - Triggers: `draft outreach`, `create recruiter drafts`, `email these recruiters`
- Maintenance: `05_MAINTENANCE.md`
  - Triggers: evidence refresh, build troubleshooting, privacy check, state cleanup
- First-time setup from resume PDF: `05_MAINTENANCE.md`
  - Triggers: `set up from my resume PDF`, `create the initial workflow files`, `bootstrap my resume evidence`
- Fresh job search: `06_JOB_SEARCH.md`
  - Triggers: `search N jobs`, `find fresh jobs`, `latest jobs`, `next N jobs`
- Application form answers: no stage doc by default
  - Answer directly from known candidate evidence and constraints.

## Default File Priority

For demos:

1. `sample/sample_profile_notes.md`
2. `sample/sample_resume.tex`
3. `sample/sample_resume_digest.md`
4. `sample/sample_bullet_index.md`
5. `sample/sample_evidence_bank.md`
6. `sample/sample_job_description.md`

For private runs:

1. JD input: `JD Text.txt`, a JD pasted directly in chat, a JD link, or `workflow_state/fresh_job_jds/...`
2. `workflow_state/profile_notes.md`
3. `workflow_state/resume_digest.md`
4. `workflow_state/bullet_index.md`
5. `evidence/work/EVIDENCE_ROUTER.md`
6. `evidence/work/INDEX.md`
7. `evidence/projects/INDEX.md`
8. the user's real resume `.tex` file only for exact verification or tailor/build

If a real local file is missing, ask the user for it or fall back to samples only when the user is running a demo.

## Output Bias

- Short decision outputs for fit checks.
- Compact plans for suggested changes.
- Exact text only when the user asks for it or when Stage 3 needs it.
- Build results should report file path, page count, and any failure root cause.
