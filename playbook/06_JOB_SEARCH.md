# Stage 6: Fresh Job Search

Use this stage when the user asks to find fresh jobs or the next batch of roles.

Job-search results can become private workflow data. Store real findings under ignored local `workflow_state/` files, not in public sample files.

## Inputs

- `workflow_state/profile_notes.md` or `sample/sample_profile_notes.md`
- `workflow_state/resume_digest.md` or `sample/sample_resume_digest.md`
- `workflow_state/bullet_index.md` only if exact verification is needed

## Search Window

- Start with roles posted in the last 24 hours.
- If the requested count cannot be met, expand to 48 hours.
- Then expand to 72 hours.
- Avoid broad date windows unless the user asks for them.

## Source Rules

- Prefer employer or ATS pages over scraped reposts.
- Use credible job boards when employer pages are not enough.
- Read the actual job description before scoring a role.
- Do not add a role from title, snippet, or keyword hits alone.
- If posting date is unclear, say so.

## Jobright Link Hierarchy

Jobright may be useful as a discovery source, but it must not become the canonical application link.

Rules:
- Jobright may appear in the `Source` field only.
- Never use Jobright as the `Link` for a kept role.
- Prefer the original employer or ATS link for `Link`.
- If Jobright points to a closed role, skip immediately.
- If the original employer or ATS link is dead, inaccessible, or no longer shows the role, drop the role.
- Do not fall back to a Jobright wrapper link when the original link is dead.
- Do not score or save a role unless the original employer/ATS JD is readable enough to evaluate.

## JD-First Rule

Before adding a role:

1. Open or read the original JD.
2. Identify the core responsibilities.
3. Identify the actual stack and level.
4. Check profile notes and hard blockers.
5. Score the role from the JD body.
6. Save a clean private JD snapshot if the role is kept.

## Deduplication

Keep a private ledger under:

```text
workflow_state/jobs_fetched_history.md
```

Deduplicate by:
- normalized company
- normalized role title
- canonical job link

If the link is missing, dedupe by company and role title.

## Scoring

- Initial score = fit before tailoring.
- Tailored score = best honest achievable fit after tailoring.
- Do not invent missing domain or stack experience.
- Penalize roles where the strongest fit argument is just a keyword mention.
- Reserve high scores for strong stack, level, responsibility, and domain alignment.

## Clean JD Snapshot Format

Save real snapshots under `workflow_state/fresh_job_jds/MM-DD-YYYY/`.

```md
# <Company> - <Role>

- Source: <source name>
- Link: <job URL>
- Posted: <posted date or observed listing age>
- Captured: <capture date>
- Initial: <score>
- Tailored: <score>
- Verdict: <Apply|Borderline|Skip>
- JD Completeness: <Full|Partial>

## Summary

<1-3 sentence concise role summary>

## Required

- <required skill or qualification>

## Nice To Have

- <preferred item>

## Responsibilities

- <core responsibility>

## Experience

<years/level if stated, otherwise Not mentioned>

## Location

<location/work model if stated, otherwise Not mentioned>

## Constraints

<sponsorship, clearance, degree, travel, or other constraints if stated>

## Fit Notes

<concise reason for the score>
```

## Output Format

Return a compact table:

```text
Company | Role | Link | Posted | Initial | Tailored | Verdict | Notes
```

Keep notes short, but include the real reason the role is or is not worth tailoring.

End with `Next options:`. Useful options after job search:
- `suggest changes` for the strongest role
- fit check a selected role more deeply
- save or review the captured JD snapshot
- search another batch with a different target
