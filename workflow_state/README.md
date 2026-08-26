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
  pending/
    fit_check_pending.md
    suggest_changes_pending.md
    eval_pending.md
    jd_snapshots/
```

## File Purposes

- `profile_notes.md`: target roles, preferences, hard blockers, work authorization notes, and claims to avoid.
- `resume_digest.md`: compact resume summary for fit checks.
- `bullet_index.md`: stable IDs for current resume bullets.
- `tailored_count.md`: count of brand-new tailored resumes built per date.
- `jobs_fetched_history.md`: durable role dedupe and fetched/tailored status ledger.
- `fresh_jobs_fit_check.md`: current search batch table.
- `fresh_job_jds/MM-DD-YYYY/company_role_slug.md`: clean JD snapshots captured during job search.
- `pending/fit_check_pending.md`: fit-check results awaiting a tailoring decision, written by the `write_fit_check_rows` MCP tool. Never edit this table by hand; rows are removed once a role is tailored.
- `pending/suggest_changes_pending.md`: Stage 2 directives blocks awaiting a build, written directly by the AI (no dedicated tool - it's a plain markdown write). One `## Company | Role | ...` block per role.
- `pending/eval_pending.md`: post-build quality report per role, written automatically by `build_tailored_resume` when `evalJudgment` is passed - the AI's judgment findings plus the tool's own measured length/verb/metric-coverage checks, in the same call that publishes the PDF.
- `pending/jd_snapshots/`: temporary raw-JD text files written by `process_jd` when fetching a URL. Read once, then delete after cleaning into a snapshot or fit-check row - raw page text never needs to sit in chat context.

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
