# Demo Walkthrough

This walkthrough uses only fake sample files.

## 1. Start The Chat

Open a new AI chat in the repo and say:

```text
Read CHAT_BOOTSTRAP.md first and follow it for this workflow.
```

## 2. Run A Fit Check

Use:

```text
Use the sample files. Fit check sample/sample_job_description.md against sample/sample_resume_digest.md and sample/sample_profile_notes.md.
```

Expected result:
- a ranking table
- initial and tailored score
- top matches
- top gaps
- Apply, Borderline, or Skip verdict

## 3. Suggest Changes

Use:

```text
Suggest changes for the sample role using sample/sample_evidence_bank.md and sample/sample_bullet_index.md.
```

Expected result:
- role angle
- bullets to remove, rewrite, or reorder
- skill changes
- project ordering
- remaining gaps

## 4. Ask For Exact Bullets

Use:

```text
Show exact bullet changes for the sample role.
```

Expected result:
- only changed bullets
- evidence IDs used
- unchanged sections summarized briefly

## 5. Build The Sample Resume

From PowerShell:

```powershell
.\scripts\run-resume-task.ps1 -TexPath .\sample\sample_resume.tex -CleanArtifacts
```

Expected result:

```text
output/pdfs/sample_resume.pdf
```

The PDF is ignored by Git.

## 6. Run Privacy Check

Before committing any local changes:

```powershell
.\scripts\privacy-check.ps1 -ExtraPatterns "Your Real Name","Your Employer","Internal Project Name"
```

The script should return no findings for the clean public scaffold.

## 7. Real First-Time Setup

For a real run, do not manually populate every evidence file from scratch. Start from your resume PDF.

Put your resume PDF under:

```text
input/<your-resume-file>.pdf
```

Then open a fresh AI chat and say:

```text
Read README.md and CHAT_BOOTSTRAP.md, then guide me through first-time setup step by step.
Use the resume PDF in input/ to create master_resume.tex, workflow_state/resume_digest.md, workflow_state/bullet_index.md, workflow_state/profile_notes.md, evidence/work/*, and evidence/projects/*.
Only use evidence present in the resume. Do not invent claims.
```

If you paste a real JD into `JD Text.md`, restore the public template before committing.

Your real resume `.tex` file is only needed when you ask the assistant to tailor/build a PDF.
