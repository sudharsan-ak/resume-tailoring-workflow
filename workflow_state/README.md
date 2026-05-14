# Workflow State

This folder mirrors the local state used by the real workflow.

Real state files are ignored by Git. Template files are committed so users know what to create.

Recommended local files:

```text
workflow_state/
  profile_notes.md
  resume_digest.md
  bullet_index.md
  tailored_count.md
  jobs_fetched_history.md
  fresh_jobs_fit_check.md
  fresh_job_jds/
    MM-DD-YYYY/
      company_role_slug.md
```

## File Purposes

- `profile_notes.md`: target roles, preferences, hard blockers, work authorization notes, and claims to avoid.
- `resume_digest.md`: compact resume summary for fit checks.
- `bullet_index.md`: stable IDs for current resume bullets.
- `tailored_count.md`: count of brand-new tailored resumes built per date.
- `jobs_fetched_history.md`: durable role dedupe and fetched/tailored status ledger.
- `fresh_jobs_fit_check.md`: current search batch table.
- `fresh_job_jds/MM-DD-YYYY/company_role_slug.md`: clean JD snapshots captured during job search.

## JD Snapshot Naming

Use:

```text
workflow_state/fresh_job_jds/MM-DD-YYYY/company_role_slug.md
```

Example:

```text
workflow_state/fresh_job_jds/05-14-2026/exampleco_full_stack_product_engineer.md
```

Do not commit populated state files. They may contain real job history, private resume bullets, company targets, and tailoring decisions.
